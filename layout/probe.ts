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
import { PAY_QR_NARROWEST_PX, cheapestOf, listingsInShopOrder, renderStall } from '../src/ui/render';
import { TICKER_ITEMS_PER_PASS } from '../src/ui/broadcast';
import { isUnbuyable } from '../src/domain/money';
import type { StallView } from '../src/domain/state';
import { UNBUYABLE_BADGE, windowPayMore } from '../src/ui/copy';
import rainNearSvg from '../src/ui/decor/rain-near.svg?raw';
import rainMidSvg from '../src/ui/decor/rain-mid.svg?raw';
import rainFarSvg from '../src/ui/decor/rain-far.svg?raw';
import buntingSvg from '../src/ui/decor/bunting.svg?raw';
import { artTopShare } from './buntingArt';
import { brightestDrop, type Drop } from './rainDrop';
import { brightestArt } from './horizonArt';
import horizonLeftSvg from '../src/ui/decor/horizon-sky-left.svg?raw';
import horizonRightSvg from '../src/ui/decor/horizon-sky-right.svg?raw';
import horizonFillSvg from '../src/ui/decor/horizon-sky-fill.svg?raw';
import horizonStarsSvg from '../src/ui/decor/horizon-stars.svg?raw';
import { MOOD_VISIBLE_MIN, moodDistance, paintedDistance, type Rgb as MoodRgb } from './moodVisible';
import { OUTLINE_1, OUTLINE_2, OUTLINE_2_UNDER_PX, outlineSet, type Offset } from './outline';
import type { ShippedAttachment } from '../src/domain/attachments';
import { SKELETON_LOOK_ID, lookById, looksFor, measuredLooks, shippedLooks, wornOf, type Look } from './looks';
import { contrastPlan, contrastScreens, type ContrastJob } from './contrastPlan';
import { MONEY, MONEY_OUTSIDE_PROTECTED } from './moneySet';
import { screensAt } from './screenSplit';
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
    handlers,
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
 * How many hit-test points the clip tolerance skipped this run, and how many
 * it actually hit-tested.
 *
 * §6's own complaint is about a check that quietly does not run: a
 * `coveredBy` that skipped every point would be indistinguishable from one
 * that found nothing wrong. The skip count alone could not tell those apart
 * — it has no denominator, so 1,830 skips is either a tolerance doing its
 * job over a long scroll region or a tolerance that ate the whole pass, and
 * the number was printed **only on a passing run**, which is the one run
 * where a reader is least likely to look.
 *
 * So both halves are counted and both are reported on every run, pass or
 * fail, and `scripts/layout-check.mjs` holds the ratio to a ceiling. A point
 * off the viewport counts as neither: that is the viewport check's failure,
 * not this one's.
 */
export let clipSkips = 0;
export let clipChecks = 0;

type Clip = {
    rect: DOMRect;
    el: Element;
    /** `overflow-x: hidden | clip`: what lies past its side edge is gone, not scrolled to. */
    cutsX: boolean;
    /** A sideways scroller with something to scroll: what lies past its edge is reachable. */
    scrollsX: boolean;
};

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
                scrollsX:
                    (style.overflowX === 'auto' || style.overflowX === 'scroll') &&
                    at.scrollWidth > at.clientWidth + 1,
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
 * ancestor actually scrolls sideways (the door's deck row), or the page
 * itself does, which the sideways-scroll rule already refuses. The incident:
 * the door's body is a flex item with auto side margins, so its width is its
 * own max-content capped at 430px, and round 16 gave it a nowrap site bar
 * and a deck row whose max-content is past that — at 390px the body came out
 * 430 wide, flush left, the paste button's right edge at 400 and the counter
 * at 414, cut by the shell's `overflow-x: clip`. No rule saw it: the page did
 * not scroll (the shell clips), and `coveredBy` skipped the points past the
 * edge as "off screen, the viewport check's failure", which was no check at
 * all. Every protected box is asked, in the geometry sweep.
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
    const clips = clipsOf(node);
    const reachable =
        document.documentElement.scrollWidth > window.innerWidth + 1 ||
        clips.some((clip) => clip.scrollsX);
    if (reachable) {
        return undefined;
    }
    const span = `${Math.round(box.left)}–${Math.round(box.right)}`;
    if (box.left < -1 || box.right > window.innerWidth + 1) {
        return `runs past the viewport's side edge (${span} of ${window.innerWidth}) with nothing to scroll`;
    }
    const cutter = clips.find(
        (clip) => clip.cutsX && (box.left < clip.rect.left - 1 || box.right > clip.rect.right + 1),
    );
    if (cutter !== undefined) {
        return `is cut sideways by ${describe(cutter.el)} (${span} inside ${Math.round(cutter.rect.left)}–${Math.round(cutter.rect.right)})`;
    }
    return undefined;
}

function coveredBy(node: Element): string | undefined {
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
        return 'has no box at all';
    }
    const points: [number, number][] = [
        [box.left + box.width / 2, box.top + box.height / 2],
        [box.left + 2, box.top + 2],
        [box.right - 2, box.top + 2],
        [box.left + 2, box.bottom - 2],
        [box.right - 2, box.bottom - 2],
    ];
    // Content inside the shell's scroll region keeps its full rect even when
    // part of it is scrolled out of the clip. A point beyond the clip is not
    // covered — it is reachable by scrolling, and the tab bar sits outside
    // the clip in flow, so it can never cover what is inside. Points within
    // the clip are still fully checked.
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
            clipSkips += 1;
            continue;
        }
        clipChecks += 1;
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

/**
 * Resolve a computed `polygon(...)` into pixel vertices for one box. Handles
 * the coordinate forms our sheets actually use — `px`, `%`, bare `0`, and
 * single-operation `calc(A% ± Bpx)` — and refuses anything else, so a new
 * clip grammar fails loudly instead of being measured wrong.
 */
function parsePolygon(clip: string, w: number, h: number): [number, number][] | undefined {
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

/** Paint one combination. A look is an object from `looks.ts`, never an id. */
function paint(screen: string, look: Look, worn: readonly ShippedAttachment[]): void {
    const root = document.getElementById('app')!;
    const view = { ...SCREENS[screen]!, theme: look.theme, worn };
    renderStall(root, view, handlers);
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
    const all = wornOf(look, 0xffff);
    const singles = rows.map((row) => [row]);
    return [[], ...singles, ...(all.length > 1 ? [all] : [])];
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
    const clipperOf = (node: Element): Element | null => {
        let up = node.parentElement;
        while (up !== null && up !== root) {
            if (getComputedStyle(up).overflowX !== 'visible') {
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
        if (cs.overflowX !== 'visible' || cs.display === 'inline') {
            continue;
        }
        const spill = node.scrollWidth - node.clientWidth;
        if (spill <= 1) {
            continue;
        }
        const box = node.getBoundingClientRect();
        // The strip the words paint into, past the box's own right edge.
        const strip = new DOMRect(box.right, box.top, spill, box.height);
        const clipper = clipperOf(node);
        const cut = clipper !== null && strip.right > clipper.getBoundingClientRect().right + 1;
        let under: Element | undefined;
        if (!cut) {
            for (const other of root.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [data-role="price"], [data-role="seller-price"], .item-n, .face-nm, .fine, .note, .pub')) {
                if (other === node || node.contains(other) || other.contains(node)) {
                    continue;
                }
                if (other.closest('[aria-hidden="true"]') !== null) {
                    continue;
                }
                const r = other.getBoundingClientRect();
                if (r.width > 0 && overlaps(strip, r)) {
                    under = other;
                    break;
                }
            }
        }
        if (cut || under !== undefined) {
            fail(
                'text-spills',
                `${describe(node)} paints ${spill}px past its box (${node.scrollWidth} > ${node.clientWidth})${cut ? ', cut off by ' + describe(clipper!) : ', under ' + describe(under!)}`,
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
    const out = measure(screen, themeLabel);
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
    // `slot: 'mood'` rows and mounts no ornament strip, so every worn variant
    // paints the same tree. One bare pass, and the driver skips its `wornAll`
    // loop too — see NO_DECOR_SCREENS.
    // The door too, since it wears nothing (`paintsBareOnly`).
    if (paintsBareOnly(screen)) {
        return [[]];
    }
    const all = wornVariants(look);
    if (!STATE_SCREENS.has(screen) || all.length < 2) {
        return all;
    }
    return [all[0]!, all[all.length - 1]!];
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
        }
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
 * because the buttons carry them, and are read by the eye). The door's deck minis are pictures at
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
 *   exceptions in `ROOT_LAYERS_SET_ASIDE`, matched on its own form and on
 *   the class that paints it — the rain, what the outline is for; the
 *   aurora's washes and its tint over the rain, and Neo's own backdrop (its
 *   scanlines and its top glow), gradients across the whole stall that no
 *   single colour can match, where the outline on the plain ground stays
 *   `var(--s-bg)` — or it is read like any layer under the line: a colour
 *   or a full-size gradient composited in, anything else a failure. Until
 *   step 5b every root layer was passed by its position, so a new root
 *   decoration's layer would have been exempt the day it shipped. Neo's
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
 * The root's image layers this rule sets aside, each by its own form and
 * the class that paints it, with the reason (`a-new-root-layer-is-not-exempt-by-position`).
 * A root layer none of these names is read like any layer under a line.
 */
const C = String.raw`(?:rgba?\([^)]*\)|color\(srgb [\d.]+ [\d.]+ [\d.]+(?: \/ [\d.]+)?\))`;
/**
 * Whether every colour a layer names is one of the stall's own tokens, at no
 * more than `most` alpha, or transparent: the aurora's washes are its accent
 * and its second accent and nothing else (the critic, 2026-09-27: the entry
 * matched any root `radial-gradient(farthest-side, …` on a stall wearing
 * the aurora).
 */
function coloursAre(layer: string, stall: HTMLElement, tokens: readonly string[], most: number): boolean {
    const cs = getComputedStyle(stall);
    const allowed = tokens.map((t) => colourOf(cs.getPropertyValue(t).trim())?.rgb);
    const named = layer.match(new RegExp(C, 'g')) ?? [];
    return (
        named.length > 0 &&
        named.every((text) => {
            const c = colourOf(text);
            if (c === undefined) return false;
            if (c.alpha === 0) return true;
            return c.alpha <= most + 1e-6 && allowed.some((a) => a !== undefined && a.every((v, i) => Math.abs(v - c.rgb[i]!) <= 1));
        })
    );
}

const ROOT_LAYERS_SET_ASIDE: ReadonlyArray<{ name: string; paints: string; test: (layer: string, stall: HTMLElement) => boolean }> = [
    // What the outline is for.
    { name: 'the rain', paints: 'att-rainfall', test: (l) => /^url\("?[^")]*\/rain-(?:near|mid|far)[^")]*"?\)$/.test(l) },
    // Two washes across the whole stall, each one accent at most 28% fading
    // to nothing at 66%, and their tint over the rain (140deg, the two
    // accents at most 16%, transparent at 46%) — the exact shapes
    // stall.css's aurora rules paint.
    {
        name: 'the aurora’s washes',
        paints: 'att-aurora',
        test: (l, stall) =>
            new RegExp(String.raw`^radial-gradient\(farthest-side, ${C}, rgba\(0, 0, 0, 0\) 66%\)$`).test(l) &&
            coloursAre(l, stall, ['--s-accent', '--s-accent-2'], 0.28),
    },
    {
        name: 'the aurora’s tint over the rain',
        paints: 'att-aurora',
        test: (l, stall) =>
            new RegExp(String.raw`^linear-gradient\(140deg, ${C}, rgba\(0, 0, 0, 0\) 46%, ${C}\)$`).test(l) &&
            coloursAre(l, stall, ['--s-accent', '--s-accent-2'], 0.16),
    },
    // Neo's own backdrop (`--s-backdrop`): a 1px scanline every 4px, and the glow in its top 480px.
    { name: 'Neo’s scanlines', paints: 't-neo', test: (l) => /^repeating-linear-gradient\(0deg, .* 0px, .* 1px, .* 1px, .* 4px\)$/.test(l) },
    { name: 'Neo’s top glow', paints: 't-neo', test: (l) => /^linear-gradient\((?:180deg, )?[^,]*( 0%)?, rgba?\([^)]*\) 480px\)$/.test(l) },
];

/**
 * A decoration's own art on the surface it paints (step 5a″, D14): what the
 * outline is for, like the rain on the root — matched on its form, the
 * element it paints and the class that paints it. Grid horizon's skyline,
 * moon and stars on the sign. Every other layer of that surface is read as
 * any layer is: a full-size gradient evaluated under the line, a smaller
 * one set aside and counted, a radial or repeating one held to its stops.
 */
const SURFACE_ART_SET_ASIDE: ReadonlyArray<{ name: string; paints: string; on: string; test: (layer: string) => boolean }> = [
    {
        name: 'Grid horizon’s skyline, moon and stars',
        paints: 'att-horizon',
        on: '.stall-sign',
        test: (l) => /^url\("?[^")]*\/horizon-(?:sky-left|sky-right|sky-fill|moon|stars)[^")]*"?\)$/.test(l),
    },
];

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
                const known = ROOT_LAYERS_SET_ASIDE.find((k) => stall.classList.contains(k.paints) && k.test(layer, stall));
                if (known !== undefined) {
                    setAside(known.name);
                    continue;
                }
                if (!FULL_SIZE.includes(size) || !/gradient\(/.test(layer)) {
                    return { picture: el, what: `a root layer this rule does not know (${layer.slice(0, 60)}…, ${size}) — a-new-root-layer-is-not-exempt-by-position` };
                }
            }
            const art = SURFACE_ART_SET_ASIDE.find((k) => stall.classList.contains(k.paints) && el.matches(k.on) && k.test(layer));
            if (art !== undefined) {
                setAside(art.name);
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
        const target = node.closest(CONTRAST_TEXT);
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
    for (const node of app.querySelectorAll(CONTRAST_TEXT)) {
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
        if (!node.matches(CONTRAST_TEXT)) {
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
        const range = document.createRange();
        range.selectNodeContents(tile);
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

const failures: Failure[] = [];
const measured = screensToRun();
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
for (const screen of measured) {
    for (const look of looksFor(screen)) {
        for (const worn of variantsFor(screen, look)) {
            const label =
                worn.length === 0
                    ? look.label
                    : `${look.label} + ${worn.map((a) => a.label).join(' + ')}`;
            failures.push(...checkOverTime(screen, look, label, worn));
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
            for (const svg of document.querySelectorAll('svg.qr')) {
                if (svg.closest('.deck-stall') !== null) continue;
                const box = svg.getBoundingClientRect();
                if (box.width > 0 && box.height > 0) codesPainted.add(`${screen}:${codeName(svg)}`);
            }
            failures.push(...unbuyableFaults(screen, label));
            failures.push(...wallCuts(screen, label));
            failures.push(...statusLineFaults(screen, label));
            failures.push(...payLinesSayWhatTheyHide(screen, label));
            failures.push(...smallTextFaults(screen, label));
            failures.push(...tileLetterCuts(screen, label));
            failures.push(...outlineFaults(screen, label));
            failures.push(...moneySetFaults(screen, label));
            failures.push(...buntingSwingFaults(screen, label));
            failures.push(...haloFaults(screen, label));
            if (screen === 'offers' && worn.length === 0 && shippedLooks().includes(look)) {
                failures.push(...rowStatesItsSizes(look, label));
                gatherShopDress(look);
            }
            if (screen === 'door') {
                failures.push(...gatherMiniDress(label));
            }
            if (look.id === SKELETON_LOOK_ID) {
                failures.push(...skeletonLadderFaults(screen, label));
            }
        }
    }
}

failures.push(...doorMiniFaults());

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
// measured against Modern's canvas (the workshop critic's P1).
for (const look of measuredLooks()) {
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
    nonce: string;
    painted: { screen: string; look: number; flags: number };
    vw: number;
    vh: number;
    /** The look pseudos generated in the job's scope (D6(i)): none means no second frame. */
    lookPseudos?: number;
    /** The elements whose visible text no contrast target reads, described (a report, step 5b). */
    uncovered?: string[];
    /** How the sign's name was painted at the frozen instant (D14): its animations and opacity. */
    nameChrome?: string[];
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
        /** Hide (or show again) every look pseudo the last prepare marked; how many are marked (D6(i)). */
        __lookPseudosHidden: (hide: boolean) => Promise<number>;
        /** The protected boxes in the last prepare's scope, as they stand now (D6(i)). */
        __protectedBoxes: () => { x: number; y: number; w: number; h: number; sel: string }[];
        /**
         * Show (or blank again) the glyphs of every prepared target that
         * wears the outline, for the ring read's second capture.
         */
        __contrastGlyphs: (show: boolean) => Promise<number>;
        /**
         * The boxes allowed to be opaque on a transparent overlay: the two
         * plates and the QR, which are the text grounds the contrast rule
         * requires. The runner samples the alpha channel OUTSIDE these.
         */
        __opaqueBoxes: () => { x: number; y: number; w: number; h: number }[];
        /** Every painted code in the last prepare's scope, for the quiet-zone read (D4). */
        __quietZones: () => QuietZone[];
        __contrastScreens: string[];
        /** Every job of the contrast pass, at every viewport (`contrastPlan.ts`). */
        __contrastPlan: () => ContrastJob[];
        /** The overlay screens, so the driver can skip their `wornAll` half. */
        __noDecorScreens: string[];
        __canvasScreens: string[];
        /** Each measured look's id, and how many decoration rows it has — none means no worn half. */
        __themes: { id: number; rows: number; sheetClass: string }[];
        __probeReady: boolean;
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
window.__contrastScreens = contrastScreens(
    window.innerWidth,
    new URLSearchParams(location.search).get('viewport') === 'canvas',
    measuredLooks(),
);
/*
 * The whole pass as a list of jobs (step 3a, the step-3 critic's item 7):
 * the runner walks this and nothing else, and holds the jobs it did against
 * it at the end. The screens at this page's own width are `__contrastScreens`
 * above, which the runner compares with the plan's at every viewport.
 */
window.__contrastPlan = () => contrastPlan(measuredLooks());
window.__noDecorScreens = [...NO_DECOR_SCREENS];
window.__canvasScreens = [...CANVAS_SCREENS];
window.__themes = measuredLooks().map((look) => ({
    id: look.id,
    rows: look.rows.length,
    sheetClass: look.theme.sheetClass,
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
    // because a re-read after `__contrastPrepare` sees `transparent`.
    const ink = node.style.color === 'transparent' ? node.dataset['probeInk']! : style.color;
    node.dataset['probeInk'] = ink;
    const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
    const ring = Math.max(0, outlineOf(node));
    const lined = !money && ring === 0;
    if (!lined && sliver) {
        return 'sliver';
    }
    const angle = angleOf(node);
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
        ...(angle === 0 ? {} : { frame: turnedBox(full, angle) }),
        sel: describe(node),
        money,
        rects: read?.rects,
        legacyDropped: sliver,
        ring,
        lines: ring > 0 ? ringLines(node, box) : [],
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
 * h, about the same centre.
 */
function turnedBox(r: DOMRect, angle: number): { cx: number; cy: number; w: number; h: number } {
    const c = Math.abs(Math.cos(angle));
    const sn = Math.abs(Math.sin(angle));
    const det = c * c - sn * sn;
    const w = angle === 0 ? r.width : (r.width * c - r.height * sn) / det;
    const h = angle === 0 ? r.height : (r.height * c - r.width * sn) / det;
    if (!(det > 0 && w > 0 && h > 0)) {
        throw new Error(`a box turned ${((angle * 180) / Math.PI).toFixed(2)}° at ${Math.round(r.x)},${Math.round(r.y)} gives no box before its turn`);
    }
    return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, w, h };
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
        rects.push({ ...cut, cx: line.cx, cy: line.cy, rw: line.w, rh: line.h, angle, ink: lineInk, ...(glyph ? { glyph: true as const } : {}) });
    };
    const range = document.createRange();
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
        const owner = text.parentElement;
        if (owner === null || owner.closest('svg') !== null || (text.textContent ?? '').trim() === '') continue;
        if (owner.closest(CONTRAST_TEXT) !== node) continue;
        const cs = getComputedStyle(owner);
        if (cs.visibility !== 'visible') continue;
        const lineInk = owner === node ? ink : owner instanceof HTMLElement && owner.style.color === 'transparent' ? (owner.dataset['probeInk'] ?? cs.color) : cs.color;
        range.selectNodeContents(text);
        for (const r of range.getClientRects()) push(owner, r, lineInk, false);
    }
    if (fragments === 0) {
        // No text on a line: a control drawn with a glyph alone.
        for (const svg of node.querySelectorAll('svg')) {
            if (svg.closest(CONTRAST_TEXT) !== node || getComputedStyle(svg).visibility !== 'visible') continue;
            push(svg, svg.getBoundingClientRect(), ink, true);
        }
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

/** An sRGB colour as computed — `rgb()`, `rgba()` or `color(srgb …)` — with its alpha. */
function colourOf(value: string): { rgb: [number, number, number]; alpha: number } | undefined {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(value);
    if (m !== null) {
        return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alpha: m[4] === undefined ? 1 : Number(m[4]) };
    }
    const f = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/.exec(value);
    if (f !== null) {
        const rgb = [f[1], f[2], f[3]].map((v) => Math.round(Number(v) * 255)) as [number, number, number];
        return { rgb, alpha: f[4] === undefined ? 1 : Number(f[4]) };
    }
    /*
     * `oklab()` (step 5a″): a colour an animation sets is interpolated in
     * OKLab and computed as one — the failing lamp's outlined frames
     * (`att-hum-gutter-outlined`) serialise every shadow so, and read as
     * "not an outline" the lamp's glyph lost its outline in the prepare and
     * was read bare. Converted with Björn Ottosson's matrices, as CSS Color 4
     * does, to sRGB rounded to the level.
     */
    const k = /oklab\((-?[\d.]+) (-?[\d.]+) (-?[\d.]+)(?: \/ ([\d.]+))?\)/.exec(value);
    if (k !== null) {
        const [L, A, B] = [Number(k[1]), Number(k[2]), Number(k[3])];
        const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
        const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
        const q = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
        const lin = [
            4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * q,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * q,
            -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * q,
        ];
        const rgb = lin.map((c) => {
            const v = Math.min(1, Math.max(0, c));
            return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
        }) as [number, number, number];
        return { rgb, alpha: k[4] === undefined ? 1 : Number(k[4]) };
    }
    return undefined;
}

/**
 * An outlined target's lines: every text node's visible characters, grouped
 * by the line box each sits on, each line's rect the union of its
 * characters' and its ink the colour its own element paints them in. A
 * character counts where its centre lies inside `box` (the target's box as
 * the clip left it), so a line scrolled half out of a clip counts only what
 * shows. Text inside an `<svg>` is a drawing, not a line.
 */
function ringLines(node: HTMLElement, box: { x: number; y: number; width: number; height: number }): RingLine[] {
    const lines = new Map<string, RingLine>();
    const range = document.createRange();
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let index = 0;
    for (let text = walker.nextNode(); text !== null; text = walker.nextNode(), index += 1) {
        const owner = text.parentElement;
        if (owner === null || owner.closest('svg') !== null) continue;
        const cs = getComputedStyle(owner);
        if (cs.visibility !== 'visible') continue;
        const ink = owner.style.color === 'transparent' ? (owner.dataset['probeInk'] ?? cs.color) : cs.color;
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
 * The ring read's second capture: every prepared target that wears the
 * outline, and each descendant, has its glyphs shown again (the colour the
 * prepare blanked, put back) or blanked once more. A pseudo-element with an
 * ink of its own paints in both captures and one inheriting the line's
 * follows it; the mask is read inside the text nodes' own line boxes either
 * way (D6(ii), step 5b).
 */
window.__contrastGlyphs = async (show: boolean) => {
    let n = 0;
    for (const node of preparedNodes) {
        if (outlineOf(node) <= 0) continue;
        n += 1;
        for (const el of [node, ...node.querySelectorAll<HTMLElement>('*')]) {
            if (el.dataset['probeColor'] === undefined) continue;
            if (show) {
                el.style.color = el.dataset['probeColor'];
            } else {
                el.style.setProperty('color', 'transparent', 'important');
            }
        }
    }
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return n;
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
};

window.__quietZones = () =>
    [...(preparedScope ?? document).querySelectorAll<SVGSVGElement>('svg.qr')]
        .filter((svg) => svg.closest('.deck-stall') === null && getComputedStyle(svg).visibility === 'visible')
        .map((svg): QuietZone | undefined => {
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
            };
        })
        .filter((z): z is QuietZone => z !== undefined);

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
        const isSheet = (layer: string): boolean => /^url\("?[^")]*\/horizon-(?:sky-left|sky-right|sky-fill|stars)[^")]*"?\)$/.test(layer);
        const first = layers.findIndex(isSheet);
        if (art === undefined || first < 0 || layers.filter(isSheet).length !== HORIZON_SHEETS.length) continue;
        const paint = `rgba(${art.rgb.join(', ')}, ${art.alpha})`;
        const rebuild = (list: string[], flatEntry: string): string =>
            layers
                .flatMap((layer, i) => (!isSheet(layer) ? [list[i % list.length]!] : i === first ? [flatEntry] : []))
                .join(', ');
        const set = (prop: string, value: string): void => sign.style.setProperty(prop, value, 'important');
        set('background-image', rebuild(layers, `linear-gradient(${paint}, ${paint})`));
        set('background-size', rebuild(splitLayers(cs.backgroundSize), '100% 100%'));
        set('background-repeat', rebuild(splitLayers(cs.backgroundRepeat), 'no-repeat'));
        set('background-position', rebuild(splitLayers(cs.backgroundPosition), '0% 0%'));
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
 * (`t-…`) or a decoration's (`att-…`); the base sheet's own pseudos are the
 * app's chrome, held by the geometry rules like any node. Every element in
 * the contrast job's scope that generates one is marked here
 * (`data-probe-lp-before` / `-after`); the runner captures the frame once
 * more with every marked pseudo at `visibility: hidden`
 * (`__lookPseudosHidden`) and compares the two frames inside every
 * protected box (`__protectedBoxes`), a device pixel in from each edge: a
 * pixel that changed is a look pseudo painting inside a protected box, and
 * the job fails. No capture where no look pseudo exists.
 */
const LOOK_RULE = /(?:^|[\s>+~,(])\.(?:t-[a-z0-9]+|att-[a-z0-9-]+)\b/;
const PSEUDO_AT = /::?(before|after)\b/;

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

/** The look pseudos generated in `scope`, marked; how many. */
function markLookPseudos(scope: ParentNode): number {
    for (const el of document.querySelectorAll('[data-probe-lp-before], [data-probe-lp-after]')) {
        el.removeAttribute('data-probe-lp-before');
        el.removeAttribute('data-probe-lp-after');
    }
    let n = 0;
    for (const rule of styleRules()) {
        for (const one of rule.selectorText.split(',')) {
            const pseudo = PSEUDO_AT.exec(one);
            if (pseudo === null || !LOOK_RULE.test(one)) continue;
            const host = one.replace(/::?(?:before|after)\b/g, '').trim() || '*';
            let hosts: NodeListOf<Element>;
            try {
                hosts = scope.querySelectorAll(host);
            } catch {
                throw new Error(`a look pseudo's selector the probe cannot match: ${one}`);
            }
            for (const el of hosts) {
                if (el.closest('.deck-stall') !== null) continue;
                const which = pseudo[1] as 'before' | 'after';
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
        if (owner.closest(CONTRAST_TEXT) !== null) continue;
        if (getComputedStyle(owner).visibility !== 'visible') continue;
        range.selectNodeContents(text);
        if ([...range.getClientRects()].every((r) => r.width === 0 || r.height === 0)) continue;
        out.add(describe(owner));
    }
    return [...out];
}

let lookPseudoSheetAdopted = false;

window.__lookPseudosHidden = async (hide: boolean) => {
    if (!lookPseudoSheetAdopted) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(
            'html[data-probe-lp-off] [data-probe-lp-before]::before,html[data-probe-lp-off] [data-probe-lp-after]::after{visibility:hidden!important}',
        );
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        lookPseudoSheetAdopted = true;
    }
    document.documentElement.toggleAttribute('data-probe-lp-off', hide);
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    return document.querySelectorAll('[data-probe-lp-before], [data-probe-lp-after]').length;
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
    preparedScope = scope;
    const lookPseudos = markLookPseudos(scope);
    const uncovered = uncoveredText(scope);
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
    for (const node of preparedNodes) {
        for (const el of [node, ...node.querySelectorAll<HTMLElement>('*')]) {
            if (el.dataset['probeColor'] === undefined) {
                el.dataset['probeColor'] = el.style.color;
                el.dataset['probeInk'] ??= getComputedStyle(el).color;
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
            el.style.setProperty('color', 'transparent', 'important');

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
     * hide. A pseudo inherits the inline transparent ink where it sets no
     * colour of its own. A whole-box money read is safe from a pseudo's glyph
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
        // How many nodes matched `CONTRAST_TEXT`, before any was dropped.
        nodes: preparedNodes.length,
        // The stalls that wore the rain, and how many had it at its brightest.
        rain,
        // The signs that wore Grid horizon, painted as they are.
        horizon,
        // The look pseudos in scope, marked for D6(i)'s second frame.
        lookPseudos,
        // Visible text no target reads, reported (step 5b).
        uncovered,
        // The sign name's animations and opacity where it was read (D14).
        nameChrome: nameChrome(scope),
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
const result = document.createElement('pre');
result.id = 'layout-result';
result.hidden = true;
document.body.append(result);
const verdict = {
    viewport: window.innerWidth,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    /*
     * The tall-portrait half of `window.css`, echoed back so the runner
     * can refuse a pass the media feature never reached — the same guard
     * `reducedMotion` gives that pass. It is `portrait` with the
     * `max-height: 1200px` block NOT matching: a phone and a counter
     * tablet are portrait too and take the short variant, so the stacked
     * column a wall-mounted screen paints is a third state, and asking
     * only for `portrait` would have certified it from a 390px phone.
     */
    portraitTall: matchMedia('(orientation: portrait) and (min-height: 1201px)')
        .matches,
    /*
     * The other portrait block — `(orientation: portrait) and
     * (max-height: 1200px)` — echoed back for its own pass's guard.
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
    portraitShort: matchMedia('(orientation: portrait) and (max-height: 1200px)')
        .matches,
    screensMeasured: measured,
    /*
     * Every `t-*` class a painted `.stall` wore — the look this page
     * actually measured, not the one it was asked for. The runner refuses
     * a pass whose set is not exactly what it ran (`{t-workshop}` for the
     * kit, the three shipped classes otherwise).
     */
    sheetClasses: [...sheetClassesPainted].sort(),
    clipSkips,
    clipChecks,
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
    wallControlChecks,
    statusLineChecks,
    wallControlRoles,
    wallSlivers: [...wallSlivers].sort(),
    floorNamedChecks,
    outlineChecks,
    moneyChecks,
    atRestSetAside,
    buntingChecks,
    haloChecks,
    outlinedTargets: [...outlinedTargets].sort(),
    smallText: [...smallTextElsewhere].sort(),
    ladderTiers,
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
