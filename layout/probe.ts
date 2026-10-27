/**
 * The rendered-output guard `CLAUDE.md` §6 has been asking for.
 *
 * `asked-amount-not-covered` inspects what `themeVars()` returns and never
 * opens a stylesheet, and happy-dom does not lay out — so the rule that nothing
 * we ship may cover the asked amount has been enforced by reading the diff.
 * Three defects got through in one session because of it: a grid row stretched
 * to an image's height and opened a 130px hole, `hidden` lost to a class that
 * set `display`, and a hex string ran off the side of the sheet.
 *
 * This page paints every shipped look across every screen, measures the result
 * in a real browser, and writes a verdict into the DOM for the runner to read.
 * It asserts what only a browser can see.
 */
// First: it listens for the policy's refusals from the page's first module statement.
import { cspRefusals, type CspRefusal } from './cspWatch';
import { PAY_QR_NARROWEST_PX, QR_SVG_QUIET_MODULES, cheapestOf, listingsInShopOrder, qrSvg, renderStall } from '../src/ui/render';
import { wallFigureTier } from '../src/ui/window';
import { TICKER_ITEMS_PER_PASS } from '../src/ui/broadcast';
import { isUnbuyable } from '../src/domain/money';
import type { StallView } from '../src/domain/state';
import { THEME_NOT_UNLOCKED, UNBUYABLE_BADGE, windowPayMore } from '../src/ui/copy';
import rainNearSvg from '../src/ui/decor/rain-near.svg?raw';
import rainMidSvg from '../src/ui/decor/rain-mid.svg?raw';
import rainFarSvg from '../src/ui/decor/rain-far.svg?raw';
import buntingSvg from '../src/ui/decor/bunting.svg?raw';
import { artTopShare } from './buntingArt';
import { brightestDrop, type Drop } from './rainDrop';
import { brightestArt, isHorizonSheet, signLayersRead } from './horizonArt';
import horizonLeftSvg from '../src/ui/decor/horizon-sky-left.svg?raw';
import horizonRightSvg from '../src/ui/decor/horizon-sky-right.svg?raw';
import horizonFillSvg from '../src/ui/decor/horizon-sky-fill.svg?raw';
import horizonStarsSvg from '../src/ui/decor/horizon-stars.svg?raw';
import { MOOD_VISIBLE_MIN, moodDistance, paintedDistance, type Rgb as MoodRgb } from './moodVisible';
import { OUTLINE_1, OUTLINE_2, OUTLINE_2_UNDER_PX, outlineSet, type Offset } from './outline';
import type { ShippedAttachment } from '../src/domain/attachments';
import {
    DEFAULT_LOOK_CLASS,
    FIXTURE_LOOK,
    FIXTURE_SHEET_CLASS,
    HARNESS_LICENCE,
    SKELETON_LOOK_ID,
    harnessGateFaults,
    lookById,
    looksFor,
    kitLook,
    measuredLooks,
    paintView,
    privateLooks,
    recordView,
    shippedLooks,
    wornAllFlags,
    wornOf,
    type Look,
} from './looks';
import { COPIED_JOBS, contrastOwed, contrastPlan, contrastScreens, type ContrastJob } from './contrastPlan';
import { loadedSheetNames } from './sheetNaming';
import { LOOK_BACKDROP, ROOT_TOKENS, colourOf, rootLayerSetAside, surfaceArtSetAside, type Colour, type RootFacts } from './atRest';
import {
    STACK_CHOICES_CAP,
    colourTokens,
    byScroller,
    cutsBelowScroller,
    everyMixReads,
    layerCovers,
    mostOpaque,
    paintsNothing,
    picturesShowing,
    shiftFor,
    srgbColour,
    tileArea,
    worstGround,
    type ScrollMove,
    type StackPaint,
} from './groundStack';
import { lineOfCharacter } from './charLines';
import { MODULE_SNAP_OFFSETS, MODULE_SNAP_SIZES, matrixBits, matrixOfPath, moduleSnapText, type CodeMatrix } from './codeMatrix';
import { qrMatrix } from '../src/domain/qr';
import {
    clipVerdict,
    columnExcuses,
    columnPlace,
    eachInkPoint,
    fittedRadii,
    framePoints,
    gridPoints,
    insideRounded,
    movedBy,
    radiusOf,
    reachWithin,
    RUNNING_RIBBON,
    scrollsOn,
    SQUARE,
    WALL_SCROLLERS,
    type ClipBox,
    type Frame,
    type PointKind,
    type Radii,
    type Reach,
} from './coverPoints';
import { LOOK_RULE, PSEUDO_AT, lookPseudoOf, selectorList } from './lookRule';
import { MIN_CONTRAST, contrastRatio } from '../src/domain/theme';
import { loadLookSheet, lookSheetState } from '../src/ui/lookSheets';
import { lookSheetFault, lookSheetReads, wornSheetsOf, LOOK_SHEET_PROPERTY } from './wornSheet';
import { FIXTURE_SHEET_URL } from './fixtureLook';
import { MONEY, MONEY_OUTSIDE_PROTECTED } from './moneySet';
import { keyframeLonghands, meetsLines, moverKinds, type AnimationFacts } from './digitTrigger';
import { HONEST_OWED, HONEST_SELECTOR } from './honestDisplay';
import { loadEveryFace, type FaceEcho } from './faces';
import { screensAt } from './screenSplit';
import { STICKY_SUBJECTS } from './stickyBoxes';
import { reachesAnything, spillReach } from './spillReach';
import {
    ANYWHERE,
    BLUR_OPACITY,
    blurMeet,
    borderImageBox,
    boxShadowLayers,
    compositeOverAny,
    filterLayers,
    intersect,
    layerBound,
    outlineBox,
    parseFilter,
    parseShadows,
    pseudoRegion,
    sharpMeet,
    targetPast,
    textShadowLayers,
    underlineBand,
    union,
    zoomOf,
    acceptedReach,
    type Layer,
    type Meet,
    type ReachFact,
    type ReachKind,
    type Shadow as ReachShadow,
} from './paintReach';
import { CARD_LADDER_LAST_STEP } from './cardLadder';
import { inkLines, measurePainted, paddingBox, painted, paintClips, type Box } from '../src/ui/signInk';
import {
    OBS_RAIL_STICKER_HEIGHT,
    OBS_STICKER_HEIGHT,
    OBS_STICKER_WIDTH,
    OBS_TICKER_STICKER_HEIGHT,
    OBS_TICKER_STICKER_WIDTH,
} from '../src/ui/obsSizes';
import {
    CANVAS_SCREENS,
    NO_DECOR_SCREENS,
    SCREENS,
    paintsBareOnly,
    STATE_SCREENS,
    T1,
    CJK_NAME,
    LONGEST_NAME,
    STACKED_NAME,
    handlers,
    stageScreen,
} from './fixtures';

/**
 * What a decoration may never touch. Wider than the price, because a QR that is
 * partly covered does not scan, an address that is partly covered cannot be
 * checked against a wallet, and a buy control under a sprite is a control the
 * visitor cannot press.
 *
 * The hex of a record is here for a stronger reason than the price: §5 says
 * Cashtab previews an unknown LOKAD as raw hex, so the publish screen is the
 * **only** place a seller can read the bytes before signing them. Covering
 * those is worse than covering a number they can check on the next screen.
 * `fiat` and `rate` are money figures too, and a covered one reads as nothing.
 */
const PROTECTED = [
    '[data-role="price"]',
    '.row.big dd',
    '.qr',
    '.buy',
    '.addr',
    '[data-role="publish-hex"]',
    '[data-role="describe-hex"]',
    '[data-role="fiat"]',
    '[data-role="rate"]',
    // What a payment actually brought in, in the Activity fold. A money
    // figure like any other here: covered, it reads as nothing — and this one
    // is the only figure on the panel a reader could check against a wallet.
    '[data-role="receipt-amount"]',
    // The seller's own quote, on the pay surface and inside the pay sheet.
    // It is a money figure a buyer reads before pressing Pay, and a covered
    // one reads as nothing — the same rule the covenant's price has.
    '[data-role="seller-price"]',
    // The surcharge (2026-09-21): the composed line on the pay sheet and the
    // record's line beside every quote. Half a price is a wrong price, so a
    // covered "+5%" is covered money — `PROBE-RULES.md`, "The surcharge lines".
    '[data-role="pay-surcharge"]',
    '[data-role="quote-surcharge"]',
    // "Pay several" (2026-09-21): the strip's total in the seller's unit,
    // and the sheet's lines and total — money a buyer reads before Pay.
    '[data-role="selection-total"]',
    '[data-role="pay-lines"]',
    '[data-role="pay-total"]',
    // A chosen row's line, "2 × $5.00 = $10.00" (step 5b, the critic): money
    // a buyer adds up, which the line-rect read took from the box read when
    // it read `.sel-sub` as words; and the touch wall's Pay, the control that
    // composes the payment code.
    '[data-role="selection-figure"]',
    '[data-role="window-pay"]',
].join(', ');

/**
 * Anything painted over the stall rather than in it. Absolutely positioned or
 * fixed nodes, and any element carrying an attachment class — the catalogue
 * that does not exist yet is the reason this check does, so it is written to
 * find those the moment they arrive.
 */
function decorations(root: ParentNode): Element[] {
    const out: Element[] = [];
    for (const node of root.querySelectorAll('*')) {
        // `getAttribute`, never `className`: on an SVG element `className` is
        // an `SVGAnimatedString`, so `String(...)` is "[object ...]" and the
        // prefix can never match — an SVG decoration would ship with no guard.
        const cls = node.getAttribute('class') ?? '';
        if (/\batt-/.test(cls)) {
            out.push(node);
            continue;
        }
        const pos = getComputedStyle(node).position;
        if (pos === 'absolute' || pos === 'fixed') {
            out.push(node);
        }
    }
    return out;
}

/**
 * A pseudo-element falls through both other checks, so it is banned outright.
 *
 * `::before` and `::after` are not in the DOM: `querySelectorAll` cannot return
 * them and they have no `getBoundingClientRect`, so the geometric check is
 * blind. And with `pointer-events: none` the hit test is blind too — measured:
 * an `::after` with `inset: 0` and `pointer-events: none` over the price passed
 * both. Nothing in the shipped stylesheet needs a positioned pseudo-element, so
 * the honest rule is that a decoration must be a **real node the guard can
 * measure**. This finds the ones that are not.
 */
function positionedPseudos(root: ParentNode): string[] {
    const out: string[] = [];
    for (const node of root.querySelectorAll('*')) {
        for (const which of ['::before', '::after'] as const) {
            const style = getComputedStyle(node, which);
            if (style.content === 'none' || style.content === '') {
                continue;
            }
            const pos = style.position;
            if (pos === 'absolute' || pos === 'fixed') {
                out.push(`${describe(node)}${which}`);
            }
        }
    }
    return out;
}

/**
 * Every element between the stream and the plates. `applyTheme` and
 * `stall.css` can each put a ground on one of these, and `broadcast.css`
 * clears them with longhands under `html.bc-clear`; this is the list that
 * fight is fought over. `.bc` is included because it is the overlay's own
 * root — a ground there is a rectangle around both plates.
 */
const CLEAR_GROUNDS = ['html', 'body', '#app', '.frame', '.stall', '.bc'];

/**
 * How much of a computed background colour actually paints. `transparent`
 * computes to `rgba(0, 0, 0, 0)`, a `color-mix()` result serializes as
 * `color(srgb r g b / a)`, and anything this cannot read is treated as paint
 * — a guard that guesses "probably transparent" is the guard that misses.
 */
function groundAlpha(value: string): number {
    const v = value.trim();
    if (v === '' || v === 'transparent') {
        return 0;
    }
    const fn = /^(?:rgba?|color)\(\s*(?:srgb\s+)?([^)]+)\)$/.exec(v);
    if (fn !== null) {
        const parts = fn[1]!.split(/[\s,/]+/).filter((part) => part !== '');
        return parts.length >= 4 ? Number.parseFloat(parts[3]!) : 1;
    }
    return 1;
}

/** Do two boxes share any area at all? */
function overlaps(a: DOMRect, b: DOMRect): boolean {
    return !(
        a.right <= b.left ||
        b.right <= a.left ||
        a.bottom <= b.top ||
        b.bottom <= a.top
    );
}

type Failure = { screen: string; theme: string; check: string; detail: string };

/**
 * Is any part of this node covered by something that is not itself?
 *
 * Sampled at five points rather than one: a decoration that covers half a
 * number still hides the number, and a single centre probe misses it.
 */
/**
 * Every ancestor that clips this node, out to the shell.
 *
 * All of them, not the nearest: a point is on screen only if it is inside
 * EVERY clip above it, and taking one alone gets it wrong in both directions.
 * Measured while adding the shop window, both ways round — reading only the
 * nearest scroller let the dock report itself as covering a shop row 560
 * times, because the nearer box contained a point the shell's did not; and
 * reading only the shell (which is what this was, by name) let a row scrolled
 * out of the window's own strip report as a covered asked amount 117 times,
 * because the shell's box contained a point the strip's did not.
 *
 * The shell is matched by NAME as well as by `overflow`, because on the shop
 * the page is what scrolls and the shell clips nothing — the tolerance it has
 * always had is that the dock sits outside it in flow and so can never cover
 * what is inside.
 */
/**
 * **What the clip tolerance is held to** (7a): 1a's points (`coverByClass`:
 * `checked` beside `clipSkips`, with the wall scrollers' points apart), per
 * look and per pass, not `coveredBy`'s. §6's own complaint is about a check
 * that quietly does not run: a read that skipped every point would be
 * indistinguishable from one that found nothing wrong. The skip count alone
 * could not tell those apart — it has no denominator — and it was printed
 * **only on a passing run**, which is the one run where a reader is least
 * likely to look. So both halves are counted and reported on every run,
 * pass or fail, and `scripts/layout-check.mjs` holds the ratio to a ceiling
 * (`CLIP_SKIP_CEILING`), on the public looks' sum and on each carried look's
 * own points (8e2, the 8e2 critic's item 1: one ratio over the page let the
 * shipped looks satisfy the ceiling for a carried look that measured
 * nothing, `look-tallies.mjs`). Until 7a the ratio was `coveredBy`'s, over
 * the price and "You pay" alone; 1a asks every money node and protected box,
 * and fails what `coveredBy` counted and never asked (a point past a clip
 * that cuts, `clipVerdict`).
 *
 * `coveredBy` is still bound, at rest and at the six instants
 * (`checkOverTime`): 1a reads at rest alone. What it costs is counted here
 * per phase (`coveredByCalls`, `coveredByMs`: `rest`, the first measurement
 * of a paint; `instants`, the six; `label`, the unbuyable label's own read,
 * after the instants), and printed beside 1a's own time.
 */
type CoveredByPhase = 'rest' | 'instants' | 'label';
const coveredByCalls: Record<CoveredByPhase, number> = { rest: 0, instants: 0, label: 0 };
const coveredByMs: Record<CoveredByPhase, number> = { rest: 0, instants: 0, label: 0 };
/** Which phase a `coveredBy` call is in: set by `checkOverTime` and `unbuyableFaults`. */
let coveredByPhase: CoveredByPhase = 'rest';
/** The `t-*` class of the look the main loop is measuring now; `-` outside it. */
let measuringClass = '-';

type Clip = {
    rect: DOMRect;
    el: Element;
    /** `overflow-x: hidden | clip`: what lies past its side edge is gone, not scrolled to. */
    cutsX: boolean;
    /** Its `overflow-x` and `overflow-y`, as computed (1a reads a scroller's reach on each axis). */
    overflowX: string;
    overflowY: string;
};

/**
 * **Where a scroller can show its content** (before 8g2, item 3): its padding
 * box widened on each axis by how far it scrolls each way from where it
 * stands, in page px — so content a scroll position brings into view lies
 * inside, and content past the scroll origin, which no position shows,
 * outside. Measured by scrolling the box to each end and back, instantly,
 * so no `scroll-behavior` defers it and no snapping is assumed away: where
 * the range starts is the engine's, and depends on the box's direction,
 * writing mode and flex reversal (Chrome sets a `row-reverse` box's origin
 * at its right, a `column-reverse` box's at its bottom), while a box that
 * end-aligns content wider than itself (`justify-content: flex-end`, the
 * critic's T1c) overflows past its origin, a range of nothing to scroll.
 * The scroll is put back where it stood; the scroll event it queues fires
 * after the read, on a tree the probe's handlers do nothing with.
 */
function scrollReach(el: Element): Reach {
    const pad = paddingBox(el);
    const [sx, sy] = [el.scrollLeft, el.scrollTop];
    el.scrollTo({ left: -1e9, top: -1e9, behavior: 'instant' });
    const [minX, minY] = [el.scrollLeft, el.scrollTop];
    el.scrollTo({ left: 1e9, top: 1e9, behavior: 'instant' });
    const [maxX, maxY] = [el.scrollLeft, el.scrollTop];
    el.scrollTo({ left: sx, top: sy, behavior: 'instant' });
    return { x0: pad.left - (sx - minX), x1: pad.right + (maxX - sx), y0: pad.top - (sy - minY), y1: pad.bottom + (maxY - sy), pad };
}

// `reachWithin` and `scrollsOn` are the pure half's (`coverPoints.ts`), beside the clip verdict that reads them.

function clipsOf(node: Element): Clip[] {
    const clips: Clip[] = [];
    let at: Element | null = node.parentElement;
    while (at !== null && at !== document.documentElement) {
        const style = getComputedStyle(at);
        if (
            at.classList.contains('stall-scroll') ||
            style.overflowY !== 'visible' ||
            style.overflowX !== 'visible'
        ) {
            clips.push({
                rect: at.getBoundingClientRect(),
                el: at,
                cutsX: style.overflowX === 'hidden' || style.overflowX === 'clip',
                overflowX: style.overflowX,
                overflowY: style.overflowY,
            });
        }
        at = at.parentElement;
    }
    return clips;
}

/**
 * Sideways is not like down (2026-09-20). A box below the fold is reached by
 * scrolling; a box past the viewport's side edge, or past an ancestor whose
 * `overflow-x` is hidden or clip, is reached by nothing — unless some
 * scroller below that edge brings it in, or the page itself scrolls
 * sideways, which the sideways-scroll rule already refuses. The incident:
 * the door's body is a flex item with auto side margins, so its width is its
 * own max-content capped at 430px, and round 16 gave it a nowrap site bar
 * and a deck row whose max-content is past that — at 390px the body came out
 * 430 wide, flush left, the paste button's right edge at 400 and the counter
 * at 414, cut by the shell's `overflow-x: clip`. No rule saw it: the page did
 * not scroll (the shell clips), and `coveredBy` skipped the points past the
 * edge as "off screen, the viewport check's failure", which was no check at
 * all. Every protected box is asked, in the geometry sweep.
 *
 * **A scroller reaches what it scrolls to, not everything** (before 8g2,
 * the window's item 3; the critic's PC): any sideways scroller above the
 * box used to excuse it whole, so a shelf made a centred, reversed
 * sideways scroller put each row's price past the screen's right edge, past
 * the scroll origin no position reaches, and every bound rule passed. Now
 * every edge the box runs past — a box above it that cuts or scrolls
 * sideways, then the viewport — is asked whether a scroller inside that
 * edge brings every part of the box within it (`scrollReach`, measured,
 * through `reachWithin`): the edge's own scroller for its own side, any
 * scroller below it for a cutter or the viewport. One scroller at a time,
 * stated: a box only two nested scrollers together could bring in is read
 * as out of reach.
 */
function cutSideways(node: Element, box: DOMRect): string | undefined {
    if (box.width === 0 || box.height === 0) {
        return undefined;
    }
    // The one scoped exception (2026-09-21, the ticker): a protected figure
    // inside a MOVING or PINNED ribbon cell is clipped BY DESIGN — the ribbon
    // runs through the cell and every figure spends most of a pass outside
    // it. The replacement proof is the fixture, which pins the ribbon at an
    // offset where the protected figure of one item stands wholly inside the
    // cell, and the contrast sampler, which clamps to the cell (`targetFor`)
    // and skips a sliver. A STILL page (reduced motion) is a layout, not a
    // pass, and is measured like one. `PROBE-RULES.md`, "The ticker".
    const ribbon = node.closest('[data-ribbon]');
    if (ribbon !== null && ribbon.getAttribute('data-ribbon') !== 'still') {
        return undefined;
    }
    // The page's own sideways scroll is the sideways-scroll rule's failure.
    if (document.documentElement.scrollWidth > window.innerWidth + 1) {
        return undefined;
    }
    const clips = clipsOf(node);
    const span = `${Math.round(box.left)}–${Math.round(box.right)}`;
    const reachedBy = (inner: readonly Clip[], lo: number, hi: number): boolean =>
        inner.some((clip) => {
            if (!scrollsOn(clip.overflowX)) return false;
            const [from, to] = reachWithin(scrollReach(clip.el), 'x', lo, hi);
            return box.left >= from - 1 && box.right <= to + 1;
        });
    for (let i = 0; i < clips.length; i += 1) {
        const clip = clips[i]!;
        const scrolls = scrollsOn(clip.overflowX);
        if (!clip.cutsX && !scrolls) continue;
        const c = clip.rect;
        if (box.left >= c.left - 1 && box.right <= c.right + 1) continue;
        // Below this edge — and the edge itself, where it scrolls.
        if (reachedBy(clips.slice(0, scrolls ? i + 1 : i), c.left, c.right)) continue;
        return scrolls
            ? `runs past ${describe(clip.el)}'s side (${span} inside ${Math.round(c.left)}–${Math.round(c.right)}, overflow-x ${clip.overflowX}), where no scroll position brings it (scrollReach)`
            : `is cut sideways by ${describe(clip.el)} (${span} inside ${Math.round(c.left)}–${Math.round(c.right)})`;
    }
    if ((box.left < -1 || box.right > window.innerWidth + 1) && !reachedBy(clips, 0, window.innerWidth)) {
        return `runs past the viewport's side edge (${span} of ${window.innerWidth}) with nothing that scrolls it into view`;
    }
    return undefined;
}

function coveredBy(node: Element): string | undefined {
    const t0 = performance.now();
    try {
        return coveredByRead(node);
    } finally {
        coveredByCalls[coveredByPhase] += 1;
        coveredByMs[coveredByPhase] += performance.now() - t0;
    }
}

function coveredByRead(node: Element): string | undefined {
    releaseCover();
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
        return 'has no box at all';
    }
    /*
     * Five points on each of the node's own boxes: one for a block or a
     * one-line figure, which is the box itself, and one per line for a
     * figure the card ladder breaks after a comma (2026-10-13,
     * `CARD_FIGURE_CEILINGS`). The union of two lines of unequal length is a
     * rectangle the figure does not fill, and a point in its empty corner
     * hit the row and read as the figure covered by its own row.
     */
    const lineBoxes = [...node.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    /*
     * **In the box's own turned frame** (round 3): a box inside a turned
     * ancestor answers its axis-aligned bounds, and their corners are not the
     * box — a 750px Rural tag swaying 0.77° on the wall put the bounds'
     * corners of a 21-character figure 4–5px outside the tag it is drawn in,
     * and the corner read as the figure covered by its own row. So each
     * box's five points are taken in the frame it is drawn in, before its
     * turn (`turnedBox`, the contrast pass's own), and turned back: every
     * point is a point of the box. An unturned box is read exactly as before.
     */
    const angle = angleOf(node);
    // A broken figure's line boxes are solved from their bounds; past 45°
    // they cannot be, and the node is read as one box in its own frame
    // (`ownFrame`, exact at any turn).
    const lineFrames = angle === 0 || lineBoxes.length <= 1 ? undefined : lineBoxes.map((r) => turnedBox(r, angle));
    const byLine = lineBoxes.length > 1 && (lineFrames === undefined || lineFrames.every((f) => f !== undefined));
    const points: [number, number][] = (byLine ? lineBoxes : [box]).flatMap((r, i) => {
        if (angle === 0) {
            return [
                [r.left + r.width / 2, r.top + r.height / 2] as [number, number],
                [r.left + 2, r.top + 2] as [number, number],
                [r.right - 2, r.top + 2] as [number, number],
                [r.left + 2, r.bottom - 2] as [number, number],
                [r.right - 2, r.bottom - 2] as [number, number],
            ];
        }
        const t = byLine ? lineFrames![i]! : ownFrame(node, r, angle);
        if (t === undefined) {
            return [];
        }
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const at = (dx: number, dy: number): [number, number] => [t.cx + dx * cos - dy * sin, t.cy + dx * sin + dy * cos];
        const hx = t.w / 2 - 2;
        const hy = t.h / 2 - 2;
        return [at(0, 0), at(-hx, -hy), at(hx, -hy), at(-hx, hy), at(hx, hy)];
    });
    // Content inside the shell's scroll region keeps its full rect even when
    // part of it is scrolled out of the clip. A point beyond the clip is not
    // covered — it is reachable by scrolling, and the tab bar sits outside
    // the clip in flow, so it can never cover what is inside. Points within
    // the clip are still fully checked.
    if (points.length === 0) {
        return `${describe(node)} stands in a frame turned ${degrees(angle)} and has no layout box of its own, which the probe cannot read past 45° — it reads a turned element by its own size, and a node with none only under 45°`;
    }
    const cut = cutSideways(node, box);
    if (cut !== undefined) {
        return cut;
    }
    const clips = clipsOf(node);
    for (const [x, y] of points) {
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
            // Below the fold is reached by scrolling; past a side edge was
            // ruled on above, for the whole box.
            continue;
        }
        if (
            clips.some(
                ({ rect: clip }) =>
                    y < clip.top + 1 || y > clip.bottom - 1 || x < clip.left || x > clip.right,
            )
        ) {
            continue;
        }
        const hit = document.elementFromPoint(x, y);
        if (hit === null) {
            continue;
        }
        // The node itself, or something inside it. An **ancestor** is not
        // allowed: `elementFromPoint` attributes a pseudo-element's paint to
        // the element that owns it, so `.item-head::after { position: absolute
        // }` laid over the price reports as `.item-head` — and treating an
        // ancestor as innocent made the first version of this guard blind to
        // exactly the defect §6 names, a shipped decoration over the amount.
        if (hit !== node && !node.contains(hit)) {
            // The price column is one composed figure: its own unit, rate
            // and fiat lines sit flush against the amount, and the swaying
            // rural tag rotates them all together — a sibling inside the
            // same .item-p one pixel into a corner is the label's own
            // typography, not something covering it. Anything from outside
            // the column still fails exactly as before.
            const column = node.closest('.item-p');
            if (column !== null && column.contains(hit)) {
                continue;
            }
            return `covered at ${Math.round(x)},${Math.round(y)} by ${describe(hit)}`;
        }
    }
    return undefined;
}

/*
 * **Nothing covers money or a protected box** (before 8g2, 1a;
 * `nothing-covers-money-or-a-protected-box`, bound since 7a). `coveredBy`
 * asks five points of the price, "You pay" and the unbuyable label alone,
 * with `pointer-events` as the page has it, so a box a look moved over any
 * other money node — the no-escrow note over the pay sheet's figure, a
 * face's line over a quote's, a code's own fold summary over its modules —
 * was read by no geometry rule, and one carrying `pointer-events: none` by
 * none at all (the critic's PC2, PC3, PC3′, SVs, PQ). This asks every money
 * node (`MONEY_FIGURES`), every protected box (`PROTECTED`) and the
 * unbuyable label (`COVER_NODES`) in the open surface, with `pointer-events`
 * and `interactivity` forced on by one sheet adopted once a page, over every
 * element the app's root holds, switched on for the read and left on until
 * the next paint throws its tree away (`coverPointers`, `releaseCover`,
 * `dropCoverForPaint`): for a node with text, points over every glyph's ink
 * — down its centre column and along its middle row no more than
 * `INK_LINE_PITCH` (3px) apart, and a coarser lattice off those lines on a
 * glyph wider than one column (`eachInkPoint`); for one with none — a code —
 * the box's centre, its corners inside its rounded shape and a grid over the
 * code (`layout/coverPoints.ts`), each in its own frame. A paint with no hit
 * area — a shadow, an outline, a neighbour's underline — is not
 * hit-testable whatever the forcing, and is 1b's
 * (`a-paint-with-no-hit-area-reaches-no-money`, bound since 7b, below).
 *
 * **What a lattice of points cannot see, stated** (the critic's item 7):
 * any fixed set of points can be dodged. A cover thinner than the pitch
 * between two points, or one cut around them — a `clip-path` with holes
 * where the points stand, a mask, a shape that reaches neither the centre
 * column nor the middle row — is asked nowhere; a band at least 3px tall
 * across a glyph's centre column, or 3px wide across its middle row, meets
 * a point wherever it stands. A cover that meets no point is read by
 * nothing else off the screens the contrast pass samples, and there only as
 * the figure's ground: no rule reads a glyph's own pixels for what covers
 * it (1c, the per-character digit read, is not built).
 * **And the other way, a class of false red** (the critic's item 8): a box
 * that paints nothing — a transparent wrapper — has a hit area all the
 * same, and where it meets a glyph's ink box it reads as a cover; the touch
 * wall's `span.sw-step` over a quote's figure did, before the touch-wall
 * branch moved the stepper off the figure.
 *
 * **At rest, once a paint, on every geometry pass — last, after every other
 * read of the paint, with every animation on the page reset and its delay
 * zeroed (`coverAtRest`) — and once a contrast job at its full height**
 * (`window.__coverFaults`): the job's page is grown to the height it asks
 * (`pageHeight`), so below its first screen stands only what a surface that
 * is not the reader's to scroll holds past it — a wall, shot at its own
 * screen's size, its list and a payment's lines inside its own scrollers
 * (over the default plan's jobs read at rest, 74,549 of 75,093 such points
 * on the canvas's 35-item payment and the rest on Browse at the desk;
 * the reduced-motion and tide jobs were not counted), counted, not asked,
 * like every point below a geometry pass's screen (D3). Each failure is a
 * failure of the pass (or of the contrast pass), and every geometry pass
 * owes a read that hit-tested a point on every look it painted
 * (`probe-coverage.mjs`); every contrast job not refused owes its read.
 *
 * **Not at `checkOverTime`'s six instants**: measured over the phone pass's
 * whole screen set, they take the reads from 886 to 4,600 and the rule's own
 * time from 1.2s to 5.8s a pass (desk 2.2s to 11.8s). **Over time no hit
 * test asks any money node but the price and "You pay"** (the fourth
 * review's item 5(a)): those two are read by `coveredBy`, bound at rest and
 * at the six instants under its own check names ("asked amount is covered",
 * "you-pay figure is covered"), and the unbuyable label by `coveredBy` at
 * the last instant (`unbuyableFaults`); every other money node and every
 * protected box is hit-tested at rest alone, and at the end of a lasting
 * animation (below). Even over the price and "You pay", `coveredBy` asks
 * with `pointer-events` as the page has it, so a moving cover that takes no
 * hit is read over time by nothing but the decoration sweep (a positioned
 * or decoration box) and, on the sampled screens, the contrast pass at its
 * one frozen instant. Its cost is counted (`coveredByCalls`,
 * `coveredByMs`). A cover that moves into place between frames is read by
 * neither (the critic's P3-1). Stated.
 *
 * **And once more at the end of every animation that keeps its end**
 * (`coverAtEnd`; the critic's third review, item 2, PF2; D-2026-10-26-03):
 * on a paint with a finite run filled `forwards` or `both`, after the read
 * at rest, each such animation is seeked to its end and 1a reads the paint
 * again — a cover that arrives at the end of a one-shot and stays (PF2, a
 * `scaleY` from 0 at 95% of 10s, filled forwards) had no area at rest, at
 * 400ms or at any instant, the instants stopping at six sevenths of the
 * longest animation. A keyframe on a custom property or an inherited ink on
 * a box above a figure (the critic's PT2) is the dress rule's, which reads
 * the held dress at every keyframe offset (`offsetDressFaults`).
 *
 * Fails closed: an element still computing `pointer-events` or
 * `interactivity` other than `auto` (only a declaration that outranks the
 * forcing can: an inline `!important`, or an `!important` rule more specific
 * than `[data-probe-cover] *`, which no served sheet writes on either
 * property), an inert subtree or a modal dialog, which no sheet makes
 * hit-testable, a point inside the viewport with nothing under it, a node
 * turned past 45° with no box of its own, and a node with no box that a look
 * takes away — by an animation (`animatedAway`) or a rule (`hiddenBy`,
 * which also fails a box nothing of the app's own explains). One the app
 * hides itself — the address twin a width does not paint, a desk-only fold
 * on a phone, the wall's list while a payment stands — is skipped and
 * counted. That the price and "You pay" have a box at all is `coveredBy`'s
 * ("has no box at all"), whoever hides them.
 *
 * **Where a point is asked** (`clipVerdict`). Inside the viewport it is
 * hit-tested unless it stands behind a clip: one a scroller above it can
 * bring into view is counted, held to `CLIP_SKIP_CEILING` beside the points
 * asked — apart where its innermost clip is one of the two wall scrollers
 * (`WALL_SCROLLERS`), which scroll by design and are counted beside the
 * ratio; one past a scroller's reach (`scrollReach`, before 8g2 item 3) —
 * the node's own scroller included for the text inside it — fails; and one
 * past a clip that cuts there and does not scroll, with no scroller inside
 * it to bring it in, fails (7a; until then it was counted as one behind a
 * scroller, the critic's third review, item 3). Past the viewport's side
 * edges or above its top it is asked whether a scroller brings it into view
 * (`offScreenReach`, the window's item 3): counted where one does — past a
 * side and above the top apart — failed where none does. **Below the bottom
 * it is counted and not asked** (D3): out-of-reach is read there by the
 * self-clip rule for the node's own text, and by nothing for a cover.
 */
const COVER_CHECK = 'nothing-covers-money-or-a-protected-box';
/**
 * A code's grid pitch, CSS pixels: 32 since before 8g2's cost round, where
 * it was 24. Measured on the rule's own time: at rest over the phone pass's
 * screens and nine wall screens at 768x1024, 24 cost 3% and 17% more than 32;
 * over six desk screens read at every instant, 16 cost 39% more than 24. The
 * critic's PQ cover is a fold summary 80px in from each side with 30px of
 * padding, which either pitch meets (PQ reads red at 32). A cover smaller
 * than the pitch can stand between its points, stated:
 * `a-code-keeps-its-quiet-zone-white` reads the ring around a code by its
 * pixels, and 1d (not built) is to read its modules.
 */
const QR_PITCH = 32;
/**
 * The nodes 1a asks: every money node (`MONEY_FIGURES`), every protected box
 * (`PROTECTED`), and the unbuyable label (7a; the critic's third review, its
 * checklist item 4), which `coveredBy` asks too and no list here held.
 */
const COVER_NODES = () => `${MONEY_FIGURES}, ${PROTECTED}, [data-role="unbuyable"]`;
/**
 * One read's tallies, and its failures as sentences (`faults`), each naming
 * the node. Points: `checked`, hit-tested; `below`, below the viewport's
 * bottom, counted and not asked (D3); `offSide` past a side edge and
 * `above` above the top, each where a scroller or the page brings it into
 * view (`offScreenReach`); `clipSkips`, behind a clip a scroller brings it
 * out from, held to `CLIP_SKIP_CEILING` beside `checked`; `wallScroll`,
 * behind one of the two wall scrollers (`WALL_SCROLLERS`), counted apart.
 * `appHidden`: nodes the app itself hides, skipped.
 */
type CoverScan = {
    nodes: number;
    points: number;
    checked: number;
    below: number;
    offSide: number;
    above: number;
    clipSkips: number;
    wallScroll: number;
    appHidden: number;
    faults: string[];
};
/** A look's tallies on a pass: its reads (`paints`), every count summed, and its failures counted (`failed`). */
type CoverTally = Omit<CoverScan, 'faults'> & { paints: number; failed: number };
/** The rule's own tallies per look on this pass; `coverMs` its own time. */
const coverByClass: Record<string, CoverTally> = {};
let coverMs = 0;
let coverSheet: CSSStyleSheet | undefined;

/**
 * Force (or stop forcing) every element and pseudo-element of the painted
 * tree to take a hit: the attribute goes on each element the app's root
 * holds (`#app`'s children, which `renderStall` replaces on every paint),
 * and the sheet forces them, everything under them and their pseudos.
 */
function coverPointers(on: boolean): void {
    if (coverSheet === undefined) {
        coverSheet = new CSSStyleSheet();
        coverSheet.replaceSync(
            '[data-probe-cover],[data-probe-cover] *,[data-probe-cover]::before,[data-probe-cover]::after,[data-probe-cover] *::before,[data-probe-cover] *::after{pointer-events:auto!important;interactivity:auto!important}',
        );
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, coverSheet];
    }
    for (const el of coverForced) el.removeAttribute('data-probe-cover');
    coverForced = on ? [...document.getElementById('app')!.children] : [];
    for (const el of coverForced) el.setAttribute('data-probe-cover', '');
}
/** The elements the forcing is on (`coverPointers`); empty when it is off. */
let coverForced: Element[] = [];

/**
 * **The forcing is left on after a read, and goes with the tree it is on**
 * (before 8g2, cost; the owner's D-2026-10-20-13 item 7): turning it on
 * restyles the painted tree, and turning it off again restyles it a second
 * time. The read is the last thing done to a paint, and the next paint
 * throws that tree away (`renderStall` replaces `#app`'s children), so the
 * forcing is on the tree's own root elements, not on `<html>`, and a paint
 * takes it off by discarding them (`dropCoverForPaint`): no element is
 * restyled for it. When it was on `<html>`, taking it off before the paint
 * restyled the whole old tree anyway — `renderStall` reads the old
 * scroller's offset before it replaces it, which lays the old tree out —
 * and that restyle, about 0.6–1.0s a phone pass, was paid outside the
 * rule's own timer (measured with a CPU profile, `renderStall` inclusive,
 * cba463b against main). `pointer-events` and `interactivity` change no
 * layout, and no pixel here only because nothing on this page moves the
 * mouse: a pointer over an element the forcing made hit-testable would put
 * it in `:hover`, and its hover rules would paint. What they change is a
 * hit test, and the one other hit test here (`coveredBy`) takes the forcing
 * off before it asks (`releaseCover`, which restyles, since its tree stays).
 */
function releaseCover(): void {
    if (coverForced.length > 0) coverPointers(false);
}

/**
 * Before a paint: forget the forced elements, which the paint discards.
 * After it (`coverGoneAfterPaint`), any of them still on the page — a paint
 * that kept a root element, which `renderStall` never does — is released
 * the costly way, so the forcing never outlives its tree.
 */
let coverDropped: Element[] = [];
function dropCoverForPaint(): void {
    coverDropped = coverForced;
    coverForced = [];
}
function coverGoneAfterPaint(): void {
    for (const el of coverDropped) if (el.isConnected) el.removeAttribute('data-probe-cover');
    coverDropped = [];
}

/** A node in a sentence: its tag and classes, and its role. */
function named(node: Element): string {
    const role = node.getAttribute('data-role');
    return `${describe(node)}${role === null ? '' : `[${role}]`}`;
}

/**
 * Every rule that declares `display` or `content-visibility`, the app's and
 * the looks' (a look's names a look's or a decoration's class, `LOOK_RULE`,
 * the look-pseudo reading's own), with the value it declares as written —
 * a `var()` kept a `var()` — and the media conditions above it, indexed by
 * the first class (or id) of the selector's last compound, `*` where it has
 * none or carries a functional pseudo-class. Read once a page and again when
 * a sheet joins it. A rule under any other condition (a container query)
 * counts as in force.
 */
type HideRule = { selector: string; media: string[]; look: boolean; prop: 'display' | 'content-visibility'; value: string };
let hideRules: Map<string, HideRule[]> | undefined;
let hideRulesSheets = -1;
function hideRulesNow(): Map<string, HideRule[]> {
    if (hideRules !== undefined && hideRulesSheets === document.styleSheets.length) return hideRules;
    hideRules = new Map();
    hideRulesSheets = document.styleSheets.length;
    for (const rule of styleRules()) {
        for (const prop of ['display', 'content-visibility'] as const) {
            const value = rule.style.getPropertyValue(prop).trim();
            if (value === '') continue;
            const media: string[] = [];
            for (let up = rule.parentRule; up !== null; up = up.parentRule) {
                if (up instanceof CSSMediaRule) media.push(up.media.mediaText);
            }
            for (const one of selectorList(rule.selectorText)) {
                if (PSEUDO_AT.test(one)) continue;
                const last = one.split(/\s*[\s>+~]\s*(?![^(]*\))(?![^[]*\])/).pop() ?? '';
                const key = last.includes('(') ? '*' : (/\.((?:\\.|[\w-])+)/.exec(last)?.[0] ?? /#((?:\\.|[\w-])+)/.exec(last)?.[0] ?? '*');
                const list = hideRules.get(key) ?? [];
                list.push({ selector: one, media, look: LOOK_RULE.test(one), prop, value });
                hideRules.set(key, list);
            }
        }
    }
    return hideRules;
}

/**
 * **Who takes a box away** (before 8g2; the window's item 5, the critic's
 * PV): of the node and the boxes above it, those computing `display: none`
 * (or, above it, `content-visibility: hidden`), read against the rules that
 * declare the property on them (`hideRulesNow`), in force. `look` where a
 * look's rule could be the one that hides any of them — its value the
 * hiding one, a `var()` or a keyword that defers to another value — or
 * where nothing of the app's own explains any of them: the `hidden`
 * attribute, an inline style (the app's alone; a look writes none), or an
 * app rule declaring the hiding value as written. `app` otherwise.
 * Undefined when nothing above the node takes its box away at all. Read by
 * value until then, a look's `content-visibility: var(--h)` read as no
 * look's rule, and the node was skipped as one the app hides.
 */
function hiddenBy(node: Element): 'app' | 'look' | undefined {
    const hidden: [Element, 'display' | 'content-visibility'][] = [];
    for (let at: Element | null = node; at !== null; at = at.parentElement) {
        const cs = getComputedStyle(at);
        if (cs.display === 'none') hidden.push([at, 'display']);
        else if (at !== node && cs.getPropertyValue('content-visibility') === 'hidden') hidden.push([at, 'content-visibility']);
    }
    if (hidden.length === 0) return undefined;
    const rules = hideRulesNow();
    let app = false;
    for (const [el, prop] of hidden) {
        const hiding = prop === 'display' ? 'none' : 'hidden';
        if (prop === 'display' && el.hasAttribute('hidden')) app = true;
        if (el instanceof HTMLElement && el.style.getPropertyValue(prop) === hiding) app = true;
        const keys = ['*', ...(el.id === '' ? [] : [`#${el.id}`]), ...[...el.classList].map((c) => `.${c}`)];
        for (const key of keys) {
            for (const r of rules.get(key) ?? []) {
                if (r.prop !== prop || !r.media.every((m) => matchMedia(m).matches) || !el.matches(r.selector)) continue;
                if (r.look) {
                    if (r.value === hiding || r.value.includes('var(') || /^(inherit|unset|revert|revert-layer)$/.test(r.value)) return 'look';
                } else if (r.value === hiding) {
                    app = true;
                }
            }
        }
    }
    return app ? 'app' : 'look';
}

/**
 * **An animation that takes a box away is the look's doing** (before 8g2,
 * item 4): the running animation on `node` or a box above it, up to its
 * stall, whose keyframes name `display` or `content-visibility` — the
 * one, with the box running it and the value, as a sentence — or
 * undefined. A keyframe `display: none` is a look's (no served sheet's
 * keyframes name either property, and the app runs no script animation),
 * and the rule reading style rules alone (now `hiddenBy`), like a skip of
 * every node with no box, took it for the app hiding the node: the
 * critic's T2c hid every quote row's figure behind a keyframe and left Pay
 * standing, and the whole runner passed. Only an animation that names one
 * of the two: Modern's sign animates around the address twin the app hides
 * at each width, and Rural's tag sways around its own lines, so any
 * running animation above a node with no box would be a false red. A
 * keyframe naming either property is read as able to take the box away,
 * whatever its value (a `var()` resolves where it is used).
 */
function animatedAway(node: Element): string | undefined {
    for (let at: Element | null = node; at !== null && at.id !== 'app'; at = at.parentElement) {
        for (const anim of at.getAnimations()) {
            const effect = anim.effect;
            if (!(effect instanceof KeyframeEffect)) continue;
            for (const frame of effect.getKeyframes()) {
                for (const key of ['display', 'contentVisibility'] as const) {
                    const value = (frame as Record<string, unknown>)[key];
                    if (typeof value !== 'string') continue;
                    const name = 'animationName' in anim ? String((anim as CSSAnimation).animationName) : 'an animation';
                    return `${at === node ? 'it runs' : `${named(at)} runs`} ${name}, whose keyframes set ${key === 'display' ? 'display' : 'content-visibility'} ${value}`;
                }
            }
        }
        if (at.matches('.stall')) break;
    }
    return undefined;
}

/** A node's corner radii, as computed, against a box `w` by `h`. */
function radiiOf(node: Element, w: number, h: number): Radii {
    const cs = getComputedStyle(node);
    return {
        tl: radiusOf(cs.borderTopLeftRadius, w, h),
        tr: radiusOf(cs.borderTopRightRadius, w, h),
        br: radiusOf(cs.borderBottomRightRadius, w, h),
        bl: radiusOf(cs.borderBottomLeftRadius, w, h),
    };
}

/** The first move found on `hit` or a box above it below `column` (`movedBy`), or undefined. */
function movedBelow(hit: Element, column: Element): string | undefined {
    for (let at: Element | null = hit; at !== null && at !== column; at = at.parentElement) {
        const cs = getComputedStyle(at);
        const moved = movedBy({
            position: cs.position,
            top: cs.top,
            right: cs.right,
            bottom: cs.bottom,
            left: cs.left,
            transform: cs.transform,
            translate: cs.translate,
            rotate: cs.rotate,
            scale: cs.scale,
            marginTop: cs.marginTop,
            marginRight: cs.marginRight,
            marginBottom: cs.marginBottom,
            marginLeft: cs.marginLeft,
        });
        if (moved !== undefined) return `${named(at)} ${moved}`;
    }
    return undefined;
}

/**
 * The node's own frames: one for a box, one a line for an inline node broken
 * over lines (a sliver under a pixel, a `<wbr>`'s, holds no glyph and is
 * left out); undefined where a turn hides it.
 */
function coverFrames(node: Element, rects: readonly DOMRect[]): { frames: Frame[]; whole: boolean } | undefined {
    const angle = angleOf(node);
    const lineRects = rects.filter((r) => r.width >= 1 && r.height >= 1);
    if (lineRects.length > 1) {
        const lines = lineRects.map((r) => (angle === 0 ? { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height } : turnedBox(r, angle)));
        if (lines.every((f) => f !== undefined)) return { frames: lines.map((f) => ({ ...f!, angle })), whole: false };
    }
    const box = node.getBoundingClientRect();
    if (angle === 0) return { frames: [{ cx: box.left + box.width / 2, cy: box.top + box.height / 2, w: box.width, h: box.height, angle }], whole: true };
    const own =
        ownFrame(node, box, angle) ??
        (node.clientWidth > 0 && node.clientHeight > 0 ? { cx: box.x + box.width / 2, cy: box.y + box.height / 2, w: node.clientWidth, h: node.clientHeight } : undefined);
    return own === undefined ? undefined : { frames: [{ ...own, angle }], whole: true };
}

/**
 * Where a character's glyph inks, from the top-left of its own box (its
 * range rect, before any turn): the ink model's own measure
 * (`measurePainted`, `src/ui/signInk.ts`) of the character as painted, about
 * the baseline the box's content area sets — the box's top plus the face's
 * ascent, as `inkLines` reads a line. One measure per face and character a
 * page (`glyphInks`). Undefined where nothing measures.
 */
const glyphInks = new Map<string, Box | null>();
/** The key a face's measures are kept under (`glyphInk`). */
function faceKey(cs: CSSStyleDeclaration): string {
    return `${cs.fontStyle}|${cs.fontWeight}|${cs.fontSize}|${cs.fontFamily}|${cs.fontVariantCaps}|${cs.fontStretch}|${cs.textTransform}|`;
}
function glyphInk(ch: string, cs: CSSStyleDeclaration, face: string): Box | undefined {
    const key = face + ch;
    let ink = glyphInks.get(key);
    if (ink === undefined) {
        const m = measurePainted(painted(ch, cs.textTransform), cs);
        ink =
            m === undefined || !(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent > 0)
                ? null
                : {
                      left: -m.actualBoundingBoxLeft,
                      right: m.actualBoundingBoxRight,
                      top: m.fontBoundingBoxAscent - m.actualBoundingBoxAscent,
                      bottom: m.fontBoundingBoxAscent + m.actualBoundingBoxDescent,
                  };
        glyphInks.set(key, ink);
    }
    return ink ?? undefined;
}

/** `el`'s clips, and `el` itself where it clips its content (a scroller holding the text read). */
function clipsWithin(el: Element): Clip[] {
    const cs = getComputedStyle(el);
    const self =
        cs.overflowX !== 'visible' || cs.overflowY !== 'visible'
            ? [{ rect: el.getBoundingClientRect(), el, cutsX: cs.overflowX === 'hidden' || cs.overflowX === 'clip', overflowX: cs.overflowX, overflowY: cs.overflowY }]
            : [];
    return [...self, ...clipsOf(el)];
}

/**
 * One node's points, flat and reused node to node (before 8g2, the owner's
 * D-2026-10-20-13): a pass asks about a million points, and an object a
 * point — two, with its clips — was garbage the collector paid for outside
 * the rule's own timer. Grown, never shrunk; `ptN` is the count.
 */
const KIND_NAMES: readonly PointKind[] = ['centre', 'corner', 'ink', 'grid'];
const KIND_OF: Record<PointKind, number> = { centre: 0, corner: 1, ink: 2, grid: 3 };
const KIND_INK = KIND_OF.ink;
let ptX = new Float64Array(4096);
let ptY = new Float64Array(4096);
let ptKind = new Uint8Array(4096);
let ptClips = new Int32Array(4096);
let ptN = 0;
function pushPoint(x: number, y: number, kind: number, clips: number): void {
    if (ptN === ptX.length) {
        const n = ptX.length * 2;
        const [nx, ny, nk, nc] = [new Float64Array(n), new Float64Array(n), new Uint8Array(n), new Int32Array(n)];
        nx.set(ptX);
        ny.set(ptY);
        nk.set(ptKind);
        nc.set(ptClips);
        [ptX, ptY, ptKind, ptClips] = [nx, ny, nk, nc];
    }
    ptX[ptN] = x;
    ptY[ptN] = y;
    ptKind[ptN] = kind;
    ptClips[ptN] = clips;
    ptN += 1;
}

/**
 * Why a point past the viewport's side edge or above its top is shown at no
 * scroll position, or undefined where one shows it (before 8g2, the
 * window's item 3; the critic's PC put a shelf's prices past the right
 * edge, past the scroll origin no position reaches, and 1a only counted
 * them): on each axis it is out on, some scroller among `clips` that
 * scrolls on that axis must bring it inside both its own box and the
 * viewport (`reachWithin`), or the page must scroll there itself — sideways
 * is the sideways-scroll rule's failure, and up is as far as the page is
 * scrolled down. One scroller at a time, as `cutSideways` reads them. A
 * point below the bottom is not asked: it is counted (D3).
 */
function offScreenReach(x: number, y: number, clips: readonly Clip[], reaches: Map<Element, Reach>, vw: number, vh: number): string | undefined {
    const reachOf = (el: Element): Reach => {
        let reach = reaches.get(el);
        if (reach === undefined) {
            reach = scrollReach(el);
            reaches.set(el, reach);
        }
        return reach;
    };
    const brought = (axis: 'x' | 'y', at: number, hi: number): boolean =>
        clips.some((clip) => {
            if (!scrollsOn(axis === 'x' ? clip.overflowX : clip.overflowY)) return false;
            const [from, to] = reachWithin(reachOf(clip.el), axis, 0, hi);
            return at >= from - 1 && at <= to + 1;
        });
    if ((x < 0 || x >= vw) && document.documentElement.scrollWidth <= vw + 1 && !brought('x', x, vw)) {
        return `past the viewport's ${x < 0 ? 'left' : 'right'} edge (of ${vw}), and no scroll position brings it in`;
    }
    if (y < 0 && -y > window.scrollY + 1 && !brought('y', y, vh)) {
        return `above the viewport's top, and no scroll position brings it in`;
    }
    return undefined;
}

/** Why `node` is covered (or the read cannot say), as a sentence, or undefined; the points counted into `scan`. */
function coverOf(node: Element, scan: CoverScan, asked: ReadonlySet<Element>, reaches: Map<Element, Reach>): string | undefined {
    const rects = [...node.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (rects.length === 0) {
        const animated = animatedAway(node);
        if (animated !== undefined) return `has no box: ${animated} — a look's animation takes it away`;
        const by = hiddenBy(node);
        if (by === 'app') {
            scan.appHidden += 1;
            return undefined;
        }
        return by === 'look' ? 'has no box: a rule of the look takes it away, or nothing of the app’s own explains why it has none (hiddenBy)' : 'has no box at all, and nothing above it is hidden';
    }
    // Where the node stands (`coverAsked`, read by the end read's prune), its points added below.
    const askedHere = {
        node,
        reach: rects.reduce<Box>(
            (b, r) => ({ left: Math.min(b.left, r.left), top: Math.min(b.top, r.top), right: Math.max(b.right, r.right), bottom: Math.max(b.bottom, r.bottom) }),
            { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
        ),
    };
    coverAsked.push(askedHere);
    const framed = coverFrames(node, rects);
    if (framed === undefined) {
        return `stands in a frame turned ${degrees(angleOf(node))} and has no layout box of its own, which the read cannot take apart past 45°`;
    }
    // The points, flat (`pushPoint`), each with its clips by index.
    ptN = 0;
    const clipLists: (Clip & ClipBox)[][] = [];
    const withWall = (list: Clip[]): (Clip & ClipBox)[] => list.map((c) => ({ ...c, wall: c.el.matches(WALL_SCROLLERS) }));
    const reachOf = (el: Element): Reach => {
        let reach = reaches.get(el);
        if (reach === undefined) {
            reach = scrollReach(el);
            reaches.set(el, reach);
        }
        return reach;
    };
    let clipIdx = -1;
    const emitInk = (x: number, y: number): void => pushPoint(x, y, KIND_INK, clipIdx);
    // Every character's glyph, over its ink (`eachInkPoint`), inside every
    // clip above it — its own element's included: a record's bytes scroll
    // inside their own box, and a line scrolled out of it stands under
    // whatever follows. A character inside another node this read asks (the
    // address's two spans inside its box, a line's figure inside Pay
    // several's lines) is asked once, by the innermost: a hit on the outer
    // node or on anything else inside it fails there and is excused here.
    const range = document.createRange();
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const ofParent = new Map<Element, { clips: number; cs: CSSStyleDeclaration; face: string; angle: number; vertical: boolean } | null>();
    let innerText = false;
    for (let t = walker.nextNode(); t !== null; t = walker.nextNode()) {
        const text = t as Text;
        const parent = text.parentElement;
        if (parent === null) continue;
        let own = ofParent.get(parent);
        if (own === undefined) {
            let inner = false;
            for (let at: Element | null = parent; at !== null && at !== node; at = at.parentElement) {
                if (asked.has(at)) {
                    inner = true;
                    break;
                }
            }
            if (inner) {
                ofParent.set(parent, null);
                own = null;
            }
        }
        if (own === null) {
            innerText ||= text.data.trim() !== '';
            continue;
        }
        if (own === undefined) {
            const cs = getComputedStyle(parent);
            clipLists.push(withWall(clipsWithin(parent)));
            own = { clips: clipLists.length - 1, cs, face: faceKey(cs), angle: angleOf(parent), vertical: !cs.writingMode.startsWith('horizontal') };
            ofParent.set(parent, own);
        }
        clipIdx = own.clips;
        let at = 0;
        for (const ch of text.data) {
            const start = at;
            at += ch.length;
            if (/\s/.test(ch)) continue;
            range.setStart(text, start);
            range.setEnd(text, at);
            const r = range.getBoundingClientRect();
            if (r.width < 0.5 || r.height < 0.5) continue;
            const f = own.angle === 0 ? { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height, angle: 0 } : turnedBox(r, own.angle);
            if (f === undefined) {
                // A glyph turned past 45° has no frame to solve: its centre.
                pushPoint(r.left + r.width / 2, r.top + r.height / 2, KIND_INK, clipIdx);
                continue;
            }
            const frame = own.angle === 0 ? (f as Frame) : { ...f, angle: own.angle };
            const ink = own.vertical ? undefined : glyphInk(ch, own.cs, own.face);
            eachInkPoint(frame, ink ?? { left: 0, top: 0, right: frame.w, bottom: frame.h }, emitInk);
        }
    }
    // A box with no text — a code — is read by its own points: its centre,
    // its corners inside its rounded shape, and a code's grid.
    if (ptN === 0 && !innerText) {
        clipLists.push(withWall(clipsOf(node)));
        const nodeClips = clipLists.length - 1;
        for (const f of framed.frames) {
            const radii = framed.whole ? radiiOf(node, f.w, f.h) : SQUARE;
            for (const p of framePoints(f, radii)) pushPoint(p.x, p.y, KIND_OF[p.kind], nodeClips);
            if (framed.whole && node.matches('.qr')) for (const p of gridPoints(f, QR_PITCH, radii)) pushPoint(p.x, p.y, KIND_OF[p.kind], nodeClips);
        }
    }
    // And every point asked of it (`coverAsked`, read by the end read's prune).
    for (let i = 0; i < ptN; i += 1) {
        const r = askedHere.reach;
        askedHere.reach = { left: Math.min(r.left, ptX[i]!), top: Math.min(r.top, ptY[i]!), right: Math.max(r.right, ptX[i]!), bottom: Math.max(r.bottom, ptY[i]!) };
    }
    const column = node.closest('.item-p');
    const covered = new Map<PointKind, number>();
    let first: string | undefined;
    let firstInk: string | undefined;
    let outOfReach: string | undefined;
    const [vw, vh] = [window.innerWidth, window.innerHeight];
    const where = (x: number, y: number, kind: PointKind): string => `${Math.round(x)},${Math.round(y)} (${kind})`;
    // A figure in a moving or pinned ticker ribbon runs past the screen's
    // sides, and past its cell's and its bar's, by design (`cutSideways`'s
    // one exception, by value: `RUNNING_RIBBON`).
    const runsPastSides = node.closest(RUNNING_RIBBON) !== null;
    for (let i = 0; i < ptN; i += 1) {
        const x = ptX[i]!;
        const y = ptY[i]!;
        const kind = KIND_NAMES[ptKind[i]!]!;
        const clips = clipLists[ptClips[i]!]!;
        scan.points += 1;
        if (x < 0 || x >= vw || y < 0) {
            // Past a side edge or above the top: asked whether a scroller
            // brings it into the viewport (`offScreenReach`), and counted
            // where one does — no hit test answers outside the viewport.
            const why = runsPastSides && y >= 0 && y < vh ? undefined : offScreenReach(x, y, clips, reaches, vw, vh);
            if (why !== undefined) {
                outOfReach ??= `stands at ${where(x, y, kind)}, ${why}`;
                continue;
            }
            if (x < 0 || x >= vw) scan.offSide += 1;
            else scan.above += 1;
            continue;
        }
        if (y >= vh) {
            scan.below += 1;
            continue;
        }
        // Behind a clip (`clipVerdict`): counted where a scroller brings it
        // into view — apart where the innermost clip is a wall scroller —
        // and failed where it lies past a scroller's reach, or past a clip
        // that cuts there with no scroller inside it to bring it in.
        const verdict = clipVerdict(x, y, clips, (j) => reachOf(clips[j]!.el), { sidewaysByDesign: runsPastSides });
        if (verdict.kind === 'unreached') {
            const clip = clips[verdict.at]!;
            const reach = reachOf(clip.el);
            outOfReach ??=
                `stands at ${where(x, y, kind)} out of reach of ${named(clip.el)} (overflow ${clip.overflowX} ${clip.overflowY}, which scrolls from ` +
                `${Math.round(reach.x0)},${Math.round(reach.y0)} to ${Math.round(reach.x1)},${Math.round(reach.y1)}): no scroll position shows it`;
            continue;
        }
        if (verdict.kind === 'cut') {
            const clip = clips[verdict.at]!;
            const c = clip.rect;
            outOfReach ??=
                `stands at ${where(x, y, kind)} past ${named(clip.el)}'s ${verdict.axis === 'x' ? 'side' : 'top or bottom'} ` +
                `(${verdict.axis === 'x' ? `${Math.round(c.left)}–${Math.round(c.right)}` : `${Math.round(c.top)}–${Math.round(c.bottom)}`}, ` +
                `overflow ${clip.overflowX} ${clip.overflowY}), a clip that cuts there and does not scroll, and no scroller inside it brings it in`;
            continue;
        }
        if (verdict.kind === 'behind') {
            if (verdict.wall) scan.wallScroll += 1;
            else scan.clipSkips += 1;
            continue;
        }
        scan.checked += 1;
        const hit = document.elementFromPoint(x, y);
        if (hit === null) return `has nothing under ${where(x, y, kind)}, inside the viewport`;
        if (hit === node || node.contains(hit)) continue;
        const inColumn = columnPlace(column !== null && column.contains(hit), hit.contains(node));
        const moved = inColumn === 'inside' ? movedBelow(hit, column!) : undefined;
        if (columnExcuses(kind, inColumn, moved)) continue;
        covered.set(kind, (covered.get(kind) ?? 0) + 1);
        if (first === undefined || (kind === 'ink' && firstInk === undefined)) {
            const sentence =
                `is covered at ${where(x, y, kind)} by ${named(hit)}` +
                (inColumn === 'column' ? ' — a box of its own price column that holds it, a pseudo of which reports as that box' : '') +
                (moved !== undefined ? ` — inside its price column, moved: ${moved}` : '');
            first ??= sentence;
            if (kind === 'ink') firstInk ??= sentence;
        }
    }
    if (outOfReach !== undefined) return outOfReach;
    if (first === undefined) return undefined;
    // The most telling hit first — over a glyph — and how many of each kind.
    return `${firstInk ?? first} (${[...covered].map(([kind, n]) => `${n} ${kind}`).join(', ')} point(s) covered)`;
}

/**
 * The read over the open surface, the forcing switched on for it and left
 * on until the next paint (`releaseCover`). It also asks that the forcing
 * took: every element of the app computes `pointer-events` and
 * `interactivity` `auto`, and no inert subtree or modal dialog stands
 * anywhere.
 */
function coverScan(): CoverScan {
    const root = document.getElementById('app')!;
    const scrim = root.querySelector('[data-role="sheet-scrim"], [data-role="poster"], [data-role="zoom"]');
    const surface: ParentNode = scrim ?? root;
    const nodes = [...new Set(surface.querySelectorAll(COVER_NODES()))].filter((n) => n.closest('.deck-stall') === null);
    const scan: CoverScan = { nodes: nodes.length, points: 0, checked: 0, below: 0, offSide: 0, above: 0, clipSkips: 0, wallScroll: 0, appHidden: 0, faults: [] };
    coverAsked = [];
    coverPointers(true);
    try {
        const interactivity = CSS.supports('interactivity', 'auto');
        for (const el of [root, ...root.querySelectorAll('*')]) {
            const cs = getComputedStyle(el);
            const i = cs.getPropertyValue('interactivity');
            if (cs.pointerEvents !== 'auto' || (interactivity && i !== 'auto')) {
                scan.faults.push(`${named(el)} computes pointer-events ${cs.pointerEvents}${interactivity ? `, interactivity ${i}` : ''} with both forced auto — a hit test reads through it`);
            }
        }
        for (const el of document.querySelectorAll('[inert], dialog:modal')) {
            scan.faults.push(`${named(el)} is ${el.matches('[inert]') ? 'inert' : 'a modal dialog'}, which no sheet makes hit-testable`);
        }
        const asked = new Set(nodes);
        const reaches = new Map<Element, Reach>();
        for (const node of nodes) {
            const why = coverOf(node, scan, asked, reaches);
            if (why !== undefined) scan.faults.push(`${named(node)} ${why}`);
        }
    } catch (err) {
        coverPointers(false);
        throw err;
    }
    return scan;
}

/** The counts a look's tally sums, read by read. */
const COVER_COUNTS = ['nodes', 'points', 'checked', 'below', 'offSide', 'above', 'clipSkips', 'wallScroll', 'appHidden'] as const;

/**
 * The read on a geometry pass's paint, into the measuring look's tally; its
 * failures. `end` is the end-state read's (`coverAtEnd`): the animations it
 * seeked to their ends, by name, and the read at rest's failures, which it
 * does not say again — a cover that stands at rest and at the end is one
 * failure, said by the read at rest. Its points and its new failures join
 * the tally, and it is not a paint of its own.
 */
function coverRead(screen: string, label: string, end?: { names: string; atRest: ReadonlySet<string> }): Failure[] {
    const t0 = performance.now();
    const scan = coverScan();
    const faults = end === undefined ? scan.faults : scan.faults.filter((detail) => !end.atRest.has(detail));
    const tally = (coverByClass[measuringClass] ??= { paints: 0, nodes: 0, points: 0, checked: 0, below: 0, offSide: 0, above: 0, clipSkips: 0, wallScroll: 0, appHidden: 0, failed: 0 });
    if (end === undefined) tally.paints += 1;
    for (const key of COVER_COUNTS) tally[key] += scan[key];
    tally.failed += faults.length;
    const spent = performance.now() - t0;
    coverMs += spent;
    if (end !== undefined) {
        coverEnd.reads += 1;
        coverEnd.failed += faults.length;
        coverEndMs += spent;
    }
    return faults.map((detail) => ({ screen, theme: label, check: COVER_CHECK, detail: end === undefined ? detail : `at the end of ${end.names}: ${detail}` }));
}

/** The end-state read's own counts (`coverAtEnd`): paints that paid for it, paints it left out because no lasting animation could cover anything asked (`endMoot`), the failures it found, and the animations it seeked to their ends by name; and its time, inside `coverMs` (a clock). */
const coverEnd = { reads: 0, skipped: 0, failed: 0, names: {} as Record<string, number> };
let coverEndMs = 0;

/** Every node the last 1a read asked, and where it and its points stood (`coverOf`); the end read's prune reads the read at rest's. */
let coverAsked: { node: Element; reach: Box }[] = [];

/** The longhands an animation may set and be left out of the end read, inside a clip that holds nothing asked (`endMoot`). */
const END_MOOT_PROPS: ReadonlySet<string> = new Set(['transform', 'rotate', 'scale', 'translate']);

/**
 * The computed displays whose box clips what it holds under an `overflow`
 * but `visible` or a painting `contain`, as Chrome reads them (`endMoot`;
 * before 8g2, the fifth review's item 1, the critic's PFCd). Measured in
 * headless Chrome 156, a child translated 300px past a 100×40
 * box, hit-tested where it was painted, under `overflow: hidden`,
 * `overflow: clip` and `contain: paint` alike: every display listed here
 * clips it, `table-cell`, `table` and `table-caption` among them; `inline`,
 * `contents`, `ruby`, `ruby-text` and the table rows, row groups, header and
 * footer groups and columns compute the overflow and clip nothing (a
 * `display: contents` box's rect is 0×0 at the origin, an inline box's its
 * line). A display not listed — one a newer engine adds — clips nothing
 * here, so the end read is made: it fails closed.
 */
const CLIPPING_DISPLAYS: ReadonlySet<string> = new Set([
    'block',
    'inline-block',
    'flex',
    'inline-flex',
    'grid',
    'inline-grid',
    'flow-root',
    'list-item',
    'table',
    'inline-table',
    'table-caption',
    'table-cell',
]);

/**
 * Whether a box that computes a clip on both axes clips what it holds
 * (`endMoot`): an HTML element (an SVG or MathML element's `overflow` is not
 * the CSS box's, and fails closed here) of a display that clips
 * (`CLIPPING_DISPLAYS`) whose border box is not empty.
 */
function boxClips(at: Element, cs: CSSStyleDeclaration): boolean {
    if (!(at instanceof HTMLElement) || !CLIPPING_DISPLAYS.has(cs.display)) return false;
    const r = at.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
}

/**
 * **The end read leaves out what cannot cover anything asked** (before 8g2,
 * the fourth review's cost item, its first prune; its clip test since the
 * fifth review): every end read on the clean tree, 1,816 over the geometry
 * passes and none failing, was the marquee's run — a transform on a name's
 * run inside the name's clipping cell. Such an animation's end moves paint
 * inside that cell alone, and a hit test there answers that cell's own
 * subtree, so where the cell meets no box and no point 1a asks, the end read
 * reads what the read at rest read. An animation is moot here (`endMoot`)
 * when its keyframes set only a transform, a rotate, a scale or a translate
 * (`END_MOOT_PROPS`, read as the offset read reads them, `keyframeProps`);
 * its box, or for a pseudo-element its owner, holds no node 1a asked; no
 * element under it, and no `::before` or `::after` of it or of one of them,
 * is absolutely or fixed positioned — a conservative belt, not one this read
 * rests on: added by reading for a containing block that would stand outside
 * the clip once the transform ended at `none`, and in Chrome 156 a transform
 * animation filled forwards keeps its box the containing block of what it
 * positions even at a computed `none` (the sixth review measured it, and its
 * PPD read the same with and without this condition), so it has no effect
 * there; kept for an engine that drops the containing block; it stands inside a box that clips on both axes — an `overflow`
 * but visible each way, or a painting `contain`, **on a box that clips**
 * (`boxClips`: an HTML element of a display Chrome clips by,
 * `CLIPPING_DISPLAYS`, with a box that is not empty) — with no absolutely or
 * fixed positioned box between, itself included; and that box — its border
 * box, grown by its `overflow-clip-margin` where it clips by `clip` — meets
 * no box of a node 1a asked at rest and no point it asked there
 * (`coverAsked`). A box that computes a clip and clips nothing is passed
 * over, and the walk goes on to the box above it: before the fifth review it
 * was taken for the clip, and the critic's PFCd3 — the quote head's labels
 * line made `display: contents` with `overflow: hidden`, its rail label
 * translated over the quote's figure and Pay at the end of a 10s run, filled
 * forwards — was left out of the end read on its 0×0 rect and passed the
 * whole runner. A paint whose every lasting animation is moot is not read at
 * its end and is counted (`coverEnd.skipped`); one with any other reads
 * every lasting animation's end as before. General: it names no class.
 *
 * **What it rests on, stated**: Chrome's clipping, measured per display
 * (`CLIPPING_DISPLAYS`); the asked nodes' boxes and points as 1a read them
 * at rest, in viewport coordinates, which ignores stacking — a clip box
 * behind an open sheet that overlaps the sheet's controls on screen is read,
 * though the sheet stands over it (conservative: the clean tree's 161 end
 * reads are such paints); and the end of each animation alone, every other
 * standing where the read at rest left it.
 */
function endMoot(anim: Animation): boolean {
    const effect = anim.effect;
    if (!(effect instanceof KeyframeEffect) || effect.target === null) return false;
    const props = keyframeProps(anim, effect);
    if (props === undefined || props.size === 0 || ![...props].every((prop) => END_MOOT_PROPS.has(prop))) return false;
    const el = effect.target;
    const pseudo = effect.pseudoElement;
    if (coverAsked.some((a) => el === a.node || el.contains(a.node))) return false;
    const positioned = (cs: CSSStyleDeclaration): boolean => cs.position === 'absolute' || cs.position === 'fixed';
    if (pseudo !== null && positioned(getComputedStyle(el, pseudo))) return false;
    // Nothing under the animated box positioned against a containing block that
    // could stand outside the clip: a belt (Chrome 156 keeps a forwards-filled
    // transform's containing block at a computed none).
    if (pseudo === null) {
        for (const e of [el, ...el.querySelectorAll('*')]) {
            if (e !== el && positioned(getComputedStyle(e))) return false;
            if (positioned(getComputedStyle(e, '::before')) || positioned(getComputedStyle(e, '::after'))) return false;
        }
    }
    // The innermost box that clips it both ways: for a pseudo-element its owner may be that box.
    for (let at: Element | null = pseudo !== null ? el : el.parentElement, below: Element = el; at !== null && at.id !== 'app'; below = at, at = at.parentElement) {
        if (!(pseudo !== null && at === el) && positioned(getComputedStyle(below))) return false;
        const cs = getComputedStyle(at);
        const clipsBoth = (cs.overflowX !== 'visible' && cs.overflowY !== 'visible') || /\b(?:paint|strict|content)\b/.test(cs.contain);
        // A box that computes a clip and clips nothing (`display: contents`, an inline box, a table row) is passed over.
        if (!clipsBoth || !boxClips(at, cs)) continue;
        const r = at.getBoundingClientRect();
        let margin = 0;
        if (cs.overflowX === 'clip' || cs.overflowY === 'clip' || /\b(?:paint|strict|content)\b/.test(cs.contain)) {
            const m = cs.getPropertyValue('overflow-clip-margin').trim();
            if (m !== '' && m !== '0px' && !/^-?[\d.]+px$/.test(m)) return false;
            margin = Number.parseFloat(m) || 0;
        }
        const clip: Box = { left: r.left - margin, top: r.top - margin, right: r.right + margin, bottom: r.bottom + margin };
        const meetsAny = (b: Box): boolean => Math.min(clip.right, b.right) - Math.max(clip.left, b.left) > 0 && Math.min(clip.bottom, b.bottom) - Math.max(clip.top, b.top) > 0;
        return !coverAsked.some((a) => meetsAny(a.reach));
    }
    return false;
}

/**
 * Whether an animation keeps its end once it has run (`coverAtEnd`): a
 * finite run longer than nothing, filled forwards (`forwards` or `both`).
 */
function keepsItsEnd(anim: Animation): boolean {
    const effect = anim.effect;
    if (!(effect instanceof KeyframeEffect)) return false;
    const fill = effect.getTiming().fill;
    if (fill !== 'forwards' && fill !== 'both') return false;
    const { activeDuration, endTime } = effect.getComputedTiming();
    return typeof activeDuration === 'number' && Number.isFinite(activeDuration) && activeDuration > 0 && typeof endTime === 'number' && Number.isFinite(endTime);
}

/**
 * **1a at the end of every animation that keeps its end** (before 8g2, the
 * critic's third review, item 2: PF2; D-2026-10-26-03). 1a reads a paint at
 * rest, every animation at its rest time with its delay zeroed, and the
 * instants stop at six sevenths of the longest animation on the page; a
 * cover that arrives at the end of a finite run and stays there — the
 * critic's PF2, the quote head's own `::after` laid over every cell of its
 * grid in the card's ground, a `scaleY` from 0 at 95% of a 10s run filled
 * forwards — had no area at rest, at 400ms or at any instant, and stood over
 * the figure and Pay for good from 9.5s on, under every rule. So on a paint
 * with any animation that keeps its end (`keepsItsEnd`: a finite run filled
 * `forwards` or `both`, a pseudo-element's included), after the read at
 * rest, each such animation is seeked to its end (its `endTime`, its delay
 * zeroed at rest) and 1a reads the paint again (`coverRead` with the names
 * it seeked): a failure says "at the end of …", and one the read at rest
 * found already, word for word, is not said again. The other animations stand
 * where the read at rest left them. Only those paints pay for the read
 * (`coverEnd`), and nothing is put back: 1a is the last read of a paint, and
 * the next paint throws its tree away.
 *
 * **What cannot cover anything is left out** (`endMoot`, the fourth
 * review's first prune): a paint whose every lasting animation sets only a
 * transform inside a box that clips both ways and meets nothing 1a asked is
 * not read at its end, and is counted (`coverEnd.skipped`).
 *
 * **The app's own**, measured: the marquee's runs (`mq-run`, filled
 * both, the only finite one the clean tree paints on money's screens, each
 * inside its name's clipping cell, so left out) and,
 * on a press staged for the read (a strip with `selectionEntered`, which no
 * fixture paints), the selection's entrance (`sel-unfold`, `sel-fade`,
 * `sel-line-in`, filled both) read at their ends with no failure: the
 * tray open and the lines in place. Not read, stated: one animation's end
 * beside another's (each lasting one is seeked to its end together, every
 * other where the read at rest left it); a run that keeps its end but whose
 * end is not its latest frame (a timing function that overshoots, read at
 * its end alone); and the contrast pass's one read a job, which stays at the
 * frozen instant.
 */
function coverAtEnd(screen: string, label: string, atRest: readonly Failure[]): Failure[] {
    const lasting = document.getAnimations().filter(keepsItsEnd);
    if (lasting.length === 0) return [];
    // No lasting animation can cover anything asked (`endMoot`): the end reads what rest read.
    if (lasting.every(endMoot)) {
        coverEnd.skipped += 1;
        return [];
    }
    const names = new Set<string>();
    for (const anim of lasting) {
        try {
            anim.currentTime = (anim.effect as KeyframeEffect).getComputedTiming().endTime as number;
            const name = 'animationName' in anim ? String((anim as CSSAnimation).animationName) : 'a transition';
            names.add(name);
            coverEnd.names[name] = (coverEnd.names[name] ?? 0) + 1;
        } catch {
            // An unseekable animation is read at rest alone.
        }
    }
    if (names.size === 0) return [];
    return coverRead(screen, label, { names: [...names].sort().join(', '), atRest: new Set(atRest.map((f) => f.detail)) });
}

/**
 * The animations a paint's instants moved, and the time each stood at
 * before them (`checkOverTime`); 1a sets each back to that time before it
 * reads.
 */
let coverRest: [Animation, CSSNumberish | null][] = [];

/**
 * 1a on a geometry pass's paint, **last**, after every other read of it,
 * with every animation on the page reset and its delay zeroed as the
 * instants and the contrast freeze zero it: one the instants moved to the
 * time it stood at before them, and one they never moved — armed after they
 * queried the page, or on a screen they did not step — to 0. With its delay
 * zeroed that time is a time into its active phase, so an animation that
 * stood in its delay before the instants does not stand where it stood: it
 * stands that far into its keyframes (the critic's third review, item 5; a
 * paint read moments after it was made sits within a few frames of its
 * first keyframe either way). The delay matters at rest too: the ticker
 * continues a pass across repaints through a negative delay as long as the
 * wall-clock time since its pass began (`armTicker`), so read with it the
 * ribbon stood a few pixels further on in one run than another, and four of
 * its points flipped between past the screen's side and behind its cell
 * from run to run (the critic's item 9). Its tallies hold run to run now;
 * a pass's point count does not (a few hundred points a pass, every one
 * among those hit-tested; the contrast pass, on a fixed clock, read the same
 * 697,851 in the critic's four runs, so a relative time in a fixture's text
 * is the likely mover, not traced). The read leaves the forcing on
 * (`releaseCover`), and only the next paint may take it off.
 */
function coverAtRest(screen: string, label: string): Failure[] {
    const rest = new Map(coverRest);
    for (const anim of document.getAnimations()) {
        try {
            anim.effect?.updateTiming({ delay: 0 });
        } catch {
            // Not ours to time.
        }
        try {
            anim.currentTime = rest.get(anim) ?? 0;
        } catch {
            // A finished or unseekable animation stands where it stands.
        }
    }
    coverRest = [];
    // 1b, bound since 7b, at rest and at its keyframes, before 1a forces the hit test on (`reachAtRest`).
    const reach = reachAtRest(screen, label);
    const atRest = coverRead(screen, label);
    // And once more at the end of every animation that keeps it (`coverAtEnd`).
    return [...reach, ...atRest, ...coverAtEnd(screen, label, atRest)];
}

/** The read once on a contrast job's prepared paint, at its full height (the runner tags it with the job). */
window.__coverFaults = () => coverScan();

/*
 * **Paints with no hit area that reach over money** (before 8g2, 1b,
 * `a-paint-with-no-hit-area-reaches-no-money`, **bound since step 7b**; the
 * pure half is `layout/paintReach.ts`). 1a hit-tests money with `pointer-events`
 * forced on, so a cover answers wherever it has a hit area — and a paint
 * that has none answers nowhere (the plan's C-1): the critic's PW, the price
 * column's `::after` at `height: 0` moved up 60px with `box-shadow: 0 0 0
 * 60px` in a literal colour, hides the figure while every point 1a asks
 * returns the figure. This reads every element with a box, every `display:
 * contents` element that holds text of its own (its text's paints alone:
 * `reachOwner`, the ninth critic's C1), and every look pseudo-element
 * (`markLookPseudos`' kind, its hosts found from the CSSOM rule walk once a
 * page) on the open surface — and a look pseudo of a box above the surface,
 * up to the app's root — and, for each that is neither an ancestor nor a
 * descendant of the node it is held to, the reach past the box it is drawn
 * from of an outer `box-shadow` (a sharp layer's offset and spread in full;
 * a blurred layer whole, under the policy), an `outline` (its width plus its
 * offset), a `border-image-outset`, a `text-shadow` (from the text's own
 * line boxes: each copy past the line it copies), a `drop-shadow()` and a
 * `blur()` in a `filter` (`url()` fails closed), a decoration line's band
 * (an underline from the baseline at its offset and thickness, an overline
 * at its line's top, a line-through across its middle; a percentage of 1em
 * read as CSS reads it, and a length that does not read failing closed), and
 * a look pseudo-element's own region where it holds text (`pseudoRegion`:
 * anywhere in its host's box, moved by its offsets and margins and grown by
 * its text's size; a pseudo a transform moves, with a zoom of its own (the
 * ninth critic's Z1), out of flow, or whose size or place does not resolve
 * reaches anywhere where it paints at all). Any reach that meets a money
 * node's line boxes (`MONEY_FIGURES`, its text's own) or a protected box
 * (`PROTECTED`, its border boxes), each cut to what its clipping boxes show
 * — the reach cut to what the reacher's show — past the box it is drawn from
 * (a pseudo's region is not inside its box, so nothing is excluded), by more
 * than a pixel on both axes, fails — unless the owner accepted it by name
 * (`REACH_ACCEPTED`, `acceptedReach`: one entry, Rural's sign board over the
 * address plate at the desk, D-2026-10-27-03, keyed on the reacher's tag,
 * class and computed shadow and the target's tag, class, role, ground and
 * ink, never a look's class, under a composite ceiling), counted and printed
 * apart.
 *
 * **The blur policy** (`BLUR_OPACITY`, measured first; `PROBE-RULES.md`,
 * "Before 8g2, 1b"): a blurred tail counts where the composite of every
 * blurred layer the reacher paints, each at its most over the target past
 * the reacher's own box, reaches it. The most each soft paint reaches over
 * any target it comes within reach of is kept per source (`reachSoft`), the
 * policy's measurement, and printed.
 *
 * **When**: on every geometry pass, once a paint, at rest — every animation
 * reset as 1a resets it, just before 1a's read (`coverAtRest`) — and at the
 * keyframes of every animation that is not needless (`reachSeek`, widened
 * at 7b after the ninth critic's L1 and K1): an animation of a box-shadow, a
 * text-shadow, a filter or a colour alone on a box is read from its
 * keyframes' own computed values, with no seek (`reachKeyframes`); every
 * other is seeked to each keyframe offset, and every reacher that can have
 * changed held to every target that can have changed — all of them, read
 * again, where it sets something that can move or change another box (a
 * size, a margin, a custom property a reach or a layout reads, a move an
 * anchor can follow: `MOVES_NO_OTHER_BOX`, `ANCHOR_FOLLOWED`, 1a's
 * reading); what its own box holds against every target where it moves its
 * own box; the box itself where it changes paints alone. An animation of
 * nothing that reaches or moves (`reachNeedless`: a ground, an opacity, a
 * clip or a mask, and a custom property only those read) is left alone.
 * Guarded whole: a throw ends 1b on its paint, is counted and said
 * (`reachThrown`), and fails the paint. Clips are held per pair
 * (`pairClip`, `reachClipChain`): a box is clipped by what clips the box
 * whose content it is — its parent, or an absolute or fixed box's
 * containing block (the ninth critic's CB2) — and a link that scrolls both
 * boxes, neither standing sticky under it, clips neither on the axis it
 * scrolls (they keep their places as it scrolls); every other link cuts at
 * its padding box. Its failures — one a pair of boxes and a kind — go in
 * the pass's own list, and are counted per look and per kind and printed
 * per pass; every geometry pass owes a read of 1b, a target held, on every
 * look it painted (`probe-coverage.mjs`). Not read, stated: a reach between two keyframes, and two animations at
 * once; a value a keyframe read from its values does not set, read as it
 * computes at rest; an element's paint stacked under a neighbour's opaque
 * ground (paint order is not modelled: a meet is a meet whichever paints
 * last); several reachers' blurs together (each reacher's layers are
 * composited alone); a glyph's own shape (a text-shadow is blurred off its
 * line's measured ink box, an upper bound; a line over several lines, its
 * line boxes); a box a scroller carries against one it does not carry, or
 * against a sticky box, at any scroll but the one the paint stands at; a
 * column rule; an SVG element's own overflow; a decoration line on a
 * pseudo's text; a pseudo's text that runs past its region's width
 * (`nowrap`, a letter-spacing); and where in its region a pseudo actually
 * stands.
 */
const REACH_CHECK = 'a-paint-with-no-hit-area-reaches-no-money';
/** One look's 1b tallies on a pass: paints read at rest, elements and pseudos read, reachers with a paint that reaches, targets held, pairs judged, keyframe seeks, failures by kind, meets accepted by name. */
type ReachTally = {
    paints: number;
    elements: number;
    /** Of the elements, `display: contents` text owners read (`reachOwner`: no box, their own text's paints). */
    contents: number;
    pseudos: number;
    reachers: number;
    targets: number;
    pairs: number;
    seeks: number;
    /** Animations left out of the keyframe read: they set nothing that reaches or moves (`reachNeedless`). */
    needless: number;
    /** Animations read at their keyframes from the keyframes' own values, with no seek (`reachKeyframes`). */
    fromValues: number;
    /** Of the seeks, those that read every reacher on the surface against every target (`wide`: the animation can move or change a box outside its own). */
    wide: number;
    /** Animations that move their own box and what it holds, left out: it holds no reacher and no target, and runs on no look pseudo. */
    unmoved: number;
    /** Failures (one a pair of boxes and a kind). */
    would: number;
    byKind: Partial<Record<ReachKind, number>>;
    /** Meets the owner accepted by name (`REACH_ACCEPTED`), not failed. */
    accepted: number;
    /** Pairs met by a blurred layer's offset and spread alone, which the policy does not count (`reachLiteral`). */
    softCore: number;
    /** Paints on which 1b threw and stopped (`reachThrown`): each a failure. */
    throws: number;
};
const reachByClass: Record<string, ReachTally> = {};
const reachTally = (): ReachTally =>
    (reachByClass[measuringClass] ??= {
        paints: 0,
        elements: 0,
        contents: 0,
        pseudos: 0,
        reachers: 0,
        targets: 0,
        pairs: 0,
        seeks: 0,
        wide: 0,
        unmoved: 0,
        needless: 0,
        fromValues: 0,
        would: 0,
        byKind: {},
        accepted: 0,
        softCore: 0,
        throws: 0,
    });
/** The failures, word for word, up to `REACH_KEPT` a pass (the rest counted in the tallies), for the runner's grouped lines. */
const reachWould: string[] = [];
const REACH_KEPT = 4000;
/** The meets accepted by name (`REACH_ACCEPTED`), word for word up to `REACH_KEPT` a pass, each with the entry that accepted it. */
const reachAcceptedSaid: string[] = [];
/** The paint's own failures, gathered while 1b reads it (`reachAtRest` hands them to the pass). */
let reachFailures: Failure[] = [];
/**
 * The pairs a literal reading of "offset and spread in full" would add — a blurred layer's offset
 * and spread counted in full, as a sharp one's is — measured and not counted:
 * the policy judges a blurred layer whole, its core included
 * (`softCore` in the tallies; up to `REACH_LITERAL_KEPT` word for word).
 */
const reachLiteral: string[] = [];
const REACH_LITERAL_KEPT = 400;
/** 1b's own time (a clock), and of it the keyframe seeks'. */
let reachMs = 0;
let reachSeekMs = 0;
/** The most composite coverage each soft paint reached over any target past its own box, per source (`describe` and kind): the blur policy's measurement. */
const reachSoft: Record<string, number> = {};

/** A colour's alpha as the browser resolves it (a 1×1 canvas, as `boxShadowsOf` reads one), once a colour a page. */
const alphaSeen = new Map<string, number | undefined>();
let alphaCtx: CanvasRenderingContext2D | undefined;
function alphaOfColour(colour: string, current?: string): number | undefined {
    const text = colour.trim().toLowerCase() === 'currentcolor' && current !== undefined ? current : colour.trim();
    if (alphaSeen.has(text)) return alphaSeen.get(text);
    alphaCtx ??= (() => {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        return c.getContext('2d', { willReadFrequently: true })!;
    })();
    let alpha: number | undefined;
    if (CSS.supports('color', text)) {
        alphaCtx.clearRect(0, 0, 1, 1);
        alphaCtx.fillStyle = 'transparent';
        alphaCtx.fillStyle = text;
        alphaCtx.fillRect(0, 0, 1, 1);
        alpha = alphaCtx.getImageData(0, 0, 1, 1).data[3]! / 255;
        // A colour too faint for a byte still paints something: never 0 unless it is nothing.
        if (alpha === 0 && (colourOf(text)?.alpha ?? 0) > 0) alpha = 1 / 255;
    }
    alphaSeen.set(text, alpha);
    return alpha;
}

/**
 * The look pseudos a page's sheets generate, as the selector of the box
 * that hosts each and which pseudo (`lookPseudoOf`, the look-pseudo
 * reading's own), read once while the page's sheets stand.
 */
let reachPseudoRules: { key: number; list: { which: 'before' | 'after'; host: string }[] } | undefined;
function lookPseudoHosts(): { which: 'before' | 'after'; host: string }[] {
    const key = document.styleSheets.length;
    if (reachPseudoRules?.key === key) return reachPseudoRules.list;
    const seen = new Set<string>();
    const list: { which: 'before' | 'after'; host: string }[] = [];
    for (const rule of styleRules()) {
        for (const one of selectorList(rule.selectorText)) {
            const look = lookPseudoOf(one);
            if (look === undefined) continue;
            const k = `${look.which}|${look.host}`;
            if (seen.has(k)) continue;
            seen.add(k);
            list.push(look);
        }
    }
    reachPseudoRules = { key, list };
    return list;
}

/**
 * **A box's clipping ancestors** (`overflow` on either axis, `contain:
 * paint`), nearest first, each with its padding box, the axes it clips on
 * and the axes it scrolls on; once an element a read. A box is clipped by
 * the box whose content it is and by what clips that: its parent, or, for an
 * `absolute` or `fixed` box, its containing block (`holdsOutOfFlow`) — a
 * clip between an out-of-flow box and its containing block does not clip it
 * (the ninth critic's CB2: a rail label made absolute escaped its column's
 * `overflow: hidden`, and its paint was cut there all the same), and a
 * `fixed` box held by the viewport is clipped by no ancestor. What clips a
 * paint is a question about a pair (`pairClip`): a link that scrolls both
 * boxes — it is in both chains — and that neither stands sticky under
 * (`pinned`) clips neither on the axis it scrolls, since they keep their
 * places as it scrolls, so what stands below the fold inside the stall's
 * scroll region is read where it stands; every other link clips at its
 * padding box: a paint inside a scroller never leaves its window, at any
 * scroll, for a box the scroller does not carry.
 */
type ClipLink = { el: Element; box: Box; cx: boolean; cy: boolean; sx: boolean; sy: boolean; pinned: boolean };

/**
 * The `will-change` values that make a box the containing block of its
 * out-of-flow descendants in Chrome, matched against each value exactly and
 * without regard to case (the tenth critic's item 2: `\btransform\b` caught
 * `transform-style` by accident and `-webkit-backdrop-filter` wrongly; Chrome
 * reads `TRANSFORM` as `transform`); `position` holds the absolute ones alone.
 * Measured in Chrome 156
 * (`private/design/workshop-2026-09-23/before-8g2/critic10-fixes/runs/cbsweep.log`)
 * and held to the Chrome every run uses by
 * `holds-out-of-flow-agrees-with-this-chrome`.
 */
const WILL_CHANGE_HOLDS: ReadonlySet<string> = new Set([
    'transform',
    'translate',
    'rotate',
    'scale',
    'perspective',
    'transform-style',
    'filter',
    'backdrop-filter',
    'contain',
    'offset-path',
    'offset-position',
    'offset',
]);
/** Of those, what still holds on a non-replaced inline box, where transforms, containment and offsets do not apply. */
const WILL_CHANGE_HOLDS_INLINE: ReadonlySet<string> = new Set(['filter', 'backdrop-filter']);

/**
 * Whether a box is the containing block of its `absolute` descendants
 * (`fixed`: of its `fixed` ones), from its computed style, as Chrome decides
 * it (the tenth critic's item 2; `holds-out-of-flow-agrees-with-this-chrome`
 * holds this function to where this Chrome places an absolute and a fixed
 * child on every probe page). A `display: contents` element has no box; a
 * non-replaced inline box holds by its position, a filter or a backdrop
 * filter alone. Not read, stated: a table part's box and an SVG element.
 */
function holdsOutOfFlow(cs: CSSStyleDeclaration, fixed: boolean): boolean {
    if (cs.display === 'contents') return false;
    if (!fixed && cs.position !== 'static') return true;
    const willChange = cs.willChange.split(',').map((v) => v.trim().toLowerCase());
    if (!fixed && willChange.includes('position')) return true;
    const backdrop = cs.getPropertyValue('backdrop-filter') || cs.getPropertyValue('-webkit-backdrop-filter') || 'none';
    const filtered = cs.filter !== 'none' || backdrop !== 'none';
    if (cs.display === 'inline') return filtered || willChange.some((v) => WILL_CHANGE_HOLDS_INLINE.has(v));
    const offsetPath = cs.getPropertyValue('offset-path') || 'none';
    const offsetPosition = cs.getPropertyValue('offset-position') || 'normal';
    const visibility = cs.getPropertyValue('content-visibility') || 'visible';
    return (
        filtered ||
        cs.transform !== 'none' ||
        cs.translate !== 'none' ||
        cs.rotate !== 'none' ||
        cs.scale !== 'none' ||
        cs.perspective !== 'none' ||
        cs.transformStyle === 'preserve-3d' ||
        /\b(?:layout|paint|strict|content)\b/.test(cs.contain) ||
        visibility !== 'visible' ||
        offsetPath !== 'none' ||
        (offsetPosition !== 'normal' && offsetPosition !== 'auto') ||
        willChange.some((v) => WILL_CHANGE_HOLDS.has(v))
    );
}

/**
 * **`holds-out-of-flow-agrees-with-this-chrome`** (the tenth critic's item 2,
 * decided by the window): `holdsOutOfFlow` held to where this Chrome actually
 * places an absolute and a fixed child, on every probe page. One tiny wrapper
 * per trigger the function reads and per near miss it must not read (each
 * `container-type`, `contain: size`, `inline-size` and `style`, an inline
 * box's transform, containment and offset, `will-change` on a value that
 * holds nothing, a `display: contents` box with a transform), each holding a
 * 5px absolute child and a 5px fixed child at `top: 0; left: 0`: a child
 * that lands at its wrapper's corner is held by it, one that lands where a
 * child of the bare wrapper lands is not, and anything else cannot be told.
 * The wrappers are laid out unseen at the viewport's corner and taken away in
 * the same task, before anything paints. A disagreement fails the pass.
 */
const OUT_OF_FLOW_CASES: readonly { css: string; display?: 'inline' | 'contents' }[] = [
    { css: '' },
    { css: 'position: relative' },
    { css: 'position: sticky' },
    { css: 'transform: translate(0)' },
    { css: 'translate: 0 0' },
    { css: 'rotate: 0deg' },
    { css: 'scale: 1' },
    { css: 'perspective: 10px' },
    { css: 'transform-style: preserve-3d' },
    { css: 'transform-style: flat' },
    { css: 'filter: opacity(1)' },
    { css: 'backdrop-filter: blur(0px)' },
    { css: 'contain: layout' },
    { css: 'contain: paint' },
    { css: 'contain: strict' },
    { css: 'contain: content' },
    { css: 'contain: size' },
    { css: 'contain: inline-size' },
    { css: 'contain: style' },
    { css: 'content-visibility: auto' },
    { css: 'content-visibility: hidden' },
    { css: 'container-type: inline-size' },
    { css: 'container-type: size' },
    { css: 'container-type: scroll-state' },
    { css: "offset-path: path('M 0 0'); offset-rotate: 0deg" },
    { css: 'offset-position: 0px 0px' },
    { css: 'offset-position: auto' },
    { css: 'clip-path: inset(0px)' },
    { css: 'opacity: 0.5' },
    ...[...WILL_CHANGE_HOLDS, 'position', 'opacity', '-webkit-backdrop-filter', 'offset-distance', 'transform-origin', 'container-type'].map((v) => ({ css: `will-change: ${v}` })),
    { css: 'will-change: opacity, TRANSFORM' },
    { css: 'position: relative', display: 'inline' },
    { css: 'filter: opacity(1)', display: 'inline' },
    { css: 'transform: translate(0)', display: 'inline' },
    { css: 'contain: layout', display: 'inline' },
    { css: "offset-path: path('M 0 0'); offset-rotate: 0deg", display: 'inline' },
    { css: 'will-change: transform', display: 'inline' },
    { css: 'will-change: filter', display: 'inline' },
    { css: 'will-change: position', display: 'inline' },
    { css: 'transform: translate(0)', display: 'contents' },
];
function outOfFlowSelfCheck(): { cases: number; held: { absolute: number; fixed: number }; disagree: string[] } {
    const disagree: string[] = [];
    const held = { absolute: 0, fixed: 0 };
    const sheet = document.createElement('div');
    const set = (el: HTMLElement, css: string) => {
        for (const decl of css.split(';')) {
            const at = decl.indexOf(':');
            if (at > 0) el.style.setProperty(decl.slice(0, at).trim(), decl.slice(at + 1).trim(), 'important');
        }
    };
    // Fixed at the viewport's corner, so every wrapper is on screen (`content-visibility: auto` keeps a skipped box's place, but
    // nothing is skipped here); a fixed box holds its absolute descendants and not its fixed ones, and the bare wrapper says where each lands.
    set(sheet, 'position: fixed; top: 0px; left: 0px; display: block; visibility: hidden; margin: 0; padding: 0; width: 100vw; transform: none; filter: none; contain: none; z-index: auto');
    try {
        const built = OUT_OF_FLOW_CASES.map(({ css, display }) => {
            const row = document.createElement('div');
            set(row, 'display: inline-block; vertical-align: top; position: static; width: 64px; height: 50px; margin: 0; padding: 6px 0 0 17px');
            const wrapper = document.createElement(display === 'inline' ? 'span' : 'div');
            set(wrapper, display === 'inline' ? 'display: inline; font: 16px/16px monospace' : display === 'contents' ? 'display: contents' : 'display: block; width: 40px; height: 40px');
            if (display === 'inline') wrapper.append('xxxx');
            set(wrapper, css);
            const children = (['absolute', 'fixed'] as const).map((position) => {
                const child = document.createElement('div');
                set(child, `position: ${position}; top: 0px; left: 0px; width: 5px; height: 5px; margin: 0`);
                wrapper.prepend(child);
                return child;
            });
            row.append(wrapper);
            sheet.append(row);
            return { css, display: display ?? 'block', wrapper, children };
        });
        document.body.append(sheet);
        const at = (el: Element) => {
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y };
        };
        const near = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
        // Where a child no wrapper holds lands: the bare wrapper's (the first case, which holds nothing).
        const free = built[0]!.children.map(at);
        for (const { css, display, wrapper, children } of built) {
            const corner = at(wrapper);
            const cs = getComputedStyle(wrapper);
            children.forEach((child, k) => {
                const kind = k === 0 ? 'absolute' : 'fixed';
                const landed = at(child);
                const chrome = display !== 'contents' && near(landed, corner) && !near(corner, free[k]!) ? true : near(landed, free[k]!) ? false : undefined;
                const said = holdsOutOfFlow(cs, kind === 'fixed');
                const label = `${display === 'block' ? '' : `display: ${display}; `}${css || 'nothing'}`;
                if (chrome === undefined) {
                    disagree.push(`${label}: its ${kind} child landed at ${landed.x.toFixed(1)},${landed.y.toFixed(1)}, neither at its wrapper's corner (${corner.x.toFixed(1)},${corner.y.toFixed(1)}) nor where a child no box holds lands (${free[k]!.x.toFixed(1)},${free[k]!.y.toFixed(1)})`);
                } else if (chrome !== said) {
                    disagree.push(`${label}: Chrome ${chrome ? 'makes' : 'does not make'} it the containing block of its ${kind} child, and holdsOutOfFlow says it ${said ? 'does' : 'does not'}`);
                } else if (chrome) {
                    held[kind] += 1;
                }
            });
        }
    } catch (e) {
        disagree.push(`the self-check threw: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`);
    } finally {
        sheet.remove();
    }
    return { cases: OUT_OF_FLOW_CASES.length, held, disagree };
}

/** A box's own clip as a link of its content's chain, or undefined where it clips nothing (a `display: contents` box has no box to clip with). */
function clipLinkOf(box: Element): ClipLink | undefined {
    const cs = getComputedStyle(box);
    if (cs.display === 'contents') return undefined;
    const paint = /\b(?:paint|strict|content)\b/.test(cs.contain);
    const cx = paint || cs.overflowX !== 'visible';
    const cy = paint || cs.overflowY !== 'visible';
    if (!cx && !cy) return undefined;
    return { el: box, box: paddingBox(box), cx, cy, sx: !paint && scrollsOn(cs.overflowX), sy: !paint && scrollsOn(cs.overflowY), pinned: false };
}

function reachClipChain(el: Element, seen: Map<Element, ClipLink[]>): ClipLink[] {
    const known = seen.get(el);
    if (known !== undefined) return known;
    // A box-less element (`display: contents`) is positioned by nothing, whatever it computes: its text and its children are laid out
    // in flow in its parent's box and scroll with it, so its chain is its parent's (the tenth critic's C1x: such a label at `position:
    // absolute` was walked from a containing block above the stall's scroll region, and the price below the fold was lost).
    const cs = getComputedStyle(el);
    const position = cs.display === 'contents' ? 'static' : cs.position;
    const fixed = position === 'fixed';
    // The box whose content it is: its parent, or an out-of-flow box's containing block.
    let up = el.parentElement;
    if (position === 'absolute' || fixed) while (up !== null && up !== document.documentElement && !holdsOutOfFlow(getComputedStyle(up), fixed)) up = up.parentElement;
    let chain: ClipLink[] = [];
    if (up !== null && up !== document.documentElement) {
        const above = reachClipChain(up, seen);
        // A sticky box keeps its place on screen as the links above it scroll: it is pinned under each (`pairClip` gives it no scroll exception).
        const sticky = position === 'sticky';
        const carried = sticky ? above.map((l) => (l.pinned ? l : { ...l, pinned: true })) : above;
        const link = clipLinkOf(up);
        chain = link === undefined ? carried : [{ ...link, pinned: sticky }, ...carried];
    }
    seen.set(el, chain);
    return chain;
}

/** What a chain of clips shows of a paint held to a box whose own chain is `other` (`reachClipChain`): every link, but on an axis a link scrolls when it scrolls both and neither is pinned under it. */
function pairClip(chain: readonly ClipLink[], other: readonly ClipLink[]): Box {
    let b: Box = ANYWHERE;
    for (const l of chain) {
        const together = !l.pinned && other.some((o) => o.el === l.el && !o.pinned);
        if (l.cx && !(together && l.sx)) b = { ...b, left: Math.max(b.left, l.box.left), right: Math.min(b.right, l.box.right) };
        if (l.cy && !(together && l.sy)) b = { ...b, top: Math.max(b.top, l.box.top), bottom: Math.min(b.bottom, l.box.bottom) };
    }
    return b;
}

/** What a chain of clips shows whatever the other box: its links on the axes they cut and do not scroll (a superset of every `pairClip`). */
function cutClip(chain: readonly ClipLink[]): Box {
    let b: Box = ANYWHERE;
    for (const l of chain) {
        if (l.cx && !l.sx) b = { ...b, left: Math.max(b.left, l.box.left), right: Math.min(b.right, l.box.right) };
        if (l.cy && !l.sy) b = { ...b, top: Math.max(b.top, l.box.top), bottom: Math.min(b.bottom, l.box.bottom) };
    }
    return b;
}

/** How much a box's transforms (its own and its ancestors') magnify a length: its painted size over its layout size, at least 1. */
function reachScale(el: Element, r: DOMRect): number {
    if (!(el instanceof HTMLElement) || el.offsetWidth === 0 || el.offsetHeight === 0) return 1;
    return Math.max(1, r.width / el.offsetWidth, r.height / el.offsetHeight);
}

/** A pseudo's generated text, from its computed `content`: a quoted string's text, '' for none, and a placeholder for anything else that may print. */
function pseudoText(content: string): string {
    const c = content.trim();
    if (c === 'none' || c === 'normal' || c === '""' || c === "''") return '';
    const m = /^(["'])(.*)\1$/s.exec(c);
    if (m !== null) return m[2]!.replace(/\\(.)/g, '$1');
    return 'x';
}

/** Whether a box paints an area of its own: a background colour with any alpha, a background image, or a visible border. */
function paintsOwnArea(cs: CSSStyleDeclaration): boolean {
    if ((alphaOfColour(cs.backgroundColor) ?? 1) > 0) return true;
    if (cs.backgroundImage !== 'none' && cs.backgroundImage !== '') return true;
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
        const w = Number.parseFloat(cs.getPropertyValue(`border-${side}-width`)) || 0;
        const style = cs.getPropertyValue(`border-${side}-style`);
        if (w > 0 && style !== 'none' && style !== 'hidden' && (alphaOfColour(cs.getPropertyValue(`border-${side}-color`), cs.color) ?? 1) > 0) return true;
    }
    return false;
}

/** A sharp reach: a rect painted in full, the box it is drawn from (past which it reaches; undefined for a pseudo's region), and whether it is a blurred layer's core. */
type SharpReach = { kind: ReachKind; rect: Box; base: Box | undefined; what: string; soft: boolean };
/** One reacher's paints that reach: its sharp rects and its blurred layers, each family named; where any of it may land; and why it reaches anywhere. */
type ReachPaints = {
    /** The box its blurs are judged past, or undefined for a pseudo's region. */
    base: Box | undefined;
    bound: Box;
    sharp: SharpReach[];
    soft: { kind: ReachKind; layer: Layer; what: string }[];
    anywhere?: string;
    /** Its clipping ancestors, its own window, and whether that window cuts all of it (a pseudo's); set by `cutToClips`. */
    chain?: ClipLink[];
    /** The links that carry it as they scroll (`pairClip`'s other side): its chain, and a pseudo's host's own clip, whose content it is. */
    carriers?: ClipLink[];
    own?: Box;
    ownAll?: boolean;
};

const shadowText = (s: ReachShadow): string => `${s.x}px ${s.y}px, blur ${s.blur}, spread ${s.spread}, alpha ${Number(s.alpha.toFixed(3))}`;

/** The box paints a reacher's computed style holds (box-shadow, outline, border image, filter), as plain values. */
type BoxPaintFacts = {
    boxShadow: string;
    outlineStyle: string;
    outlineWidth: string;
    outlineOffset: string;
    outlineColor: string;
    borderImageSource: string;
    borderImageOutset: string;
    borderWidths: [number, number, number, number];
    filter: string;
    color: string;
};
function boxPaintFacts(cs: CSSStyleDeclaration, svgInner: boolean): BoxPaintFacts {
    return {
        boxShadow: svgInner ? 'none' : cs.boxShadow,
        outlineStyle: svgInner ? 'none' : cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        outlineOffset: cs.outlineOffset,
        outlineColor: cs.outlineColor,
        borderImageSource: svgInner ? 'none' : cs.borderImageSource,
        borderImageOutset: cs.borderImageOutset,
        borderWidths: [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map((v) => Number.parseFloat(v) || 0) as [number, number, number, number],
        filter: cs.filter,
        color: cs.color,
    };
}

/** The box paints off `base` (`base` undefined: a pseudo's region, drawn from `region`), scaled by `k`, into `out`. */
function boxReaches(f: BoxPaintFacts, region: Box, base: Box | undefined, k: number, out: ReachPaints): void {
    const alphaOf = (c: string): number | undefined => alphaOfColour(c, f.color);
    if (f.boxShadow !== 'none' && f.boxShadow !== '') {
        const shadows = parseShadows(f.boxShadow, alphaOf);
        if (shadows === undefined) out.anywhere ??= `a box-shadow this read cannot take apart (${f.boxShadow.slice(0, 60)})`;
        else {
            const outer = shadows.filter((sh) => !sh.inset && sh.alpha > 0);
            for (const [i, layer] of boxShadowLayers(region, outer, k).entries()) {
                const what = shadowText(outer[i]!);
                out.sharp.push({ kind: 'box-shadow', rect: layer.rect, base, what, soft: layer.sigma > 0 });
                if (layer.sigma > 0) out.soft.push({ kind: 'box-shadow blur', layer, what });
            }
        }
    }
    if (f.outlineStyle !== 'none') {
        const o = outlineBox(region, f.outlineStyle, Number.parseFloat(f.outlineWidth) || 0, Number.parseFloat(f.outlineOffset) || 0, k);
        if (o !== undefined && (alphaOf(f.outlineColor) ?? 1) > 0) out.sharp.push({ kind: 'outline', rect: o, base, what: `${f.outlineWidth} ${f.outlineStyle} at ${f.outlineOffset}`, soft: false });
    }
    if (f.borderImageSource !== 'none' && f.borderImageSource !== '') {
        const parts = f.borderImageOutset.trim().split(/\s+/);
        const side = (i: number): number => {
            const v = parts[i] ?? parts[i - 2] ?? parts[0] ?? '0';
            return v.endsWith('px') ? Number.parseFloat(v) : (Number.parseFloat(v) || 0) * f.borderWidths[i]!;
        };
        const b = borderImageBox(region, [side(0), side(1), side(2), side(3)], k);
        if (b !== undefined) out.sharp.push({ kind: 'border-image', rect: b, base, what: `outset ${f.borderImageOutset}`, soft: false });
    }
    if (f.filter !== 'none' && f.filter !== '') {
        const parsed = parseFilter(f.filter, alphaOf);
        if (parsed.unread !== undefined) out.anywhere ??= parsed.unread;
        else {
            const { drops, blur } = filterLayers(region, parsed, k);
            const what = f.filter.slice(0, 60);
            for (const layer of drops) {
                out.sharp.push({ kind: 'drop-shadow', rect: layer.rect, base, what, soft: layer.sigma > 0 });
                if (layer.sigma > 0) out.soft.push({ kind: 'drop-shadow blur', layer, what });
            }
            if (blur !== undefined) out.soft.push({ kind: 'blur', layer: blur, what });
        }
    }
}

/** A face's ascent above its baseline, once a face a page (the ink model's own measure). */
const ascentSeen = new Map<string, number>();
function faceAscent(cs: CSSStyleDeclaration): number {
    const key = faceKey(cs);
    let a = ascentSeen.get(key);
    if (a === undefined) {
        const m = measurePainted('x', cs);
        a = m === undefined ? (Number.parseFloat(cs.fontSize) || 16) * 0.9 : m.fontBoundingBoxAscent;
        ascentSeen.set(key, a);
    }
    return a;
}

/** The decorating box of a text owner's line: itself, or the nearest box above it that declares that line. */
function decoratingBox(el: Element, kind: string): Element {
    for (let at: Element | null = el; at !== null && at.id !== 'app'; at = at.parentElement) {
        if (getComputedStyle(at).textDecorationLine.includes(kind)) return at;
    }
    return el;
}

/**
 * Where a text node's glyphs ink, line by line: on one line, the measured
 * ink (the ink model's measure, `measurePainted`: the reach above and below
 * the baseline, and the first glyph's left and the last glyph's right side
 * bearings; a negative letter-spacing's pull added back), placed by its line box — an
 * upper bound of every glyph, so a shadow blurred off it covers at least as
 * much as the glyphs' own; over several lines, or in a vertical or
 * right-to-left line, the line boxes themselves (which stacked marks can
 * run past, stated).
 */
function textInk(text: Text, cs: CSSStyleDeclaration, rects: readonly Box[]): Box[] {
    if (rects.length !== 1 || !cs.writingMode.startsWith('horizontal') || cs.direction !== 'ltr') return [...rects];
    const r = rects[0]!;
    const m = measurePainted(painted(text.data.trim(), cs.textTransform), cs);
    if (m === undefined || !(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent > 0)) return [r];
    // A negative letter-spacing may pull the line box's end in past the last glyph's advance; a positive one is never taken off (whether the
    // line box holds the trailing spacing is the engine's): the right edge errs out, never in.
    const pulled = Math.max(0, -(Number.parseFloat(cs.letterSpacing) || 0));
    const base = r.top + m.fontBoundingBoxAscent;
    // Never clamped to the line box: a glyph's ink may stand past its advance (an overhang), and past the content area across the line.
    const left = r.left - m.actualBoundingBoxLeft;
    const right = r.right + pulled - (m.width - m.actualBoundingBoxRight);
    const top = base - m.actualBoundingBoxAscent;
    const bottom = base + m.actualBoundingBoxDescent;
    return right > left && bottom > top ? [{ left, top, right, bottom }] : [r];
}

/** A text owner's text paints: a text-shadow off its lines' ink (`inks`; each sharp copy past the ink it copies), decoration lines along its line boxes; into `out`. */
function textReaches(
    el: Element,
    cs: CSSStyleDeclaration,
    lines: readonly Box[],
    inks: readonly Box[],
    k: number,
    out: ReachPaints,
    pseudo: boolean,
    textShadow = cs.textShadow,
    decorations = !pseudo,
    colour = cs.color,
): void {
    if (textShadow !== 'none') {
        const shadows = parseShadows(textShadow, (c) => alphaOfColour(c, colour));
        if (shadows === undefined) out.anywhere ??= `a text-shadow this read cannot take apart (${textShadow.slice(0, 60)})`;
        else {
            for (const s of shadows) {
                if (s.alpha <= 0) continue;
                const what = shadowText(s);
                for (const ink of inks) {
                    const [layer] = textShadowLayers([ink], [s], k);
                    out.sharp.push({ kind: 'text-shadow', rect: layer!.rect, base: pseudo ? undefined : ink, what, soft: layer!.sigma > 0 });
                    if (layer!.sigma > 0) out.soft.push({ kind: 'text-shadow blur', layer: layer!, what });
                }
            }
        }
    }
    if (!decorations) return;
    const inEffect = cs.getPropertyValue('-webkit-text-decorations-in-effect');
    if (inEffect === '' || inEffect === 'none') return;
    for (const kind of ['underline', 'overline', 'line-through'] as const) {
        if (!inEffect.includes(kind)) continue;
        const deco = getComputedStyle(decoratingBox(el, kind));
        const ascent = faceAscent(cs);
        const size = Number.parseFloat(cs.fontSize) || 16;
        // A percentage is of 1em: the text's or its decorating box's, whichever is larger (an upper bound).
        const em = Math.max(size, Number.parseFloat(deco.fontSize) || 0);
        for (const line of lines) {
            const band = underlineBand(line, kind, ascent, size, cs.textUnderlineOffset, deco.textDecorationThickness, cs.textUnderlinePosition, em);
            if (band === undefined) continue;
            if ('unread' in band) {
                out.anywhere ??= band.unread;
                break;
            }
            out.sharp.push({ kind: 'decoration', rect: band, base: line, what: `${kind} ${deco.textDecorationThickness} at ${cs.textUnderlineOffset}`, soft: false });
        }
    }
}

/** Where a reacher's paints may land at all. */
function reachBound(p: ReachPaints): Box {
    let b: Box | undefined;
    for (const s of p.sharp) b = b === undefined ? s.rect : union(b, s.rect);
    for (const s of p.soft) b = b === undefined ? layerBound(s.layer) : union(b, layerBound(s.layer));
    return b ?? { left: 0, top: 0, right: 0, bottom: 0 };
}

/**
 * A reacher's clips (`reachClipChain`, held per pair in `judgeReacher`), and
 * its own window where it clips its own content (`reachOwnClip`): its text's
 * paints — and a look pseudo's, all of them — never leave it (a text and a
 * pseudo-element are their box's content, a shadow of the box is not); and
 * where any of its paints may land at all, for finding the targets it can
 * meet (`cutClip`, a superset of every pair's clip).
 */
function cutToClips(el: Element, p: ReachPaints, chainSeen: Map<Element, ClipLink[]>, pseudo = false): void {
    p.chain = reachClipChain(el, chainSeen);
    const hostLink = pseudo ? clipLinkOf(el) : undefined;
    p.carriers = hostLink === undefined ? p.chain : [hostLink, ...p.chain];
    p.own = reachOwnClip(el);
    p.ownAll = pseudo;
    p.bound = p.anywhere !== undefined ? ANYWHERE : (intersect(reachBound(p), cutClip(p.chain)) ?? NO_BOX);
}

/** Where a box clips its own content: its padding box on the axes it clips, or undefined where it clips none. */
function reachOwnClip(el: Element): Box | undefined {
    const cs = getComputedStyle(el);
    if (cs.display === 'contents') return undefined;
    const paint = /\b(?:paint|strict|content)\b/.test(cs.contain);
    const cx = paint || cs.overflowX !== 'visible';
    const cy = paint || cs.overflowY !== 'visible';
    if (!cx && !cy) return undefined;
    const r = paddingBox(el);
    return { left: cx ? r.left : -Infinity, right: cx ? r.right : Infinity, top: cy ? r.top : -Infinity, bottom: cy ? r.bottom : Infinity };
}

/** A target 1b holds a reach to: the node, its boxes, its clips (held per pair, `pairClip`), and its name. */
type ReachTarget = { node: Element; boxes: Box[]; chain: ClipLink[]; name: string };

/** The targets on a surface: every money node's text line boxes, every protected box's border boxes; a target its clips cut away whatever is held to it is none. */
function reachTargets(surface: ParentNode, clipSeen: Map<Element, ClipLink[]>, nodes?: readonly Element[]): ReachTarget[] {
    const out: ReachTarget[] = [];
    const range = document.createRange();
    for (const node of nodes ?? [...new Set(surface.querySelectorAll(`${MONEY_FIGURES}, ${PROTECTED}`))].filter((n) => n.closest('.deck-stall') === null)) {
        const raw: Box[] = [];
        if (node.matches(PROTECTED)) {
            for (const r of node.getClientRects()) if (r.width > 0 && r.height > 0) raw.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
        } else {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            for (let t = walker.nextNode(); t !== null; t = walker.nextNode()) {
                if ((t.textContent ?? '').trim() === '') continue;
                range.selectNodeContents(t);
                for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) raw.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
            }
        }
        const chain = reachClipChain(node, clipSeen);
        const cut = cutClip(chain);
        const boxes = raw.filter((b) => intersect(b, cut) !== undefined);
        if (boxes.length > 0) out.push({ node, boxes, chain, name: named(node) });
    }
    return out;
}

/** The paint's read at rest's targets, clips, surface and reachers (`reachRead`), for its keyframe reads. */
let reachRest: { targets: ReachTarget[]; clipSeen: Map<Element, ClipLink[]>; surface: ParentNode; all: Reacher[] } | undefined;

/** A reacher: an element, or a look pseudo-element (its host and which), and its paints that reach. */
type Reacher = { el: Element; pseudo: '::before' | '::after' | null; paints: ReachPaints };

const NO_BOX: Box = { left: 0, top: 0, right: 0, bottom: 0 };

/** Whether an element holds text of its own: a text node child with something in it. */
function ownsText(el: Element): boolean {
    for (const c of el.childNodes) if (c.nodeType === Node.TEXT_NODE && (c.textContent ?? '').trim() !== '') return true;
    return false;
}

/**
 * Whether 1b reads an element's own paints, and whether it has a box of its
 * own (`boxed`): an element with layout boxes, or a `display: contents`
 * element that holds text of its own — it generates no box, but its text is
 * laid out in its parent's box and painted in its own style, a text-shadow and
 * a decoration line included (the ninth critic's C1: a rail label made
 * `display: contents` laid sharp copies of its text over the figure, and
 * nothing read them). Undefined: it paints nothing of its own.
 */
function reachOwner(el: Element): { cs: CSSStyleDeclaration; boxed: boolean } | undefined {
    const boxed = el.getClientRects().length > 0;
    if (!boxed && !ownsText(el)) return undefined;
    const cs = getComputedStyle(el);
    if (!boxed && cs.display !== 'contents') return undefined;
    if (cs.visibility !== 'visible') return undefined;
    return { cs, boxed };
}

/**
 * How much a `display: contents` element's paints are magnified: its own
 * zoom and that of every box-less element up to the nearest box, times that
 * box's `reachScale` — each factor at least 1, as `reachScale` is.
 */
function contentsScale(el: Element): number {
    let z = 1;
    let at: Element | null = el;
    while (at !== null && at.getClientRects().length === 0) {
        z *= Math.max(1, zoomOf(getComputedStyle(at).zoom));
        at = at.parentElement;
    }
    return at === null ? z : z * reachScale(at, at.getBoundingClientRect());
}

/**
 * An element's own paints that reach (`reachOwner` decides it is read): its
 * box's — none for a `display: contents` element, which has none — and its own
 * text's, off its own text nodes' lines: the shadow from each line's ink, a
 * decoration line along each line box. `set` puts a keyframe's values in
 * place of what the element computes at rest (`reachKeyframes`). Undefined
 * where nothing reaches.
 */
function ownPaints(
    el: Element,
    cs: CSSStyleDeclaration,
    boxed: boolean,
    range: Range,
    set: { boxShadow?: string; textShadow?: string; filter?: string; color?: string } = {},
): ReachPaints | undefined {
    const r = el.getBoundingClientRect();
    const box: Box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    const k = boxed ? reachScale(el, r) : contentsScale(el);
    // A box-less element's text paints are judged past each line's ink alone (`textReaches`): it has no box of its own to judge a blur past.
    const paints: ReachPaints = { base: boxed ? box : undefined, bound: boxed ? box : NO_BOX, sharp: [], soft: [] };
    const colour = set.color ?? cs.color;
    if (boxed) {
        const facts = boxPaintFacts(cs, el instanceof SVGElement && !(el instanceof SVGSVGElement));
        boxReaches({ ...facts, color: colour, boxShadow: set.boxShadow ?? facts.boxShadow, filter: set.filter ?? facts.filter }, box, box, k, paints);
    }
    const textShadow = set.textShadow ?? cs.textShadow;
    const shadowed = textShadow !== 'none';
    const decorated = (cs.getPropertyValue('-webkit-text-decorations-in-effect') || 'none') !== 'none';
    if (shadowed || decorated) {
        const lines: Box[] = [];
        const inks: Box[] = [];
        for (const c of el.childNodes) {
            if (c.nodeType !== Node.TEXT_NODE || (c.textContent ?? '').trim() === '') continue;
            range.selectNodeContents(c);
            const rects = [...range.getClientRects()].filter((q) => q.width > 0 && q.height > 0).map((q) => ({ left: q.left, top: q.top, right: q.right, bottom: q.bottom }));
            lines.push(...rects);
            if (shadowed) inks.push(...textInk(c as Text, cs, rects));
        }
        if (lines.length > 0) textReaches(el, cs, lines, inks, k, paints, false, textShadow, true, colour);
    }
    return paints.sharp.length === 0 && paints.soft.length === 0 && paints.anywhere === undefined ? undefined : paints;
}

/** A look pseudo's region as 1b reads it (`pseudoRegion`), off its computed style and its host's box. */
function lookPseudoRegion(cs: CSSStyleDeclaration, hr: DOMRect): ReturnType<typeof pseudoRegion> {
    const px = (v: string): number => Number.parseFloat(v) || 0;
    return pseudoRegion({
        host: { left: hr.left, top: hr.top, right: hr.right, bottom: hr.bottom },
        display: cs.display,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        top: cs.top,
        right: cs.right,
        bottom: cs.bottom,
        left: cs.left,
        marginTop: cs.marginTop,
        marginRight: cs.marginRight,
        marginBottom: cs.marginBottom,
        marginLeft: cs.marginLeft,
        paddingX: px(cs.paddingLeft) + px(cs.paddingRight),
        paddingY: px(cs.paddingTop) + px(cs.paddingBottom),
        borderX: px(cs.borderLeftWidth) + px(cs.borderRightWidth),
        borderY: px(cs.borderTopWidth) + px(cs.borderBottomWidth),
        fontSize: px(cs.fontSize) || 16,
        lineHeight: cs.lineHeight,
        text: pseudoText(cs.content),
        transform: cs.transform,
        translate: cs.translate,
        rotate: cs.rotate,
        scale: cs.scale,
        offsetPath: cs.getPropertyValue('offset-path') || 'none',
        zoom: cs.zoom,
    });
}

/**
 * A look pseudo's paints that reach, from its region (`lookPseudoRegion`):
 * its box paints off the region and, where it prints text, the region as a
 * box and its text's paints; where its region cannot be read, nowhere it can
 * name, if it paints at all (its text, its own area, or a paint that
 * reaches). 1b's reachers and 1c's trigger read a pseudo by this one road.
 */
function pseudoReachPaints(el: Element, cs: CSSStyleDeclaration, region: ReturnType<typeof pseudoRegion>, k: number): ReachPaints {
    const text = pseudoText(cs.content);
    const paints: ReachPaints = { base: undefined, bound: NO_BOX, sharp: [], soft: [] };
    const holdsText = text.trim() !== '';
    if ('anywhere' in region) {
        // It fails closed where it paints at all: its text, its own area, or a paint that reaches.
        const probe: ReachPaints = { base: undefined, bound: NO_BOX, sharp: [], soft: [] };
        boxReaches(boxPaintFacts(cs, false), NO_BOX, undefined, k, probe);
        if (holdsText || paintsOwnArea(cs) || probe.sharp.length > 0 || probe.soft.length > 0 || probe.anywhere !== undefined) paints.anywhere = region.anywhere;
    } else {
        boxReaches(boxPaintFacts(cs, false), region.box, undefined, k, paints);
        if (holdsText) {
            paints.sharp.push({ kind: 'pseudo box', rect: region.box, base: undefined, what: `its text ${JSON.stringify(text.slice(0, 8))} at ${cs.fontSize}`, soft: false });
            textReaches(el, cs, [region.box], [region.box], k, paints, true);
        }
    }
    return paints;
}

/** The reachers on `surface` (`only`: of these elements alone), each with the paints that reach; tallies into `t` where `rest`. */
function reachersOn(surface: ParentNode, only: ReadonlySet<Element> | undefined, clipSeen: Map<Element, ClipLink[]>, t: ReachTally, rest: boolean): Reacher[] {
    const out: Reacher[] = [];
    const root = document.getElementById('app')!;
    const scope: Element = surface instanceof Element ? surface : root;
    const range = document.createRange();
    const els = only === undefined ? scope.querySelectorAll('*') : [...only].filter((el) => scope.contains(el));
    for (const el of els) {
        if (rest) t.elements += 1;
        if (el.closest('.deck-stall') !== null) continue;
        const owner = reachOwner(el);
        if (owner === undefined) continue;
        if (rest && !owner.boxed) t.contents += 1;
        const paints = ownPaints(el, owner.cs, owner.boxed, range);
        if (paints === undefined) continue;
        cutToClips(el, paints, clipSeen);
        out.push({ el, pseudo: null, paints });
    }
    // Look pseudos: of hosts on the surface, and of the boxes above it up to the app's root (the critic's T6 shape).
    const hosts = new Map<Element, Set<'before' | 'after'>>();
    for (const { which, host } of lookPseudoHosts()) {
        let found: Element[];
        try {
            if (only !== undefined) {
                found = [...only].filter((el) => el.matches(host));
            } else {
                found = [...(scope.matches(host) ? [scope] : []), ...scope.querySelectorAll(host)];
                if (scope !== root) for (let up = scope.parentElement; up !== null; up = up.parentElement) {
                    if (up.matches(host)) found.push(up);
                    if (up === root) break;
                }
            }
        } catch {
            continue;
        }
        for (const el of found) {
            if (el.closest('.deck-stall') !== null || (only !== undefined && !only.has(el))) continue;
            let set = hosts.get(el);
            if (set === undefined) hosts.set(el, (set = new Set()));
            set.add(which);
        }
    }
    for (const [el, whiches] of hosts) {
        if (el.getClientRects().length === 0) continue;
        const hr = el.getBoundingClientRect();
        for (const which of whiches) {
            const pseudo = `::${which}` as const;
            const cs = getComputedStyle(el, pseudo);
            if (cs.content === 'none' || cs.content === 'normal' || cs.display === 'none' || cs.visibility !== 'visible') continue;
            if (rest) t.pseudos += 1;
            const region = lookPseudoRegion(cs, hr);
            const paints = pseudoReachPaints(el, cs, region, reachScale(el, hr));
            if (paints.sharp.length === 0 && paints.soft.length === 0 && paints.anywhere === undefined) continue;
            cutToClips(el, paints, clipSeen, true);
            out.push({ el, pseudo, paints });
        }
    }
    if (rest) t.reachers += out.length;
    return out;
}

/** An element's number on this page, for keys that must tell two boxes of one name apart (`judgeReacher`). */
const reachIds = new WeakMap<Element, number>();
let reachIdNext = 0;
function reachId(el: Element): number {
    let id = reachIds.get(el);
    if (id === undefined) reachIds.set(el, (id = (reachIdNext += 1)));
    return id;
}

/**
 * One reacher held to every target it can meet: its would-be failures said
 * (`said` holds what is not said again: one a pair of boxes and a kind) and
 * tallied under the measuring look, `at` saying where it read. A sharp
 * reach meets past the box it is drawn from; a blurred layer counts under
 * the policy, its core included — its offset and spread met in full is the
 * literal reading of "offset and spread in full", measured and not counted (`softCore`,
 * `reachLiteral`).
 */
function judgeReacher(rc: Reacher, targets: readonly ReachTarget[], t: ReachTally, screen: string, label: string, at: string | undefined, said: Set<string>): void {
    const p = rc.paints;
    const who = `${named(rc.el)}${rc.pseudo ?? ''}`;
    const whoKey = `${reachId(rc.el)}${rc.pseudo ?? ''}`;
    for (const target of targets) {
        const tn = target.node;
        // Neither the node's ancestor nor its descendant: a pseudo stands inside its host, so it is held unless its host is the node or inside it.
        if (rc.pseudo === null ? rc.el === tn || rc.el.contains(tn) || tn.contains(rc.el) : rc.el === tn || tn.contains(rc.el)) continue;
        if (!target.boxes.some((b) => intersect(p.bound, b) !== undefined)) continue;
        // What each side's clips show of it, held to the other (`pairClip`).
        const tClip = pairClip(target.chain, p.carriers ?? p.chain ?? []);
        const boxes = target.boxes.map((b) => intersect(b, tClip)).filter((b): b is Box => b !== undefined);
        if (boxes.length === 0) continue;
        const rClip = pairClip(p.chain ?? [], target.chain);
        const textual = (kind: ReachKind): boolean => p.ownAll === true || kind.startsWith('text-shadow') || kind === 'decoration';
        const clipFor = (kind: ReachKind): Box => (p.own !== undefined && textual(kind) ? (intersect(rClip, p.own) ?? NO_BOX) : rClip);
        t.pairs += 1;
        let meet: Meet | undefined;
        // A blurred layer's core (its offset and spread) met in full: the literal reading, measured beside the policy and not counted (`softCore`).
        let core: Meet | undefined;
        if (p.anywhere !== undefined) {
            meet = { kind: 'unresolved', at: boxes[0]!, what: p.anywhere };
        } else {
            outer: for (const b of boxes) {
                for (const s of p.sharp) {
                    const rect = intersect(s.rect, clipFor(s.kind));
                    if (rect === undefined) continue;
                    const m = sharpMeet(s.kind, [rect], b, s.base, s.what);
                    if (m === undefined) continue;
                    if (s.soft) {
                        core ??= m;
                        continue;
                    }
                    meet = m;
                    break outer;
                }
            }
            if (meet === undefined && p.soft.length > 0) {
                // The policy: every blurred layer the reacher paints, composited over the target past its own box, each cut by its clips.
                const layers = p.soft.map((s) => ({ ...s.layer, clip: clipFor(s.kind) }));
                const kinds = [...new Set(p.soft.map((s) => s.kind))];
                let most = 0;
                for (const b of boxes) {
                    const c = compositeOverAny(layers, targetPast(b, p.base));
                    most = Math.max(most, c);
                    const m = blurMeet(kinds.length === 1 ? kinds[0]! : 'box-shadow blur', layers, b, p.base, [...new Set(p.soft.map((s) => s.what))].join('; ').slice(0, 120));
                    if (m !== undefined && meet === undefined) meet = m;
                }
                const source = `${describe(rc.el)}${rc.pseudo ?? ''} ${kinds.join('+')}`;
                if (most > 0.001) reachSoft[source] = Math.max(reachSoft[source] ?? 0, Number(most.toFixed(4)));
            }
        }
        const placed = (m: Meet): string => `${Math.round(m.at.left)},${Math.round(m.at.top)} (${Math.round(m.at.right - m.at.left)}x${Math.round(m.at.bottom - m.at.top)})`;
        if (meet === undefined) {
            if (core !== undefined) {
                const key = `${whoKey}|core|${reachId(tn)}`;
                if (said.has(key)) continue;
                said.add(key);
                t.softCore += 1;
                if (reachLiteral.length < REACH_LITERAL_KEPT) {
                    reachLiteral.push(`${screen} / ${label}: ${who}'s ${core.kind} (${core.what}) core reaches ${target.name} at ${placed(core)}${at === undefined ? '' : `, ${at}`}`);
                }
            }
            continue;
        }
        // One failure a pair (a reacher and a target, each its own box) and a kind, whatever it is read at.
        const key = `${whoKey}|${meet.kind}|${reachId(tn)}`;
        if (said.has(key)) continue;
        said.add(key);
        const sentence =
            `${who}'s ${meet.kind}${meet.kind === 'unresolved' ? '' : ` (${meet.what})`} reaches ${target.name} at ${placed(meet)}` +
            (meet.coverage === undefined ? '' : `, composite ${meet.coverage.toFixed(2)}`) +
            (meet.kind === 'unresolved' ? ` — ${meet.what}: it reaches anywhere` : '') +
            (at === undefined ? '' : `, ${at}`);
        // A meet the owner accepted by name (`REACH_ACCEPTED`), keyed on what the page paints: counted and said, not failed.
        const accepted = acceptedReach(reachFact(rc, meet, tn));
        if (accepted !== undefined) {
            t.accepted += 1;
            if (reachAcceptedSaid.length < REACH_KEPT) reachAcceptedSaid.push(`${screen} / ${label}: ${sentence} — accepted: ${accepted.name}`);
            continue;
        }
        t.would += 1;
        t.byKind[meet.kind] = (t.byKind[meet.kind] ?? 0) + 1;
        if (reachWould.length < REACH_KEPT) reachWould.push(`${screen} / ${label}: ${sentence}`);
        reachFailures.push({ screen, theme: label, check: REACH_CHECK, detail: sentence });
    }
}

/** A meet as the accepted list reads it (`acceptedReach`): the reacher and the target as the page paints them. */
function reachFact(rc: Reacher, meet: Meet, target: Element): ReachFact {
    const rs = getComputedStyle(rc.el, rc.pseudo);
    const ts = getComputedStyle(target);
    return {
        kind: meet.kind,
        coverage: meet.coverage,
        reacher: { tag: rc.el.tagName.toLowerCase(), classes: [...rc.el.classList], pseudo: rc.pseudo, boxShadow: rs.boxShadow },
        target: { tag: target.tagName.toLowerCase(), classes: [...target.classList], role: target.getAttribute('data-role'), background: ts.backgroundColor, color: ts.color },
    };
}

/**
 * 1b on the paint at rest: its failures said and tallied under the measuring
 * look, `said` holding what is not said again. It keeps its targets, its
 * clips and its reachers (`reachRest`) for the keyframe reads after it —
 * the reachers read even where no target stands at rest, since a move at a
 * keyframe can carry a target out from behind its clips under one.
 */
function reachRead(screen: string, label: string, said: Set<string>): Reacher[] {
    const t = reachTally();
    t.paints += 1;
    const root = document.getElementById('app')!;
    const scrim = root.querySelector('[data-role="sheet-scrim"], [data-role="poster"], [data-role="zoom"]');
    const surface: ParentNode = scrim ?? root;
    const clipSeen = new Map<Element, ClipLink[]>();
    const targets = reachTargets(surface, clipSeen);
    t.targets += targets.length;
    reachRest = { targets, clipSeen, surface, all: [] };
    const reachers = reachersOn(surface, undefined, clipSeen, t, true);
    reachRest.all = reachers;
    for (const rc of reachers) judgeReacher(rc, targets, t, screen, label, undefined, said);
    return reachers;
}

/** The paints that reach and pass to the boxes below (a text-shadow and the colour a `currentcolor` reads are inherited; a decoration line is drawn on the text under its box). */
const REACH_INHERITED = /^(?:color|text-shadow|text-decoration(?:-.*)?|text-underline-(?:offset|position))$/;

/**
 * The keyframe longhands that change no paint that reaches and move no box
 * (`reachSeek` leaves an animation of these alone): a ground, an opacity, a
 * clip or a mask — 1b reads at rest whatever their values, an element at any
 * opacity and any paint unclipped by its own clip-path or mask — and a custom
 * property no declaration that is not one of these reads, directly or through
 * another custom property (`reachVarsRead`).
 */
const REACH_NEEDLESS = /^(?:background(?:-.*)?|opacity|clip-path|mask(?:-.*)?|-webkit-mask(?:-.*)?)$/;
/** A declaration block's declarations, split at its top-level semicolons (never inside parentheses or a string). */
function declarationsOf(css: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let quote = '';
    let start = 0;
    for (let i = 0; i < css.length; i += 1) {
        const c = css[i]!;
        if (quote !== '') {
            if (c === '\\') i += 1;
            else if (c === quote) quote = '';
        } else if (c === '"' || c === "'") quote = c;
        else if (c === '(') depth += 1;
        else if (c === ')') depth = Math.max(0, depth - 1);
        else if (c === ';' && depth === 0) {
            out.push(css.slice(start, i));
            start = i + 1;
        }
    }
    out.push(css.slice(start));
    return out.map((d) => d.trim()).filter((d) => d !== '');
}
let reachVarsSeen: { key: string; relevant: Set<string> } | undefined;
function reachVarsRead(): Set<string> {
    const key = sheetKey();
    if (reachVarsSeen?.key === key) return reachVarsSeen.relevant;
    // Which declarations read each custom property, from every rule's declarations as written (keyframes and groups opened).
    const readers = new Map<string, Set<string>>();
    const walk = (rules: CSSRuleList): void => {
        for (const rule of rules) {
            if ('style' in rule && (rule as CSSStyleRule).style instanceof CSSStyleDeclaration) {
                for (const decl of declarationsOf((rule as CSSStyleRule).style.cssText)) {
                    const colon = decl.indexOf(':');
                    if (colon < 0) continue;
                    const prop = decl.slice(0, colon).trim();
                    for (const m of decl.slice(colon + 1).matchAll(/var\(\s*(--[\w-]+)/g)) {
                        let set = readers.get(m[1]!);
                        if (set === undefined) readers.set(m[1]!, (set = new Set()));
                        set.add(prop);
                    }
                }
            }
            if ('cssRules' in rule) {
                try {
                    walk((rule as CSSGroupingRule).cssRules);
                } catch {
                    // An unreadable group reads nothing more.
                }
            }
        }
    };
    let unread = false;
    for (const sheet of [...document.styleSheets, ...document.adoptedStyleSheets]) {
        try {
            walk(sheet.cssRules);
        } catch {
            unread = true;
        }
    }
    const relevant = new Set<string>();
    let grew = true;
    while (grew) {
        grew = false;
        for (const [v, props] of readers) {
            if (relevant.has(v)) continue;
            if ([...props].some((prop) => (prop.startsWith('--') ? relevant.has(prop) : !REACH_NEEDLESS.test(prop)))) {
                relevant.add(v);
                grew = true;
            }
        }
    }
    // A sheet this page cannot read may read any of them: every custom property is relevant then.
    if (unread) for (const v of readers.keys()) relevant.add(v);
    reachVarsSeen = { key, relevant: unread ? new Set(['*', ...relevant]) : relevant };
    return reachVarsSeen.relevant;
}
function reachNeedless(prop: string): boolean {
    if (prop.startsWith('--')) {
        const relevant = reachVarsRead();
        return !relevant.has('*') && !relevant.has(prop);
    }
    return REACH_NEEDLESS.test(prop);
}

/**
 * 1b at each keyframe offset (widened at step 7b, after the ninth critic's L1
 * and K1): every animation on the surface that is not needless
 * (`reachNeedless`: it sets nothing that reaches or moves) and not read from
 * its keyframes' own values (`reachKeyframes`) is seeked to each of its
 * keyframe offsets — its timing one normal, linear iteration, filled both
 * ways, no delay — and at each offset every reacher that can have changed is
 * held to every target that can have changed; then put back. Which ones
 * follows from what its keyframes set, read as 1a's offset read reads them
 * (`MOVES_NO_OTHER_BOX`, `ANCHOR_FOLLOWED`):
 *
 * - **wide**: a longhand `MOVES_NO_OTHER_BOX` does not name — a size, a
 *   margin, a padding, a font, a track, `display`, `visibility`, a custom
 *   property a reach or a layout reads (K1: `box-shadow: var(--x)` with
 *   `--x` set in a keyframe), or a keyframe rule this page cannot read — or a
 *   move an anchor can follow (`anchorCanFollow`) can move or change any box
 *   on the page (L1: a heading's `margin-bottom` pulled the rows up under the
 *   tabs' band). Every reacher on the surface is read again and held to every
 *   target read again (`wide` in the tallies).
 * - **a move of its own box** (a transform, its parts, its origin, a motion
 *   path, a box's offsets, with no anchor to follow them): only the box and
 *   what it holds move. The reachers it holds are read again and held to
 *   every target (those it holds read again, the rest as they stood), and the
 *   targets it holds on the open surface, read again (those its clips hid at
 *   rest included), to every reacher outside it as it stood. A move of a
 *   pseudo-element carries none of its host's targets. One that holds no
 *   reacher and no target at rest, and runs on no look pseudo, moves nothing
 *   1b reads and is left out (`unmoved` in the tallies).
 * - **paints alone** (the rest of `MOVES_NO_OTHER_BOX`): no box moves, so the
 *   targets and the clips stand; the animated box is read again — and what it
 *   holds, where a paint it sets is inherited (`REACH_INHERITED`) — and held
 *   to every target as it stood.
 *
 * A failure the read at rest said, or an earlier offset, is not said again.
 * Not read, stated: a reach between two offsets, and two animations at once.
 */
function reachSeek(screen: string, label: string, said: Set<string>): void {
    const t = reachTally();
    const rest = reachRest;
    if (rest === undefined) return;
    const root = document.getElementById('app')!;
    const pseudoHosts = new Set<Element>();
    for (const { host } of lookPseudoHosts()) {
        try {
            for (const el of root.querySelectorAll(host)) pseudoHosts.add(el);
        } catch {
            // A selector this page cannot match marks nothing.
        }
    }
    const sheets = sheetKey();
    if (reachPropsByName.key !== sheets) reachPropsByName = { key: sheets, byName: new Map() };
    const animations = document.getAnimations();
    // The boxes that hold a reacher at rest (a look pseudo's, its host).
    const held = new Set(rest.all.map((rc) => rc.el));
    // Whether an anchor can follow what a move carries (`anchorCanFollow`, 1a's reading).
    const pageAnchors =
        sheetFacts().anchors || animations.some((a) => a.effect instanceof KeyframeEffect && !(a instanceof CSSAnimation) && (keyframeProps(a, a.effect)?.has('anchor-name') ?? false));
    for (const anim of animations) {
        const effect = anim.effect;
        if (!(effect instanceof KeyframeEffect) || effect.target === null) continue;
        const target = effect.target;
        if (!root.contains(target) || target.closest('.deck-stall') !== null) continue;
        // What a CSS animation's keyframes set is its rule's, one per name while the page's sheets stand.
        const byName = anim instanceof CSSAnimation ? anim.animationName : undefined;
        let props = byName === undefined ? undefined : reachPropsByName.byName.get(byName);
        if (props === undefined) {
            props = keyframeProps(anim, effect) ?? null;
            if (byName !== undefined) reachPropsByName.byName.set(byName, props);
        }
        const known = props ?? undefined;
        // An animation of nothing that reaches or moves is left alone (`reachNeedless`).
        if (known !== undefined && [...known].every(reachNeedless)) {
            t.needless += 1;
            continue;
        }
        const name = byName ?? 'a transition';
        const pseudo = effect.pseudoElement;
        const where = pseudo === null ? describe(target) : `${describe(target)}${pseudo}`;
        // Paints alone, of a kind read from the keyframes' own values (`REACH_FROM_VALUES`), on a box: read with no seek (`reachKeyframes`).
        if (
            known !== undefined &&
            pseudo === null &&
            [...known].every((p) => REACH_FROM_VALUES.has(p) || reachNeedless(p)) &&
            reachKeyframes(screen, label, effect, target, known, name, where, said, pseudoHosts)
        ) {
            continue;
        }
        // What it can move or change (see above): any box (`wide`), its own box and what it holds, or its paints alone (`still`).
        const others = known === undefined || ![...known].every((p) => MOVES_NO_OTHER_BOX.has(p) || reachNeedless(p));
        const follows = known === undefined || [...known].some((p) => ANCHOR_FOLLOWED.has(p));
        const wide = others || (follows && anchorCanFollow(target, pseudo, pageAnchors));
        const still = !wide && !follows;
        const subtree: Element[] = pseudo === null ? [target, ...target.querySelectorAll('*')] : [target];
        const inSubtree = new Set(subtree);
        const only = new Set<Element>(still && ![...known!].some((p) => REACH_INHERITED.test(p)) ? [target] : subtree);
        // The targets a move of its own box carries: every money node and protected box it holds on the open surface, those its clips hid at rest included.
        const scope: Element = rest.surface instanceof Element ? rest.surface : root;
        const carried =
            wide || still || pseudo !== null
                ? []
                : subtree.filter((el) => scope.contains(el) && el.matches(`${MONEY_FIGURES}, ${PROTECTED}`) && el.closest('.deck-stall') === null);
        const carriedSet = new Set<Element>(carried);
        // A move of its own box that holds no reacher and no target, and runs on no look pseudo, moves nothing 1b reads: left out.
        if (!wide && !still && carried.length === 0 && !(pseudo !== null && pseudoHosts.has(target)) && !subtree.some((el) => held.has(el))) {
            t.unmoved += 1;
            continue;
        }
        const duration = effect.getComputedTiming().duration;
        if (typeof duration !== 'number' || !Number.isFinite(duration) || !(duration > 0)) continue;
        const offsets = [...new Set([0, 1, ...effect.getKeyframes().map((k) => k.computedOffset ?? 0)])].filter((o) => o >= 0 && o <= 1).sort((a, b) => a - b);
        const { delay, endDelay, iterations, iterationStart, direction, fill, easing } = effect.getTiming();
        const kept = { delay, endDelay, iterations, iterationStart, direction, fill, easing };
        const time = anim.currentTime;
        const s0 = performance.now();
        let els = 0;
        // Not ours to time: read at rest alone. A throw in a read is not swallowed here: it ends 1b on the paint and fails it (`reachAtRest`).
        let timed = true;
        try {
            effect.updateTiming({ delay: 0, endDelay: 0, iterations: 1, iterationStart: 0, direction: 'normal', fill: 'both', easing: 'linear' });
        } catch {
            timed = false;
        }
        try {
            for (const offset of timed ? offsets : []) {
                try {
                    anim.currentTime = offset * duration;
                } catch {
                    break;
                }
                t.seeks += 1;
                const at = `with ${name} on ${where} seeked to its keyframe at ${Math.round(offset * 100)}%`;
                if (wide) {
                    // Any box can have moved or changed: every reacher on the surface, read again, held to every target read again.
                    t.wide += 1;
                    const clip = new Map<Element, ClipLink[]>();
                    const targets = reachTargets(rest.surface, clip);
                    const reachers = reachersOn(rest.surface, undefined, clip, t, false);
                    els += reachers.length;
                    for (const rc of reachers) judgeReacher(rc, targets, t, screen, label, at, said);
                } else if (still) {
                    // No box moves: the box (and what inherits its paints) read again, held to every target as it stood.
                    const reachers = reachersOn(rest.surface, only, rest.clipSeen, t, false);
                    els += only.size;
                    for (const rc of reachers) judgeReacher(rc, rest.targets, t, screen, label, at, said);
                } else {
                    // Its own box moves and carries what it holds: the reachers it holds to every target, and the targets it holds to every reacher outside it.
                    const clip = new Map<Element, ClipLink[]>();
                    const fresh = carried.length === 0 ? [] : reachTargets(rest.surface, clip, carried);
                    const targets = [...rest.targets.filter((tg) => !carriedSet.has(tg.node)), ...fresh];
                    const reachers = reachersOn(rest.surface, only, clip, t, false);
                    els += only.size;
                    for (const rc of reachers) judgeReacher(rc, targets, t, screen, label, at, said);
                    if (fresh.length > 0) for (const rc of rest.all) if (!inSubtree.has(rc.el)) judgeReacher(rc, fresh, t, screen, label, at, said);
                }
            }
            const n = (reachSeekNames[wide ? `${name} (wide)` : name] ??= { anims: 0, seeks: 0, els: 0, ms: 0 });
            n.anims += 1;
            n.seeks += offsets.length;
            n.els += els;
            n.ms += performance.now() - s0;
        } finally {
            try {
                effect.updateTiming(kept);
            } catch {
                // Put back as it can be.
            }
            try {
                anim.currentTime = time;
            } catch {
                // A finished animation stands where it stands.
            }
        }
    }
}

/** What each CSS animation's keyframes set, by name, while the page's sheets stand (`reachSeek`); `null` for a rule this page cannot read. */
let reachPropsByName: { key: string; byName: Map<string, ReadonlySet<string> | null> } = { key: '', byName: new Map() };

/**
 * The keyframe longhands a keyframe read takes from the keyframes' own
 * computed values, with no seek (`reachKeyframes`): three paints that reach,
 * and the colour a `currentcolor` in one of them is read in.
 */
const REACH_FROM_VALUES: ReadonlySet<string> = new Set(['box-shadow', 'text-shadow', 'filter', '-webkit-filter', 'color']);

/**
 * **A keyframe read from the keyframes' own values** (`reachSeek`): an
 * animation of a box-shadow, a text-shadow, a filter or a colour alone (and
 * what changes nothing, `reachNeedless`) moves no box, and its keyframes carry
 * their values computed in the box's own context (`getKeyframes()`: var()s
 * and colours resolved) — so each keyframe is read where it stands, as a seek
 * to it would read it, with no seek: the animated box's paints read again
 * with the values the keyframe sets in place of the ones it computes at rest,
 * and, for a text-shadow, every text owner under the box that inherits the
 * box's own (its text-shadow computes the box's at rest). A value a keyframe
 * does not set is read as it computes at rest, not as it interpolates there,
 * stated. False — the caller seeks instead — for a box that hosts a look
 * pseudo (its pseudo inherits what the box animates), and for a colour on a
 * box with boxes under it (a `currentcolor` anywhere below would follow it).
 */
function reachKeyframes(
    screen: string,
    label: string,
    effect: KeyframeEffect,
    target: Element,
    props: ReadonlySet<string>,
    name: string,
    where: string,
    said: Set<string>,
    pseudoHosts: ReadonlySet<Element>,
): boolean {
    const rest = reachRest;
    if (rest === undefined || pseudoHosts.has(target) || (props.has('color') && target.children.length > 0)) return false;
    const t = reachTally();
    const t0 = performance.now();
    const frames = effect.getKeyframes();
    const range = document.createRange();
    const csT = getComputedStyle(target);
    const inheriting: Element[] = props.has('text-shadow')
        ? [...target.querySelectorAll('*')].filter((el) => reachOwner(el) !== undefined && getComputedStyle(el).textShadow === csT.textShadow)
        : [];
    let reads = 0;
    for (const frame of frames) {
        const value = (prop: string): string | undefined => {
            const v = (frame as Record<string, unknown>)[prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())];
            return typeof v === 'string' ? v : undefined;
        };
        const set = { boxShadow: value('box-shadow'), textShadow: value('text-shadow'), filter: value('filter') ?? value('-webkit-filter'), color: value('color') };
        if (Object.values(set).every((v) => v === undefined)) continue;
        const at = `with ${name} on ${where} at its keyframe at ${Math.round((frame.computedOffset ?? 0) * 100)}% (read from the keyframe's values)`;
        const owners = [target, ...(set.textShadow === undefined ? [] : inheriting)];
        for (const el of owners) {
            const owner = reachOwner(el);
            if (owner === undefined) continue;
            // The animated box's own paints at this keyframe; a box under it inherits only its text-shadow.
            const paints = ownPaints(el, owner.cs, owner.boxed, range, el === target ? set : { textShadow: set.textShadow });
            if (paints === undefined) continue;
            cutToClips(el, paints, rest.clipSeen);
            judgeReacher({ el, pseudo: null, paints }, rest.targets, t, screen, label, at, said);
            reads += 1;
        }
    }
    const n = (reachSeekNames[`${name} (from its values)`] ??= { anims: 0, seeks: 0, els: 0, ms: 0 });
    n.anims += 1;
    n.seeks += frames.length;
    n.els += reads;
    n.ms += performance.now() - t0;
    t.fromValues += 1;
    return true;
}

/** The keyframe seeks per animation name: animations seeked, seeks, elements read, time (a clock). */
const reachSeekNames: Record<string, { anims: number; seeks: number; els: number; ms: number }> = {};

/** 1b's throws, word for word up to `REACH_THROWN_KEPT` (a throw is counted in the measuring look's tally, and fails its paint). */
const reachThrown: string[] = [];
const REACH_THROWN_KEPT = 40;

/**
 * 1b on a geometry pass's paint, at rest and at the keyframes (`coverAtRest`
 * calls it once every animation is reset), and its failures: one a pair of
 * boxes and a kind, the meets `REACH_ACCEPTED` names counted apart. Guarded
 * whole: a throw anywhere in it — the read at rest, the keyframe reads from
 * values, a read at a seek — ends 1b on this paint, is counted and said
 * (`reachThrown`), and fails the paint (step 7b; until then it failed
 * nothing): a paint 1b stopped reading is a paint nothing held.
 */
function reachAtRest(screen: string, label: string): Failure[] {
    const t0 = performance.now();
    let t1: number | undefined;
    reachFailures = [];
    try {
        const said = new Set<string>();
        reachRead(screen, label, said);
        t1 = performance.now();
        reachSeek(screen, label, said);
    } catch (e) {
        const why = (e instanceof Error ? e.message : String(e)).slice(0, 200);
        reachTally().throws += 1;
        if (reachThrown.length < REACH_THROWN_KEPT) reachThrown.push(`${screen} / ${label}: ${why}`);
        reachFailures.push({ screen, theme: label, check: REACH_CHECK, detail: `1b threw on this paint and read no further: ${why}` });
    } finally {
        reachRest = undefined;
        const t2 = performance.now();
        reachMs += t2 - t0;
        if (t1 !== undefined) reachSeekMs += t2 - t1;
    }
    const out = reachFailures;
    reachFailures = [];
    return out;
}

/**
 * Resolve a computed `polygon(...)` into pixel vertices for one box. Handles
 * the coordinate forms our sheets actually use — `px`, `%`, bare `0`, and
 * single-operation `calc(A% ± Bpx)` — and refuses anything else, so a new
 * clip grammar fails loudly instead of being measured wrong.
 */
function parsePolygon(clip: string, w: number, h: number): [number, number][] | undefined {
    // A reference box after the shape (`polygon(…) content-box`) moves and
    // sizes the polygon away from the border box this reads it against:
    // refused here, so every caller fails closed (CRITIC-MONEY-GUARDS
    // re-review, P3); `polygonIn` resolves it where a rule needs to.
    if (clip.slice(clip.lastIndexOf(')') + 1).trim() !== '') return undefined;
    const inner = clip.slice(clip.indexOf('(') + 1, clip.lastIndexOf(')'));
    const resolve = (token: string, size: number): number | undefined => {
        const t = token.trim();
        const calc = /^calc\(\s*([\d.]+)%\s*([+-])\s*([\d.]+)px\s*\)$/.exec(t);
        if (calc !== null) {
            const pct = (Number.parseFloat(calc[1]!) / 100) * size;
            const px = Number.parseFloat(calc[3]!);
            return calc[2] === '-' ? pct - px : pct + px;
        }
        // Signed: a polygon may reach past its box (Rural's wall tag, whose
        // clip extends above and below for the face's overhang, 2026-09-26).
        if (/^-?[\d.]+%$/.test(t)) return (Number.parseFloat(t) / 100) * size;
        if (/^-?[\d.]+px$/.test(t)) return Number.parseFloat(t);
        if (t === '0') return 0;
        return undefined;
    };
    const out: [number, number][] = [];
    for (const pair of inner.split(',')) {
        // A calc() vertex contains spaces, so split on the boundary between
        // its closing paren (or a bare token) and the next token instead.
        const m = /^\s*(calc\([^)]*\)|\S+)\s+(calc\([^)]*\)|\S+)\s*$/.exec(pair);
        if (m === null) return undefined;
        const x = resolve(m[1]!, w);
        const y = resolve(m[2]!, h);
        if (x === undefined || y === undefined) return undefined;
        out.push([x, y]);
    }
    return out.length >= 3 ? out : undefined;
}

/**
 * The widest axis-aligned band that is paint at EVERY height of a clipped
 * box — the horizontal range the contrast sampler may read.
 *
 * A `clip-path` is invisible to the sampler: the clipped-away corners keep
 * their pixels in the bounding rect, and what the camera finds there is the
 * page behind. Neo's announcement chip is a parallelogram
 * (`polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)`), so on every
 * screen it paints, both its top-left and bottom-right corners are the
 * look's near-black ground: the first run after `.notice-chip` joined
 * `CONTRAST_TEXT` reported **1.12–1.26:1 on fourteen figures**, against a
 * hex-level pair that is 6.10:1 and glyphs that sit wholly inside the
 * polygon — the clip-path containment rule above already proves that.
 *
 * So the guard was wrong, not the look, and the honest fix narrows the
 * sample rather than withdrawing the target: measure the text against the
 * paint it actually has. For a convex polygon the safe range is the
 * rightmost left-crossing and the leftmost right-crossing over the box's
 * whole height — for Neo's chip, exactly 6px off each side.
 *
 * **Convex only, and non-convex fails loudly** (the `parsePolygon` rule):
 * for a notch or a star the two crossings bracket a gap that is not paint,
 * and a sample band quietly laid across it is the false green this whole
 * pass exists to prevent. Such a target is refused instead.
 */
function clipBand(poly: [number, number][], h: number): { x0: number; x1: number } | undefined {
    // Convexity: every cross product of consecutive edges shares one sign.
    let sign = 0;
    for (let i = 0; i < poly.length; i += 1) {
        const [ax, ay] = poly[i]!;
        const [bx, by] = poly[(i + 1) % poly.length]!;
        const [cx, cy] = poly[(i + 2) % poly.length]!;
        const cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
        if (Math.abs(cross) < 1e-9) continue;
        const s = cross > 0 ? 1 : -1;
        if (sign === 0) sign = s;
        else if (s !== sign) return undefined;
    }
    let x0 = -Infinity;
    let x1 = Infinity;
    // Both edges of the band and 32 heights between them: a clip whose
    // widest constriction is in the middle is not one of ours, but sampling
    // only the two ends would miss it if it ever is.
    for (let i = 0; i <= 32; i += 1) {
        const y = (h * i) / 32;
        let left = Infinity;
        let right = -Infinity;
        for (let j = 0, k = poly.length - 1; j < poly.length; k = j, j += 1) {
            const [xj, yj] = poly[j]!;
            const [xk, yk] = poly[k]!;
            if (yj === yk) continue;
            const lo = Math.min(yj, yk);
            const hi = Math.max(yj, yk);
            if (y < lo || y > hi) continue;
            const x = xj + ((y - yj) * (xk - xj)) / (yk - yj);
            left = Math.min(left, x);
            right = Math.max(right, x);
        }
        if (left === Infinity) continue;
        x0 = Math.max(x0, left);
        x1 = Math.min(x1, right);
    }
    if (!Number.isFinite(x0) || !Number.isFinite(x1) || x1 - x0 < 2) return undefined;
    return { x0, x1 };
}

/** Ray casting, with a half-pixel tolerance for glyph rects on the edge. */
function pointInPolygon(x: number, y: number, poly: [number, number][]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
        const [xi, yi] = poly[i]!;
        const [xj, yj] = poly[j]!;
        // On-edge counts as inside: distance from point to segment <= 0.5px.
        const dx = xj - xi;
        const dy = yj - yi;
        const len2 = dx * dx + dy * dy;
        const s = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / len2));
        const ex = xi + s * dx - x;
        const ey = yi + s * dy - y;
        if (ex * ex + ey * ey <= 0.25) {
            return true;
        }
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

function describe(node: Element): string {
    const cls = typeof node.className === 'string' ? node.className : '';
    return `${node.tagName.toLowerCase()}${cls === '' ? '' : `.${cls.split(/\s+/).join('.')}`}`;
}

/**
 * The `t-*` classes on every painted `.stall`, over every paint this page
 * made — echoed in the verdict as `sheetClasses`, the way `reducedMotion` and
 * `portraitTall` are, so the runner can refuse a pass that measured a look it
 * did not ask for. The workshop critic's P1: a kit page that painted Modern
 * by id anywhere reads as a skeleton that passed, and only the class the tree
 * actually wore can tell the two apart
 * (`the-workshop-probe-measures-the-workshop-look`).
 */
const sheetClassesPainted = new Set<string>();

/*
 * The door's deck minis are left out (2026-09-23): they are three shipped
 * looks by design (Q8), painted on the door whatever look was asked for, so
 * counting them put `t-neo` and `t-rural` into the union on every page pass
 * and the audit could not see a shipped look painted under the wrong class —
 * only a missing skeleton would have failed it.
 */
function sheetClassesOn(root: ParentNode): string[] {
    const out = new Set<string>();
    for (const stall of root.querySelectorAll('.stall:not(.deck-stall)')) {
        for (const cls of stall.classList) {
            if (cls.startsWith('t-')) {
                out.add(cls);
            }
        }
    }
    return [...out].sort();
}

/** Nodes each staged screen put in its pressed state, per look class (`STAGED`). */
const stagedByClass: Record<string, Record<string, number>> = {};

/**
 * Paint one combination. A look is an object from `looks.ts`, never an id,
 * and its view is composed there (`paintView`): a shipped look on its
 * record, a carried private look through the try-on under the harness's
 * licence, its sheet's state as the app's loader holds it.
 */
function paint(screen: string, look: Look, worn: readonly ShippedAttachment[]): void {
    const root = document.getElementById('app')!;
    const view = paintView(SCREENS[screen]!, look, worn);
    dropCoverForPaint();
    renderStall(root, view, handlers);
    coverGoneAfterPaint();
    // A state only a press reaches (`STAGED`), on the tree just painted,
    // counted per look so a staged screen that found nothing to press is
    // refused (`probe-coverage.mjs`).
    const staged = stageScreen(screen, root);
    if (staged !== undefined) {
        const tally = (stagedByClass[look.theme.sheetClass] ??= {});
        tally[screen] = (tally[screen] ?? 0) + staged;
    }
    for (const cls of sheetClassesOn(root)) {
        sheetClassesPainted.add(cls);
    }
}

/**
 * Every decorated stall a shipped look can produce, and no more than that.
 *
 * One occupant per slot is what keeps this linear: the alternative is 2^16
 * combinations per theme, which is a guard nobody would ever run. So each row
 * is measured alone, and then the all-worn case is measured once — the only
 * combination a picker can actually produce.
 */
function wornVariants(look: Look): readonly (readonly ShippedAttachment[])[] {
    const rows = look.rows;
    // One all-worn variant per mood (D11): `0xffff` wears the lowest-bit mood
    // alone, so a look's second mood is all-worn under its own flags. Every
    // shipped look has one mood at most, so this is the one variant it was.
    const alls = wornAllFlags(look)
        .map((flags) => wornOf(look, flags))
        .filter((all) => all.length > 1);
    const singles = rows.map((row) => [row]);
    return [[], ...singles, ...alls];
}

/*
 * **A spill over any money is read** (`a-spill-over-any-money-is-read`;
 * CRITIC-NARROW-PHONE round 4, P2-2; D-2026-10-14-02). `text-spills` held a
 * block's spilled words against controls, two money roles (`price`,
 * `seller-price`) and a few kinds of words, and nothing else: words painted
 * over Pay several's "$10.00", over the wall's payment lines and over "You
 * pay" passed every geometry pass, or failed naming a control behind the
 * sheet. So a spill is held against every money node (`MONEY_SET`), Pay
 * several's line figures (`.pay-line-x`, inside the money box `pay-lines`),
 * every broken figure (`.fig-say`) and a figure's own words (`.item-from`,
 * `.item-u`: "from", the unit, and the label "Not buyable" in a price cell)
 * — money first, each by its own line boxes — and a spill over money fails
 * under this name. **What is held is the spilled words** (round 2, the
 * critic's P3-1): the line boxes of the node's own text past its box's end,
 * never the box's whole height, which named money far down a tall box that
 * no glyph stood over (a face card past its edge "under span.addr-short",
 * the sign's address behind the sheet). Each line box is held to the box's
 * own extent across the spill, as the strip always was (a line's content
 * area taller than its box is not the words running past its end), and to
 * every clip between its text and the node (a name marquee's cell clips the
 * name it moves; `spilledWords`); a spill with no text past the edge keeps
 * the strip. **And only within the open sheet** while one is open
 * (`surface`): its targets are the sheet's, and a node behind the sheet,
 * under its scrim, is held to its own clipper alone. A figure's own words
 * are on the list so a money node narrower than its own text, nothing
 * clipping, is read where its digits land on its unit (the critic's plant F,
 * which the strip only ever named by the address behind the sheet). What
 * `text-spills` already skipped it still skips: the
 * spilling node's own ancestors and descendants, anything `aria-hidden`, and
 * a strip past the part of its clipper that shows (`spillReach`).
 */
const SPILL_MONEY_CHECK = 'a-spill-over-any-money-is-read';
const SPILL_MONEY = `${MONEY}, .pay-line-x, .fig-say, .item-from, .item-u`;
const SPILL_WORDS = 'button, a, input, select, textarea, .item-n, .face-nm, .fine, .note, .pub';

/**
 * The line boxes of `node`'s own text, each held to every clip between its
 * text and `node` on the spill's axis (a name marquee's cell clips the name
 * it moves, and its layout rects run past it).
 */
function spilledWords(node: Element, down: boolean): DOMRect[] {
    const out: DOMRect[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
        if ((text.textContent ?? '').trim() === '') continue;
        const clips: DOMRect[] = [];
        for (let at = text.parentElement; at !== null && at !== node; at = at.parentElement) {
            const cs = getComputedStyle(at);
            if ((down ? cs.overflowY : cs.overflowX) !== 'visible') clips.push(at.getBoundingClientRect());
        }
        const range = document.createRange();
        range.selectNodeContents(text);
        for (const r of range.getClientRects()) {
            let left = r.left;
            let right = r.right;
            let top = r.top;
            let bottom = r.bottom;
            for (const c of clips) {
                if (down) {
                    top = Math.max(top, c.top);
                    bottom = Math.min(bottom, c.bottom);
                } else {
                    left = Math.max(left, c.left);
                    right = Math.min(right, c.right);
                }
            }
            if (right > left && bottom > top) out.push(new DOMRect(left, top, right - left, bottom - top));
        }
    }
    return out;
}

/**
 * Measure what is on screen. **Separate from painting on purpose**: seeking an
 * animation and then repainting seeks a tree that is thrown away, and that is
 * exactly what the first version did — see `checkOverTime`.
 */
function measure(screen: string, themeLabel: string): Failure[] {
    const root = document.getElementById('app')!;

    const out: Failure[] = [];
    const fail = (c: string, detail: string): void => {
        out.push({ screen, theme: themeLabel, check: c, detail });
    };

    /**
     * A modal the seller opened is the surface being read, and covering the
     * stall behind it is what a modal is for — the sheet says so in its own
     * comment. So the rule is scoped rather than waived: while a sheet is open
     * the figures **inside it** must be uncovered, and the sheet must be
     * bounded and scrollable so closing it brings the stall back. The first run
     * of this guard reported the scrim covering the price behind it, which is
     * exactly the boundary that had never been written down.
     */
    /*
     * The stream overlay is not a shop page, and two rules below are scoped
     * away from it by this flag rather than silently passing: the `.item-b`
     * name floor is a grid it does not have, and "the theme reaches all four
     * edges" is the opposite of what `bg=transparent` is for. Everything else
     * — sideways scroll, boxes over protected figures, positioned pseudos,
     * clip containment, reduced-motion stillness, the contrast floor — is
     * asked of it exactly as it is asked of the shop.
     */
    const overlay = NO_DECOR_SCREENS.has(screen);

    /*
     * `bg=transparent` must paint NOTHING behind the plates.
     *
     * `applyTheme` writes an inline background colour on `<html>` every paint
     * and `.stall` carries `background-color: var(--s-bg)` plus the look's
     * backdrop image, so the transparent path is a cascade fight the overlay
     * can lose quietly: OBS composites the page over the stream, and a ground
     * that survives is an opaque rectangle over the streamer's own video. The
     * pixel half of this rule is the runner's (it composites the shot over
     * black and white); this half reads the declarations, so a failure names
     * the element instead of a coordinate.
     *
     * **Pseudo-elements are read too.** The `html.bc-clear` longhands clear
     * ELEMENT backgrounds; a theme's `::before` painting a backdrop on
     * `.stall` (Neo's scanlines are the shape to expect) would survive them
     * untouched and invisible to an element-level read.
     */
    if (SCREENS[screen]?.broadcast?.transparent === true) {
        for (const sel of CLEAR_GROUNDS) {
            const node = document.querySelector(sel);
            if (node === null) {
                continue;
            }
            for (const which of [undefined, '::before', '::after'] as const) {
                const style = getComputedStyle(node, which);
                if (which !== undefined && (style.content === 'none' || style.content === '')) {
                    continue;
                }
                const where = `${sel}${which ?? ''}`;
                if (groundAlpha(style.backgroundColor) > 0) {
                    fail(
                        'a transparent broadcast painted a ground',
                        `${where} has background-color ${style.backgroundColor}`,
                    );
                }
                if (style.backgroundImage !== 'none') {
                    fail(
                        'a transparent broadcast painted a ground',
                        `${where} has background-image ${style.backgroundImage}`,
                    );
                }
            }
        }
    }

    // The poster's scrim carries the class and its own role, not the
    // sheets' role — measured 2026-09-08 when the first poster screen was
    // added: read against `root`, every price behind the modal reported the
    // scrim covering it, and nothing inside the sheet was measured at all.
    const scrim = root.querySelector(
        '[data-role="sheet-scrim"], [data-role="poster"], [data-role="zoom"]',
    );
    const surface: ParentNode = scrim ?? root;

    // A closed <details> lays out nothing, so every check below it would pass
    // vacuously on exactly the content it was written for — the wrapped
    // "Token ID" label lives inside the fold P2 introduces. Open them all
    // before anything is measured, protected boxes included.
    for (const details of surface.querySelectorAll('details')) {
        details.open = true;
    }

    // §6's rule, at last enforced against what was actually drawn.
    for (const price of surface.querySelectorAll('[data-role="price"]')) {
        const why = coveredBy(price);
        if (why !== undefined) {
            fail('asked amount is covered', why);
        }
    }
    // The figure the buyer pays in the disclosure is the same promise.
    for (const paid of surface.querySelectorAll('.row.big dd')) {
        const why = coveredBy(paid);
        if (why !== undefined) {
            fail('you-pay figure is covered', why);
        }
    }
    /**
     * Boxes, not hit testing — and this is the check that matters most.
     *
     * `elementFromPoint` skips anything with `pointer-events: none`, and every
     * attachment in the shipped catalogue will carry exactly that, because a
     * decoration that answers a tap is a control. Measured in a browser: a red
     * box with `pointer-events: none` laid over a price returned **the price**
     * as the hit, so the five-point probe called it uncovered while it was
     * completely hidden. Geometry does not care about hit testing.
     */
    const guarded = [...surface.querySelectorAll(PROTECTED)].map((n) => ({
        node: n,
        box: n.getBoundingClientRect(),
    }));
    // Past a side edge with nothing to scroll is cut, not reachable — for
    // every protected box, not only the two `coveredBy` hit-tests.
    for (const g of guarded) {
        const cut = cutSideways(g.node, g.box);
        if (cut !== undefined) {
            fail('a protected box is cut sideways', `${describe(g.node)} ${cut}`);
        }
    }
    for (const deco of decorations(surface)) {
        // A decoration that contains the thing, or sits inside it, is layout,
        // not cover: `.item` clips its own children, and the scrim *is* the
        // sheet's own frame.
        const box = deco.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) {
            continue;
        }
        for (const g of guarded) {
            if (deco.contains(g.node) || g.node.contains(deco)) {
                continue;
            }
            if (overlaps(box, g.box)) {
                fail(
                    'a decoration overlaps something it must not',
                    `${describe(deco)} over ${describe(g.node)}`,
                );
            }
        }
    }

    /*
     * A label never wraps.
     *
     * These are our own words and all of them are short, so a two-line label is
     * always a column too narrow rather than a label too long. It shipped:
     * capping the detail's content column at 540px left exactly enough room for
     * a 64-character token id and nothing else, so "Token ID" broke across two
     * lines beside a value that had also broken — a row that reads as damage
     * rather than as a fact. Nothing else in this guard can see it: the row is
     * covered by nothing, scrolls nowhere, and stays inside the page.
     */
    for (const dt of surface.querySelectorAll('.row dt')) {
        // The **text**, not the box. `.row` is a flex row, so a label's box
        // stretches to whatever the value beside it needs — a wrapped token id
        // at 390px, or the larger type on the you-pay figure — and measuring
        // the box called all of those wrapped labels when the words sat on one
        // line. A range over the contents reports one rect per line of text.
        const range = document.createRange();
        range.selectNodeContents(dt);
        const lines = range.getClientRects().length;
        range.detach?.();
        if (lines > 1) {
            fail(
                'a label wrapped onto a second line',
                `${describe(dt)} "${(dt.textContent ?? '').slice(0, 24)}" runs to ${lines} lines`,
            );
        }
    }

    /*
     * The name column never collapses under the price.
     *
     * The price column is an `auto` track and the name column is
     * `minmax(0, 1fr)`, so a long asked figure — which may not wrap, §8 —
     * takes whatever it wants and the name pays. Measured on the live origin
     * at 375px: a `1,000.01` price held the column at 189px and every name
     * wore 40px; at `100,000,000` a name rendered one letter per line.
     * `priceTier` (type steps, then a row of its own) and the max-width on
     * the glance-lines are the fix; this floor is what keeps their cut
     * points honest on every look. Measured on `.item-b` — the grid item —
     * because `.item-n` shrinks to its text (`align-items: flex-start`) and
     * would read 26px on a short name with 140px of room.
     */
    for (const nameCol of overlay ? [] : surface.querySelectorAll('.item-b')) {
        // The door's deck is a picture of three stalls at ~0.6 scale, inert and
        // aria-hidden (round 16): its rows are the real anatomy over fixture
        // words, and a name column that is 90px on a phone is 57px there by
        // arithmetic, not by collapse. The rule guards a row a buyer reads;
        // every such row is measured on every stall screen, so the deck is
        // the one place it looks away, and it says so here.
        if (nameCol.closest('[data-role="door-deck"]') !== null) {
            continue;
        }
        const box = nameCol.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) {
            continue;
        }
        if (box.width < 64) {
            fail(
                'the name column collapsed under the price',
                `${describe(nameCol)} is ${Math.round(box.width)}px wide`,
            );
        }
    }

    /*
     * An Activity row's tile sits in its own 24px grid column; the kind and
     * the time start in the next. Measured on the live origin at 1280px,
     * 2026-09-08: the desktop block's `.item-ic { width: var(--s-icon-d) }`
     * and the looks' own `.t-* .item-ic` rules out-ranked the tile's 24px,
     * so a 56px tile sat over the first letters of every line — an in-flow
     * overlap no protected box names, which is why it has its own rule.
     */
    for (const tile of surface.querySelectorAll<HTMLElement>('.event-sum .event-ic')) {
        const box = tile.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) {
            continue;
        }
        const line = tile.parentElement?.querySelector<HTMLElement>('.event-kind');
        if (line === null || line === undefined) {
            continue;
        }
        const text = line.getBoundingClientRect();
        if (box.right > text.left + 0.5) {
            fail(
                'a row tile covers its own line',
                `${describe(tile)} is ${Math.round(box.width)}px wide and ends at ${Math.round(box.right)}, the kind starts at ${Math.round(text.left)}`,
            );
        }
    }

    /*
     * **A zoomed picture fills its frame, and wears none of the shelf's
     * framing.** `zoomSheet` exists to show the seller's artwork square and
     * uncropped, whatever the look's tile does to it on a row — and for as
     * long as it existed it did neither, because `.zoom-ic` IS `.item-ic`
     * and the reset carried one class where every look re-states
     * `.t-* .item-ic` with two, in a file imported after `stall.css`.
     *
     * Reported by the owner as a picture "bị lệch" and measured in Chrome at
     * 390x844 on 2026-09-22: a 320x320 frame holding a 320x**270** icon,
     * bottom-aligned, with a 50px band of `--s-surface` above it — pure
     * white on Modern. The cause is `grid-area: ic` riding in from the row:
     * `.zoom-frame` names no areas, so `ic` is a line that does not exist,
     * the icon lands in an implicit track and its `height: 100%` resolves
     * against that. Beside it, `.t-rural .item-ic`'s `border-radius: 50%`
     * cut the artwork to an ELLIPSE, Neo drew a 1px cyan border around it,
     * and `--s-icon-clip` chamfered its corner — the shelf's framing on the
     * seller's picture, which is the one thing this surface promises not to
     * do.
     *
     * No guard could see any of it: nothing covers anything, so the box
     * sweep and the hit test are both silent, and happy-dom lays out
     * nothing. This measures the two boxes against each other and reads the
     * computed framing off the icon.
     */
    for (const frame of surface.querySelectorAll<HTMLElement>('.zoom-frame')) {
        const fb = frame.getBoundingClientRect();
        if (fb.width === 0 || fb.height === 0) {
            continue;
        }
        const ic = frame.querySelector<HTMLElement>('.zoom-ic');
        if (ic === null) {
            continue;
        }
        const ib = ic.getBoundingClientRect();
        // A half-pixel each way: a fractional viewport lands boxes off the
        // grid, and this rule is about a 50px band, not a rounding.
        if (fb.width - ib.width > 1 || fb.height - ib.height > 1) {
            fail(
                'the zoomed picture does not fill its frame',
                `${describe(ic)} is ${Math.round(ib.width)}x${Math.round(ib.height)} in a ${Math.round(fb.width)}x${Math.round(fb.height)} frame`,
            );
        }
        const cs = getComputedStyle(ic);
        const radius = Number.parseFloat(cs.borderTopLeftRadius) || 0;
        const border = Number.parseFloat(cs.borderTopWidth) || 0;
        const clip = cs.clipPath;
        if (radius > 0 || border > 0 || (clip !== 'none' && clip !== '')) {
            fail(
                'the zoomed picture wears the shelf\'s framing',
                `${describe(ic)} has radius ${cs.borderTopLeftRadius}, border ${cs.borderTopWidth}, clip ${clip}`,
            );
        }
        /*
         * And none of the shelf's mask or its mark (step 8f2, STEP-8-PLAN
         * §4.3 item 9): a look that cuts its tiles to a shape with a mask,
         * or frames them with the tile's mark, would cut or frame the
         * seller's picture here too. The reset takes both off with
         * `!important` (stall.css), because a worn-only look's sheet lands
         * later and a (0,3,0) rule of its own wins on source order; this
         * reads what the cascade left. Red by a planted (0,3,0) mask with the
         * reset's `!important` taken off (`PROBE-RULES.md`).
         */
        const masks = ['mask-image', '-webkit-mask-image', 'mask-border-source', '-webkit-mask-box-image-source']
            .map((prop) => [prop, cs.getPropertyValue(prop).trim()] as const)
            .filter(([, value]) => value !== '' && value !== 'none');
        if (masks.length > 0) {
            fail('the zoomed picture wears the shelf\'s mask', `${describe(ic)} has ${masks.map(([p, v]) => `${p} ${v.slice(0, 60)}`).join(', ')}`);
        }
        for (const mark of ic.querySelectorAll('[data-look-mark]')) {
            const shown = getComputedStyle(mark).display;
            if (shown !== 'none') {
                fail('the zoomed picture wears the shelf\'s mark', `a ${mark.getAttribute('data-look-mark')} mark computes display: ${shown} on ${describe(ic)}`);
            }
        }
    }

    /*
     * **A pay code is as wide as the gate was told.** The sheet decides
     * whether to draw one by asking whether it still reaches the density a
     * phone has read here, in a box width written down as a constant — and
     * that constant was read off the wrong node once, saying 318 where the
     * truth was 300, which drew codes at 4.92px a module under a gate that
     * computed 5.21 (2026-09-22). Nothing in the suite could see it: happy-dom
     * lays nothing out. This measures the painted box — the element's width
     * minus its own padding — and fails under the number the gate uses, so a
     * stylesheet change that shrinks the plate turns red here instead of
     * quietly making every scan sentence optimistic.
     */
    for (const code of surface.querySelectorAll<SVGElement>('[data-role="pay-qr"] svg.qr')) {
        const box = code.getBoundingClientRect();
        if (box.width === 0) {
            continue;
        }
        const cs = getComputedStyle(code);
        const painted =
            box.width - Number.parseFloat(cs.paddingLeft) - Number.parseFloat(cs.paddingRight);
        if (painted + 0.5 < PAY_QR_NARROWEST_PX) {
            fail(
                'a pay code is narrower than the gate was told',
                `${describe(code)} paints ${Math.round(painted)}px against ${PAY_QR_NARROWEST_PX}`,
            );
        }
    }

    /*
     * A marquee never paints outside its cell. The moving span is a
     * `transform` inside a cell that must clip — with `overflow` visible
     * the run would slide over the figure beside it, and the spill rule
     * above skips exactly the clipped case this depends on (2026-09-09).
     */
    for (const cell of surface.querySelectorAll<HTMLElement>('[data-marquee]')) {
        const cs = getComputedStyle(cell);
        if (cs.overflowX === 'visible') {
            fail('a marquee cell does not clip', `${describe(cell)} has overflow-x visible`);
        }
        if (cell.querySelector('.mq-run') === null) {
            fail('a marquee with nothing to move', describe(cell));
        }
    }

    /*
     * And a screen that exists for the marquee must arm the cell it exists
     * for. `long-item-name` carries a token name (T1's) wider than a 390px
     * row so the name path of `src/ui/marquee.ts` is measured here at all;
     * a fixture whose name quietly fitted again would leave the rule above
     * green over nothing — the same audit the runner makes of a pay screen
     * that mounts no figure (2026-09-14). T1's own cell and not any cell:
     * the first version asked for any `[data-marquee]` and stayed green
     * with the name shortened, because the long-figure rows crush their own
     * names into runs. Desktop is not asked: the row is wide enough there.
     */
    if (screen.startsWith('long-item-name') && window.innerWidth < 680) {
        const armed = surface.querySelector(`[data-marquee][data-mq="name"][data-mq-key="${T1}"]`);
        if (armed === null) {
            fail(
                'a screen built for the marquee armed none',
                `${screen} at ${window.innerWidth}px: T1's name cell carries no data-marquee`,
            );
        }
    }

    for (const pseudo of positionedPseudos(surface)) {
        fail(
            'a positioned pseudo-element cannot be measured',
            `${pseudo} — a decoration must be a real node`,
        );
    }

    /*
     * A clip-path is invisible to both the box check and the hit test: the
     * clipped-away region has no paint, but the text inside keeps its rect,
     * so a notch cut through a label reads as a perfectly healthy box. Every
     * text line inside a polygon-clipped element must sit inside the polygon.
     */
    for (const clipped of surface.querySelectorAll<HTMLElement>('*')) {
        const clip = getComputedStyle(clipped).clipPath;
        if (!clip.startsWith('polygon(')) {
            continue;
        }
        const box = clipped.getBoundingClientRect();
        const poly = parsePolygon(clip, box.width, box.height);
        if (poly === undefined) {
            fail('a clip-path this check cannot read', `${describe(clipped)}: ${clip}`);
            continue;
        }
        const walker = document.createTreeWalker(clipped, NodeFilter.SHOW_TEXT);
        for (let t = walker.nextNode(); t !== null; t = walker.nextNode()) {
            if ((t.textContent ?? '').trim() === '') {
                continue;
            }
            const range = document.createRange();
            range.selectNodeContents(t);
            for (const rect of range.getClientRects()) {
                const points: [number, number][] = [
                    [rect.left - box.left, rect.top - box.top],
                    [rect.right - box.left, rect.top - box.top],
                    [rect.left - box.left, rect.bottom - box.top],
                    [rect.right - box.left, rect.bottom - box.top],
                    [rect.left + rect.width / 2 - box.left, rect.top + rect.height / 2 - box.top],
                ];
                const escaped = points.find(([x, y]) => !pointInPolygon(x, y, poly));
                if (escaped !== undefined) {
                    fail(
                        'text escapes its clip',
                        `"${(t.textContent ?? '').trim().slice(0, 20)}" in ${describe(clipped)} at ${Math.round(escaped[0])},${Math.round(escaped[1])}`,
                    );
                    break;
                }
            }
            range.detach?.();
        }
    }

    if (scrim !== null) {
        // A sheet taller than the screen with nothing to scroll would strand
        // whatever is below it — including a figure a seller is about to sign.
        // `.zoom-card` is the same surface on the picture overlay (2026-09-18):
        // what is measured is a modal's readable content, and a scrim holding
        // loose children has none — which is why the zoom puts its picture,
        // its name and its close in one card rather than three siblings.
        const sheet = scrim.querySelector('.sheet, .zoom-card');
        if (sheet === null) {
            fail('a scrim with no sheet', 'nothing to read inside the overlay');
        } else {
            const box = sheet.getBoundingClientRect();
            const scrollable = sheet.scrollHeight <= sheet.clientHeight + 1;
            if (box.height > window.innerHeight + 1) {
                fail('sheet is taller than the screen', `height ${Math.round(box.height)}`);
            }
            if (!scrollable && getComputedStyle(sheet).overflowY !== 'auto') {
                fail('sheet overflows with no way to scroll', 'content is out of reach');
            }
        }
    }

    // Nothing may push the page sideways. This is the class of bug that a
    // 178-character description, a long token id and a raw hex record all
    // belong to, and none of them is visible to a runner that cannot lay out.
    const doc = document.documentElement;
    if (doc.scrollWidth > window.innerWidth + 1) {
        fail(
            'page scrolls sideways',
            `scrollWidth ${doc.scrollWidth} > viewport ${window.innerWidth}`,
        );
    }
    // The shell's scroll region hides its own overflow from the page, so the
    // same rule is asked of it directly.
    const scroller = root.querySelector('.stall-scroll');
    if (scroller !== null && scroller.scrollWidth > scroller.clientWidth + 1) {
        fail(
            'the panel scrolls sideways',
            `scrollWidth ${scroller.scrollWidth} > ${scroller.clientWidth}`,
        );
    }

    /*
     * The sticker source holds the card.
     *
     * `OBS_STICKER_WIDTH` / `OBS_STICKER_HEIGHT` / `OBS_RAIL_STICKER_HEIGHT`
     * are the numbers the studio's recipe tells a streamer to type into OBS's
     * Width and Height boxes, and a source shorter than the card clips it —
     * from the top on a bottom-anchored corner, from both ends on the centred
     * rail. Nothing else in this guard can see that: a clipped Browser Source
     * scrolls nowhere, covers nothing and stays inside the page it was cut to.
     * So the constants are asserted against the painted box, and the fixtures
     * that carry the worst case are `broadcast-long-name` and
     * `broadcast-rail-long-name` — one per preset, because each preset has its
     * own constant and a ceiling derived from the other one is a number nobody
     * measured.
     *
     * **Both insets count on both presets.** The corner is anchored
     * `bottom: 60px` and keeps the same clearance above it; the rail is
     * `top: 50%` with a `translateY(-50%)`, so the source's spare height is
     * split above and below and half of it is not enough.
     *
     * **The inset is read, not retyped.** `right` is the one edge that is a
     * length on both presets — `bottom` computes to `auto` on the centred
     * rail — and `broadcast.css` uses the same 60px on every edge it sets.
     * Ceil the height: a Browser Source is typed in whole pixels, and the
     * plates stack on a 1.15 line-height that lands on fractions.
     */
    if (overlay) {
        const bc = root.querySelector('[data-role="broadcast"]');
        if (bc === null) {
            fail('an overlay screen painted no card', 'nothing to size a sticker to');
        } else {
            const box = bc.getBoundingClientRect();
            const inset = Number.parseFloat(getComputedStyle(bc).right) || 0;
            const preset = bc.getAttribute('data-preset') ?? 'corner';
            // Per preset (2026-09-21): the ticker is a full-width strip and
            // its width is the canvas — a strip a streamer scales down is a
            // code that stops scanning, so the recipe says do not.
            const table: Record<string, { ceiling: number; named: string; width: number; widthName: string }> = {
                corner: { ceiling: OBS_STICKER_HEIGHT, named: 'OBS_STICKER_HEIGHT', width: OBS_STICKER_WIDTH, widthName: 'OBS_STICKER_WIDTH' },
                rail: { ceiling: OBS_RAIL_STICKER_HEIGHT, named: 'OBS_RAIL_STICKER_HEIGHT', width: OBS_STICKER_WIDTH, widthName: 'OBS_STICKER_WIDTH' },
                ticker: { ceiling: OBS_TICKER_STICKER_HEIGHT, named: 'OBS_TICKER_STICKER_HEIGHT', width: OBS_TICKER_STICKER_WIDTH, widthName: 'OBS_TICKER_STICKER_WIDTH' },
            };
            const row = table[preset] ?? table.corner!;
            const w = Math.round(box.width) + 2 * inset;
            const h = Math.ceil(box.height) + 2 * inset;
            const seen =
                `.bc is ${Math.round(box.width)}x${Math.ceil(box.height)} ` +
                `at inset ${inset}`;
            if (h > row.ceiling) {
                fail(
                    'the-sticker-height-fits-the-tallest-card',
                    `${seen}, so the ${preset} sticker needs ` +
                        `${w}x${h} — ${row.named} is ${row.ceiling}`,
                );
            }
            if (w !== row.width) {
                fail(
                    'the-sticker-width-is-the-plate-plus-both-insets',
                    `${seen}, so the sticker needs ${w} wide — ` +
                        `${row.widthName} is ${row.width}`,
                );
            }
        }
        /*
         * The ticker's flag holds its own lines (2026-09-22). The rail line is
         * nowrap with no clip of its own, and a flag capped at 420px painted
         * "Seller's quotes · Pays the seller · no escrow" 27–50px across the
         * divider into the ribbon's lane on every look — a spill `text-spills`
         * could not see, because its clipper is the bar and its overlap list
         * names none of the ribbon's classes. The name is capped and clipped
         * inside its own box, so what this reads is the flag's other lines.
         */
        const flag = root.querySelector<HTMLElement>('.tk-lab');
        if (flag !== null && flag.scrollWidth > flag.clientWidth + 1) {
            fail(
                'the-tickers-flag-fits-its-lines',
                `.tk-lab holds ${flag.scrollWidth}px of lines in ${flag.clientWidth}px`,
            );
        }
    }

    // The theme must reach the edges. Measured once at 375x812 as an 8px border
    // and 42% of the screen left unthemed, and invisible for two months because
    // the shipped default is white on a white canvas.
    const stall = root.querySelector('.stall');
    if (stall !== null && screen !== 'door' && !overlay) {
        const box = stall.getBoundingClientRect();
        if (box.top > 1 || box.left > 1 || box.right < window.innerWidth - 1) {
            fail('theme does not reach the edges', `stall box ${JSON.stringify(box.toJSON())}`);
        }
        if (box.height < window.innerHeight - 1) {
            fail('theme does not reach the bottom', `height ${box.height} < ${window.innerHeight}`);
        }
    }
    /*
     * Words that spill out of their own box and land where they should not.
     * A block whose content is wider than its box and whose overflow is
     * `visible` paints past its edge; no other rule sees it — the coverage
     * rules read what `elementFromPoint` returns, and a control painted over
     * spilled text returns the control. Two things make a spill a defect: the
     * spilled strip **overlaps another element** that is not the node's own
     * ancestor or descendant (words under a button, over a neighbour's
     * words), or it **crosses the nearest clipping ancestor's edge** (words
     * cut off by a sheet or the scroller). A box that merely pokes into its
     * parent's padding, and a decoration (`aria-hidden`), are not. Measured
     * live 2026-09-05: the quote row's one-line words ran under the Pay
     * control on Neo, because the flex column sized the line to its content.
     */
    /*
     * Read on the box's own inline axis (step 8f2, the 8f2 critic's P2-3,
     * `a-vertical-name-is-read-on-its-own-axis`): words run along the
     * inline axis, which in a vertical writing mode is DOWN — so there the
     * spill is `scrollHeight` past the box's bottom, cut by the nearest
     * ancestor clipping vertically, and a vertical name or tagline running
     * past its box onto the address or the rows is read like a horizontal
     * one running past its right edge.
     */
    const clipperOf = (node: Element, down: boolean): Element | null => {
        let up = node.parentElement;
        while (up !== null && up !== root) {
            const cs = getComputedStyle(up);
            if ((down ? cs.overflowY : cs.overflowX) !== 'visible') {
                return up;
            }
            up = up.parentElement;
        }
        return null;
    };
    for (const node of root.querySelectorAll<HTMLElement>('*')) {
        if (!(node instanceof HTMLElement) || node.clientWidth === 0) {
            continue;
        }
        if (node.closest('[aria-hidden="true"]') !== null || (node.textContent ?? '').trim() === '') {
            continue;
        }
        const cs = getComputedStyle(node);
        const down = !cs.writingMode.startsWith('horizontal');
        if ((down ? cs.overflowY : cs.overflowX) !== 'visible' || cs.display === 'inline') {
            continue;
        }
        const spill = down ? node.scrollHeight - node.clientHeight : node.scrollWidth - node.clientWidth;
        if (spill <= 1) {
            continue;
        }
        const box = node.getBoundingClientRect();
        // The strip the words paint into, past the box's own inline end.
        const strip = down ? new DOMRect(box.left, box.bottom, box.width, spill) : new DOMRect(box.right, box.top, spill, box.height);
        const clipper = clipperOf(node, down);
        const edge = clipper?.getBoundingClientRect();
        const cut = edge !== undefined && (down ? strip.bottom > edge.bottom + 1 : strip.right > edge.right + 1);
        let under: Element | undefined;
        // Against a control inside the clipper, the whole strip (below the
        // fold too); against one outside it, the part the clipper shows
        // (`spillReach`, round 4, the critic's P2-1).
        const clipCs = clipper === null ? undefined : getComputedStyle(clipper);
        const clip =
            edge === undefined || clipCs === undefined
                ? undefined
                : { box: edge, clipsX: clipCs.overflowX !== 'visible', clipsY: clipCs.overflowY !== 'visible' };
        if (!cut) {
            // The spilled words themselves (round 2, the critic's P3-1): the
            // parts of the node's own text past its box's end, never the
            // box's whole height, which named money far down a tall box that
            // no glyph stood over. A spill with no text past the edge (an
            // overflowing picture) keeps the strip.
            // Held to the box's own extent across the spill (the strip's,
            // as it always was): a line's content area taller than its box
            // is not the words running past its end. And text a clip inside
            // the node hides (a name marquee's cell) is held to that clip.
            const words = spilledWords(node, down)
                .filter((r) => r.width > 0 && r.height > 0 && (down ? r.bottom > box.bottom + 1 : r.right > box.right + 1))
                .map((r) => {
                    if (down) {
                        const left = Math.max(r.left, box.left);
                        return new DOMRect(left, Math.max(r.top, box.bottom), Math.min(r.right, box.right) - left, r.bottom - Math.max(r.top, box.bottom));
                    }
                    const top = Math.max(r.top, box.top);
                    return new DOMRect(Math.max(r.left, box.right), top, r.right - Math.max(r.left, box.right), Math.min(r.bottom, box.bottom) - top);
                })
                .filter((r) => r.width > 0 && r.height > 0);
            const strips = words.length > 0 ? words : [strip];
            // Money first, so a spill over a figure names the figure; and
            // while a sheet is open, within it alone — a node behind the
            // sheet is under its scrim, and a control behind it is too.
            const targets =
                surface !== root && !(surface as Element).contains(node)
                    ? []
                    : [...surface.querySelectorAll<HTMLElement>(SPILL_MONEY), ...surface.querySelectorAll<HTMLElement>(SPILL_WORDS)];
            for (const other of targets) {
                if (other === node || node.contains(other) || other.contains(node)) {
                    continue;
                }
                if (other.closest('[aria-hidden="true"]') !== null) {
                    continue;
                }
                // Each of its own boxes: one for a block, one per line for an
                // inline figure broken over lines, whose union holds a corner
                // no glyph of it stands in (`a-spill-over-any-money-is-read`).
                const boxes = [...other.getClientRects()].filter((r) => r.width > 0);
                const hit = strips.some((s) => {
                    const reach = spillReach(s, clip, clipper === null || clipper.contains(other));
                    return (
                        reachesAnything(reach) &&
                        boxes.some((r) => !(reach.right <= r.left || r.right <= reach.left || reach.bottom <= r.top || r.bottom <= reach.top))
                    );
                });
                if (hit) {
                    under = other;
                    break;
                }
            }
        }
        if (cut || under !== undefined) {
            fail(
                under !== undefined && under.matches(SPILL_MONEY) ? SPILL_MONEY_CHECK : 'text-spills',
                `${describe(node)} paints ${spill}px past its box${down ? ', down its vertical lines' : ''} (${down ? node.scrollHeight : node.scrollWidth} > ${down ? node.clientHeight : node.clientWidth})${cut ? ', cut off by ' + describe(clipper!) : ', under ' + describe(under!)}`,
            );
        }
    }
    /*
     * CoinGecko is named beside a CoinGecko figure on that figure's own line
     * (owner, 2026-09-23: no line pushed down for it). happy-dom lays nothing
     * out, so `the-coingecko-figure-names-coingecko-on-its-own-line` can pin
     * only the structure — two inline siblings in one row. This reads the
     * line boxes: each span is exactly one, the source starts where the
     * figure ends, and the two overlap vertically — so a `display: block` on
     * either, or a row too narrow for both, fails here.
     */
    for (const source of root.querySelectorAll<HTMLElement>('[data-role="fiat-source"]')) {
        const figure = source.previousElementSibling;
        if (figure === null || figure.getAttribute('data-role') !== 'fiat') {
            fail('the fiat source is not beside its figure', describe(source));
            continue;
        }
        const a = figure.getClientRects();
        const b = source.getClientRects();
        const one = a.length === 1 && b.length === 1;
        const sameLine =
            one && b[0]!.top < a[0]!.bottom && a[0]!.top < b[0]!.bottom && b[0]!.left >= a[0]!.right - 1;
        if (!sameLine) {
            fail(
                'the fiat source pushed a line',
                `${a.length} + ${b.length} line box(es): figure ${JSON.stringify(a[0]?.toJSON())}, ` +
                    `source ${JSON.stringify(b[0]?.toJSON())}`,
            );
        }
    }
    return out;
}

/**
 * One instant is not a measurement of a moving thing.
 *
 * A sprite whose keyframes carry it across the price is uncovered at t=0 and
 * over the number at t=7s, and a probe that samples once passes it. So each
 * screen is measured at several points through the longest animation on it.
 *
 * `getAnimations` is queried after the paint, so it sees whatever the shipped
 * looks actually start — today that is the Neo ticker's flicker and the card
 * caret's transition, and tomorrow whatever an attachment brings.
 */
const STEPS = 6;

/**
 * Under reduced motion, stillness is asserted, not assumed. The reduce
 * blocks are ordinary rules and lose ordinary cascade fights — the round-3
 * motion consumers were appended below stall.css's reduce block and re-won
 * by order, so Neo kept flickering for every reduced-motion visitor while
 * the geometry-only pass stayed green. Checked once per painted combination,
 * not once per measurement, so one leak is one line.
 */
function reducedMotionLeaks(screen: string, themeLabel: string): Failure[] {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return [];
    }
    const out: Failure[] = [];
    for (const anim of document.getAnimations()) {
        if (anim.playState !== 'running') {
            continue;
        }
        const name = anim instanceof CSSAnimation ? anim.animationName : anim.constructor.name;
        const target =
            anim.effect instanceof KeyframeEffect && anim.effect.target !== null
                ? describe(anim.effect.target)
                : '?';
        out.push({
            screen,
            theme: themeLabel,
            check: 'reduced motion left something running',
            detail: `${name} on ${target}`,
        });
    }
    // Transitions never appear in `getAnimations()` at rest — one only runs
    // while a property is mid-change — so the loop above is blind to a
    // declared duration that will animate the first hover or expand a
    // reduced-motion visitor causes. Computed style is the only place a
    // waiting transition exists. Measured 2026-08-31: `.t-modern .item-caret`
    // kept its 0.2s slide under reduce because the theme selector
    // out-specifies stall.css's reduce block; every theme file now carries
    // its own transition kills, and this check is what notices the next one.
    for (const el of document.getElementById('app')!.querySelectorAll('*')) {
        const cs = getComputedStyle(el);
        if (cs.transitionProperty === 'none') {
            continue;
        }
        if (cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0)) {
            out.push({
                screen,
                theme: themeLabel,
                check: 'reduced motion left a transition armed',
                detail: `${cs.transitionProperty} ${cs.transitionDuration} on ${describe(el)}`,
            });
        }
    }
    return out;
}

function checkOverTime(
    screen: string,
    look: Look,
    themeLabel: string,
    worn: readonly ShippedAttachment[],
): Failure[] {
    paint(screen, look, worn);
    coveredByPhase = 'rest';
    const out = measure(screen, themeLabel);
    coverRest = [];
    out.push(...reducedMotionLeaks(screen, themeLabel));
    // Queried after the paint, so these are the animations on the tree that is
    // about to be measured — and it must stay that way. Repainting between the
    // seek and the measurement is what made the first version of this loop a
    // no-op: `renderStall` throws the tree away on every paint, so every
    // measurement landed on fresh nodes at t=0. Proved by planting a sprite
    // that is empty at t=0 and covers the screen mid-cycle: nothing was
    // reported until the seek and the measurement shared one tree.
    const running = document.getAnimations();
    if (running.length === 0) {
        return out;
    }
    const longest = running.reduce((ms, a) => {
        const timing = a.effect?.getComputedTiming();
        const d = typeof timing?.duration === 'number' ? timing.duration : 0;
        return Math.max(ms, d);
    }, 0);
    if (longest <= 0) {
        return out;
    }
    // Where every animation stood at rest, for 1a, which reads the paint at
    // rest after every other read of it (`coverAtRest`).
    coverRest = running.map((a) => [a, a.currentTime]);
    // **Every delay zeroed first** (before 8g2, the window's item 4), as the
    // contrast freeze zeroes it (`freezeAnimations`): an instant is a time
    // into each animation's active phase. With its delay a look's animation
    // waiting two minutes stood before its first keyframe at every instant
    // (the critic's PT, a keyframe `visibility: hidden` on the quote row's
    // price column 120s after the paint), and a marquee's or the ticker's
    // negative delay — the wall-clock time since its run began — made each
    // instant a different one on every run.
    for (const a of running) {
        try {
            a.effect?.updateTiming({ delay: 0 });
        } catch {
            // Not ours to time.
        }
    }
    coveredByPhase = 'instants';
    for (let step = 1; step <= STEPS; step += 1) {
        const at = (longest * step) / (STEPS + 1);
        for (const a of running) {
            try {
                a.currentTime = at;
            } catch {
                // A finished or unseekable animation is not a moving thing.
            }
        }
        for (const f of measure(screen, themeLabel)) {
            out.push({ ...f, check: `${f.check} (at ${Math.round(at)}ms)` });
        }
    }
    return out;
}

/**
 * Which decorated variants a screen buys. Card screens get the full set; the
 * state screens (no cards, still decorated) get undecorated and fully-worn
 * only — the probe's runtime is a budget, and the interaction a single row
 * could break that the full set does not needs a card to stage it.
 */
function variantsFor(screen: string, look: Look): readonly (readonly ShippedAttachment[])[] {
    // The overlay wears nothing: `renderStall`'s broadcast branch keeps only
    // `slot: 'mood'` rows, strips the class a mood may carry (D11), and mounts
    // no ornament strip, so every worn variant paints the same tree. One bare pass, and the driver skips its `wornAll`
    // loop too — see NO_DECOR_SCREENS.
    // The door too, since it wears nothing (`paintsBareOnly`).
    if (paintsBareOnly(screen)) {
        return [[]];
    }
    const all = wornVariants(look);
    if (!STATE_SCREENS.has(screen) || all.length < 2) {
        return all;
    }
    // Bare, and every all-worn variant — one per mood (D11). For a shipped
    // look that is the one fully-worn paint it always was (a look of one row
    // wears that row).
    return [all[0]!, ...wornAllFlags(look).map((flags) => wornOf(look, flags))];
}

/**
 * The viewport handshake. `?viewport=canvas` is the 1920x1080 pass and runs
 * the overlay screens **only**; anything else is a page width and runs
 * everything else.
 *
 * The split lives here rather than in the runner's URL on purpose: a screen
 * added to `SCREENS` must land in exactly one of the two passes without
 * anybody remembering to edit a list in a shell script, and the verdict
 * reports `screensMeasured` so the runner can refuse a pass that measured the
 * wrong side of the line instead of trusting this function.
 */
function screensForViewport(): string[] {
    const canvas = new URLSearchParams(location.search).get('viewport') === 'canvas';
    // The split itself lives in `screenSplit.ts` (the wall's own floor, the
    // canvas line), shared with the workshop's shot plan so a screenshot is
    // of exactly what was measured. A screen no measured look can wear is not
    // measured at all: the door on a workshop page (`looksFor`).
    return screensAt(window.innerWidth, canvas).filter((name) => looksFor(name).length > 0);
}

/**
 * `?screens=a,b` limits a run to named screens. The reduced-motion pass uses
 * it: emulated media doubles the run, so it re-measures only the screens that
 * animate rather than paying for fourteen twice.
 */
function screensToRun(): string[] {
    const asked = new URLSearchParams(location.search).get('screens');
    if (asked === null) {
        return screensForViewport();
    }
    // The asked list verbatim, unknown names dropped — `?screens=` measures
    // nothing on purpose (the contrast driver wants the hooks without paying
    // for a full measurement run). The verdict names what actually ran, so a
    // runner can refuse a vacuous green instead of trusting this filter.
    return asked.split(',').filter((name) => name in SCREENS);
}

/*
 * **An unbuyable offer paints no figure and says so** (the owner, 2026-09-24,
 * reversing the day-old "the dash is the size of the figure"). An offer
 * whose covenant refuses every take this page could ask for (`isUnbuyable`)
 * carries the label "Not buyable" in its price cell and nothing else: no
 * figure, no unit, no "from", and no stand-in for a figure — the dash that
 * stood there read as a price, 112px tall on the wall's card, and on the
 * stream overlay it wore `data-role="price"` with no price in it. Three
 * places paint the label: a shop row, the listing face (its card, and its
 * fold's line) and a wall row in Browse. The three unattended surfaces that
 * step through one card at a time **skip** such a listing (the owner,
 * 2026-09-24): the wall's Cycle card, the stream's corner card and its
 * ticker item — so a label on any of them is a failure, and
 * `shop-window-cycle-unbuyable`, `broadcast-unbuyable` and
 * `broadcast-ticker-unbuyable` (each a buyable listing beside an unbuyable
 * one, the cursor where the shop order puts the unbuyable one) are held to
 * painting a card, or a ribbon item, with no label (`skipChecks`).
 *
 * For every "Not buyable" label the page paints, in a cell this rule knows:
 * - **no figure**: the cell holds no node of a figure's parts
 *   (`FIGURE_PARTS`, the price role and every class a figure, its unit or
 *   its "from" wears, the dash's own included) and no words but the label —
 *   the ticker item keeps its name and its stock line, which are not a
 *   figure;
 * - **says so**: the label has a box, is visible, and nothing covers it
 *   (`coveredBy`, the protected boxes' own test);
 * - **by its role**: every label carries `data-role="unbuyable"`, the one
 *   contrast target that measures its ink on every surface (`CONTRAST_TEXT`).
 *
 * A label outside every known cell fails (a new surface this rule cannot
 * read is a surface it is not guarding), and a screen built for an
 * unbuyable offer that painted no label fails. The labels read are counted
 * per place (`unbuyableChecks` in the verdict) and the skips seen per
 * surface (`skipChecks`: `wall-cycle`, `stream-card`, `stream-ticker`); the
 * runner refuses a phone or desk pass that read no label in a place it owes,
 * a desk pass that saw no Cycle skip and a canvas pass that saw no stream
 * skip (`probe-coverage.mjs`) — a renamed fixture would otherwise leave this
 * rule green over nothing.
 */
const UNBUYABLE_CHECK = 'an-unbuyable-offer-paints-no-figure-and-says-so';
const UNBUYABLE_SCREENS = new Set(['unbuyable', 'item-unbuyable', 'item-unbuyable-fold', 'shop-window-unbuyable']);
/**
 * The fixtures whose unbuyable listing must be skipped, and what each must
 * paint instead: a card (or a ribbon item) and no label on it.
 *
 * `wouldShow` is where the surface looks in the shop's own order before any
 * skip — the card's cursor, or the ticker's page — and the fixture must put
 * an unbuyable listing THERE (the critic's third pass, 2026-09-24): a cursor
 * on a buyable listing paints a card with no label whether or not anything
 * is skipped, and the rule would count a skip it never saw.
 */
const SKIP_SCREENS: Readonly<
    Record<string, { surface: string; shown: string; wouldShow: (view: StallView) => number[] }>
> = {
    'shop-window-cycle-unbuyable': {
        surface: 'wall-cycle',
        shown: '.stall.shop-window[data-mode="cycle"] .sw-row',
        wouldShow: (view) => [view.windowCursor ?? 0],
    },
    'broadcast-unbuyable': {
        surface: 'stream-card',
        shown: '.bc-ext .bc-item',
        wouldShow: (view) => [view.broadcastCursor ?? 0],
    },
    'broadcast-ticker-unbuyable': {
        surface: 'stream-ticker',
        shown: '.tk-run .tk-it',
        wouldShow: (view) => {
            const at = (view.broadcastCursor ?? 0) * TICKER_ITEMS_PER_PASS;
            return Array.from({ length: TICKER_ITEMS_PER_PASS }, (_, i) => at + i);
        },
    },
};

/** Whether the listing a skipping surface would show unskipped, at its cursor or page, is unbuyable. */
function skipIsAtTheCursor(screen: string, skip: { wouldShow: (view: StallView) => number[] }): boolean {
    const view = SCREENS[screen]!;
    const order = listingsInShopOrder(view);
    return skip
        .wouldShow(view)
        .filter((i) => i < order.length)
        .some((i) => isUnbuyable(cheapestOf(order[i]!)));
}
const skipChecks: Record<string, number> = {};
/** The cells an unbuyable offer's label sits in, one kind per place it is painted. */
const UNBUYABLE_CELLS = '.item-p, .face-x, .listing-line, .bc-p, .tk-it';
/** What a figure is made of, wherever one is painted — a stand-in for one included. */
const FIGURE_PARTS = [
    '[data-role="price"]',
    '.item-a',
    '.item-x',
    '.item-from',
    '.x',
    '.listing-x',
    '.bc-from',
    '.bc-u',
    '.tk-x',
    '.tk-u',
    '.tk-from',
    '.dash',
    // A figure's mark (step 8f1, `lookHooks.ts`) rides the buyable
    // branches alone; one beside "Not buyable" would be the stand-in for a
    // figure CLAUDE §6 forbids, shown or not (the 8f1 critic's item 7).
    '[data-look-mark="figure"]',
].join(', ');
const unbuyableChecks: Record<string, number> = {};

/** Where an unbuyable label's cell sits: `row`, `face`, `wall-<mode>`, `overlay-card`, `overlay-ticker`. */
function unbuyablePlace(cell: Element): string | undefined {
    if (cell.closest('[data-role="door-deck"]') !== null) {
        return undefined;
    }
    if (cell.matches('.tk-it')) {
        return 'overlay-ticker';
    }
    if (cell.matches('.bc-p')) {
        return 'overlay-card';
    }
    const wall = cell.closest('.stall.shop-window');
    if (wall !== null && cell.closest('.sw-row') !== null) {
        return `wall-${wall.getAttribute('data-mode') ?? '?'}`;
    }
    if (cell.matches('.face-x, .listing-line')) {
        return 'face';
    }
    if (cell.closest('.item-head') !== null) {
        return 'row';
    }
    return undefined;
}

function unbuyableFaults(screen: string, label: string): Failure[] {
    coveredByPhase = 'label';
    const root = document.getElementById('app')!;
    const out: Failure[] = [];
    const fail = (detail: string): void => {
        out.push({ screen, theme: label, check: UNBUYABLE_CHECK, detail });
    };
    let read = 0;
    for (const node of root.querySelectorAll<HTMLElement>('*')) {
        if (node.childElementCount > 0 || node.textContent?.trim() !== UNBUYABLE_BADGE) {
            continue;
        }
        const cell = node.closest(UNBUYABLE_CELLS);
        const where = cell === null ? undefined : unbuyablePlace(cell);
        if (cell === null || where === undefined) {
            if (node.closest('[data-role="door-deck"]') === null) {
                fail(`"${UNBUYABLE_BADGE}" in ${describe(node)} sits in no price cell this rule reads`);
            }
            continue;
        }
        read += 1;
        if (where === 'wall-cycle' || where === 'overlay-card' || where === 'overlay-ticker') {
            fail(`${where}: an unbuyable listing is on a surface that skips them`);
            continue;
        }
        unbuyableChecks[where] = (unbuyableChecks[where] ?? 0) + 1;
        if (node.getAttribute('data-role') !== 'unbuyable') {
            fail(`${where}: "${UNBUYABLE_BADGE}" in ${describe(node)} carries no data-role="unbuyable" — its ink is measured by that role`);
        }
        const part = cell.querySelector(FIGURE_PARTS);
        if (part !== null) {
            fail(`${where}: beside "${UNBUYABLE_BADGE}" the cell paints ${describe(part)} "${part.textContent?.trim() ?? ''}"`);
        }
        // Everything else the cell says. A ticker item is a whole line — its
        // name and its stock ride beside the label, and neither is a figure.
        const rest = [...cell.childNodes]
            .filter((child) => child !== node && !(child instanceof Element && where === 'overlay-ticker' && child.matches('.tk-n, .tk-w')))
            .map((child) => child.textContent ?? '')
            .join(' ')
            .trim();
        if (rest !== '') {
            fail(`${where}: beside "${UNBUYABLE_BADGE}" the cell says "${rest}"`);
        }
        const cs = getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility !== 'visible' || Number.parseFloat(cs.opacity) < 1) {
            fail(`${where}: "${UNBUYABLE_BADGE}" does not show (display ${cs.display}, visibility ${cs.visibility}, opacity ${cs.opacity})`);
            continue;
        }
        const covered = coveredBy(node);
        if (covered !== undefined) {
            fail(`${where}: "${UNBUYABLE_BADGE}" ${covered}`);
        }
    }
    if (UNBUYABLE_SCREENS.has(screen) && read === 0) {
        fail(`${screen} painted no "${UNBUYABLE_BADGE}" — the rule would read nothing`);
    }
    const skip = SKIP_SCREENS[screen];
    if (skip !== undefined) {
        if (!skipIsAtTheCursor(screen, skip)) {
            fail(`${screen} puts no unbuyable listing where its surface looks unskipped — a card with no label there proves no skip`);
        } else if (root.querySelector(skip.shown) === null) {
            fail(`${screen} painted nothing where the skip is judged (${skip.shown}) — it would be judged over nothing`);
        } else if (read === 0) {
            skipChecks[skip.surface] = (skipChecks[skip.surface] ?? 0) + 1;
        }
    }
    return out;
}

/*
 * **A door mini paints as its own look** (2026-09-24, the step-2 critic's
 * item 8). The door's deck is three real looks over one fixture, and its
 * whole claim (CLAUDE §3) is that a look which moves in its own sheet moves
 * there. It did not: the door root wore `t-modern`, a look's sheet selects by
 * descent (`.t-modern .stall-name`) and CSS has no nearest ancestor, so every
 * mini also matched Modern's rules wherever its own sheet is silent —
 * measured at 390px, the Neo mini's sign 27px where Neo's shop paints 25, its
 * figure `rgb(223, 246, 255)` where Neo's shop paints the accent
 * `rgb(44, 233, 224)`, and the Rural mini's sign at Modern's weight 800
 * against Rural's 600. The door wears no look class now (`paintHome`).
 *
 * The rule compares, at the same width, every text part a mini shares with
 * the look's own shop — the sign's name and tagline, a row's name and rail
 * label, a tier-0 figure and its unit — on the seven properties a look's
 * sheet dresses text with (`MINI_PROPS`). The shop side is `offers`, bare,
 * for each shipped look; the mini side is every `.deck-stall` on `door`, in
 * every variant the pass paints it in. A narrower pair (the name's size and
 * the figure's ink, the two the critic measured) would miss the next leak on
 * another part or property; a wider one (boxes, grounds, borders) compares a
 * 390px row with a mini that is a `<div>` at zoom and would fail on what the
 * mini is for. The looks compared are counted (`doorMiniClasses`) and the
 * runner requires every shipped one at a phone and a desk.
 */
const MINI_PARTS: ReadonlyArray<readonly [string, string, string]> = [
    // [name, selector inside the mini, selector on the shop]
    ['the sign\'s name', '.stall-name', '.stall-name'],
    ['the tagline', '.stall-tagline', '.stall-tagline'],
    ['a row\'s name', '.item-n', 'button.item-head:not([data-price-tier]) .item-n'],
    ['the rail label', '.item-q', 'button.item-head:not([data-price-tier]) .item-q'],
    ['a tier-0 figure', '.item-head:not([data-price-tier]) .item-x', 'button.item-head:not([data-price-tier]) [data-role="price"]'],
    ['its unit', '.item-head:not([data-price-tier]) .item-a .item-u', 'button.item-head:not([data-price-tier]) .item-a .item-u'],
];
const MINI_PROPS = ['font-size', 'color', 'font-family', 'font-weight', 'letter-spacing', 'text-transform', 'text-shadow'];
type TextDress = Record<string, string>;
const shopDress = new Map<string, Map<string, TextDress>>();
const miniDress: { cls: string; label: string; parts: Map<string, TextDress> }[] = [];
const doorMiniClasses = new Set<string>();

function dressOf(node: Element): TextDress {
    const cs = getComputedStyle(node);
    return Object.fromEntries(MINI_PROPS.map((p) => [p, cs.getPropertyValue(p)]));
}

function gatherShopDress(look: Look): void {
    const root = document.getElementById('app')!;
    const parts = new Map<string, TextDress>();
    for (const [name, , sel] of MINI_PARTS) {
        const node = root.querySelector(sel);
        if (node !== null) parts.set(name, dressOf(node));
    }
    shopDress.set(look.theme.sheetClass, parts);
}

function gatherMiniDress(label: string): Failure[] {
    const out: Failure[] = [];
    const minis = document.querySelectorAll('#app .deck-stall');
    if (minis.length === 0) {
        out.push({ screen: 'door', theme: label, check: 'a-door-mini-paints-as-its-own-look', detail: 'the door painted no deck mini — the rule would compare nothing' });
    }
    for (const mini of minis) {
        const cls = [...mini.classList].find((c) => c.startsWith('t-'));
        if (cls === undefined) {
            out.push({ screen: 'door', theme: label, check: 'a-door-mini-paints-as-its-own-look', detail: `${describe(mini)} wears no look class` });
            continue;
        }
        const parts = new Map<string, TextDress>();
        for (const [name, sel] of MINI_PARTS) {
            const node = mini.querySelector(sel);
            if (node !== null) parts.set(name, dressOf(node));
        }
        miniDress.push({ cls, label, parts });
    }
    return out;
}

/** Every mini against its look's own shop, once the pass has painted both. */
function doorMiniFaults(): Failure[] {
    const out: Failure[] = [];
    for (const { cls, label, parts } of miniDress) {
        const shop = shopDress.get(cls);
        if (shop === undefined) {
            continue; // a look this pass measured no shop for (the kit's runs paint no door)
        }
        let compared = 0;
        for (const [name, mine] of parts) {
            const theirs = shop.get(name);
            if (theirs === undefined) continue;
            compared += 1;
            const off = MINI_PROPS.filter((p) => mine[p] !== theirs[p]).map((p) => `${p} ${mine[p]} where the shop paints ${theirs[p]}`);
            if (off.length > 0) {
                out.push({
                    screen: 'door',
                    theme: label,
                    check: 'a-door-mini-paints-as-its-own-look',
                    detail: `the ${cls} mini's ${name}: ${off.join('; ')} at ${window.innerWidth}px`,
                });
            }
        }
        if (compared === MINI_PARTS.length) {
            doorMiniClasses.add(cls);
        } else {
            out.push({
                screen: 'door',
                theme: label,
                check: 'a-door-mini-paints-as-its-own-look',
                detail: `the ${cls} mini compared ${compared} of ${MINI_PARTS.length} parts with its shop — a part is missing on one side`,
            });
        }
    }
    return out;
}

/*
 * **Nothing on the wall is cut from below** (2026-09-24, the owner's B). A
 * wall is a screen nobody scrolls: `.stall-scroll` is `overflow: hidden`, so
 * a control past the frame's foot is not below the fold, it is gone — and on
 * a touch wall a customer has five controls and no way to reach a sixth
 * pixel. Measured on the counter tablet (768x1024) with a payment standing:
 * Back showed 7 of its 72px on Modern worn, and less on Neo and Rural worn.
 * No rule saw it: every protected box is a money figure or a code, and the
 * cover check skips a point outside its clips as "reachable by scrolling".
 *
 * For every control on a wall screen (`button`, `a[href]`, `input`,
 * `select`) and every protected box on it (`PROTECTED`: the figures, the
 * codes, the payment's lines and total — a money figure a clip cuts is as
 * gone as a button), its box must stand whole — top, bottom and both sides — inside
 * every clip above it up to the wall's frame, and inside the viewport. One
 * allowance, and it is narrow (the critic, 2026-09-24): a control inside a
 * box that really scrolls on that axis (`overflow: auto | scroll` with
 * something to scroll) is reachable by scrolling it, so from there up it is
 * the part of that scroller the outer clips leave showing that is measured.
 * Where that part is shorter than the control — a scroller cut to a sliver,
 * so the control can never be brought whole into view — the case is
 * **printed, not failed** for the list's two steppers alone
 * (`window-step-*`, `SLIVER_ROLES`; `wallSlivers`, on the pass's
 * `compared:` line) — a list scrolled so a stepper is cut at its edge is
 * still a list a finger can scroll. Since round 3 no fixture prints one:
 * the tablet's list, which kept 0–167px of a 321–364px row beside a
 * payment, steps aside while a payment stands (`window.css`), and nothing
 * else on a wall scrolls a stepper that short. Any other control or box shown only in part inside a
 * scroller fails (the critic, 2026-09-24: it forgave every role, so Back in
 * a body planted to scroll read green). The two held lines (`WALL_HELD`)
 * get no scroller allowance at all: inside one is a failure, since being
 * outside the payment's scroller is what they are for. The controls and
 * boxes read are counted per pass and per role (`wallControlRoles`) **only
 * when read whole**
 * — a sliver is printed and never counted as read — and the runner requires
 * Back, Pay, Clear all, both steppers, the payment's "+N more" line and its
 * borrowed-token sentence (`WALL_HELD`) on the canvas, portrait and tablet
 * passes, where the touch wall is measured.
 */
const WALL_CUT_CHECK = 'nothing-on-the-wall-is-cut-from-below';
/** The roles a scroller may cut to a sliver: the list's own steppers, and nothing else. */
const SLIVER_ROLES = /^window-step-/;
/**
 * The payment's two lines outside the lines' scroller (2026-09-24): what
 * they say is what the scroller may hide, so they are held whole like a
 * control.
 */
const WALL_HELD = '[data-role="pay-lines-more"], [data-role="pay-borrowed"]';
let wallControlChecks = 0;
const wallControlRoles: Record<string, number> = {};
/** The same roles per look (8e2): a carried look owes every role on its own walls. */
const wallControlRolesByClass: Record<string, Record<string, number>> = {};
const wallSlivers = new Set<string>();

/*
 * **Nothing in the body reaches the status line** (step 5b, 2026-09-26, the
 * owner's (a)). The wall's grid gives the body a `minmax(0, 1fr)` row and
 * the status line the row under it, and the body does not clip: a Cycle
 * card taller than its row painted straight over the status line — 110px on
 * Rural with the Yard beetle at 1920x1080, where "Showing listings" and
 * "Updated …" stood under the card's edge — and no geometry rule saw it:
 * the status line is no protected box, the card is no decoration, and the
 * cut-from-below rule reads clips, which there were none of. Only the
 * contrast read of the status words, once it read them per line (D7),
 * found it. So on every wall screen: every element in `.stall-body` that no
 * ancestor inside the body clips must end above the status line's top
 * (within a device pixel) wherever the two share columns.
 * `statusLineChecks` counts the elements asked; the canvas, portrait and
 * tablet passes owe some (`probe-coverage.mjs`).
 */
const STATUS_LINE_CHECK = 'nothing-in-the-body-reaches-the-status-line';
let statusLineChecks = 0;

function statusLineFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    for (const status of document.querySelectorAll<HTMLElement>('#app .stall.shop-window .sw-status')) {
        const wall = status.closest('.stall-scroll');
        const body = wall?.querySelector<HTMLElement>(':scope > .stall-body');
        if (body === null || body === undefined) continue;
        const line = status.getBoundingClientRect();
        if (line.height === 0) continue;
        for (const el of body.querySelectorAll<HTMLElement>('*')) {
            let clipped = false;
            for (let at = el.parentElement; at !== null && at !== body; at = at.parentElement) {
                const cs = getComputedStyle(at);
                if (cs.overflowY !== 'visible' || cs.overflowX !== 'visible') {
                    clipped = true;
                    break;
                }
            }
            if (clipped) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            statusLineChecks += 1;
            if (r.bottom > line.top + 1 && r.right > line.left && r.left < line.right && r.top < line.bottom) {
                out.push({
                    screen,
                    theme: label,
                    check: STATUS_LINE_CHECK,
                    detail: `${describe(el)} ends at ${r.bottom.toFixed(1)}, ${(r.bottom - line.top).toFixed(1)}px over the status line (top ${line.top.toFixed(1)})`,
                });
                break;
            }
        }
    }
    return out;
}

type Span = { lo: number; hi: number };

function wallCuts(screen: string, label: string): Failure[] {
    const frame = document.querySelector<HTMLElement>('#app .stall.shop-window');
    if (frame === null) {
        return [];
    }
    const out: Failure[] = [];
    // Every control, and every protected box — the money and the code a
    // customer reads off the wall are as gone as a button when a clip cuts
    // them, and the cover check forgives a point outside its clips.
    for (const control of frame.querySelectorAll<HTMLElement>(`button, a[href], input, select, ${PROTECTED}, ${WALL_HELD}`)) {
        const own = control.getBoundingClientRect();
        if (own.width === 0 || own.height === 0) {
            continue;
        }
        const role = control.getAttribute('data-role') ?? describe(control);
        const held = control.matches(WALL_HELD);
        let sliver = false;
        // The two axes walk the same ancestors; each carries what must stand
        // whole there (the control, or the showing part of a scroller) and
        // how much of it the control needs.
        const axes = {
            y: { span: { lo: own.top, hi: own.bottom } as Span, need: own.height, via: '' },
            x: { span: { lo: own.left, hi: own.right } as Span, need: own.width, via: '' },
        };
        let fault: string | undefined;
        const clipTo = (axis: 'y' | 'x', by: string, edge: Span, scrolled: boolean): void => {
            const a = axes[axis];
            const shown = Math.max(0, Math.min(a.span.hi, edge.hi) - Math.max(a.span.lo, edge.lo));
            const whole = a.span.lo >= edge.lo - 1 && a.span.hi <= edge.hi + 1;
            const side = axis === 'y' ? 'from below or above' : 'sideways';
            if (!scrolled && !whole) {
                fault ??= `${describe(control)}${a.via} is cut ${side} by ${by}: ${Math.round(shown)} of its ${Math.round(a.need)}px show (${Math.round(a.span.lo)}–${Math.round(a.span.hi)} inside ${Math.round(edge.lo)}–${Math.round(edge.hi)})`;
                return;
            }
            if (scrolled && shown + 1 < a.need) {
                if (!SLIVER_ROLES.test(role)) {
                    fault ??= `${describe(control)}${a.via} can never be brought whole into view: the scroller shows ${Math.round(shown)} of its ${Math.round(a.need)}px ${side} (${Math.round(edge.lo)}–${Math.round(edge.hi)})`;
                    return;
                }
                sliver = true;
                wallSlivers.add(`${screen} ${label}: ${role} ${Math.round(shown)}/${Math.round(a.need)}px ${axis}`);
            }
            // Inside a scroller, only the part the clips leave is measured on.
            a.span = { lo: Math.max(a.span.lo, edge.lo), hi: Math.min(a.span.hi, edge.hi) };
        };
        let scrolledY = false;
        let scrolledX = false;
        for (let at = control.parentElement; at !== null && fault === undefined; at = at.parentElement) {
            const cs = getComputedStyle(at);
            const box = at.getBoundingClientRect();
            const scrollsY = (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && at.scrollHeight > at.clientHeight + 1;
            const scrollsX = (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && at.scrollWidth > at.clientWidth + 1;
            if (scrollsY && held) {
                // The two held lines exist to be read without scrolling: one
                // inside a scroller is the defect they were moved out to fix.
                fault ??= `${describe(control)} is inside ${describe(at)}, which scrolls — the line is held outside the payment's scroller so a customer reads it without scrolling`;
                break;
            }
            if (scrollsY && !scrolledY) {
                // Reachable inside this box by scrolling it: from here up the
                // scroller's own box is what must show, at the control's size.
                axes.y.span = { lo: box.top, hi: box.bottom };
                axes.y.via = ` (in ${describe(at)}, which scrolls)`;
                scrolledY = true;
            } else if (at === frame || cs.overflowY !== 'visible' || at.classList.contains('stall-scroll')) {
                clipTo('y', describe(at), { lo: box.top, hi: box.bottom }, scrolledY);
            }
            if (scrollsX && !scrolledX) {
                axes.x.span = { lo: box.left, hi: box.right };
                axes.x.via = ` (in ${describe(at)}, which scrolls)`;
                scrolledX = true;
            } else if (at === frame || cs.overflowX !== 'visible' || at.classList.contains('stall-scroll')) {
                clipTo('x', describe(at), { lo: box.left, hi: box.right }, scrolledX);
            }
            if (at === frame) {
                break;
            }
        }
        if (fault === undefined) {
            clipTo('y', 'the viewport', { lo: 0, hi: window.innerHeight }, scrolledY);
            clipTo('x', 'the viewport', { lo: 0, hi: window.innerWidth }, scrolledX);
        }
        if (fault !== undefined) {
            out.push({ screen, theme: label, check: WALL_CUT_CHECK, detail: `${fault} at ${window.innerWidth}x${window.innerHeight}` });
        } else if (!sliver) {
            // Read whole: the only read the runner's coverage counts.
            wallControlChecks += 1;
            wallControlRoles[role] = (wallControlRoles[role] ?? 0) + 1;
            const byLook = (wallControlRolesByClass[measuringClass] ??= {});
            byLook[role] = (byLook[role] ?? 0) + 1;
        }
    }
    return out;
}

/*
 * **A card figure stands inside its row** (2026-10-13; the 8g1 critic's
 * P2-3, the owner's D-2026-10-13-02). The item face's figure (the listing's
 * asked amount, the quote's figure), the face's "You pay" figure, the XEC a
 * pay sheet's wallet signs, each Pay several line's figure and the Pay
 * several total: every line box of the figure stands inside its row's content
 * box, or the total's own. It is stricter than `text-spills`, which tolerates
 * a box poking into its parent's padding — the first stage of what the
 * critic found, a figure 16px into an 18px pad at 390, before the panel
 * clipped it. The face and the pay sheets step their figure down a ladder
 * (`CARD_FIGURE_CEILINGS`, `cardFigureTier`) and, past its last ceiling,
 * break it after a comma; this is what holds that ladder true on every look
 * at every pass that paints one, the 360 pass (`narrow`) above all.
 *
 * **Tier 0 is read against its card's padding box** (round 2, the critic's
 * P2-3 and the window's call): figures of 14 characters or fewer keep their
 * design size by the owner's line, and at 360 the widest of them runs into
 * the card's padding where it is widest — 8.5px of the pay card's 14 on Neo
 * (every 14-character pay figure: tabular mono), 13.3px of the face's 18 for
 * `₩9,999,999,999` on Neo, 2.5px on Rural — cut by nothing. So on the three
 * places that line governs, the face's figure, "You pay" and a pay sheet's
 * figure (`TIER_0_IN_CARD`), tier 0 is held to stay inside its card's
 * padding box (`.card`, or the pay card `.pay-amt`), the way `text-spills`
 * reads a box; tiers 1–3, where the ladder makes a promise, keep the strict
 * read of the row's content box. A Pay several line and the total keep the
 * strict read at every length: a line carries a tier only from 18
 * characters (a line of 15–17 still sits beside its name and reads as
 * tier 0 here), and the total carries none. A hidden figure (a sheet with
 * no rate yet) has no line box and is not read. Counted per look and per
 * place and tier (`cardFigureByClass`, `face:3` for a face figure on the
 * ladder's last rung), so the runner owes every step a read.
 */
const CARD_FIGURE_CHECK = 'a-card-figure-stands-inside-its-row';
const cardFigureByClass: Record<string, Record<string, number>> = {};
/** Where a card figure stands: the place's name, its row, and the figure inside the row. */
const CARD_FIGURES: readonly (readonly [string, string, string])[] = [
    ['face', '.face-x', ':scope > [data-role="price"], :scope > [data-role="seller-price"]'],
    ['paid', '.row.big', ':scope > dd'],
    ['pay', '.pay-x', ':scope > [data-role="price"]'],
    ['line', '.pay-line', '.pay-line-x'],
    ['total', '[data-role="pay-total"]', ':scope'],
];
/** The places whose tier 0 is the owner's "14 characters or fewer, unchanged", read against the card's padding box. */
const TIER_0_IN_CARD: ReadonlySet<string> = new Set(['face', 'paid', 'pay']);

/*
 * **A card figure steps down on every look** (round 2, the critic's P2-4).
 * The static guard (`every-look-that-sizes-its-figure-sizes-every-price-tier`)
 * reads selectors, and seven legal look rules escaped it — a `font`
 * shorthand on `.face-x .x`, `.pay-q`, `.x`, `.face-x > span`,
 * `.pay-amt .pay-x span:first-child`, `[data-role='price']` and a `font`
 * shorthand on `.pay-x-n` — each out-ranking stall.css's floor and freezing
 * the figure at every step. So the painted size is held instead, whatever
 * selector set it: on a phone, for every look, **each variant on its own**
 * (bare, every decoration worn: round 3, the critic's P3-1 — merged into one
 * range per tier, a worn variant sizing the figure 18px at every tier read as
 * "grows from tier 0 to tier 1" against the bare 34), and each of the four
 * figures the ladder steps (`CARD_LADDER_FIGURES`), no tier paints larger
 * than the smallest size the tier before it painted, and the last tier is
 * smaller than tier 0 — **unless tier 0 is already at or under the floor's
 * own last step** (`CARD_LADDER_LAST_STEP` in `layout/cardLadder.ts`, held to
 * the sheet by `the-ladders-last-step-is-the-sheets-floor`: 18px for the face and the pay
 * figure, 15px for "You pay"), where a figure has no smaller step to take
 * and the fit rule alone judges it (round 3, the critic's P3-1: a look row
 * whose `paid` is 14px, every step `min(Npx, 14px)`, failed here with every
 * figure fitting). Read at the end of the page from the sizes every paint
 * collected (`cardLadderSizes`, the smallest and largest per look, variant,
 * figure and tier), so it needs the fixtures at every step, which the runner
 * owes; what it compared is reported per look and figure as the most tiers
 * one variant read (`cardLadderByClass`, `"0123"`: the ladder fixtures are
 * painted bare and fully worn), and a figure compared over fewer than all
 * four is a gap. Desk widths keep the design size and are not
 * read.
 */
const CARD_LADDER_CHECK = 'a-card-figure-steps-down-on-every-look';
/** The figures the ladder steps, as `place:role` (a "You pay" figure carries no role: `paid:figure`). */
const CARD_LADDER_FIGURES: ReadonlySet<string> = new Set(['face:price', 'face:seller-price', 'paid:figure', 'pay:price']);
type LadderTiers = Record<string, { min: number; max: number }>;
/** Per look class, per variant (the paint's label), per figure, per tier. */
const cardLadderSizes: Record<string, Record<string, Record<string, LadderTiers>>> = {};
const cardLadderByClass: Record<string, Record<string, string>> = {};

/*
 * **The stream card's money tiers are read, per rail** (the lint-belts
 * critic's fifth and sixth reviews, ranked item 1). A look may size the
 * stream's figure under `[data-tier='2']` (it is a value of
 * `STATE_ATTRIBUTES`), and the fixtures that painted a card painted tiers 1
 * and 3 only, so a rule under tier 2 was read by no pass.
 * `broadcast-from-123456` and `broadcast-from-1234567` paint the two lengths
 * between (`from 123,456` and `from 1,234,567`), which with the older cards
 * put tier 2 on every shipped look and tier 1 on Rural. **The quote card
 * wears the same ladder** under `[data-role='seller-price']`, a figure of
 * its own, and every quote fixture painted tier 0 (the sixth review):
 * `broadcast-quote-7`, `-9`, `-11` and `-13` paint an XEC quote of 7, 9, 11
 * and 13 characters, tiers 1, 2 and 3 on every look. The tier each price
 * row wore is counted per look and per rail (`streamTierByClass`: `listings`
 * for a row holding `price`, `quotes` for one holding `seller-price`; `"2"`
 * for a row on the ladder's second step, `"0"` for a row with none); the
 * runner owes the canvas pass the tiers in `STREAM_TIERS_OWED`, per rail, so
 * a fixture that stopped painting one, or a ceiling that moved it, fails the
 * run rather than leaving a rule under the tier unmeasured. Counting only:
 * the card's figure is held by every other rule of the canvas pass (the
 * dress, the spill, the cover and the self-clip).
 */
const streamTierByClass: Record<string, Record<string, Record<string, number>>> = {};
function streamTierRead(): void {
    const byLook = (streamTierByClass[measuringClass] ??= {});
    for (const row of document.querySelectorAll<HTMLElement>('#app .bc-item .bc-p')) {
        const rail = row.querySelector('[data-role="price"]') !== null ? 'listings' : row.querySelector('[data-role="seller-price"]') !== null ? 'quotes' : undefined;
        if (rail === undefined) continue;
        const byRail = (byLook[rail] ??= {});
        const tier = row.getAttribute('data-tier') ?? '0';
        byRail[tier] = (byRail[tier] ?? 0) + 1;
    }
}

function cardFigureFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    const byLook = (cardFigureByClass[measuringClass] ??= {});
    const phone = window.innerWidth < 680;
    for (const [place, rowSel, figSel] of CARD_FIGURES) {
        for (const row of document.querySelectorAll<HTMLElement>(`#app ${rowSel}`)) {
            if (row.closest('.deck-stall') !== null) continue;
            const figure = figSel === ':scope' ? row : row.querySelector<HTMLElement>(figSel);
            if (figure === null) continue;
            const range = document.createRange();
            range.selectNodeContents(figure);
            const lines = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
            if (lines.length === 0) continue;
            const tier = row.getAttribute('data-price-tier') ?? '0';
            // Tier 0 of the face, "You pay" and a pay figure against its card's
            // padding box; every other read against the row's content box.
            const card = tier === '0' && TIER_0_IN_CARD.has(place) ? row.closest<HTMLElement>('.card, .pay-amt') : null;
            const edge = card ?? row;
            const cs = getComputedStyle(edge);
            const box = edge.getBoundingClientRect();
            const inset = (side: 'Left' | 'Right'): number =>
                Number.parseFloat(cs.getPropertyValue(`border-${side.toLowerCase()}-width`)) +
                (card === null ? Number.parseFloat(cs.getPropertyValue(`padding-${side.toLowerCase()}`)) : 0);
            const left = box.left + inset('Left');
            const right = box.right - inset('Right');
            byLook[`${place}:${tier}`] = (byLook[`${place}:${tier}`] ?? 0) + 1;
            const ladder = `${place}:${figure.getAttribute('data-role') ?? 'figure'}`;
            if (phone && CARD_LADDER_FIGURES.has(ladder)) {
                const size = Number.parseFloat(getComputedStyle(figure).fontSize);
                const at = (((cardLadderSizes[measuringClass] ??= {})[label] ??= {})[ladder] ??= {});
                const was = at[tier];
                at[tier] = was === undefined ? { min: size, max: size } : { min: Math.min(was.min, size), max: Math.max(was.max, size) };
            }
            const over = Math.max(...lines.map((r) => r.right)) - right;
            const under = left - Math.min(...lines.map((r) => r.left));
            if (over > 0.5 || under > 0.5) {
                out.push({
                    screen,
                    theme: label,
                    check: CARD_FIGURE_CHECK,
                    detail:
                        `the ${place} figure "${(figure.textContent ?? '').slice(0, 40)}" (tier ${tier}, ${getComputedStyle(figure).fontSize}) ` +
                        `runs ${over > 0.5 ? `${over.toFixed(1)}px past its ${card === null ? "row's content" : "card's padding"} box on the right` : `${under.toFixed(1)}px past its ${card === null ? "row's content" : "card's padding"} box on the left`} ` +
                        `(${describe(edge)}, ${Math.round(left)}–${Math.round(right)})`,
                });
            }
        }
    }
    return out;
}

/** Every look's painted ladder, each variant on its own, read once at the end of the page (`a-card-figure-steps-down-on-every-look`). */
function cardLadderFaults(): Failure[] {
    const out: Failure[] = [];
    for (const [cls, variants] of Object.entries(cardLadderSizes)) {
        // The most tiers one variant compared, per figure: a state screen is
        // painted bare and fully worn only, so a single decoration's variant
        // paints tier 0 alone and compares nothing — the report is the
        // variant that compared the most, and every variant is compared on
        // its own.
        const compared: Record<string, string[]> = {};
        for (const [variant, figures] of Object.entries(variants)) {
            for (const [key, tiers] of Object.entries(figures)) {
                const painted = ['0', '1', '2', '3'].filter((t) => tiers[t] !== undefined);
                if (painted.length > (compared[key]?.length ?? 0)) compared[key] = painted;
                if (painted.length < 2) continue;
                const at = (t: string): { min: number; max: number } => tiers[t]!;
                const sizes = painted.map((t) => `tier ${t} ${at(t).min === at(t).max ? at(t).max : `${at(t).min}–${at(t).max}`}px`).join(', ');
                for (let i = 1; i < painted.length; i += 1) {
                    if (at(painted[i]!).max > at(painted[i - 1]!).min + 0.01) {
                        out.push({ screen: 'probe page', theme: variant, check: CARD_LADDER_CHECK, detail: `the ${key} figure grows from tier ${painted[i - 1]} to tier ${painted[i]} (${sizes})` });
                    }
                }
                const floor = CARD_LADDER_LAST_STEP[key] ?? 0;
                if (at(painted[0]!).min > floor + 0.01 && !(at(painted.at(-1)!).max < at(painted[0]!).min - 0.01)) {
                    out.push({ screen: 'probe page', theme: variant, check: CARD_LADDER_CHECK, detail: `the ${key} figure takes no smaller step on its ladder (${sizes})` });
                }
            }
        }
        for (const [key, tiers] of Object.entries(compared)) {
            (cardLadderByClass[cls] ??= {})[key] = tiers.join('');
        }
    }
    return out;
}

/*
 * **The Cycle card shows every digit at every wall size** (the critic's P1
 * on narrow-phone round 4, pre-existing). The wall's Cycle card printed one
 * figure size at every length, so on the counter tablet `123,456.78 XEC`
 * read "123,45" on Rural — a thousand times low to a reader who writes the
 * decimal with a comma — and at 1280x900 Neo's `.78 XEC` painted under the
 * code; no pass painted a Cycle figure longer than three characters at any
 * size but 1920x1080. The card's figure is fitted to its column after the
 * paint now (`fitWallFigures`, `src/ui/wallFit.ts`, which reads it the way
 * this rule does), stacked or broken after a comma where one line no longer
 * stands; this is what holds that true on every wall pass. For every Cycle
 * card's figure — the money node with its `from` and ` XEC` — and its price
 * cell (a look's tag chrome included):
 *
 * - every line and the cell stand inside the price's own grid column, so
 *   the figure is never past the card's grid and never under the code or
 *   the picture beside it;
 * - every line stands inside the card, the viewport and above the status
 *   line;
 * - no line crosses the code's box or the picture's (read on the line's
 *   middle three fifths: a content area runs a few pixels past its ink, and
 *   Neo's mono figure's runs 2px into the code's row at 1920x1080 with no
 *   ink there);
 * - a figure broken after its commas splits no group: each piece, and the
 *   last group with its unit (`.fig-end`), stands on one line.
 *
 * Read with the card's own turn and its tag's sway taken off for the read
 * (Rural tilts every third card half a degree and sways its tag 0.8°, so an
 * axis-aligned box of a 160px-tall tag is 2–4px wider than the tag; the
 * transforms are put back before the next rule reads the tree). Counted per
 * look and per length band (`cycleFigureByClass`, `wallFigureTier`): the
 * runner owes every band on every look on each wall pass.
 */
const CYCLE_FIGURE_CHECK = 'a-cycle-card-shows-every-digit-at-every-wall-size';
/*
 * **A Cycle figure never runs under its own unit** (the wall-offsize
 * critic's item 1, 2026-10-20). The fit's stacked shape (`from` on a line
 * above, ` XEC` beside the figure) gave the money node a
 * `minmax(0, max-content)` track and kept it on one line, so where the price
 * cell was narrower than the figure the track shrank under it and the
 * unwrapped digits ran on under ` XEC`: Neo's `from 1,234,567 XEC` at
 * 1280x900 printed "XEC" over its last "7", and the rule above, which reads
 * the cell and every line of the figure as one span inside the column, held
 * it green — the overlap was inside the column. Read here on its own terms,
 * apart from the fit's own check (`wallFit.ts`'s gauge holds the same
 * thing by its own code): every rect of the money node's text stands inside
 * the money node's own box along the line, and none meets a rect of the
 * figure's `from` or its unit (`.item-from`, `.item-u`) where the two
 * overlap along the line and their middle three fifths overlap across it
 * (a content area runs past its ink, and a `from` on the row above meets
 * the figure's content area with no ink there). Counted with the rule
 * above (`cycleFigureByClass`).
 */
const CYCLE_UNIT_CHECK = 'a-cycle-figure-never-runs-under-its-own-unit';
/** Per look class, per length band (`wallFigureTier`), how many Cycle figures were read. */
const cycleFigureByClass: Record<string, Record<string, number>> = {};

function cycleFigureFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    for (const card of document.querySelectorAll<HTMLElement>("#app .stall.shop-window[data-mode='cycle'] .sw-strip .item")) {
        const head = card.querySelector<HTMLElement>(':scope > .item-head');
        const cell = head?.querySelector<HTMLElement>(':scope > .item-p');
        const amount = cell?.querySelector<HTMLElement>(':scope > .item-a');
        const figure = amount?.querySelector<HTMLElement>('[data-role="price"], [data-role="seller-price"]');
        if (head === null || head === undefined || cell === null || cell === undefined || amount === null || amount === undefined || figure === null || figure === undefined) {
            continue;
        }
        // Held off and put back through the CSSOM (`withTransformsHeldOff`):
        // the policy refuses an inline `style` attribute, and the app writes
        // inline declarations on a card's boxes (`--sel-i` on a chosen line).
        withTransformsHeldOff([card, head, cell, amount, figure], () => {
            // The figure's length band (`wallFigureTier`): the fit sizes the
            // figure, the bands say which fixtures every pass owes.
            const tier = String(wallFigureTier(figure.textContent ?? '', amount.querySelector(':scope > .item-from') !== null));
            const byLook = (cycleFigureByClass[measuringClass] ??= {});
            byLook[tier] = (byLook[tier] ?? 0) + 1;
            const say = (detail: string): void => {
                out.push({
                    screen,
                    theme: label,
                    check: CYCLE_FIGURE_CHECK,
                    detail: `the Cycle figure "${(figure.textContent ?? '').slice(0, 40)}" (step ${tier}, ${getComputedStyle(figure).fontSize}) ${detail} at ${window.innerWidth}x${window.innerHeight}`,
                });
            };
            const range = document.createRange();
            range.selectNodeContents(amount);
            const lines = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
            const box = cell.getBoundingClientRect();
            // The price's grid column, from the head's resolved tracks.
            const hcs = getComputedStyle(head);
            const hb = head.getBoundingClientRect();
            const contentLeft = hb.left + Number.parseFloat(hcs.borderLeftWidth) + Number.parseFloat(hcs.paddingLeft);
            const gap = Number.parseFloat(hcs.columnGap) || 0;
            const tracks = hcs.gridTemplateColumns.split(/\s+/).map(Number.parseFloat).filter((w) => Number.isFinite(w));
            let column: { left: number; right: number } | undefined;
            for (let i = 0, at = contentLeft; i < tracks.length; at += tracks[i]! + gap, i += 1) {
                if (box.left >= at - 1 && box.left <= at + tracks[i]! + 1) {
                    column = { left: at, right: at + tracks[i]! };
                    break;
                }
            }
            if (column === undefined) {
                say(`stands in no grid column of its card (${hcs.gridTemplateColumns})`);
                return;
            }
            const left = Math.min(box.left, ...lines.map((r) => r.left));
            const right = Math.max(box.right, ...lines.map((r) => r.right));
            if (right > column.right + 0.5 || left < column.left - 0.5) {
                say(
                    `runs ${right > column.right + 0.5 ? `${(right - column.right).toFixed(1)}px past its column on the right` : `${(column.left - left).toFixed(1)}px past its column on the left`} ` +
                        `(column ${Math.round(column.left)}–${Math.round(column.right)}, the cell ${Math.round(box.left)}–${Math.round(box.right)})`,
                );
            }
            const cardBox = card.getBoundingClientRect();
            const status = card.closest('.stall-scroll')?.querySelector<HTMLElement>(':scope > .sw-status')?.getBoundingClientRect();
            for (const line of lines) {
                if (line.left < cardBox.left - 0.5 || line.right > cardBox.right + 0.5 || line.top < cardBox.top - 0.5 || line.bottom > cardBox.bottom + 0.5) {
                    say(`has a line outside its card (${Math.round(line.left)}–${Math.round(line.right)} × ${Math.round(line.top)}–${Math.round(line.bottom)})`);
                    break;
                }
                if (line.left < -0.5 || line.right > window.innerWidth + 0.5 || line.top < -0.5 || line.bottom > window.innerHeight + 0.5) {
                    say('has a line outside the viewport');
                    break;
                }
                if (status !== undefined && status.height > 0 && line.bottom > status.top + 0.5) {
                    say(`has a line ${(line.bottom - status.top).toFixed(1)}px over the status line`);
                    break;
                }
            }
            for (const [what, other] of [
                ['the code', card.querySelector<HTMLElement>('.sw-qr')],
                ['the picture', card.querySelector<HTMLElement>('.item-ic')],
            ] as const) {
                const o = other?.getBoundingClientRect();
                if (o === undefined || o.width === 0 || o.height === 0) continue;
                const crossed = lines.find((line) => {
                    const top = line.top + line.height * 0.2;
                    const bottom = line.bottom - line.height * 0.2;
                    return line.right > o.left + 0.5 && line.left < o.right - 0.5 && bottom > o.top && top < o.bottom;
                });
                if (crossed !== undefined) {
                    say(`has a line over ${what} (${Math.round(crossed.left)}–${Math.round(crossed.right)} × ${Math.round(crossed.top)}–${Math.round(crossed.bottom)})`);
                }
            }
            // The figure's own text, inside its own box and clear of its
            // `from` and its unit (`CYCLE_UNIT_CHECK`).
            const own = figure.getBoundingClientRect();
            const textOf = (node: Element): DOMRect[] => {
                const r = document.createRange();
                r.selectNodeContents(node);
                return [...r.getClientRects()].filter((q) => q.width > 0 && q.height > 0);
            };
            const ink = textOf(figure);
            const loose = ink.find((r) => r.left < own.left - 0.5 || r.right > own.right + 0.5);
            if (loose !== undefined) {
                out.push({
                    screen,
                    theme: label,
                    check: CYCLE_UNIT_CHECK,
                    detail:
                        `the Cycle figure "${(figure.textContent ?? '').slice(0, 40)}" (${getComputedStyle(figure).fontSize}) runs ` +
                        `${(loose.right > own.right + 0.5 ? loose.right - own.right : own.left - loose.left).toFixed(1)}px out of its own box ` +
                        `(text ${Math.round(loose.left)}–${Math.round(loose.right)}, box ${Math.round(own.left)}–${Math.round(own.right)}) at ${window.innerWidth}x${window.innerHeight}`,
                });
            }
            const middle = (r: DOMRect): [number, number] => [r.top + r.height * 0.2, r.bottom - r.height * 0.2];
            for (const [what, sel] of [
                ['its from', ':scope > .item-from'],
                ['its unit', ':scope > .item-u'],
            ] as const) {
                const other = amount.querySelector(sel);
                if (other === null) continue;
                const met = ink.flatMap((a) => textOf(other).map((b) => [a, b] as const)).find(([a, b]) => {
                    const [at, ab] = middle(a);
                    const [bt, bb] = middle(b);
                    return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(ab, bb) - Math.max(at, bt) > 0.5;
                });
                if (met !== undefined) {
                    out.push({
                        screen,
                        theme: label,
                        check: CYCLE_UNIT_CHECK,
                        detail:
                            `the Cycle figure "${(figure.textContent ?? '').slice(0, 40)}" (${getComputedStyle(figure).fontSize}) runs under ${what} "${other.textContent ?? ''}" ` +
                            `by ${(Math.min(met[0].right, met[1].right) - Math.max(met[0].left, met[1].left)).toFixed(1)}px at ${window.innerWidth}x${window.innerHeight}`,
                    });
                }
            }
            // A broken figure splits no group: every piece on one line.
            if (figure.querySelector('.fig-say') !== null) {
                const pieces: Node[] = [...figure.querySelectorAll('.fig-say > span[aria-hidden] > *')].filter((n) => n.nodeName !== 'WBR');
                for (const node of figure.querySelector('.fig-say > span[aria-hidden]')!.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE) pieces.push(node);
                }
                for (const piece of pieces) {
                    const r = document.createRange();
                    r.selectNodeContents(piece);
                    const tops = [...r.getClientRects()].filter((q) => q.width > 0).map((q) => q.top);
                    if (tops.length > 1 && Math.max(...tops) - Math.min(...tops) > 1) {
                        say(`splits the group "${piece.textContent}" over two lines`);
                    }
                }
            }
        });
    }
    return out;
}

/*
 * **A broken figure wears the figure's own ink** (D-2026-10-14-02, the
 * owner's "Theo khuyến nghị"; CRITIC-NARROW-PHONE round 4, P2-1). A money
 * figure broken after its commas (`moneyFigure`) is pieces: `.fig-say`, its
 * `aria-hidden` span, the comma groups between `<wbr>`s, and `.fig-end`.
 * `a-broken-figure-paints-every-digit` reads each piece whole — enough
 * pixels moved toward the figure's ink, the strongest at 3:1 — and cannot
 * see a piece partly hidden: a gradient mask over the face's last group, an
 * inset `clip-path` on the pay sheet's last group and negative
 * `letter-spacing` on the strip's last group each passed the whole runner.
 * So a look dresses a figure only as a whole.
 *
 * **An allow-list over every computed property** (round 2, the critic's
 * P2-1: a list of 47 properties let a background in the ink's colour, an
 * outline drawn inward, a strike in the ground's colour, `font-size-adjust`,
 * `zoom`, `word-break` and `display: contents` through). On every screen,
 * look and variant of every geometry pass, for every piece of every
 * `.fig-say` — the `.fig-say` itself and every element under it but a
 * `<wbr>`, which paints nothing — every longhand `getComputedStyle` yields
 * (custom properties aside: they paint nothing until a property reads them,
 * and that property is read) must equal what **an untouched piece** computes
 * in the same place (`untouchedStyle`): a `span` with an inline
 * `all: unset` (and `unicode-bidi: normal`, which `all` leaves) appended to
 * the piece's parent for the read and taken out again. It inherits what an
 * inherited property inherits, takes the initial value of every other, and
 * is blockified by a flex, grid or `-webkit-box` parent exactly as the piece
 * is. Each piece is read against its own parent, so a dress anywhere in the
 * chain fails where it is written. Every piece is read before any reference
 * joins the tree, so a structural selector (`:last-child`) reads them as
 * painted. The exceptions, each with its reason:
 *
 * - `FIGURE_INK_GEOMETRY`, on a piece a flex or grid parent blockified
 *   alone: `width`, `height`, `inline-size`, `block-size`,
 *   `transform-origin`, `perspective-origin` — `getComputedStyle` answers
 *   these from a block's own box, and the reference is an empty span (an
 *   inline piece computes them as the reference does, and is held to them);
 * - `box-sizing`: the base sheet gives every element of the stall
 *   `border-box` (`.stall *`), and `all: unset` takes it off the reference;
 * - `FIG_END_OWN`: on `.fig-end` alone, `text-wrap-mode: nowrap` (and the
 *   `white-space` it rolls up to) — the base sheet's one rule on it, the
 *   last group and the unit on one line (`moneyFigure`).
 *
 * Besides: no `::before` or `::after` that generates anything, and no
 * animation or transition of its own (the read is one instant, and a piece
 * that moves is dressed at every other one). The money node is the element
 * the figure is written into (`say.parentElement`), the ink the digit read
 * reads with. **A figure is skipped only when the money node itself is not
 * painted** (display `none` on it or an ancestor: a sheet with no rate
 * hides its figure's row) — never because its `.fig-say` has no box: a
 * `.fig-say` set to `display: none` or `contents` is read and fails on
 * `display` by name (the critic's merge condition). Not read here: the
 * money node's own dress, every property of it included — that is
 * `a-money-figure-is-never-misdressed`'s (D-2026-10-19-01). A look may not
 * name the pieces at all (`a-look-may-not-dress-a-figures-pieces` in the
 * look lint, the static belt); this is what holds every other selector that
 * reaches them — `.x span`, `:last-child`, an attribute — and every screen no
 * sheet was written for. Counted per look and per surface
 * (`figureInkByClass`, `figureSurface`): the runner owes each geometry pass
 * the surfaces it paints on every look it painted (`probe-coverage.mjs`).
 */
const FIGURE_INK_CHECK = 'a-broken-figure-wears-the-figures-own-ink';
/** Broken figures read, per look class and per surface. */
const figureInkByClass: Record<string, Record<string, number>> = {};
/** The properties `getComputedStyle` answers from a block's own box, which an empty reference cannot share (a blockified piece alone). */
const FIGURE_INK_GEOMETRY: ReadonlySet<string> = new Set([
    'width',
    'height',
    'inline-size',
    'block-size',
    'transform-origin',
    'perspective-origin',
]);
/** The base sheet's one rule on `.fig-end` (`white-space: nowrap`), as the longhands compute it. */
const FIG_END_OWN: Readonly<Record<string, string>> = { 'text-wrap-mode': 'nowrap', 'white-space': 'nowrap' };

/** Every longhand an element computes, custom properties aside, as strings: a snapshot, not the live declaration. */
function styleOf(el: Element): Map<string, string> {
    const cs = getComputedStyle(el);
    const out = new Map<string, string>();
    for (let i = 0; i < cs.length; i += 1) {
        const prop = cs.item(i);
        if (prop.startsWith('--')) continue;
        out.set(prop, cs.getPropertyValue(prop));
    }
    return out;
}

/** What an element no rule names computes under `parent`: a `span` with `all: unset`, appended for the read and taken out. */
function untouchedStyle(parent: Element): Map<string, string> {
    const ref = document.createElement('span');
    ref.style.setProperty('all', 'unset');
    ref.style.setProperty('unicode-bidi', 'normal');
    parent.append(ref);
    try {
        return styleOf(ref);
    } finally {
        ref.remove();
    }
}

/** Whether an element is painted: it, or the nearest ancestor with a box, displays and is not inside a `display: none`. */
function rendersAt(el: Element): boolean {
    let at: Element | null = el;
    while (at !== null && getComputedStyle(at).display === 'contents') at = at.parentElement;
    return at !== null && getComputedStyle(at).display !== 'none' && at.checkVisibility();
}

/** Where a broken figure stands, for the coverage the runner owes by surface. */
function figureSurface(figure: Element): string {
    if (figure.closest(".shop-window[data-mode='cycle']") !== null) return 'cycle';
    if (figure.closest('.shop-window') !== null) return 'wall';
    if (figure.matches('.row.big dd')) return 'paid';
    if (figure.closest('.face-x') !== null) return 'face';
    if (figure.closest('.pay-x') !== null) return 'pay';
    if (figure.matches('.pay-line-x')) return 'line';
    if (figure.matches('[data-role="pay-total"]')) return 'total';
    if (figure.matches('[data-role="selection-total"]')) return 'strip';
    if (figure.closest('.sel-sub') !== null) return 'chosen';
    if (figure.closest('.item-head') !== null) return 'row';
    return describe(figure);
}

function figureInkFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    for (const say of document.querySelectorAll<HTMLElement>('#app .fig-say')) {
        if (say.closest('.deck-stall') !== null) continue;
        const figure = say.parentElement;
        // Skipped only where the money node itself is not painted — never
        // because the `.fig-say` has no box, which is what a look hiding it
        // would give.
        if (figure === null || !rendersAt(figure)) continue;
        const surface = figureSurface(figure);
        const byLook = (figureInkByClass[measuringClass] ??= {});
        byLook[surface] = (byLook[surface] ?? 0) + 1;
        const pieces = [say, ...say.querySelectorAll<HTMLElement>('*')].filter((piece) => piece.nodeName !== 'WBR');
        // Every piece as painted, before any reference joins the tree.
        const painted = pieces.map((piece) => ({ piece, style: styleOf(piece) }));
        const untouched = new Map<Element, Map<string, string>>();
        for (const { piece } of painted) {
            const parent = piece.parentElement!;
            if (!untouched.has(parent)) untouched.set(parent, untouchedStyle(parent));
        }
        const faults: string[] = [];
        for (const { piece, style } of painted) {
            const want = untouched.get(piece.parentElement!)!;
            const name = piece === say ? '.fig-say' : piece.classList.contains('fig-end') ? '.fig-end' : describe(piece);
            const own = piece.classList.contains('fig-end') ? FIG_END_OWN : {};
            const block = style.get('display') !== 'inline';
            for (const [prop, value] of style) {
                if ((block && FIGURE_INK_GEOMETRY.has(prop)) || prop === 'box-sizing' || own[prop] === value) continue;
                const expected = want.get(prop) ?? '';
                if (value !== expected) {
                    faults.push(`${name} computes ${prop} ${value || '(nothing)'}, where an untouched piece computes ${expected || '(nothing)'}`);
                }
            }
            for (const pseudo of ['::before', '::after'] as const) {
                const content = getComputedStyle(piece, pseudo).content;
                if (content !== 'none' && content !== 'normal' && content !== '') {
                    faults.push(`${name}${pseudo} generates ${content.slice(0, 24)}`);
                }
            }
            // The read is one instant; a piece that moves on its own is
            // dressed at every other one.
            if (piece.getAnimations().length > 0) {
                faults.push(`${name} runs an animation or transition of its own`);
            }
        }
        if (faults.length > 0) {
            out.push({
                screen,
                theme: label,
                check: FIGURE_INK_CHECK,
                detail:
                    `the broken figure "${(say.getAttribute('aria-label') ?? '').slice(0, 40)}" in ${describe(figure)} (${surface}): ` +
                    `${faults.slice(0, 4).join('; ')}${faults.length > 4 ? `; and ${faults.length - 4} more` : ''} — a look dresses a figure only as a whole`,
            });
        }
    }
    return out;
}

/*
 * **A money figure never clips itself** (CRITIC-WALL-CYCLE, P2-1; folded
 * into D-2026-10-14-02's branch; widened in round 2, CRITIC-MONEY-GUARDS
 * P2-2). `cutSideways` walks a money node's ancestors sideways only, and
 * `cycleFigureFaults` reads layout rects, which a clip does not shorten:
 * Neo's Cycle figure planted `display: inline-block; max-width: 2.5em;
 * overflow: hidden` read "12, / 345." with the probe silent. Round 1 asked
 * three boxes (the node, `.item-a`, `.item-p`) whether they clipped content
 * larger than themselves, and left out the record hexes and `pay-lines`
 * whole because they scroll by design — which admitted `overflow: hidden`
 * on them too, and every other box: `.face-x` cutting a broken figure's
 * second line, Pay several's list clipped on the ordinary sheet, a record
 * hex cut to one line and a row head cut from below all passed.
 *
 * On every screen, look and variant of every geometry pass, every money node
 * painted (`MONEY_SET`, the hexes and `pay-lines` included, and Pay several's
 * line figures, `.pay-line-x`) is asked two things:
 *
 * - **no box cuts its text**: its own text — the line boxes of its range —
 *   is held, axis by axis, to the node and every ancestor up to the surface
 *   it stands on (`SELF_CLIP_SURFACE`: the card, row card, sheet or plate,
 *   inclusive; else the shell's scroll region, which is not asked). An
 *   `overflow` of `auto` or `scroll` on an axis is reachable as far as the
 *   box scrolls (`scrollReach`, before 8g2 item 3): text past its scroll
 *   origin or its range — a figure that end-aligns itself wider than its
 *   own scroller, the critic's T1c — fails, naming the box, whether the
 *   scroller is the node itself or a box above it; the text it scrolls to
 *   is held, above it, to that box's own edges. `hidden` or `clip`, or a
 *   `contain` that paints, is a cut: text
 *   more than a pixel past that box's padding box on that axis fails,
 *   naming the box; a box that cuts with rounded corners cuts along their
 *   inner curve (`roundedCut`, round 4: each radius less its borders, the
 *   ink's corners read against it; a corner shape under `superellipse(1)`
 *   is a corner this read cannot resolve, and fails). A box with no box of
 *   its own (inline, `contents`) clips nothing and is passed. A cut found
 *   inside a turned frame (Rural's tag sways) is read again with the
 *   chain's transforms held off (`withTransformsHeldOff`, through the
 *   CSSOM), as `cycleFigureFaults` reads the Cycle card;
 * - **its own width does not cut its text**: where the node's own text runs
 *   past its own box sideways, the text is held to `cutSideways` — every
 *   clipping ancestor and the viewport's side edge, past the surface too.
 *
 * Not read here: the money node's own `clip-path`, mask, opacity, filter,
 * transform, spacing or decoration, and a `clip-path` on any box above it —
 * `a-money-figure-is-never-misdressed`'s (D-2026-10-19-01); an `overflow`
 * cut above the surface from below (the wall's region is
 * `nothing-on-the-wall-is-cut-from-below`'s). The
 * ticker's moving ribbon is `cutSideways`' own exception. Counted per look
 * (`selfClipByClass`): the runner owes some on every look each geometry pass
 * painted (`probe-coverage.mjs`).
 */
const SELF_CLIP_CHECK = 'a-money-figure-never-clips-itself';
/** Money nodes asked, per look class. */
const selfClipByClass: Record<string, number> = {};
/** The money set and Pay several's line figures (which stand inside the money box `pay-lines`). */
const MONEY_FIGURES = `${MONEY}, .pay-line-x`;
/** Where a money node's own surface ends: its card, row card, sheet or plate. */
const SELF_CLIP_SURFACE = '.item, .card, .sheet, .zoom-card, .poster-page';
/** Where the walk stops without asking: the shell's scroll region and the stall. */
const SELF_CLIP_ABOVE = '.stall-scroll, .stall, #app';

/** The text of `node` cut by a box from it up to its surface, as a sentence, or undefined. */
/**
 * Why a box that clips with rounded corners cuts `node`'s ink, or
 * undefined (the re-review's P3): an `overflow` clip follows the inner
 * curve of the box's `border-radius` (each radius less its borders), so the
 * padding rectangle alone read a corner's cut as whole. A corner shape
 * that cuts inside the round curve (`superellipse()` under 1: `bevel`,
 * `scoop`, `notch`) is a corner this read cannot resolve, and fails; one at
 * or above it (`round`, `squircle`, `square`) is read as round, which errs
 * inward. The line boxes are read first, and the ink only where one of
 * them leaves the curve: a figure's digits stand inside its content area.
 */
function roundedCut(at: Element, cs: CSSStyleDeclaration, node: Element, where: string, lines: readonly DOMRect[]): string | undefined {
    const r = at.getBoundingClientRect();
    const outer: Radii = {
        tl: radiusOf(cs.borderTopLeftRadius, r.width, r.height),
        tr: radiusOf(cs.borderTopRightRadius, r.width, r.height),
        br: radiusOf(cs.borderBottomRightRadius, r.width, r.height),
        bl: radiusOf(cs.borderBottomLeftRadius, r.width, r.height),
    };
    if (![outer.tl, outer.tr, outer.br, outer.bl].some(([x, y]) => x > 0 && y > 0)) return undefined;
    for (const corner of ['top-left', 'top-right', 'bottom-right', 'bottom-left']) {
        // `superellipse(1)` is `round`, the default; a larger exponent
        // (`squircle`, `square`) bulges outside the round curve, so the round
        // curve is read for it and errs inward. One under 1 (`bevel`,
        // `scoop`, `notch`) cuts inside it: a corner this read cannot resolve.
        const shape = cs.getPropertyValue(`corner-${corner}-shape`).trim();
        const k = /^superellipse\((-?(?:[\d.]+|infinity))\)$/.exec(shape)?.[1];
        const exponent = k === undefined ? Number.NaN : k === 'infinity' ? Infinity : k === '-infinity' ? -Infinity : Number(k);
        if (shape !== '' && shape !== 'round' && !(exponent >= 1)) return `stands under a corner of ${where} shaped ${shape}, a corner this read cannot resolve`;
    }
    const bt = Number.parseFloat(cs.borderTopWidth) || 0;
    const br = Number.parseFloat(cs.borderRightWidth) || 0;
    const bb = Number.parseFloat(cs.borderBottomWidth) || 0;
    const bl = Number.parseFloat(cs.borderLeftWidth) || 0;
    const fitted = fittedRadii(outer, r.width, r.height);
    const inner: Radii = {
        tl: [Math.max(0, fitted.tl[0] - bl), Math.max(0, fitted.tl[1] - bt)],
        tr: [Math.max(0, fitted.tr[0] - br), Math.max(0, fitted.tr[1] - bt)],
        br: [Math.max(0, fitted.br[0] - br), Math.max(0, fitted.br[1] - bb)],
        bl: [Math.max(0, fitted.bl[0] - bl), Math.max(0, fitted.bl[1] - bb)],
    };
    const pad: Box = { left: r.left + bl, top: r.top + bt, right: r.right - br, bottom: r.bottom - bb };
    const corners = (l: Box): [number, number][] => [
        [l.left, l.top],
        [l.right, l.top],
        [l.right, l.bottom],
        [l.left, l.bottom],
    ];
    // The line boxes first: a figure's ink stands inside its content area,
    // so line boxes inside the curve hold ink inside it.
    if (lines.every((l) => corners(l).every(([x, y]) => insideRounded(pad, inner, x, y)))) return undefined;
    const cut = inkLines(node).find((l) =>
        [
            [l.left, l.top],
            [l.right, l.top],
            [l.right, l.bottom],
            [l.left, l.bottom],
        ].some(([x, y]) => !insideRounded(pad, inner, x!, y!)),
    );
    return cut === undefined
        ? undefined
        : `has its ink at ${Math.round(cut.left)}–${Math.round(cut.right)} × ${Math.round(cut.top)}–${Math.round(cut.bottom)} cut by the rounded corner of ${where} (border-radius ${cs.borderRadius})`;
}

function cutFromItsSurface(node: HTMLElement): string | undefined {
    const range = document.createRange();
    range.selectNodeContents(node);
    const lines = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (lines.length === 0) return undefined;
    let left = Math.min(...lines.map((r) => r.left));
    let right = Math.max(...lines.map((r) => r.right));
    let top = Math.min(...lines.map((r) => r.top));
    let bottom = Math.max(...lines.map((r) => r.bottom));
    for (let at: Element | null = node; at !== null && !at.matches(SELF_CLIP_ABOVE); at = at.parentElement) {
        const cs = getComputedStyle(at);
        if (cs.display !== 'inline' && cs.display !== 'contents' && cs.display !== 'none') {
            const r = at.getBoundingClientRect();
            const pad = {
                left: r.left + Number.parseFloat(cs.borderLeftWidth),
                right: r.right - Number.parseFloat(cs.borderRightWidth),
                top: r.top + Number.parseFloat(cs.borderTopWidth),
                bottom: r.bottom - Number.parseFloat(cs.borderBottomWidth),
            };
            const paints = /\b(?:paint|strict|content)\b/.test(cs.contain);
            const where = at === node ? 'itself' : describe(at);
            let reach: Reach | undefined;
            for (const [axis, mode] of [
                ['x', cs.overflowX],
                ['y', cs.overflowY],
            ] as const) {
                const scrolls = mode === 'auto' || mode === 'scroll';
                const cuts = mode === 'hidden' || mode === 'clip' || (paints && !scrolls);
                if (!scrolls && !cuts) continue;
                const [lo, hi, edgeLo, edgeHi] =
                    axis === 'x' ? [left, right, pad.left, pad.right] : [top, bottom, pad.top, pad.bottom];
                const past = Math.max(edgeLo - lo, hi - edgeHi);
                if (cuts && past > 1) {
                    return (
                        `has ${past.toFixed(1)}px of its text cut ${axis === 'x' ? 'sideways' : 'from above or below'} by ${where} ` +
                        `(overflow ${cs.overflowX} ${cs.overflowY}${paints ? `, contain ${cs.contain}` : ''}; ` +
                        `width ${cs.width}, max-width ${cs.maxWidth}, height ${cs.height}, max-height ${cs.maxHeight})`
                    );
                }
                // A scroller shows what it scrolls to, and nothing past its
                // scroll origin (`scrollReach`, before 8g2 item 3): text
                // there is cut as surely as by `hidden`, whether the
                // scroller is the node itself or a box above it.
                if (scrolls && past > 1) {
                    reach ??= scrollReach(at);
                    const [reachLo, reachHi] = axis === 'x' ? [reach.x0, reach.x1] : [reach.y0, reach.y1];
                    const unreached = Math.max(reachLo - lo, hi - reachHi);
                    if (unreached > 1) {
                        return (
                            `has ${unreached.toFixed(1)}px of its text out of reach ${axis === 'x' ? 'sideways' : 'above or below'} of ${where}, ` +
                            `which scrolls from ${Math.round(reachLo)} to ${Math.round(reachHi)} (overflow ${cs.overflowX} ${cs.overflowY}; ` +
                            `width ${cs.width}, max-width ${cs.maxWidth}, height ${cs.height}, max-height ${cs.maxHeight}): no scroll position shows it`
                        );
                    }
                }
                // Above this box the text is what this box shows, or scrolls to.
                if (axis === 'x') {
                    left = Math.max(left, edgeLo);
                    right = Math.min(right, edgeHi);
                } else {
                    top = Math.max(top, edgeLo);
                    bottom = Math.min(bottom, edgeHi);
                }
            }
            // A box that cuts follows the inner curve of its corners.
            const cutsAtAll = [cs.overflowX, cs.overflowY].some((m) => m === 'hidden' || m === 'clip') || (paints && ![cs.overflowX, cs.overflowY].some((m) => m === 'auto' || m === 'scroll'));
            if (cutsAtAll) {
                const rounded = roundedCut(at, cs, node, where, lines);
                if (rounded !== undefined) return rounded;
            }
        }
        if (at.matches(SELF_CLIP_SURFACE)) break;
    }
    return undefined;
}

/** Whether the self-clip read reads a money figure (`moneySelfClipFaults`, and at a keyframe offset `offsetDressFaults`): one painted, off the door's deck and out of a running ticker ribbon. */
function selfClipReads(node: HTMLElement): boolean {
    if (node.closest('.deck-stall') !== null || !rendersAt(node)) return false;
    const ribbon = node.closest('[data-ribbon]');
    return ribbon === null || ribbon.getAttribute('data-ribbon') === 'still';
}

/**
 * Why a money figure's own text is cut (`a-money-figure-never-clips-itself`),
 * sentence by sentence: by a box from it up to its surface
 * (`cutFromItsSurface`, read again with the turns held off in a turned
 * frame), and sideways past its own box (`cutSideways`). The one read the
 * rule makes at the pass's last instant, and the offset read makes at each
 * keyframe offset (`offsetDressFaults`).
 */
function selfClipSentences(node: HTMLElement): string[] {
    const out: string[] = [];
    let cut = cutFromItsSurface(node);
    if (cut !== undefined) {
        // A turned frame (Rural's swaying tag) reads its axis-aligned
        // bounds a few pixels wide: read again with the turns held off.
        const chain: HTMLElement[] = [];
        for (let at: HTMLElement | null = node; at !== null && !at.matches(SELF_CLIP_ABOVE); at = at.parentElement) {
            chain.push(at);
            if (at.matches(SELF_CLIP_SURFACE)) break;
        }
        const turned = chain.some((el) => {
            const cs = getComputedStyle(el);
            return cs.transform !== 'none' || cs.rotate !== 'none' || cs.scale !== 'none' || cs.translate !== 'none';
        });
        if (turned) {
            // Through the CSSOM (`withTransformsHeldOff`): the policy
            // refuses an inline `style` attribute.
            cut = withTransformsHeldOff(chain, () => cutFromItsSurface(node));
        }
    }
    if (cut !== undefined) out.push(cut);
    const range = document.createRange();
    range.selectNodeContents(node);
    const lines = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (lines.length === 0) return out;
    const own = node.getBoundingClientRect();
    const left = Math.min(...lines.map((r) => r.left));
    const right = Math.max(...lines.map((r) => r.right));
    if (getComputedStyle(node).display === 'inline' || (left >= own.left - 0.5 && right <= own.right + 0.5)) return out;
    const top = Math.min(...lines.map((r) => r.top));
    const bottom = Math.max(...lines.map((r) => r.bottom));
    const sideways = cutSideways(node, new DOMRect(left, top, right - left, bottom - top));
    if (sideways !== undefined) {
        const cs = getComputedStyle(node);
        out.push(
            `is narrower than its own text (its box ${Math.round(own.left)}–${Math.round(own.right)}, its text ` +
                `${Math.round(left)}–${Math.round(right)}; width ${cs.width}, max-width ${cs.maxWidth}), and its text ${sideways}`,
        );
    }
    return out;
}

/** The figures the self-clip read found cut at the pass's last instant, this paint (`moneySelfClipFaults`): the offset read does not say them again (`offsetDressFaults`). */
let selfClipCutNow = new Set<Element>();

function moneySelfClipFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    selfClipCutNow = new Set();
    for (const node of document.querySelectorAll<HTMLElement>(`#app :is(${MONEY_FIGURES})`)) {
        if (!selfClipReads(node)) continue;
        selfClipByClass[measuringClass] = (selfClipByClass[measuringClass] ?? 0) + 1;
        const said = selfClipSentences(node);
        if (said.length > 0) selfClipCutNow.add(node);
        for (const detail of said) {
            out.push({
                screen,
                theme: label,
                check: SELF_CLIP_CHECK,
                detail: `${describe(node)} "${(node.textContent ?? '').trim().slice(0, 32)}" ${detail} at ${window.innerWidth}x${window.innerHeight}`,
            });
        }
    }
    return out;
}

/*
 * **A money figure is never misdressed** (D-2026-10-19-01, the owner's "chọn
 * a"; CRITIC-MONEY-GUARDS P2-3 and its re-review of rounds 2 and 3).
 * `a-broken-figure-wears-the-figures-own-ink` holds a figure's pieces to the
 * figure, and every other money rule reads where the figure's box stands —
 * so a look that dressed the figure WHOLE could still misstate it with every
 * check green: `.item-x { clip-path: inset(0 0 0 55%) }` read "200 XEC" for
 * 1,200 XEC on every ordinary row, `letter-spacing: -0.45em` piled the
 * digits, and an opacity, a zoom, a `font-size-adjust`, a negative
 * `text-indent`, a ground in the ink's own colour — through a background, an
 * inset `box-shadow`, a `border-image` or a border the text ran onto — an ink
 * at 6% alpha, a `line-height` that piled a broken figure's lines, a break
 * inside a digit group, columns that reordered it, a fade on a box above
 * its card and a ring of sharp shadows each hid, shrank or garbled a figure
 * under every rule. A look dresses the figure as a whole, and that dress may
 * not misstate it.
 *
 * On every screen, look and variant of every geometry pass, the subjects are
 * every money node painted (`MONEY_SET`, Pay several's line figures
 * `.pay-line-x`, and the element every broken figure is written into,
 * `.fig-say`'s parent), the door's deck minis aside. Four reads:
 *
 * **1. Its own dress, an allow-list over every computed longhand, and the
 * grounds under it.** The subject and every element under it that holds
 * text (its words in a button's span; a `.fig-say` subtree is the ink
 * rule's) computes, longhand by longhand (custom properties aside), what
 * **an untouched element** computes outside the stall (`dressReference`: a
 * `span` with `all: unset` appended to the stall's own parent for the read)
 * — or the longhand is one a look may dress freely (`DRESS_FREE`, every
 * family with the reason it cannot misstate a figure, or the read that
 * holds what it does), or one held to a condition here (`DRESS_HELD`, read
 * on every subject whatever the reference says, since an inherited longhand
 * reaches it from any box above). The reference sits outside the stall on
 * purpose: an inherited longhand a look sets on a box above the figure
 * reaches the figure, and a reference inside the stall would inherit the
 * same dress and call it untouched. A free longhand may compute anything,
 * so it is not read (`dressReadList`); in this Chrome every longhand is free
 * or held but one, `text-fit`, which must equal the reference — and so must
 * every longhand a newer engine adds, until it is named. The conditions,
 * each with its reason, are `dressHeldFault`'s and the reads it names:
 * - no `clip-path`, `clip`, mask image or mask border on the figure — its
 *   own shape cuts its own digits (a box above it may clip, read 4.);
 * - no `filter`, `mix-blend-mode`, `background-blend-mode` (round 6, the
 *   critic's BL2: a blend of its background's layers paints a colour no
 *   layer is, which the composite below does not model), `-webkit-box-reflect`,
 *   motion path (`offset-path`), individual `rotate`/`scale`/`translate`, and no
 *   `transform` but none — save **a uniform scale of at least 1** with no
 *   turn, skew, flip or shift: the stream card's pulse (`bc-pulse` in
 *   broadcast.css) grows a figure that changed 6% for 0.4 s and never
 *   shrinks, turns or moves it; no `backdrop-filter` but a blur
 *   (`backdropFault`: any other function repaints the ground behind the
 *   glyphs from what is behind it, a ground no read here can know);
 * - `opacity` 1 and **an opaque ink**: `color` at alpha 1, so a faded ink
 *   is held like a faded box; `-webkit-text-fill-color` is `color` and a
 *   text stroke has no width at all, so their alphas are held with it;
 *   `visibility` and `content-visibility` visible, `zoom` 1, no
 *   `font-size-adjust`: a zoom of 0.15 or an adjust of 0.06 painted an 18px
 *   figure 9×4 px and 8×3 px while `font-size` still said 18px, the size
 *   the type floor reads (the critic's plants);
 * - no `content` but `normal` (an element's own text replaced); no
 *   `text-overflow` but `clip` and no `line-clamp` (an ellipsis printed in
 *   place of digits, or of a broken figure's later lines);
 * - no negative `word-spacing` or `text-indent`;
 * - **`letter-spacing` may take up the room between two glyphs and no
 *   more** (`spacingPiles`): for every two adjacent characters of its text
 *   (read in runs of one face and spacing, so a broken figure's groups are
 *   read across the comma where they meet), the spaces between them
 *   counted, a negative spacing may not make their inks share a pixel the
 *   face keeps apart — both glyphs drawn alone on a canvas in the text's
 *   computed face, at the spacing and at none, and the pixels both cover at
 *   least half counted (a pair whose ink boxes stay apart is not drawn; the
 *   counts are kept for the run, by face, spacing and pair). The owner's
 *   words were "no negative letter-spacing"; the theme table's price track
 *   is `-.02em` on the default row and Modern's and Rural's sheets set
 *   `-0.01em` on `.item-x`, so Modern, Rural, the skeleton and the tracked
 *   fixture tighten their figure today (Neo's row tracks it out, `.02em`).
 *   At `-0.02em` no pair of the ten figures, the comma and the point shares
 *   a pixel in Inter 800, Stall Serif 700 or JetBrains Mono 700 at 25–26px,
 *   nor in the first two at 120px; the first shared pixels come near
 *   `-0.08em` in Inter 800 at 120px ("71"), near `-0.05em` in Stall Serif
 *   700 at 120px ("34") and near `-0.15em` in JetBrains Mono 700 at 26px
 *   ("00"), measured 2026-10-19. What the rule reads is the piling, not the
 *   sign. The canvas draws proportional figures where the sheets set
 *   tabular ones (no canvas takes `font-variant-numeric`): in Inter the
 *   tabular 0 and 4 are 0.03em narrower than the proportional ones (64.6
 *   against 67.4 and 67.6 at 100px), so within about 0.03em of where two
 *   digits touch the canvas can read them apart where the screen sets them
 *   touching;
 * - the glyphs are painted in the figure's ink: no `-webkit-text-security`,
 *   no `background-clip: text`;
 * - **no ground under its glyphs that reads under 3:1 against its ink,
 *   with every paint under them composited** (`groundStackFault`, round 5;
 *   the pure half is `layout/groundStack.ts`): on the element itself, the
 *   background colour and every layer of its image over their clip area
 *   (`background-clip`, `border-area` its border's bands) — a gradient read
 *   where its tiles are proved to paint (`layerCovers`, each tile dimension
 *   resolved against the positioning area: on an axis that repeats, tiles of
 *   at least `MIN_TILE_PX` cover the whole clip area; on one that does not,
 *   one tile at least the area long, placed over it, covers the area's span —
 *   on a `scroll` layer alone: a `fixed` layer's area is the viewport only
 *   while no box above is transformed, and a `local` one's scrolls, so a
 *   lone tile of either proves nothing (round 8, the critic's FX); round 7,
 *   the critic's P1-2 and P2-2 on round 6) and tried absent as well
 *   as at each stop over the rest of its clip area (round 6, the critic's
 *   SZ) — every
 *   `box-shadow` layer (an inset one over the padding box outside its
 *   hole, an outer one outside the border box), every border side with a
 *   width (its colour over its band, whatever its style), and a
 *   `border-image` (over the padding box with `fill`, over its
 *   border bands and outset otherwise); **and on every box above it** up to
 *   and with the stall, the background colour, box shadows, borders and
 *   border image of each — until the nearest box with an opaque background
 *   colour, which hides every paint above it (read, then the walk stops; an
 *   element with an opaque background colour of its own stands on its own
 *   ground). Every stretch of its glyphs' ink, as painted (cut by every box
 *   in that walk that clips what it holds), is cut into cells by the
 *   paints' edges, and on each cell the paints that cover it are
 *   composited as plain stacking — source-over, in paint order; every
 *   blend that would compose them otherwise is held to `normal`, above —
 *   a gradient tried at each of its stops: a
 *   cell whose composite is at least `DRESS_GROUND_ALPHA` (half) opaque and
 *   reads under `MIN_CONTRAST` (3:1) against the ink fails, so five layers
 *   of the ink's colour at 0.49 fail together where round 4 passed each
 *   alone. **Every colour is resolved by the engine** (`dressColour`): a
 *   colour function, a keyword or a named colour, `currentcolor` the
 *   element's own `color`, read back in sRGB through `color-mix(in srgb,
 *   … 100%, transparent)` — so a ground in `color-mix(in oklch,
 *   currentColor 100%, transparent)`, which Chrome computes as `oklch(…)`,
 *   is the ink's colour and fails; a colour the engine refuses or a value
 *   this reader cannot take apart fails as "a colour this rule cannot
 *   read", never "no colour". A picture there (`url()`, `image-set()`) —
 *   the element's own background or border image, or a box above's border
 *   image — is a ground this rule cannot read, and fails.
 *   A shadow's blur is not added to where it paints: the blur's half-opaque
 *   line is the unblurred edge. A stack less than half opaque is mostly
 *   what lies below it: the contrast pass's;
 * - **no outline drawn across its glyphs**: its own outline's inner edge
 *   (the border box moved out by `outline-offset`, in by a negative one)
 *   stands outside every line's ink (`inkLines`), and the ring of a box
 *   above's outline (read 2.) meets none of it;
 * - **no line through or over it**: no `line-through` and no `overline` in
 *   effect on its text (`-webkit-text-decorations-in-effect`, which carries
 *   a line drawn from any box above) nor on a box above it up to the stall,
 *   and an underline there at the face's own thickness and position (`auto`
 *   or `from-font`, an offset of `auto` or at least zero); no
 *   `text-emphasis-style` (a mark printed over every digit);
 * - **no copy of it, and no smear** (`shadowFault`): a `text-shadow` layer
 *   blurred at least as far as it stands off is a glow; the sharp layers and
 *   the glyph itself stand within `DRESS_SHADOW_EM` (0.12em, under the
 *   thinnest stem of a served face's figure, 0.13em) of each other, two by
 *   two — the set's spread, not each layer's offset, so a ring of copies
 *   each 0.12em off does not fill the counters; the rain's outline (one
 *   opaque colour, unblurred, exactly one of the two sets) stands apart;
 * - read in order: `direction` ltr, no `bidi-override`, `writing-mode`
 *   `horizontal-tb`, and no `display` that prints a list marker;
 * - an animation it runs is read at every keyframe (`animationFaults`): each
 *   held longhand a keyframe sets is resolved and held to its condition, so
 *   a figure is not dressed at the instants the pass does not freeze; a
 *   transition is read the same way while one runs; **and its held dress is
 *   read again at every keyframe offset** of every animation on it, on an
 *   element under it with text, or on a box above it up to and with its
 *   stall (`offsetDressFaults`; the critic's third review, item 1, PT2:
 *   `--s-text: transparent` from 25% to 68% of a 100s loop on the quote
 *   row's `.item-a`, which names no held longhand and clears Rural's figure,
 *   whose ink is `var(--s-text)`, from 12.5% to 84%): each such animation
 *   seeked alone to each of its offsets, its timing set for the read to one
 *   normal linear iteration filled both ways and put back after, the figure
 *   held rendered, its own elements under the animated box on
 *   `OFFSET_HELD_OWN` (every held longhand but the reads that need the
 *   geometry, `OFFSET_GEOMETRY`) and the boxes between on `BOX_HELD` — save an
 *   animation whose keyframes set only longhands the declared read already
 *   holds or that reach no held longhand (`SEEK_NEEDLESS`, read from the
 *   `@keyframes` rule itself, where a custom property is listed and
 *   `getKeyframes()` lists none);
 * - it and every element under it with text generate no `::before` or
 *   `::after`: a generated glyph or block beside the digits is not the
 *   figure.
 *
 * **2. Its lines, a neighbour's shadow and an outline above** (in its own
 * frame, read 4.'s hold): **its text's lines** (`lineFault`, flow by flow —
 * a flow is the text set in one block, so a look's `display: flex` that
 * blockifies a figure's pieces makes flows of them, round 5; a text node set
 * over several lines is cut by line, each character given to the line whose
 * top is nearest its own, and two lines of one text node are two lines
 * however close a `line-height` piles them, round 6) stand in order
 * within each flow — line by line from the top, left to right along a line,
 * as the text runs, so columns or a reversed flow fail — with no line
 * break between two digits or a digit and a point (an address and a
 * record's bytes aside, which wrap anywhere by design), and two lines whose
 * glyphs share a pixel (drawn on a canvas where they stand) fail, so a
 * `line-height` cannot pile them; across flows, no two fragments of
 * different flows share a pixel, and a flow the text enters does not begin
 * above, or beside on the left of, the flow it leaves; **a sharp
 * `text-shadow` of a box beside it** (`neighbourShadowFault`: any element
 * with text of its own under its grandparent — its parent where the
 * grandparent is the stall — its unit, its "from") whose copy meets its ink
 * fails, painted over it where that element follows it, as a ground in its
 * ink's colour where it comes before; and **the outline of a box above
 * it** up to the stall
 * (`outlineAboveFault`) whose ring meets its ink fails.
 *
 * **3. Every box that holds it, up to and with the stall.** A paint effect
 * that is not inherited never reaches the figure's computed style, so it is
 * read where it is written: no box between the figure and its stall runs a
 * `filter`, a `backdrop-filter` but a blur, a `mix-blend-mode`, a
 * `background-blend-mode` (round 6; every box the ground walk reads is
 * among them), a
 * reflection, a motion path or a `zoom` but 1, an opacity under 1 (save the
 * stream card's stale plate, `.bc[data-state='stale'] .plate`, which says
 * its figure is old by fading it — the app's sentence, which no fixture
 * paints today), or a transform but a turn of at most `DRESS_TILT_DEG` (10°)
 * with any shift and no shrink, skew or flip (Rural's tag sways ±0.8° and
 * its rows tilt 0.6°; a screen hung sideways turns the whole stall a quarter
 * turn, `[data-turn]`, and the figure stands upright on the screen it is
 * painted for) — read at rest and at every keyframe of an animation it
 * runs, a keyframe that moves a `clip-path` included; and no mask in a
 * keyframe or at a keyframe offset (a mask at rest is 4.'s; the fifth
 * review's item 5, the critic's PMk, a gradient mask in a keyframe on Rural's
 * quote `.item-a`, was seeked and read clean before).
 *
 * **4. Every clip above it, up to the stall.** A box above the figure may
 * clip, mask or `clip-path` it for decoration — Rural's tag is a notched
 * pentagon on `.item-p` — only if its shape encloses the figure's ink
 * (`inkLines`, the sign rule's model: the glyphs' measured reach about the
 * baseline, the advance along the line), read in the box's own frame: every
 * transform from the figure up to the stall is held off for the read
 * (`withTransformsHeldOff`, once a measurement for every figure, put back
 * through the CSSOM), as `cycleFigureFaults` reads the Cycle card, so a
 * swaying tag is read in the frame its polygon is written in. A `clip-path`
 * `inset()` — with its `round` corners' curves (`insetRounded`) —
 * `circle()` or `ellipse()` is resolved, a `polygon()` in the reference box
 * it names (`polygonIn`) with every corner and edge of every ink box inside
 * it and no vertex inside an ink box (a notch cut into the figure), a
 * `clip: rect()` as a box; any other shape — `path()`, a box keyword, a
 * `url()` — and any mask fail: a shape this rule cannot read is not a shape
 * it passes. A `clip-path` above a box that scrolls fails too: the figure
 * moves under it and one reading at rest is not every scroll. `overflow` is
 * not read here (`a-money-figure-never-clips-itself`'s, which reads a
 * rounded box's corners along their curves since round 4).
 *
 * Not read, stated (round 6: the list says what the code reads, the
 * critic's corrections on round 5):
 * - a figure the app hides: a money node not rendered (`display: none` on
 *   it or above it, `content-visibility: hidden` above it) is skipped where
 *   the app hides it (`hiddenBy`: the `hidden` attribute, an inline style,
 *   or an app rule declaring the hiding value as written — a sheet with no
 *   rate, the address's two spans by width), as the ink rule skips it; it
 *   fails where a look takes it away — an animation on it or a box above
 *   it, up to the stall, naming `display` or `content-visibility` in its
 *   keyframes (`animatedAway`, before 8g2 item 4: the critic's T2c), or a
 *   look's rule that could set the hiding value, a `var()` included — or
 *   where nothing of the app's own explains it (`hiddenBy`, the window's
 *   item 5: the critic's PV, a look's `content-visibility: var(--h)` on the
 *   quote row's price column, read as the app's until then); an element
 *   under the subject that is not rendered;
 * - where the figure's box stands (`DRESS_FREE`'s placement: a figure moved
 *   is the coverage, spill and clip rules'), and a single line set so tight
 *   that the line above or below stands on its glyphs;
 * - within a flow, two cases (the critic's P3-1 and P3-2 on round 6, not
 *   planted, no fixture reaching either): fragments of different text nodes
 *   within 0.15em of one baseline are one line, and pixels are compared
 *   only between lines, so where one text node's fragment is a line of its
 *   own and another node's text is piled onto it within 0.15em, only their
 *   order is read; and a text node with a right-to-left run is cut into
 *   several rects on one line, so a later text node on that line can join
 *   the first rect's line and be read out of its order — and the order rule
 *   reads visual order, so a legitimate Hebrew or Arabic item name in Pay
 *   several's lines (`dl.pay-lines`) fails "drawn out of its order" (a false
 *   red, stated);
 * - across the flows of one node, all but two things: a flow is one
 *   element's text wherever the layout puts its pieces — the anonymous boxes
 *   a grid or a flex container makes of an element's own text runs are one
 *   flow — and where the text enters a flow for the first time, that flow's
 *   first fragment may stand neither wholly above the first fragment of the
 *   flow it leaves nor wholly to its left on a line that overlaps it; text
 *   that comes back to a flow it already began is read in that flow's order
 *   alone. So a grid on Pay several's total that sets " in total" beside the
 *   figure's second line (the critic's OR: "= 368,934,881,474, / in total
 *   191,032.30 XEC") reads in order, and so does a flow that begins beside
 *   another but lower; a break inside a digit group between two flows (a
 *   group split between two boxes is read within the flow that holds it);
 *   and the character `hyphenate-character` prints where `hyphens` breaks a
 *   word of a figure's words (a break inside a digit group, which no
 *   dictionary hyphenates, fails as a break);
 * - a box above's background image — its gradients and pictures, where a
 *   box paints its decoration (the rain's tiles, the aurora's washes, Neo's
 *   brackets): what it paints under a figure is the contrast pass's, and
 *   only on the screens it samples (390, 1280 and 1920 wide, less the
 *   geometry-only screens) — a look can scope such a paint to a state the
 *   look rules let it read (`data-paying`, `data-touch`, `data-turn`) or to
 *   a screen the contrast pass does not sample, and no rule reads it there
 *   (the critic's P2-1, round 4);
 * - what lies above the nearest box with an opaque background colour: the
 *   walk stops at that box whether or not its colour is under the glyphs —
 *   its `background-clip`, its rounded corners, ink that runs past it — and
 *   whether or not it paints at all: a box whose `visibility` is not
 *   `visible` paints no colour, and one whose `display` is `contents` has no
 *   box, yet each ends the walk as an opaque ground (the critic's V and DC,
 *   round 5), and what lies under it is not read (P2-1);
 * - a paint a box outside the walk lays under or over the glyphs: a
 *   sibling's background or shadow run under them; a box laid over them by
 *   an absolute or fixed position, or a decoration, is the box sweep's (the
 *   coverage rules'), but a box moved over the figure by a relative offset,
 *   a transform or a negative margin, or a target's own glyph scaled over
 *   it, is read by no geometry rule — whatever its `pointer-events` over
 *   every money node but the price and "You pay" (and the unbuyable label),
 *   the only nodes `coveredBy`'s hit test is asked about, and over those two
 *   with `pointer-events: none` (the critic's PC2 and PC3′) — and by the
 *   contrast pass only as the figure's ground — a cover whose own ground
 *   contrasts with the figure's ink passes (the critic's PC2, the no-escrow
 *   note moved over the pay sheet's figure), a contrast target's glyphs over
 *   another target's money are blank in both captures, since the pass blanks
 *   every target's glyphs at once (SVs), and a look pseudo moved over a
 *   figure on a screen the pass does not sample is read by nothing (PW; the
 *   critic's P2-1 on round 7, older than the branch, for the step before
 *   8g2); an in-flow `::before` or `::after` of any element (a look's is
 *   the contrast pass's look-pseudo frames', which read its paint — its
 *   glyphs whatever their colour since round 7, its ground and its border —
 *   inside a protected box, on the screens it samples, at the frozen
 *   instant: one a look animates invisible at that instant, 400ms, is not
 *   read, the critic's PSa2; one the app's own sheets generate is chrome),
 *   a blend such a box composes with what lies under it, and what a
 *   `backdrop-filter` blur on the figure or a box above spreads from beside
 *   the box under it;
 * - a paint's geometry beyond its rect: the paints are composited as plain
 *   stacking (source-over, in paint order — every blend from the figure up
 *   to the stall is held to `normal`, and `isolation`, which only keeps
 *   blends in, is free); an own gradient layer is read over the part of its
 *   clip area its tiles are proved to cover, and tried absent and at each
 *   stop over the rest of it, not where each tile falls (a tile under
 *   `MIN_TILE_PX` on an axis proves nothing there, a lone tile only where it
 *   spans its whole positioning area, on a `scroll` layer; round 7, and
 *   round 8 for `fixed`); the positioning area is the element's bounding
 *   box, which for an inline split over lines or a block split over columns
 *   is not the box Chrome places a tile in (it lays the fragments end to
 *   end), so a lone tile over such a box can leave a fragment bare and be
 *   read as covering it — no money glyph owner a look can tile wraps so but
 *   a broken figure's pieces, whose every longhand
 *   `a-broken-figure-wears-the-figures-own-ink` holds (the critic's P3-1 on
 *   round 7); a
 *   `dashed`, `dotted` or `double` border paints its band in part and is
 *   read as its colour over the whole band; a 3D border — `inset`,
 *   `outset`, `groove`, `ridge` — paints two other shades of its colour
 *   (Chrome paints `inset #dddddd` `rgb(137, 137, 137)` on its top and left
 *   and white on its bottom and right; the critic's P3-2) and is read as its
 *   colour; a paint's rounded corners (a paint is read over its whole rect);
 *   the glyphs as pixels (a cell is judged where the line's ink box stands,
 *   between glyphs too);
 * - a gradient between its stops: each stop is tried, not the colours a
 *   gradient paints between two of them (nor an `in <space>`
 *   interpolation's), so a ramp whose every stop reads can paint the ink's
 *   own colour between them — the critic's G2, white and black 1px apart
 *   under a `#767676` ink, paints a mid grey and "You pay" at 1.13–1.32:1
 *   (literal stops, and stops written from `currentColor`). The
 *   contrast pass reads it, whether its stops are literals or written from
 *   `currentColor` (round 6), on the screens it samples alone (390, 1280 and
 *   1920 wide, the geometry-only screens aside, at a device pixel ratio of
 *   1); no rule reads it on the tall wall, the tablet, the short walls, the
 *   narrow phone or a screen the pass does not sample;
 * - the ink's alpha in the contrast box read (`scripts/layout-check.mjs`
 *   reads a computed ink's red, green and blue alone): on a money subject
 *   this rule refuses an ink under alpha 1 first; every other target reads
 *   as before; and what the contrast pass blanks with the glyphs (round 6,
 *   `blankGlyphs`): an SVG element's fill, stroke, gradient stop, flood and
 *   light whose colour is its `color` (its `color` kept, round 7), and a
 *   decoration line, an emphasis mark or a text stroke whose colour is the
 *   element's `color` — so one a look writes in the ink's colour by name is
 *   blanked too, and not read as ground;
 * - a shrink by a font feature (`font-variant-position`, `sups`, `dnom`),
 *   which keeps the computed size the type floor reads — none shrank a
 *   digit in the served subsets (the critic's A3, D5); the glyphs a look's
 *   own face draws (intake's);
 * - a stack of glows (each blurred as far as it stands off); a neighbour's
 *   shadow from farther than the figure's grandparent — a sharp shadow of a
 *   line elsewhere on the sheet, moved hundreds of pixels onto the figure,
 *   erases "You pay" with every pass green (the critic's P2-3, round 4) — a
 *   neighbour's glow, or the rain's outline on a neighbour;
 * - a state no pass paints: `:hover`, `:focus`, `:focus-visible`,
 *   `:focus-within` and `:active`, a transition until it runs, and the tap
 *   highlight (`-webkit-tap-highlight-color`, a colour painted over a
 *   control on a tap; the critic's P3-5, not measured). **The first-party
 *   look lint refuses what a state would hide, as an allow-list**
 *   (`a-look-state-rule-sets-only-what-a-state-may`, D-2026-10-20-08 and
 *   -10 and -11, `scripts/workshop-css.mjs`): a rule whose selector names a
 *   state — **any pseudo-class but sixteen structural ones, so `:placeholder-shown`
 *   and `:checked` and a name the lint has never met (`:--open` among them),
 *   and `[open]`, `[hidden]`, `[data-turn]`, `[data-state]`, `[aria-disabled]`
 *   and `[data-over]`, and `data-format` and `data-code` except for the one
 *   value some screen paints (`data-format='tag'`; `STATE_EXCEPT_PAINTED`)**
 *   — sets colour, ground, border and outline colour (colour
 *   only: no style, no width, no offset, no shorthand), a shadow of at most two
 *   outer layers and 16px of blur, a keyword cursor, transitions and the
 *   no-transform values, and nothing else, and the tap highlight is
 *   `transparent` only. The longhands of `DRESS_HELD` below that a state may
 *   set are read by their own readers; the others are refused by name
 *   (`the-state-belt-reads-every-longhand-the-probe-holds-or-refuses-it`
 *   parses the set out of this file, strictly). **The kit lint carries none
 *   of it** (the workshop README says a pointer's hover is Stall's at intake,
 *   not the kit's): a kit look's `:hover` is read by a person, and
 *   `-webkit-tap-highlight-color: red; tap-highlight-color: red` passes the
 *   kit's twin rule. A pseudo-element under a state may set only a cursor,
 *   transitions and the identity transforms (no colour), because a
 *   pseudo-element is measured only by its paint at rest, and at rest a
 *   first-party pseudo-element takes its paint from neither its host nor the
 *   cascade (a colour for each family and side, no `revert`, `revert-layer`
 *   or `all`, masks read, a `var()` only as a palette role where it stands as a
 *   colour or as a mask's picture, never where it is a length). At rest, in
 *   a media block and in a keyframe, an outer shadow, a text shadow, a drop
 *   shadow, an outline, a column rule and a border image name their own
 *   colour, and an outline is at most 4px wide and sits from -8px to 4px, per
 *   declaration (the fourth review's B2 and ranked item 1), so a colour under
 *   a state cannot reveal a ring or a shadow written in `currentColor`. The
 *   fifth review's B1–B3 and colour scheme add, in a first-party sheet: an
 *   underline sits within 4px of its line and is at most 3px thick, a stroke
 *   is at most 3 wide, and `d` is not written (an underline and a stroke are
 *   drawn in the ink of their box and reach past it); no custom property
 *   holds `currentColor` or `inherit` (a `var()` is substituted as tokens, so
 *   it can bring the ink into a stop, a layer or a value wherever it stands);
 *   a rule's `animation` names `none` or a keyframe its own sheet declares,
 *   never through a `var()` (a base sheet's keyframes are global); and
 *   `light-dark()` is not written and `color-scheme` is `normal` or `light`
 *   (this pass paints one scheme). Still unread under a state, in the
 *   first-party lint too: an ink's or a ground's contrast against what it
 *   stands on; the small ring the cap leaves (this pass reads an outline
 *   across the glyphs of its own box and of the boxes above a figure, never
 *   one on a box beside it); a colour a state gives an element (not a
 *   pseudo-element) that a rule at rest moved over a figure with an offset, a
 *   negative margin or a transform and left clear; **an element that grows**
 *   (its `width`, `height`, `zoom` or `scale`), which multiplies what a capped
 *   ring, offset or stroke reaches, an outline's 4px in the box's own pixels
 *   included; a blur's radius (`filter: blur()`, not capped), and
 *   `filter: url()`, an SVG filter whose primitives the lint does not open;
 * - a moving dress between two keyframe offsets (`offsetDressFaults`): a
 *   timing function that overshoots (`cubic-bezier()` with a y outside
 *   0–1, a `linear()` with points outside them) can carry a value past both
 *   its keyframes; two animations at once (each is seeked with the others
 *   where the pass's last instant left them); at an offset, the grounds
 *   under the glyphs, the lines, the spacing and an outline's ring (read at
 *   that instant alone); and an animation on a pseudo-element, which
 *   nothing inherits from (the cover rules' — 1a reads the end of one that
 *   keeps its end, `coverAtEnd`);
 * - a box above the stall (`#app`, the body): a look's sheet is scoped
 *   under its class, which stands on the stall; on a screen hung sideways
 *   a quarter turn of the stall either way passes, and no pass paints a
 *   turned wall (`[data-turn]`), so a rule a look scopes to one is read by
 *   no pass (P2-2) — the first-party look lint refuses what such a rule
 *   hides, as above.
 *
 * Counted per look and per surface (`dressByClass`, `dressSurface`), and the
 * figures read under a box's `clip-path` or clip per look
 * (`dressClipByClass`): the runner owes a read on every surface each
 * geometry pass paints, on every look it painted, and, on a pass that
 * painted Rural, a figure read under its tag's clip-path
 * (`probe-coverage.mjs`).
 */
const DRESS_CHECK = 'a-money-figure-is-never-misdressed';
/** Money subjects read, per look class and per surface (`dressSurface`). */
const dressByClass: Record<string, Record<string, number>> = {};
/** The money nodes whose text is no figure: an address and a record's bytes wrap anywhere by design. */
const NOT_FIGURE_TEXT = '.addr-short, .addr-full, [data-role="publish-hex"], [data-role="describe-hex"]';

/**
 * Where a money subject stands, for the coverage the runner owes by surface
 * (the re-review's P3, round 1's P3-3 again: one read a look let a surface
 * stop being read and stay green): the stream's card and ticker, the wall's
 * Cycle card, its payment plate and its rows, a printed tag, a sheet, the
 * sign, the selection strip, an item face, a shop row (its foot included),
 * an Activity receipt, the door's open control, the Studio, and any other
 * card (the first stall's).
 */
function dressSurface(node: Element): string {
    if (node.closest('.broadcast') !== null) return node.closest('.tk') !== null ? 'ticker' : 'stream';
    if (node.closest(".shop-window[data-mode='cycle']") !== null) return 'cycle';
    if (node.closest('.shop-window') !== null) return node.closest('.sw-paying') !== null ? 'plate' : 'wall';
    if (node.closest('.poster-page') !== null) return 'tag';
    if (node.closest('.sheet') !== null) return 'sheet';
    if (node.closest('.stall-head') !== null) return 'sign';
    if (node.closest('.sel-strip') !== null) return 'strip';
    if (node.closest('.item-face, .face-x') !== null) return 'face';
    if (node.closest('.item-head, .item') !== null) return 'row';
    if (node.matches('[data-role="receipt-amount"]')) return 'activity';
    if (node.closest('.door-unit') !== null) return 'door';
    if (node.closest('.studio') !== null) return 'studio';
    return 'card';
}
/** Money subjects read under a box's `clip-path` or `clip`, per look class. */
const dressClipByClass: Record<string, number> = {};
/** The largest turn a box holding a figure may take: a tilt, not a turn (Rural's tag sways ±0.8°, its rows tilt 0.6°). */
const DRESS_TILT_DEG = 10;
/**
 * How far apart the sharp copies of a figure's glyphs may stand — every
 * sharp `text-shadow` layer and the glyph itself, two by two — as a share of
 * the text's size: under a digit's stem, so every copy overlaps the stroke
 * it copies and the set reads as depth (the thinnest stem of a served face's
 * figure "1" measured 0.13em, JetBrains Mono 700; Inter 800 0.16em, Stall
 * Serif 700 0.15em, at 100px on a canvas, 2026-10-19). The set's spread,
 * not each layer's offset (the re-review's P2-3: eight layers each 0.12em
 * off, in a ring, filled the 6's counter). The rain's outline — one opaque
 * colour, unblurred, exactly one of the two sets (`outlineSet`) — is the
 * ground's own and stands apart from this read.
 */
const DRESS_SHADOW_EM = 0.12;
/** A ground at least this opaque is read against the ink; a fainter tint is the contrast pass's. */
const DRESS_GROUND_ALPHA = 0.5;
/** The legibility floor (`MIN_CONTRAST` in src/domain/theme.ts). */
const DRESS_GROUND_CONTRAST = MIN_CONTRAST;

/*
 * The longhands a look may dress freely, as families, each with why it
 * cannot misstate a figure. Read only after `DRESS_HELD`: a held longhand
 * that a family's pattern also matches (`-webkit-box-reflect`, `display`,
 * `background-color`) is held.
 */
const DRESS_FREE: readonly (readonly [RegExp, string])[] = [
    [
        /^(margin|padding|scroll-margin|scroll-padding)(-.*)?$/,
        'the room around the box: where the figure stands is the coverage rules\'',
    ],
    [
        /^border(-.*)?$/,
        'the box\'s edge, painted in the border area: where text runs onto it, its colour is read as a ground under the glyphs (`groundStackFault`)',
    ],
    [
        /^((min|max)-)?(width|height|inline-size|block-size)$|^aspect-ratio$|^box-sizing$/,
        'the box\'s size: what it cuts is `a-money-figure-never-clips-itself`\'s',
    ],
    [
        /^(position|top|right|bottom|left|inset(-.*)?|float|clear|z-index|order|flex(-.*)?|grid(-.*)?|align-.*|justify-.*|place-.*|(row-|column-)?gap|vertical-align|overflow(-.*)?|overscroll-behavior(-.*)?|scrollbar-.*|scroll-behavior|scroll-snap-.*|scroll-initial-target|contain(-intrinsic-.*)?|container(-.*)?|isolation|columns|column-(count|fill|span|width|rule-style|rule-width)|break-.*|box-decoration-break|table-layout|anchor-.*|position-.*|field-sizing|resize|-webkit-box-(align|decoration-break|direction|flex|flex-group|lines|ordinal-group|orient|pack)|reading-.*)$/,
        'where the box stands and how it lays out its content: a figure moved is the coverage, spill and clip rules\'',
    ],
    [
        /^(font(-(?!size-adjust$).*)?|line-height|text-transform|text-align(-last)?|text-justify|white-space(-collapse)?|text-wrap(-.*)?|word-break|overflow-wrap|line-break|hyphens|hyphenate-.*|tab-size|text-rendering|-webkit-font-smoothing|text-size-adjust|-webkit-text-size-adjust|text-spacing-trim|text-autospace|hanging-punctuation|-webkit-locale|quotes|initial-letter|text-box(-.*)?|dominant-baseline|baseline-.*|alignment-baseline|ruby-.*|text-combine-upright|text-orientation|-webkit-rtl-ordering|-webkit-line-break|math-.*|word-wrap)$/,
        'the face, size, weight and setting of the text: the same digits in another face (a served face is held to its glyphs statically; a look\'s own face draws what its glyphs draw, which intake reviews); the size has its floor (`small-text-is-at-least-11px`); where the lines of a figure fall — its line height, where it breaks — is read by what it does (`lineFault`: lines apart, in order, no break inside a digit group); an orientation means nothing across a line',
    ],
    [
        /-color$|^accent-color$|^color-scheme$|^forced-color-adjust$|^print-color-adjust$|^-webkit-print-color-adjust$/,
        'a colour: whether the ink reads on its ground is the contrast pass\'s (a ground in the ink\'s own colour is held below)',
    ],
    [
        /^(box-shadow|background-(position|position-x|position-y|size|repeat|attachment|origin)|border-image(-.*)?|mask-(clip|composite|mode|origin|position|repeat|size|type|border-(mode|outset|repeat|slice|width))|-webkit-mask-(clip|composite|origin|position|position-x|position-y|repeat|size|box-image-(outset|repeat|slice|width))|paint-order|shape-.*|image-rendering|image-orientation|object-.*|text-decoration-(color|skip-ink|style|skip.*)|text-underline-position|text-emphasis-(color|position))$/,
        'paints beside, under or behind the glyphs and never over them — and every paint under them (a box shadow, a border image, the background\'s layers, where their tiles fall: `layerCovers` resolves each tile against its positioning area and reads the repeat, the position and the attachment, and where a layer is not proved to cover it is read as absent too) is read as a ground (`groundStackFault`) — or nothing at all without a held longhand (a mask image, a decoration line, an emphasis mark, a text stroke)',
    ],
    [
        /^(cursor|pointer-events|user-select|-webkit-user-select|touch-action|appearance|-webkit-appearance|caret-.*|will-change|-webkit-user-drag|-webkit-user-modify|interactivity|interpolate-size|scroll-timeline(-.*)?|view-timeline(-.*)?|timeline-scope|view-transition-.*|-webkit-highlight|speak(-as)?|dynamic-range-limit)$/,
        'how the box answers a hand or a reader: it paints nothing',
    ],
    [
        /^(transition(-.*)?|animation-(?!name$).*)$/,
        'the timing of a motion: what an animation sets is read keyframe by keyframe (`animation-name` is held), and a transition runs only when a state changes',
    ],
    [
        /^(perspective|perspective-origin|transform-origin|transform-box|transform-style|backface-visibility|offset-(anchor|distance|position|rotate))$/,
        'means nothing without a transform or a motion path, which are held',
    ],
    [
        /^(fill(-.*)?|stroke(-.*)?|marker(-.*)?|stop-.*|flood-.*|lighting-color|color-interpolation(-.*)?|shape-rendering|text-anchor|vector-effect|clip-rule|r|rx|ry|cx|cy|x|y|d|buffered-rendering|color-rendering)$/,
        'SVG paint, which an HTML box\'s text does not read',
    ],
    [
        /^(corner-.*-shape|(row|column)-rule-.*|rule-overlap|column-height|column-wrap|-webkit-border-image|text-decoration)$/,
        'the box\'s corners and the rules between its rows and columns paint outside the glyphs; `text-decoration` is the shorthand Chrome also reports, whose lines are held',
    ],
    [
        /^(frame-sizing|app-region|window-drag|interest-delay-.*|scroll-axis-lock|scroll-marker-group|scroll-target-group|timeline-trigger-.*|trigger-scope|overlay)$/,
        'how the box answers a hand, a scroll or the top layer, or when an animation starts (the animation itself is read): it paints nothing',
    ],
    [
        /^(-webkit-text-orientation|-webkit-text-combine|-webkit-ruby-position|-webkit-border-(horizontal|vertical)-spacing)$/,
        'a prefixed twin of a free longhand',
    ],
    [
        /^(list-style(-.*)?|counter-(reset|increment|set)|border-collapse|border-spacing|caption-side|empty-cells|orphans|widows|page(-.*)?)$/,
        'lists, tables and pages: a marker is held by `display`, and a counter prints only through `content`, which the look lint refuses outside the listed strings',
    ],
];

/** The longhands held to a condition (`dressHeldFault`), whatever the reference computes. */
const DRESS_HELD: ReadonlySet<string> = new Set([
    'clip-path',
    'clip',
    'mask-image',
    '-webkit-mask-image',
    'mask-border-source',
    '-webkit-mask-box-image-source',
    'filter',
    'mix-blend-mode',
    'background-blend-mode',
    '-webkit-box-reflect',
    'offset-path',
    'rotate',
    'scale',
    'translate',
    'transform',
    'opacity',
    'visibility',
    'content-visibility',
    'zoom',
    'font-size-adjust',
    'word-spacing',
    'text-indent',
    'letter-spacing',
    '-webkit-text-fill-color',
    '-webkit-text-stroke-width',
    '-webkit-text-security',
    'background-clip',
    '-webkit-background-clip',
    'background-color',
    'background-image',
    'outline-style',
    'outline-width',
    'outline-offset',
    'text-decoration-line',
    'text-decoration-thickness',
    'text-underline-offset',
    'text-emphasis-style',
    'text-shadow',
    'direction',
    'unicode-bidi',
    'writing-mode',
    'display',
    'animation-name',
    'content',
    '-webkit-writing-mode',
    '-webkit-mask-box-image',
    '-webkit-text-decorations-in-effect',
    'color',
    'backdrop-filter',
    'text-overflow',
    'line-clamp',
    '-webkit-line-clamp',
]);

/** Whether a longhand is one a look may dress freely (`DRESS_FREE`). */
function dressFree(prop: string): boolean {
    return DRESS_FREE.some(([pattern]) => pattern.test(prop));
}

/**
 * The longhands the own read asks, once a page: every longhand this engine
 * computes (custom properties aside) that is held or in no free family. A
 * free longhand may compute anything, so it is not read at all — the
 * allow-list's answer is the same, at a tenth of the reads.
 */
let dressRead: { held: readonly string[]; rest: readonly string[] } | undefined;
function dressReadList(): { held: readonly string[]; rest: readonly string[] } {
    if (dressRead !== undefined) return dressRead;
    const cs = getComputedStyle(document.documentElement);
    const held: string[] = [];
    const rest: string[] = [];
    for (let i = 0; i < cs.length; i += 1) {
        const prop = cs.item(i);
        if (prop.startsWith('--')) continue;
        if (DRESS_HELD.has(prop)) held.push(prop);
        else if (!dressFree(prop)) rest.push(prop);
    }
    dressRead = { held, rest };
    return dressRead;
}

const pxOf = (v: string): number => Number.parseFloat(v) || 0;
const noMask = (v: string): boolean => v === '' || v === 'none';

/** A computed 2D transform as its parts, or undefined for a 3D matrix or a value this read does not parse. */
function matrixParts(value: string): { sx: number; sy: number; skew: number; det: number; deg: number; shift: number } | undefined {
    if (value === 'none') return { sx: 1, sy: 1, skew: 0, det: 1, deg: 0, shift: 0 };
    const m = /^matrix\(([^)]*)\)$/.exec(value.trim());
    if (m === null) return undefined;
    const [a, b, c, d, e, f] = m[1]!.split(',').map((n) => Number(n));
    if (![a, b, c, d, e, f].every(Number.isFinite)) return undefined;
    const sx = Math.hypot(a!, b!);
    const sy = Math.hypot(c!, d!);
    return {
        sx,
        sy,
        // The cosine of the angle between the two axes: 0 for no skew.
        skew: sx === 0 || sy === 0 ? 1 : (a! * c! + b! * d!) / (sx * sy),
        det: a! * d! - b! * c!,
        deg: (Math.atan2(b!, a!) * 180) / Math.PI,
        shift: Math.hypot(e!, f!),
    };
}

/** Why a transform on the figure itself fails, or undefined: none, or a uniform scale of at least 1 with no turn, skew, flip or shift. */
function ownTransformFault(value: string): string | undefined {
    if (value === 'none') return undefined;
    const t = matrixParts(value);
    if (t === undefined) return `a transform this read cannot take apart (${value.slice(0, 60)})`;
    const uniform = Math.abs(t.sx - t.sy) <= 0.001 * Math.max(t.sx, t.sy);
    if (uniform && t.sx >= 0.999 && Math.abs(t.skew) < 0.001 && t.det > 0 && Math.abs(t.deg) < 0.01 && t.shift < 0.01) return undefined;
    return `a transform (${value.slice(0, 60)}) — only a uniform scale of at least 1, unturned and unmoved (the stream card's pulse), stands on a figure`;
}

/** Why a transform on a box holding the figure fails, or undefined: a tilt of at most `DRESS_TILT_DEG` with any shift and no shrink, skew or flip. */
function boxTransformFault(value: string): string | undefined {
    if (value === 'none') return undefined;
    const t = matrixParts(value);
    if (t === undefined) return `a transform this read cannot take apart (${value.slice(0, 60)})`;
    const uniform = Math.abs(t.sx - t.sy) <= 0.001 * Math.max(t.sx, t.sy);
    if (!uniform || t.sx < 0.999) return `a transform that shrinks or stretches it (${value.slice(0, 60)})`;
    if (Math.abs(t.skew) >= 0.001) return `a transform that skews it (${value.slice(0, 60)})`;
    if (t.det <= 0) return `a transform that mirrors it (${value.slice(0, 60)})`;
    if (Math.abs(t.deg) > DRESS_TILT_DEG) return `a turn of ${t.deg.toFixed(1)}° (more than a ${DRESS_TILT_DEG}° tilt)`;
    return undefined;
}

/** Why an individual `rotate` on a box holding the figure fails: a turn about the screen's own axis of at most `DRESS_TILT_DEG`. */
function boxRotateFault(value: string): string | undefined {
    if (value === 'none') return undefined;
    const m = /^(-?[\d.]+)deg$/.exec(value.trim());
    if (m === null) return `a rotate this read cannot take apart, or a turn out of the screen (${value.slice(0, 40)})`;
    return Math.abs(Number(m[1])) > DRESS_TILT_DEG ? `a turn of ${m[1]}° (more than a ${DRESS_TILT_DEG}° tilt)` : undefined;
}

/** Why an individual `scale` on a box holding the figure fails: uniform and at least 1. */
function boxScaleFault(value: string): string | undefined {
    if (value === 'none') return undefined;
    const parts = value.trim().split(/\s+/).map(Number);
    const [x, y = x, z = 1] = parts;
    if (![x, y, z].every((n) => Number.isFinite(n))) return `a scale this read cannot take apart (${value.slice(0, 40)})`;
    return x! >= 0.999 && Math.abs(x! - y!) < 0.001 && Math.abs(z! - 1) < 0.001 ? undefined : `a scale of ${value} (it shrinks, stretches or mirrors the figure)`;
}

/**
 * **Every colour the dress rule reads is a colour, resolved by the engine**
 * (round 5, the critic's P1-1 on round 4). Round 4 parsed `rgb()`,
 * `color(srgb …)` and `oklab()` and read anything else as no colour, so a
 * ground in `color-mix(in oklch, currentColor 100%, transparent)` — which
 * Chrome computes as `oklch(…)`, since the build can lower a literal colour
 * and not one that depends on the element — passed every check while it
 * hid the whole figure. Now every colour a computed value writes
 * (`colourTokens`, `layout/groundStack.ts`: every colour function with its
 * arguments, every colour keyword, and every bare word the engine takes for
 * a colour) is handed back to the engine and read in sRGB: set on a
 * detached span in the document's head as `color-mix(in srgb, <it> 100%,
 * transparent)`, whose computed value Chrome writes as `color(srgb r g b /
 * a)` — the same conversion the page's own paint makes, unrounded, a channel
 * outside 0–1 clipped as the display clips it. `currentcolor` is the
 * element's own computed `color`. A colour the engine refuses, a value
 * whose parentheses do not balance, or one that writes a colour in a form
 * the reader does not take is **a colour this rule cannot read, and fails**
 * — never "no colour". Why the engine and not a canvas: a canvas returns
 * eight bits of premultiplied colour, which loses a faint layer's hue, and
 * `fillStyle` takes no `currentcolor` of the element's.
 */
let colourProbe: HTMLElement | undefined;
const engineColours = new Map<string, Colour | null>();
function engineColour(text: string): Colour | undefined {
    const known = engineColours.get(text);
    if (known !== undefined) return known ?? undefined;
    if (colourProbe === undefined || !colourProbe.isConnected) {
        colourProbe = document.createElement('span');
        colourProbe.setAttribute('aria-hidden', 'true');
        document.head.append(colourProbe);
    }
    colourProbe.style.removeProperty('color');
    colourProbe.style.setProperty('color', `color-mix(in srgb, ${text} 100%, transparent)`);
    const taken = colourProbe.style.getPropertyValue('color') !== '';
    const read = taken ? srgbColour(getComputedStyle(colourProbe).color) : undefined;
    colourProbe.style.removeProperty('color');
    engineColours.set(text, read ?? null);
    return read;
}

/** Bare words the engine takes for a colour (a named colour), once a page. */
const colourWords = new Map<string, boolean>();
function isColourWord(word: string): boolean {
    let known = colourWords.get(word);
    if (known === undefined) {
        known = CSS.supports('color', word);
        colourWords.set(word, known);
    }
    return known;
}

/** A colour as written in a computed value, resolved (`current` stands for `currentcolor`), or `undefined`: a colour this rule cannot read. */
function dressColour(token: string, current?: string): Colour | undefined {
    let text = token.trim();
    if (/currentcolor/i.test(text)) {
        if (current === undefined || /currentcolor/i.test(current)) return undefined;
        text = text.replace(/currentcolor/gi, current);
    }
    return engineColour(text);
}

/** The colours a computed value writes, in order (`colourTokens` and the named colours among its words). */
function colourItems(value: string): string[] | undefined {
    const read = colourTokens(value);
    return read === undefined ? undefined : [...read.tokens, ...read.words.filter(isColourWord)];
}

/** Every colour a computed value writes (a gradient's stops), resolved, or `undefined` when one of them, or the value, cannot be read. */
function dressColoursIn(value: string, current?: string): Colour[] | undefined {
    const items = colourItems(value);
    if (items === undefined) return undefined;
    const out: Colour[] = [];
    for (const item of items) {
        const c = dressColour(item, current);
        if (c === undefined) return undefined;
        out.push(c);
    }
    return out;
}

/** A one-colour value (a background colour, a border's, an ink), resolved, or `undefined` when it is not exactly one colour this rule can read. */
function dressSingleColour(value: string, current?: string): Colour | undefined {
    const items = colourItems(value);
    return items === undefined || items.length !== 1 ? undefined : dressColour(items[0]!, current);
}

/** The ink a subject's glyphs are painted in, resolved: the fill colour, which the held reads keep equal to `color`, or `color`; `undefined` when neither reads. */
function dressInk(cs: CSSStyleDeclaration): Colour | undefined {
    return dressSingleColour(cs.getPropertyValue('-webkit-text-fill-color'), cs.color) ?? dressSingleColour(cs.color);
}

const rgbOf = (c: Colour): { r: number; g: number; b: number } => ({ r: c.rgb[0], g: c.rgb[1], b: c.rgb[2] });

/** Two boxes share more than half a pixel each way. */
const meets = (a: Box, b: Box): boolean =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
/** `b` grown by `d` on every side (shrunk for a negative `d`). */
const grown = (b: Box, d: number): Box => ({ left: b.left - d, right: b.right + d, top: b.top - d, bottom: b.bottom + d });
/** `b` moved by (x, y). */
const moved = (b: Box, x: number, y: number): Box => ({ left: b.left + x, right: b.right + x, top: b.top + y, bottom: b.bottom + y });
/** Box `outer` less box `inner`, as up to four bands. */
function boxMinus(outer: Box, inner: Box): Box[] {
    const i = {
        left: Math.max(outer.left, inner.left),
        right: Math.min(outer.right, inner.right),
        top: Math.max(outer.top, inner.top),
        bottom: Math.min(outer.bottom, inner.bottom),
    };
    if (i.right <= i.left || i.bottom <= i.top) return [outer];
    const out: Box[] = [];
    if (i.top > outer.top) out.push({ ...outer, bottom: i.top });
    if (i.bottom < outer.bottom) out.push({ ...outer, top: i.bottom });
    if (i.left > outer.left) out.push({ left: outer.left, right: i.left, top: i.top, bottom: i.bottom });
    if (i.right < outer.right) out.push({ left: i.right, right: outer.right, top: i.top, bottom: i.bottom });
    return out;
}

/** A computed `box-shadow` layer, its colour whole and resolved (the halo rule's `boxShadowsOf` reads its alpha alone). */
type DressShadow = { colour: Colour; x: number; y: number; blur: number; spread: number; inset: boolean };
/** A computed `box-shadow` as its layers, or undefined when a layer does not read — its colour among them (`dressColour`; `current` is the box's `color`). */
function dressShadowsOf(value: string, current?: string): DressShadow[] | undefined {
    if (value === 'none' || value === '') return [];
    const out: DressShadow[] = [];
    for (const part of splitLayers(value)) {
        const items = colourItems(part);
        if (items === undefined || items.length !== 1) return undefined;
        const colour = dressColour(items[0]!, current);
        if (colour === undefined) return undefined;
        const rest = part.replace(items[0]!, ' ');
        const [x = 0, y = 0, blur = 0, spread = 0] = [...rest.matchAll(/(-?[\d.]+)px/g)].map((n) => Number(n[1]));
        out.push({ colour, x, y, blur, spread, inset: /\binset\b/.test(rest) });
    }
    return out;
}

/** Why a `backdrop-filter` is not a blur alone, or undefined: any other function repaints the ground behind the glyphs as a function of what is behind it, which no read here can know. */
function backdropFault(value: string): string | undefined {
    return value === 'none' || value === '' || /^(blur\([^)]*\)\s*)+$/.test(value.trim())
        ? undefined
        : `a backdrop-filter (${value.slice(0, 60)}): it repaints the ground behind the glyphs, a ground this rule cannot read`;
}

/** A computed `border-image-outset` against the border widths, as one reach outward (the largest side). */
function borderImageReach(cs: CSSStyleDeclaration): number {
    const widths = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map((v) => Number.parseFloat(v) || 0);
    const parts = cs.borderImageOutset.trim().split(/\s+/);
    return Math.max(
        0,
        ...parts.map((v, i) => (v.endsWith('px') ? Number.parseFloat(v) : (Number.parseFloat(v) || 0) * (widths[i % 4] ?? 0))),
    );
}

/**
 * A box's paints as the ground stack reads them (`groundStackFault`), once a
 * measurement: in paint order, bottom first — its outer box shadows (the last
 * listed lowest), its background colour over the last layer's clip box, its
 * background image's layers (the element's own only, the last listed lowest:
 * a gradient by its stops where its tiles are proved to paint, and as absent
 * too over the rest of its clip area, `layerCovers`; a picture by its
 * place — and a box above's too, read the same way and tagged `layer`, in
 * 3a's report-only walk to the stall alone, `layersAbove`), its inset
 * shadows, every
 * border side that has a width, and a border image (over the padding box
 * where its slice says `fill`, over its bands and outset otherwise) — each
 * with where it paints, read only when asked; whether its background colour
 * is opaque; or why one of its colours cannot be read.
 */
type BoxPaint = { what: string; candidates: Colour[]; picture?: string; above?: Element; layer?: true; rects: () => Box[] };
/** The candidate a paint that may leave a pixel bare is tried at: nothing at all. */
const MAY_BE_ABSENT: Colour = { rgb: [0, 0, 0], alpha: 0 };
type BoxPaints = { paints: BoxPaint[]; opaque: boolean; unread?: string };
let ownPaintsSeen = new Map<Element, BoxPaints>();
let abovePaintsSeen = new Map<Element, BoxPaints>();
/** A box above read with its background image's layers too (`layersAbove`, 3a's report-only walk). */
let walkPaintsSeen = new Map<Element, BoxPaints>();
function boxPaintsOf(at: Element, cs: CSSStyleDeclaration, own: boolean, layersAbove = false): BoxPaints {
    const seen = own ? ownPaintsSeen : layersAbove ? walkPaintsSeen : abovePaintsSeen;
    const known = seen.get(at);
    if (known !== undefined) return known;
    const done = (out: BoxPaints): BoxPaints => {
        seen.set(at, out);
        return out;
    };
    const unread = (what: string, value: string): BoxPaints =>
        done({ paints: [], opaque: false, unread: `${what} this rule cannot read (${value.slice(0, 60)})` });
    const current = cs.color;
    const whose = own ? 'its ' : `${describe(at)}'s `;
    const above = own ? undefined : at;
    const bw = {
        top: Number.parseFloat(cs.borderTopWidth) || 0,
        right: Number.parseFloat(cs.borderRightWidth) || 0,
        bottom: Number.parseFloat(cs.borderBottomWidth) || 0,
        left: Number.parseFloat(cs.borderLeftWidth) || 0,
    };
    let geo: { border: Box; pad: Box; content: Box } | undefined;
    const box = (): { border: Box; pad: Box; content: Box } => {
        if (geo !== undefined) return geo;
        const r = at.getBoundingClientRect();
        const border: Box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        const pad: Box = { left: border.left + bw.left, top: border.top + bw.top, right: border.right - bw.right, bottom: border.bottom - bw.bottom };
        const content: Box = {
            left: pad.left + (Number.parseFloat(cs.paddingLeft) || 0),
            top: pad.top + (Number.parseFloat(cs.paddingTop) || 0),
            right: pad.right - (Number.parseFloat(cs.paddingRight) || 0),
            bottom: pad.bottom - (Number.parseFloat(cs.paddingBottom) || 0),
        };
        geo = { border, pad, content };
        return geo;
    };
    const picture = (v: string): boolean => /url\(|image-set\(|cross-fade\(|element\(|paint\(/.test(v);
    // Where a background layer (and the colour, by the last layer's) is
    // clipped to: `border-area` paints the border's bands alone.
    const clipRects = (k: string): Box[] =>
        k === 'border-area' ? boxMinus(box().border, box().pad) : [k.includes('content') ? box().content : k.includes('padding') ? box().pad : box().border];
    const clips = cs.backgroundClip.split(',').map((v) => v.trim());
    const paints: BoxPaint[] = [];
    const shadows = dressShadowsOf(cs.boxShadow, current);
    if (shadows === undefined) return unread('a box-shadow', cs.boxShadow);
    for (const sh of shadows.filter((s) => !s.inset).reverse()) {
        paints.push({ what: `${whose}box-shadow`, candidates: [sh.colour], rects: () => boxMinus(grown(moved(box().border, sh.x, sh.y), sh.spread), box().border) });
    }
    const bg = dressSingleColour(cs.backgroundColor, current);
    if (bg === undefined) return unread('a background colour', cs.backgroundColor);
    paints.push({ what: `${whose}ground`, candidates: [bg], rects: () => clipRects(clips[clips.length - 1] ?? 'border-box') });
    // A box above paints its decoration in its background image (the rain's
    // tiles, the aurora's washes, Neo's brackets and scanlines): the bound
    // walk does not read it there (the contrast pass's, on the screens it
    // samples); 3a's report-only walk to the stall reads its gradients as a
    // figure's own are read, and names its pictures (`layersAbove`).
    if ((own || layersAbove) && cs.backgroundImage !== 'none') {
        const layers = splitLayers(cs.backgroundImage);
        const repeats = splitLayers(cs.backgroundRepeat);
        const sizes = splitLayers(cs.backgroundSize);
        const origins = splitLayers(cs.backgroundOrigin);
        const attachments = splitLayers(cs.backgroundAttachment);
        const positionsX = splitLayers(cs.backgroundPositionX);
        const positionsY = splitLayers(cs.backgroundPositionY);
        for (let i = layers.length - 1; i >= 0; i -= 1) {
            const layer = layers[i]!;
            const clip = clips[i % clips.length] ?? 'border-box';
            if (layer === 'none') continue;
            if (picture(layer)) {
                paints.push(own ? { what: 'a picture', candidates: [], picture: layer, rects: () => clipRects(clip) } : { what: `${whose}picture`, candidates: [], picture: layer, above, layer: true, rects: () => clipRects(clip) });
                continue;
            }
            const stops = dressColoursIn(layer, current);
            if (stops === undefined) return unread('a background layer', layer);
            if (stops.length === 0) continue;
            // Where a layer's tiles are proved to paint (`layerCovers`: each
            // axis's tile resolved against the positioning area — tiles that
            // repeat at 1px or more cover the whole clip area, one tile at
            // least the area long and placed over it covers that area's
            // span) it is a paint like any; the rest of its clip area is a
            // paint that may not be there, every cell judged with it and
            // without it (round 6, the critic's P1-2 on round 5; round 7,
            // the critic's P1-2 and P2-2 on round 6).
            // A lone tile is placed only on a `scroll` layer: a `fixed` one
            // is the viewport's only while no box above is transformed, and
            // Rural's tag sways (round 8, the critic's FX); a `local` one
            // scrolls with the content. Their tiles that repeat are read
            // against the smaller of the origin box and the viewport
            // (`tileArea`).
            const origin = origins[i % origins.length] ?? 'padding-box';
            const attachment = attachments[i % attachments.length] ?? 'scroll';
            const areaBox = (): Box => (origin.includes('content') ? box().content : origin.includes('border') ? box().border : box().pad);
            const a = areaBox();
            const [coverX, coverY] = layerCovers(
                repeats[i % repeats.length] ?? 'repeat',
                sizes[i % sizes.length] ?? 'auto',
                [positionsX[i % positionsX.length] ?? '0%', positionsY[i % positionsY.length] ?? '0%'],
                tileArea(attachment, { w: a.right - a.left, h: a.bottom - a.top }, { w: window.innerWidth, h: window.innerHeight }),
                attachment,
            );
            const proved = coverX !== 'none' && coverY !== 'none';
            let parts: { inside: Box[]; outside: Box[] } | undefined;
            const part = (): { inside: Box[]; outside: Box[] } => {
                if (parts !== undefined) return parts;
                const span = areaBox();
                const inside: Box[] = [];
                const outside: Box[] = [];
                for (const r of clipRects(clip)) {
                    const covered: Box = {
                        left: coverX === 'painting-area' ? r.left : Math.max(r.left, span.left),
                        right: coverX === 'painting-area' ? r.right : Math.min(r.right, span.right),
                        top: coverY === 'painting-area' ? r.top : Math.max(r.top, span.top),
                        bottom: coverY === 'painting-area' ? r.bottom : Math.min(r.bottom, span.bottom),
                    };
                    if (proved && covered.right > covered.left && covered.bottom > covered.top) {
                        inside.push(covered);
                        outside.push(...boxMinus(r, covered));
                    } else {
                        outside.push(r);
                    }
                }
                parts = { inside, outside };
                return parts;
            };
            const tag = own ? {} : { layer: true as const };
            if (proved) paints.push({ what: `${whose}gradient`, candidates: stops, rects: () => part().inside, ...tag });
            // A layer whose tiles repeat over its whole clip area leaves none
            // of it bare, and is one paint as before.
            if (!proved || coverX === 'positioning-area' || coverY === 'positioning-area') {
                paints.push({ what: `${whose}gradient, where its tiles fall`, candidates: [...stops, MAY_BE_ABSENT], rects: () => part().outside, ...tag });
            }
        }
    }
    for (const sh of shadows.filter((s) => s.inset).reverse()) {
        paints.push({ what: `${whose}inset box-shadow`, candidates: [sh.colour], rects: () => boxMinus(box().pad, grown(moved(box().pad, sh.x, sh.y), -sh.spread)) });
    }
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
        const w = bw[side];
        const style = cs.getPropertyValue(`border-${side}-style`);
        if (!(w > 0) || style === 'none' || style === 'hidden') continue;
        const value = cs.getPropertyValue(`border-${side}-color`);
        const c = dressSingleColour(value, current);
        if (c === undefined) return unread(`a ${side} border's colour`, value);
        paints.push({
            what: `${whose}${side} border`,
            candidates: [c],
            rects: () => {
                const { border } = box();
                return [
                    side === 'top'
                        ? { ...border, bottom: border.top + w }
                        : side === 'bottom'
                          ? { ...border, top: border.bottom - w }
                          : side === 'left'
                            ? { ...border, right: border.left + w }
                            : { ...border, left: border.right - w },
                ];
            },
        });
    }
    const source = cs.borderImageSource;
    if (source !== 'none' && source !== '') {
        const rects = (): Box[] => {
            const reach = grown(box().border, borderImageReach(cs));
            return /\bfill\b/.test(cs.borderImageSlice) ? [reach] : boxMinus(reach, box().pad);
        };
        if (picture(source)) {
            paints.push({ what: `${whose}border image`, candidates: [], picture: source, above, rects });
        } else {
            const stops = dressColoursIn(source, current);
            if (stops === undefined) return unread('a border image', source);
            paints.push({ what: `${whose}border image`, candidates: stops, rects });
        }
    }
    return done({ paints, opaque: bg.alpha >= 0.999 });
}

/** Whether a box clips what it holds to its padding box (an `overflow` but visible, a painting `contain`). */
function clipsContent(cs: CSSStyleDeclaration): boolean {
    return cs.overflowX !== 'visible' || cs.overflowY !== 'visible' || /\b(?:paint|strict|content)\b/.test(cs.contain);
}

/** A box's padding box. */
function paddingBoxOf(el: Element, cs: CSSStyleDeclaration): Box {
    const r = el.getBoundingClientRect();
    return {
        left: r.left + (Number.parseFloat(cs.borderLeftWidth) || 0),
        top: r.top + (Number.parseFloat(cs.borderTopWidth) || 0),
        right: r.right - (Number.parseFloat(cs.borderRightWidth) || 0),
        bottom: r.bottom - (Number.parseFloat(cs.borderBottomWidth) || 0),
    };
}

/**
 * Why the ground under an element's glyphs reads under `MIN_CONTRAST`
 * against its ink, or undefined (round 5, the critic's P1-2 on round 4: the
 * paints judged one at a time, so five layers of the ink's own colour at
 * 0.49 alpha — 0.97 opaque together — passed). Every paint under the
 * glyphs, from the element up to and with the nearest box whose background
 * colour is opaque (which hides every paint above it; an element whose own
 * is opaque stands on its own ground) or the stall, is read by its colour
 * and where it paints (`boxPaintsOf`), and they are judged **together**:
 * each stretch of the glyphs' ink, as painted — cut by every box in that
 * walk that clips what it holds — is cut into cells by the paints' edges,
 * and on each cell the paints that cover it are composited as plain
 * stacking (source-over, in paint order: every blend from the figure up to
 * the stall is held to `normal`), a gradient tried at each stop and, where
 * its tiles may leave the cell bare, absent (`worstGround`,
 * `layout/groundStack.ts`); a
 * cell whose composite is at least `DRESS_GROUND_ALPHA` opaque and reads
 * under `MIN_CONTRAST` against the ink fails. Where the walk reached an
 * opaque ground, every cell it covers is opaque, and the judgement is the
 * ground the colours paint; where it did not, a stack less than half
 * opaque is mostly what lies below it, and the contrast pass's.
 * A picture under the glyphs — the element's own background image or a
 * border image of any box in the walk — is a ground this rule cannot read,
 * and fails. Its geometry and its ink are read only when the colours alone
 * cannot pass it: a stack no blend of whose colours, each weighed by its
 * alpha, reads under the floor (`everyMixReads`), or whose most opaque total
 * stays under the alpha floor (`mostOpaque`), passes unmeasured.
 */
function groundStackFault(el: HTMLElement, cs: CSSStyleDeclaration, stall: Element, inks: () => readonly Box[]): string | undefined {
    const ink = dressInk(cs);
    if (ink === undefined) return `an ink this rule cannot read (${cs.color.slice(0, 60)})`;
    const chain: { at: Element; cs: CSSStyleDeclaration; read: BoxPaints }[] = [];
    for (let at: Element | null = el; at !== null && at.id !== 'app'; at = at.parentElement) {
        const acs = at === el ? cs : getComputedStyle(at);
        const read = boxPaintsOf(at, acs, at === el);
        if (read.unread !== undefined) return at === el ? read.unread : `${describe(at)} above it: ${read.unread}`;
        chain.push({ at, cs: acs, read });
        if (read.opaque || at === stall) break;
    }
    // Bottom first: the ground the walk stopped at, then each box below it.
    const stack = [...chain].reverse().flatMap((c) => c.read.paints);
    const pictures = stack.filter((p) => p.picture !== undefined);
    const coloured = stack.filter((p) => p.picture === undefined);
    if (pictures.length === 0) {
        if (mostOpaque(coloured.map((p) => p.candidates)) < DRESS_GROUND_ALPHA) return undefined;
        if (everyMixReads(coloured.map((p) => p.candidates), ink.rgb, DRESS_GROUND_CONTRAST, DRESS_GROUND_ALPHA)) return undefined;
    }
    const cuts = chain.filter((c) => clipsContent(c.cs)).map((c) => paddingBoxOf(c.at, c.cs));
    const shown = inks()
        .map((i) => cuts.reduce<Box>((b, c) => ({ left: Math.max(b.left, c.left), right: Math.min(b.right, c.right), top: Math.max(b.top, c.top), bottom: Math.min(b.bottom, c.bottom) }), i))
        .filter((b) => b.right - b.left > 0.5 && b.bottom - b.top > 0.5);
    for (const p of pictures) {
        if (shown.some((i) => p.rects().some((r) => meets(i, r)))) {
            const pic = p.picture!.slice(0, 60);
            if (p.what === 'a picture') return `a picture under its glyphs (${pic}), a ground this rule cannot read`;
            return `${p.above === undefined ? '' : `${describe(p.above)} above it: `}a border image that is a picture (${pic}) under its glyphs, a ground this rule cannot read`;
        }
    }
    const judged: StackPaint[] = coloured.map((p) => ({ what: p.what, candidates: p.candidates, rects: p.rects() }));
    const rgbText = (rgb: readonly number[]): string => rgb.map((v) => Math.round(v)).join(', ');
    for (const i of shown) {
        const v = worstGround(judged, i, ink.rgb, DRESS_GROUND_CONTRAST, DRESS_GROUND_ALPHA);
        if (v === undefined) continue;
        if ('tooMany' in v) return `${v.tooMany} ways of choosing the gradient stops under its glyphs, more than this rule reads (${STACK_CHOICES_CAP})`;
        return (
            `the ground under its glyphs (${v.paints.slice(0, 4).join(' over ')}${v.paints.length > 4 ? ` and ${v.paints.length - 4} more` : ''}) ` +
            `reads at ${v.ratio.toFixed(2)}:1 on its ink, ${v.ground.alpha.toFixed(2)} opaque together (rgb(${rgbText(v.ground.rgb)}) under ink rgb(${rgbText(ink.rgb)}))`
        );
    }
    return undefined;
}

/*
 * **3a, the walk to the stall** (before 8g2, item 3a;
 * `the-ground-walk-reaches-the-stall`, **report-only**; the pure half is in
 * `layout/groundStack.ts`). `groundStackFault` stops at the first box whose
 * background colour is opaque, whether or not that colour is under the
 * glyphs or painted at all, and reads no box above's background image: the
 * critic's N2 (`.item-a` opaque white clipped to its content box, the figure
 * moved out of it onto `.item-p`'s dark ground), V (the opaque white on an
 * `.item-a` set `visibility: hidden`) and DC (on a `.pay-x` set `display:
 * contents`) and N1 (a gradient in the ink's own colour on `.item-a`) each
 * read clean here and are refused by the contrast pass alone, where it
 * samples. This reads the same figure's ground another way, beside it:
 * - **to the stall**, every box from the element up to and with its stall,
 *   each paint where it paints (its own `background-clip` and area), every
 *   cell read from its topmost paint that hides what is below it
 *   (`fromTopmostOpaque`) — so an opaque ground still hides every paint
 *   above it in the tree, but only where it covers;
 * - **skipping a box that paints nothing** (`paintsNothing`: a `visibility`
 *   that is not `visible`, or `display: contents`, which has no box): its
 *   paints are none, and it ends nothing;
 * - **a box above's gradient layers** read as the figure's own are
 *   (`boxPaintsOf`'s `layersAbove`, `layerCovers`): at every stop where its
 *   tiles are proved to paint, and absent too over the rest of its clip area;
 * - **a box above's pictures** (a `url()` layer) are named where one shows
 *   under the glyphs (`picturesShowing`) and composited as absent — not
 *   judged: the contrast pass's, on the screens it samples;
 * - cut by the boxes that clip below the nearest scroller
 *   (`cutsBelowScroller`), and split by the scrollers above it, each part
 *   read where it stands once scrolled into view (`byScroller`): a row below
 *   the fold is read over the stall's own paints where it will stand, the
 *   paints that move with it moved with it, and never over the scroller's
 *   own edge, which no content stands over.
 * It fails nothing: its verdict beside the bound one is tallied per look
 * (`walkByClass`: would-be failures the bound read does not make, failures
 * both make, failures the bound read makes and this one does not), its
 * would-be failures kept with the paints new to this read that made them
 * (`sources`), and what it could not read (`walkUnread`). A throw is
 * counted and said and fails nothing (`walkThrown`). Not read, stated: a
 * part of a figure out of its scroller's view at any scroll but the one that
 * brings it to the nearest edge of the view (under a gradient the stop-wise
 * read is the same anywhere; a paint that covers only part of the view is
 * read where that scroll puts the part); a clip above a scroller; the
 * keyframe offsets
 * (`offsetGroundFaults` reads the bound ground alone); a box above's
 * in-flow pseudo-element; rounded corners; a gradient between its stops.
 */
const WALK_CHECK = 'the-ground-walk-reaches-the-stall';
/** One look's 3a tallies on a pass: figures' elements read, would-be failures, failures the bound read makes too, failures it makes that this read does not, elements with something unread, walks that skipped a box that paints nothing, walks that read a paint past the bound stop, walks that read a box above's gradient or picture, stacks of too many choices. */
type WalkTally = {
    elements: number;
    would: number;
    both: number;
    dropped: number;
    unread: number;
    skipped: number;
    past: number;
    layers: number;
    pictures: number;
    tooMany: number;
};
const walkByClass: Record<string, WalkTally> = {};
const walkTally = (): WalkTally =>
    (walkByClass[measuringClass] ??= { elements: 0, would: 0, both: 0, dropped: 0, unread: 0, skipped: 0, past: 0, layers: 0, pictures: 0, tooMany: 0 });
/** A would-be failure: where, the element, its fault, and the paints new to 3a that made it (`sources`, top first). */
type WalkWould = { screen: string; look: string; cls: string; el: string; text: string; fault: string; sources: string[] };
const walkWould: WalkWould[] = [];
/** A failure of the bound read this one does not make. */
const walkDropped: { screen: string; look: string; cls: string; el: string; text: string; bound: string }[] = [];
/** What this read could not read under a figure: a box above's picture where it shows, a layer whose colours it cannot take, a stack of too many choices. */
const walkUnread: { screen: string; look: string; cls: string; el: string; what: string }[] = [];
const WALK_KEPT = 4000;
/** 3a's throws, word for word up to `WALK_THROWN_KEPT`. */
const walkThrown: string[] = [];
const WALK_THROWN_KEPT = 40;
/** 3a's own time (a clock). */
let walkMs = 0;

/** Whether a box scrolls what it holds on either axis. */
function scrollsContent(cs: CSSStyleDeclaration): boolean {
    return /^(?:auto|scroll)$/.test(cs.overflowX) || /^(?:auto|scroll)$/.test(cs.overflowY);
}

type WalkRead = { fault?: string; sources: string[]; unread: string[]; tooMany: boolean; skipped: boolean; past: boolean; layers: boolean; pictures: boolean };

/** 3a's read of the ground under one element's glyphs (the walk to the stall), beside `groundStackFault`'s. */
function groundWalkRead(el: HTMLElement, cs: CSSStyleDeclaration, stall: Element, inks: () => readonly Box[]): WalkRead {
    const out: WalkRead = { sources: [], unread: [], tooMany: false, skipped: false, past: false, layers: false, pictures: false };
    const ink = dressInk(cs);
    if (ink === undefined) {
        out.fault = `an ink this rule cannot read (${cs.color.slice(0, 60)})`;
        return out;
    }
    type Link = { at: Element; cs: CSSStyleDeclaration; paints: BoxPaint[]; skip?: 'invisible' | 'no box'; past: boolean };
    const chain: Link[] = [];
    // Where the bound walk stops, and the boxes it reads that paint nothing.
    let inBound = true;
    let stop = '';
    const skippedInBound: string[] = [];
    for (let at: Element | null = el; at !== null && at.id !== 'app'; at = at.parentElement) {
        const own = at === el;
        const acs = own ? cs : getComputedStyle(at);
        const bound = boxPaintsOf(at, acs, own);
        if (bound.unread !== undefined) {
            // The bound read's own refusal, word for word (a box past where it stops is one it never read).
            out.fault = own ? bound.unread : `${describe(at)} above it: ${bound.unread}`;
            if (!inBound) out.sources = [`${describe(at)}'s paints, past where the bound walk stops (${stop})`];
            return out;
        }
        let paints = bound.paints;
        if (!own) {
            const read = boxPaintsOf(at, acs, false, true);
            if (read.unread !== undefined) out.unread.push(`${describe(at)}'s background image: ${read.unread}`);
            else paints = read.paints;
        }
        const skip = paintsNothing(acs.visibility, acs.display);
        if (skip !== undefined) {
            out.skipped = true;
            if (inBound) skippedInBound.push(`${describe(at)} (${skip === 'no box' ? 'display: contents' : `visibility: ${acs.visibility}`})`);
        }
        chain.push({ at, cs: acs, paints: skip === undefined ? paints : [], ...(skip === undefined ? {} : { skip }), past: !inBound });
        if (inBound && (bound.opaque || at === stall)) {
            inBound = false;
            stop = `${describe(at)}${skip === undefined ? '' : `, which paints nothing (${skip === 'no box' ? 'display: contents' : `visibility: ${acs.visibility}`})`}`;
        }
        if (at === stall) break;
    }
    const source = (l: Link, p: BoxPaint): string | undefined =>
        l.past ? `${p.what}, past where the bound walk stops (${stop})` : p.layer === true ? `${p.what} (a box above's background image)` : undefined;
    // Bottom first: the stall, then each box below it, each paint with its box's place on the walk.
    const stack = [...chain].reverse().flatMap((l) => l.paints.map((p) => ({ p, source: source(l, p), depth: chain.indexOf(l) })));
    out.past = chain.some((l) => l.past && l.paints.length > 0);
    out.layers = stack.some((s) => s.p.layer === true && s.p.picture === undefined);
    out.pictures = stack.some((s) => s.p.layer === true && s.p.picture !== undefined);
    // The figure's own picture and any border image that is one fail, as the bound read fails them; a box above's background picture is named, not judged.
    const failing = stack.filter((s) => s.p.picture !== undefined && s.p.layer !== true);
    const above = stack.filter((s) => s.p.picture !== undefined && s.p.layer === true);
    const coloured = stack.filter((s) => s.p.picture === undefined);
    let colourPasses = false;
    if (failing.length === 0) {
        const candidates = coloured.map((s) => s.p.candidates);
        colourPasses = mostOpaque(candidates) < DRESS_GROUND_ALPHA || everyMixReads(candidates, ink.rgb, DRESS_GROUND_CONTRAST, DRESS_GROUND_ALPHA);
        if (colourPasses && above.length === 0) return out;
    }
    const boxed = chain.filter((l) => l.skip !== 'no box');
    const cuts = cutsBelowScroller(boxed.map((l) => ({ clips: clipsContent(l.cs), scrolls: scrollsContent(l.cs), box: () => paddingBoxOf(l.at, l.cs) })));
    const scrollers = boxed.filter((l) => scrollsContent(l.cs)).map((l) => ({ at: chain.indexOf(l), box: paddingBoxOf(l.at, l.cs) }));
    const shown = inks()
        .map((i) => cuts.reduce<Box>((b, c) => ({ left: Math.max(b.left, c.left), right: Math.min(b.right, c.right), top: Math.max(b.top, c.top), bottom: Math.min(b.bottom, c.bottom) }), i))
        .filter((b) => b.right - b.left > 0.5 && b.bottom - b.top > 0.5);
    // Each part of the ink where it stands once scrolled into view (`byScroller`).
    const parts = shown.flatMap((i) => byScroller(i, scrollers));
    const moved = (rects: readonly Box[], depth: number, moves: readonly ScrollMove[]): Box[] => {
        if (moves.length === 0) return [...rects];
        const { dx, dy } = shiftFor(depth, moves);
        return dx === 0 && dy === 0 ? [...rects] : rects.map((r) => ({ left: r.left + dx, right: r.right + dx, top: r.top + dy, bottom: r.bottom + dy }));
    };
    for (const { p, depth } of failing) {
        if (parts.some(({ part, moves }) => moved(p.rects(), depth, moves).some((r) => meets(part, r)))) {
            const pic = p.picture!.slice(0, 60);
            out.fault =
                p.what === 'a picture'
                    ? `a picture under its glyphs (${pic}), a ground this rule cannot read`
                    : `${p.above === undefined ? '' : `${describe(p.above)} above it: `}a border image that is a picture (${pic}) under its glyphs, a ground this rule cannot read`;
            return out;
        }
    }
    // Bottom first, as the stack is.
    const kept = stack.filter((s) => s.p.picture === undefined || s.p.layer === true);
    const judged: StackPaint[] = kept.map(({ p, source: why }) => ({
        what: p.what,
        candidates: p.candidates,
        rects: p.rects(),
        ...(why === undefined ? {} : { source: why }),
        ...(p.picture === undefined ? {} : { picture: true }),
    }));
    const at = (moves: readonly ScrollMove[]): StackPaint[] =>
        moves.length === 0 ? judged : judged.map((j, k) => ({ ...j, rects: moved(j.rects, kept[k]!.depth, moves) }));
    const rgbText = (rgb: readonly number[]): string => rgb.map((v) => Math.round(v)).join(', ');
    const pictures = new Set<string>();
    for (const { part: i, moves } of parts) {
        const here = at(moves);
        if (above.length > 0) for (const what of picturesShowing(here, i)) pictures.add(what);
        if (colourPasses || out.fault !== undefined) continue;
        const v = worstGround(here, i, ink.rgb, DRESS_GROUND_CONTRAST, DRESS_GROUND_ALPHA, { fromOpaque: true });
        if (v === undefined) continue;
        if ('tooMany' in v) {
            if (!out.tooMany) out.unread.push(`${v.tooMany} ways of choosing the gradient stops under its glyphs, more than this rule reads (${STACK_CHOICES_CAP})`);
            out.tooMany = true;
            continue;
        }
        out.fault =
            `the ground under its glyphs (${v.paints.slice(0, 4).join(' over ')}${v.paints.length > 4 ? ` and ${v.paints.length - 4} more` : ''}) ` +
            `reads at ${v.ratio.toFixed(2)}:1 on its ink, ${v.ground.alpha.toFixed(2)} opaque together (rgb(${rgbText(v.ground.rgb)}) under ink rgb(${rgbText(ink.rgb)}))`;
        out.sources =
            v.sources.length > 0
                ? v.sources
                : skippedInBound.length > 0
                  ? [`the bound walk's own paints, read without ${skippedInBound.join(', ')}, which paint nothing`]
                  : ['the bound walk\'s own paints, on an ink it cuts away at a scroller or a clip above one'];
    }
    for (const what of pictures) out.unread.push(`${what} under its glyphs, a picture this read does not take`);
    return out;
}

/** 3a beside the bound read, for one element of a figure: tallied and kept, never a failure. */
function groundWalkReport(screen: string, label: string, el: HTMLElement, cs: CSSStyleDeclaration, stall: Element, inks: () => readonly Box[], bound: string | undefined, figure: HTMLElement): void {
    const t0 = performance.now();
    try {
        const tally = walkTally();
        tally.elements += 1;
        const read = groundWalkRead(el, cs, stall, inks);
        const name = `${describe(figure)}${el === figure ? '' : ` › ${describe(el)}`}`;
        const text = (figure.textContent ?? '').trim().slice(0, 32);
        if (read.skipped) tally.skipped += 1;
        if (read.past) tally.past += 1;
        if (read.layers) tally.layers += 1;
        if (read.pictures) tally.pictures += 1;
        if (read.tooMany) tally.tooMany += 1;
        if (read.unread.length > 0) {
            tally.unread += 1;
            for (const what of read.unread) if (walkUnread.length < WALK_KEPT) walkUnread.push({ screen, look: label, cls: measuringClass, el: name, what });
        }
        if (read.fault !== undefined && bound === undefined) {
            tally.would += 1;
            if (walkWould.length < WALK_KEPT) walkWould.push({ screen, look: label, cls: measuringClass, el: name, text, fault: read.fault, sources: read.sources });
        } else if (read.fault !== undefined) {
            tally.both += 1;
        } else if (bound !== undefined) {
            tally.dropped += 1;
            if (walkDropped.length < WALK_KEPT) walkDropped.push({ screen, look: label, cls: measuringClass, el: name, text, bound });
        }
    } catch (e) {
        if (walkThrown.length < WALK_THROWN_KEPT) walkThrown.push(`${screen} ${label}: ${describe(el)}: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        walkMs += performance.now() - t0;
    }
}

/** Why a decoration line is drawn across or over the text, or undefined. */
function decorationFault(cs: CSSStyleDeclaration): string | undefined {
    const lines = cs.textDecorationLine.split(/\s+/);
    if (lines.includes('line-through')) return 'a line through it (a struck figure reads as withdrawn)';
    if (lines.includes('overline')) return 'a line over it';
    if (lines.includes('underline')) {
        const thick = cs.getPropertyValue('text-decoration-thickness').trim();
        const offset = cs.getPropertyValue('text-underline-offset').trim();
        if (thick !== 'auto' && thick !== 'from-font') return `an underline ${thick} thick (only the face's own thickness stands under a figure)`;
        if (offset !== 'auto' && pxOf(offset) < 0) return `an underline raised ${offset} into its glyphs`;
    }
    return undefined;
}

/** The layers of a computed `text-shadow` the copy reads judge: the sharp ones (blurred less than they stand off), the rain's outline set apart. */
function sharpCopies(shadows: readonly Shadow[]): Shadow[] {
    const hard = shadows.filter((sh) => sh.alpha === 1 && sh.blur === 0);
    const outline =
        hard.length > 0 &&
        hard.every((sh) => sh.rgb.every((c, i) => c === hard[0]!.rgb[i])) &&
        outlineSet(hard.map((sh) => [sh.x, sh.y] as const)) > 0;
    return shadows.filter((sh) => !(outline && hard.includes(sh)) && sh.alpha > 0 && sh.blur < Math.hypot(sh.x, sh.y));
}

/**
 * Why a `text-shadow` makes a second figure or smears the first, or
 * undefined: a layer blurred at least as far as it stands off is a glow;
 * the sharp layers and the glyph itself stand within `DRESS_SHADOW_EM` of
 * the text's size of each other, two by two (the rain's outline aside).
 */
function shadowFault(value: string, sizePx: number): string | undefined {
    if (value === 'none') return undefined;
    const shadows = shadowsOf(value);
    if (shadows === undefined) return `a text-shadow this rule cannot read (${value.slice(0, 60)})`;
    const sharp = sharpCopies(shadows);
    if (sharp.length === 0) return undefined;
    const points: (readonly [number, number])[] = [[0, 0], ...sharp.map((sh) => [sh.x, sh.y] as const)];
    let spread = 0;
    for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
            spread = Math.max(spread, Math.hypot(points[i]![0] - points[j]![0], points[i]![1] - points[j]![1]));
        }
    }
    const reach = DRESS_SHADOW_EM * sizePx;
    return spread > reach + 0.01
        ? `${sharp.length} sharp text-shadow layer(s) whose copies, with the glyph itself, stand up to ${spread.toFixed(1)}px apart: copies farther apart than ${reach.toFixed(1)}px (${DRESS_SHADOW_EM}em) stand apart from the strokes they copy, or fill the counters between them`
        : undefined;
}

/**
 * Why a sharp `text-shadow` of a box beside the figure reaches its ink, or
 * undefined (the re-review's P2-4): every element with text of its own under
 * the figure's parent and grandparent (its unit, its "from", the words of
 * its line) but the figure, its own boxes and the boxes it stands in. A
 * sharp layer's copy of that element's text (its line boxes moved by the
 * layer's offset and grown by its blur) that meets the figure's ink fails —
 * painted over the glyphs where the element follows the figure, and where
 * it comes before, as a ground in the ink's own colour. The rain's outline
 * and every glow are not read.
 */
/** An element with text of its own that wears a sharp `text-shadow`, its copies' layers and its text's line boxes. */
type Shadower = { el: HTMLElement; sharp: Shadow[]; lines: Box[] } | { el: HTMLElement; unread: string };
/** The shadowers under a scope, once a measurement: the rows of a list share their grandparent. */
let shadowersSeen = new Map<Element, Shadower[]>();
function shadowersUnder(scope: Element): Shadower[] {
    const known = shadowersSeen.get(scope);
    if (known !== undefined) return known;
    const out: Shadower[] = [];
    const range = document.createRange();
    for (const el of scope.querySelectorAll<HTMLElement>('*')) {
        const texts = [...el.childNodes].filter((c) => c.nodeType === Node.TEXT_NODE && (c.textContent ?? '').trim() !== '');
        if (texts.length === 0) continue;
        const value = getComputedStyle(el).textShadow;
        if (value === 'none') continue;
        const shadows = shadowsOf(value);
        if (shadows === undefined) {
            out.push({ el, unread: value });
            continue;
        }
        const sharp = sharpCopies(shadows);
        if (sharp.length === 0) continue;
        const lines: Box[] = [];
        for (const c of texts) {
            range.selectNodeContents(c);
            for (const q of range.getClientRects()) if (q.width > 0 && q.height > 0) lines.push({ left: q.left, top: q.top, right: q.right, bottom: q.bottom });
        }
        out.push({ el, sharp, lines });
    }
    shadowersSeen.set(scope, out);
    return out;
}

function neighbourShadowFault(node: HTMLElement, ink: Colour | undefined, inks: () => readonly Box[]): string | undefined {
    const parent = node.parentElement;
    const scope = parent?.parentElement !== null && parent?.parentElement !== undefined && !parent.parentElement.classList.contains('stall') ? parent.parentElement : parent;
    if (scope === null || scope === undefined) return undefined;
    for (const s of shadowersUnder(scope)) {
        const el = s.el;
        if (el === node || node.contains(el) || el.contains(node)) continue;
        if ('unread' in s) return `stands beside ${describe(el)}, whose text-shadow this rule cannot read (${s.unread.slice(0, 60)})`;
        const follows = (node.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
        for (const sh of s.sharp) {
            const copies = s.lines.map((l) => grown(moved(l, sh.x, sh.y), sh.blur));
            if (!inks().some((i) => copies.some((c) => meets(i, c)))) continue;
            if (follows) {
                return `${describe(el)} beside it lays a sharp text-shadow (${sh.x}px ${sh.y}px, rgb(${sh.rgb.join(', ')})) over its glyphs`;
            }
            if (ink !== undefined && sh.alpha >= DRESS_GROUND_ALPHA && contrastRatio(rgbOf({ rgb: sh.rgb, alpha: 1 }), rgbOf(ink)) < DRESS_GROUND_CONTRAST) {
                return `${describe(el)} beside it lays a sharp text-shadow in its ink's own colour (${sh.x}px ${sh.y}px) under its glyphs`;
            }
        }
    }
    return undefined;
}

let pileCanvas: HTMLCanvasElement | undefined;
/** Overlapping ink pixels per face, spacing and pair, across the whole run: the same pairs recur on every screen. */
const pileCache = new Map<string, number>();
/** The pixels a spacing adds to a pair's shared ink (0 where their ink boxes stay apart), across the whole run. */
const pileSeen = new Map<string, number>();

/**
 * How many pixels two glyphs' inks share, both at least half covered, with
 * `b` set after `a` (and the spaces `between`) at a letter- and a
 * word-spacing, drawn on a canvas in `font`.
 */
function sharedInk(font: string, caps: string, stretch: string, a: string, between: string, b: string, ls: number, ws: number, size: number): number {
    const key = `${font}|${caps}|${stretch}|${ls}|${ws}|${a}${between}${b}`;
    const known = pileCache.get(key);
    if (known !== undefined) return known;
    const canvas = (pileCanvas ??= document.createElement('canvas'));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx === null) return 0;
    const setFont = (): void => {
        ctx.font = font;
        ctx.fontKerning = 'normal';
        ctx.fontVariantCaps = caps as CanvasFontVariantCaps;
        ctx.fontStretch = (STRETCH_KEYWORD[stretch] ?? 'normal') as CanvasFontStretch;
    };
    setFont();
    ctx.letterSpacing = `${ls}px`;
    ctx.wordSpacing = `${ws}px`;
    const origin = ctx.measureText(a + between + b).width - ctx.measureText(b).width;
    const pad = Math.ceil(size);
    canvas.width = Math.ceil(Math.max(origin, 0) + size * 3 + pad);
    canvas.height = Math.ceil(size * 3);
    setFont();
    ctx.letterSpacing = '0px';
    ctx.wordSpacing = '0px';
    ctx.fillStyle = '#000';
    const base = size * 2;
    ctx.fillText(a, pad, base);
    const inkA = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillText(b, pad + origin, base);
    const inkB = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let n = 0;
    for (let i = 3; i < inkA.length; i += 4) if (inkA[i]! >= 128 && inkB[i]! >= 128) n += 1;
    pileCache.set(key, n);
    return n;
}

/** `font-stretch`'s computed percentages that canvas takes as keywords. */
const STRETCH_KEYWORD: Readonly<Record<string, string>> = {
    '50%': 'ultra-condensed',
    '62.5%': 'extra-condensed',
    '75%': 'condensed',
    '87.5%': 'semi-condensed',
    '112.5%': 'semi-expanded',
    '125%': 'expanded',
    '150%': 'extra-expanded',
    '200%': 'ultra-expanded',
};

/**
 * Where a negative letter-spacing piles two glyphs, or undefined: for every
 * two adjacent non-space characters of `text` (the spaces between them
 * counted), the pixels of their inks the spacing makes them share beyond
 * what they share at no spacing, drawn on a canvas in `cs`'s face. A pair
 * whose ink boxes stay apart at the spacing is not drawn.
 */
function spacingPiles(text: string, cs: CSSStyleDeclaration): string | undefined {
    const canvas = (pileCanvas ??= document.createElement('canvas'));
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx === null) return undefined;
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const size = pxOf(cs.fontSize);
    const painted = cs.textTransform === 'uppercase' ? text.toUpperCase() : cs.textTransform === 'lowercase' ? text.toLowerCase() : text;
    const chars = [...painted];
    const ls = pxOf(cs.letterSpacing);
    const ws = pxOf(cs.wordSpacing);
    for (let i = 0; i < chars.length; i += 1) {
        if (/\s/.test(chars[i]!)) continue;
        let j = i + 1;
        while (j < chars.length && /\s/.test(chars[j]!)) j += 1;
        if (j >= chars.length) break;
        const [a, b, between] = [chars[i]!, chars[j]!, chars.slice(i + 1, j).join('')];
        i = j - 1;
        const key = `${font}|${cs.fontVariantCaps}|${cs.fontStretch}|${ls}|${ws}|${a}${between}${b}`;
        let added = pileSeen.get(key);
        if (added === undefined) {
            // The boxes first: a pair whose ink boxes stay apart cannot share ink.
            ctx.font = font;
            ctx.fontKerning = 'normal';
            ctx.letterSpacing = `${ls}px`;
            ctx.wordSpacing = `${ws}px`;
            const origin = ctx.measureText(a + between + b).width - ctx.measureText(b).width;
            ctx.letterSpacing = '0px';
            ctx.wordSpacing = '0px';
            added =
                origin - ctx.measureText(b).actualBoundingBoxLeft - ctx.measureText(a).actualBoundingBoxRight >= 0
                    ? 0
                    : sharedInk(font, cs.fontVariantCaps, cs.fontStretch, a, between, b, ls, ws, size) -
                      sharedInk(font, cs.fontVariantCaps, cs.fontStretch, a, between, b, 0, 0, size);
            pileSeen.set(key, added);
        }
        if (added > 0) {
            return `letter-spacing ${cs.letterSpacing} piles "${a}${between}${b}": ${added} pixels of their inks overlap that the face keeps apart`;
        }
    }
    return undefined;
}

/** A run of a text node on one line: its text, its line box, its face, its place in the text and the text node it is cut from. */
type Fragment = { text: string; rect: Box; cs: CSSStyleDeclaration; order: number; owner: Element; source: Text };

/**
 * The text of `node` as fragments, one per text node and line, in the
 * text's own order. A text node set over several lines is cut by its line
 * rects, each character given to the line whose top is nearest its own
 * (`lineOfCharacter`, `layout/charLines.ts`; round 6, the critic's P1-3 on
 * round 5: by its middle, two lines piled within half a line read as one).
 */
function fragmentsOf(node: Element): Fragment[] {
    const out: Fragment[] = [];
    const range = document.createRange();
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t !== null; t = walker.nextNode()) {
        const text = t as Text;
        const owner = text.parentElement;
        if (owner === null || text.data === '') continue;
        range.selectNodeContents(text);
        const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
        if (rects.length === 0) continue;
        const cs = getComputedStyle(owner);
        if (rects.length === 1) {
            out.push({ text: text.data, rect: rects[0]!, cs, order: out.length, owner, source: text });
            continue;
        }
        // One text node on several lines: each character goes with the line
        // whose top its own box shares — never by its middle, which every
        // line of a node piled within half a line holds.
        const words = rects.map(() => '');
        let line = 0;
        let at = 0;
        let previous: Box | undefined;
        for (const ch of text.data) {
            range.setStart(text, at);
            range.setEnd(text, at + ch.length);
            at += ch.length;
            const r = range.getBoundingClientRect();
            if (r.width > 0 || r.height > 0) {
                line = lineOfCharacter(r, rects, line, previous);
                previous = r;
            }
            words[line] += ch;
        }
        rects.forEach((r, i) => {
            if (words[i] !== '') out.push({ text: words[i]!, rect: r, cs, order: out.length, owner, source: text });
        });
    }
    return out;
}

/** A fragment's ink across its line: its glyphs' measured reach about its baseline, on a canvas in its face. */
function fragmentInk(f: Fragment, ctx: CanvasRenderingContext2D): Box & { base: number } {
    ctx.font = `${f.cs.fontStyle} ${f.cs.fontWeight} ${f.cs.fontSize} ${f.cs.fontFamily}`;
    ctx.letterSpacing = '0px';
    const m = ctx.measureText(f.text.trim() === '' ? f.text : f.text.trim());
    const base = f.rect.top + m.fontBoundingBoxAscent;
    return { left: f.rect.left, right: f.rect.right, top: base - m.actualBoundingBoxAscent, bottom: base + m.actualBoundingBoxDescent, base };
}

/** The pixels the glyphs of two lines' fragments share, both at least half covered, drawn on a canvas where they stand. */
function linesShareInk(a: readonly Fragment[], b: readonly Fragment[], inks: ReadonlyMap<Fragment, Box>): number {
    const all = [...a, ...b].map((f) => inks.get(f)!);
    const left = Math.floor(Math.min(...all.map((i) => i.left)) - 4);
    const top = Math.floor(Math.min(...all.map((i) => i.top)) - 4);
    const width = Math.ceil(Math.max(...all.map((i) => i.right)) - left + 8);
    const height = Math.ceil(Math.max(...all.map((i) => i.bottom)) - top + 8);
    if (width <= 0 || height <= 0 || width * height > 4_000_000) return 0;
    const canvas = (pileCanvas ??= document.createElement('canvas'));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const draw = (frags: readonly Fragment[]): Uint8ClampedArray => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#000';
        for (const f of frags) {
            ctx.font = `${f.cs.fontStyle} ${f.cs.fontWeight} ${f.cs.fontSize} ${f.cs.fontFamily}`;
            ctx.fontKerning = 'normal';
            ctx.letterSpacing = f.cs.letterSpacing === 'normal' ? '0px' : f.cs.letterSpacing;
            ctx.wordSpacing = f.cs.wordSpacing === 'normal' ? '0px' : f.cs.wordSpacing;
            const m = ctx.measureText(f.text);
            const painted = f.cs.textTransform === 'uppercase' ? f.text.toUpperCase() : f.cs.textTransform === 'lowercase' ? f.text.toLowerCase() : f.text;
            ctx.fillText(painted, f.rect.left - left, f.rect.top + m.fontBoundingBoxAscent - top);
        }
        return ctx.getImageData(0, 0, width, height).data;
    };
    const pa = draw(a);
    const pb = draw(b);
    let n = 0;
    for (let i = 3; i < pa.length; i += 4) if (pa[i]! >= 128 && pb[i]! >= 128) n += 1;
    return n;
}

/**
 * Why the lines of a money node's text misstate it, or undefined (the
 * re-review's P1-3 and P2-1; round 5, the critic's P1-3 on round 4). Its
 * text is read **flow by flow**: a flow is the text set in one block (the
 * nearest box above a text that is not `inline` or `contents`), so a list's
 * rows, a button's words in a box of their own, and the pieces a look's
 * `display: flex` blockifies — Pay several's total's "= ", its figure and
 * " in total" — are flows of their own. Round 4 read a node only when its
 * text was one flow, and one `display: flex` on `pay-total` made its
 * eight-byte figure and " in total" two flows printed over each other with
 * the rule silent. In each flow:
 * - **in order**: its fragments, taken line by line from the top and left to
 *   right along each line, are the text's own order — multi-column, a
 *   reversed flow, an `order` or a grid placement that moves a part of the
 *   figure fails;
 * - **no break inside a digit group** (`groups`, every money node but an
 *   address and a record's bytes, which wrap anywhere by design): where one
 *   line ends and the next begins between two digits, or between a digit and
 *   a point — `word-break: break-all`, `line-break: anywhere` — fails;
 * - **lines apart**: two lines whose inks meet are drawn on a canvas where
 *   they stand, and a pixel both cover at least half fails — a `line-height`
 *   that piles a broken figure's lines on each other.
 * And across the flows, held apart and in order:
 * - **apart**: two fragments of different flows whose inks meet are drawn
 *   where they stand, and a pixel both cover at least half fails;
 * - **in order**: where the text enters a flow for the first time, that
 *   flow does not begin before the flow it leaves began — its first
 *   fragment's box is not wholly above that one's, nor beside it on its left
 *   (`row-reverse` printing "in total … =") — read on the flows' first
 *   fragments, so a column of words that wraps beside a figure is in order;
 *   text that comes back to a flow it already began is that flow's order.
 * Not read across flows, stated: a break inside a digit group (two flows
 * are two boxes; a group split between them is the flow's own pieces, read
 * within it), and the order of a flow that begins beside another but lower
 * than its first line.
 */
function lineFault(node: HTMLElement, groups: boolean): string | undefined {
    const frags = fragmentsOf(node);
    if (frags.length < 2) return undefined;
    // The flow a text sets its lines in: the nearest box above it that is
    // not inline (or `contents`), the node itself at most.
    const flowRoot = (el: Element): Element => {
        let at = el;
        while (at !== node && at.parentElement !== null) {
            const d = getComputedStyle(at).display;
            if (d !== 'inline' && d !== 'contents') break;
            at = at.parentElement;
        }
        return at;
    };
    const canvas = (pileCanvas ??= document.createElement('canvas'));
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const inks = new Map<Fragment, Box & { base: number }>();
    for (const f of frags) inks.set(f, fragmentInk(f, ctx));
    const rootOf = new Map<Fragment, Element>();
    const flows: Fragment[][] = [];
    const flowAt = new Map<Element, number>();
    for (const f of frags) {
        const root = flowRoot(f.owner);
        rootOf.set(f, root);
        let k = flowAt.get(root);
        if (k === undefined) {
            k = flows.length;
            flowAt.set(root, k);
            flows.push([]);
        }
        flows[k]!.push(f);
    }
    for (const flow of flows) {
        const why = flowFault(node, flow, groups, inks);
        if (why !== undefined) return why;
    }
    if (flows.length < 2) return undefined;
    // Across the flows: their words' fragments (white space draws nothing).
    const words = frags.filter((f) => f.text.trim() !== '');
    const firstOf = new Map<Element, Fragment>();
    for (const f of words) if (!firstOf.has(rootOf.get(f)!)) firstOf.set(rootOf.get(f)!, f);
    for (let i = 1; i < words.length; i += 1) {
        const ra = rootOf.get(words[i - 1]!)!;
        const rb = rootOf.get(words[i]!)!;
        // Only where the text enters a flow for the first time: back in a
        // flow it already began (" in total" after the figure), the order
        // is that flow's own, read within it.
        if (ra === rb || firstOf.get(rb) !== words[i]) continue;
        const a = firstOf.get(ra)!.rect;
        const b = firstOf.get(rb)!.rect;
        const above = b.bottom <= a.top + 0.5;
        const beside = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5 && b.right <= a.left + 0.5;
        if (above || beside) {
            return `its parts are drawn out of their order: "${firstOf.get(rb)!.text.trim().slice(0, 12)}" stands ${above ? 'above' : 'before'} "${firstOf.get(ra)!.text.trim().slice(0, 12)}" though it comes after (a reversed or reordered flow)`;
        }
    }
    for (let i = 0; i < words.length; i += 1) {
        for (let j = i + 1; j < words.length; j += 1) {
            const a = words[i]!;
            const b = words[j]!;
            if (rootOf.get(a) === rootOf.get(b) || !meets(inks.get(a)!, inks.get(b)!)) continue;
            const shared = linesShareInk([a], [b], inks);
            if (shared > 0) {
                return `its parts pile on each other: ${shared} pixels of "${a.text.trim().slice(0, 16)}" and "${b.text.trim().slice(0, 16)}", set in two boxes, overlap`;
            }
        }
    }
    return undefined;
}

/** Why one flow of a money node's text misstates it (`lineFault`'s three reads within a flow), or undefined. */
function flowFault(node: HTMLElement, frags: readonly Fragment[], groups: boolean, inks: ReadonlyMap<Fragment, Box & { base: number }>): string | undefined {
    if (frags.length < 2) return undefined;
    // Lines: fragments that stand on one baseline (within 0.15em of the
    // smaller face, a pixel at least) — never by their boxes' overlap, which
    // a `line-height` piling two lines on each other makes complete — and
    // never two fragments of one text node, which are two of its lines by
    // construction however close a `line-height` piles them (round 6).
    const lines: Fragment[][] = [];
    for (const f of [...frags].sort((x, y) => inks.get(x)!.base - inks.get(y)!.base || x.rect.left - y.rect.left)) {
        const base = inks.get(f)!.base;
        const size = pxOf(f.cs.fontSize);
        const line = lines.find(
            (l) =>
                !l.some((g) => g.source === f.source) &&
                Math.abs(inks.get(l[0]!)!.base - base) <= Math.max(1, 0.15 * Math.min(size, pxOf(l[0]!.cs.fontSize))),
        );
        if (line === undefined) lines.push([f]);
        else line.push(f);
    }
    lines.sort((x, y) => inks.get(x[0]!)!.base - inks.get(y[0]!)!.base);
    for (const l of lines) l.sort((x, y) => x.rect.left - y.rect.left);
    const seen = lines.flat();
    for (let i = 1; i < seen.length; i += 1) {
        if (seen[i]!.order < seen[i - 1]!.order) {
            return `its text is drawn out of its order: "${seen[i - 1]!.text.trim().slice(0, 12)}" stands before "${seen[i]!.text.trim().slice(0, 12)}" though it comes after (columns, a reversed flow or a moved part)`;
        }
    }
    if (lines.length < 2) return undefined;
    const lineOf = new Map<Fragment, number>();
    lines.forEach((l, i) => l.forEach((f) => lineOf.set(f, i)));
    if (groups) {
        for (let i = 1; i < frags.length; i += 1) {
            const a = frags[i - 1]!;
            const b = frags[i]!;
            if (lineOf.get(a) === lineOf.get(b)) continue;
            const x = a.text[a.text.length - 1] ?? '';
            const y = b.text[0] ?? '';
            const digit = /[0-9]/;
            if ((digit.test(x) && digit.test(y)) || (x === '.' && digit.test(y)) || (digit.test(x) && y === '.')) {
                return `a line break inside a digit group ("…${a.text.trim().slice(-4)}" / "${b.text.trim().slice(0, 4)}…"): a group split over two lines reads as two numbers`;
            }
        }
    }
    const span = (l: readonly Fragment[]): Box => {
        const b = l.map((f) => inks.get(f)!);
        return { left: Math.min(...b.map((i) => i.left)), right: Math.max(...b.map((i) => i.right)), top: Math.min(...b.map((i) => i.top)), bottom: Math.max(...b.map((i) => i.bottom)) };
    };
    for (let i = 1; i < lines.length; i += 1) {
        if (!meets(span(lines[i - 1]!), span(lines[i]!))) continue;
        const shared = linesShareInk(lines[i - 1]!, lines[i]!, inks);
        if (shared > 0) {
            return `its lines pile on each other: ${shared} pixels of "${lines[i - 1]!.map((f) => f.text).join('').trim().slice(0, 16)}" and "${lines[i]!.map((f) => f.text).join('').trim().slice(0, 16)}" overlap (line-height ${getComputedStyle(node).lineHeight})`;
        }
    }
    return undefined;
}

/** Whether a computed `background-blend-mode` (one keyword a layer) blends no layer. */
const blendsNormally = (value: string): boolean => value === '' || value.split(',').every((v) => v.trim() === 'normal');

/** Why a held longhand's value fails on the figure or an element under it with text, or undefined. */
function dressHeldFault(prop: string, value: string, cs: CSSStyleDeclaration): string | undefined {
    switch (prop) {
        case 'clip-path':
            return value === 'none' ? undefined : `a clip-path (${value.slice(0, 60)}) on the figure itself`;
        case 'clip':
            return value === 'auto' ? undefined : `a clip (${value}) on the figure itself`;
        case 'mask-image':
        case '-webkit-mask-image':
        case 'mask-border-source':
        case '-webkit-mask-box-image-source':
            return noMask(value) ? undefined : `a mask (${prop} ${value.slice(0, 60)}): a mask fades the figure in any shape`;
        case 'filter':
            return value === 'none' ? undefined : `a filter (${value.slice(0, 60)})`;
        case 'mix-blend-mode':
            return value === 'normal' ? undefined : `mix-blend-mode ${value}: a blend composes the glyphs with what is under them`;
        case 'background-blend-mode':
            return blendsNormally(value) ? undefined : `background-blend-mode ${value.slice(0, 40)}: a blend composes its background's layers into a colour none of them is`;
        case '-webkit-box-reflect':
            return value === 'none' ? undefined : `a reflection (${value.slice(0, 40)}): a second figure`;
        case 'offset-path':
            return value === 'none' ? undefined : `a motion path (${value.slice(0, 40)})`;
        case 'rotate':
        case 'scale':
        case 'translate':
            return value === 'none' ? undefined : `${prop} ${value} on the figure itself`;
        case 'transform':
            return ownTransformFault(value);
        case 'opacity':
            return Number.parseFloat(value) >= 0.999 ? undefined : `opacity ${value}`;
        case 'visibility':
            return value === 'visible' ? undefined : `visibility ${value}`;
        case 'content-visibility':
            return value === 'visible' || value === '' ? undefined : `content-visibility ${value}`;
        case 'zoom':
            return Number.parseFloat(value) === 1 ? undefined : `zoom ${value}: it scales the glyphs under the computed size the type floor reads`;
        case 'font-size-adjust':
            return value === 'none' ? undefined : `font-size-adjust ${value}: it scales the glyphs under the computed size the type floor reads`;
        case 'word-spacing':
            return pxOf(value) < 0 ? `word-spacing ${value}: it pulls the figure's words onto each other` : undefined;
        case 'text-indent':
            return Number.parseFloat(value) < 0 ? `text-indent ${value}: it pushes the figure's first glyphs out of its line` : undefined;
        case 'letter-spacing':
            // Read per text run by `spacingPiles` (it needs the run's own text).
            return undefined;
        case '-webkit-text-fill-color':
            return value === cs.color ? undefined : `glyphs filled ${value} where its ink is ${cs.color}`;
        case '-webkit-text-stroke-width':
            return pxOf(value) > 0 ? `a text stroke ${value} wide over its glyphs' edges` : undefined;
        case '-webkit-text-security':
            return value === 'none' || value === '' ? undefined : `-webkit-text-security ${value}: every glyph drawn as a shape`;
        case 'background-clip':
        case '-webkit-background-clip':
            return /\btext\b/.test(value) ? `background-clip ${value}: its glyphs are painted by the background` : undefined;
        case 'background-color':
        case 'background-image':
            // Read together by `groundStackFault`, once per element.
            return undefined;
        case 'outline-style':
        case 'outline-width':
        case 'outline-offset':
            // Read against the ink by `outlineFault`, once per element.
            return undefined;
        case 'text-decoration-line':
        case 'text-decoration-thickness':
        case 'text-underline-offset':
            return undefined;
        case 'text-emphasis-style':
            return value === 'none' || value === '' ? undefined : `text-emphasis-style ${value}: a mark printed over every digit`;
        case 'text-shadow':
            return shadowFault(value, pxOf(cs.fontSize));
        case 'direction':
            return value === 'ltr' ? undefined : `direction ${value}: the figure and its unit are read in another order`;
        case 'unicode-bidi':
            return /override/.test(value) ? `unicode-bidi ${value}: the figure's characters are drawn in another order` : undefined;
        case 'writing-mode':
            return value === 'horizontal-tb' ? undefined : `writing-mode ${value}: a figure read across is read down`;
        case 'display':
            return /list-item/.test(value) ? `display ${value}: a marker printed beside the figure` : undefined;
        case 'animation-name':
            // Read keyframe by keyframe by `animationFaults`.
            return undefined;
        case 'content':
            return value === 'normal' || value === 'none' ? undefined : `content ${value.slice(0, 40)}: the element's own text replaced`;
        case 'color': {
            // The ink's own alpha is a fade like `opacity` (the re-review's
            // P1-2: `rgb(… / 0.06)` left "You pay" at 6% with every check
            // green). The fill is held to `color`, so it is held with it.
            // Resolved by the engine (round 5, the critic's P1-1): an ink in
            // a form no parser here took was no ink at all, and an ink mixed
            // at 6% at run time passed.
            const c = dressSingleColour(value);
            if (c === undefined) return `an ink this rule cannot read (${value.slice(0, 60)})`;
            return c.alpha < 0.999 ? `an ink at alpha ${Number(c.alpha.toFixed(3))} (${value.slice(0, 60)}): a faded ink is a faded figure` : undefined;
        }
        case 'backdrop-filter':
            return backdropFault(value);
        case 'text-overflow':
            return value === 'clip' || value === '' ? undefined : `text-overflow ${value}: an ellipsis printed in place of digits`;
        case 'line-clamp':
        case '-webkit-line-clamp':
            return value === 'none' || value === '' ? undefined : `${prop} ${value}: the figure's later lines cut away and an ellipsis printed in their place`;
        case '-webkit-writing-mode':
            return value === 'horizontal-tb' ? undefined : `writing-mode ${value}: a figure read across is read down`;
        case '-webkit-mask-box-image':
            return value === 'none' || value === '' ? undefined : `a mask border (${value.slice(0, 60)}): a mask fades the figure in any shape`;
        case '-webkit-text-decorations-in-effect':
            // The lines every box above it draws across its text, wherever
            // they are written (the walk in 2. reads the underline's geometry).
            return /line-through/.test(value)
                ? 'a line through it, drawn from a box above (a struck figure reads as withdrawn)'
                : /overline/.test(value)
                  ? 'a line over it, drawn from a box above'
                  : undefined;
        default:
            return undefined;
    }
}

/** Why an outline crosses an element's glyphs, or undefined: its inner edge stands outside every line's ink. */
function outlineFault(el: Element, cs: CSSStyleDeclaration): string | undefined {
    if (cs.outlineStyle === 'none' || cs.outlineStyle === 'hidden' || !(pxOf(cs.outlineWidth) > 0)) return undefined;
    const r = el.getBoundingClientRect();
    const o = pxOf(cs.outlineOffset);
    const inner = { left: r.left - o, right: r.right + o, top: r.top - o, bottom: r.bottom + o };
    const crossed = inkLines(el).find((l) => l.left < inner.left - 0.5 || l.right > inner.right + 0.5 || l.top < inner.top - 0.5 || l.bottom > inner.bottom + 0.5);
    return crossed === undefined
        ? undefined
        : `an outline (${cs.outlineWidth} ${cs.outlineStyle}, offset ${cs.outlineOffset}) drawn across its glyphs`;
}

/**
 * Why an outline of a box above the figure is drawn across its glyphs, or
 * undefined: from its parent up to and with its stall, an outline's ring —
 * between its inner edge (the border box moved out by `outline-offset`, in
 * by a negative one) and that edge grown by its width — meets no ink of the
 * figure (`inks`, in its own frame). An outline outside the box it rings
 * never reaches what that box holds; a negative offset draws it inside.
 */
function outlineAboveFault(node: HTMLElement, stall: Element, inks: () => readonly Box[]): string | undefined {
    for (let at = node.parentElement; at !== null && at.id !== 'app'; at = at.parentElement) {
        const cs = getComputedStyle(at);
        if (!(cs.outlineStyle === 'none' || cs.outlineStyle === 'hidden' || !(pxOf(cs.outlineWidth) > 0))) {
            const r = at.getBoundingClientRect();
            const o = pxOf(cs.outlineOffset);
            const inner: Box = { left: r.left - o, right: r.right + o, top: r.top - o, bottom: r.bottom + o };
            const ring = boxMinus(grown(inner, pxOf(cs.outlineWidth)), inner);
            if (inks().some((i) => ring.some((b) => meets(i, b)))) {
                return `${describe(at)} above it draws an outline (${cs.outlineWidth} ${cs.outlineStyle}, offset ${cs.outlineOffset}) across its glyphs`;
            }
        }
        if (at === stall) break;
    }
    return undefined;
}

/** A keyframe's camel-cased key as the longhand it names. */
const kebab = (key: string): string => (key === 'cssFloat' ? 'float' : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));

/**
 * The element a keyframe's value is resolved on: one per page, a block in a
 * fixed, zero-sized, hidden box outside the stall that contains its own
 * layout (`contain: strict`), so setting a value on it lays out that box
 * alone (a scratch put into the figure's own row and taken out again
 * re-laid the page out on the next read, every row) and a transform still
 * resolves to a matrix (on an element with no box it resolves to `none`). A
 * value that names a custom property is resolved where the box stands
 * instead, so the `var()` resolves as it would; a percentage in a keyframe
 * resolves against the scratch's empty box, which moves a shift and never
 * a turn or a scale.
 */
let keyframeScratch: HTMLElement | undefined;
function resolveKeyframe(el: Element, prop: string, raw: string): string {
    if (raw.includes('var(')) {
        const scratch = document.createElement('span');
        scratch.style.setProperty('all', 'unset');
        (el.parentElement ?? document.body).append(scratch);
        try {
            scratch.style.setProperty(prop, raw);
            return getComputedStyle(scratch).getPropertyValue(prop);
        } finally {
            scratch.remove();
        }
    }
    if (keyframeScratch === undefined || !keyframeScratch.isConnected) {
        const box = document.createElement('div');
        for (const [p, v] of [
            ['position', 'fixed'],
            ['left', '0'],
            ['top', '0'],
            ['width', '0'],
            ['height', '0'],
            ['overflow', 'hidden'],
            ['contain', 'strict'],
            ['visibility', 'hidden'],
            ['pointer-events', 'none'],
        ] as const) {
            box.style.setProperty(p, v);
        }
        keyframeScratch = document.createElement('div');
        box.append(keyframeScratch);
        document.body.append(box);
    }
    keyframeScratch.style.setProperty(prop, raw);
    const value = getComputedStyle(keyframeScratch).getPropertyValue(prop);
    keyframeScratch.style.removeProperty(prop);
    return value;
}

/**
 * Every keyframe of every animation or running transition on `el`: each
 * longhand `wants` names that a keyframe sets, resolved (`resolveKeyframe`)
 * and held by `judge`.
 */
function animationFaults(el: Element, wants: (prop: string) => boolean, judge: (prop: string, value: string) => string | undefined): string[] {
    const out: string[] = [];
    const anims = el.getAnimations();
    for (const anim of anims) {
        const effect = anim.effect;
        if (!(effect instanceof KeyframeEffect)) continue;
        const name = 'animationName' in anim ? String((anim as CSSAnimation).animationName) : 'a transition';
        for (const frame of effect.getKeyframes()) {
            for (const [key, raw] of Object.entries(frame)) {
                if (['offset', 'computedOffset', 'easing', 'composite'].includes(key) || typeof raw !== 'string') continue;
                const prop = kebab(key);
                if (!wants(prop)) continue;
                const why = judge(prop, resolveKeyframe(el, prop, raw));
                if (why !== undefined) out.push(`${why}, at ${Math.round((frame.computedOffset ?? 0) * 100)}% of ${name}`);
            }
        }
    }
    return out;
}

/** The held reads on a box between the figure and its surface (2.), or undefined. */
function boxHeldFault(prop: string, value: string, el: Element): string | undefined {
    switch (prop) {
        case 'opacity':
            if (Number.parseFloat(value) >= 0.999) return undefined;
            // The stream card says its figure is old by fading its plate.
            if (el.matches(".bc[data-state='stale'] .plate")) return undefined;
            return `opacity ${value}`;
        case 'filter':
            return value === 'none' ? undefined : `a filter (${value.slice(0, 60)})`;
        case 'mix-blend-mode':
            return value === 'normal' ? undefined : `mix-blend-mode ${value}`;
        case 'background-blend-mode':
            return blendsNormally(value) ? undefined : `background-blend-mode ${value.slice(0, 40)}`;
        case '-webkit-box-reflect':
            return value === 'none' ? undefined : `a reflection (${value.slice(0, 40)})`;
        case 'offset-path':
            return value === 'none' ? undefined : `a motion path (${value.slice(0, 40)})`;
        case 'zoom':
            return Number.parseFloat(value) === 1 ? undefined : `zoom ${value}`;
        case 'transform': {
            // A screen hung sideways turns the whole stall a quarter turn
            // (`[data-turn]`, window.css): the figure stands upright on the
            // screen it is painted for.
            const t = matrixParts(value);
            if (el.matches('.stall[data-turn]') && t !== undefined && Math.abs(Math.abs(t.deg) - 90) < 0.01 && Math.abs(t.sx - 1) < 0.001 && Math.abs(t.sy - 1) < 0.001 && t.det > 0) return undefined;
            return boxTransformFault(value);
        }
        case 'rotate':
            return boxRotateFault(value);
        case 'scale':
            return boxScaleFault(value);
        case 'backdrop-filter':
            return backdropFault(value);
        case 'visibility':
            // A box above the figure that is not visible paints no ground
            // and hides the figure unless the figure sets itself visible
            // again; held like opacity (before 8g2, the window's item 4,
            // the critic's PT). The keyframes are what PT ran it through.
            return value === 'visible' ? undefined : `visibility ${value}`;
        case 'content-visibility':
            // A box above the figure that skips its contents (`hidden`) does
            // not render the figure; one that skips them off-screen (`auto`)
            // is size- and paint-contained there, a clip `contain` does not
            // report and no clip read sees. Held to `visible`, at rest and
            // at its written value in a keyframe (before 8g2, the fourth
            // review's item 3, the critic's PCV): no served sheet sets it.
            return value === 'visible' || value === '' ? undefined : `content-visibility ${value}`;
        case 'translate':
            // A box moves where it stands, and the geometry reads at rest
            // see where; a translate that moves between them is
            // `keyframeHeld`'s.
            return undefined;
        case 'clip-path':
            // Read at rest against the ink (3.); a clip that moves is read at no instant.
            return undefined;
        case 'mask-image':
        case '-webkit-mask-image':
        case 'mask-border-source':
        case '-webkit-mask-box-image-source':
            // Any mask on a box above fails (4. at rest, `clipCut`); held here
            // for a keyframe and at a keyframe offset (before 8g2, the fifth
            // review's item 5: the critic's PMk, a gradient mask in a keyframe
            // on Rural's quote `.item-a`, seeked and read clean). At rest the
            // box read leaves it to 4. (`BOX_HELD_AT_REST`).
            return noMask(value) ? undefined : `a mask (${prop} ${value.slice(0, 60)}): a mask fades the figure in any shape`;
        default:
            return undefined;
    }
}
const BOX_HELD = [
    'opacity',
    'filter',
    'mix-blend-mode',
    'background-blend-mode',
    '-webkit-box-reflect',
    'offset-path',
    'zoom',
    'transform',
    'rotate',
    'scale',
    'translate',
    'visibility',
    'content-visibility',
    'backdrop-filter',
    'mask-image',
    '-webkit-mask-image',
    'mask-border-source',
    '-webkit-mask-box-image-source',
] as const;
/** The `BOX_HELD` longhands the box read holds at rest: every one but a mask's source, which 4. (`clipCut`) fails at rest wherever it stands above the figure, so it is said once. */
const BOX_HELD_AT_REST = BOX_HELD.filter((prop) => !/mask/.test(prop));

/**
 * The sizes a keyframe may not move on a box holding a figure (before 8g2,
 * the window's item 4): a box that shrinks, or whose tracks close, between
 * the instants can cut the figure where no reading at rest stood.
 */
const KEYFRAME_SIZES_LIST = [
    'width',
    'height',
    'min-width',
    'min-height',
    'max-width',
    'max-height',
    'inline-size',
    'block-size',
    'min-inline-size',
    'min-block-size',
    'max-inline-size',
    'max-block-size',
    'flex-basis',
    'grid-template-rows',
    'grid-template-columns',
] as const;
const KEYFRAME_SIZES: ReadonlySet<string> = new Set(KEYFRAME_SIZES_LIST);

/** A computed transform's translation, or undefined for one this read cannot take apart. */
function shiftOf(value: string): [number, number] | undefined {
    if (value === 'none') return [0, 0];
    const m = /^matrix\(([^)]*)\)$/.exec(value.trim());
    if (m === null) return undefined;
    const parts = m[1]!.split(',').map((n) => Number(n));
    return parts.length === 6 && parts.every(Number.isFinite) ? [parts[4]!, parts[5]!] : undefined;
}

/**
 * **A keyframe on a box above a figure is held as the box is held at rest**
 * (before 8g2, the window's item 4; the critic's PT): every property
 * `BOX_HELD` holds is held at every keyframe (`boxHeldFault`) — a keyframe
 * `visibility: hidden` among them — and what the geometry reads only at the
 * instants may not move: a clip-path, a translate or a transform's
 * translation that differs from the value the box computes when this rule
 * reads it — after `checkOverTime`, at the last of its six instants, not at
 * rest — fails, and so does any keyframe naming a size (`KEYFRAME_SIZES`),
 * whatever its value: sizes are never compared (the critic's third review,
 * item 5). The instants read an animation at six times through its active
 * phase, its delay zeroed, so a look's keyframe that moves, cuts or hides
 * the figure later, or between them, is read here by its values whenever it
 * runs. A box inside a moving or pinned ticker ribbon moves by design
 * (`cutSideways`'s one exception, by value).
 */
function keyframeHeld(prop: string, value: string, at: Element, cs: CSSStyleDeclaration): string | undefined {
    const ribbon = at.closest('[data-ribbon]');
    const runs = ribbon !== null && ribbon.getAttribute('data-ribbon') !== 'still';
    switch (prop) {
        case 'clip-path':
            return value !== cs.clipPath ? `a clip-path that moves (${value.slice(0, 40)})` : undefined;
        case 'translate':
            return runs || value === cs.translate ? undefined : `a translate that moves it (${value.slice(0, 40)}, at rest ${cs.translate})`;
        case 'transform': {
            const held = boxHeldFault(prop, value, at);
            if (held !== undefined || runs) return held;
            const [now, rest] = [shiftOf(value), shiftOf(cs.transform)];
            if (now === undefined || rest === undefined) return `a transform this read cannot take apart (${value.slice(0, 60)})`;
            return Math.abs(now[0] - rest[0]) > 0.5 || Math.abs(now[1] - rest[1]) > 0.5
                ? `a transform that moves it (${value.slice(0, 60)}, at rest ${cs.transform.slice(0, 40)})`
                : undefined;
        }
        default:
            return KEYFRAME_SIZES.has(prop) ? `a size that changes (${prop} ${value.slice(0, 40)})` : boxHeldFault(prop, value, at);
    }
}

/**
 * An untouched element's every longhand outside `stall` (the docblock's
 * reference), read once a page for each element a stall stands in: that
 * element is the same on every paint, and nothing a paint writes outside
 * the stall reaches a longhand the reference answers for (the own read asks
 * it only of the longhands no family frees and no condition holds).
 */
const dressRefs = new Map<Element, Map<string, string>>();
function dressReference(stall: Element): Map<string, string> {
    const host = stall.parentElement ?? document.body;
    let ref = dressRefs.get(host);
    if (ref === undefined) {
        ref = untouchedStyle(host);
        dressRefs.set(host, ref);
    }
    return ref;
}

/** Whether an element holds text of its own subtree. */
const holdsText = (el: Element): boolean => (el.textContent ?? '').trim() !== '';

/**
 * Whether `box` stands inside a polygon (`poly`, relative to `frame`'s top
 * left): every corner and every point along its edges every 2px inside, and
 * no vertex of the polygon inside it (a notch cut into the figure).
 */
function boxInPolygon(box: Box, poly: [number, number][], frame: DOMRect): boolean {
    const pts: [number, number][] = [];
    const w = box.right - box.left;
    const h = box.bottom - box.top;
    const nx = Math.max(1, Math.ceil(w / 2));
    const ny = Math.max(1, Math.ceil(h / 2));
    for (let i = 0; i <= nx; i += 1) {
        const x = box.left + (w * i) / nx;
        pts.push([x, box.top], [x, box.bottom]);
    }
    for (let j = 0; j <= ny; j += 1) {
        const y = box.top + (h * j) / ny;
        pts.push([box.left, y], [box.right, y]);
    }
    if (pts.some(([x, y]) => !pointInPolygon(x - frame.left, y - frame.top, poly))) return false;
    return !poly.some(([px, py]) => {
        const x = px + frame.left;
        const y = py + frame.top;
        return x > box.left + 0.5 && x < box.right - 0.5 && y > box.top + 0.5 && y < box.bottom - 0.5;
    });
}

/** A computed `clip: rect(...)` as a box over `el`'s border box, or undefined for a value this read does not parse. */
function clipRectOf(el: Element, value: string): Box | undefined {
    const m = /^rect\(([^)]*)\)$/.exec(value.trim());
    if (m === null) return undefined;
    const parts = m[1]!.split(/,\s*|\s+/);
    if (parts.length !== 4) return undefined;
    const r = el.getBoundingClientRect();
    const at = (v: string, auto: number, from: number): number => (v === 'auto' ? auto : from + pxOf(v));
    return {
        top: at(parts[0]!, r.top, r.top),
        right: at(parts[1]!, r.right, r.left),
        bottom: at(parts[2]!, r.bottom, r.top),
        left: at(parts[3]!, r.left, r.left),
    };
}

/** Whether a box clips, masks or `clip-path`s at all, once a measurement. */
let clipsSeen = new Map<Element, boolean>();
function clipsAtAll(el: Element): boolean {
    let known = clipsSeen.get(el);
    if (known === undefined) {
        const cs = getComputedStyle(el);
        known = cs.clipPath !== 'none' || cs.clip !== 'auto' || MASK_PROPS.some((p) => !noMask(cs.getPropertyValue(p).trim()));
        clipsSeen.set(el, known);
    }
    return known;
}

/** The boxes above `node` up to its stall, when one of them clips, masks or `clip-path`s at all; else undefined. */
function clipChainOf(node: HTMLElement): HTMLElement[] | undefined {
    const chain: HTMLElement[] = [];
    for (let at: HTMLElement | null = node.parentElement; at !== null; at = at.parentElement) {
        chain.push(at);
        if (at.classList.contains('stall') || at.id === 'app') break;
    }
    return chain.some(clipsAtAll) ? chain : undefined;
}

/** The transforms a clip read holds off, longhand by longhand. */
const HELD_OFF = ['transform', 'rotate', 'scale', 'translate'] as const;

/**
 * Hold every transform on `els` off while `read` runs, and put each back
 * through the CSSOM, longhand by longhand: the policy refuses an inline
 * `style` attribute (`style-src-attr`), so a `setAttribute('style', …)`
 * restore would leave a box without the inline declarations it had — the
 * stall's own custom properties among them — for every rule measured after.
 * A box that had no inline style is left with none.
 */
function withTransformsHeldOff<T>(els: Iterable<HTMLElement>, read: () => T): T {
    const turned = [...els].filter((el) => {
        const cs = getComputedStyle(el);
        return cs.transform !== 'none' || cs.rotate !== 'none' || cs.scale !== 'none' || cs.translate !== 'none';
    });
    return withHeldOff(turned, HELD_OFF, read);
}

/** Hold `props` at `none !important` on `els` while `read` runs, through the CSSOM, and put each back as it was (`withTransformsHeldOff`'s mechanism). */
function withHeldOff<T>(els: readonly HTMLElement[], props: readonly string[], read: () => T): T {
    const kept = els.map((el) => props.map((p) => [el.style.getPropertyValue(p), el.style.getPropertyPriority(p)] as const));
    const bare = els.map((el) => !el.hasAttribute('style'));
    for (const el of els) {
        for (const p of props) el.style.setProperty(p, 'none', 'important');
    }
    try {
        return read();
    } finally {
        els.forEach((el, i) => {
            props.forEach((p, j) => {
                const [value, priority] = kept[i]![j]!;
                if (value === '') el.style.removeProperty(p);
                else el.style.setProperty(p, value, priority);
            });
            if (bare[i] && el.getAttribute('style') === '') el.removeAttribute('style');
        });
    }
}

/**
 * A box's reference box for a basic shape (`border-box` by default): the
 * box `padding-box` and `content-box` name inside it, `margin-box` outside
 * it; `fill-box` is the content box and `stroke-box` and `view-box` the
 * border box, for a box with a CSS layout box.
 */
function referenceBox(el: Element, cs: CSSStyleDeclaration, keyword: string): DOMRect {
    const r = el.getBoundingClientRect();
    const n = (v: string): number => Number.parseFloat(v) || 0;
    const inset = (t: number, rr: number, b: number, l: number): DOMRect => new DOMRect(r.left + l, r.top + t, r.width - l - rr, r.height - t - b);
    const pad = (): [number, number, number, number] => [n(cs.borderTopWidth), n(cs.borderRightWidth), n(cs.borderBottomWidth), n(cs.borderLeftWidth)];
    switch (keyword) {
        case 'padding-box':
            return inset(...pad());
        case 'content-box':
        case 'fill-box': {
            const [t, rr, b, l] = pad();
            return inset(t + n(cs.paddingTop), rr + n(cs.paddingRight), b + n(cs.paddingBottom), l + n(cs.paddingLeft));
        }
        case 'margin-box':
            return inset(-n(cs.marginTop), -n(cs.marginRight), -n(cs.marginBottom), -n(cs.marginLeft));
        default:
            return r;
    }
}

/**
 * A computed `polygon(…)` with its reference box resolved (the re-review's
 * P3: `parsePolygon` reads a polygon against the border box and refuses a
 * keyword; here the keyword names the frame the vertices are written in),
 * or undefined for a grammar `parsePolygon` refuses.
 */
function polygonIn(el: Element, cs: CSSStyleDeclaration): { poly: [number, number][]; frame: DOMRect } | undefined {
    const value = cs.clipPath;
    const close = value.lastIndexOf(')');
    const keyword = value.slice(close + 1).trim();
    if (keyword !== '' && !/^(border-box|padding-box|content-box|margin-box|fill-box|stroke-box|view-box)$/.test(keyword)) return undefined;
    const frame = referenceBox(el, cs, keyword);
    const poly = parsePolygon(value.slice(0, close + 1), frame.width, frame.height);
    return poly === undefined ? undefined : { poly, frame };
}

/**
 * A computed `inset(… round …)` as its box and its fitted corner radii,
 * undefined for an inset with no `round`, and null for one this read does
 * not parse.
 */
function insetRounded(el: Element, value: string): { box: Box; radii: Radii } | null | undefined {
    const m = /^inset\((.*) round (.*)\)\s*(border-box|padding-box|content-box|margin-box|fill-box|stroke-box|view-box)?$/.exec(value.trim());
    if (m === null) return value.includes(' round ') ? null : undefined;
    const ref = referenceBox(el, getComputedStyle(el), m[3] ?? 'border-box');
    const len = (v: string, basis: number): number => (v.endsWith('%') ? (Number.parseFloat(v) / 100) * basis : Number.parseFloat(v));
    const [ts = '0', rs = ts, bs = ts, ls = rs] = m[1]!.trim().split(/\s+/);
    const [t, r, b, l] = [len(ts, ref.height), len(rs, ref.width), len(bs, ref.height), len(ls, ref.width)];
    if (![t, r, b, l].every((v) => Number.isFinite(v))) return null;
    const box: Box = { left: ref.left + l!, top: ref.top + t!, right: ref.right - r!, bottom: ref.bottom - b! };
    const [hs, vs] = m[2]!.split('/').map((p) => p.trim().split(/\s+/));
    const four = (vals: string[] | undefined, basis: number): number[] | undefined => {
        if (vals === undefined) return undefined;
        const [a = '0', bb = a, c = a, d = bb] = vals;
        const n = [a, bb, c, d].map((v) => len(v, basis));
        return n.every((v) => Number.isFinite(v)) ? n : undefined;
    };
    const w = box.right - box.left;
    const h = box.bottom - box.top;
    const hr = four(hs, ref.width);
    const vr = vs === undefined ? (hs === undefined ? undefined : four(hs, ref.height)) : four(vs, ref.height);
    if (hr === undefined || vr === undefined) return null;
    const radii = fittedRadii({ tl: [hr[0]!, vr[0]!], tr: [hr[1]!, vr[1]!], br: [hr[2]!, vr[2]!], bl: [hr[3]!, vr[3]!] }, w, h);
    return { box, radii };
}

/**
 * Why a clip on `chain` (the boxes above `node` up to its stall) cuts the
 * figure's ink, or undefined (3. in the docblock), read with every
 * transform from `node` to the stall held off (`withTransformsHeldOff`).
 */
function clipCut(node: HTMLElement, chain: readonly HTMLElement[]): string | undefined {
    const inks = inkLines(node);
    let scrolledBelow = '';
    for (const at of chain) {
        const cs = getComputedStyle(at);
        const where = describe(at);
        const mask = MASK_PROPS.map((p) => cs.getPropertyValue(p).trim()).find((v) => !noMask(v));
        if (mask !== undefined) return `stands under a mask on ${where} (${mask.slice(0, 60)}): a mask fades the figure in any shape`;
        if (cs.clip !== 'auto') {
            const box = clipRectOf(at, cs.clip);
            if (box === undefined) return `stands under a clip this rule cannot read on ${where} (${cs.clip})`;
            const out = inks.find((l) => l.left < box.left - 1 || l.right > box.right + 1 || l.top < box.top - 1 || l.bottom > box.bottom + 1);
            if (out !== undefined) return `has its ink cut by ${where}'s clip ${cs.clip}`;
        }
        if (cs.clipPath !== 'none') {
            if (scrolledBelow !== '') {
                return `stands under a clip-path on ${where} above ${scrolledBelow}, which scrolls: one reading at rest is not every scroll (${cs.clipPath.slice(0, 60)})`;
            }
            const shape = paintClips(at).find((c) => c.kind !== 'axes');
            let out: Box | undefined;
            const rounded = cs.clipPath.startsWith('inset(') ? insetRounded(at, cs.clipPath) : undefined;
            if (rounded === null) return `stands under a clip-path this rule cannot read on ${where}: ${cs.clipPath.slice(0, 60)}`;
            if (rounded !== undefined) {
                // An `inset(… round …)` is the box with its corners' curves
                // (`signInk`'s shape reads it square).
                out = inks.find((l) =>
                    [
                        [l.left, l.top],
                        [l.right, l.top],
                        [l.right, l.bottom],
                        [l.left, l.bottom],
                    ].some(([x, y]) => !insideRounded(rounded.box, rounded.radii, x!, y!)),
                );
            } else if (shape?.kind === 'shape') {
                out = inks.find((l) => !shape.inside(l));
            } else {
                const poly = cs.clipPath.startsWith('polygon(') ? polygonIn(at, cs) : undefined;
                if (poly === undefined) return `stands under a clip-path this rule cannot read on ${where}: ${cs.clipPath.slice(0, 60)}`;
                out = inks.find((l) => !boxInPolygon(l, poly.poly, poly.frame));
            }
            if (out !== undefined) {
                return `has its ink at ${Math.round(out.left)}–${Math.round(out.right)} × ${Math.round(out.top)}–${Math.round(out.bottom)} cut by ${where}'s clip-path ${cs.clipPath.slice(0, 60)}`;
            }
        }
        if (scrolledBelow === '' && paintClips(at).some((c) => c.kind === 'axes' && (c.scrollsX || c.scrollsY))) scrolledBelow = where;
    }
    return undefined;
}

/** A box's own faults as a box holding a figure (2.), once a measurement: siblings share their boxes. */
let boxFaultsSeen = new Map<Element, string[]>();
function boxFaults(at: HTMLElement): string[] {
    const known = boxFaultsSeen.get(at);
    if (known !== undefined) return known;
    const out: string[] = [];
    const cs = getComputedStyle(at);
    for (const prop of BOX_HELD_AT_REST) {
        const why = boxHeldFault(prop, cs.getPropertyValue(prop), at);
        if (why !== undefined) out.push(`${describe(at)} above it: ${why}`);
    }
    const line = decorationFault(cs);
    if (line !== undefined) out.push(`${describe(at)} above it draws ${line.replace(/^an? /, 'a ')}`);
    for (const why of animationFaults(
        at,
        (prop) => prop === 'clip-path' || KEYFRAME_SIZES.has(prop) || (BOX_HELD as readonly string[]).includes(prop),
        (prop, value) => keyframeHeld(prop, value, at, cs),
    )) {
        out.push(`${describe(at)} above it: ${why}`);
    }
    boxFaultsSeen.set(at, out);
    return out;
}

/** One money subject the dress rule reads: its own elements (`own`, the subject and every element under it with text but a broken figure's pieces), the clips above it (`chain`), and what the self-clip read found at a keyframe offset (`clip`, `offsetDressFaults`). */
type DressRead = { node: HTMLElement; stall: Element; faults: string[]; chain: HTMLElement[] | undefined; own: HTMLElement[]; clip: string[] };

/**
 * The held longhands whose read needs the geometry (`dressHeldFault` answers
 * nothing for them, by design): the spacing (`letter-spacing`, read per text
 * run by `spacingPiles`), the grounds under the glyphs (`groundStackFault`),
 * an outline's ring (`outlineFault`), the decoration line with its thickness
 * and offset (`decorationFault`), and `animation-name` (read keyframe by
 * keyframe by `animationFaults`).
 */
const OFFSET_GEOMETRY: ReadonlySet<string> = new Set([
    'letter-spacing',
    'background-color',
    'background-image',
    'outline-style',
    'outline-width',
    'outline-offset',
    'text-decoration-line',
    'text-decoration-thickness',
    'text-underline-offset',
    'animation-name',
]);

/**
 * The held longhands of a figure's own elements read again at each keyframe
 * offset (`offsetDressFaults`): every one of `DRESS_HELD` but the reads that
 * need the geometry (`OFFSET_GEOMETRY`), so every longhand `dressHeldFault`
 * decides from the value alone — the ink, its fill and its stroke; the fades
 * (an opacity, a filter, a blend, `visibility`, `content-visibility`); the
 * transforms; a clip-path, a clip or a mask; a zoom and `font-size-adjust`;
 * `word-spacing` and `text-indent`; a text shadow and an emphasis mark; the
 * order (`direction`, `unicode-bidi`, `writing-mode`); `display`, `content`,
 * an ellipsis and a line clamp; the lines a box above draws through it
 * (`-webkit-text-decorations-in-effect`). Derived, never copied: a longhand
 * added to `DRESS_HELD` is read at the offsets the day it is held
 * (`the-keyframe-offset-read-holds-every-held-longhand-the-value-decides`,
 * `layout/offsetHeld.test.ts`, which holds `OFFSET_GEOMETRY` to the
 * longhands `dressHeldFault` answers nothing for). Until before 8g2's fourth
 * review it was a list of 17 copied by hand, and a keyframe
 * `font-size-adjust: 0.05` on Rural's quote `.item-a` — the figure a 4.9px
 * speck from 12.5% to 74% of its loop — passed the whole runner (the
 * critic's PFA).
 */
const OFFSET_HELD_OWN: readonly string[] = [...DRESS_HELD].filter((prop) => !OFFSET_GEOMETRY.has(prop));

/** The keyframe-offset read's own counts (`offsetDressFaults`): animations seeked (and by name), those on money's ancestry left unseeked (`seekNeedless`), those seeked for the self-clip read alone (`layout`: off every figure's walk, or needless there, and setting a longhand `MOVES_NO_OTHER_BOX` does not name), those counted as moving another box only because an anchor can follow what they move (`anchored`, `ANCHOR_FOLLOWED`), seeks, subjects read at a seek, their grounds read again where a seek changed them (`offsetGroundFaults`), the self-clip reads made at a seek (`selfClipSentences`), failures found there; and its own time. */
const dressSeek = { anims: 0, needless: 0, layout: 0, anchored: 0, seeks: 0, reads: 0, grounds: 0, clips: 0, faults: 0, names: {} as Record<string, number> };
let dressSeekMs = 0;

/**
 * The longhands a keyframe may set and leave a figure's held dress
 * (`OFFSET_HELD_OWN`, `BOX_HELD`) as the pass's instant read it, at every
 * offset, but where the keyframe names it: none is inherited — or, where it
 * is (`visibility`), the declared value is held where it is written — and
 * each is either held at its written value by `animationFaults` and
 * `keyframeHeld` (a transform and its parts, an opacity, a filter, a blend,
 * a clip, a motion path, a zoom, `visibility`, a size) or reaches no held
 * longhand at all (where a box stands, its paints: a background, a shadow,
 * an outline, a border's colour). An animation that sets only these is not
 * seeked: the seek would read the values the declared read already holds.
 * Anything else a keyframe sets — a custom property, an inherited ink or
 * shadow, a font, a property this list does not name — is seeked.
 *
 * **`content-visibility` is not here** (before 8g2, the fourth review's
 * item 3): this list said it was held at its written value, and on a box
 * above the figure nothing held it (`BOX_HELD` did not name it), so the
 * critic's PCV — a keyframe `content-visibility: hidden` from 25% to 68% of
 * a loop on Rural's quote `.item-a` — was skipped by the offset read and
 * red only by accident, through the size containment that collapsed the
 * box. It is held on a box above now (`BOX_HELD`, at rest and at its
 * written value in a keyframe), and an animation that sets it is seeked,
 * so the figure's own `rendersAt` reads what it does at each offset.
 *
 * **Nor a ground or a shadow** (the same review's item 2, the critic's PG):
 * a background's colour or image and a box shadow were here as reaching no
 * held longhand, which is true and not enough — PG's `background-color:
 * var(--s-text)` from 25% to 68% of a loop on Rural's quote `.item-a` sets
 * the figure on its own ink there, and nothing read the ground but at rest
 * and at the last instant. An animation that sets one is seeked now, and the
 * ground under the glyphs is read at each offset where the seek changed it
 * (`offsetGroundFaults`); one that sets only grounds, shadows and longhands
 * on this list skips the held reads at its seeks (`GROUND_ONLY`), since it
 * can change no held longhand, and one that sets only an outer shadow on a
 * box every figure it reaches stands inside is not seeked at all
 * (`outerShadowOnly`: such a shadow paints outside that box). A background
 * that moves or grows (its position, its size) stays here for a box above
 * the figure, whose background image the ground read does not read; on the
 * figure or one of its own elements it is seeked (`SEEK_ON_OWN`, the fifth
 * review's item 4: the critic's PGpos), and the ground read reads where its
 * tile lands at each offset.
 *
 * **Nor a box's offsets, nor a size on a figure's own element** (the fifth
 * review's item 3, the critic's PTI; D (2)(a), the self-clip read at each
 * offset): `left`, `top`, `right` and `bottom` were here as held by the
 * geometry, and nothing holds them — a relatively positioned box moved by
 * them carries the figure inside a clip, as PTI's `text-indent` and a margin
 * do — so an animation that sets one is seeked, and the self-clip read
 * (`selfClipSentences`) reads at each offset whether the figure's text is
 * cut. A size is held on a box above (`keyframeHeld` refuses any keyframe
 * naming one) and stays needless there; on one of a figure's own elements
 * nothing holds it, so there it is seeked (`SEEK_ON_OWN`).
 */
const SEEK_NEEDLESS: ReadonlySet<string> = new Set([
    'transform',
    'rotate',
    'scale',
    'translate',
    'opacity',
    'filter',
    'backdrop-filter',
    'mix-blend-mode',
    'clip-path',
    'offset-path',
    'offset-distance',
    'offset-rotate',
    'zoom',
    'visibility',
    ...KEYFRAME_SIZES_LIST,
    'background-position',
    'background-position-x',
    'background-position-y',
    'background-size',
    'outline-color',
    'outline-width',
    'outline-offset',
    'outline-style',
]);

/**
 * The `SEEK_NEEDLESS` longhands seeked all the same when the animated box is
 * one of a figure's own elements (`seekNeedless`): a size, which on a box
 * above is refused at its written value (`keyframeHeld`) and on the figure
 * itself is held by nothing but the self-clip read at the offset; and a
 * background's position and size (before 8g2, the fifth review's item 4),
 * which on a box above move a background image the ground read does not
 * read there, and on the figure's own elements move the tile the ground read
 * reads under its glyphs (`GROUND_SIGNATURE` names them, `layerCovers` reads
 * where a tile lands). The critic's PGpos — Rural's quote `.item-x` on its
 * own ink, `var(--s-text)`, under one tile of the page's ground, and a
 * keyframe moving the tile 400px off the box from 25% to 68% of a loop —
 * was never seeked, and passed the whole runner; the same paint at rest
 * failed 28 times at 1.00:1.
 */
const SEEK_ON_OWN: ReadonlySet<string> = new Set([
    ...KEYFRAME_SIZES_LIST,
    'background-position',
    'background-position-x',
    'background-position-y',
    'background-size',
]);

/**
 * The longhands a box's paints are read from by the ground read
 * (`boxPaintsOf`, `groundStackFault`), with the ink they are judged against:
 * an element whose values of these differ at a keyframe offset from the
 * pass's last instant has a ground, or an ink, the seek changed
 * (`offsetGroundFaults`). A box above the figure is compared on
 * `GROUND_ABOVE` alone: its background image is not read there (a
 * decoration's paint, the contrast pass's), so a decoration's custom
 * property turning a root's gradient — the aurora's tide, the sunburst's
 * angle — changes nothing the ground read sees. Every longhand
 * `boxPaintsOf` reads is here, those it reads of a box above before
 * `GROUND_ABOVE` and those it reads of a figure's own elements alone after
 * it (`the-ground-signature-names-every-longhand-boxPaintsOf-and-borderImageReach-read`,
 * `layout/offsetHeld.test.ts`): the sixth review's PGatt3 — a keyframe
 * `background-attachment: fixed` from 30% to 40% of a loop on Modern's
 * quote `.item-x`, painted on its own ink under one tile of the page's
 * ground — was seeked and its ground never read again, the attachment not
 * being here; the paddings, which place a box's content box (a background
 * clipped or placed there), were not here either. Where the glyphs move
 * over a ground that stays (a padding, an indent, a margin), no longhand
 * here changes, and the ground is read again by the ink's own move
 * (`inkSignature`, the sixth review's PGpad).
 */
const GROUND_SIGNATURE = [
    'color',
    '-webkit-text-fill-color',
    'background-color',
    'background-clip',
    'box-shadow',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-image-source',
    'border-image-slice',
    'border-image-outset',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'background-image',
    'background-attachment',
    'background-origin',
    'background-repeat',
    'background-size',
    'background-position-x',
    'background-position-y',
] as const;
/** How many of `GROUND_SIGNATURE`'s longhands a box above the figure is compared on: all but its background image's (`boxPaintsOf` reads none there). */
const GROUND_ABOVE = GROUND_SIGNATURE.indexOf('background-image');

/**
 * The longhands that change a box's paints and nothing a held read holds: a
 * background's colour or image (the shorthand is these to a keyframe), where
 * its tile stands and how large (the fifth review's item 4) and what it is
 * fixed to (the sixth review's PGatt3), a box shadow and its prefixed twin,
 * a border's colour. An animation that sets only
 * these and `SEEK_NEEDLESS` longhands is seeked for the ground read alone
 * (`offsetGroundFaults`); the held reads, which no ground or shadow can
 * move, are not made at its seeks.
 */
const GROUND_ONLY: ReadonlySet<string> = new Set([
    'background-color',
    'background-image',
    'background-attachment',
    'background-position',
    'background-position-x',
    'background-position-y',
    'background-size',
    'box-shadow',
    '-webkit-box-shadow',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
]);

/**
 * What the page's sheets say, read once a page and again when a sheet is
 * added (`sheetKey`): every property each `@keyframes` rule declares, by
 * name, custom properties included (`getKeyframes()` lists none of them for
 * a CSS animation: the critic's PT2 reads as four empty keyframes there);
 * and whether an anchor can stand anywhere on the page (`anchors`): some
 * rule, keyframe or nested rule of a sheet declares `anchor-name` at a value
 * other than `none` (`@import`ed sheets read too), or a sheet this page
 * cannot read (which may), the seventh review's B1.
 */
let sheetFactsRead: { key: string; byName: Map<string, Set<string>>; anchors: boolean } | undefined;
const sheetKey = (): string => `${document.styleSheets.length}:${document.adoptedStyleSheets.length}`;
function sheetFacts(): { byName: Map<string, Set<string>>; anchors: boolean } {
    const key = sheetKey();
    if (sheetFactsRead?.key !== key) {
        const byName = new Map<string, Set<string>>();
        let anchors = false;
        const names = (style: CSSStyleDeclaration): void => {
            const value = style.getPropertyValue('anchor-name').trim();
            if (value !== '' && value !== 'none') anchors = true;
        };
        const walk = (rules: CSSRuleList): void => {
            for (const rule of rules) {
                if (rule instanceof CSSKeyframesRule) {
                    const props = byName.get(rule.name) ?? new Set<string>();
                    for (const frame of rule.cssRules) {
                        const style = (frame as CSSKeyframeRule).style;
                        names(style);
                        for (let i = 0; i < style.length; i += 1) props.add(style.item(i));
                    }
                    byName.set(rule.name, props);
                    continue;
                }
                if ('style' in rule && (rule as CSSStyleRule).style instanceof CSSStyleDeclaration) names((rule as CSSStyleRule).style);
                if (rule instanceof CSSImportRule) {
                    try {
                        if (rule.styleSheet !== null) walk(rule.styleSheet.cssRules);
                    } catch {
                        anchors = true;
                    }
                }
                if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
            }
        };
        for (const sheet of [...document.styleSheets, ...document.adoptedStyleSheets]) {
            try {
                walk(sheet.cssRules);
            } catch {
                // A sheet this page cannot read: its keyframes are not known, and an animation that runs one is seeked; an anchor may stand in it.
                anchors = true;
            }
        }
        sheetFactsRead = { key, byName, anchors };
    }
    return sheetFactsRead;
}
/** Every property the `@keyframes` rule of that name declares (`sheetFacts`), or undefined for a name no sheet this page can read declares. */
const keyframesDeclare = (name: string): ReadonlySet<string> | undefined => sheetFacts().byName.get(name);

/** Whether one longhand a keyframe sets is needless to seek (`SEEK_NEEDLESS`), on one of a figure's own elements (`own`, where `SEEK_ON_OWN` is seeked) or on a box above. */
const needlessHere = (prop: string, own: boolean): boolean => SEEK_NEEDLESS.has(prop) && !(own && SEEK_ON_OWN.has(prop));

/**
 * The longhands a keyframe may set and leave every box that does not hold
 * the animated one where it stands, at its size — **with no anchor to
 * follow them** (`movesOtherBoxes`; before 8g2, the sixth review's P1-a and
 * its PSQ2, and the seventh review's B1):
 *
 * - **the paints**: an ink and its fill and stroke, a caret's and an
 *   accent's colour, a background and its tile, a border's colour, a box
 *   shadow and a text shadow, an outline (drawn outside the layout), a text
 *   decoration's line, colour, style, thickness, offset and skip, an
 *   emphasis mark's colour, an SVG paint;
 * - **the compositing**: an opacity, a filter, a backdrop filter, a blend,
 *   an isolation, a `clip`, a `clip-path`, a mask and its parts, a mask
 *   border, a stacking order, a cursor and `pointer-events`;
 * - **what moves or turns the animated box and what it holds**: a
 *   transform, its parts, its origin, its box and its style, a perspective
 *   and its origin, `backface-visibility`, a motion path and its parts, and
 *   a box's offsets (`left`, `top`, `right`, `bottom` and `inset`'s
 *   longhands: a relatively positioned box is offset after the layout, an
 *   absolutely positioned one stands out of the flow) — **and every box
 *   positioned against an anchor they carry**: in Chrome 156 a box placed
 *   by `anchor()` and sized by `anchor-size()` follows its anchor's
 *   transform, `rotate`, `scale` (its size too), `translate`, origin, box, a
 *   host's perspective and its origin, motion path and its parts and
 *   offsets (`ANCHOR_FOLLOWED`, measured one longhand at a time: the
 *   seventh review's PAN, the figure the wallet signs anchored to its unit,
 *   which a keyframe `translate` carried out of its row's clip). So where an
 *   anchor can follow them (`anchorCanFollow`: a sheet that declares
 *   `anchor-name`, or one this page cannot read, an animation that sets it,
 *   or an anchor name the animated box or a box under it computes), an
 *   animation that sets one of `ANCHOR_FOLLOWED` counts as moving another
 *   box.
 *
 * **Not `visibility`**: a table row's or a table column's `visibility`
 * from `collapse` to `visible` lays the row out and moves the next one
 * (the seventh review's PVC: a collapsed `::before` row before the pay
 * figure, made visible by a keyframe, pushed the figure out of a 52px
 * clip; measured in Chrome 156, a flex or grid item's does not move its
 * neighbour), so an animation that sets it can move another box.
 *
 * The self-clip read (`selfClipSentences`) reads a figure's text against
 * the figure's own box and the boxes above it up to its surface, and, with
 * no anchor to follow them, none of these moves one that does not hold the
 * animated box: so an animation that sets only these cuts no figure but one
 * it holds, and a figure it holds is on its walk, where the offset read
 * reads it already (with the turns held off, as the self-clip read always
 * reads). **Anything else** — a size, a margin, a padding, a border's width
 * or style, a font, a spacing, an indent, a line height, a grid or flex
 * track, an order, `display`, `visibility`, `zoom`, `content-visibility`, a
 * custom property (which can feed any of them through `var()`), a property
 * this list does not name, a keyframe rule this page cannot read — can move
 * another box, and its animation is seeked for the self-clip read of every
 * money figure on the paint, wherever it runs (`offsetDressFaults`). PSQ2: a
 * keyframe `margin-inline-start: calc(100% - 70px)` on the pay figure's
 * unit sibling, `.item-u`, from 30% to 40% of a 100s loop, squeezed the
 * figure the wallet signs inside its own `overflow-x: clip` at desk width,
 * and nothing seeked it: it ran on no box of the figure's walk.
 */
const MOVES_NO_OTHER_BOX: ReadonlySet<string> = new Set([
    'color',
    '-webkit-text-fill-color',
    '-webkit-text-stroke-color',
    '-webkit-text-stroke-width',
    'caret-color',
    'accent-color',
    'background-color',
    'background-image',
    'background-position',
    'background-position-x',
    'background-position-y',
    'background-size',
    'background-repeat',
    'background-origin',
    'background-clip',
    'background-attachment',
    'background-blend-mode',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-block-start-color',
    'border-block-end-color',
    'border-inline-start-color',
    'border-inline-end-color',
    'box-shadow',
    '-webkit-box-shadow',
    'text-shadow',
    'outline-color',
    'outline-style',
    'outline-width',
    'outline-offset',
    'text-decoration-line',
    'text-decoration-color',
    'text-decoration-style',
    'text-decoration-thickness',
    'text-decoration-skip-ink',
    'text-underline-offset',
    'text-emphasis-color',
    'fill',
    'fill-opacity',
    'stroke',
    'stroke-opacity',
    'stroke-width',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stop-color',
    'stop-opacity',
    'flood-color',
    'flood-opacity',
    'lighting-color',
    'opacity',
    'filter',
    'backdrop-filter',
    'mix-blend-mode',
    'isolation',
    'clip',
    'clip-path',
    'mask-image',
    'mask-position',
    'mask-position-x',
    'mask-position-y',
    'mask-size',
    'mask-repeat',
    'mask-origin',
    'mask-clip',
    'mask-composite',
    'mask-mode',
    'mask-type',
    'mask-border-source',
    'mask-border-slice',
    'mask-border-width',
    'mask-border-outset',
    'mask-border-repeat',
    'mask-border-mode',
    '-webkit-mask-image',
    '-webkit-mask-position',
    '-webkit-mask-position-x',
    '-webkit-mask-position-y',
    '-webkit-mask-size',
    '-webkit-mask-repeat',
    '-webkit-mask-origin',
    '-webkit-mask-clip',
    '-webkit-mask-composite',
    '-webkit-mask-box-image',
    '-webkit-mask-box-image-source',
    '-webkit-mask-box-image-slice',
    '-webkit-mask-box-image-width',
    '-webkit-mask-box-image-outset',
    '-webkit-mask-box-image-repeat',
    'z-index',
    'cursor',
    'pointer-events',
    'transform',
    'rotate',
    'scale',
    'translate',
    'transform-origin',
    'transform-box',
    'transform-style',
    'perspective',
    'perspective-origin',
    'backface-visibility',
    'offset-path',
    'offset-distance',
    'offset-rotate',
    'offset-anchor',
    'offset-position',
    'left',
    'top',
    'right',
    'bottom',
    'inset-block-start',
    'inset-block-end',
    'inset-inline-start',
    'inset-inline-end',
]);

/**
 * The longhands of `MOVES_NO_OTHER_BOX` that move a box an anchor can be:
 * set on the anchor, or on a box above it, each moves the anchor's box as
 * the page draws it, and a box positioned against the anchor with
 * `anchor()` follows it — measured in Chrome 156 one longhand at a time
 * (before 8g2, the seventh review's B1;
 * `private/design/workshop-2026-09-23/before-8g2/critic7-fixes/pages/anchor-follows.html`
 * and `anchor-3d.html`): the transform and its parts (`scale` resizes what
 * `anchor-size()` reads), the origin and the transform box (under a turn
 * at rest), a host's perspective and its origin (over a 3D child), the
 * motion path and its parts, and the offsets. `transform-style` on a host
 * moves the anchor's drawn box and Chrome 156's anchored box did not follow
 * it; it is counted anyway, the anchor having moved. Measured to move
 * neither: `backface-visibility`, and every paint and compositing longhand
 * of the list. `perspective` on the anchor itself moves nothing (it shapes
 * its children); on a host it moves the anchor, which is why it is here.
 */
const ANCHOR_FOLLOWED: ReadonlySet<string> = new Set([
    'transform',
    'rotate',
    'scale',
    'translate',
    'transform-origin',
    'transform-box',
    'transform-style',
    'perspective',
    'perspective-origin',
    'offset-path',
    'offset-distance',
    'offset-rotate',
    'offset-anchor',
    'offset-position',
    'left',
    'top',
    'right',
    'bottom',
    'inset-block-start',
    'inset-block-end',
    'inset-inline-start',
    'inset-inline-end',
]);

/** `movesOtherBoxes` of each CSS animation by name, while the page's sheets stand (`sheetKey`). */
let movesByName: { key: string; byName: Map<string, { others: boolean; follows: boolean }> } = { key: '', byName: new Map() };

/**
 * What an animation's keyframes can move: `others` — a box other than the
 * one it runs on, with no anchor to follow it — unless every longhand they
 * set is on `MOVES_NO_OTHER_BOX`, and true for a keyframe rule this page
 * cannot read; `follows` where one of them is on `ANCHOR_FOLLOWED`, which
 * an anchored box follows (`anchorCanFollow` decides whether one can).
 */
function movesOtherBoxes(anim: Animation, effect: KeyframeEffect): { others: boolean; follows: boolean } {
    const props = keyframeProps(anim, effect);
    if (props === undefined) return { others: true, follows: true };
    return { others: ![...props].every((prop) => MOVES_NO_OTHER_BOX.has(prop)), follows: [...props].some((prop) => ANCHOR_FOLLOWED.has(prop)) };
}

/**
 * Whether an anchor can follow what an animation moves (`ANCHOR_FOLLOWED`;
 * before 8g2, the seventh review's B1): a sheet of the page declares
 * `anchor-name` or cannot be read (`sheetFacts`), or an animation on the
 * page sets it (`pageAnchors`), or the animated box — a pseudo-element
 * included — or an element under it computes an `anchor-name` other than
 * `none` (one set by script, which no sheet declares). Read before any
 * animation is seeked, while the style is the pass's last instant's.
 */
function anchorCanFollow(target: Element, pseudo: string | null, pageAnchors: boolean): boolean {
    if (pageAnchors) return true;
    if (getComputedStyle(target, pseudo).getPropertyValue('anchor-name') !== 'none') return true;
    if (pseudo !== null) return false;
    for (const el of target.querySelectorAll('*')) if (getComputedStyle(el).getPropertyValue('anchor-name') !== 'none') return true;
    return false;
}

/**
 * Whether seeking an animation could show the held dress anything the
 * declared reads did not (`SEEK_NEEDLESS`): false only when every property
 * it sets is on that list, for the box it runs on (`needlessHere`) — read
 * from its `@keyframes` rule for a CSS animation, and from its keyframes
 * for anything else.
 */
function seekNeedless(anim: Animation, effect: KeyframeEffect, own: boolean): boolean {
    const props = keyframeProps(anim, effect);
    return props !== undefined && [...props].every((prop) => needlessHere(prop, own));
}

/**
 * Every longhand an animation's keyframes set — read from its `@keyframes`
 * rule for a CSS animation, custom properties included, and from its
 * keyframes for anything else — or undefined for a CSS animation whose rule
 * this page cannot read.
 */
function keyframeProps(anim: Animation, effect: KeyframeEffect): ReadonlySet<string> | undefined {
    const props = new Set<string>();
    for (const frame of effect.getKeyframes()) {
        for (const key of Object.keys(frame)) {
            if (!['offset', 'computedOffset', 'easing', 'composite'].includes(key)) props.add(kebab(key));
        }
    }
    if (anim instanceof CSSAnimation) {
        const declared = keyframesDeclare(anim.animationName);
        if (declared === undefined) return undefined;
        for (const prop of declared) props.add(prop);
    }
    return props;
}

/** Whether an animation changes a box's paints and nothing a held read holds (`GROUND_ONLY`, `SEEK_NEEDLESS` for the box it runs on). */
function groundOnly(anim: Animation, effect: KeyframeEffect, own: boolean): boolean {
    const props = keyframeProps(anim, effect);
    return props !== undefined && [...props].every((prop) => GROUND_ONLY.has(prop) || needlessHere(prop, own));
}

/** An element's ground as the ground read sees it (`GROUND_SIGNATURE`): the whole list for one of the figure's own elements, the first `GROUND_ABOVE` for a box above it. */
function groundSignature(el: Element, own: boolean): string {
    const cs = getComputedStyle(el);
    return (own ? GROUND_SIGNATURE : GROUND_SIGNATURE.slice(0, GROUND_ABOVE)).map((prop) => cs.getPropertyValue(prop)).join('|');
}
/** The ground signatures the offset read compares against (`offsetDressFaults`), as the pass's last instant left them, by element and by whether it is a figure's own. */
let restGround = new Map<string, string>();
/**
 * Where a figure's text stands, as its text's client rects to a hundredth
 * of a pixel (`offsetGroundFaults`): a seek that moves the glyphs (a
 * padding, an indent, a margin) moves them over a ground that may stay
 * still, which no `GROUND_SIGNATURE` longhand says — the sixth review's
 * PGpad, a keyframe `padding-top: 80px` on Modern's quote `.item-x` under
 * a 60px tile of the page's ground, the glyphs 80px down on the figure's
 * own ink, seeked and read clean. The rects the self-clip read reads.
 */
function inkSignature(node: Element): string {
    const range = document.createRange();
    range.selectNodeContents(node);
    return [...range.getClientRects()]
        .filter((r) => r.width > 0 && r.height > 0)
        .map((r) => `${r.left.toFixed(2)},${r.top.toFixed(2)},${r.width.toFixed(2)},${r.height.toFixed(2)}`)
        .join(';');
}
/** Each figure's `inkSignature` as the pass's last instant left it (`offsetDressFaults`). */
let restInk = new Map<Element, string>();
const groundKeys = new WeakMap<Element, number>();
let groundKeyNext = 0;
/** A key for an element's signature in `restGround`, by element and by the list it is read on. */
function groundKey(el: Element, own: boolean): string {
    let id = groundKeys.get(el);
    if (id === undefined) {
        id = groundKeyNext;
        groundKeyNext += 1;
        groundKeys.set(el, id);
    }
    return `${id}|${own ? 'own' : 'above'}`;
}

/**
 * Whether an animation changes only a shadow outside the box above every
 * figure it reaches (`offsetDressFaults` leaves it unseeked): it runs on a
 * box above each of them, its keyframes set a box shadow and nothing that is
 * not `SEEK_NEEDLESS`, every keyframe's shadow as the engine resolves it
 * (`getKeyframes()`, its `var()`s substituted) has no inset layer, and each
 * figure stands inside the box with a quarter of its own size to spare. An
 * outer shadow paints outside its box's border, under no glyph of a figure
 * that stands inside it. Neo's card pulse on every row head is the case on
 * the clean tree.
 */
function outerShadowOnly(anim: Animation, effect: KeyframeEffect, target: Element, reads: readonly DressRead[]): boolean {
    const props = keyframeProps(anim, effect);
    if (props === undefined || ![...props].every((prop) => prop === 'box-shadow' || prop === '-webkit-box-shadow' || SEEK_NEEDLESS.has(prop))) return false;
    for (const frame of effect.getKeyframes()) {
        const value = (frame as Record<string, unknown>).boxShadow;
        if (value === undefined) continue;
        if (typeof value !== 'string' || value.includes('var(') || /\binset\b/.test(value)) return false;
    }
    const box = target.getBoundingClientRect();
    return reads.every((r) => {
        if (r.node === target || !target.contains(r.node)) return false;
        const n = r.node.getBoundingClientRect();
        const spare = 0.25 * (Number.parseFloat(getComputedStyle(r.node).fontSize) || 16);
        return n.left - spare >= box.left && n.right + spare <= box.right && n.top - spare >= box.top && n.bottom + spare <= box.bottom;
    });
}

/**
 * The elements a keyframe on `target` can change a figure's ground from: its
 * own elements under the animated box, and the boxes from the figure's
 * parent up to the animated box when it stands above the figure.
 */
function groundWalk(r: DressRead, target: Element): [Element, boolean][] {
    const out: [Element, boolean][] = r.own.filter((el) => el === target || target.contains(el)).map((el) => [el, true]);
    if (target !== r.node && target.contains(r.node)) {
        for (let box = r.node.parentElement; box !== null; box = box.parentElement) {
            out.push([box, false]);
            if (box === target) break;
        }
    }
    return out;
}

/**
 * **The ground under a figure's glyphs at a keyframe offset** (before 8g2,
 * the fourth review's item 2, the critic's PG; D-2026-10-26-04): where the
 * seek changed the ground or the ink of an element on a figure's walk — one
 * of its own elements under the animated box, or a box from its parent up to
 * the animated box (`groundWalk`, compared by `groundSignature` against the
 * pass's last instant) — or moved the figure's text (`inkSignature`, the
 * sixth review's PGpad: a padding, an indent or a margin carries the glyphs
 * over a ground that stays), the ground under the glyphs of each of its own
 * elements under the animated box is read again (`groundStackFault`), its
 * paints read fresh at this offset (`paintsHere`). PG — `background-color:
 * var(--s-text)` from 25% to 68% of a loop on Rural's quote `.item-a` —
 * puts the figure on its own ink there and read clean at rest, at 400ms and
 * at the last instant. The first-party look lint refuses a ground or a
 * shadow in a keyframe (`a-keyframe-never-sets-a-ground-or-a-shadow`); this
 * is the kit's road, and it reads a ground changed through a custom
 * property or an ink too, which the lint's belt does not name. A failure
 * says the animation, its box and the offset.
 *
 * **Not read, stated**: a box above's background image, here as at rest (a
 * decoration's paint, the contrast pass's on the screens it samples), and so
 * a ground its position or size moves (`SEEK_NEEDLESS` there; on the
 * figure's own elements they are seeked, `SEEK_ON_OWN`); a ground between
 * two offsets; a pseudo-element's animation; an animation off the figure's
 * walk (seeked for the self-clip read alone, `movesOtherBoxes`); and a
 * ground box above that moves while the glyphs stand still — a size on it
 * (refused at its written value, `keyframeHeld`), or its offsets or margin
 * over a figure positioned against a box above it.
 */
function offsetGroundFaults(r: DressRead, target: Element, at: string, paintsHere: { own: Map<Element, BoxPaints>; above: Map<Element, BoxPaints> }): string[] {
    const inkMoved = inkSignature(r.node) !== restInk.get(r.node);
    if (!inkMoved && !groundWalk(r, target).some(([el, own]) => groundSignature(el, own) !== restGround.get(groundKey(el, own)))) return [];
    dressSeek.grounds += 1;
    const out: string[] = [];
    const kept = { own: ownPaintsSeen, above: abovePaintsSeen };
    ownPaintsSeen = paintsHere.own;
    abovePaintsSeen = paintsHere.above;
    try {
        for (const el of r.own) {
            if (el !== target && !target.contains(el)) continue;
            const why = groundStackFault(el, getComputedStyle(el), r.stall, () => inkLines(el));
            if (why !== undefined) out.push(`${el === r.node ? 'it' : describe(el)}: ${why}, ${at}`);
        }
    } finally {
        ownPaintsSeen = kept.own;
        abovePaintsSeen = kept.above;
    }
    return out;
}

/**
 * **The held dress at every keyframe offset** (before 8g2, the critic's
 * third review, item 1: PT2; D-2026-10-26-03). `animationFaults` and
 * `keyframeHeld` read the longhands a keyframe NAMES, at their written
 * values; a keyframe that sets a custom property (`--s-text: transparent`)
 * or an inherited ink on a box above names none of them, and changes the
 * figure's dress through the cascade, so the critic's PT2 — Rural's quote
 * figure, whose ink is `var(--s-text)`, made clear by a keyframe on the
 * custom property on its `.item-a`, from 12.5% to 84% of a 100s loop — read
 * clean at rest, at 400ms and at the last of the six instants, under every
 * rule. Here every animation whose target is a figure, an element under it
 * with text (`own`), or a box above it up to and with its stall — the
 * animations of `document.getAnimations()` on an element, not a
 * pseudo-element, which nothing inherits from — save one whose keyframes
 * set only longhands the declared reads hold already or that reach no held
 * longhand (`seekNeedless`, `SEEK_NEEDLESS`), is seeked to each of its own
 * keyframe offsets (and 0 and 1), alone, every other animation standing
 * where the pass's last instant left it: its timing set for the read to one
 * normal, linear iteration filled both ways with no delay, so the time
 * `offset × duration` is that keyframe's own value, and both put back after.
 * At each offset every figure it can reach is read as the dress rule holds
 * it at rest: rendered still; each of its own elements under the animated
 * box, held on `OFFSET_HELD_OWN` by `dressHeldFault`, and compared on every
 * longhand no family frees and none holds (`dressReadList().rest`) with the
 * untouched reference (the fifth review's item 9: the rest was compared at
 * rest alone; `text-fit` is the one such longhand in Chrome 156); every box between
 * the figure and the animated box, held on `BOX_HELD` by `boxHeldFault`;
 * and, where the seek changed a ground or an ink on its walk, the ground
 * under its glyphs (`offsetGroundFaults`; the fourth review's item 2, PG);
 * and **whether its text is cut** (`selfClipSentences`, the self-clip rule's
 * own read, `a-money-figure-never-clips-itself`; the fifth review's item 3,
 * D (2)(a)): the critic's PTI — `.pay-x-n { width: 100%; min-width: 0;
 * overflow-x: clip }` at rest and a keyframe `text-indent: 2400px` from 25%
 * to 68% of a 100s loop, the figure the wallet signs pushed out of its own
 * clip — was seeked and read clean, the indent held negative-only and the
 * self-clip rule reading at the pass's last instant alone. A figure that
 * rule found cut there is not read again (`selfClipCutNow`); one cut at an
 * offset is said once, at the first, under the self-clip rule's name. Its
 * text moved by an indent, a margin, a padding, a spacing, a box's offsets
 * (no longer `SEEK_NEEDLESS`) or a size on the figure's own element
 * (`SEEK_ON_OWN`) is read so; none of them is held still.
 * **And wherever the animation runs, for the self-clip read** (the sixth
 * review's P1-a, the critic's PSQ2: a keyframe margin on the pay figure's
 * unit sibling squeezed the figure inside its own clip at desk width, and
 * the read seeked only animations on a figure's walk): every animation,
 * a pseudo-element's included, whose keyframes set a longhand that can move
 * a box other than its own (`movesOtherBoxes`, `MOVES_NO_OTHER_BOX`; a
 * `visibility` among them, the seventh review's PVC), or a transform or an
 * offset where an anchor can follow it (`ANCHOR_FOLLOWED`,
 * `anchorCanFollow`; the seventh review's PAN, the figure the wallet signs
 * anchored to its unit and carried out of its row's clip by a keyframe
 * `translate` on the unit), is seeked the same way, and at each offset the
 * self-clip read is made for
 * every money figure on the paint, not only those it holds; one on a
 * figure's walk does both reads at the same seeks. A figure the dress rule
 * does not read (one not rendered at rest) is answered to the caller.
 * An animation that sets only grounds, shadows and `SEEK_NEEDLESS`
 * longhands (`groundOnly`) is read for the ground alone: it can move no
 * held longhand. A failure names the animation, the box it runs on and the
 * offset; one the instant's read already said is not said again.
 *
 * **Not read, stated**: a value between two offsets — a timing function
 * that overshoots (`cubic-bezier()` with a y outside 0–1, a `linear()` with
 * points outside them) can carry a value past both its keyframes; two
 * animations at once, each seeked with the others where the last instant
 * left them; a pseudo-element's animation for the dress reads (it is the
 * cover rules'; it is seeked for the self-clip read where it can move
 * another box); the reads that need the geometry but the ground and the
 * self-clip read (`OFFSET_GEOMETRY`: a spacing that piles digits, the
 * lines, an outline's ring); what a keyframe off a figure's walk does to it
 * but cut its text — a spill or a cover — and a figure's text a turn or a
 * shift on a box of its walk carries out of a clip (the self-clip read
 * holds the turns off, and `BOX_HELD` holds a box above to a small tilt);
 * and an animation whose duration
 * is not a finite time over 0. Cost: only paints with an animation on
 * money's ancestry that sets something `SEEK_NEEDLESS` does not name, or one
 * anywhere that sets something `MOVES_NO_OTHER_BOX` does not name, pay —
 * on the clean tree the decorations' custom properties on the stall's root
 * (the aurora's `--au-tide`, the sunburst's `--att-sun-angle`), two offsets
 * each (a root's gradient, which the ground read does not read above a
 * figure, so no ground is read again), and, since the ground read, the door
 * button's breathing (a shadow on a money node itself, read for the ground
 * alone); Neo's card pulse on every row head is an outer shadow on a box
 * above (`outerShadowOnly`) and is not seeked; no shipped keyframe off a
 * figure's walk on a paint with a money figure sets a longhand that moves
 * another box (the door's pin demo sets `visibility`, and the door paints no
 * money figure), and no served sheet declares `anchor-name`, so the
 * layout-wide read seeks nothing more there (`dressSeek.layout`,
 * `dressSeek.anchored`) — and each pays a style recalc a seek (`dressSeek`,
 * `dressSeekMs`). The anchor read (`anchorCanFollow`) reads the computed
 * `anchor-name` of each box an animation that sets a transform or an offset
 * and nothing else that moves another box runs on, and of every element
 * under it, once a paint, before any seek. Without the skip, every Rural tag's sway and every sign's
 * swing and sweep was seeked: about ten times the time (3.1s against 0.44s
 * over the desk pass's screens, in a session).
 */
function offsetDressFaults(read: readonly DressRead[]): Map<HTMLElement, string[]> {
    const t0 = performance.now();
    // The figures the self-clip read reads at an offset of an animation that
    // can move another box: every money figure on the paint
    // (`MONEY_FIGURES`, read where the rule reads them at the pass's last
    // instant, `selfClipReads`), each with the list its cut goes to — its
    // dress subject's, or one of its own for a figure the dress rule does not
    // read (answered to the caller). Gathered the first time one is needed.
    const unread = new Map<HTMLElement, string[]>();
    let everyFigure: [HTMLElement, string[]][] | undefined;
    const figuresOnThePaint = (): [HTMLElement, string[]][] => {
        if (everyFigure !== undefined) return everyFigure;
        const lists = new Map<HTMLElement, string[]>();
        for (const r of read) if (r.node.matches(MONEY_FIGURES) && selfClipReads(r.node)) lists.set(r.node, r.clip);
        for (const node of document.querySelectorAll<HTMLElement>(`#app :is(${MONEY_FIGURES})`)) {
            if (lists.has(node) || !selfClipReads(node)) continue;
            const list: string[] = [];
            lists.set(node, list);
            unread.set(node, list);
        }
        everyFigure = [...lists];
        return everyFigure;
    };
    // Every element an animation could change a figure's dress from: its own elements and the boxes above it, up to and with its stall.
    const reach = new Map<Element, DressRead[]>();
    const add = (el: Element, r: DressRead): void => {
        const list = reach.get(el);
        if (list === undefined) reach.set(el, [r]);
        else if (!list.includes(r)) list.push(r);
    };
    for (const r of read) {
        for (const el of r.own) add(el, r);
        for (let at = r.node.parentElement; at !== null && at.id !== 'app'; at = at.parentElement) {
            add(at, r);
            if (at === r.stall) break;
        }
    }
    const said = new Set<string>();
    // The ground of each element, and where each figure's text stands, as
    // the pass's last instant left them (`groundSignature`, `inkSignature`):
    // every animation is put back before the next is read.
    restGround = new Map();
    restInk = new Map();
    const sheets = sheetKey();
    if (movesByName.key !== sheets) movesByName = { key: sheets, byName: new Map() };
    const animations = document.getAnimations();
    // What each animation can move, decided before any is seeked (the style
    // is the pass's last instant's): a CSS animation's longhands are its
    // `@keyframes` rule's, one per name, read once while the page's sheets
    // stand (`movesOtherBoxes`); and a transform or an offset counts as
    // moving another box where an anchor can follow it (`anchorCanFollow`,
    // the seventh review's PAN). An animation that sets `anchor-name` is an
    // anchor on the page as a sheet that declares it is.
    const pageAnchors =
        sheetFacts().anchors || animations.some((a) => a.effect instanceof KeyframeEffect && !(a instanceof CSSAnimation) && (keyframeProps(a, a.effect)?.has('anchor-name') ?? false));
    const movesOf = new Map<Animation, boolean>();
    for (const anim of animations) {
        const effect = anim.effect;
        if (!(effect instanceof KeyframeEffect) || effect.target === null) continue;
        let moves = anim instanceof CSSAnimation ? movesByName.byName.get(anim.animationName) : undefined;
        if (moves === undefined) {
            moves = movesOtherBoxes(anim, effect);
            if (anim instanceof CSSAnimation) movesByName.byName.set(anim.animationName, moves);
        }
        const anchored = !moves.others && moves.follows && anchorCanFollow(effect.target, effect.pseudoElement, pageAnchors);
        if (anchored) dressSeek.anchored += 1;
        movesOf.set(anim, moves.others || anchored);
    }
    for (const anim of animations) {
        const effect = anim.effect;
        if (!(effect instanceof KeyframeEffect) || effect.target === null) continue;
        const target = effect.target;
        // On a figure's walk (an element, never a pseudo-element, which
        // nothing inherits from): the figures whose dress it can change.
        const walk = effect.pseudoElement === null ? reach.get(target) : undefined;
        // One of a figure's own elements, where a size is seeked (`SEEK_ON_OWN`).
        const ownTarget = walk?.some((r) => r.own.includes(target as HTMLElement)) ?? false;
        let reads = walk;
        if (walk !== undefined && (seekNeedless(anim, effect, ownTarget) || outerShadowOnly(anim, effect, target, walk))) {
            dressSeek.needless += 1;
            reads = undefined;
        }
        // Wherever it runs: a keyframe that can move a box other than its
        // own (`movesOf`, above) can cut any figure's text — a sibling's
        // margin squeezing it inside its own clip, the sixth review's PSQ2;
        // an anchor's translate carrying the figure out of its row's, PAN.
        const movesOthers = movesOf.get(anim) ?? true;
        // Off every figure's walk it is seeked for the self-clip read alone: not on a paint with no figure to read.
        if (reads === undefined && (!movesOthers || figuresOnThePaint().length === 0)) continue;
        const duration = effect.getComputedTiming().duration;
        if (typeof duration !== 'number' || !Number.isFinite(duration) || !(duration > 0)) continue;
        const offsets = [...new Set([0, 1, ...effect.getKeyframes().map((k) => k.computedOffset ?? 0)])].filter((o) => o >= 0 && o <= 1).sort((a, b) => a - b);
        // What the read sets, to put back after it (the duration it leaves alone).
        const { delay, endDelay, iterations, iterationStart, direction, fill, easing } = effect.getTiming();
        const kept = { delay, endDelay, iterations, iterationStart, direction, fill, easing };
        const time = anim.currentTime;
        const name = 'animationName' in anim ? String((anim as CSSAnimation).animationName) : 'a transition';
        const where = effect.pseudoElement === null ? describe(target) : `${describe(target)}${effect.pseudoElement}`;
        const onlyGround = reads !== undefined && groundOnly(anim, effect, ownTarget);
        // Before the read sets its timing: the ground of every element this
        // animation can change, as the pass's last instant left it.
        for (const r of reads ?? []) {
            for (const [el, own] of groundWalk(r, target)) {
                const key = groundKey(el, own);
                if (!restGround.has(key)) restGround.set(key, groundSignature(el, own));
            }
            if (!restInk.has(r.node)) restInk.set(r.node, inkSignature(r.node));
        }
        // The figures whose text the self-clip read reads at each offset:
        // every one on the paint where the keyframes can move another box;
        // else those on the animation's walk, unless it sets only grounds.
        const clipped: [HTMLElement, string[]][] = movesOthers
            ? figuresOnThePaint()
            : (reads ?? []).filter((r) => !onlyGround && r.node.matches(MONEY_FIGURES)).map((r) => [r.node, r.clip]);
        dressSeek.anims += 1;
        if (reads === undefined) dressSeek.layout += 1;
        dressSeek.names[name] = (dressSeek.names[name] ?? 0) + 1;
        try {
            effect.updateTiming({ delay: 0, endDelay: 0, iterations: 1, iterationStart: 0, direction: 'normal', fill: 'both', easing: 'linear' });
            for (const offset of offsets) {
                anim.currentTime = offset * duration;
                dressSeek.seeks += 1;
                const at = `with ${name} on ${where} seeked to its keyframe at ${Math.round(offset * 100)}%`;
                // The paints read at this offset, fresh: the pass's own are of its last instant.
                const paintsHere = { own: new Map<Element, BoxPaints>(), above: new Map<Element, BoxPaints>() };
                for (const r of reads ?? []) {
                    dressSeek.reads += 1;
                    const found: string[] = [];
                    if (!onlyGround) {
                        if (!rendersAt(r.node)) found.push(`it has no box, ${at}`);
                        for (const el of r.own) {
                            if (el !== target && !target.contains(el)) continue;
                            const cs = getComputedStyle(el);
                            const elName = el === r.node ? 'it' : describe(el);
                            for (const prop of OFFSET_HELD_OWN) {
                                const why = dressHeldFault(prop, cs.getPropertyValue(prop), cs);
                                if (why !== undefined) found.push(`${elName}: ${why}, ${at}`);
                            }
                            // And every longhand no family frees and none holds, against the
                            // untouched reference, as at rest (the fifth review's item 9).
                            const ref = dressReference(r.stall);
                            for (const prop of dressReadList().rest) {
                                const value = cs.getPropertyValue(prop);
                                if (value !== (ref.get(prop) ?? '')) found.push(`${elName} computes ${prop} ${value || '(nothing)'}, which no rule lets a look dress (untouched: ${ref.get(prop) || '(nothing)'}), ${at}`);
                            }
                        }
                        if (target !== r.node && target.contains(r.node)) {
                            for (let box = r.node.parentElement; box !== null; box = box.parentElement) {
                                const cs = getComputedStyle(box);
                                for (const prop of BOX_HELD) {
                                    const why = boxHeldFault(prop, cs.getPropertyValue(prop), box);
                                    if (why !== undefined) found.push(`${describe(box)} above it: ${why}, ${at}`);
                                }
                                if (box === target) break;
                            }
                        }
                    }
                    found.push(...offsetGroundFaults(r, target, at, paintsHere));
                    for (const fault of found) {
                        // Said once a subject, at its first offset; and not where the instant's read said it already.
                        const key = `${read.indexOf(r)}|${fault.slice(0, fault.lastIndexOf(', with '))}`;
                        if (said.has(key) || r.faults.some((f) => f === fault.slice(0, fault.lastIndexOf(', with ')))) continue;
                        said.add(key);
                        r.faults.push(fault);
                        dressSeek.faults += 1;
                    }
                }
                // The self-clip read (`a-money-figure-never-clips-itself`) at
                // this offset: a figure the pass's last instant found whole,
                // said once, at its first offset that cuts it.
                for (const [node, list] of clipped) {
                    if (list.length > 0 || selfClipCutNow.has(node) || !selfClipReads(node)) continue;
                    dressSeek.clips += 1;
                    const cut = selfClipSentences(node);
                    if (cut.length > 0) {
                        list.push(`${cut[0]}, ${at}`);
                        dressSeek.faults += 1;
                    }
                }
            }
        } catch {
            // Not ours to time: an animation this read cannot seek is read at the instants alone.
        } finally {
            try {
                effect.updateTiming(kept);
            } catch {
                // Put back as it can be.
            }
            try {
                anim.currentTime = time;
            } catch {
                // A finished or unseekable animation stands where it stands.
            }
        }
    }
    dressSeekMs += performance.now() - t0;
    return unread;
}

function moneyDressFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    boxFaultsSeen = new Map();
    clipsSeen = new Map();
    shadowersSeen = new Map();
    ownPaintsSeen = new Map();
    abovePaintsSeen = new Map();
    walkPaintsSeen = new Map();
    const read: DressRead[] = [];
    const subjects = new Set<HTMLElement>(document.querySelectorAll<HTMLElement>(`#app :is(${MONEY_FIGURES})`));
    for (const say of document.querySelectorAll<HTMLElement>('#app .fig-say')) {
        if (say.parentElement !== null) subjects.add(say.parentElement);
    }
    for (const node of subjects) {
        if (node.closest('.deck-stall') !== null) continue;
        if (!rendersAt(node)) {
            // A money node not rendered is skipped — the app hides one twin
            // of the address at each width — unless a look's animation took
            // its box away (`animatedAway`, before 8g2 item 4). The ink and
            // self-clip rules skip it either way: this rule owns it.
            const animated = animatedAway(node);
            const why =
                animated !== undefined
                    ? `has no box: ${animated}`
                    : hiddenBy(node) === 'look'
                      ? 'has no box: a rule of the look takes it away, or nothing of the app’s own explains why it has none (hiddenBy)'
                      : undefined;
            if (why !== undefined) {
                out.push({
                    screen,
                    theme: label,
                    check: DRESS_CHECK,
                    detail: `${describe(node)} "${(node.textContent ?? '').trim().slice(0, 32)}": ${why} — a look may not take a money figure away`,
                });
            }
            continue;
        }
        const stall = node.closest('.stall');
        if (stall === null) continue;
        const byLook = (dressByClass[measuringClass] ??= {});
        const surface = dressSurface(node);
        byLook[surface] = (byLook[surface] ?? 0) + 1;
        const faults: string[] = [];
        const ref = dressReference(stall);
        // 1. Its own dress, and every element under it with text but a
        // broken figure's pieces (the ink rule's).
        const own = [node, ...[...node.querySelectorAll<HTMLElement>('*')].filter((el) => el.closest('.fig-say') === null && holdsText(el))];
        for (const el of own) {
            const name = el === node ? 'it' : describe(el);
            const cs = getComputedStyle(el);
            const longhands = dressReadList();
            for (const prop of longhands.held) {
                const why = dressHeldFault(prop, cs.getPropertyValue(prop), cs);
                if (why !== undefined) faults.push(`${name}: ${why}`);
            }
            for (const prop of longhands.rest) {
                const value = cs.getPropertyValue(prop);
                if (value === (ref.get(prop) ?? '')) continue;
                faults.push(`${name} computes ${prop} ${value || '(nothing)'}, which no rule lets a look dress (untouched: ${ref.get(prop) || '(nothing)'})`);
            }
            let inks: readonly Box[] | undefined;
            const elInks = (): readonly Box[] => (inks ??= inkLines(el));
            const ground = groundStackFault(el, cs, stall, elInks);
            // 3a, report-only: the walk to the stall beside the bound read (`groundWalkReport`).
            groundWalkReport(screen, label, el, cs, stall, elInks, ground, node);
            for (const why of [ground, outlineFault(el, cs), decorationFault(cs)]) {
                if (why !== undefined) faults.push(`${name}: ${why}`);
            }
            if (pxOf(cs.letterSpacing) < 0) {
                // Read in runs: consecutive text nodes set in one face and
                // spacing are one line of glyphs, so a broken figure's groups
                // (a text node each, `.fig-end` its own) are read across the
                // comma where one group meets the next.
                const runs: { text: string; cs: CSSStyleDeclaration }[] = [];
                let key = '';
                const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
                for (let t = walker.nextNode(); t !== null; t = walker.nextNode()) {
                    const owner = t.parentElement;
                    if (owner === null) continue;
                    const ocs = getComputedStyle(owner);
                    const k = `${ocs.fontStyle}|${ocs.fontWeight}|${ocs.fontSize}|${ocs.fontFamily}|${ocs.letterSpacing}|${ocs.wordSpacing}|${ocs.textTransform}|${ocs.fontVariantCaps}|${ocs.fontStretch}`;
                    if (k === key && runs.length > 0) runs[runs.length - 1]!.text += (t as Text).data;
                    else runs.push({ text: (t as Text).data, cs: ocs });
                    key = k;
                }
                for (const run of runs) {
                    const why = run.text.trim() === '' ? undefined : spacingPiles(run.text, run.cs);
                    if (why !== undefined) {
                        faults.push(`${name}: ${why}`);
                        break;
                    }
                }
            }
            for (const why of animationFaults(el, (prop) => DRESS_HELD.has(prop), (prop, value) => dressHeldFault(prop, value, cs))) {
                faults.push(`${name}: ${why}`);
            }
            for (const pseudo of ['::before', '::after'] as const) {
                const content = getComputedStyle(el, pseudo).content;
                if (content !== 'none' && content !== 'normal' && content !== '') {
                    faults.push(`${name}${pseudo} generates ${content.slice(0, 24)} beside the figure`);
                }
            }
        }
        // 2. Every box that holds it, up to and with the stall: the paint
        // effects that are not inherited, and the lines a decoration draws
        // across it.
        for (let at: HTMLElement | null = node.parentElement; at !== null && at.id !== 'app'; at = at.parentElement) {
            faults.push(...boxFaults(at));
            if (at === stall) break;
        }
        read.push({ node, stall, faults, chain: clipChainOf(node), own, clip: [] });
    }
    // In each figure's own frame — one hold of every transform from every
    // figure up to its stall (Rural's tag sways and its rows tilt, so a line
    // of a figure stands on no one baseline at rest): the lines of its text
    // and a neighbour's shadow over its ink, and 3., every clip above it up
    // to the stall.
    if (read.length > 0) {
        const boxes = new Set<HTMLElement>();
        for (const r of read) {
            for (let at: HTMLElement | null = r.node; at !== null && at.id !== 'app'; at = at.parentElement) {
                if (boxes.has(at)) break;
                boxes.add(at);
            }
        }
        withTransformsHeldOff(boxes, () => {
            for (const r of read) {
                const lines = lineFault(r.node, !r.node.matches(NOT_FIGURE_TEXT));
                if (lines !== undefined) r.faults.push(lines);
                let inks: readonly Box[] | undefined;
                const nodeInks = (): readonly Box[] => (inks ??= inkLines(r.node));
                const beside = neighbourShadowFault(r.node, dressInk(getComputedStyle(r.node)), nodeInks);
                if (beside !== undefined) r.faults.push(beside);
                const ringed = outlineAboveFault(r.node, r.stall, nodeInks);
                if (ringed !== undefined) r.faults.push(ringed);
                if (r.chain === undefined) continue;
                dressClipByClass[measuringClass] = (dressClipByClass[measuringClass] ?? 0) + 1;
                const why = clipCut(r.node, r.chain);
                if (why !== undefined) r.faults.push(why);
            }
        });
    }
    // 5. The held dress at every keyframe offset of every animation on the
    // figure or a box above it, and the self-clip read there of every
    // animation that can move a box (`offsetDressFaults`), each put back after.
    const unread = offsetDressFaults(read);
    for (const [node, clip] of unread) {
        for (const detail of clip) {
            out.push({
                screen,
                theme: label,
                check: SELF_CLIP_CHECK,
                detail: `${describe(node)} "${(node.textContent ?? '').trim().slice(0, 32)}" ${detail} at ${window.innerWidth}x${window.innerHeight}`,
            });
        }
    }
    for (const { node, faults, clip } of read) {
        // A figure whose text a keyframe cuts at an offset is the self-clip rule's (`selfClipSentences`).
        for (const detail of clip) {
            out.push({
                screen,
                theme: label,
                check: SELF_CLIP_CHECK,
                detail: `${describe(node)} "${(node.textContent ?? '').trim().slice(0, 32)}" ${detail} at ${window.innerWidth}x${window.innerHeight}`,
            });
        }
        if (faults.length === 0) continue;
        out.push({
            screen,
            theme: label,
            check: DRESS_CHECK,
            detail:
                `${describe(node)} "${(node.textContent ?? '').trim().slice(0, 32)}": ` +
                `${faults.slice(0, 4).join('; ')}${faults.length > 4 ? `; and ${faults.length - 4} more` : ''} — a look dresses a money figure as a whole, and that dress may not misstate it`,
        });
    }
    return out;
}

/*
 * **A code is drawn black on white** (before 8g2, the fourth review's item
 * 4, the critic's PFQ): `qrSvg` draws a code as an `svg.qr` holding a white
 * `rect` the size of its viewBox and one black `path` of its modules, each
 * coloured by a presentation attribute — and an author rule beats a
 * presentation attribute, so `.t-modern .qr path { fill: #fff }` blanked
 * every pay and share code on the look, its quiet zone white and its modules
 * gone, and passed the whole runner (the quiet-zone read reads the ring
 * inside the square, which stayed white). On every geometry pass, with no
 * pixels, every code a paint shows (`svg.qr` with a box, the door's deck
 * aside) is held to the shape `qrSvg` draws and to its colours computed:
 * the svg's element children are a `rect` then a `path`, the rect at 0,0
 * the size of the viewBox and the path's modules the `M c r h1v1h-1z`
 * squares `qrSvg` writes, its computed `d` the same squares (a `d` property
 * re-draws them); the rect's computed fill white and the path's black,
 * each at a fill opacity of 1, with no stroke; the svg, the rect and the
 * path each at `opacity` 1, `visibility` visible, `display` not none and
 * `content-visibility` visible, each computing `none` for a filter, a
 * clip-path, every mask source (`QR_NONE`: `mask-image` and its `-webkit-`
 * twin, `mask-border-source`, `-webkit-mask-box-image-source` and
 * `-webkit-mask-box-image`), every transform (`transform`, `rotate`,
 * `scale`, `translate`) and a motion path (`offset-path`), and a blend of
 * `normal`; the svg's box square, its width and height within a pixel of
 * each other; and the path's modules where `qrSvg` puts them, inside the
 * svg's box and on the matrix area its viewBox and quiet zone make, each
 * edge within a pixel (`qrPlaceFault`; the sixth review's item 1, the
 * critic's PQP: an `offset-path` on the path carried every Modern code's
 * modules off its square while the transform computed `none`). A code whose
 * shape is not that fails: the read cannot vouch for one. **Since the fifth
 * review** (items 2 and 6): the critic's PQC,
 * `.t-modern .qr { content-visibility: hidden }`, collapsed every Modern
 * code to a white strip about 336×20 (its rect and path skipped, its box
 * and its hits kept) and passed the whole runner, and PQM, a
 * `-webkit-mask-box-image` on the code, was read only by the quiet zone,
 * where the backing is not white — this read held `mask-image` alone and
 * said "no mask". The first-party look lint refuses `fill` and `stroke` off
 * a drawn icon (`isIconRule`, D-2026-10-26-04 (b)); this is the kit's road.
 * Owed per look (`qrColourByClass`: painted, counted where the codes are
 * listed, and read) and per screen (`qrByScreen`: every look whose paint of
 * a screen built as many codes paints as many of them with a box as any
 * other such look, `probe-coverage.mjs`).
 * **Not read, stated**: a box above the code (its fades are the cover
 * rules' and the quiet zone's), the code's size beyond its squareness (the
 * pay code's width is the gate's), the pixels (the quiet-zone read's and
 * 1d's module read, bound since 7c, on the contrast jobs), and a code between
 * the pass's instants: the hold and
 * its place read read a code where the pass's last instant left it, so a
 * keyframe that carries its modules off the matrix there is read by nothing
 * (not planted).
 */
const QR_COLOUR_CHECK = 'a-code-is-drawn-black-on-white';
const qrColourByClass: Record<string, { painted: number; read: number }> = {};
/** The longhands a code's svg, rect and path each compute `none` for (`qrColourFault`): a filter, a clip, every mask source, every transform and a motion path. */
const QR_NONE = [
    'filter',
    'clip-path',
    'mask-image',
    '-webkit-mask-image',
    'mask-border-source',
    '-webkit-mask-box-image-source',
    '-webkit-mask-box-image',
    'transform',
    'rotate',
    'scale',
    'translate',
    'offset-path',
] as const;

/** The longhands held off the boxes above a code while its modules' place is read (`qrPlaceFault`): every transform and a motion path, which turn or move the svg and its path together. */
const QR_FRAME_HELD = ['transform', 'rotate', 'scale', 'translate', 'offset-path'] as const;

/**
 * **Where a code's modules land** (before 8g2, the sixth review's item 1: the
 * critic's PQP). `.t-modern .qr path { offset-path: ray(0deg);
 * offset-distance: 400px }` carried every Modern code's modules off the code
 * along a motion path, the svg clipping them, so each code painted as its
 * white square — and the hold, which read a list of properties and not
 * where the modules land, passed it: `offset-path` leaves the computed
 * `transform` `none`. So beside the list (which names `offset-path` now) the
 * path's box is held to the matrix area its own viewBox and `qrSvg`'s quiet
 * zone put it in: the modules' extent in the path's `d` must be the matrix
 * (`QR_SVG_QUIET_MODULES` in from each edge of the viewBox: a code's finder
 * patterns fill three of its corners), and on screen the path's box must
 * stand inside the svg's box and on that area of the square the svg draws
 * into — its content box, less its own letterboxing (`xMidYMid meet`), as
 * the quiet-zone read reads it — each edge within a pixel. Read with every
 * transform and motion path of the boxes above held off (`QR_FRAME_HELD`,
 * through the CSSOM) where one is set, since an axis-aligned box of a turned
 * frame (Rural tilts every third wall card) is wider than the frame, and its
 * insets scaled by the code's own zoom (`currentCSSZoom`). It reads where
 * the modules are, whatever moved them: a property this list does not name
 * that carries the path off the matrix fails here too.
 */
function qrPlaceFault(svg: SVGSVGElement, path: SVGElement, size: number, modules: readonly RegExpMatchArray[]): string | undefined {
    const q = QR_SVG_QUIET_MODULES;
    const cols = modules.map((m) => Number(m[1]));
    const rows = modules.map((m) => Number(m[2]));
    const span = [Math.min(...cols), Math.max(...cols) + 1, Math.min(...rows), Math.max(...rows) + 1];
    if (span[0] !== q || span[1] !== size - q || span[2] !== q || span[3] !== size - q) {
        return `its modules span columns ${span[0]}–${span[1]} and rows ${span[2]}–${span[3]}, not the matrix ${q}–${size - q} that its viewBox and qrSvg's quiet zone of ${q} make`;
    }
    const frame: HTMLElement[] = [];
    for (let at = svg.parentElement; at !== null; at = at.parentElement) frame.push(at);
    const moved = frame.filter((el) => {
        const cs = getComputedStyle(el);
        return QR_FRAME_HELD.some((p) => cs.getPropertyValue(p) !== 'none' && cs.getPropertyValue(p) !== '');
    });
    const read = (): string | undefined => {
        const r = svg.getBoundingClientRect();
        const cs = getComputedStyle(svg);
        const zoom = (svg as Element & { currentCSSZoom?: number }).currentCSSZoom ?? 1;
        const px = (v: string): number => (Number.parseFloat(v) || 0) * zoom;
        const left = px(cs.borderLeftWidth) + px(cs.paddingLeft);
        const top = px(cs.borderTopWidth) + px(cs.paddingTop);
        const cw = r.width - left - px(cs.borderRightWidth) - px(cs.paddingRight);
        const ch = r.height - top - px(cs.borderBottomWidth) - px(cs.paddingBottom);
        const side = Math.min(cw, ch);
        if (!(side > 0)) return `it draws into a square of ${side.toFixed(1)}px, which holds no matrix`;
        const x = r.x + left + (cw - side) / 2;
        const y = r.y + top + (ch - side) / 2;
        const m = side / size;
        const want = { left: x + m * q, top: y + m * q, right: x + side - m * q, bottom: y + side - m * q };
        const p = path.getBoundingClientRect();
        const at = `${Math.round(p.left)},${Math.round(p.top)} ${Math.round(p.width)}×${Math.round(p.height)}`;
        if (p.left < r.left - 1 || p.top < r.top - 1 || p.right > r.right + 1 || p.bottom > r.bottom + 1) {
            return `its modules stand at ${at}, outside its own box at ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}, which clips them`;
        }
        const off = Math.max(Math.abs(p.left - want.left), Math.abs(p.top - want.top), Math.abs(p.right - want.right), Math.abs(p.bottom - want.bottom));
        if (off > 1) {
            return (
                `its modules stand at ${at}, ${off.toFixed(1)}px off the matrix at ${Math.round(want.left)},${Math.round(want.top)} ` +
                `${Math.round(want.right - want.left)}×${Math.round(want.bottom - want.top)} that its viewBox and quiet zone put them in`
            );
        }
        return undefined;
    };
    return moved.length === 0 ? read() : withHeldOff(moved, QR_FRAME_HELD, read);
}

/** Why a code is not the black-on-white square `qrSvg` draws, or undefined. */
function qrColourFault(svg: Element): string | undefined {
    const kids = [...svg.children];
    if (kids.length !== 2 || kids[0]!.localName !== 'rect' || kids[1]!.localName !== 'path') {
        return `its shape is not the one qrSvg draws (a rect, then a path): it holds ${kids.map((k) => k.localName).join(', ') || 'nothing'}`;
    }
    const [rect, path] = kids as [SVGElement, SVGElement];
    const view = /^0 0 (\d+) \1$/.exec((svg.getAttribute('viewBox') ?? '').trim());
    if (view === null) return `its viewBox (${svg.getAttribute('viewBox') ?? 'none'}) is not the square qrSvg draws`;
    const size = view[1]!;
    const d = path.getAttribute('d') ?? '';
    const modules = [...d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)];
    if (modules.length === 0 || modules.map((m) => m[0]).join('') !== d) return 'its modules are not the squares qrSvg draws';
    const rcs = getComputedStyle(rect);
    const pcs = getComputedStyle(path);
    if (rcs.x !== '0px' || rcs.y !== '0px' || rcs.width !== `${size}px` || rcs.height !== `${size}px`) {
        return `its white rect is ${rcs.width} by ${rcs.height} at ${rcs.x}, ${rcs.y}, not the ${size} by ${size} square of its viewBox`;
    }
    const drawn = `path("${modules.map((m) => `M ${m[1]} ${m[2]} H ${Number(m[1]) + 1} V ${Number(m[2]) + 1} H ${m[1]} Z`).join(' ')}")`;
    if (pcs.getPropertyValue('d') !== drawn) return `its modules are re-drawn by a d property (${pcs.getPropertyValue('d').slice(0, 60)})`;
    const paint = (cs: CSSStyleDeclaration, want: readonly number[], what: string): string | undefined => {
        const fill = dressSingleColour(cs.fill);
        if (fill === undefined) return `${what} filled with ${cs.fill.slice(0, 40)}, which this read cannot take apart`;
        if (fill.alpha < 0.999 || fill.rgb.some((v, i) => Math.abs(v - want[i]!) > 0.5)) return `${what} filled ${cs.fill}, not ${want[0] === 255 ? 'white' : 'black'}`;
        if (Number.parseFloat(cs.fillOpacity) < 0.999) return `${what} filled at an opacity of ${cs.fillOpacity}`;
        if (cs.stroke !== 'none' && Number.parseFloat(cs.strokeWidth) > 0) return `${what} stroked ${cs.stroke} ${cs.strokeWidth} wide`;
        return undefined;
    };
    const painted = paint(rcs, [255, 255, 255], 'its ground is') ?? paint(pcs, [0, 0, 0], 'its modules are');
    if (painted !== undefined) return painted;
    for (const [cs, what] of [[getComputedStyle(svg), 'it'], [rcs, 'its ground'], [pcs, 'its modules']] as const) {
        if (Number.parseFloat(cs.opacity) < 0.999) return `${what}: opacity ${cs.opacity}`;
        if (cs.visibility !== 'visible') return `${what}: visibility ${cs.visibility}`;
        if (cs.display === 'none') return `${what}: display none`;
        const cv = cs.getPropertyValue('content-visibility');
        if (cv !== 'visible' && cv !== '') return `${what}: content-visibility ${cv}, which skips what it holds`;
        for (const prop of QR_NONE) {
            const value = cs.getPropertyValue(prop);
            if (value !== 'none' && value !== '') return `${what}: ${prop} ${value.slice(0, 40)}`;
        }
        if (cs.mixBlendMode !== 'normal') return `${what}: mix-blend-mode ${cs.mixBlendMode}`;
    }
    const box = svg.getBoundingClientRect();
    if (Math.abs(box.width - box.height) > 1) return `its box is ${box.width.toFixed(1)} by ${box.height.toFixed(1)}, not the square qrSvg draws`;
    return qrPlaceFault(svg as SVGSVGElement, path, Number(size), modules);
}

function qrColourFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    const tally = (qrColourByClass[measuringClass] ??= { painted: 0, read: 0 });
    for (const svg of document.querySelectorAll('svg.qr')) {
        if (svg.closest('.deck-stall') !== null) continue;
        const box = svg.getBoundingClientRect();
        if (!(box.width > 0 && box.height > 0)) continue;
        tally.read += 1;
        const why = qrColourFault(svg);
        if (why !== undefined) out.push({ screen, theme: label, check: QR_COLOUR_CHECK, detail: `${codeName(svg)}: ${why} — a code is drawn black on white, and a look does not paint it` });
    }
    return out;
}

/*
 * **A payment list that scrolls says how many lines it hides** (2026-09-24,
 * the owner's decision 4). The payment's lines scroll inside the wall's
 * plate under a cap in pixels (`window.css`), and nothing said so: a
 * customer saw two lines of thirty-five and a total for all of them. The
 * page says "+N more" under the scroller once the tree is laid out
 * (`sayHiddenPayLines`) — geometry, which no unit test can see, since
 * happy-dom lays nothing out. So on every wall screen with a payment
 * standing the probe counts for itself the lines not wholly inside the
 * scroller's client box and holds the line under it to that count: hidden
 * and silent at 0, shown and saying `windowPayMore(n)` otherwise, and never
 * inside the scroller it counts. The line read whole is `WALL_HELD`'s, so
 * the runner's coverage of `pay-lines-more` is a nonzero count compared.
 */
const PAY_MORE_CHECK = 'a-payment-list-that-scrolls-says-how-many-lines-it-hides';

function payLinesSayWhatTheyHide(screen: string, label: string): Failure[] {
    const lines = document.querySelector<HTMLElement>('#app .stall.shop-window .sw-paying [data-role="pay-lines"]');
    if (lines === null) {
        return [];
    }
    const fail = (detail: string): Failure[] => [
        { screen, theme: label, check: PAY_MORE_CHECK, detail: `${detail} at ${window.innerWidth}x${window.innerHeight}` },
    ];
    const more = document.querySelector<HTMLElement>('#app .stall.shop-window .sw-paying [data-role="pay-lines-more"]');
    if (more === null) {
        return fail('the payment has no line to say how many of its lines the scroller hides');
    }
    if (more.closest('[data-role="pay-lines"]') !== null) {
        return fail('the line that counts the hidden lines is inside the scroller it counts');
    }
    const top = lines.getBoundingClientRect().top + lines.clientTop;
    const bottom = top + lines.clientHeight;
    let hidden = 0;
    const rows = lines.querySelectorAll<HTMLElement>(':scope > .sw-pay-line');
    for (const line of rows) {
        const at = line.getBoundingClientRect();
        if (at.top < top - 1 || at.bottom > bottom + 1) {
            hidden += 1;
        }
    }
    const box = more.getBoundingClientRect();
    const said = !more.hidden && box.height > 0 ? (more.textContent ?? '') : '';
    const want = hidden === 0 ? '' : windowPayMore(hidden);
    if (said !== want) {
        return fail(
            `${hidden} of the payment's ${rows.length} lines are not wholly in view, and the line under them says ${said === '' ? 'nothing' : `"${said}"`}${want === '' ? '' : ` where it owes "${want}"`}`,
        );
    }
    return [];
}

/*
 * **Small text is at least 11px** (2026-09-24, the owner's Q16: F1 and F2).
 * Shipped text under 11px was a look's choice in fourteen places —
 * Modern's "from", its announcement chip; Neo's "from" and lowest-of line at
 * 9.5px, its rate, chip and brand strip at 10, its rail label, unit, fiat
 * line and source, section count, sign sub-line and wearing line at 10.5;
 * Rural's "from" and lowest-of at 10, its rate and chip at 10.5 — plus the
 * Activity tile's letters at 9 and the brand strip at 10, from stall.css.
 * Each rose to 11px in its own sheet.
 *
 * **Every node with its own text a reader is given fails under
 * `TEXT_FLOOR_PX`** (widened the same day, the critic's item 3: the first
 * version failed only the raised list and a planted 10px `.door-kicker`
 * stayed green), on every screen, look and variant every pass paints —
 * the phone, the desk, the canvas, the tall wall and the tablet. What is
 * not given to a reader is the one exception, and it is reported rather
 * than failed (`smallText`, printed on the pass's line): a node inside an
 * `aria-hidden="true"` subtree — the owner's rule; the sparse motif's
 * "scan to enter" stays 9.5px — unless it is one of the raised nodes
 * (`FLOOR_NAMED`: the brand strip and the tile letters are aria-hidden or
 * decorative and rose anyway, F2; the steppers' counts are aria-hidden
 * because the buttons carry them, and are read by the eye, and so are a
 * broken money figure's pieces, under the `.fig-say` that names the whole
 * figure). The door's deck minis are pictures at
 * 0.34–0.56 zoom and are skipped. The raised nodes read are counted
 * (`floorNamedChecks`) and the runner requires some on the phone and desk
 * passes. A class no fixture paints — the notice invite's `.ghost-chip`, a
 * seller prompt — is held by the static test
 * `the-raised-small-text-stays-at-eleven-px`, which reads every pixel size
 * in every served sheet.
 */
const SMALL_TEXT_CHECK = 'small-text-is-at-least-11px';
const TEXT_FLOOR_PX = 11;
const FLOOR_NAMED = [
    '.orn',
    '.event-ic',
    '.ghost-chip',
    '.notice-chip',
    '.item-from',
    '.stall-sub',
    '.collection-count',
    '.item-q',
    '.item-u',
    '.item-rate',
    '.item-fiat',
    '.item-fiat-src',
    '.item-lots',
    '.wearing',
    // The steppers' counts (the critic's P3, 2026-09-24): `aria-hidden`
    // because the count rides the two buttons' names, and read by every
    // sighted customer all the same — the exception is for text nobody is
    // given, and this is given to the eye. The phone's (`.step-n`,
    // `selection-count`) and the wall's.
    '.step-n',
    '.sw-step-n',
    // A money figure broken after its commas (round 2, the critic's P3-1):
    // its pieces are `aria-hidden` because `.fig-say` carries the whole
    // figure as one name, and every sighted reader reads them.
    '.fig-say',
];
const FLOOR_NAMED_SELECTOR = FLOOR_NAMED.flatMap((sel) => [sel, `${sel} *`]).join(', ');
let floorNamedChecks = 0;
const smallTextElsewhere = new Set<string>();

function smallTextFaults(screen: string, label: string): Failure[] {
    const root = document.getElementById('app')!;
    const out: Failure[] = [];
    for (const node of root.querySelectorAll<HTMLElement>('*')) {
        let own = '';
        for (const child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) own += child.textContent ?? '';
        }
        if (own.trim() === '' || node.closest('.deck-stall') !== null) {
            continue;
        }
        const cs = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        if (cs.display === 'none' || cs.visibility !== 'visible' || box.width === 0 || box.height === 0) {
            continue;
        }
        const px = Number.parseFloat(cs.fontSize);
        const named = node.matches(FLOOR_NAMED_SELECTOR);
        if (named) {
            floorNamedChecks += 1;
        }
        if (px >= TEXT_FLOOR_PX) {
            continue;
        }
        if (named || node.closest('[aria-hidden="true"]') === null) {
            out.push({
                screen,
                theme: label,
                check: SMALL_TEXT_CHECK,
                detail: `${describe(node)} "${own.trim().slice(0, 24)}" paints at ${cs.fontSize}, under the ${TEXT_FLOOR_PX}px floor`,
            });
        } else {
            const look = [...(node.closest('.stall')?.classList ?? [])].find((c) => c.startsWith('t-')) ?? '-';
            smallTextElsewhere.add(`${look} ${describe(node)} ${cs.fontSize} (aria-hidden)`);
        }
    }
    return out;
}

/*
 * The contrast pass's targets. Declared here, ahead of the geometry pass's
 * loop, because `outlineFaults` below asks it whether an outlined line is
 * one — a `const` read before its line runs is a ReferenceError, not an
 * empty list. The contrast pass itself is further down (`targetFor`).
 */
const CONTRAST_TEXT = [
    '[data-role="price"]',
    // "Not buyable" (2026-09-24, the critic): all an unbuyable offer's price
    // cell says since the dash left, on the row, the face and its fold, the
    // wall's Browse, the overlay card and the ticker — one role on every
    // surface, whatever class dresses it there.
    '[data-role="unbuyable"]',
    '.row.big dd',
    '.buy',
    // The address's two text nodes, never the `.addr` box itself: the box
    // holds a glyph beside the text, and sampling a container's box counted
    // pixels that are not the ink's ground (2.84:1 on Modern, 2026-09-15, when
    // the row held a copy pill). One of the two spans is display: none at
    // every width (the short form at desk, the whole string on a phone), and
    // a zero box is skipped, so each is measured where it is seen.
    '.addr-short',
    '.addr-full',
    '[data-role="publish-hex"]',
    '[data-role="describe-hex"]',
    '[data-role="fiat"]',
    '[data-role="rate"]',
    // Whose figure the fiat glance is (owner, 2026-09-23): a span of its own
    // beside `fiat`, muted where `fiat` wears the look's accent, so the
    // figure's measurement says nothing about it.
    '[data-role="fiat-source"]',
    // The Activity fold's amount, on the fold's own ground, which no other
    // screen puts a figure on.
    '[data-role="receipt-amount"]',
    // Every control on the publish/handoff path, and the dock: a theme file
    // pairing a literal ink with a token ground shipped these at 2.31:1
    // under the After-hours mood while this list looked elsewhere.
    /*
     * `:not(.sw-switch)` for the 2026-09-15 reason, met again on the shop
     * window's sheet: a switch's box holds its state pill, which paints the
     * accent when pressed, and `.mini`'s ink is the accent on two looks — so
     * the button sampled its own label against the pill's ground and read
     * 1.00:1 everywhere. The two spans below are the real targets, each in
     * its own box.
     */
    '.mini:not(.sw-switch)',
    '.sw-switch-label',
    '.sw-switch-state',
    /*
     * `.sw-switch-state` joined in step 5b. It was left out because the box
     * read put this ~17px `border-radius: 999px` pill at 1.00:1 on four of
     * six combinations — unexplained, and recorded as unexplained. Read over
     * its own line rect it reads 5.17:1 on every shipped look and every
     * decoration and 4.61 on the skeleton (the unpressed accent over the
     * skeleton's sheet surface, the one pair the palettes' own numbers did
     * not list); the unexplained 1.00 was the box read, which no longer
     * reads it.
     */
    '.tab',
    // The "Publishes:" line on both record sheets. It is the only sentence
    // that says what a permanent record carries and how big it is, and it
    // sits on `.pub`'s own muted ink over whatever ground the sheet has —
    // a ground no other measured node puts a sentence on.
    '[data-role="publish-summary"]',
    '[data-role="describe-summary"]',
    // The controls the two sheets are made of, which no other screen paints:
    // a pressed segment inks itself on `--s-accent`, a pressed chip on a
    // wash of it, and both are how a seller reads their own choice.
    '.seg-b',
    '.dec-chip',
    // The overlay's name plate. It is the only line on a broadcast head that
    // is not a money figure, and on a transparent wire it sits on the
    // streamer's video with nothing but the plate between them.
    '[data-role="stall-name"]',
    /*
     * The seller's name on the sign (step 5a″, D14,
     * `the-sellers-name-on-the-sign-reads`): read over its line rects (D7);
     * not money; the deck's minis are pictures and left out. The name's own
     * glow is not its ground; the lamp's dip is G7.
     */
    '.stall-name:not(.deck-stall *)',
    // The tagline under it, on the same sign and over the same art (the
    // window's side note on D14): read over its line rects on every look.
    '.stall-tagline:not(.deck-stall *)',
    // And the sign's third line, its state ("Items for sale"), over the
    // same art (the critic's item 9), on the same terms.
    '.stall-sub:not(.deck-stall *)',
    // The studio's step headings. `obsGuide.css` is a screen-owned sheet, not
    // a theme file, so nothing else measures the ink it declares — and the
    // studio section is the one place a seller reads instructions rather than
    // a figure.
    '.obs-h',
    // The pay rail's own three: the seller's quote, the chip that says whose
    // figure it is, and the one line a Shop row carries about the other rail.
    // All three ink themselves on `--s-accent` or on the card's own ground,
    // which no other measured node puts a label on.
    '[data-role="seller-price"]',
    '.chip',
    '.pay-pointer',
    /*
     * The announcement's chip (recorded 2026-09-22, acted on the same day).
     * It is `<span class="notice-chip">` and NOT `.chip`, so the line above
     * never matched it — the seller's own "From the seller" label, on the
     * shop, the empty screen and the wall, was measured by nothing.
     *
     * No look was defective when it was added — but the pass went red
     * anyway, twice, and both times the SAMPLER was wrong: a `clip-path`
     * it could not see (fixed in `clipBand` above) and two far edges that
     * rounded outward onto the box's own antialiased row (fixed in the
     * runner). `PROBE-RULES.md`, "Rendered-pixel contrast", carries both
     * with the numbers and the red proof.
     *
     * The looks themselves: all three declare BOTH
     * halves as literals in their own block — white on #2563eb (5.17:1),
     * #1a070e on #ff4d7a (6.10:1), #fff3ea on #9e4620 (5.75:1) — and a pair
     * of literals cannot come apart under a mood, which is the failure
     * `a-theme-rule-never-pairs-a-literal-ink-with-a-token-ground` exists
     * for and the reason that test is silent here too. It is on the list so
     * the next look, or the first one to reach for a token on one half,
     * is measured rather than trusted.
     *
     * Its SIZE is measured since 2026-09-24: every look sets it at 11px or
     * more, and `small-text-is-at-least-11px` fails it under that on every
     * screen the probe paints it on.
     */
    '.notice-chip',
    // The surcharge lines (2026-09-21): the pay sheet's composed one and the
    // record's line on the row, the face, the stream card and the wall — each
    // a figure's other half, in muted or ink on its surface's own ground.
    '[data-role="pay-surcharge"]',
    '[data-role="quote-surcharge"]',
    // "Pay several" (2026-09-21): the strip's total, the sheet's lines and
    // total, the stepper's glyph on its own ground, and the row's line.
    '[data-role="selection-total"]',
    '[data-role="pay-lines"]',
    '[data-role="pay-total"]',
    '.step',
    // The ticker (2026-09-22): the flag's rail line, the item's name and the
    // provenance chip — the chip is `copy.SELLER_QUOTE_CHIP` under its own
    // class, and a semantic under a class no list names is how `.item-ic`'s
    // letters reached 1.10:1.
    '.tk-rail',
    '.tk-n',
    '.tk-chip',
    // The touch wall (2026-09-21): the strip's names and its note, the
    // stepper's count, and the plate's own lines. Money and the words
    // beside it, on a screen nobody attends.
    '.sw-sel-n',
    '.sw-sel-s',
    '.sw-step-n',
    '.sw-pay-v',
    '.sw-pay-s',
    // The two lines outside the payment's scroller (2026-09-24): "+N more"
    // and the borrowed-token sentence, sampled on the 35-item plate.
    '.sw-pay-more',
    '.sw-pay-borrowed',
    '.sel-sub',
    '[data-role="selection-figure"]',
    '[data-role="window-pay"]',
    // Round 8 (2026-09-15): the Activity tile's letters, restyled to be read
    // at 9px, and the door's fact chips, restyled as facts — both contrast
    // claims of the design board, measured here rather than asserted.
    '.event-sum .event-ic',
    '.door-chips li',
    // The door's other ink (round 16, 2026-09-20): the kicker and lede, the
    // site bar, the four tiles and their links, a pin's name, the deck's
    // caption. Every one is a token over the door's ground; the probe's worn
    // half paints that ground under After hours, which is where a literal
    // read 2.59:1 once.
    '.door-kicker',
    '.door-lede',
    '.door-nav a',
    '.door-tile h3',
    '.door-tile p',
    '.door-more',
    '.pinned-name',
    '.deck-cap',
    // The real-stall card's name line under the widget (same evening), and
    // the empty pinned card's gesture demo: its sign's name and its row.
    '.door-widget-name',
    '.pin-demo-name',
    '.pin-demo-row b',
    // The Studio's four doors and a row's state line (round 16): the door's
    // name and its one line sit on the surface, the state under a name on
    // the card; both are new ink on a public panel every look dresses.
    '.tool-t',
    '.tool-lede',
    '.tstate',
    // The row's glance at its token under the name (2026-09-26): the ticker
    // and the short id, muted, on the same card ground as `.tstate`. Its one
    // screen, `studio-items`, is geometry only until step 5b (see
    // `GEOMETRY_ONLY_SCREENS`), so this reads nothing on a shipped run
    // today; a trial run with the screen sampled read 5.58:1 at the least.
    '.tid',
    '.wchip',
    /*
     * The shop tile's own letters (2026-09-20). `.event-sum .event-ic` was
     * added for exactly this class of defect and stopped at the Activity
     * tile, so the tile beside every product name went unmeasured — and
     * two looks replaced the base rule's accent gradient with a flat
     * literal while leaving `color: var(--s-bg)` behind, landing at 1.10:1
     * on Rural and 1.18:1 on Neo. `targetFor` skips a tile wearing an
     * `<img>`, so what this samples is the letters and never a picture.
     */
    '.item-ic',
    /*
     * The lines that stand on the stall's own ground (2026-09-24, the
     * owner's condition on the rain ground): a failure or empty sentence,
     * a note, the item face's pointer, the first-stall checklist, the wall's
     * status line and caption. Found by sampling every text node on every
     * screen on Neo worn over the brightest drop; each had no box of its
     * own, so under the rain it read 1.1–2.9:1 and nothing here measured it.
     * They match on every look, but a target is read only where its screen
     * is sampled: `.mid-p` on the failure screens and the empty stall on
     * every look; the quotes rail's failure lines, the checklist and the
     * notice invite on Neo worn alone (`RAIN_JOBS`, geometry-only screens).
     * Where the rain is worn each wears the outline (round 8) and is read
     * in the ring around its glyphs rather than over its box.
     */
    '.notice-text',
    '.sparse-empty-t',
    '.sparse-empty-s',
    '[data-role="list-first"]',
    '.mid-t',
    '.mid-p',
    '.pay-sec > .fine',
    '.stall-body > .fine',
    '.studio-browser .fine',
    '[data-role="activity-about"] > .fold-sum',
    '.activity-about .fine',
    '.item-face > .pay-pointer',
    '.first-stall .steps li > span',
    '.first-stall .fine',
    '.sw-state',
    '.sw-fresh',
    '.sw-plate .sw-cap',
    // The notice invite's words, on its own wash over the ground
    // (`sparse-pasted`, the critic's fourth pass).
    '.notice-invite .invite-text',
    /*
     * The rest of what the rain exposed: the brand strip, the footer's
     * Wearing line and its links, the section and shelf heads, the face's
     * back control. Scoped to the rain until step 5b, because the box read
     * failed three of them on other looks — two the sampler's own mistakes
     * (Modern's heads read against their 2px accent underline, Rural's strip
     * against the bunting row in its box) and one real (Rural's Wearing
     * links under Sun-faded, 2.53:1, fixed since in the mood's inks). Read
     * over their line rects (D7) they are read on every look, bare and worn;
     * where the rain is worn they wear the outline and are read in its ring
     * (SAMPLER-STEP-PLAN §2).
     */
    '.orn',
    '.wearing',
    '.wearing-link',
    '.section-title',
    '.collection-name',
    '.collection-count',
    '.item-back',
    /*
     * The rest of the lines standing on the rain's ground, each outlined
     * there (round 8): the Activity rows, the first-stall steps' numbers,
     * the footer's lines and the notice invite's chip. On the rain only: elsewhere they stand on a
     * card or on a ground every look was proved on.
     */
    '.stall.att-rainfall:not(.deck-stall) .event-kind',
    '.stall.att-rainfall:not(.deck-stall) .event-time',
    '.stall.att-rainfall:not(.deck-stall) .event-txid',
    '.stall.att-rainfall:not(.deck-stall) .event-dt',
    // A wide field holds its value and a copy control on its own ground:
    // the line is the value (round 8), and the control is `.mini`'s.
    '.stall.att-rainfall:not(.deck-stall) .event-dd:not(.wide)',
    '.stall.att-rainfall:not(.deck-stall) .event-dd.wide > .event-txid-full',
    '.stall.att-rainfall:not(.deck-stall) .event-body > .fine',
    '.stall.att-rainfall:not(.deck-stall) .activity-sec > .fine',
    '.stall.att-rainfall:not(.deck-stall) .first-stall .steps li > i',
    '.stall.att-rainfall:not(.deck-stall) .stall-foot .fine',
    '.stall.att-rainfall:not(.deck-stall) .notice-invite .ghost-chip',
    // A guide link inside a line (CRITIC-4 item 5): the probe reads a
    // target against its own ink, so an anchor with a different colour
    // inside a measured line was never read — the first-stall and studio
    // links painted the browser's blue at 2.15:1 on Neo. They wear
    // `.cashtab-link`'s dress now (`guide-link`), and every guide link is
    // read against its own.
    '[data-role$="-guide-link"]',
].join(', ');

/**
 * **Every contrast target**: the list above and the honest-display
 * sentences on the four money sheets, by role (8e2, CRITIC-STEP-8E2 item
 * 11; `layout/honestDisplay.ts`). Kept apart from the list so a prepare
 * can put them after it — the boxes the list matched keep the index, and
 * so the dump key, they had — and drop an honest line that is not rendered
 * at this width before it is counted: a hidden line or the record sheets'
 * desk-only code caption on a phone is not a target where it is not on
 * screen. Every rule that asks "is this a contrast target" asks this.
 */
const CONTRAST = `${CONTRAST_TEXT}, ${HONEST_SELECTOR}`;

/**
 * **The outline under a line on a decoration** (round 8, 2026-09-25; the
 * owner's rule: no ground under text over a decoration, and "cho lớp nền tối
 * ngay dưới nét chữ" where a line does not read). Every line standing on
 * Neo's bare ground where the rain is worn wears `text-shadow` in the look's
 * own ground at alpha 1 and zero blur — one of the two sets in
 * `layout/outline.ts`.
 */
type Shadow = { rgb: [number, number, number]; alpha: number; x: number; y: number; blur: number };

/** A computed `text-shadow` as its shadows, or `undefined` when a part does not read. */
function shadowsOf(value: string): Shadow[] | undefined {
    if (value === 'none') return [];
    const out: Shadow[] = [];
    for (const part of splitLayers(value)) {
        const m = /^(rgba?\([^)]*\)|color\([^)]*\)|oklab\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px$/.exec(part);
        const colour = m === null ? undefined : colourOf(m[1]!);
        if (m === null || colour === undefined) return undefined;
        out.push({ ...colour, x: Number(m[2]), y: Number(m[3]), blur: Number(m[4]) });
    }
    return out;
}

/**
 * The outline `node` wears, from its computed `text-shadow` and never from a
 * marker: its width — 1 or 2 when its opaque, unblurred shadows are all one
 * colour and exactly one of the two sets, 0 when it wears none, and -1 when
 * they are some other set or more than one colour, which is not an outline
 * this page can read and fails where it is checked (`outlineFaults`) — and,
 * for an outline, its colour. Any colour (option (b), the owner,
 * 2026-09-25): on a tinted surface the outline takes that surface's own
 * composited colour, and whether that colour is the ground under it is
 * `an-outline-that-shows-at-rest`'s question, not this one's. A blurred or
 * translucent shadow beside it (Neo's heading glow) is the look's own and is
 * left alone.
 */
function outlineRead(node: HTMLElement): { width: number; rgb?: readonly [number, number, number] } {
    const shadows = shadowsOf(getComputedStyle(node).textShadow);
    if (shadows === undefined) return { width: 0 };
    const hard = shadows.filter((sh) => sh.alpha === 1 && sh.blur === 0);
    if (hard.length === 0) return { width: 0 };
    const rgb = hard[0]!.rgb;
    if (hard.some((sh) => sh.rgb.some((c, i) => c !== rgb[i]))) return { width: -1 };
    const width = outlineSet(hard.map((sh) => [sh.x, sh.y] as const));
    return width === 0 ? { width: -1 } : { width, rgb };
}

/** The hard, opaque shadows of `node`'s computed `text-shadow` — its outline — and nothing else. */
function outlineOnly(node: HTMLElement): string {
    const hard = (shadowsOf(getComputedStyle(node).textShadow) ?? []).filter((sh) => sh.alpha === 1 && sh.blur === 0);
    return hard.length === 0 ? 'none' : hard.map((sh) => `rgb(${sh.rgb.join(', ')}) ${sh.x}px ${sh.y}px 0px`).join(', ');
}

function outlineOf(node: HTMLElement): number {
    return outlineRead(node).width;
}

/*
 * **An outline is only where the text has no ground of its own** (round 8,
 * 2026-09-25, the critic's item 5 on the rain round). The outline a line
 * wears over a decoration (`outlineOf`) is the owner's "dark layer right
 * under the strokes" — and on a card, a chip, a sheet or a filled button it
 * is a mark the text never needed. So on every screen, look and variant of
 * every pass, each element with text of its own that wears the outline:
 *
 * - has no ground of its own anywhere between it and its stall's root — a
 *   background colour, or a full-size gradient, at half opacity or more
 *   (`paintsOpaqueGround`: a card, a chip, a sheet, a filled button) —
 *   "an outline where the text has its own ground";
 * - wears the set its size calls for: the two-pixel set under 14px, the
 *   one-pixel set at or over it — read off the computed size, which a
 *   stylesheet cannot know for a rule;
 * - wears one of the two sets exactly, in one colour (`outlineOf` answers
 *   -1 otherwise);
 * - wears it in the colour of the ground it stands on — "an outline that
 *   shows at rest", its own check (`AT_REST_CHECK`, below);
 * - and is a contrast target or inside one ("an outline nobody reads") —
 *   and the runner holds each such target to having been read in the ring
 *   on some contrast job (`outlinedTargets`), so a screen no rain job
 *   samples cannot hide one.
 *
 * `outlineChecks` counts the outlined elements read, and the runner requires
 * some on the phone and desk passes (`probe-coverage.mjs`).
 *
 * **Asked only where a decoration that outlines is worn** (step 5b,
 * CRITIC-FINAL-MERGE item 4; the horizon since step 5a″), and only on the
 * surface that decoration paints (`OUTLINE_SURFACES`), where the outline is
 * scoped in stall.css. Elsewhere an opaque,
 * unblurred `text-shadow` is a look's own mark — an emboss, a letterpress —
 * and not this rule's; the look rules and the static
 * `an-outline-is-the-only-mark-under-text-on-a-decoration` govern it.
 */
const OUTLINE_CHECK = 'an-outline-where-the-text-has-its-own-ground';

/**
 * **The decorations that outline a line, and the surface each paints on**
 * (step 5a″, D14, the owner's (a), 2026-09-27). The rain falls on the stall's
 * own ground, so its surface is the stall root and a line anywhere on the
 * bare ground may wear its outline. Grid horizon draws its skyline, windows
 * and stars on the sign's own box (`.stall-sign`), so its surface is the
 * sign, and only a line on the sign may wear the outline for it; the sign's
 * panel (`.stall-head`) lies under that art. Everything between a line and
 * its surface is the line's own ground (`an-outline-where-the-text-has-its-own-ground`);
 * everything under the surface is not.
 */
const OUTLINE_SURFACES: ReadonlyArray<{ cls: string; surface: (node: HTMLElement, stall: HTMLElement) => HTMLElement | null }> = [
    { cls: 'att-horizon', surface: (node) => node.closest<HTMLElement>('.stall-sign') },
    { cls: 'att-rainfall', surface: (_node, stall) => stall },
];

/** The surface the decoration a line may be outlined for paints on, or `undefined` where none is worn. */
function outlineSurface(node: HTMLElement): HTMLElement | undefined {
    const stall = node.closest<HTMLElement>('.stall');
    if (stall === null) return undefined;
    for (const d of OUTLINE_SURFACES) {
        if (!stall.classList.contains(d.cls)) continue;
        const at = d.surface(node, stall);
        if (at !== null) return at;
    }
    return undefined;
}
let outlineChecks = 0;

/*
 * **An outline that shows at rest** (round 10, 2026-09-25: the owner's (b)
 * as a guard). The outline is there for the moment a drop crosses a line;
 * with no drop behind it, it must not be seen. So an outlined line's outline
 * colour must be the ground painted under it, within `AT_REST_LEVELS` on
 * every channel (`groundUnder`): the stall root's own colour, with every
 * background colour and full-size gradient laid between the line and the
 * root — the line's own box included — composited over it in paint order.
 *
 * - **A gradient** laid under the line (the notice's wash) is no single
 *   colour, so the outline is held to the colours it paints **under the
 *   line itself** — a linear gradient is evaluated across the line's own
 *   box, every colour composited over what lies under it, `AT_REST_LEVELS`
 *   either side — and never to one: the notice's midpoint passes, the
 *   look's ground under it fails. It was held to anywhere between the
 *   gradient's stops until step 5b (CRITIC-FINAL-MERGE item 3): a gradient
 *   from black to white accepted any outline at all. A gradient this rule
 *   cannot evaluate across a box (radial, conic, repeating) is still held
 *   to its stops, and counted by name (`atRestSetAside`). How far the
 *   outline shows at the wash's ends is measured and stated in
 *   `PROBE-RULES.md`, not guarded.
 * - **The root's own image layers are read by what they are**, never passed
 *   by where they sit (`a-new-root-layer-is-not-exempt-by-position`, step
 *   5b, the same item). Each layer of the stall root is one of the named
 *   exceptions in `ROOT_LAYERS_SET_ASIDE` (`layout/atRest.ts`, pure, decided
 *   by `rootLayerSetAside` from the facts read off the root), matched on its own form and on
 *   what paints it — a decoration's class worn on the stall, or the look's
 *   own backdrop as the row states it (`LOOK_BACKDROP`), never a look's
 *   `t-*` class: the rain, what the outline is for; the aurora's washes and
 *   its tint over the rain, and the look's backdrop scanlines and top glow
 *   (Neo's), gradients across the whole stall that no single colour can
 *   match, where the outline on the plain ground stays `var(--s-bg)` — or it
 *   is read like any layer under the line: a colour or a full-size gradient
 *   composited in, anything else a failure. Until step 5b every root layer
 *   was passed by its position, so a new root decoration's layer would have
 *   been exempt the day it shipped. Until 2026-10-06 the backdrop's two were
 *   keyed to `t-neo`, so the kit's Neo starter — the same row under
 *   `t-workshop` — was read without them and failed 212 lines its look did
 *   not paint (`every-starter-is-measured-as-its-shipped-look`). Neo's
 *   heading glow is the other stated exception: a shadow the heading paints
 *   under its own outline, not a ground, so this rule cannot see it. Their
 *   levels at rest are measured and stated (`PROBE-RULES.md`, round 10).
 * - A picture laid under the line between it and the root — a `url()`
 *   layer of any size — is a ground this rule cannot read, and fails (a
 *   picture smaller than its box was passed silently until step 5b).
 * - Set aside and counted by reason (`atRestSetAside`), never silently: a
 *   gradient sized smaller than its box (the vacant box's corner brackets,
 *   the sign's rules — an ornament, not the ground under a line). Not read,
 *   stated: a ground painted by a pseudo-element or by a box that is not an
 *   ancestor, and an ancestor's `opacity` or blend.
 */
const AT_REST_CHECK = 'an-outline-that-shows-at-rest';
const AT_REST_LEVELS = 4;

type Rgb = readonly [number, number, number];

/** `colour` at its alpha over `under`. */
function over(colour: { rgb: Rgb; alpha: number }, under: Rgb): Rgb {
    return under.map((c, i) => colour.rgb[i]! * colour.alpha + c * (1 - colour.alpha)) as unknown as Rgb;
}

/**
 * The look's own backdrop layers as this stall computes them
 * (`LOOK_BACKDROP`), cached by the backdrop's computed value. An
 * unregistered custom property computes to its tokens with every `var()`
 * substituted, so that string fixes the layers (a mood that swaps the
 * accent is a new key), and they are computed from it on a node outside
 * `#app`, never inside the tree being measured: `display: none`, gone before
 * the call returns. A value that still named a `var()` would compute to no
 * layer there, and the backdrop would then be read as a ground and fail
 * loudly, never pass silently.
 */
const backdropComputed = new Map<string, readonly string[]>();
function backdropLayers(stall: HTMLElement): readonly string[] {
    const value = getComputedStyle(stall).getPropertyValue(LOOK_BACKDROP).trim();
    const cached = backdropComputed.get(value);
    if (cached !== undefined) return cached;
    let layers: readonly string[] = [];
    if (value !== '' && value !== 'none') {
        const scratch = document.createElement('div');
        scratch.style.display = 'none';
        scratch.style.backgroundImage = value;
        document.body.append(scratch);
        const computed = getComputedStyle(scratch).backgroundImage;
        scratch.remove();
        layers = computed === 'none' ? [] : splitLayers(computed);
    }
    backdropComputed.set(value, layers);
    return layers;
}

/** What the at-rest decision is handed about a stall root (`rootLayerSetAside`, `layout/atRest.ts`). */
function rootFacts(stall: HTMLElement): RootFacts {
    const cs = getComputedStyle(stall);
    return {
        classes: [...stall.classList],
        backdrop: backdropLayers(stall),
        tokens: Object.fromEntries(ROOT_TOKENS.map((t) => [t, colourOf(cs.getPropertyValue(t).trim())])),
    };
}

/** What the at-rest rule set aside, by reason, over the whole pass. */
const atRestSetAside: Record<string, number> = {};
const setAside = (why: string): void => {
    atRestSetAside[why] = (atRestSetAside[why] ?? 0) + 1;
};

const FULL_SIZE = ['auto', 'auto auto', 'cover', '100% 100%', '100%'];

/** The colour stops of a gradient's computed text, each with its position as a share of the gradient line, or `undefined`. */
function gradientStops(args: string[], length: number): { c: { rgb: Rgb; alpha: number }; at: number }[] | undefined {
    const stops: { c: { rgb: Rgb; alpha: number }; at: number | undefined }[] = [];
    for (const arg of args) {
        const m = /^(rgba?\([^)]*\)|color\([^)]*\))(?:\s+(-?[\d.]+)(%|px))?(?:\s+(-?[\d.]+)(%|px))?$/.exec(arg);
        if (m === null) return undefined;
        const c = colourOf(m[1]!);
        if (c === undefined) return undefined;
        const pos = (v: string | undefined, u: string | undefined): number | undefined =>
            v === undefined ? undefined : u === '%' ? Number(v) / 100 : Number(v) / length;
        stops.push({ c, at: pos(m[2], m[3]) });
        if (m[4] !== undefined) stops.push({ c, at: pos(m[4], m[5]) });
    }
    if (stops.length < 2) return undefined;
    stops[0]!.at ??= 0;
    stops[stops.length - 1]!.at ??= 1;
    // A stop with no position sits evenly between its neighbours that have one.
    for (let i = 1; i < stops.length - 1; i += 1) {
        if (stops[i]!.at !== undefined) continue;
        let j = i;
        while (stops[j]!.at === undefined) j += 1;
        const from = stops[i - 1]!.at!;
        const to = stops[j]!.at!;
        for (let k = i; k < j; k += 1) stops[k]!.at = from + ((to - from) * (k - i + 1)) / (j - i + 1);
    }
    // Positions never run backwards (CSS clamps a later stop to the one before it).
    for (let i = 1; i < stops.length; i += 1) stops[i]!.at = Math.max(stops[i]!.at!, stops[i - 1]!.at!);
    return stops as { c: { rgb: Rgb; alpha: number }; at: number }[];
}

/** A gradient's colour at `t` on its line, interpolated in premultiplied sRGB, as CSS does. */
function colourAt(stops: { c: { rgb: Rgb; alpha: number }; at: number }[], t: number): { rgb: Rgb; alpha: number } {
    if (t <= stops[0]!.at) return stops[0]!.c;
    for (let i = 1; i < stops.length; i += 1) {
        const a = stops[i - 1]!;
        const b = stops[i]!;
        if (t > b.at) continue;
        const f = b.at === a.at ? 1 : (t - a.at) / (b.at - a.at);
        const alpha = a.c.alpha + (b.c.alpha - a.c.alpha) * f;
        const rgb = [0, 1, 2].map((k) => {
            const pre = a.c.rgb[k]! * a.c.alpha + (b.c.rgb[k]! * b.c.alpha - a.c.rgb[k]! * a.c.alpha) * f;
            return alpha === 0 ? 0 : pre / alpha;
        }) as unknown as Rgb;
        return { rgb, alpha };
    }
    return stops[stops.length - 1]!.c;
}

/**
 * The colours a full-size `linear-gradient` on `el` paints under `line`
 * (a box inside it): the gradient line's share at each corner of `line`,
 * and the colours between them — the stops that fall inside and sixteen
 * steps — or `undefined` for a gradient this cannot evaluate.
 */
function linearUnder(layer: string, el: HTMLElement, line: DOMRect): { rgb: Rgb; alpha: number }[] | undefined {
    const m = /^linear-gradient\((.*)\)$/.exec(layer);
    if (m === null) return undefined;
    const args = splitLayers(m[1]!);
    let angle = 180;
    const head = args[0]!;
    const deg = /^(-?[\d.]+)deg$/.exec(head);
    const TO: Record<string, number> = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 };
    if (deg !== null) {
        angle = Number(deg[1]);
        args.shift();
    } else if (TO[head] !== undefined) {
        angle = TO[head]!;
        args.shift();
    } else if (/^to /.test(head)) {
        return undefined;
    }
    const box = el.getBoundingClientRect();
    const rad = (angle * Math.PI) / 180;
    const dir = [Math.sin(rad), -Math.cos(rad)];
    const length = Math.abs(box.width * dir[0]!) + Math.abs(box.height * dir[1]!);
    const stops = length > 0 ? gradientStops(args, length) : undefined;
    if (stops === undefined) return undefined;
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const ts = [
        [line.left, line.top],
        [line.right, line.top],
        [line.left, line.bottom],
        [line.right, line.bottom],
    ].map(([x, y]) => 0.5 + ((x! - cx) * dir[0]! + (y! - cy) * dir[1]!) / length);
    const t0 = Math.max(0, Math.min(...ts));
    const t1 = Math.min(1, Math.max(...ts));
    const at = [...Array.from({ length: 17 }, (_, k) => t0 + ((t1 - t0) * k) / 16), ...stops.map((s) => s.at).filter((t) => t > t0 && t < t1)];
    return at.map((t) => colourAt(stops, t));
}

/** A layer's colours composited over the range `lo`…`hi`, widening it. */
function composite(colours: { rgb: Rgb; alpha: number }[], lo: Rgb, hi: Rgb): { lo: Rgb; hi: Rgb } {
    const painted = colours.flatMap((c) => [over(c, lo), over(c, hi)]);
    return {
        lo: [0, 1, 2].map((k) => Math.min(...painted.map((c) => c[k]!))) as unknown as Rgb,
        hi: [0, 1, 2].map((k) => Math.max(...painted.map((c) => c[k]!))) as unknown as Rgb,
    };
}

/**
 * The ground painted under `node` as its lowest and highest colour on each
 * channel (one colour, when nothing between it and its stall's root is a
 * gradient), or the layer this rule cannot read — a picture, or a root layer
 * it does not know.
 */
function groundUnder(node: HTMLElement): { lo: Rgb; hi: Rgb } | { picture: Element; what: string } | undefined {
    const stall = node.closest<HTMLElement>('.stall');
    const base = stall === null ? undefined : colourOf(getComputedStyle(stall).backgroundColor);
    if (stall === null || base === undefined || base.alpha < 1) return undefined;
    const line = node.getBoundingClientRect();
    const chain: HTMLElement[] = [stall];
    for (let at: HTMLElement | null = node; at !== null && at !== stall; at = at.parentElement) chain.splice(1, 0, at);
    let lo: Rgb = base.rgb;
    let hi: Rgb = base.rgb;
    let facts: RootFacts | undefined;
    const classes = [...stall.classList];
    for (const el of chain) {
        const cs = getComputedStyle(el);
        const fill = colourOf(cs.backgroundColor);
        if (el !== stall && fill !== undefined && fill.alpha > 0) {
            lo = over(fill, lo);
            hi = over(fill, hi);
        }
        if (cs.backgroundImage === 'none') continue;
        const layers = splitLayers(cs.backgroundImage);
        const sizes = splitLayers(cs.backgroundSize);
        // Bottom layer first: the first layer listed paints on top.
        for (let i = layers.length - 1; i >= 0; i -= 1) {
            const size = sizes[i % sizes.length]!;
            const layer = layers[i]!;
            if (el === stall) {
                facts ??= rootFacts(stall);
                const known = rootLayerSetAside(layer, facts);
                if (known !== undefined) {
                    setAside(known);
                    continue;
                }
                if (!FULL_SIZE.includes(size) || !/gradient\(/.test(layer)) {
                    return { picture: el, what: `a root layer this rule does not know (${layer.slice(0, 60)}…, ${size}) — a-new-root-layer-is-not-exempt-by-position` };
                }
            }
            const art = surfaceArtSetAside(layer, classes, (selector) => el.matches(selector));
            if (art !== undefined) {
                setAside(art);
                continue;
            }
            if (/^url\(/.test(layer)) return { picture: el, what: `a picture (${size}) this rule cannot read` };
            if (!/gradient\(/.test(layer)) continue;
            if (!FULL_SIZE.includes(size)) {
                setAside('a gradient smaller than its box');
                continue;
            }
            const under = linearUnder(layer, el, line);
            if (under !== undefined) {
                ({ lo, hi } = composite(under, lo, hi));
                continue;
            }
            // Held to its stops: a gradient this cannot evaluate across a box.
            setAside('a gradient held to its stops');
            const stops = (layer.match(/rgba?\([^)]*\)|color\([^)]*\)/g) ?? [])
                .map((c) => colourOf(c))
                .filter((c): c is NonNullable<typeof c> => c !== undefined);
            if (stops.length === 0) continue;
            ({ lo, hi } = composite(stops, lo, hi));
        }
    }
    return { lo, hi };
}

/** An rgb triple as the probe prints one. */
function rgbText(c: Rgb): string {
    return `rgb(${c.map((v) => Math.round(v)).join(', ')})`;
}
/**
 * The contrast targets an outlined line was found in, described as the
 * contrast pass describes a target: the runner holds every one to having
 * been read in the ring at least once ("an outline nobody reads"), so an
 * outlined line on a screen no rain job samples fails the run.
 */
const outlinedTargets = new Set<string>();

/**
 * Whether an element paints a ground of its own over its whole box: a colour,
 * or a full-size gradient whose every stop is, at half opacity or more. A
 * filled button is 86% on Neo and is the button's own ground; a tint under
 * text on the rain (the txid pill's 12%, the invite's 4%, the call to
 * action's 16%) is not, and the rain shows through it.
 */
const OWN_GROUND_ALPHA = 0.5;

function paintsOpaqueGround(cs: CSSStyleDeclaration): boolean {
    if ((colourOf(cs.backgroundColor)?.alpha ?? 0) >= OWN_GROUND_ALPHA) return true;
    if (cs.backgroundImage === 'none') return false;
    const sizes = splitLayers(cs.backgroundSize);
    return splitLayers(cs.backgroundImage).some((layer, i) => {
        const size = sizes[i % sizes.length]!;
        const full = ['auto', 'auto auto', 'cover', '100% 100%', '100%'].includes(size);
        if (!full || !/gradient\(/.test(layer)) return false;
        const stops = layer.match(/rgba?\([^)]*\)|color\([^)]*\)/g) ?? [];
        return stops.length > 0 && stops.every((c) => (colourOf(c)?.alpha ?? 0) >= OWN_GROUND_ALPHA);
    });
}

function outlineFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    const fail = (node: Element, what: string): void => {
        out.push({ screen, theme: label, check: OUTLINE_CHECK, detail: `${describe(node)} "${(node.textContent ?? '').trim().slice(0, 24)}" ${what}` });
    };
    for (const node of document.querySelectorAll<HTMLElement>('#app .stall *')) {
        let own = '';
        for (const child of node.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) own += child.textContent ?? '';
        }
        if (own.trim() === '' || node.closest('.deck-stall') !== null) continue;
        // Only where a decoration that outlines is worn (CRITIC-FINAL-MERGE
        // item 4, step 5b; `OUTLINE_SURFACES`): the outline is scoped to
        // those decorations in stall.css, and a hard shadow anywhere else
        // is a look's own mark — a white emboss on Rural is not an outline,
        // and was failed as one ("neither outline set") on every look until
        // this line.
        const surface = outlineSurface(node);
        if (surface === undefined) continue;
        const { width, rgb } = outlineRead(node);
        if (width === 0) continue;
        outlineChecks += 1;
        if (width < 0) {
            fail(node, 'wears opaque unblurred shadows that are neither outline set in one colour');
            continue;
        }
        const px = Number.parseFloat(getComputedStyle(node).fontSize);
        const owed = px < OUTLINE_2_UNDER_PX ? 2 : 1;
        if (width !== owed) {
            fail(node, `paints at ${px}px and wears the ${width}px outline; its size owes the ${owed}px one`);
        }
        // Up to the surface the decoration paints on, never past it: what
        // lies under the decoration (the sign's panel under the horizon's
        // skyline) is not the text's own ground, and what lies between the
        // line and the decoration — a card, a chip, a filled button — is.
        const root = node.closest('.stall');
        for (let at: HTMLElement | null = node; at !== null && at !== root && at !== surface; at = at.parentElement) {
            if (paintsOpaqueGround(getComputedStyle(at))) {
                fail(node, `wears the outline over ${describe(at)}, a ground of its own — an outline where the text has its own ground`);
                break;
            }
        }
        const ground = rgb === undefined ? undefined : groundUnder(node);
        if (rgb !== undefined && ground !== undefined) {
            const said = `${describe(node)} "${(node.textContent ?? '').trim().slice(0, 24)}" wears its outline in ${rgbText(rgb)}`;
            if ('picture' in ground) {
                out.push({ screen, theme: label, check: AT_REST_CHECK, detail: `${said} over ${ground.what} on ${describe(ground.picture)} — an outline that shows at rest` });
            } else if (rgb.some((c, i) => c < ground.lo[i]! - AT_REST_LEVELS || c > ground.hi[i]! + AT_REST_LEVELS)) {
                const painted = ground.lo.every((c, i) => Math.abs(c - ground.hi[i]!) < 0.5) ? rgbText(ground.lo) : `${rgbText(ground.lo)} to ${rgbText(ground.hi)}`;
                out.push({ screen, theme: label, check: AT_REST_CHECK, detail: `${said} over a ground painted ${painted} — an outline that shows at rest` });
            }
        }
        const target = node.closest(CONTRAST);
        if (target === null) {
            fail(node, 'wears the outline and is no contrast target — an outline nobody reads');
        } else {
            outlinedTargets.add(describe(target));
        }
    }
    return out;
}

/*
 * **The money set is every protected contrast target** (step 5b; its static
 * half is `layout/moneySet.test.ts`). On every screen, look and variant of
 * every geometry pass: every painted node that is a contrast target AND a
 * protected box — or a contrast target standing inside a protected box that
 * is money — must be money (`MONEY`), because the contrast pass reads a
 * money box whole and everything else over its line rects, and a protected
 * figure that fell to the line read would be read by a weaker verdict; and
 * every node `MONEY` matches must be a contrast target standing in a
 * protected box (`MONEY_OUTSIDE_PROTECTED` aside), or the set names
 * something that is not money. The deck's minis are pictures and are not
 * asked. `moneyChecks` counts the nodes asked; the runner requires some on
 * the phone and desk passes (`probe-coverage.mjs`).
 */
const MONEY_CHECK = 'the-money-set-is-every-protected-contrast-target';
let moneyChecks = 0;

function moneySetFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    const app = document.getElementById('app')!;
    const fail = (node: Element, what: string): void => {
        out.push({ screen, theme: label, check: MONEY_CHECK, detail: `${describe(node)} "${(node.textContent ?? '').trim().slice(0, 24)}" ${what}` });
    };
    for (const node of app.querySelectorAll(CONTRAST)) {
        if (node.closest('.deck-stall') !== null) continue;
        if (node.matches(PROTECTED)) {
            moneyChecks += 1;
            if (!node.matches(MONEY)) {
                fail(node, 'is a protected box and a contrast target, and is not in the money set');
            }
            continue;
        }
        // A target inside a money box is money's text too (the critic,
        // 2026-09-27): read over its line rects it would be read by a weaker
        // verdict than the box it stands in (`.sw-pay-v` inside `pay-lines`).
        const box = node.parentElement?.closest(PROTECTED);
        if (box !== null && box !== undefined && box.matches(MONEY)) {
            moneyChecks += 1;
            if (!node.matches(MONEY)) {
                fail(node, `is a contrast target inside the money box ${describe(box)}, and is not in the money set`);
            }
        }
    }
    for (const node of app.querySelectorAll(MONEY)) {
        if (node.closest('.deck-stall') !== null) continue;
        moneyChecks += 1;
        if (!node.matches(CONTRAST)) {
            fail(node, 'is in the money set and no contrast target');
        } else if (node.closest(PROTECTED) === null && !node.matches(MONEY_OUTSIDE_PROTECTED)) {
            fail(node, 'is in the money set and stands in no protected box');
        }
    }
    return out;
}

/*
 * **The bunting never swings into the ornament label** (step 5b; the
 * moving-decoration table's reader for `att-bunting`, `movingDecor.ts`).
 * Rural's bunting is a row in the ornament strip that sways about its own
 * `transform-origin`, and the strip's own text stands beside it. The pass
 * freezes it at one instant; this bounds it over its whole swing instead:
 * the widest turn the row's own keyframes reach (read off its running
 * animations, never stated here); the row's box before any turn (read with
 * its transform held off for the measurement and put back), from its art's
 * topmost paint down (`buntingArt.ts`: the box is taller than the drawing,
 * and its empty top read as the bunting touching the label); turned about
 * its origin to each end of the swing and back to rest, it must not reach
 * any line of the strip's own text (`Range` rects of every text node in its
 * `.orn` outside the bunting), within a device pixel.
 * `buntingChecks` counts the rows swept; the runner requires some on the
 * phone and desk passes where Rural is measured (`probe-coverage.mjs`).
 */
const BUNTING_CHECK = 'the-bunting-never-swings-into-the-ornament-label';
let buntingChecks = 0;

/** The widest turn, in degrees, any of `node`'s running animations reaches. */
function widestTurn(node: Element): number {
    let widest = 0;
    for (const a of node.getAnimations()) {
        const effect = a.effect;
        if (!(effect instanceof KeyframeEffect)) continue;
        for (const frame of effect.getKeyframes()) {
            for (const value of [frame['transform'], frame['rotate']]) {
                if (typeof value !== 'string') continue;
                for (const m of value.matchAll(/(-?[\d.]+)deg/g)) {
                    widest = Math.max(widest, Math.abs(Number(m[1])));
                }
            }
        }
    }
    return widest;
}

/** Whether the rectangle `r` (turned `a` about `p`) and the axis-aligned `q` share any area: separating axes. */
function turnedRectMeets(
    r: { x0: number; y0: number; x1: number; y1: number },
    p: [number, number],
    a: number,
    q: { x0: number; y0: number; x1: number; y1: number },
): boolean {
    const turn = ([x, y]: [number, number]): [number, number] => [
        p[0] + (x - p[0]) * Math.cos(a) - (y - p[1]) * Math.sin(a),
        p[1] + (x - p[0]) * Math.sin(a) + (y - p[1]) * Math.cos(a),
    ];
    const poly = ([[r.x0, r.y0], [r.x1, r.y0], [r.x1, r.y1], [r.x0, r.y1]] as [number, number][]).map(turn);
    const box: [number, number][] = [[q.x0, q.y0], [q.x1, q.y0], [q.x1, q.y1], [q.x0, q.y1]];
    const axes: [number, number][] = [[1, 0], [0, 1], [Math.cos(a), Math.sin(a)], [-Math.sin(a), Math.cos(a)]];
    return axes.every(([ax, ay]) => {
        const span = (pts: [number, number][]): [number, number] => {
            const d = pts.map(([x, y]) => x * ax + y * ay);
            return [Math.min(...d), Math.max(...d)];
        };
        const [p0, p1] = span(poly);
        const [q0, q1] = span(box);
        return p1 > q0 && q1 > p0;
    });
}

/** The bunting art's topmost paint as a share of its tile's height, read once (`buntingArt.ts`). */
const BUNTING_TOP = artTopShare(buntingSvg);

function buntingSwingFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    for (const row of document.querySelectorAll<HTMLElement>('#app .att-bunting')) {
        if (row.closest('.deck-stall') !== null) continue;
        const strip = row.closest('.orn');
        if (strip === null) continue;
        const fail = (detail: string): void => {
            out.push({ screen, theme: label, check: BUNTING_CHECK, detail });
        };
        const cs = getComputedStyle(row);
        // The row paints its one drawn tile from its top edge, repeated
        // sideways: the art's top is a share of that tile's height.
        const tileH = Number.parseFloat(cs.backgroundSize.split(' ')[1] ?? '');
        if (BUNTING_TOP === undefined || !Number.isFinite(tileH) || !/^(?:0%|0px) (?:0%|0px)$/.test(cs.backgroundPosition) || !['repeat-x', 'repeat no-repeat'].includes(cs.backgroundRepeat)) {
            fail(`the bunting's art or its tile (${cs.backgroundSize}; ${cs.backgroundPosition}; ${cs.backgroundRepeat}) is not one this rule reads — refused rather than guessed`);
            continue;
        }
        buntingChecks += 1;
        const turn = (widestTurn(row) * Math.PI) / 180;
        row.style.setProperty('transform', 'none', 'important');
        const box = row.getBoundingClientRect();
        const [ox, oy] = cs.transformOrigin.split(' ').map((v) => Number.parseFloat(v));
        row.style.removeProperty('transform');
        const pivot: [number, number] = [box.left + (ox ?? 0), box.top + (oy ?? 0)];
        const painted = { x0: box.left, y0: box.top + BUNTING_TOP * tileH, x1: box.right, y1: box.bottom };
        const range = document.createRange();
        const walker = document.createTreeWalker(strip, NodeFilter.SHOW_TEXT);
        for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
            if ((text.textContent ?? '').trim() === '' || text.parentElement?.closest('.att-bunting') !== null) continue;
            range.selectNodeContents(text);
            for (const r of range.getClientRects()) {
                if (r.width <= 0 || r.height <= 0) continue;
                // A device pixel's tolerance at every edge.
                const line = { x0: r.left + 1, y0: r.top + 1, x1: r.right - 1, y1: r.bottom - 1 };
                const hit = [-turn, 0, turn].find((a) => turnedRectMeets(painted, pivot, a, line));
                if (hit !== undefined) {
                    fail(
                        `the bunting's paint (from ${painted.y0.toFixed(1)}px, its art's top) turned ${((hit * 180) / Math.PI).toFixed(2)}° of its ±${((turn * 180) / Math.PI).toFixed(2)}° reaches the strip's line "${(text.textContent ?? '').trim().slice(0, 24)}" at ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`,
                    );
                }
            }
        }
    }
    return out;
}

/*
 * **A halo never reaches a neighbour's text** (step 5b; SAMPLER-STEP-PLAN
 * v2 item 10, CRITIC-SAMPLER-STEP item 11). A `box-shadow` with a spread or
 * an offset paints outside its element's box — the rain's old halos, the
 * sticky sheet head's `0 -26px` slab, a card's drop — and nothing measured
 * where. So on every screen, look and variant of the geometry passes, every
 * halo — a non-inset shadow at half opacity or more, with a spread or an
 * offset, whose blur is less than twice both (a ground laid outside a box,
 * not a glow) — has its painted extent (the box moved by its offset, grown
 * by its spread and half its blur) held off every other
 * element's text on the same surface: no line rect of a text node outside
 * the shadowing element may meet it, a device pixel in. A soft shadow (a
 * card's drop, a glow) is not a halo; measured as one, it met the next line
 * on every look (1,700 failures a pass), a guard refusing a safe design. `haloChecks` counts the
 * shadows asked; the phone and desk passes owe some.
 */
const HALO_CHECK = 'a-halo-never-reaches-a-neighbours-text';
let haloChecks = 0;

type BoxShadow = { alpha: number; x: number; y: number; blur: number; spread: number; inset: boolean };

let haloCtx: CanvasRenderingContext2D | undefined;

/** A computed `box-shadow` as its shadows, or `undefined` for a part that does not read. */
function boxShadowsOf(value: string): BoxShadow[] | undefined {
    if (value === 'none') return [];
    const out: BoxShadow[] = [];
    for (const part of splitLayers(value)) {
        const m = /^((?:rgba?|color|oklab|oklch|lab|lch)\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?(?:\s+(-?[\d.]+)px)?(\s+inset)?$/.exec(part);
        if (m === null) return undefined;
        // The browser resolves the colour (a 1×1 canvas, `paintedGrounds`'
        // way): `oklab()` and `color-mix()` results read like any `rgb()`.
        haloCtx ??= (() => {
            const c = document.createElement('canvas');
            c.width = 1;
            c.height = 1;
            return c.getContext('2d', { willReadFrequently: true })!;
        })();
        haloCtx.clearRect(0, 0, 1, 1);
        haloCtx.fillStyle = 'transparent';
        haloCtx.fillStyle = m[1]!;
        haloCtx.fillRect(0, 0, 1, 1);
        const alpha = haloCtx.getImageData(0, 0, 1, 1).data[3]! / 255;
        out.push({ alpha, x: Number(m[2]), y: Number(m[3]), blur: Number(m[4] ?? 0), spread: Number(m[5] ?? 0), inset: m[6] !== undefined });
    }
    return out;
}

function haloFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    const app = document.getElementById('app')!;
    // Every text rect on the page, once, with the element that owns it.
    const lines: { owner: Element; r: DOMRect; text: string }[] = [];
    const range = document.createRange();
    const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
        const owner = text.parentElement;
        if (owner === null || (text.textContent ?? '').trim() === '' || owner.closest('.deck-stall, svg') !== null) continue;
        if (getComputedStyle(owner).visibility !== 'visible') continue;
        range.selectNodeContents(text);
        for (const r of range.getClientRects()) {
            if (r.width > 0 && r.height > 0) lines.push({ owner, r, text: (text.textContent ?? '').trim().slice(0, 24) });
        }
    }
    for (const el of app.querySelectorAll<HTMLElement>('*')) {
        if (el.closest('.deck-stall') !== null) continue;
        const cs = getComputedStyle(el);
        if (cs.boxShadow === 'none') continue;
        const shadows = boxShadowsOf(cs.boxShadow);
        if (shadows === undefined) {
            out.push({ screen, theme: label, check: HALO_CHECK, detail: `${describe(el)} wears a box-shadow this rule cannot read: ${cs.boxShadow.slice(0, 80)}` });
            continue;
        }
        const box = el.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        for (const sh of shadows) {
            // A halo is a ground: a hard shadow (no blur) at half opacity or
            // more, with a spread or an offset. A soft shadow — a card's
            // drop, a glow — is light around a box, not a ground under text,
            // and measured literally it met the next line on every look.
            // Soft means the blur outreaches the ground the shadow lays: at
            // least twice its spread and its offset (the critic, 2026-09-27 —
            // a 1px blur on a 30px spread is a slab, not a glow).
            const soft = sh.blur > 0 && sh.blur >= 2 * Math.max(sh.spread, Math.abs(sh.x), Math.abs(sh.y));
            if (sh.inset || soft || sh.alpha < OWN_GROUND_ALPHA || (sh.spread === 0 && sh.x === 0 && sh.y === 0)) continue;
            haloChecks += 1;
            const grow = Math.max(0, sh.spread) + sh.blur / 2;
            const x0 = box.left + sh.x - grow;
            const x1 = box.right + sh.x + grow;
            const y0 = box.top + sh.y - grow;
            const y1 = box.bottom + sh.y + grow;
            // Only text on the same surface: behind an open sheet's scrim the
            // stall is another layer, under the sheet and its slab.
            const surface = el.closest('.sheet, [data-role="poster"]');
            const hit = lines.find(
                ({ owner, r }) =>
                    owner.closest('.sheet, [data-role="poster"]') === surface &&
                    !el.contains(owner) &&
                    !owner.contains(el) &&
                    // Outside the element's own box: a shadow never paints under
                    // its own border box.
                    !(r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom) &&
                    r.right > x0 + 1 && r.left < x1 - 1 && r.bottom > y0 + 1 && r.top < y1 - 1,
            );
            if (hit !== undefined) {
                out.push({
                    screen,
                    theme: label,
                    check: HALO_CHECK,
                    detail: `${describe(el)}'s shadow (${sh.x}px ${sh.y}px, blur ${sh.blur}, spread ${sh.spread}) reaches ${describe(hit.owner)} "${hit.text}" at ${Math.round(hit.r.left)},${Math.round(hit.r.top)}`,
                });
                break;
            }
        }
    }
    return out;
}

/*
 * **A tile shows its letters whole** (2026-09-24, the critic's item 10).
 * A token tile (`.item-ic`) paints the name's initials until a picture
 * lands, and it clips (`overflow: hidden`, a radius): the Activity row's
 * tile is 24px, and with its letters raised to 11px the widest pair —
 * "WM", `WIDE_INITIALS` on the `activity` fixture — measured 22.1px of text
 * in a 22px content box on Modern (21.8 on Rural, 13.7 in Neo's mono). A
 * clip cuts letters silently: `text-spills` reads only a box whose overflow
 * is visible. So for every tile showing letters, the letters' own extent
 * (a Range over its text) must fit the tile's content box, within a pixel.
 */
const TILE_CHECK = 'a-tile-shows-its-letters-whole';

function tileLetterCuts(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    for (const tile of document.querySelectorAll<HTMLElement>('#app .item-ic')) {
        if (tile.closest('.deck-stall') !== null || tile.querySelector('img') !== null) {
            continue;
        }
        const text = (tile.textContent ?? '').trim();
        const box = tile.getBoundingClientRect();
        if (text === '' || box.width === 0 || box.height === 0) {
            continue;
        }
        // The letters' own span (step 8f1): the tile's mark stands beside
        // it, and a look that shows the mark would otherwise lend its box to
        // the letters' extent (the 8f1 critic's item 8).
        const range = document.createRange();
        range.selectNodeContents(tile.querySelector('.ic-initials') ?? tile);
        const ink = range.getBoundingClientRect();
        const cs = getComputedStyle(tile);
        const bl = Number.parseFloat(cs.borderLeftWidth) || 0;
        const bt = Number.parseFloat(cs.borderTopWidth) || 0;
        const inner = { left: box.left + bl, top: box.top + bt, right: box.left + bl + tile.clientWidth, bottom: box.top + bt + tile.clientHeight };
        if (ink.left < inner.left - 1 || ink.right > inner.right + 1 || ink.top < inner.top - 1 || ink.bottom > inner.bottom + 1) {
            out.push({
                screen,
                theme: label,
                check: TILE_CHECK,
                detail: `${describe(tile)} "${text}" spans ${ink.width.toFixed(1)}×${ink.height.toFixed(1)}px in a ${tile.clientWidth}×${tile.clientHeight}px box, so its clip cuts the letters`,
            });
        }
    }
    return out;
}

/*
 * **No shipped look shows a mark** (`no-shipped-look-shows-a-mark`, step 8f1
 * after its critic, item 2). The marks a look may dress (`lookMark`,
 * `src/ui/lookHooks.ts`: under every figure, first in every shelf, beside a
 * tile's initials) are inert on every look this build does not carry as a
 * private one — the three shipped looks, the skeleton, the kit and the
 * harness's worn-only fixture: on every screen, look and variant of every
 * geometry pass, each `[data-look-mark]` computes `display: none`, holds
 * nothing and is `aria-hidden`. A selector a look writes can reach a mark
 * without naming it (`.item-a > :last-child`, `:empty`), so the static
 * guard (`no-app-sheet-names-a-mark`) cannot be the whole of it; this reads
 * the cascade. A carried private look is the one that may show its marks,
 * and what measures them shown is 8f2's. Counted per look class
 * (`markChecksByClass`); every pass owes a read on each class it painted
 * that is not a private look's (`probe-coverage.mjs`). Red by the critic's
 * two plants on Rural: `.item-a > :last-child { display: inline-block }`
 * and `.item-a > :empty { display: inline-block }`.
 */
const MARK_CHECK = 'no-shipped-look-shows-a-mark';
const markChecksByClass: Record<string, number> = {};

/**
 * Marks a carried private look shows, per class (step 8f2): such a look may
 * show its marks, and a mark it shows is still the renderer's empty,
 * aria-hidden node — what it paints is measured by the contrast pass
 * (`no-look-mark-paints-inside-a-protected-box`). The tracked fixture owes
 * some at the desk (`probe-coverage.mjs`), so the capture has a subject.
 */
const marksShownByClass: Record<string, number> = {};

function markFaults(screen: string, label: string, look: Look): Failure[] {
    const out: Failure[] = [];
    const cls = look.theme.sheetClass;
    if (look.carried === 'private') {
        for (const mark of document.querySelectorAll<HTMLElement>('#app [data-look-mark]')) {
            if (mark.closest('.deck-stall') !== null || getComputedStyle(mark).display === 'none') continue;
            marksShownByClass[cls] = (marksShownByClass[cls] ?? 0) + 1;
            const why = mark.childNodes.length > 0 ? 'holds something' : mark.getAttribute('aria-hidden') !== 'true' ? 'is not aria-hidden' : undefined;
            if (why === undefined) continue;
            const detail = `a ${mark.getAttribute('data-look-mark')} mark in ${describe(mark.parentElement ?? mark)} ${why}`;
            if (!out.some((f) => f.detail === detail)) {
                out.push({ screen, theme: label, check: MARK_CHECK, detail });
            }
        }
        return out;
    }
    for (const mark of document.querySelectorAll<HTMLElement>('#app [data-look-mark]')) {
        markChecksByClass[cls] = (markChecksByClass[cls] ?? 0) + 1;
        const display = getComputedStyle(mark).display;
        const why =
            display !== 'none'
                ? `computes display: ${display}`
                : mark.childNodes.length > 0
                  ? 'holds something'
                  : mark.getAttribute('aria-hidden') !== 'true'
                    ? 'is not aria-hidden'
                    : undefined;
        if (why === undefined) continue;
        const detail = `a ${mark.getAttribute('data-look-mark')} mark in ${describe(mark.parentElement ?? mark)} ${why}`;
        if (!out.some((f) => f.detail === detail)) {
            out.push({ screen, theme: label, check: MARK_CHECK, detail });
        }
    }
    return out;
}

/*
 * **A shipped row states the sizes its sheet paints** (step 2e, 2026-09-23).
 * Each look's sheet sizes the tier-0 figure and the sign's name itself, and
 * the row carried other numbers — Modern said 30 and 25 where its sheet
 * paints 26 and 27, Rural 31 and 27 against 25 and 29 — which was harmless
 * only while nothing read them. The emitted var is what paints wherever the
 * sheet does not reach: the skeleton, the base's derived price ladder, Neo's
 * phone sign (its sheet sizes no name below 680px). So on `offers`, bare,
 * for every shipped look, at the phone and at the desk, the computed size of
 * a tier-0 figure and of the sign's name must equal the var the stall
 * carries for that width. The cascade itself answers — no stylesheet is
 * parsed — on a screen the pass paints anyway. A number that does not read
 * (a renamed var reads as nothing) fails rather than comparing as NaN, and
 * the looks it compared are reported (`rowSizeClasses`) for the runner to
 * require every shipped one.
 */
const rowSizeClasses = new Set<string>();

function rowStatesItsSizes(look: Look, label: string): Failure[] {
    const root = document.getElementById('app')!;
    const out: Failure[] = [];
    const fail = (detail: string): void => {
        out.push({ screen: 'offers', theme: label, check: 'a-shipped-row-states-the-sizes-its-sheet-paints', detail });
    };
    const stall = root.querySelector<HTMLElement>('.stall');
    const figure = root.querySelector('button.item-head:not([data-price-tier]) [data-role="price"]');
    const name = root.querySelector('.stall-name');
    if (stall === null || figure === null || name === null) {
        fail('offers painted no stall, no tier-0 figure or no sign name to compare');
        return out;
    }
    const desk = matchMedia('(min-width: 680px)').matches;
    const vars = getComputedStyle(stall);
    let compared = 0;
    for (const [node, what, prop] of [
        [figure, 'the tier-0 figure', desk ? '--s-price-size-d' : '--s-price-size'],
        [name, 'the sign’s name', desk ? '--s-sign-size-d' : '--s-sign-size'],
    ] as const) {
        const stated = vars.getPropertyValue(prop).trim();
        const painted = getComputedStyle(node).fontSize;
        const a = Number.parseFloat(stated);
        const b = Number.parseFloat(painted);
        if (!Number.isFinite(a) || !Number.isFinite(b)) {
            fail(`${what}: the row states ${prop}: "${stated}" and it paints "${painted}" — a number that does not read compares nothing`);
            continue;
        }
        compared += 1;
        if (Math.abs(a - b) > 0.01) {
            fail(`${what} paints ${painted} at ${window.innerWidth}px; the row states ${prop}: ${stated}`);
        }
    }
    if (compared === 2) {
        rowSizeClasses.add(look.theme.sheetClass);
    }
    return out;
}

/*
 * **The skeleton's price ladder is the row's size, stepped** (2026-09-23).
 * stall.css derives a floor ladder from `--s-price-size` — tiers 1 and 3 at
 * 0.81, tier 2 at 0.65 — for a look whose sheet sizes no `.item-x`, and the
 * skeleton is the one look that stands on it. On a phone, every tiered figure
 * the skeleton paints must be the var times its tier's factor; the tiers
 * compared are counted (`ladderTiers`) and the runner requires all three.
 * Without this nothing failed when the ladder was removed: at the 26px the
 * row states, the skeleton's names keep their floor at full size.
 */
const LADDER: Readonly<Record<string, number>> = { '1': 0.81, '2': 0.65, '3': 0.81 };
const ladderTiers: Record<string, number> = {};

function skeletonLadderFaults(screen: string, label: string): Failure[] {
    if (matchMedia('(min-width: 680px)').matches) {
        return [];
    }
    const root = document.getElementById('app')!;
    const out: Failure[] = [];
    for (const figure of root.querySelectorAll<HTMLElement>('.item-head[data-price-tier] .item-x')) {
        if (figure.closest('[data-role="door-deck"]') !== null) continue;
        const tier = figure.closest('.item-head')!.getAttribute('data-price-tier') ?? '';
        const factor = LADDER[tier];
        const stall = figure.closest<HTMLElement>('.stall');
        if (factor === undefined || stall === null) continue;
        const size = Number.parseFloat(getComputedStyle(stall).getPropertyValue('--s-price-size'));
        const painted = Number.parseFloat(getComputedStyle(figure).fontSize);
        ladderTiers[tier] = (ladderTiers[tier] ?? 0) + 1;
        if (!Number.isFinite(size) || !Number.isFinite(painted) || Math.abs(size * factor - painted) > 0.05) {
            out.push({
                screen,
                theme: label,
                check: 'the-skeletons-ladder-steps-the-rows-size',
                detail: `a tier-${tier} figure paints ${getComputedStyle(figure).fontSize}; the ladder says ${size} × ${factor} = ${(size * factor).toFixed(2)}px`,
            });
        }
    }
    return out;
}

/*
 * **The kit takes no anchor positioning** (`the-kit-takes-no-anchor-positioning`;
 * the owner's D-2026-10-27-02). The first-party look lint refuses anchor
 * positioning in a shipped or private look's sheet
 * (`a-look-never-positions-against-an-anchor`); the kit's lint admits it,
 * and a box placed by `anchor()` follows its anchor's transform, offsets and
 * motion path (`ANCHOR_FOLLOWED`), so the kit's own probe refuses it: on the
 * workshop's probe page, every paint of the kit's look fails while the kit's
 * sheet declares `anchor-name` (`sheetNamesAnAnchor`, read as `sheetFacts`
 * reads the page's), and fails closed while the page cannot read that sheet. The rule reads the kit's
 * sheet alone, by its URL (`kitLook().sheetUrl`); `workshop/README.md` says
 * it in the kit's own words. Counted per paint (`kitAnchorPaints`).
 */
const KIT_ANCHOR_CHECK = 'the-kit-takes-no-anchor-positioning';
/**
 * Whether one sheet declares `anchor-name` at a value other than `none` in
 * any rule, keyframe or nested rule (`@import`ed sheets read too), as
 * `sheetFacts` reads the page's — or `'unread'` where the page cannot read
 * it or a sheet it imports, which may.
 */
function sheetNamesAnAnchor(sheet: CSSStyleSheet): boolean | 'unread' {
    let named = false;
    let unread = false;
    const names = (style: CSSStyleDeclaration): void => {
        const value = style.getPropertyValue('anchor-name').trim();
        if (value !== '' && value !== 'none') named = true;
    };
    const walk = (rules: CSSRuleList): void => {
        for (const rule of rules) {
            if (rule instanceof CSSKeyframesRule) {
                for (const frame of rule.cssRules) names((frame as CSSKeyframeRule).style);
                continue;
            }
            if ('style' in rule && (rule as CSSStyleRule).style instanceof CSSStyleDeclaration) names((rule as CSSStyleRule).style);
            if (rule instanceof CSSImportRule) {
                try {
                    if (rule.styleSheet !== null) walk(rule.styleSheet.cssRules);
                } catch {
                    unread = true;
                }
            }
            if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
        }
    };
    try {
        walk(sheet.cssRules);
    } catch {
        unread = true;
    }
    return named ? true : unread ? 'unread' : false;
}
/** Paints of the kit's look this rule read, and those it failed. */
const kitAnchorPaints = { read: 0, failed: 0 };
function kitAnchorFaults(screen: string, label: string, look: Look): Failure[] {
    const kit = kitLook();
    if (kit === undefined || look !== kit) return [];
    kitAnchorPaints.read += 1;
    const url = kit.sheetUrl === undefined ? undefined : new URL(kit.sheetUrl, location.href).href;
    const sheet = [...document.styleSheets].find((s) => url !== undefined && s.href === url);
    const named = sheet === undefined ? undefined : sheetNamesAnAnchor(sheet);
    const why =
        sheet === undefined
            ? `the kit's sheet is not on the page (${url ?? 'it names no sheet'}), so whether it declares anchor-name cannot be read`
            : named === 'unread'
              ? `the kit's sheet cannot be read on this page, so whether it declares anchor-name cannot be read`
              : named
                ? `the kit's sheet declares anchor-name: Stall does not take anchor positioning in a look, so the kit's probe refuses every paint of a sheet that names an anchor`
                : undefined;
    if (why === undefined) return [];
    kitAnchorPaints.failed += 1;
    return [{ screen, theme: label, check: KIT_ANCHOR_CHECK, detail: why }];
}

/*
 * `a-look-is-measured-with-its-sheet` (step 6, 6.7): every painted `.stall`
 * wearing a `t-*` class computes that class as `--look-sheet`, the name its
 * own sheet gives it (`every-look-sheet-names-itself`) — or the look was
 * measured without its sheet and every other rule on this paint certified
 * the base sheets alone. The skeleton is sheetless by design and exempt
 * (`SHEETLESS_CLASSES`). The classes read are echoed (`lookSheetsRead`)
 * and the runner refuses a pass that read none of a look it measures
 * (`probe-coverage.mjs`). Proved red by deleting Rural's naming rule.
 */
const LOOK_SHEET_CHECK = 'a-look-is-measured-with-its-sheet';
const lookSheetsRead = new Set<string>();

function lookSheetFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    for (const read of lookSheetReads(document.getElementById('app')!)) {
        const fault = lookSheetFault(read);
        if (fault === undefined) {
            lookSheetsRead.add(read.cls);
        } else if (!out.some((f) => f.detail === fault)) {
            out.push({ screen, theme: label, check: LOOK_SHEET_CHECK, detail: fault });
        }
    }
    return out;
}

/*
 * `no-word-is-clipped-by-a-file` (step 6, 6.6 of the step-6 plan v2): no
 * element holding text of its own — nor a protected box, a money node, a
 * field, a form control or a control (`FILE_CLIP_SUBJECTS`) — nor any
 * ancestor of it up to `#app`,
 * computes a `mask-image`, a `-webkit-mask-image`, a mask border's source or
 * a `clip-path` that names a FILE. A mask image that has not loaded — or
 * failed: a 404, a refused MIME type, a policy refusal, a worn-only look's
 * art that has not arrived — is transparent black by the spec, and a mask
 * of transparent black hides everything under it: the words, the asked
 * amount, the address. A file can always fail to load; so a word may never
 * depend on one to be seen. A `url(#id)` naming an element of this document
 * is not a file and passes; a gradient mask is not a file and passes.
 * The cost, stated: a look that masks a ground in its own art (Ink wash's
 * washes) moves the masked ground to a sibling layer with no text in it.
 * Counted per paint (`fileClipChecks`); the phone and desk passes owe a
 * nonzero count (`probe-coverage.mjs`). Proved red by a planted
 * `mask-image: url(...)` on a row's name.
 */
const FILE_CLIP_CHECK = 'no-word-is-clipped-by-a-file';
const FILE_CLIP_PROPS = [
    'mask-image',
    '-webkit-mask-image',
    'mask-border-source',
    '-webkit-mask-box-image-source',
    'clip-path',
] as const;
let fileClipChecks = 0;
/*
 * What a file's mask may hide that has no text node of its own (the step-6
 * critic's P2): every protected box (the QR, the buy control, the address,
 * the record's hex…), the money set, the field block — a readonly link or
 * embed code is a value, not a text node — every form control, and every
 * control, an icon-only close or copy included. Each is asked with its
 * ancestors like a line of words.
 */
const FILE_CLIP_SUBJECTS = [
    PROTECTED,
    MONEY,
    '.paste-in, .share-url, .share-embed',
    'input, textarea, select',
    'button, a[href], summary, [role="button"], [role="link"]',
].join(', ');

/** The first file a computed mask or clip value names, or undefined: `url(#id)` is this document, not a file. */
function fileNamedBy(value: string): string | undefined {
    for (const m of value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/g)) {
        const target = (m[1] ?? m[2] ?? m[3] ?? '').trim();
        if (target === '' || target.startsWith('#')) continue;
        const url = new URL(target, location.href);
        if (url.hash !== '' && url.origin + url.pathname + url.search === location.origin + location.pathname + location.search) {
            continue;
        }
        return target;
    }
    return undefined;
}

function fileClipFaults(screen: string, label: string): Failure[] {
    const root = document.getElementById('app')!;
    const out: Failure[] = [];
    const named = new Map<Element, string | undefined>();
    const fileOn = (el: Element): string | undefined => {
        if (named.has(el)) return named.get(el);
        const cs = getComputedStyle(el);
        let found: string | undefined;
        for (const prop of FILE_CLIP_PROPS) {
            const file = fileNamedBy(cs.getPropertyValue(prop));
            if (file !== undefined) {
                found = `${prop} names ${file}`;
                break;
            }
        }
        named.set(el, found);
        return found;
    };
    const said = new Set<Element>();
    for (const el of root.querySelectorAll('*')) {
        const ownText = [...el.childNodes].some(
            (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
        );
        if (!ownText && !el.matches(FILE_CLIP_SUBJECTS)) continue;
        fileClipChecks += 1;
        for (let at: Element | null = el; at !== null && at !== root; at = at.parentElement) {
            const why = fileOn(at);
            if (why === undefined) continue;
            if (!said.has(at)) {
                said.add(at);
                out.push({
                    screen,
                    theme: label,
                    check: FILE_CLIP_CHECK,
                    detail: `${describe(el)}'s words are under ${at === el ? 'their own box' : describe(at)}, whose ${why}`,
                });
            }
            break;
        }
    }
    return out;
}

/*
 * **The seller's name stands whole** (`the-sellers-name-stands-whole`, step
 * 8f2; the step-8 critic's item 10, the 8f2 critic's P1-1 and its re-check
 * of cdedb29). A look that bounds the sign's name in a box of fixed size — a
 * column, the name set on its end — can cut a long name, and nothing saw
 * it: `text-spills` reads a box whose overflow is visible, `cutSideways` is
 * sideways by design, the line reads clip their rects to what shows, and the
 * name is no protected box. DECISIONS D4 measured the binding case — a
 * 32-byte Latin name run off the bottom of a wall, its last letters gone —
 * and a cut name is an absent one. So on every screen, look and variant of
 * every geometry pass, for every line of the sign's name and tagline:
 * - **it is painted** (`unpainted`): no `content-visibility` but `visible`
 *   on it or above it up to the stall, every text of it `visibility:
 *   visible`, its opacity to the root at least `UNPAINTED_OPACITY` — a line
 *   nobody sees is not whole, and its rects (of skipped content, or of
 *   nothing drawn) would otherwise read whole;
 * - **its ink stands whole** on both axes inside every clip from its own box
 *   up to the viewport (`nothing-on-the-wall-is-cut-from-below`'s shape),
 *   by the ink model the name's ladder fits by (`src/ui/signInk.ts`): the
 *   glyphs' measured reach about the baseline (`inkLines`), of the text as
 *   PAINTED — `text-transform` applied, small caps and the width handed to
 *   the canvas — so a Vietnamese capital's stacked marks above the face's
 *   ascent are part of the name, and a lowercase name a look uppercases is
 *   measured in capitals ("ẫữệ" 40.7px above the baseline at 44px in Inter
 *   800, "ẪỮỆ" 48.7px; read as written, the ladder never climbed and the
 *   shot read "ÂŨỆ", green);
 * - **its own padding box stands inside every clip and shape above it** —
 *   the ladder keeps the ink inside that box, this keeps the box inside
 *   every clip, so a name the ladder fits stands whole at a length no screen
 *   paints (a curved shape is not monotonic in the name's length). Exact
 *   for a box the look bounds — the ladder's subject; a box that shrinks to
 *   its text is held at the lengths painted, the 32-byte names among them.
 * A clip (`lineCut`, over `paintClips`) is `overflow` on an axis and
 * `contain: paint` (a box), a `clip-path` `inset()` (a box, wherever it
 * stands), `circle()` or `ellipse()` (resolved, at rest), a `polygon()`
 * through `parsePolygon` (at rest), and anything else — or any shape but an
 * `inset()` above a region that scrolls — a clip this rule cannot read: a
 * failure, never a pass. Scrolling is read as where it can take the line
 * (`lineCut`'s docblock): a region at rest at its top only carries a line
 * up, so a cut above the scroller that takes the line's at-rest place is a
 * cut at every scroll (the critic's `inset(150px 0 0 0)` on the stall root
 * read "verside Goods" at 1280 on `offers`, green). **A mask** (any
 * `mask-image` or mask border source but `none`) on the line or above it up
 * to the stall is refused outright, not modelled: a gradient can fade the
 * name to nothing in any shape.
 * The lines read, the vertical ones and the rungs climbed are counted per
 * look (`nameLinesByClass`, `nameVerticalByClass`, `nameTiersByClass`); the
 * phone and desk passes owe lines read on every look they painted, and the
 * tracked fixture's rungs and vertical lines (`probe-coverage.mjs`). Not
 * read: a name inside a turned wall (`[data-turn]`), whose rects are
 * axis-aligned boxes of a rotated paint, and the door's deck minis. Proved
 * red by every plant `PROBE-RULES.md` lists under "Step 8f2".
 */
const NAME_WHOLE_CHECK = 'the-sellers-name-stands-whole';
/**
 * **No slack where the line clips itself** (the 8g1 critic's P2-3). Every
 * clip gives a line's ink a pixel of rounding — but a line whose own box
 * clips (`overflow` other than `visible` on the line itself) cuts whatever
 * ink the model puts past that box, and the pixel let a look's own clip
 * shave a stacked mark flat with the rule green (the red proof in
 * `PROBE-RULES.md`: the stacked-mark name at both page widths). So on the
 * line's **block axis** — across its lines, where `inkLines` reads the
 * glyphs' measured reach about the baseline — the line's own clip is read
 * with a hundredth of a pixel of float noise and no more. The inline axis
 * keeps the pixel: along a line the model reads the advance, not the
 * glyphs, and an advance meets its box at a rounded edge. The lines read
 * under their own clip are counted per look (`nameOwnClipByClass`); the
 * tracked fixture owes some on the page passes (`probe-coverage.mjs`).
 *
 * **What this does NOT catch** (the 8g1 re-review's near-misses A–D).
 * This is a read of a model, not of pixels, and each of these is a shape
 * any look could take: the critic ran each through the real probe, which
 * read green, while lifting the clip changed real pixels of the line;
 * beyond them, any glyph the model under-measures is not caught either.
 * - **A.** A cut by `clip-path: inset(0)` on the line rather than by
 *   `overflow`. Only an `overflow` or `contain: paint` clip on the line
 *   itself is read with no slack; an `inset()` on it goes through the
 *   same walk with its pixel, and a circle or an ellipse keeps its own.
 * - **B.** The box edge is the padding box taken from `clientWidth` and
 *   `clientHeight` (`paddingBox`, `src/ui/signInk.ts`), which are
 *   integers, so the edge the ink is compared with can sit up to half a
 *   pixel from the painted one and an ink past the painted edge by less
 *   than that reads inside.
 * - **C.** Upright CJK in vertical writing: the painted ink sits 1.3–2.2px
 *   off the ink model's box (measured on the `cjk-name` screen, 390 at DPR
 *   3 and 1280 at DPR 2), shifted rather than widened, so zero slack on
 *   the block axis is below the model's own error there.
 * - **D.** The inline axis reads the advance, not the ink, and keeps its
 *   pixel: a glyph that overhangs its advance (an italic last letter) is
 *   not read at all, and a clip on the line can slice it.
 * The stronger guard is a pixel read — lift the clip in a frame and
 * compare a crop of the sign column — and it is not built.
 */
const OWN_CLIP_SLACK = 0.01;
const nameOwnClipByClass: Record<string, number> = {};
const nameLinesByClass: Record<string, number> = {};
const nameVerticalByClass: Record<string, number> = {};
const nameTiersByClass: Record<string, Record<string, number>> = {};
const MASK_PROPS = ['mask-image', '-webkit-mask-image', 'mask-border-source', '-webkit-mask-box-image-source'] as const;

/**
 * Why a box (a line's ink, or a line's own padding box) does not stand
 * whole inside every clip from `from` up to the viewport, or undefined.
 *
 * **Where scrolling can take it** (the 8f2 critic's re-check, item 2). The
 * walk carries, per axis, the interval of displacements the box can be
 * moved by and still stand inside every clip read so far — `[0, 0]` at
 * rest. A clip narrows it: the box must fit inside the clip's span at some
 * displacement in it. A scroller widens it before its own box is read (its
 * box does not move with its own scroll, the content does): by how far it
 * can still scroll on and how far it has scrolled back, so a region at rest
 * at its top can only carry a line UP — a clip above the scroller that cuts
 * the line's at-rest place from above cuts it at every scroll. A sticky box
 * on the walk does not move with the next scroll container's scroll, so
 * that container widens nothing (conservative: a sticky box that runs out
 * of its containing block does move). The page scrolls down the same way
 * at the end of the walk, never sideways.
 *
 * A `clip-path` `inset()` is a box at its element, read on both axes like
 * an axis clip wherever it stands; any other shape is read at rest where no
 * scroller has been entered, and above a scroller fails as a clip this rule
 * cannot read — a shape that does not move when the region scrolls, over a
 * line that does, is a cut at some scroll no fixed reading can rule out.
 */
function lineCut(rect: Box, from: Element, strictOwn?: 'x' | 'y'): string | undefined {
    const box = { y: { lo: rect.top, hi: rect.bottom } as Span, x: { lo: rect.left, hi: rect.right } as Span };
    const need = { y: rect.bottom - rect.top, x: rect.right - rect.left };
    const reach = { y: { lo: 0, hi: 0 } as Span, x: { lo: 0, hi: 0 } as Span };
    const scrolled = { y: false, x: false };
    const stuck = { y: false, x: false };
    const via = { y: '', x: '' };
    const side = { y: 'from below or above', x: 'sideways' };
    const overlap = (s: Span, edge: Span): number => Math.max(0, Math.min(s.hi, edge.hi) - Math.max(s.lo, edge.lo));
    // The pixel of rounding every clip is given, but none on `strictOwn`'s
    // axis of the line's own box (`OWN_CLIP_SLACK`, whose docblock says what
    // this still does not catch: near-misses A–D).
    let slack = 1;
    const clipTo = (axis: 'y' | 'x', by: string, edge: Span): string | undefined => {
        const s = box[axis];
        const r = reach[axis];
        const lo = Math.max(r.lo, edge.lo - slack - s.lo);
        const hi = Math.min(r.hi, edge.hi + slack - s.hi);
        if (lo <= hi) {
            reach[axis] = { lo, hi };
            return undefined;
        }
        if (!scrolled[axis]) {
            const past = Math.max(edge.lo - s.lo, s.hi - edge.hi);
            const strict = slack < 1 ? `; its ink runs ${past.toFixed(2)}px past a box that clips itself, which is given no slack across its lines` : '';
            return `is cut ${side[axis]} by ${by}: ${Math.round(overlap(s, edge))} of its ${Math.round(need[axis])}px show (${Math.round(s.lo)}–${Math.round(s.hi)} inside ${Math.round(edge.lo)}–${Math.round(edge.hi)})${strict}`;
        }
        // The most of it any reachable scroll shows, for the message.
        const at = (d: number): number => overlap({ lo: s.lo + d, hi: s.hi + d }, edge);
        const clamp = (d: number): number => Math.min(r.hi, Math.max(r.lo, d));
        const best = Math.max(at(clamp(edge.lo - s.lo)), at(clamp(edge.hi - s.hi)));
        return `can never be brought whole into view${via[axis]}: ${by} shows at most ${Math.round(best)} of its ${Math.round(need[axis])}px ${side[axis]}`;
    };
    for (let at: Element | null = from; at !== null && at !== document.documentElement && at !== document.body; at = at.parentElement) {
        const own = at === from ? `its own box (${describe(at)})` : describe(at);
        const cs = getComputedStyle(at);
        for (const clip of paintClips(at)) {
            if (clip.kind === 'axes') {
                for (const axis of ['y', 'x'] as const) {
                    const overflow = axis === 'y' ? cs.overflowY : cs.overflowX;
                    const container = overflow === 'hidden' || overflow === 'auto' || overflow === 'scroll';
                    if ((axis === 'y' ? clip.scrollsY : clip.scrollsX) && at !== from) {
                        const back = Math.abs(axis === 'y' ? at.scrollTop : at.scrollLeft);
                        const room = (axis === 'y' ? at.scrollHeight - at.clientHeight : at.scrollWidth - at.clientWidth) - back;
                        if (!stuck[axis]) reach[axis] = { lo: reach[axis].lo - Math.max(0, room), hi: reach[axis].hi + back };
                        via[axis] = ` (in ${describe(at)}, which scrolls)`;
                        scrolled[axis] = true;
                    }
                    if (container) stuck[axis] = false;
                    if (!clip[axis]) continue;
                    const edge = axis === 'y' ? { lo: clip.box.top, hi: clip.box.bottom } : { lo: clip.box.left, hi: clip.box.right };
                    slack = at === from && axis === strictOwn ? OWN_CLIP_SLACK : 1;
                    const why = clipTo(axis, own, edge);
                    slack = 1;
                    if (why !== undefined) return why;
                }
                continue;
            }
            if (clip.kind === 'shape' && clip.box !== undefined) {
                const by = `${own}'s clip-path ${clip.what.slice(0, 60)}`;
                const why = clipTo('y', by, { lo: clip.box.top, hi: clip.box.bottom }) ?? clipTo('x', by, { lo: clip.box.left, hi: clip.box.right });
                if (why !== undefined) return why;
                continue;
            }
            if (scrolled.x || scrolled.y) {
                return `stands under a clip-path on ${own} above a region that scrolls${via.y || via.x}, which this rule cannot read at every scroll: ${clip.what.slice(0, 60)}`;
            }
            if (clip.kind === 'shape') {
                if (!clip.inside(rect)) return `is cut by ${own}'s clip-path ${clip.what}`;
                continue;
            }
            const frame = at.getBoundingClientRect();
            const poly = clip.what.startsWith('polygon(') ? parsePolygon(clip.what, frame.width, frame.height) : undefined;
            if (poly === undefined) return `stands under a clip-path this rule cannot read on ${own}: ${clip.what.slice(0, 60)}`;
            const corners: [number, number][] = [
                [rect.left, rect.top],
                [rect.right, rect.top],
                [rect.left, rect.bottom],
                [rect.right, rect.bottom],
            ];
            if (corners.some(([x, y]) => !pointInPolygon(x - frame.left, y - frame.top, poly))) {
                return `is cut by ${own}'s clip-path ${clip.what.slice(0, 60)}`;
            }
        }
        // A sticky box stays where it is while its scroll container scrolls.
        if (cs.position === 'sticky') {
            if (cs.top !== 'auto' || cs.bottom !== 'auto') stuck.y = true;
            if (cs.left !== 'auto' || cs.right !== 'auto') stuck.x = true;
        }
    }
    const room = document.documentElement.scrollHeight - window.innerHeight - window.scrollY;
    if (room > 1 || window.scrollY > 0) {
        if (!stuck.y) reach.y = { lo: reach.y.lo - Math.max(0, room), hi: reach.y.hi + window.scrollY };
        scrolled.y = true;
        via.y = ' (the page scrolls)';
    }
    return clipTo('y', 'the viewport', { lo: 0, hi: window.innerHeight }) ?? clipTo('x', 'the viewport', { lo: 0, hi: window.innerWidth });
}

/**
 * Why a sign line is not painted at all, or undefined (the 8f2 critic's
 * re-check, item 4): `content-visibility` other than `visible` on it or
 * above it up to the stall (its content skipped — the rects the ink read
 * gets are of nothing anybody sees), a text of it whose `visibility` is not
 * `visible`, or an opacity chain to the root under `UNPAINTED_OPACITY`.
 */
const UNPAINTED_OPACITY = 0.1;
function unpainted(line: HTMLElement): string | undefined {
    for (let at: Element | null = line; at !== null; at = at.parentElement) {
        const cv = getComputedStyle(at).getPropertyValue('content-visibility').trim();
        if (cv !== '' && cv !== 'visible') return `is not painted: content-visibility ${cv} on ${at === line ? 'its own box' : describe(at)}`;
        if (at.classList.contains('stall')) break;
    }
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const owner = node.parentElement;
        if (owner === null || (node as Text).data.trim() === '') continue;
        const visibility = getComputedStyle(owner).visibility;
        if (visibility !== 'visible') return `is not painted: visibility ${visibility} on ${owner === line ? 'its own box' : describe(owner)}`;
        let opacity = 1;
        for (let at: Element | null = owner; at !== null; at = at.parentElement) {
            opacity *= Number.parseFloat(getComputedStyle(at).opacity) || 0;
        }
        if (opacity < UNPAINTED_OPACITY) return `is not painted: its opacity to the root is ${opacity.toFixed(3)}`;
    }
    return undefined;
}

function nameWholeFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    for (const line of document.querySelectorAll<HTMLElement>('#app .stall-head .stall-name, #app .stall-head .stall-tagline')) {
        if (line.closest('.deck-stall, [data-turn]') !== null) continue;
        const tier = line.getAttribute('data-name-tier');
        if (tier !== null) {
            const tiers = (nameTiersByClass[measuringClass] ??= {});
            tiers[tier] = (tiers[tier] ?? 0) + 1;
        }
        const said = `${describe(line)}${tier === null ? '' : ` at rung ${tier}`} "${(line.textContent ?? '').trim().slice(0, 24)}…"`;
        let fault: string | undefined;
        // A mask on the line or above it, up to the stall, is refused outright.
        for (let at: Element | null = line; at !== null && fault === undefined; at = at.parentElement) {
            const cs = getComputedStyle(at);
            const mask = MASK_PROPS.map((prop) => cs.getPropertyValue(prop).trim()).find((v) => v !== '' && v !== 'none');
            if (mask !== undefined) fault = `${said} stands under a mask on ${at === line ? 'its own box' : describe(at)} (${mask.slice(0, 60)}) — a mask can fade the name to nothing in any shape, so none is allowed on the sign's lines`;
            if (at.classList.contains('stall')) break;
        }
        if (getComputedStyle(line).writingMode.startsWith('vertical') || getComputedStyle(line).writingMode.startsWith('sideways')) {
            nameVerticalByClass[measuringClass] = (nameVerticalByClass[measuringClass] ?? 0) + 1;
        }
        if (fault === undefined) {
            const why = unpainted(line);
            if (why !== undefined) fault = `${said} ${why} — a line nobody sees is not whole`;
        }
        // The line's block axis, where its own clip gets no slack: across
        // a horizontal line its height, across a vertical one its width.
        const lineCs = getComputedStyle(line);
        const blockAxis: 'x' | 'y' = lineCs.writingMode.startsWith('horizontal') ? 'y' : 'x';
        const clipsItself = paintClips(line).some((clip) => clip.kind === 'axes' && clip[blockAxis]);
        for (const ink of fault === undefined ? inkLines(line) : []) {
            nameLinesByClass[measuringClass] = (nameLinesByClass[measuringClass] ?? 0) + 1;
            if (clipsItself) nameOwnClipByClass[measuringClass] = (nameOwnClipByClass[measuringClass] ?? 0) + 1;
            const why = lineCut(ink, line, blockAxis);
            if (why !== undefined) {
                fault = `${said}: a line's ink at ${Math.round(ink.left)},${Math.round(ink.top)} ${why}`;
                break;
            }
        }
        // The line's own padding box inside every clip above it and every
        // shape (the 8f2 critic's re-check, item 3): the ladder keeps the ink
        // inside that box, this keeps the box inside every clip, so a name
        // the ladder fits stands whole at any length — not only at the
        // lengths a screen here paints.
        const ownBox = paddingBox(line);
        if (fault === undefined && ownBox.right - ownBox.left > 0 && ownBox.bottom - ownBox.top > 0) {
            const why = lineCut(ownBox, line);
            if (why !== undefined) {
                fault = `${said}: its own box at ${Math.round(ownBox.left)},${Math.round(ownBox.top)} (${Math.round(ownBox.right - ownBox.left)}x${Math.round(ownBox.bottom - ownBox.top)}) ${why} — a longer name the ladder fits in that box would be cut`;
            }
        }
        if (fault !== undefined) {
            out.push({ screen, theme: label, check: NAME_WHOLE_CHECK, detail: `${fault} at ${window.innerWidth}x${window.innerHeight}` });
        }
    }
    return out;
}

/*
 * **The sign's words never stand on each other**
 * (`the-signs-words-never-stand-on-each-other`, the 8g1 critic's P2-4). A
 * look may lay the sign's lines out any way it likes — a grid that places
 * two of them in one cell included — and every other sign rule reads one
 * line at a time: a line whole in its own box, uncut by every clip, says
 * nothing about another line painted through it, and two lines so, each
 * whole, read green (the critic measured it). So on every screen, look
 * and variant of every geometry pass, the sign's words are read as
 * **lines**: every
 * element in the sign that owns text and has no text-owning ancestor
 * inside it (the name with its lamp, a tagline, the state line, an invite,
 * each of the address's spans) — and no two lines' ink (`inkLines`, the
 * name rule's own model: the glyphs' reach about the baseline, never a
 * content area a tight line-height runs past its slot) may meet by more
 * than a pixel each way. Only what paints is read: a line under
 * `display: none` has no rects, one under `visibility` other than
 * `visible` is skipped. The pairs compared and the sign lines read are
 * counted per look (`signWordsByClass`), and a page pass owes pairs on
 * every look it painted and, where it measured `empty-pasted`, an invite
 * read in the sign (`probe-coverage.mjs`). Not read: the door's deck
 * minis and a turned wall (`[data-turn]`), whose rects are a rotated
 * paint's.
 */
const SIGN_WORDS_CHECK = 'the-signs-words-never-stand-on-each-other';
const signWordsByClass: Record<string, { pairs: number; invites: number }> = {};

/** The sign's lines: each element in it that owns text and has no text-owning ancestor inside the sign. */
function signLines(sign: Element): HTMLElement[] {
    const owns = (el: Element): boolean =>
        [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n as Text).data.trim() !== '');
    const lines: HTMLElement[] = [];
    const walker = document.createTreeWalker(sign, NodeFilter.SHOW_ELEMENT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const el = node as HTMLElement;
        if (!owns(el)) continue;
        let inside = false;
        for (let at = el.parentElement; at !== null && at !== sign; at = at.parentElement) {
            if (owns(at)) {
                inside = true;
                break;
            }
        }
        if (!inside) lines.push(el);
    }
    return lines;
}

function signWordsFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    for (const sign of document.querySelectorAll<HTMLElement>('#app .stall-head')) {
        if (sign.closest('.deck-stall, [data-turn]') !== null) continue;
        const tally = (signWordsByClass[measuringClass] ??= { pairs: 0, invites: 0 });
        const lines = signLines(sign)
            .filter((line) => getComputedStyle(line).visibility === 'visible')
            .map((line) => ({ line, ink: inkLines(line) }))
            .filter(({ ink }) => ink.length > 0);
        if (lines.some(({ line }) => line.matches('.tagline-invite'))) tally.invites += 1;
        for (let i = 0; i < lines.length; i += 1) {
            for (let j = i + 1; j < lines.length; j += 1) {
                tally.pairs += 1;
                const a = lines[i]!;
                const b = lines[j]!;
                let worst: { ox: number; oy: number } | undefined;
                for (const p of a.ink) {
                    for (const q of b.ink) {
                        const ox = Math.min(p.right, q.right) - Math.max(p.left, q.left);
                        const oy = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
                        if (ox > 1 && oy > 1 && (worst === undefined || ox * oy > worst.ox * worst.oy)) worst = { ox, oy };
                    }
                }
                if (worst !== undefined) {
                    out.push({
                        screen,
                        theme: label,
                        check: SIGN_WORDS_CHECK,
                        detail: `${describe(a.line)} "${(a.line.textContent ?? '').trim().slice(0, 24)}" and ${describe(b.line)} "${(b.line.textContent ?? '').trim().slice(0, 24)}" paint their ink through each other by ${Math.round(worst.ox)}x${Math.round(worst.oy)}px at ${window.innerWidth}x${window.innerHeight}`,
                    });
                }
            }
        }
    }
    return out;
}

/*
 * **A CJK name is set in a CJK face** (step 8f2, the 8f2 critic's P3-5).
 * No CJK face is served, so a CJK name is set in whatever fallback the
 * machine has — and a machine with none (a bare Linux runner) sets every
 * ideograph as the same missing-glyph box, which every geometry rule then
 * measures and passes. So on every sign line the app marks
 * `data-script="cjk"`, two different ideographs of it are drawn in the
 * line's own face and compared pixel for pixel: a missing glyph draws the
 * same box (or the same last-resort glyph) for both, a real face does not;
 * and an ideograph's advance must be within 15% of 1em. The advance read is
 * echoed per pass (`cjkFaces`), so a run says what it measured.
 */
const CJK_FACE_CHECK = 'a-cjk-name-is-set-in-a-cjk-face';
const cjkFaces = new Set<string>();
let cjkCanvas: CanvasRenderingContext2D | null | undefined;

function cjkFaceFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    for (const line of document.querySelectorAll<HTMLElement>('#app .stall-head [data-script="cjk"]')) {
        if (line.closest('.deck-stall') !== null) continue;
        const han = [...new Set((line.textContent ?? '').match(/\p{Script=Han}/gu) ?? [])];
        if (han.length < 2) continue;
        const cs = getComputedStyle(line);
        const font = `${cs.fontStyle} ${cs.fontWeight} 48px ${cs.fontFamily}`;
        cjkCanvas ??= Object.assign(document.createElement('canvas'), { width: 64, height: 64 }).getContext('2d', { willReadFrequently: true });
        const ctx = cjkCanvas;
        if (ctx === null) continue;
        const draw = (ch: string): Uint8ClampedArray => {
            ctx.clearRect(0, 0, 64, 64);
            ctx.font = font;
            ctx.fillStyle = '#000';
            ctx.textBaseline = 'middle';
            ctx.fillText(ch, 8, 32);
            return ctx.getImageData(0, 0, 64, 64).data;
        };
        const a = draw(han[0]!);
        const b = draw(han[1]!);
        const same = a.every((v, i) => v === b[i]);
        ctx.font = font;
        const em = ctx.measureText(han[0]!).width / 48;
        cjkFaces.add(`${em.toFixed(3)}em${same ? ', one glyph for two ideographs' : ''}`);
        if (same || Math.abs(em - 1) > 0.15) {
            out.push({
                screen,
                theme: label,
                check: CJK_FACE_CHECK,
                detail: `${describe(line)}: ${same ? `"${han[0]}" and "${han[1]}" draw the same glyph` : `an ideograph advances ${em.toFixed(3)}em`} in ${cs.fontFamily.slice(0, 60)} — this machine has no CJK face for the name, and every rule here measured a missing-glyph box`,
            });
        }
    }
    return out;
}

/*
 * **A sticky sign covers nothing as the region scrolls**
 * (`a-sticky-sign-covers-nothing-as-the-region-scrolls`, step 8f2; the
 * owner's approval, DECISIONS 2026-09-26, STEP-8-PLAN §5). A look sheet may
 * make the sign's own box sticky (`STICKY_BOXES` in the look rules — the
 * one box `layout/stickyBoxes.ts` names here), and a box that follows the
 * scroll stands over whatever the region scrolls under it, at a position
 * no paint at rest is in. Every other rule measures the region at its top.
 * So on every screen, look and variant of every geometry pass, a sticky
 * subject box is found by its computed `position`, its scrollport found
 * (the nearest ancestor that clips, or the page), and the region scrolled
 * through stops — the top, every shelf head, the end, and every protected
 * box that shares the sticky box's columns brought to the sticky box's
 * edge, top and bottom — and at every stop no protected box's showing part
 * (`PROTECTED`, the sign's own address aside) may meet the sticky box by
 * more than a pixel each way. Scrolling is vertical, so a protected box in
 * none of the sticky box's columns can never pass under it, and is asked at
 * the shelf stops alone. The region is put back where it was. Counted per
 * look (`stickyByClass`: paints with a sticky subject, paints whose region
 * scrolled, stops); a pass that saw a sticky sign owes it a region that
 * scrolled, and the tracked fixture owes one at the desk
 * (`probe-coverage.mjs`). Proved red by the fixture's sign widened across
 * both columns (`PROBE-RULES.md`).
 */
const STICKY_CHECK = 'a-sticky-sign-covers-nothing-as-the-region-scrolls';
/*
 * **A sticky sign fits the region it sticks in**
 * (`a-sticky-sign-fits-its-region`, the 8g1 critic's P2-2). A sticky box
 * stays at its inset while the region scrolls under it, so a box taller
 * than the region's showing part holds its last pixels — on a sign, the
 * address, and on a short screen the name too — off screen at every scroll
 * but the region's end, where the box's containing block finally carries
 * it up. Every other rule reads that: the address is reachable, the name
 * whole at rest. So wherever the scroll pass finds a sticky subject, its
 * height at rest is held to the region's showing part (the scroller's box
 * inside the viewport, or the viewport for the page) less the box's own
 * top and bottom insets, a pixel of rounding allowed. Measured on every
 * geometry pass, and on the short pass (`layout-check.mjs`: 375x667 and
 * 1280x720, two heights shorter than the page passes'), which runs the
 * sticky looks alone. What that pass does and does not stand for is
 * stated at `STICKY_ONLY`.
 */
const STICKY_FITS_CHECK = 'a-sticky-sign-fits-its-region';
const stickyByClass: Record<string, { paints: number; scrolled: number; stops: number }> = {};

/** The box a sticky box sticks within: the nearest ancestor that clips, or the page. */
function scrollportOf(node: Element): HTMLElement {
    for (let at = node.parentElement; at !== null && at !== document.body && at !== document.documentElement; at = at.parentElement) {
        const cs = getComputedStyle(at);
        const clips = (v: string): boolean => v !== 'visible' && v !== 'clip';
        if (clips(cs.overflowY) || clips(cs.overflowX)) return at;
    }
    return (document.scrollingElement ?? document.documentElement) as HTMLElement;
}

function stickyScrollFaults(screen: string, label: string): Failure[] {
    const out: Failure[] = [];
    for (const subject of STICKY_SUBJECTS) {
        for (const box of document.querySelectorAll<HTMLElement>(`#app .${subject}`)) {
            // A turned wall scrolls along the screen's other axis, and its
            // rects are a rotated paint's: not read, and the look rules keep
            // a sticky sign off the wall entirely (`STICKY_BOXES`).
            if (box.closest('.deck-stall, [data-turn]') !== null) continue;
            const cs = getComputedStyle(box);
            if (cs.position !== 'sticky') continue;
            const tally = (stickyByClass[measuringClass] ??= { paints: 0, scrolled: 0, stops: 0 });
            tally.paints += 1;
            const region = scrollportOf(box);
            const page = region === document.scrollingElement || region === document.documentElement;
            // It fits the region it sticks in (`a-sticky-sign-fits-its-region`):
            // the region's showing part, less the box's own insets.
            {
                const r = page ? new DOMRect(0, 0, window.innerWidth, window.innerHeight) : region.getBoundingClientRect();
                const shows = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
                const inset = (v: string): number => (Number.isFinite(Number.parseFloat(v)) ? Number.parseFloat(v) : 0);
                const room = shows - inset(cs.top) - inset(cs.bottom);
                const tall = box.getBoundingClientRect().height;
                if (tall > room + 1) {
                    out.push({
                        screen,
                        theme: label,
                        check: STICKY_FITS_CHECK,
                        detail: `${describe(box)} is ${Math.round(tall)}px tall and sticks in ${Math.round(room)}px of ${describe(region)} at ${window.innerWidth}x${window.innerHeight}: its last ${Math.round(tall - room)}px stand off screen at every scroll but the region's end`,
                    });
                }
            }
            const max = region.scrollHeight - region.clientHeight;
            if (max <= 1) continue;
            tally.scrolled += 1;
            const start = region.scrollTop;
            const view = (): DOMRect => (page ? new DOMRect(0, 0, window.innerWidth, window.innerHeight) : region.getBoundingClientRect());
            const go = (top: number): void => region.scrollTo({ top, behavior: 'instant' });
            go(0);
            const rest = box.getBoundingClientRect();
            const atZero = view();
            // Where a box sits in the region's content, read at the top.
            const content = (el: Element): { top: number; bottom: number } => {
                const r = el.getBoundingClientRect();
                return { top: r.top - atZero.top, bottom: r.bottom - atZero.top };
            };
            const insetTop = Number.parseFloat(cs.top);
            const insetBottom = Number.parseFloat(cs.bottom);
            const guarded = [...region.querySelectorAll(PROTECTED)].filter(
                (node) => !box.contains(node) && node.closest('.deck-stall') === null,
            );
            const stops = new Set<number>([0, max]);
            const clamp = (y: number): number => Math.round(Math.min(max, Math.max(0, y)));
            for (const head of region.querySelectorAll('div.items, .section-title, .collection-name, .shelf-head')) {
                stops.add(clamp(content(head).top - (Number.isFinite(insetTop) ? insetTop : 0)));
            }
            for (const node of guarded) {
                const r = node.getBoundingClientRect();
                if (r.width === 0 || r.height === 0 || r.right <= rest.left + 1 || r.left >= rest.right - 1) continue;
                const at = content(node);
                if (Number.isFinite(insetTop)) {
                    stops.add(clamp(at.top - insetTop));
                    stops.add(clamp(at.bottom - insetTop - rest.height));
                }
                if (Number.isFinite(insetBottom)) {
                    stops.add(clamp(at.bottom - (atZero.height - insetBottom)));
                    stops.add(clamp(at.top - (atZero.height - insetBottom) + rest.height));
                }
            }
            const said = new Set<Element>();
            for (const top of [...stops].sort((a, b) => a - b)) {
                go(top);
                tally.stops += 1;
                const s = box.getBoundingClientRect();
                const v = view();
                for (const node of guarded) {
                    if (said.has(node)) continue;
                    const r = node.getBoundingClientRect();
                    const t = Math.max(r.top, v.top);
                    const b = Math.min(r.bottom, v.bottom);
                    const l = Math.max(r.left, v.left);
                    const rt = Math.min(r.right, v.right);
                    if (b - t <= 1 || rt - l <= 1) continue;
                    const ox = Math.min(rt, s.right) - Math.max(l, s.left);
                    const oy = Math.min(b, s.bottom) - Math.max(t, s.top);
                    if (ox > 1 && oy > 1) {
                        said.add(node);
                        out.push({
                            screen,
                            theme: label,
                            check: STICKY_CHECK,
                            detail: `${describe(box)} stands over ${describe(node)} by ${Math.round(ox)}x${Math.round(oy)}px with ${describe(region)} scrolled to ${Math.round(region.scrollTop)} of ${Math.round(max)} at ${window.innerWidth}x${window.innerHeight}`,
                        });
                    }
                }
            }
            go(start);
        }
    }
    return out;
}

const failures: Failure[] = [];

/*
 * **A look is measured with its sheet** (step 6, 6.7). Every worn-only
 * look this page measures has its sheet loaded before the first paint,
 * through the app's loader (`src/ui/lookSheets.ts`, 8d1) — on the ordinary
 * probe none (no shipped row is worn only), on the workshop probe the
 * kit's — and a worn-only row reaching a measured page without a URL is a
 * failure here rather than a look measured bare.
 * Then every paint reads each stall's `--look-sheet` against its `t-*`
 * class (`a-look-is-measured-with-its-sheet`, `lookSheetFaults` below).
 */
try {
    const worn = wornSheetsOf(measuredLooks());
    if (worn.length > 0) {
        await Promise.all(worn.map(({ url, cls }) => loadLookSheet(url, cls)));
    }
} catch (err) {
    failures.push({
        screen: 'probe page',
        theme: '-',
        check: LOOK_SHEET_CHECK,
        detail: err instanceof Error ? err.message : String(err),
    });
}

/*
 * **Every face is loaded before the probe measures**
 * (`every-face-is-loaded-before-the-probe-measures`, `layout/faces.ts`).
 * The loop below is one synchronous task, so a face still loading when it
 * starts is the fallback face for the whole pass — before this wait, that
 * was the 390 pass, every run. After the worn-only sheets above, so their
 * faces are declared too; style is resolved first, so every sheet's
 * `@font-face` is registered before the set is read. Every page load waits, the contrast
 * and transparency pages (no screens of their own) included, and publishes
 * the echo for the runner (`window.__faces`, and the verdict's `faces`).
 */
void document.documentElement.getBoundingClientRect();
const facesAtStart = await loadEveryFace(document.fonts);
window.__faces = facesAtStart;

const measured = screensToRun();
/*
 * **The short pass** (`?sticky=t-a,t-b`, the 8g1 critic's P2-2): the
 * runner hands it the looks the page passes found a sticky sign on, and it
 * measures those alone at two heights shorter than the page passes' 844
 * and 900 — 375x667 and 1280x720 — and on each paint only where the sign
 * is sticky there: `a-sticky-sign-covers-nothing-as-the-region-scrolls`,
 * `a-sticky-sign-fits-its-region` and `the-sellers-name-stands-whole`
 * (a stuck box does not move with the scroll, so a sign that outgrows a
 * short region cuts its own name). Every other rule is the page passes'.
 * A look with no sticky sign anywhere costs this pass nothing, and the
 * runner skips the pass when no look has one.
 *
 * **What these sizes are, and what the pass does not measure** (the 8g1
 * re-review's P2-2). 375x667 and 1280x720 are device screen sizes, not
 * browser viewports: the probe emulates no browser chrome, so a viewport
 * with its toolbars up is shorter than either (the critic's figure for an
 * iPhone SE with Safari's toolbars is about 548px tall; unmeasured here).
 * Not measured: a landscape phone (844x390), which takes the desk rules,
 * where the tracked fixture `t-fixture-private` would fail (the critic's
 * reading through this page's `?sticky=`, not through a runner pass); and
 * a look that is sticky only under a condition the phone and desk passes
 * do not enter (a reduced-motion block, say), since the pass measures only
 * the looks those two passes found sticky.
 */
const STICKY_ONLY: ReadonlySet<string> | undefined = (() => {
    const asked = new URLSearchParams(location.search).get('sticky');
    return asked === null ? undefined : new Set(asked.split(',').filter((cls) => cls !== ''));
})();
/** Whether the painted stall's sign is sticky (a `STICKY_SUBJECTS` box computing `position: sticky`). */
function signIsSticky(): boolean {
    return STICKY_SUBJECTS.some((subject) =>
        [...document.querySelectorAll(`#app .${subject}`)].some(
            (box) => box.closest('.deck-stall, [data-turn]') === null && getComputedStyle(box).position === 'sticky',
        ),
    );
}
/** Paints the short pass measured, and paints it set aside because the sign was not sticky there. */
const shortPass = { measured: 0, notSticky: 0 };
/**
 * Screens that actually mounted a seller's figure while they were measured.
 *
 * Raw material for the runner, which is where the rule lives: a fixture that
 * quietly stops mounting the thing its name promises leaves every rule about
 * it green while measuring nothing, and this guard has shipped that twice. The
 * page reports what it saw; the runner decides which names owed a figure.
 */
const withQuote = new Set<string>();
/** Every code a measured screen painted, as `screen:name` (D4's not-read list). */
const codesPainted = new Set<string>();
/**
 * The codes each paint showed with a box (`svg.qr`, the door's deck aside),
 * by screen, look and the number of codes the app built in the tree, as the
 * fewest and the most over the look's variants (before 8g2, the fifth
 * review's item 10): the code owe per look compared the codes a look painted
 * with the codes it read under one filter, so a look that took a code's box
 * away owed nothing for it. Which codes a screen builds is the app's — but
 * not always the same for every look: the name sheet composes no record, and
 * so draws no code, for a paid look a try-on paints (the tracked fixture's,
 * on `publish-name`) — so `probe-coverage.mjs` compares the looks that built
 * as many codes, and names one that painted fewer of them with a box than
 * another did.
 */
const qrByScreen: Record<string, Record<string, Record<string, { min: number; max: number }>>> = {};
/**
 * Every decoration class this pass painted worn: what the coverage rules
 * owe a pass is keyed on what it wore (`probe-coverage.mjs`), so a look that
 * carries the rain owes the outline rules whatever its class.
 */
const wornClassesPainted = new Set<string>();
for (const screen of measured) {
    for (const look of looksFor(screen)) {
        if (STICKY_ONLY !== undefined && !STICKY_ONLY.has(look.theme.sheetClass)) continue;
        measuringClass = look.theme.sheetClass;
        for (const worn of variantsFor(screen, look)) {
            for (const row of worn) {
                if (row.cls !== undefined) wornClassesPainted.add(row.cls);
            }
            const label =
                worn.length === 0
                    ? look.label
                    : `${look.label} + ${worn.map((a) => a.label).join(' + ')}`;
            if (STICKY_ONLY !== undefined) {
                paint(screen, look, worn);
                if (!signIsSticky()) {
                    shortPass.notSticky += 1;
                    continue;
                }
                shortPass.measured += 1;
                failures.push(...lookSheetFaults(screen, label));
                failures.push(...nameWholeFaults(screen, label));
                failures.push(...stickyScrollFaults(screen, label));
                continue;
            }
            failures.push(...checkOverTime(screen, look, label, worn));
            failures.push(...lookSheetFaults(screen, label));
            failures.push(...kitAnchorFaults(screen, label, look));
            failures.push(...fileClipFaults(screen, label));
            // The tree `checkOverTime` measured is still mounted: it seeks the
            // animations it painted rather than repainting.
            // A pay screen owes a seller's figure. The several-items sheet
            // has no single quote on it by design — its figure is the total
            // under `pay-total` (2026-09-21) — so that role counts too; a
            // sheet that mounted neither is still the green-over-nothing
            // this set exists to refuse.
            if (
                document.querySelector('[data-role="seller-price"]') !== null ||
                document.querySelector('[data-role="pay-total"]') !== null
            ) {
                withQuote.add(screen);
            }
            // The codes this screen paints (D4): the runner lists which of
            // them the contrast pass reads the quiet zone of, and which it
            // does not.
            const codesHere = (qrColourByClass[measuringClass] ??= { painted: 0, read: 0 });
            let codesInTree = 0;
            let codesOnPaint = 0;
            for (const svg of document.querySelectorAll('svg.qr')) {
                if (svg.closest('.deck-stall') !== null) continue;
                codesInTree += 1;
                const box = svg.getBoundingClientRect();
                if (box.width > 0 && box.height > 0) {
                    codesPainted.add(`${screen}:${codeName(svg)}`);
                    codesHere.painted += 1;
                    codesOnPaint += 1;
                }
            }
            // And per screen, every look's fewest and most with a box, by
            // how many the app built (`qrByScreen`): a look that paints fewer
            // of the codes the app built than another look does owes the read
            // of the ones it took away.
            const built = (((qrByScreen[screen] ??= {})[measuringClass] ??= {})[String(codesInTree)] ??= { min: codesOnPaint, max: codesOnPaint });
            built.min = Math.min(built.min, codesOnPaint);
            built.max = Math.max(built.max, codesOnPaint);
            // And their colours (`a-code-is-drawn-black-on-white`).
            failures.push(...qrColourFaults(screen, label));
            failures.push(...unbuyableFaults(screen, label));
            failures.push(...wallCuts(screen, label));
            failures.push(...statusLineFaults(screen, label));
            failures.push(...payLinesSayWhatTheyHide(screen, label));
            failures.push(...cardFigureFaults(screen, label));
            streamTierRead();
            failures.push(...cycleFigureFaults(screen, label));
            failures.push(...figureInkFaults(screen, label));
            failures.push(...moneySelfClipFaults(screen, label));
            failures.push(...moneyDressFaults(screen, label));
            failures.push(...smallTextFaults(screen, label));
            failures.push(...tileLetterCuts(screen, label));
            failures.push(...markFaults(screen, label, look));
            failures.push(...nameWholeFaults(screen, label));
            failures.push(...signWordsFaults(screen, label));
            failures.push(...cjkFaceFaults(screen, label));
            failures.push(...outlineFaults(screen, label));
            failures.push(...moneySetFaults(screen, label));
            failures.push(...buntingSwingFaults(screen, label));
            failures.push(...haloFaults(screen, label));
            // A carried private look's row states the sizes its own sheet
            // paints, as a shipped look's does (8e2); only the shipped looks
            // are on the door's deck, so only their shops are dressed for it.
            if (screen === 'offers' && worn.length === 0 && (shippedLooks().includes(look) || look.carried === 'private')) {
                failures.push(...rowStatesItsSizes(look, label));
            }
            if (screen === 'offers' && worn.length === 0 && shippedLooks().includes(look)) {
                gatherShopDress(look);
            }
            if (screen === 'door') {
                failures.push(...gatherMiniDress(label));
            }
            if (look.id === SKELETON_LOOK_ID) {
                failures.push(...skeletonLadderFaults(screen, label));
            }
            // Last: it scrolls the region through its stops and puts it back
            // (`a-sticky-sign-covers-nothing-as-the-region-scrolls`).
            failures.push(...stickyScrollFaults(screen, label));
            // And 1a, after every other read (`coverAtRest`).
            failures.push(...coverAtRest(screen, label));
        }
    }
}

failures.push(...doorMiniFaults());
failures.push(...cardLadderFaults());

/*
 * **The sign's stress names on a try-on** (step 8f2; the 8f1 critic's item
 * 6). Every carried private look is painted through the try-on already
 * (`paintView`), but that is a whole paint; a seller trying a look on from
 * the name sheet gets the other road — `showLook`'s `put` patches the look
 * onto the stall behind the sheet and chooses the name's rung again there
 * (`applyNameTiers`). So on every pass that measures `publish-name`, for
 * each carried private look and each stress name (the 32-byte name and the
 * CJK name), the name sheet is painted over the default look with that
 * name, the look's own button in the picker pressed, and the stall behind
 * held to wearing the look and to its name standing whole
 * (`the-sellers-name-stands-whole`). The paints are counted per look
 * (`tryOnNamesByClass`); a page pass owes one per carried look
 * (`probe-coverage.mjs`).
 */
const tryOnNamesByClass: Record<string, number> = {};
if (STICKY_ONLY === undefined && measured.includes('publish-name')) {
    const root = document.getElementById('app')!;
    // The default look, named by its class (`DEFAULT_LOOK_CLASS`, `looks.ts`): the probe names no look by id.
    const behind = shippedLooks().find((look) => look.theme.sheetClass === DEFAULT_LOOK_CLASS)!;
    for (const look of privateLooks()) {
        measuringClass = look.theme.sheetClass;
        for (const [what, name] of [['the 32-byte name', LONGEST_NAME], ['the CJK name', CJK_NAME], ['the stacked-mark name', STACKED_NAME]] as const) {
            const label = `${look.label}, tried on over ${behind.label} with ${what}`;
            dropCoverForPaint();
            renderStall(root, paintView({ ...SCREENS['publish-name']!, stallName: name }, behind, []), handlers);
            coverGoneAfterPaint();
            const button = root.querySelector<HTMLButtonElement>(`[data-role="look-${look.id}"]`);
            if (button === null) {
                failures.push({ screen: 'publish-name', theme: label, check: NAME_WHOLE_CHECK, detail: `the name sheet offers no button for ${look.theme.sheetClass}` });
                continue;
            }
            button.click();
            const stall = root.querySelector('.stall:not(.deck-stall)');
            if (stall === null || !stall.classList.contains(look.theme.sheetClass)) {
                failures.push({
                    screen: 'publish-name',
                    theme: label,
                    check: NAME_WHOLE_CHECK,
                    detail: `pressing its button left the stall behind the sheet wearing ${[...(stall?.classList ?? [])].filter((c) => c.startsWith('t-')).join(', ') || 'no look'}`,
                });
                continue;
            }
            tryOnNamesByClass[look.theme.sheetClass] = (tryOnNamesByClass[look.theme.sheetClass] ?? 0) + 1;
            failures.push(...nameWholeFaults('publish-name (tried on)', label));
        }
    }
}
// Out of the loop: no look is being measured.
measuringClass = '-';

/*
 * **The record road paints a locked look as the default**
 * (`the-record-road-paints-a-locked-look-as-the-default`, 8e2). The harness
 * measures a paid private look through the try-on under its own licence
 * (`paintView`, `HARNESS_LICENCE` in `looks.ts`) because the app's gate
 * paints no paid look from a record in step 8 — and the gate must be the
 * app's, untouched, while the harness walks around it. So on every pass
 * that measures `offers`, each paid look the build carries is painted once
 * the way the app would paint a record naming it (`recordView`: its sheet
 * as the loader holds it, every flag set, every token held, and the worn set
 * the app writes through the gate — so a gate that leaked rows would show
 * them) — and must come out the default's class, wearing no class of the
 * look's own and none of its rows, with the sign saying this page does not
 * show it (`THEME_NOT_UNLOCKED`). And the gate is asked directly, here
 * rather than only in a unit test (`harnessGateFaults`): licensed, the look
 * paints its own row; unlicensed, the default. The paints are counted
 * (`recordRoadChecks`) and the runner owes one per paid look it measures.
 * Painted with `renderStall` directly, so the default it paints is not
 * counted among the looks this pass measured.
 */
const RECORD_ROAD_CHECK = 'the-record-road-paints-a-locked-look-as-the-default';
let recordRoadChecks = 0;
for (const fault of harnessGateFaults()) {
    failures.push({ screen: 'probe page', theme: '-', check: RECORD_ROAD_CHECK, detail: fault });
}
if (STICKY_ONLY === undefined && measured.includes('offers')) {
    const root = document.getElementById('app')!;
    const defaultClass = DEFAULT_LOOK_CLASS;
    for (const look of privateLooks().filter((candidate) => HARNESS_LICENCE.has(candidate.id))) {
        const fail = (detail: string): void => {
            failures.push({ screen: 'offers', theme: `${look.label} (its record)`, check: RECORD_ROAD_CHECK, detail });
        };
        // The record's view as the app writes it, through the gate
        // (`recordView`): a gate that leaked the locked look's rows would
        // put them on the stall, and the rows half below would fail.
        dropCoverForPaint();
        renderStall(root, recordView(SCREENS['offers']!, look, 0xffff), handlers);
        coverGoneAfterPaint();
        const stall = root.querySelector('.stall:not(.deck-stall)');
        const classes = stall === null ? [] : [...stall.classList];
        const looks = classes.filter((cls) => cls.startsWith('t-'));
        if (looks.join(' ') !== defaultClass) {
            fail(`a record naming ${look.theme.sheetClass} painted ${looks.join(', ') || 'no look class'}, not the default's ${defaultClass}`);
        }
        const own = look.rows.flatMap((row) => (row.cls !== undefined && classes.includes(row.cls) ? [row.cls] : []));
        if (own.length > 0) {
            fail(`a record naming ${look.theme.sheetClass} wears ${own.join(', ')} of its own rows`);
        }
        if (!(root.textContent ?? '').includes(THEME_NOT_UNLOCKED)) {
            fail(`a record naming ${look.theme.sheetClass}: its sign does not say this page does not show the look (THEME_NOT_UNLOCKED)`);
        }
        recordRoadChecks += 1;
    }
}

/**
 * The billboard: a decoration nobody can see is not a product.
 *
 * Every catalogue row is worn alone on the offers screen and asked to show
 * itself, by its kind. A **node** row must have a real box of sellable size
 * inside the first fold — the first run of this check found the beetle below
 * the fold on every screen, which is why the yard moved under the sign. A
 * **root** row must change the painted style signature of the page. A
 * **mood** must move the canvas itself further than a person can fail to
 * notice — the first Sun-faded moved the background four points and a buyer
 * could not tell they were wearing it. Measured in CIEDE2000 since step 5a′
 * (`moodVisible.ts`, where the threshold's reason is): the row's own `bg`
 * and `surface`, AND the grounds the page actually painted — the stall's and
 * the first card's computed `background-color`, bare against worn, each
 * measured where it is opaque both ways — because a look sheet that paints
 * both grounds from literals would pass on the row alone while the page
 * stood still.
 */
/**
 * The FULL computed style of every element in the painted tree — not the
 * eight hand-picked properties the first version sampled, which the review
 * named the guard's weakest joint: a root row painting anywhere those eight
 * did not look was invisible to it, and a row folded into the base look kept
 * reading as "different" only by luck. Animations are frozen at t=0 first,
 * because a computed value mid-keyframe is time noise that would let an
 * invisible row read as change.
 */
function paintSignature(): string {
    for (const a of document.getAnimations()) {
        a.pause();
        try {
            a.currentTime = 0;
        } catch {
            // A finished animation holds still on its own.
        }
    }
    const parts: string[] = [];
    for (const node of document.getElementById('app')!.querySelectorAll('*')) {
        // The footer's "Wearing: …" credit changes with the worn list by
        // design, so it differs on every worn paint — leaving it in made the
        // whole check vacuous green (proved by neutralising a row's paint:
        // nothing went red until the credit was excluded).
        if (node.closest('.stall-foot') !== null) {
            continue;
        }
        const cs = getComputedStyle(node);
        let acc = node.tagName;
        for (let i = 0; i < cs.length; i += 1) {
            const prop = cs[i]!;
            acc += `;${prop}:${cs.getPropertyValue(prop)}`;
        }
        parts.push(acc);
    }
    return parts.join('\n');
}

/**
 * The two grounds the offers screen actually painted: the stall root's and
 * the first card's computed `background-color`, resolved to sRGB by the
 * browser itself — filled into a 1x1 canvas and read back — so `color-mix()`
 * (which Chrome serialises as `color(srgb …)`), `oklch()`, `lab()` and
 * fractional channels read like any `rgb()`. A ground that is not opaque
 * (alpha under 255, or transparent) is `undefined`: not measured, skipped.
 */
const groundCanvas = document.createElement('canvas');
groundCanvas.width = 1;
groundCanvas.height = 1;
const groundCtx = groundCanvas.getContext('2d', { willReadFrequently: true })!;
function paintedGrounds(): { stall: MoodRgb | undefined; item: MoodRgb | undefined } {
    const app = document.getElementById('app')!;
    const read = (sel: string): MoodRgb | undefined => {
        const node = app.querySelector(sel);
        if (node === null) {
            return undefined;
        }
        groundCtx.clearRect(0, 0, 1, 1);
        groundCtx.fillStyle = 'transparent';
        groundCtx.fillStyle = getComputedStyle(node).backgroundColor;
        groundCtx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = groundCtx.getImageData(0, 0, 1, 1).data;
        return a === 255 ? { r: r!, g: g!, b: b! } : undefined;
    };
    return { stall: read('.stall'), item: read('.item') };
}

// Every measured look — on a workshop page the kit's alone, judged against
// its OWN row: a kit mood measured against `decodeTheme(0xff)` would be
// measured against Modern's canvas (the workshop critic's P1). Not on the
// short pass, which measures sticky signs alone.
for (const look of STICKY_ONLY === undefined ? measuredLooks() : []) {
    const theme = look.theme;
    paint('offers', look, []);
    const bare = paintSignature();
    const bareGrounds = paintedGrounds();
    for (const row of look.rows) {
        paint('offers', look, [row]);
        const bill = (check: string, detail: string): void => {
            failures.push({ screen: 'billboard', theme: theme.label, check, detail });
        };
        if (row.slot === 'mood') {
            const onRow = moodDistance(theme, row.palette ?? {});
            if (onRow < MOOD_VISIBLE_MIN) {
                bill('a mood nobody can see', `${row.label} moves its grounds by ΔE00 ${onRow.toFixed(2)}`);
            }
            const worn = paintedGrounds();
            const onPage = paintedDistance([
                { bare: bareGrounds.stall, worn: worn.stall },
                { bare: bareGrounds.item, worn: worn.item },
            ]);
            if (onPage === undefined) {
                bill(
                    'a mood nobody can see',
                    `${row.label}: neither .stall nor the first .item paints an opaque background-color both bare and worn, so the painted page could not be measured`,
                );
            } else if (onPage < MOOD_VISIBLE_MIN) {
                bill('a mood nobody can see', `${row.label} moves the painted page by ΔE00 ${onPage.toFixed(2)}`);
            }
            continue;
        }
        if (row.paint === 'node') {
            const node = document.querySelector(`.${row.cls}`);
            if (node === null) {
                bill('a decoration that painted nothing', row.label);
                continue;
            }
            const box = node.getBoundingClientRect();
            if (box.width * box.height < 100) {
                bill('too small to sell', `${row.label} is ${Math.round(box.width)}x${Math.round(box.height)}`);
            }
            if (box.top < 0 || box.bottom > window.innerHeight) {
                bill(
                    'not in the first fold',
                    `${row.label} at ${Math.round(box.top)}..${Math.round(box.bottom)}`,
                );
            }
        } else if (paintSignature() === bare) {
            // a-paid-row-paints-something-the-base-look-does-not: a row whose
            // whole subtree computes identically to the bare look is selling
            // paint the base already gives away — the brackets-folded-into-base
            // failure, caught before a fold ships instead of after.
            bill('a paid row paints nothing the base look does not', row.label);
        }
    }

    /*
     * Worn with a MOOD, every other row must still apply (round 10,
     * 2026-09-16, from the owner's ask that After hours stop flattening what
     * is worn beside it). A mood repaints the canvas through the palette,
     * and the rule above compares a row against the BARE look, so nothing
     * checked a row against the look it is actually wearing.
     *
     * What this catches is **erasure**, not dimness: a mood rule and a row
     * rule that collide in the cascade, the way two root rules once did (the
     * aurora erased the rain outright). Each non-mood row is painted twice —
     * the mood alone, then the mood wearing the row — and identical
     * signatures mean the row gave up everything it had.
     *
     * What it cannot catch, stated so nobody trusts it too far: a row that
     * still applies and still cannot be seen. Signatures are computed style
     * strings, so an accent hairline lost against a near-black ground reads
     * as a difference here while a buyer finds nothing — which is exactly
     * what the old Pinstripe was. A pixel rule was tried on paper and
     * refused: every threshold that failed the old page frame also failed
     * the confetti, which is sparse on purpose. That judgement stays with
     * the eye, in the framework's review checklist, under each mood the row
     * can be worn with.
     */
    const moods = look.rows.filter((row) => row.slot === 'mood');
    const wearable = look.rows.filter((row) => row.slot !== 'mood');
    for (const mood of moods) {
        paint('offers', look, [mood]);
        const moodAlone = paintSignature();
        for (const row of wearable) {
            paint('offers', look, [mood, row]);
            if (paintSignature() === moodAlone) {
                failures.push({
                    screen: 'billboard',
                    theme: theme.label,
                    check: 'a mood erases a row worn with it',
                    detail: `${row.label} under ${mood.label}`,
                });
            }
        }
    }

    /*
     * Worn TOGETHER, the root rows must all still be there. Two root rules
     * at equal specificity cannot compose background lists — measured:
     * aurora erased the neon rain outright (image and animation) and the
     * full dress equalled aurora alone. Each single-row signature is
     * compared against the all-root dress; equality means every other row
     * was erased by the cascade.
     */
    const rootRows = look.rows.filter(
        (row) => row.paint === 'root' && row.slot !== 'mood',
    );
    if (rootRows.length > 1) {
        const singles = rootRows.map((row) => {
            paint('offers', look, [row]);
            return paintSignature();
        });
        paint('offers', look, rootRows);
        const together = paintSignature();
        for (let i = 0; i < rootRows.length; i += 1) {
            if (together === singles[i]) {
                failures.push({
                    screen: 'billboard',
                    theme: theme.label,
                    check: 'a worn-together row erases the others',
                    detail: `the full dress computes identically to ${rootRows[i]!.label} alone`,
                });
            }
        }
    }
}

/**
 * The rendered-background contrast hook, driven by `layout-check.mjs`.
 *
 * `legibleOn` proves text against the two flat palette roles; nothing proves
 * it against what is actually painted behind a figure once gradients, images
 * or decorations exist. Only pixels can. This paints one combination, turns
 * every protected figure's own glyphs transparent — the background under text
 * cannot be sampled through the text — and reports each box with the colour
 * its glyphs would have painted in. The runner screenshots the page and
 * samples the boxes.
 *
 * The QR is excluded: it is not text over theme paint, it carries its own
 * fixed black-on-white rule with its own test.
 */
type ContrastTarget = {
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    /** Border width: the border's own pixels are never the text's ground. */
    bw: number;
    /**
     * Extra safety inset for text inside a transformed ancestor (the
     * swinging wood sign): an axis-aligned box around rotated content
     * smears border and ground pixels a few px past every edge.
     */
    pad: number;
    /**
     * The element's own corner radius, clamped to half its box. A rounded
     * control's corner pixels are the page behind it, and on Modern that page
     * is the same white as the control's label — sampled as 1.00:1. Inside a
     * rounded rect, every x in [x+r, right−r] is box paint at any y, so the
     * sampler narrows its horizontal range by exactly this.
     *
     * **The element's own, which is the part a stylesheet has to respect.** A
     * control rounded by an `overflow: hidden` parent reports 0 here and is
     * measured square, so its clipped corners are sampled as ground — the name
     * sheet's pressed look segment, white ink on accent to every reader, read
     * 1.12:1 until the segments took their own radius.
     */
    r: number;
    /** What was measured, for a failure a person can find. */
    sel: string;
    /** In the money set (`layout/moneySet.ts`): read whole, never by a weaker verdict. */
    money: boolean;
    /** An honest-display line's role (`layout/honestDisplay.ts`), which the runner holds owed screens to. */
    role?: string;
    /**
     * The rotation of this node's frame, radians: the sum of every
     * `transform` and `rotate` from the node up to the root (step 5b). A
     * money box inside a turned ancestor is read over its own rotated box
     * rather than its axis-aligned bounds less a fixed 8px pad
     * (`legacyPad`), which dropped a Rural price figure outright.
     */
    angle: number;
    /**
     * The node's own box before its frame turned — centre, width, height —
     * when `angle` is not zero: a money box inside a turned ancestor is read
     * at the lattice points inside it (step 5b).
     */
    frame?: { cx: number; cy: number; w: number; h: number };
    /** The pad the sampler used before step 5b, kept for the legacy read the bucketing compares against. */
    legacyPad: number;
    /** The whole-box read had no box to read (a sliver after the clamp): its legacy value is none. */
    legacyDropped: boolean;
    /**
     * Every other target's sample (D7, step 5b): its own text's line
     * rects — or, for a control whose only mark is a drawn glyph, that
     * glyph's box — each clipped like the text is, each with the ink its
     * own element paints in. `undefined` for a money box and an outlined
     * line, which are read whole and in the ring.
     */
    rects?: LineRect[];
    /**
     * The outline this line wears where a decoration falls behind it
     * (`--rain-outline-1` / `--rain-outline-2`, round 8): its width in CSS
     * px, 0 for none, read from the computed `text-shadow` (`outlineOf`).
     * An outlined target is read in the ring around its glyphs, never over
     * its box (`a-line-on-the-ground-reads-wherever-a-drop-falls`).
     */
    ring: number;
    /**
     * An outlined target's lines of text — one per text node per line box,
     * clipped like the box — each with the characters it shows and the ink
     * its glyphs paint in. The runner's glyph mask is read inside these, and
     * a line that shows too few glyph pixels for its characters fails.
     */
    lines: RingLine[];
    /** An outlined target's drawn icons: not text, left out of the mask and the ring. */
    icons: Hole[];
    /**
     * A money figure broken after its commas (`.fig-say`, round 3, the
     * critic's P2-1): its lines of text — every text node in it, hidden ones
     * included — each with the money node's own ink, never the piece's, and
     * how many letters and digits the figure holds. The runner reads each
     * piece's glyphs in the figure's ink (`a-broken-figure-paints-every-digit`).
     */
    digits?: RingLine[];
    digitsOwed?: number;
    /** The broken figure's role, which the runner owes per screen (`BROKEN_FIGURE_SCREENS`). */
    digitsRole?: string;
    /** A broken figure's own line boxes, each read whole by the runner's box read (round 4). */
    lineBoxes?: { x: number; y: number; w: number; h: number }[];
    /** Where an outlined target's ring may be read: the box, `ring` px wider, inside the clip. */
    ringBox: Hole;
    /** The outline's own offsets, which are where the ring lies around the glyph mask. */
    offsets: readonly Offset[];
};

type Hole = { x: number; y: number; w: number; h: number };

/**
 * One line of a target's own text, as the line-rect sampler reads it: the
 * rect `Range.getClientRects()` gives for a text node's fragment on one line
 * (the font's content area, axis-aligned), clipped by the target's own
 * overflow and every clipping ancestor's (`x`…`h`); where the text's frame
 * is turned, the line box itself — centred on the unclipped rect's centre
 * (`cx`, `cy`), `rw` by `rh` before the turn, at `angle` — so only pixels
 * inside the turned line are read. `ink` is the colour this line's own
 * element paints its glyphs in, which is how a muted name inside an ink
 * control is read against its own ink. `glyph` marks a drawn icon's box,
 * read for a control that carries no text.
 */
type LineRect = Hole & { cx: number; cy: number; rw: number; rh: number; angle: number; ink: string; glyph?: true };

/**
 * One line of an outlined target: a text node's glyphs on one line box —
 * how many letters and digits it shows (`chars`, what the glyph mask is held
 * in proportion to) and how many visible characters at all (`glyphs`: a
 * lone middle dot between two links is a line too, and is two pixels).
 */
type RingLine = Hole & { chars: number; glyphs: number; ink: string };

/*
 * `CHROME_ON_TEXT` is retired (step 5b): the face's expand cue on the hero
 * tile's corner was stepped around because the box read took every pixel
 * left in the tile as the letters' ground. The line read reads the letters'
 * own rects, which end well short of the corner, and with the mechanism
 * switched off every tile read the same (4.61:1 at the least, the letters'
 * own ground). A cue that ever reaches a letter is read as its ground now.
 */


/**
 * What one prepare hands back, echoing what it was asked for (step 3a, the
 * step-3 critic's P1 2): the runner's nonce, the combination it painted, the
 * viewport it measured, and the look classes this one paint wore — so a
 * paint that is not the job's is refused before anything is sampled, rather
 * than measured and counted as the job's.
 */
type ContrastPrepared = {
    targets: ContrastTarget[];
    pageH: number;
    sheetClasses: string[];
    nodes: number;
    /** Honest-display lines in scope with no layout box at this width: not targets here (8e2). */
    honestUnrendered?: number;
    nonce: string;
    painted: { screen: string; look: number; flags: number };
    vw: number;
    vh: number;
    /** The look pseudos generated in the job's scope (D6(i)): none means no second frame. */
    lookPseudos?: number;
    /** The marks a look shows in the job's scope (8f2): with none and no pseudo, no second frame. */
    lookMarks?: number;
    /** The boxes painting file art in the job's scope (8f2): none means no art-off frame. */
    fileArt?: number;
    /** Those whose failed state differs from their pending one (8f2): a second art-off frame. */
    fileArtMixed?: number;
    /** The elements whose visible text no contrast target reads, described (a report, step 5b). */
    uncovered?: string[];
    /** How the sign's name was painted at the frozen instant (D14): its animations and opacity. */
    nameChrome?: string[];
    /** 1c(c): the movers near money on this paint (`digitTrigger`); a job with any reads every money character. */
    digitTrigger?: DigitTrigger;
    /** The stalls that wore Neo's rain, and how many had it at its brightest. */
    rain: { worn: number; flattened: number };
    /** The signs that wore Grid horizon (painted as they are; `__horizonAtItsWorst` flattens them for the report). */
    horizon: { worn: number; flattened: number };
    /** The stalls that wore the aurora, and how many had its tide held (`TIDE_SCREENS`). */
    tide: { worn: number; held: number };
};

/** The live boxes, with the nonce of the prepare that collected their nodes and the viewport now. */
type ContrastLive = {
    nonce: string | undefined;
    vw: number;
    vh: number;
    boxes: (ContrastTarget & { i: number })[];
    /** The prepared nodes that gave no box, counted by the reason `targetFor` gave. */
    skips: Record<string, number>;
};

declare global {
    interface Window {
        /** Every face's status when measuring began (`layout/faces.ts`), for the runner to hold. */
        __faces: FaceEcho;
        __contrastPrepare: (
            screen: string,
            themeId: number,
            flags: number,
            neutral: boolean,
            nonce: string,
            heightOnly?: boolean,
            tide?: 0 | 1,
        ) => ContrastPrepared;
        /** Flatten Grid horizon's art to its brightest paint on every sign (or take it off again); the signs worn and flattened. */
        __horizonAtItsWorst: (on: boolean) => Promise<{ worn: number; flattened: number }>;
        /** Pause every animation on the page at one instant, its delay zeroed. */
        __contrastFreeze: () => void;
        __contrastBoxes: () => ContrastLive;
        /** Hide (or show again) the look pseudos the last prepare marked, the marks a look shows, both or neither (D6(i), 8f2). */
        __lookPaintHidden: (which: 'none' | 'pseudos' | 'marks' | 'both') => Promise<{ pseudos: number; marks: number }>;
        /** Paint the file art the last prepare marked as pending, as failed, or as loaded again; how many boxes (8f2). */
        __artOff: (state: 'pending' | 'failed' | 'off') => Promise<number>;
        /** The protected boxes in the last prepare's scope, as they stand now (D6(i)). */
        __protectedBoxes: () => { x: number; y: number; w: number; h: number; sel: string }[];
        /**
         * Show (or blank again) the glyphs of every prepared target that
         * wears the outline and every broken figure, for the job's one
         * "shown" frame; how many of each.
         */
        __contrastGlyphs: (show: boolean, which?: 'both' | 'ring' | 'figures' | 'none', money?: boolean) => Promise<{ outlined: number; figures: number; money: number }>;
        /** 1c(c): every money node's characters on the last prepare's paint, each with its own reference count (report-only). */
        __moneyChars: () => MoneyChars;
        /** 1a once on a contrast job's prepared paint (`coverScan`). */
        __coverFaults: () => CoverScan;
        /**
         * The boxes allowed to be opaque on a transparent overlay: the two
         * plates and the QR, which are the text grounds the contrast rule
         * requires. The runner samples the alpha channel OUTSIDE these.
         */
        __opaqueBoxes: () => { x: number; y: number; w: number; h: number }[];
        /** Every painted code in the last prepare's scope, for the quiet-zone read (D4). */
        __quietZones: () => QuietZone[];
        /** The matrix every one of those codes was drawn from, in their order, for 1d (bound since 7c). */
        __codeMatrices: () => CodeMatrixRead[];
        __moduleSnap: (on: boolean) => { codes: number; bottom: number; width: number };
        __contrastScreens: string[];
        /** Every job of the contrast pass, at every viewport (`contrastPlan.ts`). */
        __contrastPlan: () => ContrastJob[];
        /** The measured looks whose sheet names `[data-copied]`, by class (`layout/sheetNaming.ts`). */
        __namesCopied: () => string[];
        /** The screens the plan samples for those looks (`COPIED_JOBS`). */
        __copiedScreens: string[];
        /** The jobs that owe a decoration at its worst, by key (`contrastOwed`). */
        __contrastOwed: () => { rain: string[]; horizon: string[] };
        /** The honest-display roles each sampled sheet screen owes, per viewport (`layout/honestDisplay.ts`). */
        __honestOwed: () => typeof HONEST_OWED;
        /** The overlay screens, so the driver can skip their `wornAll` half. */
        __noDecorScreens: string[];
        __canvasScreens: string[];
        /** Each measured look's id, and how many decoration rows it has — none means no worn half. */
        __themes: { id: number; rows: number; sheetClass: string; wornAll: number[] }[];
        __probeReady: boolean;
        /** Every policy refusal the page has met so far (`cspWatch.ts`). */
        __cspRefusals: () => readonly CspRefusal[];
        /** The worn-only road under the production policy, with `missing` a URL that must not load. */
        __wornSheetJob: (missing: string) => Promise<{
            url: string;
            before: string;
            loaded: boolean;
            error: string;
            last: boolean;
            sameOrigin: boolean;
            after: string;
            art: number[];
            state: string;
            askedAgain: boolean;
            links: number;
            missingRejected: boolean;
            missingWhy: string;
            missingStatus: number;
            missingState: string;
            missingAgainRejected: boolean;
            missingLinks: number;
            inEntryCss: boolean;
            refusals: readonly CspRefusal[];
        }>;
    }
}

/*
 * Which screens the pixel-contrast driver samples, at this viewport.
 *
 * Its own list, not `screensToRun()`: a prepare is a full paint plus
 * `document.fonts.ready` plus two frames, and the contrast pass buys 21
 * screens x 3 looks x 2 worn states at every width — it is most of the
 * guard's runtime, so a screen belongs here only if it puts a figure on a
 * ground no other screen does.
 *
 * The overlay's screens share one head plate and one card between them.
 * `broadcast` carries every figure the others carry, on the same plate;
 * `broadcast-clear` paints no ground at all, so an ordinary shot of it is a
 * shot flattened onto white — which the transparency pass measures properly,
 * over black AND white, rather than paying for it twice here. The two
 * long-name screens are geometry for the sticker rule and put no figure on a
 * ground this list does not already hold. `GEOMETRY_ONLY_SCREENS` is the same
 * judgement written down for the page screens. The rule itself is
 * `contrastScreens` in `contrastPlan.ts`, shared with the plan below.
 */
/*
 * Whether a measured look's sheet names `[data-copied]`, from the stylesheets
 * this page loaded (`loadedSheetNames`): the staged address screens are
 * sampled for contrast for those looks alone (`COPIED_JOBS`). The worn-only
 * sheets are on the page by now (above); the runner holds the answer to the
 * served sheets' text (`__namesCopied`).
 */
const namesCopied = (look: Look): boolean => loadedSheetNames('data-copied', look.theme.sheetClass);
window.__contrastScreens = contrastScreens(
    window.innerWidth,
    new URLSearchParams(location.search).get('viewport') === 'canvas',
    measuredLooks(),
    namesCopied,
);
/*
 * The whole pass as a list of jobs (step 3a, the step-3 critic's item 7):
 * the runner walks this and nothing else, and holds the jobs it did against
 * it at the end. The screens at this page's own width are `__contrastScreens`
 * above, which the runner compares with the plan's at every viewport.
 */
window.__contrastPlan = () => contrastPlan(measuredLooks(), namesCopied);
/* The classes of the measured looks whose sheet names `[data-copied]`, as this page reads them, and the screens sampled for them. */
window.__namesCopied = () => measuredLooks().filter(namesCopied).map((look) => look.theme.sheetClass).sort();
window.__copiedScreens = [...COPIED_JOBS];
/*
 * The jobs the runner holds to having worn the rain and Grid horizon at
 * their worst, for every measured look whose rows carry them
 * (`contrastOwed`): Neo's on the ordinary probe, the kit's when it starts
 * from Neo.
 */
window.__contrastOwed = () => contrastOwed(measuredLooks());
window.__honestOwed = () => HONEST_OWED;
window.__noDecorScreens = [...NO_DECOR_SCREENS];
window.__canvasScreens = [...CANVAS_SCREENS];
window.__themes = measuredLooks().map((look) => ({
    id: look.id,
    rows: look.rows.length,
    sheetClass: look.theme.sheetClass,
    // One all-worn state per mood (D11), for the transparency pass.
    wornAll: wornAllFlags(look),
}));

/** True when any ancestor up to the stall carries a live transform. */
function insideTransform(node: HTMLElement): boolean {
    let cur: HTMLElement | null = node;
    while (cur !== null && !cur.classList.contains('frame')) {
        if (getComputedStyle(cur).transform !== 'none') {
            return true;
        }
        cur = cur.parentElement;
    }
    return false;
}

/** The nodes the last `__contrastPrepare` blanked, for late box re-reads. */
let preparedNodes: HTMLElement[] = [];
/** The runner's nonce for that prepare, echoed with every re-read. */
let preparedNonce: string | undefined;

/** One node's sample box and static fields, or nothing worth sampling. */
function targetFor(node: HTMLElement): ContrastTarget | string {
    if (node.querySelector('img') !== null) {
        // A tile wearing its token's picture has no letters to measure: the
        // pixels in its box are the image's own, and sampling them against
        // the ink the letters would have worn reported the Activity's
        // description-row tile at 1.18–2.64:1 on Rural and Neo (2026-09-15,
        // the day `.event-sum .event-ic` joined the list). The letters
        // tiles and the empty tiles beside it measured 5.7–17:1.
        return 'picture';
    }
    if (drawsNothing(node)) {
        // A box with no letters, no glyph and no generated text has no ink
        // to measure — the Activity's empty tile (`event-ic-empty`, a
        // placeholder that keeps a row's column and names no token) was
        // sampled as "text" against its own transparent ground, which read
        // 2.66:1 the day the rain's ground came off from under it (round 6,
        // 2026-09-24). The picture tile above is the same rule's first case.
        return 'draws-nothing';
    }
    const full = node.getBoundingClientRect();
    let box: { x: number; y: number; width: number; height: number } = full;
    // Content scrolled out of a clip keeps its full rect, and a box
    // sampled where the page paints something else entirely reported a
    // studio control at 1.00:1 against the dock's selected-tab blue — and
    // later the publish sheet's hex past ITS own scroll edge. The clamp is
    // the nearest scrollable ancestor, whoever that is: the shell's region
    // and the sheet are the same boundary wearing two class names.
    let clipper: HTMLElement | null = node.parentElement;
    while (clipper !== null) {
        const cs = getComputedStyle(clipper);
        const oy = cs.overflowY;
        if ((oy === 'auto' || oy === 'scroll') && clipper.scrollHeight > clipper.clientHeight + 1) {
            break;
        }
        // A cell that CUTS (the ticker's ribbon cell, 2026-09-21) clamps the
        // same way: a frozen figure half outside it would otherwise be
        // sampled over the code plate's white or the transparent ground.
        if (clipper.hasAttribute('data-ribbon') && (cs.overflowX === 'hidden' || cs.overflowX === 'clip')) {
            break;
        }
        clipper = clipper.parentElement;
    }
    const clip = clipper?.getBoundingClientRect();
    // A box the clamp cut to a sliver, or to nothing, is a box the whole-box
    // read cannot use. It decides a money box and an outlined line, as it
    // always did; every other target is read over its line rects, which are
    // clipped on their own and decide for themselves (step 5b).
    let sliver = false;
    if (clip !== undefined) {
        const x = Math.max(box.x, clip.x);
        const y = Math.max(box.y, clip.y);
        box = {
            x,
            y,
            width: Math.min(box.x + box.width, clip.right) - x,
            height: Math.min(box.y + box.height, clip.bottom) - y,
        };
        // A clipped SLIVER holds no line of text — a control cut to 6px at
        // the region's edge is all border and corner arc, and sampling it
        // reported a pill's ink against its own top border at 1.04:1. The
        // control is measured in full wherever it stands clear of the edge.
        if (
            (box.height < 16 && box.height < full.height - 1) ||
            (box.width < 16 && box.width < full.width - 1)
        ) {
            sliver = true;
        }
    }
    if (box.width < 2 || box.height < 2) {
        sliver = true;
    }
    // The heading step-past (Neo's inline-block wedge read as the heading's
    // ground at 1.2:1, 2026-09-24) is gone with step 5b: a marker the text
    // does not cross lies outside every line rect by construction, and no
    // money box carries one.
    const style = getComputedStyle(node);
    const money = node.matches(MONEY);
    // The element's OWN clip, narrowing the band to paint (see `clipBand`).
    // Resolved against `full`, which is the box a polygon's coordinates are
    // relative to, then intersected with whatever the scroll clamp left.
    // The line rects take the same band (`ownBand`).
    let ownBand: { x0: number; x1: number } | undefined;
    const ownClip = style.clipPath;
    if (ownClip.startsWith('polygon(')) {
        const poly = parsePolygon(ownClip, full.width, full.height);
        if (poly === undefined) {
            throw new Error(`unreadable clip-path on a contrast target: ${ownClip}`);
        }
        const band = clipBand(poly, full.height);
        if (band === undefined) {
            // Non-convex, or nothing left: refused rather than guessed at.
            return 'unreadable-clip';
        }
        ownBand = { x0: full.x + band.x0, x1: full.x + band.x1 };
        const x = Math.max(box.x, full.x + band.x0);
        const right = Math.min(box.x + box.width, full.x + band.x1);
        if (right - x < 2) return 'clipped-away';
        box = { x, y: box.y, width: right - x, height: box.height };
    }
    // The colour the glyphs would paint in: read from the blanking backup,
    // which a re-read after `__contrastPrepare` takes (`glyphsBlanked`).
    const ink = glyphsBlanked(node) ? node.dataset['probeInk']! : style.color;
    node.dataset['probeInk'] = ink;
    const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
    const ring = Math.max(0, outlineOf(node));
    const lined = !money && ring === 0;
    if (!lined && sliver) {
        return 'sliver';
    }
    const angle = angleOf(node);
    // A target in a turned frame is read in that frame (`ownFrame`); one with
    // no layout size of its own past 45° cannot be, and says so — the runner
    // fails a pass with any (round 4, the critic's P3-1).
    const frame = angle === 0 ? undefined : ownFrame(node, full, angle);
    if (angle !== 0 && frame === undefined) {
        return 'turned-too-far';
    }
    const read = lined ? lineRectsOf(node, ink, ownBand) : undefined;
    if (read !== undefined && read.rects.length === 0) {
        return read.why;
    }
    const ringBox = (() => {
        const wide = { x: box.x - ring, y: box.y - ring, right: box.x + box.width + ring, bottom: box.y + box.height + ring };
        const x = Math.max(wide.x, clip?.x ?? 0, 0);
        const y = Math.max(wide.y, clip?.y ?? 0, 0);
        const right = Math.min(wide.right, clip?.right ?? Infinity, window.innerWidth);
        const bottom = Math.min(wide.bottom, clip?.bottom ?? Infinity, window.innerHeight);
        return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
    })();
    return {
        x: box.x,
        y: box.y,
        w: box.width,
        h: box.height,
        color: ink,
        // Clamped against the element's OWN box, never the clipped one. A
        // pill's arc is a property of the control; halving it to fit a box
        // the scroll clamp cut down understates the inset by exactly the
        // amount the clip moved the sample band into the arc. Measured
        // 2026-09-04: the describe sheet's 51px `border-radius: 999px` sign
        // control, clipped to its top 20px by the sheet's edge, took r=10
        // instead of 25 and sampled ten pixels of the sheet's cream ground
        // inside the curve — 1.00:1 against its own cream ink, on a control
        // every reader sees as cream on terracotta at 4:1.
        r: Math.min(radius, full.width / 2, full.height / 2),
        // A bordered pill's dashed edge sampled as "background" reported
        // the rural address at 2.2:1 against its own border blend. The
        // border is chrome, not ground — the runner insets past it. The
        // widest of the four sides, because the rural dock draws its
        // divider as a border-left the top-width alone never saw.
        bw: Math.max(
            Number.parseFloat(style.borderTopWidth) || 0,
            Number.parseFloat(style.borderRightWidth) || 0,
            Number.parseFloat(style.borderBottomWidth) || 0,
            Number.parseFloat(style.borderLeftWidth) || 0,
        ),
        pad: 0,
        legacyPad: insideTransform(node) ? 8 : 0,
        angle,
        ...(angle === 0 ? {} : { frame: frame! }),
        sel: describe(node),
        ...(node.matches(HONEST_SELECTOR) ? { role: node.getAttribute('data-role')! } : {}),
        money,
        rects: read?.rects,
        legacyDropped: sliver,
        ring,
        lines: ring > 0 ? ringLines(node, box) : [],
        // A broken figure's pieces, each read in the FIGURE's own ink (the
        // ink of the node the figure is written into, never a piece's), and
        // only the figure's own text: a money target holding words beside
        // the figure (Pay several's lines, the selection line's "1 ×") read
        // those words toward the figure's ink in round 3's first cut (round
        // 4, the critic's P2-2).
        ...(money && node.querySelector('.fig-say') !== null
            ? (() => {
                  const says = [...node.querySelectorAll<HTMLElement>('.fig-say')];
                  const inkOf = (el: HTMLElement | null): string =>
                      el === null || el === node ? ink : (el.dataset['probeInk'] ?? getComputedStyle(el).color);
                  return {
                      digits: says.flatMap((say) => ringLines(say, box, { ink: inkOf(say.parentElement), hidden: true })),
                      digitsOwed: says.reduce(
                          (n, say) => n + [...(say.getAttribute('aria-label') ?? '')].filter((ch) => /[\p{L}\p{N}]/u.test(ch)).length,
                          0,
                      ),
                      digitsRole: node.getAttribute('data-role') ?? describe(node),
                      // Its line boxes, each read whole by the box read (round 4):
                      // the union of an inline figure's lines holds what stands
                      // beside them. Unturned figures alone; a turned one keeps
                      // its one box in its own frame.
                      ...(angle === 0 && node.getClientRects().length > 1
                          ? {
                                lineBoxes: [...node.getClientRects()]
                                    .map((r) => {
                                        const x = Math.max(r.left, box.x);
                                        const y = Math.max(r.top, box.y);
                                        const w = Math.min(r.right, box.x + box.width) - x;
                                        const h = Math.min(r.bottom, box.y + box.height) - y;
                                        return { x, y, w, h };
                                    })
                                    .filter((r) => r.w > 0 && r.h > 0),
                            }
                          : {}),
                  };
              })()
            : {}),
        icons:
            ring > 0
                ? [...node.querySelectorAll('svg')].map((svg) => {
                      const r = svg.getBoundingClientRect();
                      return { x: r.x, y: r.y, w: r.width, h: r.height };
                  })
                : [],
        ringBox,
        offsets: ring === 1 ? OUTLINE_1 : ring === 2 ? OUTLINE_2 : [],
    };
}

/**
 * The turn of `el`'s frame, in radians: every `transform` and `rotate` from
 * `el` up to the root, summed. Two-dimensional turns only — a skew or a
 * perspective is not a turn this sampler can undo, and none is shipped on a
 * text frame.
 */
function angleOf(el: Element | null): number {
    let angle = 0;
    for (let at = el; at !== null && at !== document.documentElement; at = at.parentElement) {
        const cs = getComputedStyle(at);
        if (cs.transform !== 'none') {
            const m = new DOMMatrixReadOnly(cs.transform);
            angle += Math.atan2(m.b, m.a);
        }
        const turn = /^(-?[\d.]+)deg$/.exec(cs.rotate.trim());
        if (turn !== null) {
            angle += (Number(turn[1]) * Math.PI) / 180;
        }
    }
    return angle;
}

/**
 * A turned box before its turn: `getBoundingClientRect()` and
 * `Range.getClientRects()` answer a turned box's axis-aligned bounds, W×H,
 * and for a turn θ those are w·c + h·s by w·s + h·c — solved here for w and
 * h, about the same centre. **Undefined from 45°** (round 4, the critic's
 * P3-1): there the system is singular (c = s) or gives no positive box, and
 * the first version threw, so a look that turned a figure that far stopped
 * the probe page writing any verdict. An element is read by `ownFrame`
 * instead, which never needs the solve; a line fragment past it is said by
 * its caller.
 */
function turnedBox(r: DOMRect, angle: number): { cx: number; cy: number; w: number; h: number } | undefined {
    const c = Math.abs(Math.cos(angle));
    const sn = Math.abs(Math.sin(angle));
    const det = c * c - sn * sn;
    const w = angle === 0 ? r.width : (r.width * c - r.height * sn) / det;
    const h = angle === 0 ? r.height : (r.height * c - r.width * sn) / det;
    if (!(det > 0 && w > 0 && h > 0)) {
        return undefined;
    }
    return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, w, h };
}

/**
 * An element's box before its frame's turn: solved from its bounds under 45°
 * (`turnedBox`, which every read used before and still uses there, so no
 * read moves), and past it its layout size (`offsetWidth` × `offsetHeight`,
 * which no transform touches) about the centre of its turned bounds — exact
 * at any angle, never singular (round 4, the critic's P3-1). An element with
 * no layout size of its own (an SVG node) past 45° is undefined.
 */
function ownFrame(node: Element, r: DOMRect, angle: number): { cx: number; cy: number; w: number; h: number } | undefined {
    const solved = turnedBox(r, angle);
    if (solved !== undefined) {
        return solved;
    }
    if (node instanceof HTMLElement && node.offsetWidth > 0 && node.offsetHeight > 0) {
        return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, w: node.offsetWidth, h: node.offsetHeight };
    }
    return undefined;
}

/** A turn in degrees, for a sentence. */
function degrees(angle: number): string {
    return `${((angle * 180) / Math.PI).toFixed(2)}°`;
}

/**
 * The box `el`'s overflow clips its content to, per axis — its padding box
 * on an axis whose `overflow` is not `visible` — or nothing. An inline box
 * clips nothing, whatever it says.
 */
function clipOf(el: Element): { x0: number; x1: number; y0: number; y1: number } | undefined {
    const cs = getComputedStyle(el);
    const cutsX = cs.overflowX !== 'visible';
    const cutsY = cs.overflowY !== 'visible';
    if ((!cutsX && !cutsY) || cs.display === 'inline' || cs.display === 'contents') {
        return undefined;
    }
    const r = el.getBoundingClientRect();
    const x0 = r.left + el.clientLeft;
    const y0 = r.top + el.clientTop;
    return {
        x0: cutsX ? x0 : -Infinity,
        x1: cutsX ? x0 + el.clientWidth : Infinity,
        y0: cutsY ? y0 : -Infinity,
        y1: cutsY ? y0 + el.clientHeight : Infinity,
    };
}

/**
 * A target's own text as the line-rect sampler reads it (D7, step 5b;
 * `PROBE-RULES.md`, "The sampler reads text"): every non-blank text node
 * whose nearest contrast target is this one — a nested target is read as
 * itself — and every fragment of it on a line (`Range.getClientRects()`),
 * each clipped like its text is: by the target's own overflow and every
 * clipping ancestor's, and by the target's own convex `clip-path` band.
 * No radius or border inset: a line rect holds no border and no arc. A
 * control whose only mark is a drawn glyph (`.step`, the sheet close) is
 * read over that glyph's box instead. When nothing is left, the reason
 * says why — `clipped-away` (every fragment outside a clip: not on screen)
 * or `not-rendered` (no fragment at all, as a `display: none` span) — and
 * the runner counts every reason.
 */
function lineRectsOf(
    node: HTMLElement,
    ink: string,
    ownBand: { x0: number; x1: number } | undefined,
): { rects: LineRect[]; why: string } {
    const rects: LineRect[] = [];
    let fragments = 0;
    let turned = 0;
    const clipped = (owner: Element, r: DOMRect): Hole | undefined => {
        let x0 = r.left;
        let y0 = r.top;
        let x1 = r.right;
        let y1 = r.bottom;
        for (let at: Element | null = owner; at !== null && at !== document.documentElement; at = at.parentElement) {
            const c = clipOf(at);
            if (c === undefined) continue;
            x0 = Math.max(x0, c.x0);
            x1 = Math.min(x1, c.x1);
            y0 = Math.max(y0, c.y0);
            y1 = Math.min(y1, c.y1);
        }
        if (ownBand !== undefined) {
            x0 = Math.max(x0, ownBand.x0);
            x1 = Math.min(x1, ownBand.x1);
        }
        return x1 - x0 > 0 && y1 - y0 > 0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : undefined;
    };
    const push = (owner: Element, r: DOMRect, lineInk: string, glyph: boolean): void => {
        if (r.width <= 0 || r.height <= 0) return;
        fragments += 1;
        const cut = clipped(owner, r);
        if (cut === undefined) return;
        const angle = angleOf(owner);
        const line = turnedBox(r, angle);
        if (line === undefined) {
            // A line fragment past 45° cannot be solved from its bounds
            // (round 4, the critic's P3-1): the target says so.
            turned += 1;
            return;
        }
        rects.push({ ...cut, cx: line.cx, cy: line.cy, rw: line.w, rh: line.h, angle, ink: lineInk, ...(glyph ? { glyph: true as const } : {}) });
    };
    const range = document.createRange();
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
        const owner = text.parentElement;
        if (owner === null || owner.closest('svg') !== null || (text.textContent ?? '').trim() === '') continue;
        if (owner.closest(CONTRAST) !== node) continue;
        const cs = getComputedStyle(owner);
        if (cs.visibility !== 'visible') continue;
        const lineInk = owner === node ? ink : owner instanceof HTMLElement && glyphsBlanked(owner) ? (owner.dataset['probeInk'] ?? cs.color) : cs.color;
        range.selectNodeContents(text);
        for (const r of range.getClientRects()) push(owner, r, lineInk, false);
    }
    if (fragments === 0) {
        // No text on a line: a control drawn with a glyph alone.
        for (const svg of node.querySelectorAll('svg')) {
            if (svg.closest(CONTRAST) !== node || getComputedStyle(svg).visibility !== 'visible') continue;
            push(svg, svg.getBoundingClientRect(), ink, true);
        }
    }
    if (turned > 0) {
        return { rects: [], why: 'turned-too-far' };
    }
    return { rects, why: fragments === 0 ? 'not-rendered' : 'clipped-away' };
}

/** No text, no drawn glyph, no generated content: nothing in the box has an ink. */
function drawsNothing(node: HTMLElement): boolean {
    if ((node.textContent ?? '').trim() !== '' || node.querySelector('svg, img') !== null) {
        return false;
    }
    const generated = (pseudo: string): boolean => {
        const content = getComputedStyle(node, pseudo).content;
        return content !== 'none' && content !== 'normal' && content !== '""' && content !== "''";
    };
    return !generated('::before') && !generated('::after');
}


/**
 * An outlined target's lines: every text node's visible characters, grouped
 * by the line box each sits on, each line's rect the union of its
 * characters' and its ink the colour its own element paints them in. A
 * character counts where its centre lies inside `box` (the target's box as
 * the clip left it), so a line scrolled half out of a clip counts only what
 * shows. Text inside an `<svg>` is a drawing, not a line.
 */
function ringLines(
    node: HTMLElement,
    box: { x: number; y: number; width: number; height: number },
    opts: { ink?: string; hidden?: boolean } = {},
): RingLine[] {
    const lines = new Map<string, RingLine>();
    const range = document.createRange();
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let index = 0;
    for (let text = walker.nextNode(); text !== null; text = walker.nextNode(), index += 1) {
        const owner = text.parentElement;
        if (owner === null || owner.closest('svg') !== null) continue;
        const cs = getComputedStyle(owner);
        // A broken figure's pieces are read hidden or not (`hidden`): a piece
        // a look hid paints nothing, and the read finds no glyph in it.
        if (cs.visibility !== 'visible' && opts.hidden !== true) continue;
        const ink = opts.ink ?? (glyphsBlanked(owner) ? ((owner as HTMLElement).dataset['probeInk'] ?? cs.color) : cs.color);
        const value = text.textContent ?? '';
        for (let i = 0; i < value.length; ) {
            const cp = value.codePointAt(i)!;
            const len = cp > 0xffff ? 2 : 1;
            if (!/\s/u.test(String.fromCodePoint(cp))) {
                range.setStart(text, i);
                range.setEnd(text, i + len);
                const r = range.getBoundingClientRect();
                const cx = r.x + r.width / 2;
                const cy = r.y + r.height / 2;
                if (r.width > 0 && r.height > 0 && cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height) {
                    const key = `${index}|${Math.round(r.y)}`;
                    const letter = /[\p{L}\p{N}]/u.test(String.fromCodePoint(cp)) ? 1 : 0;
                    const x = Math.max(r.x, box.x);
                    const y = Math.max(r.y, box.y);
                    const right = Math.min(r.right, box.x + box.width);
                    const bottom = Math.min(r.bottom, box.y + box.height);
                    const line = lines.get(key);
                    if (line === undefined) {
                        lines.set(key, { x, y, w: right - x, h: bottom - y, chars: letter, glyphs: 1, ink });
                    } else {
                        const lx = Math.min(line.x, x);
                        const ly = Math.min(line.y, y);
                        line.w = Math.max(line.x + line.w, right) - lx;
                        line.h = Math.max(line.y + line.h, bottom) - ly;
                        line.x = lx;
                        line.y = ly;
                        line.chars += letter;
                        line.glyphs += 1;
                    }
                }
            }
            i += len;
        }
    }
    return [...lines.values()];
}

/**
 * **The contrast pass blanks the glyphs and nothing else** (round 6, the
 * critic's shared root of BL2, SZ and G2 on round 5, and of N9a on round 4),
 * **every target's at once**: so a target's glyphs moved over another
 * target's money are blank in both captures, and the money under them is
 * read as if they were not there (the critic's SVs on round 7, stated).
 * Every target and every element under it
 * had its `color` set transparent,
 * and `color` is not only the glyphs' ink: it is `currentColor`, so every
 * background, border, box shadow and gradient stop a look wrote from it went
 * transparent with the glyphs, and the ground capture never held them — a
 * ground in the ink's own colour written as `currentColor`, or a white layer
 * over one, passed the pass that exists to read what is painted. Now an
 * HTML element's glyphs go through `-webkit-text-fill-color: transparent`
 * and its `color` stays: every `currentColor` paint stands in the capture as
 * it stands on the screen. What `color` painted as part of the glyphs goes
 * with them, as it went before: a decoration line, an emphasis mark or a
 * text stroke whose colour is the element's `color` — its `currentColor` —
 * is set transparent beside the fill (`GLYPH_MARKS`), and so are an SVG
 * element's paints that follow its `color` (`SVG_GLYPH_PAINTS`: its fill and
 * stroke, a gradient stop's, a filter's flood or light, round 7, the
 * critic's P2-1 on round 6) — an SVG element keeps its `color` too, so a
 * background, border or shadow it wears in `currentColor` stands in the
 * capture as an HTML element's does, where the old blanking (its `color`
 * transparent) dropped it.
 *
 * **Every look pseudo keeps its glyphs** (round 7, the critic's P1-1 on
 * round 6; every pseudo whose rule names a look's or a decoration's class
 * anywhere in its selector since round 8, `lookPseudoOf`, the critic's PSc
 * and PSci; read at the frozen instant alone, so one a look animates
 * invisible at 400ms is not read, the critic's PSa2). A `::before` or
 * `::after` inherits the transparent fill, as it
 * inherited the transparent colour. A pseudo of the app's own sheets that
 * inherits its host's ink goes blank with it, as before; one that sets a
 * colour of its own keeps its glyphs, as it did; and **every look pseudo**
 * (`markLookPseudos`' `data-probe-lp-*`, a `::before`/`::after` a look or a
 * decoration rule generates) keeps its glyphs whatever its colour — round 6
 * kept only those whose colour differed from the host's, so a look pseudo in
 * its host's ink, written by name or inherited, was blank in both of the
 * look-pseudo frames (D6(i)) and painted over the address with every pass
 * green (the critic's PS and PSi). A pseudo that keeps its glyphs is marked
 * `data-probe-pf-*`, and its fill is put back to the fill it painted before
 * its host was blanked (read off the pseudo, carried on its host as
 * `--probe-pf-before` / `-after`): what it paints over or beside the text is
 * ground, D6(ii)'s reading.
 */
const GLYPH_FILL = '-webkit-text-fill-color';
/** The marks drawn with the glyphs in their own `color` when a look names no other. */
const GLYPH_MARKS = ['text-decoration-color', 'text-emphasis-color', '-webkit-text-stroke-color'] as const;
/**
 * An SVG element's paints, blanked where they follow its `color` (round 7):
 * a drawn glyph is stroked and filled in `currentColor` (`.ic`), a gradient
 * stop, a flood or a light may be too. Each is compared, computed, with the
 * element's computed `color` — the old blanking's reach, the element's
 * `color` set transparent, without the background, border and shadows that
 * `color` also paints.
 */
const SVG_GLYPH_PAINTS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color'] as const;
/** What a prepared element had inline before its glyphs were blanked, for showing them again. */
const glyphKept = new WeakMap<Element, { fill: readonly [string, string]; marks: readonly (readonly [string, string, string])[] }>();

/** Remember what an element wears for its glyphs, before any element is blanked (the marks blanked are those its `color` paints). */
function keepGlyphs(el: HTMLElement): void {
    if (glyphKept.has(el)) return;
    const cs = getComputedStyle(el);
    const marks: readonly string[] = el instanceof SVGElement ? [...SVG_GLYPH_PAINTS, ...GLYPH_MARKS] : GLYPH_MARKS;
    glyphKept.set(el, {
        fill: [el.style.getPropertyValue(GLYPH_FILL), el.style.getPropertyPriority(GLYPH_FILL)],
        marks: marks.filter((p) => cs.getPropertyValue(p) === cs.color).map((p) => [p, el.style.getPropertyValue(p), el.style.getPropertyPriority(p)] as const),
    });
    if (el instanceof SVGElement) return;
    for (const which of ['before', 'after'] as const) {
        const ps = getComputedStyle(el, `::${which}`);
        if (ps.content === 'none' || ps.content === 'normal') continue;
        // Its own colour, or a look's pseudo whatever its colour (round 7).
        if (ps.color === cs.color && !el.hasAttribute(`data-probe-lp-${which}`)) continue;
        el.setAttribute(`data-probe-pf-${which}`, '');
        el.style.setProperty(`--probe-pf-${which}`, ps.getPropertyValue(GLYPH_FILL));
    }
}

let pseudoFillSheetAdopted = false;
/** The pseudo-elements that keep their glyphs while their host is blanked (a colour of their own, or a look's); the marks of an earlier prepare cleared. */
function adoptPseudoFillSheet(): void {
    for (const el of document.querySelectorAll<HTMLElement>('[data-probe-pf-before], [data-probe-pf-after]')) {
        el.removeAttribute('data-probe-pf-before');
        el.removeAttribute('data-probe-pf-after');
        el.style.removeProperty('--probe-pf-before');
        el.style.removeProperty('--probe-pf-after');
    }
    if (pseudoFillSheetAdopted) return;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(
        `[data-probe-pf-before]::before{${GLYPH_FILL}:var(--probe-pf-before)!important}` +
            `[data-probe-pf-after]::after{${GLYPH_FILL}:var(--probe-pf-after)!important}`,
    );
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    pseudoFillSheetAdopted = true;
}

/** Blank an element's glyphs: its fill and the marks its `color` paints, or an SVG element's paints that follow its `color`. */
function blankGlyphs(el: HTMLElement): void {
    if (!(el instanceof SVGElement)) el.style.setProperty(GLYPH_FILL, 'transparent', 'important');
    for (const [p] of glyphKept.get(el)?.marks ?? []) el.style.setProperty(p, 'transparent', 'important');
}

/** Show an element's glyphs again: what it wore inline put back. */
function showGlyphs(el: HTMLElement): void {
    const kept = glyphKept.get(el);
    const put = (p: string, value: string, priority: string): void => {
        if (value === '') el.style.removeProperty(p);
        else el.style.setProperty(p, value, priority);
    };
    if (!(el instanceof SVGElement)) put(GLYPH_FILL, kept?.fill[0] ?? '', kept?.fill[1] ?? '');
    for (const [p, value, priority] of kept?.marks ?? []) put(p, value, priority);
}

/** Whether the prepare blanked an element's glyphs, so its own computed ink is the backup's. */
const glyphsBlanked = (el: Element): boolean => {
    if (el instanceof SVGElement) return (glyphKept.get(el)?.marks ?? []).some(([p]) => el.style.getPropertyValue(p) === 'transparent');
    return el instanceof HTMLElement ? el.style.getPropertyValue(GLYPH_FILL) === 'transparent' || el.style.color === 'transparent' : false;
};

/**
 * **The job's one "shown" frame** (before 8g2, commit 2): every prepared
 * target the ring read or the broken-figure read reads, and each
 * descendant, has its glyphs shown again (the fill the prepare blanked, each
 * element its own, put back) or blanked once more — the targets that wear
 * the outline (the ring read) and the money nodes holding a `.fig-say` (the
 * broken-figure read, round 3, the critic's P2-1). The runner captures the
 * frame once, between a show and a blank, and reads both against the job's
 * own capture, which is the blank. A pseudo-element with an ink of its own
 * paints in both captures and one inheriting the line's follows it; the
 * mask is read inside the text nodes' own line boxes either way (D6(ii),
 * step 5b). A piece a look made transparent is put back transparent, and
 * one it hid stays hidden: what the read then finds is what the look paints.
 * Where an outlined line's rect meets a piece of another target's broken
 * figure, the runner asks for the two sets apart (`which`: `ring`, then
 * `figures`; before 8g2 item 8), so neither read takes the other's glyph
 * for its own. The horizon's worst read and the art-off read read the
 * outlined lines alone, and show them alone on their own frames (`ring`).
 */
window.__contrastGlyphs = async (show: boolean, which: 'both' | 'ring' | 'figures' | 'none' = 'both', money = false) => {
    let outlined = 0;
    let figures = 0;
    let moneyShown = 0;
    for (const node of preparedNodes) {
        const ring = (which === 'both' || which === 'ring') && outlineOf(node) > 0;
        const figure = (which === 'both' || which === 'figures') && node.matches(MONEY) && node.querySelector('.fig-say') !== null;
        // 1c(c), on a job its trigger found (`digitTrigger`): every money
        // node's glyphs shown too, for the per-character read.
        const coin = money && node.matches(MONEY) && node.getClientRects().length > 0;
        if (!ring && !figure && !coin) continue;
        if (ring) outlined += 1;
        if (figure) figures += 1;
        if (coin) moneyShown += 1;
        for (const el of [node, ...node.querySelectorAll<HTMLElement>('*')]) {
            if (el.dataset['probeColor'] === undefined) continue;
            if (show) {
                showGlyphs(el);
            } else {
                blankGlyphs(el);
            }
        }
        // A money node inside another target inherits that target's blanked
        // fill once its own is put back: shown, it wears the fill it painted
        // in (the studio's quote inside its state line read 0 of every
        // reference pixel until this).
        const fill = node.dataset['probeFill'];
        if (show && coin && fill !== undefined && getComputedStyle(node).getPropertyValue(GLYPH_FILL) !== fill) {
            node.style.setProperty(GLYPH_FILL, fill, 'important');
        }
    }
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return { outlined, figures, money: moneyShown };
};

/**
 * **1c(c): every digit, where a mover is near** (before 8g2, the plan's item
 * 1c, the owner's D-2026-10-20-06 D1 (c); report-only until step 7d;
 * `PROBE-RULES.md`, "Before 8g2, 1c(c): every digit, where a mover is
 * near"). The broken-figure read (`digitRead` in the runner) counts glyph
 * pixels per line, so one digit wholly covered leaves the line's others to
 * make up its count (the critic's C-2); and no read held a money node that
 * is not broken to its characters at all. On a contrast job whose paint holds
 * a mover near money, every money node's characters are read one by one on
 * the job's shown frame: each must keep at least `CHAR_KEEP_CUT`
 * (`scripts/char-read.mjs`) of its own reference count — the same glyph, in
 * the same face, weight, size, small caps and width, at the same subpixel
 * offset, drawn on a canvas here and counted inside the same pixel box.
 *
 * The trigger (`digitTrigger`, `layout/digitTrigger.ts`): a box placed by a
 * relative or sticky offset, a transform, a negative margin, an out-of-flow
 * position, a motion path or an animation that sets more than an ink or a
 * ground, whose painted boxes (its own and every box it holds, each grown by
 * 1b's whole sharp reach set, each cut by the clips of the box whose content it is and
 * held to the money node's own: `reachClipChain`, `pairClip`, 1b's) meet a
 * money node's line boxes —
 * neither the money node nor a box that holds it, which carry the money with
 * them — or a look's pseudo-element so placed, by the region 1b reads it in
 * (`pseudoRegion`; one whose region cannot be read triggers the job). Read
 * off the prepared paint before anything is blanked; it costs one walk of
 * the scope's computed styles, and nothing is captured for it.
 */
type DigitTrigger = { reasons: string[]; count: number; movers: number; elements: number; ms: number };
/** One money character, as the runner reads it: its own text box (`Range`), its ink, and its reference count. */
/**
 * One money character, as the runner reads it: its own text box (`Range`),
 * its ink, and its reference count; on a turned or scaled frame (`turn`)
 * its reference is the glyph drawn upright, which says whether it is too
 * small, and the sixteen phases of the turn it is held to (`charReference`).
 */
type MoneyChar = { x: number; y: number; w: number; h: number; ink: string; ref: number; c: string; turn?: CharTurn };
/** A turned frame's reference at each of `CHAR_TURN_PHASES`: its count, and its mask over the character's pixel box as hex (row by row, four pixels a digit, the first pixel the high bit). */
type CharTurn = { counts: number[]; masks: string[] };
/** One money node's characters, by its index among the prepared nodes, and the characters left out by reason. */
type MoneyCharsTarget = { i: number; sel: string; chars: MoneyChar[]; skipped: Record<string, number> };
type MoneyChars = { targets: MoneyCharsTarget[]; prepared: number; ms: number };

/** How many trigger reasons a job carries in full; the rest are counted. */
const DIGIT_TRIGGER_SAID = 6;

/** The text boxes of a node's own text (`Range` rects), or its border box where it holds none: what a mover must meet. */
function moneyLineBoxes(node: Element): Box[] {
    const range = document.createRange();
    range.selectNodeContents(node);
    const lines = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).map((r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }));
    if (lines.length > 0) return lines;
    const b = node.getBoundingClientRect();
    return b.width > 0 && b.height > 0 ? [{ left: b.left, top: b.top, right: b.right, bottom: b.bottom }] : [];
}

/** The animations running on each box of the page and on each pseudo-element, as `moverKinds` reads them. */
function animationsByTarget(): Map<string, AnimationFacts[]> & { forEl: (el: Element, pseudo?: string) => AnimationFacts[] } {
    const byEl = new Map<Element, Map<string, AnimationFacts[]>>();
    for (const anim of document.getAnimations()) {
        const effect = anim.effect as KeyframeEffect | null;
        const target = effect?.target;
        if (target === null || target === undefined) continue;
        const pseudo = effect!.pseudoElement ?? '';
        const name = (anim as CSSAnimation).animationName ?? (anim as CSSTransition).transitionProperty ?? anim.id ?? 'animation';
        let frames: Record<string, unknown>[] = [];
        try {
            frames = effect!.getKeyframes() as unknown as Record<string, unknown>[];
        } catch {
            frames = [];
        }
        const at = byEl.get(target) ?? byEl.set(target, new Map()).get(target)!;
        const list = at.get(pseudo) ?? at.set(pseudo, []).get(pseudo)!;
        list.push({ name: String(name), props: keyframeLonghands(frames) });
    }
    const out = new Map<string, AnimationFacts[]>() as Map<string, AnimationFacts[]> & { forEl: (el: Element, pseudo?: string) => AnimationFacts[] };
    out.forEl = (el, pseudo = '') => byEl.get(el)?.get(pseudo) ?? [];
    return out;
}

/**
 * A mover's painted rect with the clips 1b holds a paint to (`reachClipChain`,
 * `pairClip`): the chain of the box whose content it is — its parent, or an
 * out-of-flow box's containing block, so a clip between the two does not cut
 * it (the eleventh critic's ESC, CB2's shape with a box shadow) — the links
 * that carry it as they scroll, and, for a paint that is a box's content (its
 * text's, a pseudo's), that box's own window.
 */
type TriggerPaint = { rect: Box; chain: ClipLink[]; carriers: ClipLink[]; own: Box | undefined };
/** A money node as the trigger holds a mover to it: its line boxes cut to its own window, and its chain. */
type TriggerLines = { lines: Box[]; chain: ClipLink[] };

/** Where one of a mover's painted rects meets a money node's line boxes, each side cut by its own clips held to the other's (`pairClip`, 1b's rule), with `MEET_TOL` of slack. */
function triggerMeet(paints: readonly TriggerPaint[], node: TriggerLines): Box | undefined {
    for (const p of paints) {
        let rect = intersect(p.rect, pairClip(p.chain, node.chain));
        if (rect !== undefined && p.own !== undefined) rect = intersect(rect, p.own);
        if (rect === undefined) continue;
        const tClip = pairClip(node.chain, p.carriers);
        const lines = node.lines.map((l) => intersect(l, tClip)).filter((l): l is Box => l !== undefined);
        const meet = meetsLines([rect], lines);
        if (meet !== undefined) return meet.at;
    }
    return undefined;
}

/** The kinds of a reach that are a box's content (its text's paints), cut to that box's own window as 1b cuts them (`judgeReacher`'s `clipFor`). */
const textualReach = (kind: ReachKind): boolean => kind.startsWith('text-shadow') || kind === 'decoration';

/**
 * What one element paints, as the trigger reads it: its border box, and 1b's
 * whole sharp reach set off it (`ownPaints`: a box shadow's offset and spread,
 * an outline, a border image's outset, a `drop-shadow()`, its own text's
 * text-shadow off its lines' measured ink and its decoration lines' bands,
 * a blurred layer by its core), each held by `chain`; its text's paints cut
 * to its own window. A paint 1b cannot read is said instead (fails closed).
 */
function triggerPaintsOf(el: Element, chain: ClipLink[], range: Range): TriggerPaint[] | string {
    const out: TriggerPaint[] = [];
    const r = el.getBoundingClientRect();
    if (r.width > 0 || r.height > 0) out.push({ rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, chain, carriers: chain, own: undefined });
    const owner = reachOwner(el);
    if (owner === undefined) return out;
    const paints = ownPaints(el, owner.cs, owner.boxed, range);
    if (paints === undefined) return out;
    if (paints.anywhere !== undefined) return paints.anywhere;
    const window = reachOwnClip(el);
    for (const sh of paints.sharp) out.push({ rect: sh.rect, chain, carriers: chain, own: textualReach(sh.kind) ? window : undefined });
    return out;
}

/**
 * 1c(c)'s trigger on the prepared paint (`layout/digitTrigger.ts`): every
 * mover in the scope whose painted boxes meet a money node's line boxes,
 * said, and how many movers and elements were read.
 */
function digitTrigger(scope: ParentNode): DigitTrigger {
    const t0 = performance.now();
    const root = scope === document ? document.getElementById('app')! : (scope as Element);
    const money = preparedNodes.filter((node) => node.matches(MONEY) && node.getClientRects().length > 0);
    const out: DigitTrigger = { reasons: [], count: 0, movers: 0, elements: 0, ms: 0 };
    if (money.length === 0) {
        out.ms = performance.now() - t0;
        return out;
    }
    // Each node's line boxes cut to its own window where it clips its own text, and its chain of clips, held per pair to a mover's (`triggerMeet`).
    const chainSeen = new Map<Element, ClipLink[]>();
    // What each element paints, read once though nested movers hold it twice.
    const paintsSeen = new Map<Element, TriggerPaint[] | string>();
    const range = document.createRange();
    const lines = new Map<Element, TriggerLines>(
        money.map((node) => {
            const own = reachOwnClip(node);
            const boxes = moneyLineBoxes(node);
            return [node, { lines: own === undefined ? boxes : boxes.map((b) => intersect(b, own)).filter((b): b is Box => b !== undefined), chain: reachClipChain(node, chainSeen) }];
        }),
    );
    const anims = animationsByTarget();
    const say = (why: string): void => {
        out.count += 1;
        if (out.reasons.length < DIGIT_TRIGGER_SAID) out.reasons.push(why);
    };
    for (const el of [root, ...root.querySelectorAll('*')]) {
        out.elements += 1;
        if (el.closest('.deck-stall') !== null) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none') continue;
        const kinds = moverKinds(
            {
                position: cs.position,
                top: cs.top,
                right: cs.right,
                bottom: cs.bottom,
                left: cs.left,
                transform: cs.transform,
                translate: cs.translate,
                rotate: cs.rotate,
                scale: cs.scale,
                marginTop: cs.marginTop,
                marginRight: cs.marginRight,
                marginBottom: cs.marginBottom,
                marginLeft: cs.marginLeft,
                offsetPath: cs.getPropertyValue('offset-path') || 'none',
            },
            anims.forEl(el),
        );
        if (kinds.length === 0) continue;
        // A box that holds every money node carries all of them with it.
        if (money.every((node) => el === node || el.contains(node))) continue;
        out.movers += 1;
        // Its own box and every box it holds, each grown by its whole sharp reach and held by its own chain (`triggerPaintsOf`).
        const painted: TriggerPaint[] = [];
        let unread: string | undefined;
        for (const d of [el, ...el.querySelectorAll('*')]) {
            let held = paintsSeen.get(d);
            if (held === undefined) paintsSeen.set(d, (held = triggerPaintsOf(d, reachClipChain(d, chainSeen), range)));
            if (typeof held === 'string') unread ??= d === el ? held : `${named(d)}'s ${held}`;
            else painted.push(...held);
        }
        if (unread !== undefined) {
            say(`${named(el)} (${kinds.join('; ')}) paints where this page cannot read: ${unread.slice(0, 120)}`);
            continue;
        }
        for (const node of money) {
            if (el === node || el.contains(node)) continue;
            const at = triggerMeet(painted, lines.get(node)!);
            if (at !== undefined) {
                say(`${named(el)} (${kinds.join('; ')}) meets ${named(node)} at ${Math.round(at.left)},${Math.round(at.top)}`);
            }
        }
    }
    // A look's pseudo-elements, marked by the prepare (`markLookPseudos`).
    for (const host of root.parentElement?.querySelectorAll('[data-probe-lp-before], [data-probe-lp-after]') ?? []) {
        if (host !== root && !root.contains(host)) continue;
        for (const which of ['before', 'after'] as const) {
            if (!host.hasAttribute(`data-probe-lp-${which}`)) continue;
            const cs = getComputedStyle(host, `::${which}`);
            if (cs.content === 'none' || cs.content === 'normal' || cs.display === 'none') continue;
            const kinds = moverKinds(
                {
                    position: cs.position,
                    top: cs.top,
                    right: cs.right,
                    bottom: cs.bottom,
                    left: cs.left,
                    transform: cs.transform,
                    translate: cs.translate,
                    rotate: cs.rotate,
                    scale: cs.scale,
                    marginTop: cs.marginTop,
                    marginRight: cs.marginRight,
                    marginBottom: cs.marginBottom,
                    marginLeft: cs.marginLeft,
                    offsetPath: cs.getPropertyValue('offset-path') || 'none',
                },
                anims.forEl(host, `::${which}`),
            );
            if (kinds.length === 0) continue;
            out.movers += 1;
            const hr = host.getBoundingClientRect();
            const region = lookPseudoRegion(cs, hr);
            const who = `${named(host)}::${which} (${kinds.join('; ')})`;
            if ('anywhere' in region) {
                say(`${who} stands where this page cannot read: ${region.anywhere}`);
                continue;
            }
            // A pseudo is its host's content: held by its host's chain and cut to its host's own window, as 1b holds it (`cutToClips`).
            const chain = reachClipChain(host, chainSeen);
            const hostLink = clipLinkOf(host);
            const carriers = hostLink === undefined ? chain : [hostLink, ...chain];
            const ownWindow = reachOwnClip(host);
            // Its region, and 1b's whole sharp reach set off it (`pseudoReachPaints`), all of it its host's content.
            const reach = pseudoReachPaints(host, cs, region, reachScale(host, hr));
            if (reach.anywhere !== undefined) {
                say(`${who} paints where this page cannot read: ${reach.anywhere.slice(0, 120)}`);
                continue;
            }
            const painted: TriggerPaint[] = [region.box, ...reach.sharp.map((sh) => sh.rect)].map((rect) => ({ rect, chain, carriers, own: ownWindow }));
            for (const node of money) {
                const at = triggerMeet(painted, lines.get(node)!);
                if (at !== undefined) say(`${who} meets ${named(node)} at ${Math.round(at.left)},${Math.round(at.top)}`);
            }
        }
    }
    out.ms = performance.now() - t0;
    return out;
}

/** How far a money node's frame may be turned and its characters still be read in their axis-aligned boxes. */
const CHAR_TURN_MAX = (2 * Math.PI) / 180;
/** The upright raster's subpixel phases a turned frame's reference is drawn at (`charReference`): a quarter pixel apart on both axes. */
const CHAR_TURN_PHASES: [number, number][] = [0, 0.25, 0.5, 0.75].flatMap((x) => [0, 0.25, 0.5, 0.75].map((y): [number, number] => [x, y]));
/** The canvas pad around a reference glyph, CSS pixels: room for ink past its box, which neither count reads. */
const CHAR_REF_PAD = 8;
/** The reference canvas's side: a character box wider or taller than this less two pads is not read. */
const CHAR_REF_SIDE = 512;
let refContext: CanvasRenderingContext2D | null | undefined;
/** The upright canvas a turned frame's reference glyph is drawn on before it is resampled into the turn. */
let uprightContext: CanvasRenderingContext2D | null | undefined;
/** A character's reference (`charReference`): its count, and on a turned frame its sixteen phases. */
type CharRef = { ref: number; turn?: CharTurn };
const refCache = new Map<string, CharRef>();

/**
 * A character's reference count: `c` drawn alone on a canvas in `cs`'s face,
 * weight, size, small caps and width, its box at the same subpixel offset as
 * `r` stands on the page, and the pixels inside the same pixel box
 * (`floor(x)` to `ceil(x + w)`, the runner's crop) that its ink covers at
 * least halfway — the runner's own threshold (`RING_MASK_ALPHA`). Its
 * baseline is the box's top plus the face's ascent, rounded where the box's
 * height is the rounded ascent and descent (Chrome's content area), in
 * proportion otherwise. `undefined` where no canvas draws, or the box is
 * wider or taller than the canvas.
 *
 * On a turned or scaled frame (`linear`) where the upright raster put the
 * glyph inside its pixels is not known, so it answers, at each of
 * `CHAR_TURN_PHASES`, the count and the mask of the glyph resampled into the
 * turn (`turn`), for the runner to hold the character to the phase whose
 * mask its shown pixels match best (`turnRef` in `char-read.mjs`, the
 * eleventh critic's P1: the least of the sixteen let a partial cover pass
 * there); and, as its `ref`, the least count over the same phases of the
 * glyph drawn upright in its own box, which says whether it is too small.
 */
function charReference(c: string, cs: CSSStyleDeclaration, r: DOMRect, linear?: DOMMatrixReadOnly): CharRef | undefined {
    const x0 = Math.floor(r.x);
    const y0 = Math.floor(r.y);
    const cw = Math.ceil(r.x + r.width) - x0;
    const ch = Math.ceil(r.y + r.height) - y0;
    if (cw + 2 * CHAR_REF_PAD > CHAR_REF_SIDE || ch + 2 * CHAR_REF_PAD > CHAR_REF_SIDE || cw <= 0 || ch <= 0) return undefined;
    if (refContext === undefined) {
        const canvas = document.createElement('canvas');
        canvas.width = CHAR_REF_SIDE;
        canvas.height = CHAR_REF_SIDE;
        refContext = canvas.getContext('2d', { willReadFrequently: true });
    }
    const ctx = refContext;
    if (ctx === null) return undefined;
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ctx.font = font;
    ctx.fontVariantCaps = cs.fontVariantCaps as CanvasFontVariantCaps;
    ctx.fontStretch = (STRETCH_KEYWORD[cs.fontStretch] ?? 'normal') as CanvasFontStretch;
    ctx.fontKerning = 'none';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    const m = ctx.measureText(c);
    const a = m.fontBoundingBoxAscent;
    const d = m.fontBoundingBoxDescent;
    let key: string;
    let draw: (phase?: [number, number]) => void;
    // Where the page's upright raster put the glyph inside its pixels is
    // not known in a turned frame, so it is drawn at each of
    // `CHAR_TURN_PHASES` (one, where the frame is upright).
    let phases: [number, number][] = [[0, 0]];
    // A turned frame's upright glyph, counted in its own box at a phase (`draw` sets it).
    let uprightCount = 0;
    if (linear === undefined) {
        const rounded = Math.abs(r.height - (Math.round(a) + Math.round(d))) < 0.05;
        const base = rounded ? Math.round(a) : a + d > 0 ? (r.height * a) / (a + d) : a;
        const fx = r.x - x0;
        const fy = r.y - y0 + base;
        key = `${font}|${ctx.fontVariantCaps}|${ctx.fontStretch}|${ctx.letterSpacing}|${c}|${Math.round(fx * 64)}|${Math.round(fy * 64)}|${cw}|${ch}`;
        draw = () => ctx.fillText(c, CHAR_REF_PAD + fx, CHAR_REF_PAD + fy);
    } else {
        // A turned or scaled frame (Rural's swaying tag and tilted rows):
        // Chrome rasters the frame's layer upright and the compositor
        // resamples it into the turn (measured: a 0.5° turn spreads an "="
        // bar over two rows at under half its ink, where a glyph drawn
        // turned stays sharp). So the glyph is drawn upright on a canvas of
        // its own, its box — its advance by the face's rounded ascent and
        // descent, Chrome's content area — and that canvas drawn into the
        // frame's linear transform with bilinear smoothing, centred where
        // the page's box (the turned box's axis-aligned bounds) is centred.
        const w0 = m.width;
        const h0 = Math.round(a) + Math.round(d);
        const cx = CHAR_REF_PAD + (r.x + r.width / 2 - x0);
        const cy = CHAR_REF_PAD + (r.y + r.height / 2 - y0);
        const q = (v: number): number => Math.round(v * 4096);
        key = `${font}|${ctx.fontVariantCaps}|${ctx.fontStretch}|${ctx.letterSpacing}|${c}|${q(linear.a)},${q(linear.b)},${q(linear.c)},${q(linear.d)}|${Math.round(cx * 64)}|${Math.round(cy * 64)}|${cw}|${ch}`;
        draw = (phase = [0, 0]) => {
            const up = (uprightContext ??= (() => {
                const canvas = document.createElement('canvas');
                canvas.width = CHAR_REF_SIDE;
                canvas.height = CHAR_REF_SIDE;
                return canvas.getContext('2d', { willReadFrequently: true });
            })());
            if (up === null) return;
            up.clearRect(0, 0, CHAR_REF_SIDE, CHAR_REF_SIDE);
            up.font = ctx.font;
            up.fontVariantCaps = ctx.fontVariantCaps;
            up.fontStretch = ctx.fontStretch;
            up.fontKerning = 'none';
            up.letterSpacing = ctx.letterSpacing;
            up.textBaseline = 'alphabetic';
            up.textAlign = 'left';
            up.fillStyle = '#000';
            up.fillText(c, CHAR_REF_PAD + phase[0], CHAR_REF_PAD + phase[1] + Math.round(a));
            // The glyph drawn upright, counted in its own pixel box as an upright frame counts it: whether it is too small.
            const ux0 = Math.floor(CHAR_REF_PAD + phase[0]);
            const uy0 = Math.floor(CHAR_REF_PAD + phase[1]);
            const uw = Math.ceil(CHAR_REF_PAD + phase[0] + w0) - ux0;
            const ud = up.getImageData(ux0, uy0, Math.max(1, uw), Math.max(1, Math.ceil(CHAR_REF_PAD + phase[1] + h0) - uy0)).data;
            uprightCount = 0;
            for (let i = 3; i < ud.length; i += 4) if (ud[i]! >= 128) uprightCount += 1;
            // Upright box centre at (P + w0/2, P + h0/2), mapped onto the page box's centre.
            const ux = CHAR_REF_PAD + phase[0] + w0 / 2;
            const uy = CHAR_REF_PAD + phase[1] + h0 / 2;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'low';
            ctx.setTransform(linear.a, linear.b, linear.c, linear.d, cx - (linear.a * ux + linear.c * uy), cy - (linear.b * ux + linear.d * uy));
            ctx.drawImage(up.canvas, 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        };
        phases = CHAR_TURN_PHASES;
    }
    const seen = refCache.get(key);
    if (seen !== undefined) return seen;
    const counts: number[] = [];
    const masks: string[] = [];
    let upright = Infinity;
    for (const phase of phases) {
        ctx.clearRect(0, 0, cw + 2 * CHAR_REF_PAD, ch + 2 * CHAR_REF_PAD);
        ctx.fillStyle = '#000';
        draw(phase);
        const data = ctx.getImageData(CHAR_REF_PAD, CHAR_REF_PAD, cw, ch).data;
        let n = 0;
        let mask = '';
        let nibble = 0;
        for (let i = 3, k = 0; i < data.length; i += 4, k += 1) {
            const on = data[i]! >= 128;
            if (on) n += 1;
            nibble = (nibble << 1) | (on ? 1 : 0);
            if (k % 4 === 3) {
                mask += nibble.toString(16);
                nibble = 0;
            }
        }
        const left = (cw * ch) % 4;
        if (left !== 0) mask += (nibble << (4 - left)).toString(16);
        counts.push(n);
        masks.push(mask);
        upright = Math.min(upright, uprightCount);
    }
    const got: CharRef = linear === undefined ? { ref: counts[0]! } : { ref: upright, turn: { counts, masks } };
    refCache.set(key, got);
    return got;
}

/**
 * The linear part of everything that turns or scales a node (`transform`,
 * `rotate`, `scale` on it and every box above it), or undefined where there
 * is none: what a reference glyph is drawn in (`charReference`).
 */
function linearFrameOf(node: Element): DOMMatrixReadOnly | undefined {
    const chain: Element[] = [];
    for (let at: Element | null = node; at !== null && at !== document.documentElement; at = at.parentElement) chain.unshift(at);
    let m = new DOMMatrix();
    let any = false;
    for (const el of chain) {
        const cs = getComputedStyle(el);
        const turn = /^(-?[\d.]+)deg$/.exec(cs.rotate.trim());
        if (turn !== null && Number(turn[1]) !== 0) {
            m = m.rotate(Number(turn[1]));
            any = true;
        }
        if (cs.scale !== 'none' && cs.scale !== '') {
            const [sx, sy] = cs.scale.trim().split(/\s+/).map(Number);
            if (Number.isFinite(sx)) {
                m = m.scale(sx!, Number.isFinite(sy) ? sy! : sx!);
                any = true;
            }
        }
        if (cs.transform !== 'none' && cs.transform !== '') {
            const t = new DOMMatrix(cs.transform);
            m = m.multiply(new DOMMatrix([t.a, t.b, t.c, t.d, 0, 0]));
            any = true;
        }
    }
    if (!any) return undefined;
    const near = (v: number, w: number): boolean => Math.abs(v - w) < 1e-6;
    return near(m.a, 1) && near(m.b, 0) && near(m.c, 0) && near(m.d, 1) ? undefined : m;
}

/** The nearest scroller above a node that actually scrolls: its box, the one clip a character may stand behind and not be read (the contrast boxes' own rule, `targetFor`). */
function scrollClipOf(node: Element): DOMRect | undefined {
    for (let up: Element | null = node; up !== null; up = up.parentElement) {
        const cs = getComputedStyle(up);
        if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && up.scrollHeight > up.clientHeight + 1) return up.getBoundingClientRect();
        if (up.hasAttribute('data-ribbon') && (cs.overflowX === 'hidden' || cs.overflowX === 'clip')) return up.getBoundingClientRect();
    }
    return undefined;
}

/**
 * 1c(c)'s characters (`window.__moneyChars`): every prepared money node with
 * a box, each non-space character of its own text (text inside an `<svg>` is
 * a drawing) with its box, its ink and its reference count. Left out, by
 * reason and counted: a character behind the one clip a contrast box may be
 * read behind (a scroller that scrolls) or past the page (`clipped`), a node
 * turned past `CHAR_TURN_MAX` (`turned`), a box wider or taller than the
 * reference canvas (`too big`). A character with no box at all in a node
 * that has one is read as nothing there (`ref` 0 and an empty box), so the
 * runner holds it as unread.
 */
window.__moneyChars = () => {
    const t0 = performance.now();
    const out: MoneyChars = { targets: [], prepared: 0, ms: 0 };
    const range = document.createRange();
    const W = window.innerWidth;
    const H = window.innerHeight;
    preparedNodes.forEach((node, i) => {
        if (!node.matches(MONEY) || node.getClientRects().length === 0) return;
        const target: MoneyCharsTarget = { i, sel: named(node), chars: [], skipped: {} };
        out.targets.push(target);
        const skip = (why: string): void => {
            target.skipped[why] = (target.skipped[why] ?? 0) + 1;
        };
        const turned = Math.abs(angleOf(node)) > CHAR_TURN_MAX;
        const linear = turned ? undefined : linearFrameOf(node);
        const scroll = scrollClipOf(node);
        const clip = { left: Math.max(0, scroll?.left ?? 0), top: Math.max(0, scroll?.top ?? 0), right: Math.min(W, scroll?.right ?? W), bottom: Math.min(H, scroll?.bottom ?? H) };
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
            const owner = text.parentElement;
            if (owner === null || owner.closest('svg') !== null) continue;
            const cs = getComputedStyle(owner);
            const ink = glyphsBlanked(owner) ? ((owner as HTMLElement).dataset['probeInk'] ?? cs.color) : cs.color;
            const value = text.textContent ?? '';
            const shown = painted(value, cs.textTransform);
            const same = [...shown].length === [...value].length;
            const shownCps = [...shown];
            let k = 0;
            for (let at = 0; at < value.length; k += 1) {
                const cp = value.codePointAt(at)!;
                const len = cp > 0xffff ? 2 : 1;
                const ch = String.fromCodePoint(cp);
                const start = at;
                at += len;
                if (/[\s\p{Cf}]/u.test(ch)) continue;
                out.prepared += 1;
                if (turned) {
                    skip('turned');
                    continue;
                }
                range.setStart(text, start);
                range.setEnd(text, start + len);
                const r = range.getBoundingClientRect();
                if (r.width <= 0 || r.height <= 0) {
                    target.chars.push({ x: r.x, y: r.y, w: 0, h: 0, ink, ref: 0, c: ch });
                    continue;
                }
                if (r.left < clip.left - 0.5 || r.top < clip.top - 0.5 || r.right > clip.right + 0.5 || r.bottom > clip.bottom + 0.5) {
                    skip('clipped');
                    continue;
                }
                const drawn = same ? shownCps[k]! : painted(ch, cs.textTransform);
                const got = charReference(drawn, cs, r, linear);
                if (got === undefined) {
                    skip('too big');
                    continue;
                }
                target.chars.push({ x: r.x, y: r.y, w: r.width, h: r.height, ink, ref: got.ref, c: drawn, ...(got.turn === undefined ? {} : { turn: got.turn }) });
            }
        }
    });
    out.ms = performance.now() - t0;
    return out;
};

/**
 * The boxes as they are RIGHT NOW, for the runner to read immediately before
 * the shot. The self-hosted face swaps metrics whenever it lands, the
 * fit-content dock re-centres, and coordinates taken at prepare time sampled
 * the neighbouring selected tab's ground — 1.20:1 reported on a dock whose
 * DOM held nothing but cream at those coordinates.
 */
window.__contrastBoxes = () => {
    const skips: Record<string, number> = {};
    const boxes: (ContrastTarget & { i: number })[] = [];
    // Each box carries its node's index among the prepared nodes: stable
    // DOM order, so a box the page drops does not renumber the rest in the
    // runner's per-box dump (`scripts/contrast-dump.mjs`). A node that gives
    // no box says why, and every reason is counted (step 5b: no silent drop).
    preparedNodes.forEach((node, i) => {
        const target = targetFor(node);
        if (typeof target === 'string') {
            skips[target] = (skips[target] ?? 0) + 1;
        } else {
            boxes.push({ ...target, i });
        }
    });
    return { nonce: preparedNonce, vw: window.innerWidth, vh: window.innerHeight, boxes, skips };
};

/**
 * A code's name in a report: the nearest role above it, or its parent's
 * first class — enough for a person to find which code on the screen it is.
 */
function codeName(svg: Element): string {
    const owner = svg.parentElement?.closest('[data-role]');
    if (owner !== null && owner !== undefined) return owner.getAttribute('data-role')!;
    const cls = svg.parentElement?.getAttribute('class')?.split(/\s+/)[0];
    return cls === undefined || cls === '' ? 'code' : cls;
}

/**
 * **A code keeps its quiet zone white** (step 5a″, D4;
 * `a-code-keeps-its-quiet-zone-white`, `PROBE-RULES.md`). Every painted
 * code in the last prepare's scope (an open sheet's, or the page's), the
 * door's deck aside, with the geometry the runner reads its ring from:
 * the square `qrSvg` draws into — the content box, less the SVG's own
 * letterboxing (`xMidYMid meet`) — its module (that square over the
 * viewBox), the corner the element's own radius cuts past its padding and
 * border, and the clip every clipping ancestor puts on it. A code whose
 * frame is turned is not read (an axis-aligned ring cannot be read in a
 * turned box) and says so.
 */
type QuietZone = {
    name: string;
    x: number;
    y: number;
    side: number;
    module: number;
    corner: number;
    clip: { x0: number; y0: number; x1: number; y1: number };
    turned: boolean;
    /**
     * Every box above the code that scrolls or is scrolled, with its offset
     * when the zones were read, and the document's own — said when a read
     * fails, to find why (`quietReadingLine`, `quiet-zone.mjs`).
     */
    scrolled: { at: string; top: number; left: number }[];
};

/** A code's matrix as 1d reads it (`__codeMatrices`), or why it cannot be read. */
type CodeMatrixRead = { name: string } & ((CodeMatrix & { payload?: 'checked' }) | { fault: string });

/** The boxes above `el` that scroll or are scrolled, and the document's offset, for a quiet-zone reading. */
function scrolledAbove(el: Element): { at: string; top: number; left: number }[] {
    const out: { at: string; top: number; left: number }[] = [];
    for (let at = el.parentElement; at !== null && at !== document.documentElement; at = at.parentElement) {
        const cs = getComputedStyle(at);
        const scrolls =
            (/(auto|scroll)/.test(cs.overflowY) && at.scrollHeight > at.clientHeight) ||
            (/(auto|scroll)/.test(cs.overflowX) && at.scrollWidth > at.clientWidth);
        if (scrolls || at.scrollTop !== 0 || at.scrollLeft !== 0) out.push({ at: describe(at), top: at.scrollTop, left: at.scrollLeft });
    }
    const page = document.scrollingElement;
    if (page !== null && (page.scrollTop !== 0 || page.scrollLeft !== 0)) out.push({ at: 'the document', top: page.scrollTop, left: page.scrollLeft });
    return out;
}

/**
 * The codes the quiet-zone read and 1d read: every `svg.qr` in the last
 * prepare's scope, the door's deck aside, visible. `__quietZones` and
 * `__codeMatrices` both walk `codeZones` over this list, so the runner pairs
 * a code's zone with its matrix by place, and holds the names equal.
 */
function paintedCodes(): SVGSVGElement[] {
    return [...(preparedScope ?? document).querySelectorAll<SVGSVGElement>('svg.qr')].filter(
        (svg) => svg.closest('.deck-stall') === null && getComputedStyle(svg).visibility === 'visible',
    );
}

function quietZoneOf(svg: SVGSVGElement): QuietZone | undefined {
    const r = svg.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return undefined;
    const cs = getComputedStyle(svg);
    const px = (v: string): number => Number.parseFloat(v) || 0;
    const left = px(cs.borderLeftWidth) + px(cs.paddingLeft);
    const top = px(cs.borderTopWidth) + px(cs.paddingTop);
    const cw = r.width - left - px(cs.borderRightWidth) - px(cs.paddingRight);
    const ch = r.height - top - px(cs.borderBottomWidth) - px(cs.paddingBottom);
    const side = Math.min(cw, ch);
    const vb = svg.viewBox.baseVal.width;
    if (!(side > 0) || !(vb > 0)) return undefined;
    // The element's own radius cuts its corners at the border box;
    // what it leaves of the content box's corner is the radius past
    // the inset. Measured on the smallest of the four corners' insets.
    const radius = px(cs.borderTopLeftRadius);
    const inset = Math.min(left, top, r.width - left - cw, r.height - top - ch);
    let x0 = -Infinity;
    let y0 = -Infinity;
    let x1 = Infinity;
    let y1 = Infinity;
    for (let at = svg.parentElement; at !== null && at !== document.documentElement; at = at.parentElement) {
        const c = clipOf(at);
        if (c === undefined) continue;
        x0 = Math.max(x0, c.x0);
        x1 = Math.min(x1, c.x1);
        y0 = Math.max(y0, c.y0);
        y1 = Math.min(y1, c.y1);
    }
    return {
        name: codeName(svg),
        x: r.x + left + (cw - side) / 2,
        y: r.y + top + (ch - side) / 2,
        side,
        module: side / vb,
        corner: Math.max(0, radius - inset),
        // Finite, because the runner reads this through JSON, where
        // an infinity is `null` — and a null clip is a clip at 0,
        // which read every unclipped code as wholly clipped away.
        clip: { x0: Math.max(x0, -1e9), y0: Math.max(y0, -1e9), x1: Math.min(x1, 1e9), y1: Math.min(y1, 1e9) },
        turned: angleOf(svg) !== 0,
        scrolled: scrolledAbove(svg),
    };
}

/** Every painted code with the zone its ring is read from (`paintedCodes`, `quietZoneOf`). */
function codeZones(): { svg: SVGSVGElement; zone: QuietZone }[] {
    return paintedCodes().flatMap((svg) => {
        const zone = quietZoneOf(svg);
        return zone === undefined ? [] : [{ svg, zone }];
    });
}

window.__quietZones = () => codeZones().map(({ zone }) => zone);

/**
 * **1d: the matrix each code was drawn from** (before 8g2, 1d, bound since 7c;
 * `layout/codeMatrix.ts`). One entry per zone `__quietZones` answers, in its
 * order and with its name: the matrix `qrSvg` wrote into the path's `d`
 * attribute from `qrMatrix(text)` — never read off the pixels 1d then reads
 * — or why it cannot be read, which 1d says and fails closed on (a failure
 * since 7c). Where the DOM carries the code's text (the touch wall's plate,
 * `data-pay-uri`), the attribute's matrix is also held to `qrMatrix` of that
 * text (`payload: 'checked'`), and a code that does not encode it is a
 * fault.
 */
window.__codeMatrices = () =>
    codeZones().map(({ svg, zone }): CodeMatrixRead => {
        const path = svg.querySelector(':scope > path');
        if (path === null) return { name: zone.name, fault: 'it has no path, so the matrix it was drawn from cannot be read' };
        const read = matrixOfPath(path.getAttribute('d') ?? '', svg.getAttribute('viewBox') ?? '', QR_SVG_QUIET_MODULES);
        if ('fault' in read) return { name: zone.name, fault: read.fault };
        const payload = svg.parentElement?.closest('[data-pay-uri]')?.getAttribute('data-pay-uri');
        if (payload === undefined || payload === null) return { name: zone.name, ...read };
        let want: string;
        try {
            want = matrixBits(qrMatrix(payload));
        } catch (err) {
            return { name: zone.name, fault: `the text its plate carries does not make a code (${(err as Error).message.slice(0, 60)})` };
        }
        if (want !== read.bits) return { name: zone.name, fault: 'its path is not the matrix qrMatrix makes of the text its plate carries (data-pay-uri)' };
        return { name: zone.name, ...read, payload: 'checked' };
    });

/**
 * **1d's cut held to this Chrome** (`the-module-read-agrees-with-this-chrome`;
 * `MODULE_SNAP_SIZES` and `MODULE_SNAP_OFFSETS` in `layout/codeMatrix.ts`,
 * `moduleSnapVerdict` in `scripts/code-modules.mjs`). On, it draws a sheet of
 * codes with the app's own `qrSvg` over the page — a white ground fixed to
 * the viewport at the top of the stacking order, each code in a box of its
 * size at its offset — and
 * makes the sheet the prepared scope, so `__quietZones` and `__codeMatrices`
 * answer for its codes alone, read exactly as a job's are; the runner then
 * captures the page as it captures a job. Off, it takes the sheet away and
 * puts the scope back. It answers how many codes it drew, how far down the
 * sheet reaches (the runner refuses a sheet taller than its viewport) and
 * its width.
 */
let moduleSnapScope: { sheet: HTMLElement; scope: ParentNode | undefined } | undefined;
window.__moduleSnap = (on: boolean) => {
    if (!on) {
        if (moduleSnapScope !== undefined) {
            moduleSnapScope.sheet.remove();
            preparedScope = moduleSnapScope.scope;
            moduleSnapScope = undefined;
        }
        return { codes: 0, bottom: 0, width: 0 };
    }
    const width = window.innerWidth;
    const sheet = document.createElement('div');
    sheet.id = 'module-snap';
    // Fixed to the viewport, so a document scrolled by an earlier paint cannot carry a code off the capture.
    for (const [p, v] of Object.entries({ position: 'fixed', left: '0', top: '0', 'z-index': '2147483647', background: '#ffffff', width: `${width}px`, margin: '0', padding: '0' })) {
        sheet.style.setProperty(p, v, 'important');
    }
    const GAP = 8;
    let x = GAP;
    let y = GAP;
    let rowBottom = y;
    let i = 0;
    for (const m of MODULE_SNAP_SIZES) {
        MODULE_SNAP_OFFSETS.forEach((ox, j) => {
            const svg = qrSvg(moduleSnapText(i), 'module snap');
            const side = svg.viewBox.baseVal.width * m;
            if (x + side + 1 > width - GAP) {
                x = GAP;
                y = rowBottom + GAP;
            }
            // The offset down is another of the offsets than the one across, so x and y meet every rounding apart.
            const oy = MODULE_SNAP_OFFSETS[(j * 3 + 2) % MODULE_SNAP_OFFSETS.length]!;
            const box = document.createElement('div');
            box.className = 'module-snap-code';
            for (const [p, v] of Object.entries({ position: 'absolute', left: `${x + ox}px`, top: `${y + oy}px`, width: `${side}px`, margin: '0', padding: '0' })) {
                box.style.setProperty(p, v, 'important');
            }
            box.append(svg);
            sheet.append(box);
            rowBottom = Math.max(rowBottom, y + oy + side + 1);
            x += Math.ceil(side) + GAP + 1;
            i += 1;
        });
    }
    sheet.style.setProperty('height', `${Math.ceil(rowBottom + GAP)}px`, 'important');
    document.body.append(sheet);
    moduleSnapScope = { sheet, scope: preparedScope };
    preparedScope = sheet;
    return { codes: i, bottom: Math.ceil(rowBottom + GAP), width };
};

/**
 * How the sign's name was painted when it was read (step 5a″, D14): each
 * animation on a `.stall-name` or inside it, at the instant the pass froze
 * it, and the name's computed opacity there — Neo's `neo-flick` dims the
 * whole name by opacity, and the hum's lamp dims one letter. Reported, so a
 * green over the name says which instant it was.
 */
function nameChrome(scope: ParentNode): string[] {
    const out = new Set<string>();
    for (const name of scope.querySelectorAll<HTMLElement>('.stall-name')) {
        if (name.closest('.deck-stall') !== null) continue;
        for (const el of [name, ...name.querySelectorAll<HTMLElement>('*')]) {
            for (const a of el.getAnimations()) {
                const label = a instanceof CSSAnimation ? a.animationName : 'animation';
                out.add(`${el === name ? 'name' : describe(el)} ${label} at ${Math.round(Number(a.currentTime ?? 0))}ms (${a.playState})`);
            }
        }
        out.add(`name opacity ${getComputedStyle(name).opacity}`);
    }
    return [...out].sort();
}

window.__opaqueBoxes = () =>
    [...document.querySelectorAll('.plate, .qr')].map((node) => {
        const box = node.getBoundingClientRect();
        return { x: box.x, y: box.y, w: box.width, h: box.height };
    });

/**
 * The screen painted before a job's first paint (step 3a, the step-3
 * critic's P1): no marquee, no ticker, no sheet. `renderStall` keeps state
 * from one paint to the next on purpose — the scroll offset of "the same
 * screen" (`screenKey` ignores the look), whether a sheet or a face was
 * already open (which decides where focus lands), the marquee's runs — so
 * without it every job was measured after whichever job the loop happened
 * to run before it. `looks-diff.mjs` paints the same screen for the same
 * reason.
 */
const NEUTRAL_SCREEN = 'invalid';

/**
 * Freeze motion at one instant so a streak is on screen, not between frames:
 * every animation paused 400 ms into its ACTIVE phase. The delay is zeroed
 * first, because a marquee and the ticker continue a run across repaints
 * through a negative delay equal to the wall-clock time since the run began —
 * paused at `currentTime = 400` with it, the frozen instant was a different
 * one on every run. Asked again after `document.fonts.ready`, which is when
 * the marquee measures a second time and may arm a line the first measure
 * did not.
 */
function freezeAnimations(): void {
    for (const a of document.getAnimations()) {
        a.pause();
        try {
            a.effect?.updateTiming({ delay: 0 });
        } catch {
            // Not ours to time.
        }
        try {
            a.currentTime = 400;
        } catch {
            // A finished animation holds still on its own.
        }
    }
}
window.__contrastFreeze = freezeAnimations;

/*
 * **A line on the ground reads wherever a drop falls** (2026-09-24, the
 * critic's P1 on the visible batch; `PROBE-RULES.md`). Neo's rain
 * (`att-rainfall`) is three tiled sheets of drops drifting down the stall's
 * own ground every 2.6 s, so a line with no card of its own under it is
 * crossed by a drop within one drift. The pass freezes every animation at
 * one instant (`freezeAnimations`), so what it read depended on where the
 * drops happened to be then: a green was luck, and one more Activity row
 * moved a receipt amount onto a drop and read 2.7:1.
 *
 * So in a contrast job, every stall wearing the rain has its three drop
 * sheets replaced by ONE flat layer of the brightest drop the art draws —
 * every pixel of the ground as a drop is at its worst — in the first
 * sheet's place in the stack, and every other layer kept where it was: the
 * backdrop behind, and with the aurora its glows behind and its tint in
 * front (they are the same element's layers). **The colour and opacity are
 * read from the art, not stated**: every `stroke` with its `stroke-opacity`
 * in `rain-near.svg`, `rain-mid.svg` and `rain-far.svg` is composited over
 * the stall's computed `background-color` (`--s-bg`), and the one that comes
 * out lightest wins — Neo's ink is light, so the lightest paint is the worst
 * ground. Today that is the near sheet's cyan `#2ce9e0` at 0.68. Two drops
 * crossing are brighter still and are not modelled: the strokes are 1.6px
 * wide, and a crossing is a point.
 *
 * The prepare reports how many stalls wore the rain and how many it
 * flattened, the runner refuses a job where the two differ, and the pass
 * owes at least one flattened job on the shipped looks.
 */
const RAIN_SHEETS = [rainNearSvg, rainMidSvg, rainFarSvg];

/** The drop derivation is `layout/rainDrop.ts`'s, held to the art by its own test. */
function brightestDropOn(ground: string): Drop | undefined {
    const bg = parseRgb(ground);
    return bg === undefined ? undefined : brightestDrop(RAIN_SHEETS, bg);
}

function parseRgb(value: string): [number, number, number] | undefined {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(value);
    return m === null ? undefined : [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** A comma-separated CSS list split at its top-level commas (a gradient's own commas stay inside). */
function splitLayers(value: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < value.length; i += 1) {
        const c = value[i];
        if (c === '(') {
            depth += 1;
        } else if (c === ')') {
            depth -= 1;
        } else if (c === ',' && depth === 0) {
            out.push(value.slice(start, i));
            start = i + 1;
        }
    }
    out.push(value.slice(start));
    return out.map((x) => x.trim());
}

/**
 * Every rain-wearing stall's drop sheets as one flat layer of the brightest
 * drop; how many wore it and how many were flattened. The door's deck minis
 * are skipped and not counted (the critic's third pass, 2026-09-24): they are
 * pictures, aria-hidden, with no line this pass samples, and the Neo mini
 * counted made "flattened on at least one job" true on the door alone.
 */
function rainAtItsBrightest(): { worn: number; flattened: number } {
    let worn = 0;
    let flattened = 0;
    for (const stall of document.querySelectorAll<HTMLElement>('#app .stall.att-rainfall:not(.deck-stall)')) {
        worn += 1;
        const cs = getComputedStyle(stall);
        const drop = brightestDropOn(cs.backgroundColor);
        const layers = splitLayers(cs.backgroundImage);
        const isSheet = (layer: string): boolean => /^url\("?[^")]*rain-(?:near|mid|far)[^")]*"?\)$/.test(layer);
        const first = layers.findIndex(isSheet);
        if (drop === undefined || first < 0 || layers.filter(isSheet).length !== RAIN_SHEETS.length) {
            continue;
        }
        const paint = `rgba(${drop.rgb.join(', ')}, ${drop.alpha})`;
        // Each longhand list keeps every other layer's own entry; the flat
        // layer takes the first sheet's place and covers the box.
        const rebuild = (list: string[], flatEntry: string): string =>
            layers
                .flatMap((layer, i) => (!isSheet(layer) ? [list[i % list.length]!] : i === first ? [flatEntry] : []))
                .join(', ');
        const sizes = splitLayers(cs.backgroundSize);
        const repeats = splitLayers(cs.backgroundRepeat);
        const positions = splitLayers(cs.backgroundPosition);
        // Important, and the animation left alone: an important declaration
        // outranks the drift's animated `background-position` (which would
        // slide the flat layer off the top of the box), while the aurora's
        // own layers keep the positions the freeze read them at.
        const set = (prop: string, value: string): void => stall.style.setProperty(prop, value, 'important');
        set('background-image', rebuild(layers, `linear-gradient(${paint}, ${paint})`));
        set('background-size', rebuild(sizes, '100% 100%'));
        set('background-repeat', rebuild(repeats, 'no-repeat'));
        set('background-position', rebuild(positions, '0% 0%'));
        // And the aurora at its worst for that drop: the tide at 1 puts the
        // most cyan in the wash the drop is the same colour as, and the
        // freeze read it near 0 (the critic's third pass: over the flat drop
        // at the cyan corner, Neo's ink read 2.62:1 at the frozen tide and
        // 2.07:1 at 1). Harmless where the aurora is not worn: nothing else
        // reads the property.
        set('--au-tide', '1');
        flattened += 1;
    }
    return { worn, flattened };
}

/**
 * **Grid horizon at its worst — a report, not a fail** (step 5a″, the
 * critic's item 1; the owner's C, 2026-09-27). The horizon draws its
 * skyline's lit windows and its stars on the sign behind the seller's name
 * and tagline; which of them fall under a ring pixel of an outlined line
 * depends on the seller's own words, so a read of the art as painted is a
 * read of one name. The contrast job reads the sign as painted, and the
 * ring read there fails as everywhere; then, for the report, every sign
 * wearing it (`__horizonAtItsWorst(true)`) has its skyline and star sheets (`horizon-sky-left`, `-right`, `-fill`,
 * `-stars`) replaced by ONE flat layer of the brightest paint those sheets
 * — over the sky band only, from the sign's top to the line (or the stars'
 * foot, if lower), where the art is drawn —
 * draw, over the colour the sign's outline is written in — read from the
 * art through an allow-list (`layout/horizonArt.ts`), today the stars'
 * `#e8fbff` at 0.79 — in the first sheet's place, every other layer kept:
 * the line, the floor, the haze, the sky wash, and the moon, which this
 * reading does not model (a mask and a gradient) and which stands in the
 * pin's gutter, clear of the name, and is not drawn without a pin. Important
 * longhands, like the rain's, taken off again after (`false`). The runner
 * ring-reads the sign's outlined lines on that frame and holds the least to
 * a pinned baseline — a regression guard, not a floor (`HORIZON_WORST`).
 */
const HORIZON_SHEETS = [horizonLeftSvg, horizonRightSvg, horizonFillSvg, horizonStarsSvg];

function horizonAtItsWorst(): { worn: number; flattened: number } {
    let worn = 0;
    let flattened = 0;
    for (const sign of document.querySelectorAll<HTMLElement>('#app .stall.att-horizon:not(.deck-stall) .stall-sign')) {
        worn += 1;
        const cs = getComputedStyle(sign);
        // The colour the sign's outline is written in, resolved: a custom
        // property computes to its tokens, so it is read through a colour.
        const probe = document.createElement('span');
        probe.style.color = 'var(--rain-outline-ground)';
        sign.append(probe);
        const ground = colourOf(getComputedStyle(probe).color);
        probe.remove();
        const art = ground === undefined ? undefined : brightestArt(HORIZON_SHEETS, ground.rgb);
        const layers = splitLayers(cs.backgroundImage);
        const isSheet = isHorizonSheet;
        const first = layers.findIndex(isSheet);
        // Any picture on the sign that is neither one of the four sheets nor
        // the moon is art this reading has not read: refused, never flattened
        // around (`signLayersRead`, the critic's step 5a″ item 2).
        if (art === undefined || first < 0 || !signLayersRead(layers)) continue;
        // The sky band, never the whole sign (the critic, step 5a″ item 5):
        // the skyline stands with its foot on the line at 52% of the sign and
        // the stars hang from its top, 4px down and 60px tall, both times the
        // decoration scale — the art is drawn nowhere below the band.
        const scale = Number.parseFloat(cs.getPropertyValue('--s-decor-scale')) || 1;
        const band = Math.max(0.52 * sign.getBoundingClientRect().height, 64 * scale);
        const paint = `rgba(${art.rgb.join(', ')}, ${art.alpha})`;
        const rebuild = (list: string[], flatEntry: string): string =>
            layers
                .flatMap((layer, i) => (!isSheet(layer) ? [list[i % list.length]!] : i === first ? [flatEntry] : []))
                .join(', ');
        const set = (prop: string, value: string): void => sign.style.setProperty(prop, value, 'important');
        set('background-image', rebuild(layers, `linear-gradient(${paint}, ${paint})`));
        set('background-size', rebuild(splitLayers(cs.backgroundSize), `100% ${band}px`));
        set('background-repeat', rebuild(splitLayers(cs.backgroundRepeat), 'no-repeat'));
        set('background-position', rebuild(splitLayers(cs.backgroundPosition), '0px 0px'));
        flattened += 1;
    }
    return { worn, flattened };
}

const FLATTENED = ['background-image', 'background-size', 'background-repeat', 'background-position'];

window.__horizonAtItsWorst = async (on: boolean) => {
    let out = { worn: 0, flattened: 0 };
    if (on) {
        out = horizonAtItsWorst();
    } else {
        for (const sign of document.querySelectorAll<HTMLElement>('#app .stall.att-horizon:not(.deck-stall) .stall-sign')) {
            out.worn += 1;
            for (const prop of FLATTENED) sign.style.removeProperty(prop);
        }
    }
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return out;
};

/**
 * The aurora at one end of its tide (`TIDE_SCREENS` in `contrastPlan.ts`):
 * every stall wearing it — the deck's minis aside — has `--au-tide` held at
 * `tide`, important, so the tide's own animation cannot move it (an
 * important declaration outranks an animation, the rain flattening's own
 * reason). How many wore it and how many were held; nothing is held when no
 * tide was asked for.
 */
function auroraTideAt(tide: 0 | 1 | undefined): { worn: number; held: number } {
    let worn = 0;
    let held = 0;
    for (const stall of document.querySelectorAll<HTMLElement>('#app .stall.att-aurora:not(.deck-stall)')) {
        worn += 1;
        if (tide === undefined) continue;
        stall.style.setProperty('--au-tide', String(tide), 'important');
        held += 1;
    }
    return { worn, held };
}

/**
 * The viewport height at which nothing a reader scrolls to is behind its
 * clip: the document's own height, and — for the two surfaces a reader
 * scrolls inside, the shell's region and an open sheet — the viewport plus
 * what that surface hides, scaled by how much of each pixel of viewport the
 * surface is given.
 *
 * It asked for the region's `scrollHeight` as a page height (2026-09-24),
 * which leaves the dock's own height of the region still hidden once the
 * viewport grows to it — the region is the viewport less the dock — and
 * asked nothing of a sheet at all. Neither showed while this page's verdict
 * `<pre>` sat in the flow under the app: its 313px grew every shot past
 * both (`PROBE-RULES.md`, "Shot at the real height").
 *
 * A surface that is not the reader's to scroll is not asked: the wall's
 * region is `overflow: hidden` (its list scrolls itself, and the wall is
 * shot at its screen's size because its layout reads the frame's shape),
 * and so is the shell's region behind an open sheet.
 */
function pageHeight(scope: ParentNode): number {
    const vh = window.innerHeight;
    let need = document.documentElement.scrollHeight;
    const surfaces = [document.querySelector<HTMLElement>('.stall-scroll')];
    if (scope !== document) {
        surfaces.push(...scope.querySelectorAll<HTMLElement>('.sheet'));
    }
    for (const surface of surfaces) {
        if (surface === null) continue;
        const cs = getComputedStyle(surface);
        if (cs.overflowY !== 'auto' && cs.overflowY !== 'scroll') continue;
        const hidden = surface.scrollHeight - surface.clientHeight;
        if (hidden <= 0) continue;
        // A sheet is capped at a share of the viewport (`max-height: 92vh`,
        // 86vh at desk width), so a pixel of viewport buys it less than a
        // pixel; the region takes whatever the dock leaves, all of it.
        const cap = Number.parseFloat(cs.maxHeight);
        const capped = Number.isFinite(cap) && surface.offsetHeight >= cap - 0.5;
        const share = capped ? Math.min(1, cap / vh) : 1;
        need = Math.max(need, vh + Math.ceil(hidden / share));
    }
    return need;
}


/*
 * **No look pseudo paints inside a protected box** (D6(i), step 5b;
 * `PROBE-RULES.md`). A pseudo-element has no box the DOM hands back, so the
 * geometry passes refuse a positioned one outright and cannot see where an
 * in-flow one paints — a `position: relative` with offsets, or a negative
 * margin, can put its paint over a money figure while every box the probe
 * reads stands clear. So it is measured the only way a pseudo can be: by
 * its paint. A **look pseudo** is a `::before` or `::after` a look sheet or
 * a decoration rule generates — a rule whose selector names a look's class
 * (`t-…`) or a decoration's (`att-…`) anywhere in it, a compound included
 * (`lookPseudoOf`, `layout/lookRule.ts`; round 8, the critic's PSc:
 * `.stall.t-modern …::after` was the app's to this read until then); the
 * base sheet's own pseudos are the app's chrome, held by the geometry rules
 * like any node. Every element in
 * the contrast job's scope that generates one is marked here
 * (`data-probe-lp-before` / `-after`); the runner captures the frame once
 * more with every marked pseudo at `visibility: hidden`
 * (`__lookPseudosHidden`) and compares the two frames inside every
 * protected box (`__protectedBoxes`), a device pixel in from each edge: a
 * pixel that changed is a look pseudo painting inside a protected box, and
 * the job fails. No capture where no look pseudo exists.
 */

/** Every rule in every sheet on the page, `@media` and other groups opened. */
function styleRules(): CSSStyleRule[] {
    const out: CSSStyleRule[] = [];
    const walk = (list: CSSRuleList): void => {
        for (const rule of list) {
            if (rule instanceof CSSStyleRule) {
                out.push(rule);
            } else if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules !== undefined) {
                walk((rule as CSSGroupingRule).cssRules);
            }
        }
    };
    for (const sheet of document.styleSheets) {
        try {
            walk(sheet.cssRules);
        } catch {
            throw new Error(`a sheet the probe cannot read: ${sheet.href ?? '(inline)'}`);
        }
    }
    return out;
}

/**
 * The look pseudos generated in `scope`, marked; how many.
 *
 * **The scope is a host too** (before 8g2, item 4): an open sheet's scope is
 * its scrim, and `querySelectorAll` answers descendants alone, so a look's
 * `::before` or `::after` of the scrim moved over the sheet's figure was
 * never marked, never hidden in the look-paint frame, and
 * `no-look-pseudo-paints-inside-a-protected-box` read it as nothing. The
 * scope's ancestors stay unmarked, stated — the scrim is a child of the
 * stall, so a look's pseudo of the stall moved over the sheet's figure (the
 * critic's T6) is never hidden in the look-paint frame. What reads one is a
 * hit test, where a pseudo answers as its host and an ancestor counts as
 * covering: `coveredBy`, bound, on the price, "You pay" and the unbuyable
 * label alone, and only where the pseudo takes a hit (`pointer-events:
 * none` reads through it); and 1a (`nothing-covers-money-or-a-protected-
 * box`), bound since 7a, with `pointer-events` forced on, on every money
 * node, protected box and unbuyable label. T6, with `pointer-events: none`
 * over the pay sheet's figure, passed every geometry rule bound before 7a at
 * 390 (1a then read it as 39 failures).
 */
function markLookPseudos(scope: ParentNode): number {
    for (const el of document.querySelectorAll('[data-probe-lp-before], [data-probe-lp-after]')) {
        el.removeAttribute('data-probe-lp-before');
        el.removeAttribute('data-probe-lp-after');
    }
    let n = 0;
    for (const rule of styleRules()) {
        for (const one of selectorList(rule.selectorText)) {
            const look = lookPseudoOf(one);
            if (look === undefined) continue;
            const { which, host } = look;
            let hosts: Element[];
            try {
                hosts = [...(scope instanceof Element && scope.matches(host) ? [scope] : []), ...scope.querySelectorAll(host)];
            } catch {
                throw new Error(`a look pseudo's selector the probe cannot match: ${one}`);
            }
            for (const el of hosts) {
                if (el.closest('.deck-stall') !== null) continue;
                const content = getComputedStyle(el, `::${which}`).content;
                if (content === 'none' || content === 'normal') continue;
                if (!el.hasAttribute(`data-probe-lp-${which}`)) {
                    el.setAttribute(`data-probe-lp-${which}`, '');
                    n += 1;
                }
            }
        }
    }
    return n;
}

/*
 * **Text no target reads** (step 5b; SAMPLER-STEP-PLAN v2 item 9): every
 * visible, non-aria-hidden text node in the job's scope whose element is in
 * no contrast target, described once per element kind. A report, printed
 * on the pass's line whatever the verdict — the list the next target is
 * chosen from, and the answer to "what did the pass not read" — never a
 * failure: most of it is text on a card every look was proved on.
 */
function uncoveredText(scope: ParentNode): string[] {
    const out = new Set<string>();
    const root = scope === document ? document.getElementById('app')! : (scope as Element);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
        const owner = text.parentElement;
        if (owner === null || (text.textContent ?? '').trim() === '') continue;
        if (owner.closest('.deck-stall, svg, [aria-hidden="true"], #layout-result') !== null) continue;
        if (owner.closest(CONTRAST) !== null) continue;
        if (getComputedStyle(owner).visibility !== 'visible') continue;
        range.selectNodeContents(text);
        if ([...range.getClientRects()].every((r) => r.width === 0 || r.height === 0)) continue;
        out.add(describe(owner));
    }
    return [...out];
}

let lookPaintSheetAdopted = false;

/*
 * **No look mark paints inside a protected box**
 * (`no-look-mark-paints-inside-a-protected-box`, step 8f2; STEP-8-PLAN §5).
 * A mark (`lookMark`, `src/ui/lookHooks.ts`) a look shows is an in-flow
 * node: a negative margin or a relative offset moves its paint over a
 * figure while every box the geometry passes read stands clear, and with
 * `pointer-events: none` the hit test reads straight through it — and it is
 * no `att-` decoration, so the box sweep never asks it. So it is measured
 * the look pseudos' way (D6(i)): every mark the job's scope shows is
 * counted here (`shownLookMarks`), and the runner compares a frame with
 * them shown against one with every mark at `visibility: hidden` inside
 * every protected box. One frame hides the look pseudos and the marks
 * together, where a job has both; only a frame that moved is captured again
 * with each hidden alone, to say which painted there.
 */
/* Descendants alone (`querySelectorAll`), stated: a mark is an empty leaf,
 * so neither an open sheet's scrim (the scope) nor a box above it is one. */
function shownLookMarks(scope: ParentNode): number {
    let n = 0;
    for (const mark of scope.querySelectorAll('[data-look-mark]')) {
        if (mark.closest('.deck-stall') !== null) continue;
        if (getComputedStyle(mark).display !== 'none') n += 1;
    }
    return n;
}

/** Hide (or show again) the look pseudos the last prepare marked, the marks, both or neither; how many of each. */
window.__lookPaintHidden = async (which: 'none' | 'pseudos' | 'marks' | 'both') => {
    if (!lookPaintSheetAdopted) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(
            'html[data-probe-lp-off] [data-probe-lp-before]::before,html[data-probe-lp-off] [data-probe-lp-after]::after{visibility:hidden!important}' +
                'html[data-probe-lm-off] [data-look-mark]{visibility:hidden!important}',
        );
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        lookPaintSheetAdopted = true;
    }
    document.documentElement.toggleAttribute('data-probe-lp-off', which === 'pseudos' || which === 'both');
    document.documentElement.toggleAttribute('data-probe-lm-off', which === 'marks' || which === 'both');
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return {
        pseudos: document.querySelectorAll('[data-probe-lp-before], [data-probe-lp-after]').length,
        marks: shownLookMarks(preparedScope ?? document),
    };
};

/*
 * **A word reads when the art does not load**
 * (`a-word-reads-when-the-art-does-not-load`, step 8f2; the step-8 critic's
 * item 11, owner question 2, and the 8f2 critic's P1-2). A file can always
 * be late or fail — a slow line, a tab older than a deploy — and what a box
 * masked or clipped by a file paints then is not what the spec's sentence
 * suggests but what the engines do, measured (Chrome 154 here, the system
 * WebKit by the critic; alike on masks, not on a file `clip-path`, which
 * WebKit never applies, loaded or not — it draws the box unclipped, which
 * the failed frame's `none` already reads):
 * - **pending** — while a mask image, a mask border image or (in Chrome) a
 *   `clip-path` file is loading, the box paints NOTHING, whatever its other
 *   layers;
 * - **failed** — once the load failed (a 404, or a 200 HTML answer, a
 *   preview's or an SPA fallback's), each failed mask layer is SKIPPED and
 *   the others stand (one failed layer alone: nothing); a failed mask border
 *   hides the whole box; a failed `clip-path` is as if none were given.
 * `no-word-is-clipped-by-a-file` keeps a file's mask off every box with
 * words, but a ground under words drawn by a masked layer or box is still
 * the art's, and with it gone the words stand on whatever is left. So every
 * element and every `::before`/`::after` in the job's scope whose computed
 * mask image, mask border source or `clip-path` names a file is marked here
 * (`markFileArt`: the masking rules found in the CSSOM by their longhands
 * and their shorthands, their hosts matched, each read computed), and the
 * runner reads every target again — a line by its line rects, money whole,
 * an outlined line in its ring — on the **pending** frame (each such box at
 * `opacity: 0`), and on the **failed** frame where it differs: where a mask
 * stack mixes file and other layers (the file layers turned to a transparent
 * layer composited `add` — skipped — the rest kept) or a `clip-path` names a
 * file (`none`); a failed mask border hides the box there too. Every target
 * must clear the floor in both. Asked only where file art is painted (no
 * shipped look paints any; the tracked fixture does, a mixed stack);
 * `fileArt` and `fileArtMixed` say how much. Partial failure — one file of
 * several failing — is not modelled, stated. Proved red by a subtracted
 * file layer whose failure leaves an ink ground under ink words (failed),
 * a file layer added to a ground under words in the ground's colour
 * (pending), and a mask-border ground (`PROBE-RULES.md`).
 */
const ART_PROPS = ['mask-image', '-webkit-mask-image', 'mask-border-source', '-webkit-mask-box-image-source', 'clip-path'] as const;
/** A skipped mask layer: an image of transparent black, composited `add` so it adds nothing. */
const SKIPPED_LAYER = 'linear-gradient(transparent, transparent)';
/** The shorthands a masking rule may be written with. */
const ART_SHORTHANDS = ['mask', '-webkit-mask', 'mask-border', '-webkit-mask-box-image'] as const;
/** The legacy compositing keywords and the standard ones they name (`MASK_COMPOSITE_LEGACY` in the look rules). */
const STANDARD_COMPOSITE: Readonly<Record<string, string>> = { 'source-over': 'add', 'source-out': 'subtract', 'source-in': 'intersect', xor: 'exclude' };
const LEGACY_COMPOSITE: Readonly<Record<string, string>> = { add: 'source-over', subtract: 'source-out', intersect: 'source-in', exclude: 'xor' };
const ART_ATTR = /^data-probe-art(?:-before|-after)?$/;
let artSheet: CSSStyleSheet | undefined;

/** A computed comma list split at its top-level commas (`selectorList`, `layout/lookRule.ts`). */
const layersOf = (value: string): string[] => selectorList(value);

/**
 * Mark every box and pseudo in `scope` whose art names a file, and write the
 * sheet that paints its two states; how many boxes, and how many whose
 * failed state differs from its pending one. The hosts are the scope's
 * descendants alone (`querySelectorAll`), stated: an open sheet's scope is
 * its scrim, so a file mask or clip on the scrim itself, or on the stall
 * above it, is not switched off in the pending and failed frames
 * (`markLookPseudos` takes its scope as a host; this does not).
 */
function markFileArt(scope: ParentNode): { boxes: number; mixed: number } {
    for (const el of document.querySelectorAll('[data-probe-art], [data-probe-art-before], [data-probe-art-after]')) {
        for (const attr of [...el.attributes].map((a) => a.name).filter((name) => ART_ATTR.test(name))) {
            el.removeAttribute(attr);
        }
    }
    const rules: string[] = [];
    const seen = new Set<string>();
    let mixed = 0;
    for (const rule of styleRules()) {
        // A shorthand holding a `var()` leaves its longhands empty in the
        // rule, so the shorthands are asked too; what the host computes is
        // what is read below.
        if (![...ART_PROPS, ...ART_SHORTHANDS].some((prop) => rule.style.getPropertyValue(prop).trim() !== '')) continue;
        for (const one of selectorList(rule.selectorText)) {
            const pseudo = PSEUDO_AT.exec(one);
            const host = one.replace(/::?(?:before|after)\b/g, '').trim() || '*';
            let hosts: NodeListOf<Element>;
            try {
                hosts = scope.querySelectorAll(host);
            } catch {
                throw new Error(`a masking rule's selector the probe cannot match: ${one}`);
            }
            for (const el of hosts) {
                if (el.closest('.deck-stall') !== null) continue;
                const which = pseudo === null ? undefined : (pseudo[1] as 'before' | 'after');
                const cs = getComputedStyle(el, which === undefined ? null : `::${which}`);
                if (which !== undefined && (cs.content === 'none' || cs.content === 'normal')) continue;
                const images = layersOf(cs.getPropertyValue('mask-image'));
                const fileLayers = images.map((layer) => fileNamedBy(layer) !== undefined);
                const border = ['mask-border-source', '-webkit-mask-box-image-source'].some((prop) => fileNamedBy(cs.getPropertyValue(prop)) !== undefined);
                const clip = fileNamedBy(cs.clipPath) !== undefined;
                if (!fileLayers.includes(true) && !border && !clip) continue;
                const attr = which === undefined ? 'data-probe-art' : `data-probe-art-${which}`;
                let id = el.getAttribute(attr);
                if (id === null) {
                    id = String(seen.size);
                    el.setAttribute(attr, id);
                }
                if (seen.has(`${which ?? ''}/${id}`)) continue;
                seen.add(`${which ?? ''}/${id}`);
                const at = `[${attr}="${id}"]${which === undefined ? '' : `::${which}`}`;
                // Pending: the box paints nothing.
                rules.push(`html[data-probe-art-off="pending"] ${at}{opacity:0!important}`);
                // Failed: each file layer skipped, a file mask border hides the box, a file clip is none.
                const failed: string[] = [];
                const others = fileLayers.some((file, i) => !file && images[i] !== 'none');
                if (border || (fileLayers.includes(true) && !others)) {
                    failed.push('opacity:0!important');
                } else if (fileLayers.includes(true)) {
                    const composites = layersOf(cs.getPropertyValue('mask-composite'));
                    const standard = images.map((_, i) => {
                        const c = composites[i % Math.max(1, composites.length)] ?? 'add';
                        return fileLayers[i] ? 'add' : (STANDARD_COMPOSITE[c] ?? c);
                    });
                    const layers = images.map((layer, i) => (fileLayers[i] ? SKIPPED_LAYER : layer)).join(',');
                    failed.push(
                        `-webkit-mask-image:${layers}!important`,
                        `mask-image:${layers}!important`,
                        `-webkit-mask-composite:${standard.map((c) => LEGACY_COMPOSITE[c] ?? c).join(',')}!important`,
                        `mask-composite:${standard.join(',')}!important`,
                    );
                }
                if (clip) failed.push('clip-path:none!important');
                if (others || clip) mixed += 1;
                rules.push(`html[data-probe-art-off="failed"] ${at}{${failed.join(';')}}`);
            }
        }
    }
    artSheet ??= (() => {
        const sheet = new CSSStyleSheet();
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        return sheet;
    })();
    artSheet.replaceSync(rules.join('\n'));
    return { boxes: seen.size, mixed };
}

/** Paint the file art the last prepare marked as pending, as failed, or as loaded again; how many boxes are marked. */
window.__artOff = async (state: 'pending' | 'failed' | 'off') => {
    if (state === 'off') {
        document.documentElement.removeAttribute('data-probe-art-off');
    } else {
        document.documentElement.setAttribute('data-probe-art-off', state);
    }
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return document.querySelectorAll('[data-probe-art], [data-probe-art-before], [data-probe-art-after]').length;
};

/** The protected boxes in the last prepare's scope, the deck aside, as they stand now. */
window.__protectedBoxes = () =>
    [...(preparedScope ?? document).querySelectorAll(PROTECTED)]
        .filter((node) => node.closest('.deck-stall') === null)
        .map((node) => {
            const r = node.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height, sel: describe(node) };
        })
        .filter((b) => b.w > 0 && b.h > 0);

/** The scope the last prepare read: an open sheet's, or the page. */
let preparedScope: ParentNode | undefined;

window.__contrastPrepare = (screen, themeId, flags, neutral, nonce, heightOnly = false, tide?: 0 | 1) => {
    preparedNonce = nonce;
    const echo = {
        nonce,
        painted: { screen, look: themeId, flags },
        vw: window.innerWidth,
        vh: window.innerHeight,
    };
    // An id this page cannot paint throws rather than falling back: a
    // fallback look is the measurement the class echo exists to refuse.
    const look = lookById(themeId);
    if (!looksFor(screen).includes(look)) {
        // The apex can only wear the default look — see `looksFor`. The plan
        // never asks for this; the runner refuses a job with no targets.
        preparedNodes = [];
        return { targets: [], pageH: 0, sheetClasses: [], nodes: 0, rain: { worn: 0, flattened: 0 }, horizon: { worn: 0, flattened: 0 }, tide: { worn: 0, held: 0 }, ...echo };
    }
    if (neutral) {
        paint(NEUTRAL_SCREEN, look, []);
    }
    paint(screen, look, wornOf(look, flags));
    freezeAnimations();
    const rain = rainAtItsBrightest();
    const horizon = { worn: document.querySelectorAll('#app .stall.att-horizon:not(.deck-stall) .stall-sign').length, flattened: 0 };
    const tideHeld = auroraTideAt(tide);
    // The same scoping as `measure()`: an open sheet is the surface being
    // read, and everything behind its scrim is deliberately dimmed — sampling
    // there compares an undimmed text colour against scrimmed paint, which
    // reported the address behind the publish sheet at 1.00:1.
    const scrim = document.querySelector('[data-role="sheet-scrim"], [data-role="poster"]');
    const scope: ParentNode = scrim ?? document;
    // Open every fold first, exactly as `measure()` does, and for the mirror
    // image of its reason. A closed `<details>` still hands back boxes for its
    // contents, so its controls WERE sampled — against whatever the panel
    // paints at those coordinates, which is not their ground and is often
    // their own ink. Measured 2026-09-03 when the Activity rows became
    // disclosures: 54 figures reported between 1.00:1 and 2.9:1 across all
    // three looks and both widths, every one of them a control nobody could
    // see. A guard that reads a false red is as useless as one that reads a
    // false green, and the fix is the same in both directions — sample what is
    // painted.
    for (const details of scope.querySelectorAll('details')) {
        details.open = true;
    }
    // The runner's first question of a job is only how tall the page is:
    // when the answer is taller than the viewport, the paint it asked about
    // is thrown away by the repaint at the grown size, and when it is not,
    // the job is prepared afresh from the neutral screen at the same size.
    // Either way nothing is collected or blanked here.
    if (heightOnly) {
        preparedNodes = [];
        return {
            targets: [],
            pageH: pageHeight(scope),
            sheetClasses: sheetClassesOn(document.getElementById('app')!),
            nodes: 0,
            rain,
            horizon,
            tide: tideHeld,
            ...echo,
        };
    }
    // The door's deck minis are pictures (`aria-hidden`, zoomed, no control):
    // no line of them is read by anyone, and a mini's `.orn` read over its
    // look's unflattened rain was the critic's case for leaving them out of
    // every contrast job, globally, before the rain scoping came off (step
    // 5b, CRITIC-SAMPLER-STEP item 9; `PROBE-RULES.md`, "The door's deck is
    // not a contrast target").
    preparedNodes = [...scope.querySelectorAll<HTMLElement>(CONTRAST_TEXT)].filter((node) => node.closest('.deck-stall') === null);
    // The honest-display lines after them (8e2): a node the list above
    // already matched is not taken twice, and one with no layout box at
    // this width — `hidden`, or in a fold a phone does not paint — is not a
    // target here, so it is neither read nor counted as a skip.
    const honestUnrendered = [...scope.querySelectorAll<HTMLElement>(HONEST_SELECTOR)].filter(
        (node) => !node.matches(CONTRAST_TEXT) && node.getClientRects().length === 0,
    ).length;
    preparedNodes.push(
        ...[...scope.querySelectorAll<HTMLElement>(HONEST_SELECTOR)].filter(
            (node) => !node.matches(CONTRAST_TEXT) && node.getClientRects().length > 0,
        ),
    );
    preparedScope = scope;
    const lookPseudos = markLookPseudos(scope);
    const lookMarks = shownLookMarks(scope);
    const fileArt = markFileArt(scope);
    const uncovered = uncoveredText(scope);
    // 1c(c)'s trigger (report-only): read off this paint before anything is blanked.
    const digitTriggered = digitTrigger(scope);
    // Every ink is read BEFORE any node is blanked. A target nested in a
    // target — the sign's copy control, a `.mini` inside `.addr`, since round
    // 8 (2026-09-15) — had its colour set to transparent by the outer node's
    // descendant blanking below, and `targetFor` then read an ink nobody had
    // stored: the runner threw on "undefined" and the whole pass was lost.
    const targets: ContrastTarget[] = [];
    for (const node of preparedNodes) {
        const target = targetFor(node);
        if (typeof target !== 'string') {
            targets.push(target);
        }
    }
    // Every ink in every target's subtree, before any of it is blanked: a
    // child inherits its colour, and read after its parent went transparent
    // it reads transparent — the ring read's lines are read against these.
    adoptPseudoFillSheet();
    for (const node of preparedNodes) {
        for (const el of [node, ...node.querySelectorAll<HTMLElement>('*')]) {
            if (el.dataset['probeColor'] === undefined) {
                el.dataset['probeColor'] = el.style.color;
                el.dataset['probeInk'] ??= getComputedStyle(el).color;
                // 1c(c): a money node's own fill as painted, for its shown frame (`__contrastGlyphs`).
                if (el.matches(MONEY)) el.dataset['probeFill'] ??= getComputedStyle(el).getPropertyValue(GLYPH_FILL);
                keepGlyphs(el);
            }
        }
    }
    for (const node of preparedNodes) {
        // The descendants too: a child with its own ink (`.tab-name` holds
        // the seller's name in the muted channel) does not inherit the
        // blanking, and its glyphs sampled as "ground" reported the shop tab
        // at 1.17:1 — the ink compared against its own sibling text.
        for (const el of [node, ...node.querySelectorAll<HTMLElement>('*')]) {
            // With no transition, or the blanking STARTS one: Modern's and
            // Rural's `.mini` transition `color` over 0.2 s, so their glyphs
            // were still fading when the shot was taken two frames later —
            // 89 of 383 first shots read such a control under 3:1 and were
            // retried, and two runs of one tree differed on 38 boxes read
            // mid-fade on one of them (step 3a, `PROBE-RULES.md`).
            el.style.transition = 'none';
            // Important: an animation outranks an ordinary inline declaration,
            // so an animated ink or glow (the hum's lamp) stayed painted.
            // The glyphs alone (round 6, `blankGlyphs`): `color` stays, so a
            // ground, border or shadow written from `currentColor` is in the
            // capture as it is on the screen.
            blankGlyphs(el);

            // Every shadow off but an outline (round 8): the outline is the
            // ground the ring read measures, so it stays in both captures;
            // any other shadow is the glyph's own paint and goes with it.
            // An element outside every outlined target wears none.
            if (outlineOf(el) <= 0) {
                el.style.setProperty('text-shadow', 'none', 'important');
            } else if (el.closest('.stall-name') !== null) {
                // The seller's name keeps its outline and nothing else (step
                // 5a″, D14): the name's own glow is not its ground. It is the
                // glyph's paint, blanked with the glyph as on every name not
                // outlined; the lamp's dip is G7. Important, because the
                // failing lamp's frames set its shadow by animation.
                el.style.setProperty('text-shadow', outlineOnly(el), 'important');
            }
        }
    }
    /*
     * A pseudo-element's glyphs are no longer blanked (D6(ii), step 5b). The
     * adopted sheet that turned every target's `::before`/`::after` ink
     * transparent (2026-09-24: Neo's Wearing line's cyan "// " read as the
     * line's ground at 1.20:1) is gone with the line-rect read: a pseudo
     * beside the text lies outside every line rect, and one that paints
     * over the text is ground and read as such — which the sheet used to
     * hide. A pseudo inherits the transparent fill where it sets no colour
     * of its own, and keeps its glyphs where it does (`blankGlyphs`, round
     * 6). A whole-box money read is safe from a pseudo's glyph
     * only because no look pseudo may paint inside a protected box
     * (`no-look-pseudo-paints-inside-a-protected-box`, D6(i)).
     */
    // Anything the prepare itself started — a fold it opened — is frozen too.
    freezeAnimations();
    // The runner grows the emulated viewport to this and repaints before the
    // shot: `captureBeyondViewport` does not reliably paint backgrounds below
    // the fold — a below-fold buy control sampled as near-white. The shell
    // and an open sheet hide their height inside their own scroll, so those
    // are asked too (`pageHeight`): at the grown viewport each stretches and
    // everything is on screen.
    return {
        targets,
        pageH: pageHeight(scope),
        // What this one paint wore, for the runner's class audit.
        sheetClasses: sheetClassesOn(document.getElementById('app')!),
        // How many nodes matched `CONTRAST`, before any was dropped — an
        // honest line not rendered at this width aside (`honestUnrendered`).
        nodes: preparedNodes.length,
        honestUnrendered,
        // The stalls that wore the rain, and how many had it at its brightest.
        rain,
        // The signs that wore Grid horizon, painted as they are.
        horizon,
        // The look pseudos in scope, marked for D6(i)'s second frame.
        lookPseudos,
        // The marks a look shows in scope (8f2), hidden in that frame too.
        lookMarks,
        // The file art in scope (8f2): read pending, and failed where that differs.
        fileArt: fileArt.boxes,
        fileArtMixed: fileArt.mixed,
        // Visible text no target reads, reported (step 5b).
        uncovered,
        // The sign name's animations and opacity where it was read (D14).
        nameChrome: nameChrome(scope),
        // 1c(c): the movers near money this paint holds, which make the job read every digit.
        digitTrigger: digitTriggered,
        // The stalls that wore the aurora, and how many had its tide held.
        tide: tideHeld,
        ...echo,
    };
};

/*
 * The verdict, in an element the runner reads by `textContent` and nothing
 * lays out (`hidden`).
 *
 * It sat in the flow under the app for as long as this page existed, and the
 * contrast pass grows a shot to the page's height — so every page that fits
 * its viewport was shot 313px taller than it (the verdict's own height), the
 * shop window at 1920x1393 where the wall is a 1080 screen whose layout reads
 * its frame's shape. The payment band's text on Neo read 2.89:1 at the real
 * height and 14.48:1 at the padded one (2026-09-24, `PROBE-RULES.md`, "Shot at
 * the real height"). The verdict is held to taking no room: a sheet that ever
 * dressed it back into the flow fails every pass rather than padding every
 * shot again.
 */
/*
 * `the-probe-page-meets-no-csp-refusal` (step 6): the page is previewed
 * under the production policy, so a refusal here is one a visitor meets —
 * a sheet, a picture or a face that paints nothing. `cspWatch.ts` listens
 * from the first module statement; the runner asks again after the jobs
 * that run past this verdict (`window.__cspRefusals`).
 */
for (const refusal of cspRefusals()) {
    failures.push({
        screen: 'probe page',
        theme: '-',
        check: 'the-probe-page-meets-no-csp-refusal',
        detail: `${refusal.directive} refused ${refusal.blocked || '(inline)'}${refusal.source === '' ? '' : ` at ${refusal.source}`}`,
    });
}
window.__cspRefusals = () => cspRefusals();

/*
 * `a-worn-only-sheet-loads-under-the-production-policy` (step 6, 6.7): the
 * harness's worn-only look (`fixtureLook.ts`) is painted without its sheet,
 * then its sheet put on the page by the app's own loader
 * (`src/ui/lookSheets.ts`, `loadLookSheet` — the road a private look's sheet
 * takes, 8d1) under the preview's production policy. The runner holds the
 * answer (`layout-check.mjs`): the look read no name before the sheet (so
 * the sheet is not in the entry CSS), the link loaded, landed last among
 * the page's sheets and was same-origin, the look then named itself, its
 * own art was fetched with a 200, the loader holds the sheet as ready and
 * answers a second ask with the same link and no second one on the page, a
 * URL that does not exist rejected rather than hanging or passing — `vite
 * preview` answers it with its SPA fallback and Chrome fires `load` — is
 * held as failed and is not fetched again, and the policy refused nothing.
 * One paint of the neutral screen: the job is about the road, not the look.
 */
window.__wornSheetJob = async (missing: string) => {
    const root = document.getElementById('app')!;
    dropCoverForPaint();
    renderStall(root, paintView(SCREENS[NEUTRAL_SCREEN]!, FIXTURE_LOOK, []), handlers);
    coverGoneAfterPaint();
    const stall = root.querySelector(`.stall.${FIXTURE_SHEET_CLASS}`);
    const named = (): string =>
        stall === null ? '(no stall)' : getComputedStyle(stall).getPropertyValue(LOOK_SHEET_PROPERTY).trim();
    /** How many stylesheet links on the page point at `url`. */
    const linksTo = (url: string): number => {
        const href = new URL(url, location.href).href;
        return [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].filter((l) => l.href === href).length;
    };
    const before = named();
    let loaded = false;
    let last = false;
    let sameOrigin = false;
    let askedAgain = false;
    let error = '';
    try {
        const link = await loadLookSheet(FIXTURE_SHEET_URL, FIXTURE_SHEET_CLASS);
        loaded = true;
        const sheets = [...document.styleSheets];
        last = sheets[sheets.length - 1]?.ownerNode === link;
        sameOrigin = new URL(link.href).origin === location.origin;
        askedAgain = (await loadLookSheet(FIXTURE_SHEET_URL, FIXTURE_SHEET_CLASS)) === link;
    } catch (err) {
        error = err instanceof Error ? err.message : String(err);
    }
    const after = named();
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const art = (performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .filter((entry) => /\/assets\/ground-[\w-]+\.svg$/.test(new URL(entry.name).pathname))
        .map((entry) => entry.responseStatus);
    let missingRejected = false;
    let missingWhy = '';
    try {
        await loadLookSheet(missing, FIXTURE_SHEET_CLASS);
    } catch (err) {
        missingRejected = true;
        missingWhy = err instanceof Error ? err.message : String(err);
    }
    let missingAgainRejected = false;
    try {
        await loadLookSheet(missing, FIXTURE_SHEET_CLASS);
    } catch {
        missingAgainRejected = true;
    }
    const missingEntry = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).find(
        (entry) => new URL(entry.name).pathname === missing,
    );
    return {
        url: FIXTURE_SHEET_URL,
        before,
        loaded,
        error,
        last,
        sameOrigin,
        after,
        art,
        state: lookSheetState(FIXTURE_SHEET_URL) ?? '',
        askedAgain,
        links: linksTo(FIXTURE_SHEET_URL),
        missingRejected,
        missingWhy,
        missingStatus: missingEntry?.responseStatus ?? 0,
        missingState: lookSheetState(missing) ?? '',
        missingAgainRejected,
        missingLinks: linksTo(missing),
        inEntryCss: [...document.styleSheets].some(
            (sheet) => sheet.ownerNode instanceof HTMLLinkElement && sheet.ownerNode.href !== new URL(FIXTURE_SHEET_URL, location.href).href && [...sheet.cssRules].some((rule) => rule.cssText.includes(FIXTURE_SHEET_CLASS)),
        ),
        refusals: cspRefusals(),
    };
};

const result = document.createElement('pre');
result.id = 'layout-result';
result.hidden = true;
document.body.append(result);
/*
 * `holds-out-of-flow-agrees-with-this-chrome`: 1b's containing blocks held to
 * this Chrome, once a page, after every paint and before the verdict
 * (`outOfFlowSelfCheck`); each disagreement is one of the page's failures.
 */
const outOfFlowStart = performance.now();
const outOfFlowCheck = outOfFlowSelfCheck();
const outOfFlowMs = performance.now() - outOfFlowStart;
for (const detail of outOfFlowCheck.disagree) failures.push({ screen: 'probe page', theme: '-', check: 'holds-out-of-flow-agrees-with-this-chrome', detail });
const verdict = {
    viewport: window.innerWidth,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    /*
     * The tall-portrait half of `window.css`, echoed back so the runner
     * can refuse a pass the media feature never reached — the same guard
     * `reducedMotion` gives that pass. It is `portrait` with the
     * `max-height: 1500px` block NOT matching (1200 until 2026-10-14,
     * when a 1280-tall tablet joined the short block): a phone and a counter
     * tablet are portrait too and take the short variant, so the stacked
     * column a wall-mounted screen paints is a third state, and asking
     * only for `portrait` would have certified it from a 390px phone.
     */
    portraitTall: matchMedia('(orientation: portrait) and (min-height: 1501px)')
        .matches,
    /*
     * The other portrait block — `(orientation: portrait) and
     * (max-height: 1500px)` — echoed back for its own passes' guard (the
     * counter tablet, and since 2026-10-14 the 800x1280 and 680x1000 walls).
     *
     * It was reached only by the 390x844 mobile pass, and only because
     * the wall fixtures ran there. Taking them out of that pass was
     * right (the app cannot paint a wall at 390) and left this block
     * executed by NOTHING, with two documents still describing it as
     * covered (QA, 2026-09-20, measured in Chrome). That is
     * `44720d3` again: half a layout behind a query no pass could
     * enter. A counter tablet stood on end is 768 wide, which is over
     * the wall's floor, so the screen is real and the pass is now its
     * own.
     */
    portraitShort: matchMedia('(orientation: portrait) and (max-height: 1500px)')
        .matches,
    /*
     * The short landscape block — `(orientation: landscape) and (max-height:
     * 900px)` — echoed for the desk and off-size wall passes' guard
     * (1280x900, 1280x800, 1024x768, 1366x768): the card's code stands
     * beside its figure there.
     */
    landscapeShort: matchMedia('(orientation: landscape) and (max-height: 900px)').matches,
    screensMeasured: measured,
    /*
     * Every face's status when the measuring began (`layout/faces.ts`; the
     * runner holds it, `scripts/probe-faces.mjs`). Read once: the loop and
     * this verdict are one task, in which no sheet becomes active and no
     * loaded face unloads.
     */
    faces: facesAtStart,
    /*
     * Every `t-*` class a painted `.stall` wore — the look this page
     * actually measured, not the one it was asked for. The runner refuses
     * a pass whose set is not exactly what it ran (`{t-workshop}` for the
     * kit, the three shipped classes otherwise).
     */
    sheetClasses: [...sheetClassesPainted].sort(),
    /* The look classes whose sheet named them on a painted stall (`a-look-is-measured-with-its-sheet`). */
    lookSheetsRead: [...lookSheetsRead].sort(),
    /* The kit's anchor refusal (`kitAnchorFaults`): paints of the kit's look read, and those it failed. */
    kitAnchorPaints,
    /* Elements with words of their own asked about a mask or clip naming a file (`no-word-is-clipped-by-a-file`). */
    fileClipChecks,
    /* Marks read hidden, per look class (`no-shipped-look-shows-a-mark`). */
    markChecksByClass,
    /* Marks a carried private look showed, per class (8f2). */
    marksShownByClass,
    /* Sign lines read whole, the vertical ones, and the name rungs climbed, per class (`the-sellers-name-stands-whole`, 8f2). */
    nameLinesByClass,
    /* Of those, the lines read under their own clip with no slack on their block axis (the 8g1 critic's P2-3). */
    nameOwnClipByClass,
    nameVerticalByClass,
    nameTiersByClass,
    /* Sticky signs and the stops their regions were scrolled through, per class (`a-sticky-sign-covers-nothing-as-the-region-scrolls`, 8f2). */
    stickyByClass,
    /* The stress names measured on the name sheet's try-on, per carried look (8f2). */
    tryOnNamesByClass,
    /* Nodes each staged screen put in its pressed state, per look class (`STAGED` in `fixtures.ts`). */
    stagedByClass,
    /* The short pass's looks as the page read them, and its paints measured and set aside (`?sticky=`). */
    stickyOnly: STICKY_ONLY === undefined ? null : [...STICKY_ONLY].sort(),
    shortPass,
    /* Pairs of sign lines compared, and signs read with the tagline invite in them, per class (`the-signs-words-never-stand-on-each-other`). */
    signWordsByClass,
    /* The CJK advances read where a sign line is CJK (`a-cjk-name-is-set-in-a-cjk-face`, 8f2). */
    cjkFaces: [...cjkFaces].sort(),
    /* Every policy refusal the page met before its verdict (`the-probe-page-meets-no-csp-refusal`). */
    cspRefusals: cspRefusals(),
    /*
     * 1a (`nothing-covers-money-or-a-protected-box`): its tallies per look —
     * what the runner holds the clip ceiling and the owed reads to — and its
     * own time (a clock the runner's tab check leaves out); `coveredBy`'s
     * calls and time per phase (`coveredByMs` a clock too).
     */
    coverCheck: COVER_CHECK,
    coverByClass,
    coverMs,
    /* The end-state read (`coverAtEnd`): its reads and failures, and its time (a clock, inside `coverMs`). */
    coverEnd,
    coverEndMs,
    coveredByCalls,
    coveredByMs,
    /*
     * 1b (`a-paint-with-no-hit-area-reaches-no-money`, bound since 7b): its
     * tallies per look, its failures word for word (up to `REACH_KEPT`; they
     * are also in `failures`), the meets accepted by name (`REACH_ACCEPTED`),
     * the most each soft paint reached over a target (the blur policy's
     * measurement), and its own time and its keyframe seeks' (clocks).
     */
    reachCheck: REACH_CHECK,
    reachBlurOpacity: BLUR_OPACITY,
    reachByClass,
    reachWould,
    reachAccepted: reachAcceptedSaid,
    reachLiteral,
    reachSoft,
    reachThrown,
    reachMs,
    /* `holds-out-of-flow-agrees-with-this-chrome`: the cases read and how many of each kind of child Chrome held, its disagreements (also failures), and its own time (a clock). */
    outOfFlowCheck,
    outOfFlowMs,
    reachSeekMs,
    reachSeekNames,
    /* The dress rule's keyframe-offset read (`offsetDressFaults`): its counts, and its own time (a clock). */
    dressSeek,
    dressSeekMs,
    screensWithQuote: [...withQuote],
    codesPainted: [...codesPainted].sort(),
    /*
     * What the step-2 rules compared, for the runner to require
     * (`probe-coverage.mjs`): the unbuyable labels read per place, the
     * shipped looks whose row sizes were read, and the skeleton's tiered
     * figures per tier.
     */
    unbuyableChecks,
    skipChecks,
    rowSizeClasses: [...rowSizeClasses].sort(),
    doorMiniClasses: [...doorMiniClasses].sort(),
    /* Paid private looks painted the record's way and held to the default (`the-record-road-paints-a-locked-look-as-the-default`). */
    recordRoadChecks,
    /* The private looks this build carries, by class (8e2): the runner holds them to the selection it named. */
    privateClasses: privateLooks().map((look) => look.theme.sheetClass),
    wallControlChecks,
    statusLineChecks,
    wallControlRoles,
    /* The same per look (8e2). */
    wallControlRolesByClass,
    wallSlivers: [...wallSlivers].sort(),
    floorNamedChecks,
    outlineChecks,
    moneyChecks,
    atRestSetAside,
    /* Every decoration class the pass painted worn (`wornClassesPainted`). */
    wornClasses: [...wornClassesPainted].sort(),
    buntingChecks,
    haloChecks,
    outlinedTargets: [...outlinedTargets].sort(),
    smallText: [...smallTextElsewhere].sort(),
    ladderTiers,
    /* Card figures read inside their rows, per look and per place:tier (`a-card-figure-stands-inside-its-row`). */
    cardFigureByClass,
    /* The tiers each figure's painted ladder was compared over, per look (`a-card-figure-steps-down-on-every-look`). */
    cardLadderByClass,
    /* The stream card's price rows read, per look and per money tier (`streamTierRead`). */
    streamTierByClass,
    /* Cycle figures read per look and per step (`a-cycle-card-shows-every-digit-at-every-wall-size`). */
    cycleFigureByClass,
    /* Broken figures whose pieces were held to the figure's own ink, per look (`a-broken-figure-wears-the-figures-own-ink`). */
    figureInkByClass,
    /* Money figures asked whether they clip themselves, per look (`a-money-figure-never-clips-itself`). */
    selfClipByClass,
    /* Codes painted and codes whose colours were read, per look (`a-code-is-drawn-black-on-white`). */
    qrColourByClass,
    /* Codes each look painted on each screen with a box, by how many the app built, its fewest and most over its variants (`qrByScreen`). */
    qrByScreen,
    /* Money figures held to a dress that does not misstate them, per look, and those read under a clip-path or clip (`a-money-figure-is-never-misdressed`). */
    dressByClass,
    dressClipByClass,
    /*
     * 3a (`the-ground-walk-reaches-the-stall`, report-only): its tallies per
     * look, its would-be failures with their sources, the bound read's
     * failures it would drop, what it could not read (each up to
     * `WALK_KEPT`), its throws, and its own time (a clock).
     */
    walkCheck: WALK_CHECK,
    walkByClass,
    walkWould,
    walkDropped,
    walkUnread,
    walkThrown,
    walkMs,
    failures,
};
result.textContent = JSON.stringify(verdict, null, 1);
{
    const box = result.getBoundingClientRect();
    if (box.width !== 0 || box.height !== 0) {
        failures.push({
            screen: 'probe page',
            theme: '-',
            check: 'the verdict takes no room',
            detail: `#layout-result lays out at ${box.width}x${box.height}, and every contrast shot grows by it`,
        });
        result.textContent = JSON.stringify(verdict, null, 1);
    }
}
window.__probeReady = true;
