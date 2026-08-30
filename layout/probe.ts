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
import { renderStall } from '../src/ui/render';
import { decodeTheme, SHIPPED_THEMES } from '../src/domain/theme';
import {
    attachmentsForTheme,
    wornAttachments,
    type ShippedAttachment,
} from '../src/domain/attachments';
import { SCREENS, STATE_SCREENS, handlers } from './fixtures';

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
    const clip = node.closest('.stall-scroll')?.getBoundingClientRect();
    for (const [x, y] of points) {
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) {
            // Off screen is its own failure, reported by the viewport check.
            continue;
        }
        if (
            clip !== undefined &&
            (y < clip.top + 1 || y > clip.bottom - 1 || x < clip.left || x > clip.right)
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
        if (/^[\d.]+%$/.test(t)) return (Number.parseFloat(t) / 100) * size;
        if (/^[\d.]+px$/.test(t)) return Number.parseFloat(t);
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

function paint(screen: string, themeId: number, worn: readonly ShippedAttachment[]): void {
    const root = document.getElementById('app')!;
    const view = { ...SCREENS[screen]!, theme: decodeTheme(themeId), worn };
    renderStall(root, view, handlers);
}

/**
 * Every decorated stall a shipped look can produce, and no more than that.
 *
 * One occupant per slot is what keeps this linear: the alternative is 2^16
 * combinations per theme, which is a guard nobody would ever run. So each row
 * is measured alone, and then the all-worn case is measured once — the only
 * combination a picker can actually produce.
 */
function wornVariants(themeId: number): readonly (readonly ShippedAttachment[])[] {
    const rows = attachmentsForTheme(themeId);
    const all = wornAttachments(themeId, 0xffff);
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
    const scrim = root.querySelector('[data-role="sheet-scrim"]');
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
        const sheet = scrim.querySelector('.sheet');
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

    // The theme must reach the edges. Measured once at 375x812 as an 8px border
    // and 42% of the screen left unthemed, and invisible for two months because
    // the shipped default is white on a white canvas.
    const stall = root.querySelector('.stall');
    if (stall !== null && screen !== 'door') {
        const box = stall.getBoundingClientRect();
        if (box.top > 1 || box.left > 1 || box.right < window.innerWidth - 1) {
            fail('theme does not reach the edges', `stall box ${JSON.stringify(box.toJSON())}`);
        }
        if (box.height < window.innerHeight - 1) {
            fail('theme does not reach the bottom', `height ${box.height} < ${window.innerHeight}`);
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
    return out;
}

function checkOverTime(
    screen: string,
    themeId: number,
    themeLabel: string,
    worn: readonly ShippedAttachment[],
): Failure[] {
    paint(screen, themeId, worn);
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
function variantsFor(screen: string, themeId: number): readonly (readonly ShippedAttachment[])[] {
    const all = wornVariants(themeId);
    if (!STATE_SCREENS.has(screen) || all.length < 2) {
        return all;
    }
    return [all[0]!, all[all.length - 1]!];
}

/**
 * `?screens=a,b` limits a run to named screens. The reduced-motion pass uses
 * it: emulated media doubles the run, so it re-measures only the screens that
 * animate rather than paying for fourteen twice.
 */
function screensToRun(): string[] {
    const asked = new URLSearchParams(location.search).get('screens');
    if (asked === null) {
        return Object.keys(SCREENS);
    }
    // The asked list verbatim, unknown names dropped — `?screens=` measures
    // nothing on purpose (the contrast driver wants the hooks without paying
    // for a full measurement run). The verdict names what actually ran, so a
    // runner can refuse a vacuous green instead of trusting this filter.
    return asked.split(',').filter((name) => name in SCREENS);
}

/**
 * The apex paints `view.theme ?? DEFAULT_THEME` and never fetches, so the
 * door can only ever wear the default look. A door-under-Neo combination is
 * a screen no visitor can reach: its red is a false alarm (measured — the
 * Neo mini ink over the door's light ground), and its green is budget spent
 * certifying nothing.
 */
function themesFor(screen: string): readonly (typeof SHIPPED_THEMES)[number][] {
    return screen === 'door' ? SHIPPED_THEMES.slice(0, 1) : [...SHIPPED_THEMES];
}

const failures: Failure[] = [];
const measured = screensToRun();
for (const screen of measured) {
    for (const theme of themesFor(screen)) {
        for (const worn of variantsFor(screen, theme.id)) {
            const label =
                worn.length === 0
                    ? theme.label
                    : `${theme.label} + ${worn.map((a) => a.label).join(' + ')}`;
            failures.push(...checkOverTime(screen, theme.id, label, worn));
        }
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
 * could not tell they were wearing it.
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

for (const theme of SHIPPED_THEMES) {
    paint('offers', theme.id, []);
    const bare = paintSignature();
    for (const row of attachmentsForTheme(theme.id)) {
        paint('offers', theme.id, [row]);
        const bill = (check: string, detail: string): void => {
            failures.push({ screen: 'billboard', theme: theme.label, check, detail });
        };
        if (row.slot === 'mood') {
            const base = decodeTheme(theme.id);
            const p = row.palette ?? {};
            const bg = p.bg ?? base.bg;
            const surface = p.surface ?? base.surface;
            const dist =
                Math.abs(bg.r - base.bg.r) +
                Math.abs(bg.g - base.bg.g) +
                Math.abs(bg.b - base.bg.b) +
                Math.abs(surface.r - base.surface.r) +
                Math.abs(surface.g - base.surface.g) +
                Math.abs(surface.b - base.surface.b);
            if (dist < 60) {
                bill('a mood nobody can see', `${row.label} moves the canvas by ${dist}`);
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
     */
    r: number;
    /** What was measured, for a failure a person can find. */
    sel: string;
};

const CONTRAST_TEXT = [
    '[data-role="price"]',
    '.row.big dd',
    '.buy',
    '.addr',
    '[data-role="publish-hex"]',
    '[data-role="describe-hex"]',
    '[data-role="fiat"]',
    '[data-role="rate"]',
    // Every control on the publish/handoff path, and the dock: a theme file
    // pairing a literal ink with a token ground shipped these at 2.31:1
    // under the After-hours mood while this list looked elsewhere.
    '.mini',
    '.tab',
].join(', ');

declare global {
    interface Window {
        __contrastPrepare: (
            screen: string,
            themeId: number,
            wornAll: boolean,
        ) => { targets: ContrastTarget[] };
        __contrastBoxes: () => ContrastTarget[];
        __screens: string[];
        __themes: number[];
        __probeReady: boolean;
    }
}

window.__screens = Object.keys(SCREENS);
window.__themes = SHIPPED_THEMES.map((t) => t.id);

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

/** One node's sample box and static fields, or nothing worth sampling. */
function targetFor(node: HTMLElement): ContrastTarget | undefined {
    let box: { x: number; y: number; width: number; height: number } =
        node.getBoundingClientRect();
    // Content scrolled out of the shell's clip keeps its full rect, and a
    // box sampled where the page paints something else entirely reported
    // a studio control at 1.00:1 against the dock's selected-tab blue
    // sitting at those coordinates. Same boundary `coveredBy` already
    // holds: sample only what the clip lets the page paint.
    const clip = node.closest('.stall-scroll')?.getBoundingClientRect();
    if (clip !== undefined) {
        const x = Math.max(box.x, clip.x);
        const y = Math.max(box.y, clip.y);
        box = {
            x,
            y,
            width: Math.min(box.x + box.width, clip.right) - x,
            height: Math.min(box.y + box.height, clip.bottom) - y,
        };
    }
    if (box.width < 2 || box.height < 2) {
        return undefined;
    }
    const style = getComputedStyle(node);
    // The colour the glyphs would paint in: read from the blanking backup,
    // because a re-read after `__contrastPrepare` sees `transparent`.
    const ink = node.style.color === 'transparent' ? node.dataset['probeInk']! : style.color;
    node.dataset['probeInk'] = ink;
    const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;
    return {
        x: box.x,
        y: box.y,
        w: box.width,
        h: box.height,
        color: ink,
        r: Math.min(radius, box.width / 2, box.height / 2),
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
        pad: insideTransform(node) ? 8 : 0,
        sel: describe(node),
    };
}

/**
 * The boxes as they are RIGHT NOW, for the runner to read immediately before
 * the shot. The self-hosted face swaps metrics whenever it lands, the
 * fit-content dock re-centres, and coordinates taken at prepare time sampled
 * the neighbouring selected tab's ground — 1.20:1 reported on a dock whose
 * DOM held nothing but cream at those coordinates.
 */
window.__contrastBoxes = () =>
    preparedNodes
        .map((node) => targetFor(node))
        .filter((t): t is ContrastTarget => t !== undefined);

window.__contrastPrepare = (screen, themeId, wornAll) => {
    if (screen === 'door' && themeId !== SHIPPED_THEMES[0]!.id) {
        // The apex can only wear the default look — see themesFor.
        return { targets: [], pageH: 0 };
    }
    const worn = wornAll ? wornAttachments(themeId, 0xffff) : [];
    paint(screen, themeId, worn);
    // Freeze motion at an arbitrary instant so a streak is on screen, not
    // between frames.
    for (const a of document.getAnimations()) {
        a.pause();
        try {
            a.currentTime = 400;
        } catch {
            // A finished animation holds still on its own.
        }
    }
    // The same scoping as `measure()`: an open sheet is the surface being
    // read, and everything behind its scrim is deliberately dimmed — sampling
    // there compares an undimmed text colour against scrimmed paint, which
    // reported the address behind the publish sheet at 1.00:1.
    const scrim = document.querySelector('[data-role="sheet-scrim"]');
    const scope: ParentNode = scrim ?? document;
    preparedNodes = [...scope.querySelectorAll<HTMLElement>(CONTRAST_TEXT)];
    const targets: ContrastTarget[] = [];
    for (const node of preparedNodes) {
        const target = targetFor(node);
        if (target !== undefined) {
            targets.push(target);
        }
        // The descendants too: a child with its own ink (`.tab-name` holds
        // the seller's name in the muted channel) does not inherit the
        // blanking, and its glyphs sampled as "ground" reported the shop tab
        // at 1.17:1 — the ink compared against its own sibling text.
        for (const el of [node, ...node.querySelectorAll<HTMLElement>('*')]) {
            el.style.color = 'transparent';
            el.style.textShadow = 'none';
        }
    }
    // The runner grows the emulated viewport to this and repaints before the
    // shot: `captureBeyondViewport` does not reliably paint backgrounds below
    // the fold — a below-fold buy control sampled as near-white. The shell
    // hides its height inside its scroll region, so that is asked too: at the
    // grown viewport the region stretches and everything is on screen.
    const scrollRegion = document.querySelector('.stall-scroll');
    return {
        targets,
        pageH: Math.max(
            document.documentElement.scrollHeight,
            scrollRegion?.scrollHeight ?? 0,
        ),
    };
};

const result = document.createElement('pre');
result.id = 'layout-result';
result.textContent = JSON.stringify(
    {
        viewport: window.innerWidth,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        screensMeasured: measured,
        failures,
    },
    null,
    1,
);
document.body.append(result);
window.__probeReady = true;
