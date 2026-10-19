/**
 * The Cycle card's figure, fitted to its column after the paint (PLAN §
 * Open's first P1, 2026-10-14; the critic's preferred fix).
 *
 * The card printed its figure from a table of sizes by length, one per wall
 * layout, measured at the five sizes the probe paints. Off those sizes the
 * table was wrong in both directions: at 1024x768 (the counter tablet on its
 * side) `$999.99` read "$999.9" on Neo and `123,456.78 XEC` ran 40px into
 * the code, because the short landscape layout's steps were pixels measured
 * at 1280; and where the table was right for the widest look it shrank every
 * other look with it (145 cells on the probed sizes, `$999.99` on Modern at
 * the counter tablet 76.8 → 56.8px). A table can only be right where it was
 * measured. So the card now measures: after the tree is laid out, each Cycle
 * card's figure is tried at the size its layout and look give it, and only
 * when it does not stand inside its price column is it made smaller — the
 * sign's name ladder's precedent (`applyNameTiers`), with the size read off
 * the layout rather than chosen from rungs.
 *
 * **What "stands" means is the probe's own reading**
 * (`a-cycle-card-shows-every-digit-at-every-wall-size`): the price cell and
 * every line of its figure — `from`, the money node, ` XEC`, a look's tag
 * chrome — inside the price area's grid column, read from the head's
 * resolved tracks. Columns do not overlap, so a figure inside its own is
 * under neither the code nor the picture. **And the money node's own text
 * inside the money node's box, clear of its `from` and its unit**
 * (`a-cycle-figure-never-runs-under-its-own-unit`, the wall-offsize critic's
 * item 1): the column holds the amount as one span, and a figure whose
 * track shrank under it ran on under ` XEC` inside that span.
 *
 * **The shapes, in order**, each at the largest size up to the design size
 * at which it stands, and taken only at `WALL_FIGURE_MIN_PX` or more:
 *
 * 1. one line, as designed;
 * 2. a listing's `from` on a line of its own above the figure, ` XEC` beside
 *    it (`data-wall-wrap="stack"`) — the stream card's tier-3 shape;
 * 3. the figure broken after its commas (`data-wall-wrap="break"`, only a
 *    figure `moneyFigure` built with breaks) at the largest size at which it
 *    stands at any number of lines, capped by its design size, down to
 *    `WALL_FIGURE_FLOOR_PX` (D-2026-10-19-03 (3); it was
 *    `WALL_FIGURE_MIN_PX` and no larger until 2026-10-20), its card then
 *    held clear of the status line (`settleBreak`). No group is split: the
 *    pieces break only at their `<wbr>`s and the last group rides with its
 *    unit (`.fig-end`).
 *
 * A figure that has no break and does not stand at `WALL_FIGURE_MIN_PX` in
 * its last one-line shape is made smaller than it, to the floor: a smaller
 * figure is a figure, a cut one is a different number (a figure under 12
 * characters, as `wallFigureTier` counts, is built with no break).
 *
 * **The digits stay in one node**: the size is the money node's own inline
 * `font-size`, which no rule in a look sheet out-ranks (the look lint
 * refuses `!important`), so a look that sizes the Cycle figure gives the
 * size the fit starts from and never a size the fit cannot take down. **An
 * animation and a transition do out-rank it** — a keyframe's value beats an
 * inline one, and a running transition beats every declaration (the
 * wall-offsize critic's item 3; until 2026-10-20 this said "no look sheet
 * can out-rank", which was false) — so the fit holds every transition on the
 * card off while it reads (`holdStill`), and the look lint refuses a
 * transition of a size on a box that may be a money node and a size in any
 * keyframe (`a-look-never-animates-a-money-nodes-size`). The money node's
 * text is untouched; `moneyFigure`'s one `role="img"` name stands.
 *
 * **When it runs**: after every wall paint (the tree is new), again when the
 * fonts land (a face that lands late changes every width), and when the
 * frame changes size without a paint (a window resized, a tablet turned) —
 * a `ResizeObserver` on the frame, one per root, replaced at every paint.
 * Each run starts from the design size, so a figure given back its room
 * grows back. Read with the card's own turn and its tag's sway taken off
 * (Rural tilts every third card and sways its tag, and an axis-aligned box
 * of a swaying tag changes with the moment), and along the frame's own
 * inline axis, so a screen turned by `data-turn` is measured as it reads.
 *
 * Cost, stated: a money figure's size depends on layout. Each read is a
 * layout of the card: five to nine a card on average over the probe's wall
 * passes (0.3–0.8s a pass, 2026-10-19), 43 at most, on the Cycle card alone.
 */

/**
 * The smallest size the Cycle card prints its figure on one line or stacked;
 * past it a figure built with breaks breaks after its commas, at the largest
 * size it stands at. And the floor a card past the status line gives down to.
 */
export const WALL_FIGURE_MIN_PX = 32;
/** The smallest size the fit goes to. A figure that does not stand even here is the probe's to fail. */
export const WALL_FIGURE_FLOOR_PX = 16;
/** How much larger a stacked listing's figure must come out than one line's for the extra line to be worth it. */
const STACK_GAIN = 1.15;

/** One read of a Cycle card, along the frame's own axes. */
export type WallFigureRead = {
    /** The money node's font size, px. */
    size: number;
    /** The price area's grid column, inline. */
    room: number;
    /** The price cell with every line of its figure, inline. */
    need: number;
    /** The money node's lines laid end to end, inline: its width on one line. */
    figure: number;
    /** The money node's widest line, inline. */
    widest: number;
    /** How many lines the money node takes. */
    lines: number;
    /** The money node's block size. */
    block: number;
    /** How far the card runs past the status line's top (zero or less: clear of it). */
    over: number;
    /** The cell and every line inside the column, and the money node's text inside its own box, clear of its `from` and its unit. */
    fits: boolean;
};

export type WallFigureGauge = (head: HTMLElement, figure: HTMLElement) => WallFigureRead | undefined;

type Shape = 'line' | 'stack' | 'break';

type Span = { lo: number; hi: number };

/** A rect along the frame's inline axis: a quarter turn puts that axis on the viewport's vertical. */
function along(r: DOMRect, turn: string | null): Span {
    if (turn === 'cw') return { lo: r.top, hi: r.bottom };
    if (turn === 'ccw') return { lo: -r.bottom, hi: -r.top };
    return { lo: r.left, hi: r.right };
}

/** A rect along the frame's block axis (a clockwise turn points it at the viewport's left). */
function across(r: DOMRect, turn: string | null): Span {
    if (turn === 'cw') return { lo: -r.right, hi: -r.left };
    if (turn === 'ccw') return { lo: r.left, hi: r.right };
    return { lo: r.top, hi: r.bottom };
}

/** The column index of `area` in a computed `grid-template-areas`, or -1. */
function areaColumn(areas: string, area: string): number {
    for (const row of areas.matchAll(/"([^"]*)"/g)) {
        const at = row[1]!.trim().split(/\s+/).indexOf(area);
        if (at >= 0) return at;
    }
    return -1;
}

/** The client rects of a node's contents that paint. */
function lineRects(node: Node): DOMRect[] {
    const range = document.createRange();
    range.selectNodeContents(node);
    return [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
}

/**
 * Whether two runs of text meet: they overlap along the line, and their
 * middle three fifths overlap across it. A content area runs past its ink
 * above and below, so a `from` on the row above the figure meets the
 * figure's content area with no ink there; the middle of a run is where
 * its digits are.
 */
function textsMeet(a: readonly DOMRect[], b: readonly DOMRect[], turn: string | null): boolean {
    const middle = (r: DOMRect): Span => {
        const s = across(r, turn);
        const fifth = (s.hi - s.lo) / 5;
        return { lo: s.lo + fifth, hi: s.hi - fifth };
    };
    return a.some((ra) =>
        b.some((rb) => {
            const la = along(ra, turn);
            const lb = along(rb, turn);
            const ma = middle(ra);
            const mb = middle(rb);
            return Math.min(la.hi, lb.hi) - Math.max(la.lo, lb.lo) > 0.5 && Math.min(ma.hi, mb.hi) - Math.max(ma.lo, mb.lo) > 0.5;
        }),
    );
}

const realGauge: WallFigureGauge = (head, figure) => {
    const cell = figure.closest<HTMLElement>('.item-p');
    const amount = figure.parentElement;
    if (cell === null || amount === null) return undefined;
    const turn = head.closest('.shop-window')?.getAttribute('data-turn') ?? null;
    const hcs = getComputedStyle(head);
    const tracks = hcs.gridTemplateColumns
        .split(/\s+/)
        .filter((t) => t.endsWith('px'))
        .map(Number.parseFloat);
    const gap = Number.parseFloat(hcs.columnGap) || 0;
    const start = along(head.getBoundingClientRect(), turn).lo + Number.parseFloat(hcs.borderLeftWidth) + Number.parseFloat(hcs.paddingLeft);
    const box = along(cell.getBoundingClientRect(), turn);
    let index = areaColumn(hcs.gridTemplateAreas, 'price');
    if (index < 0) {
        // A look that names no areas: the track the cell starts in.
        for (let i = 0, at = start; i < tracks.length; at += tracks[i]! + gap, i += 1) {
            if (box.lo >= at - 1 && box.lo <= at + tracks[i]! + 1) index = i;
        }
    }
    if (index < 0 || index >= tracks.length) return undefined;
    let lo = start;
    for (let i = 0; i < index; i += 1) lo += tracks[i]! + gap;
    const room = tracks[index]!;
    if (!(room > 0)) return undefined;
    const spans = [box, ...lineRects(amount).map((r) => along(r, turn))];
    const need = { lo: Math.min(...spans.map((s) => s.lo)), hi: Math.max(...spans.map((s) => s.hi)) };
    // The money node's lines: its rects grouped by where they stand across.
    const rows = new Map<number, Span>();
    for (const r of lineRects(figure)) {
        const key = Math.round(across(r, turn).lo / 2);
        const line = along(r, turn);
        const row = rows.get(key);
        rows.set(key, row === undefined ? line : { lo: Math.min(row.lo, line.lo), hi: Math.max(row.hi, line.hi) });
    }
    const widths = [...rows.values()].map((row) => row.hi - row.lo);
    const status = head.closest('.stall-scroll')?.querySelector<HTMLElement>('.sw-status');
    const card = head.parentElement ?? head;
    const statusTop = status === null || status === undefined ? Number.POSITIVE_INFINITY : across(status.getBoundingClientRect(), turn).lo;
    // The money node's own text inside its own box, and clear of its
    // `from` and its unit (the wall-offsize critic's item 1): in the stacked
    // shape the figure's track once shrank under its unwrapped digits, so
    // they ran on under ` XEC` — inside the column, which the span above
    // reads as one, and the fit took a size at which "XEC" printed over the
    // last digit. Held here by the fit's own reading; the probe holds it
    // apart (`a-cycle-figure-never-runs-under-its-own-unit`).
    const inks = lineRects(figure);
    const own = along(figure.getBoundingClientRect(), turn);
    const inside = inks.every((r) => {
        const s = along(r, turn);
        return s.lo >= own.lo - 0.5 && s.hi <= own.hi + 0.5;
    });
    const clear = [...amount.querySelectorAll(':scope > .item-from, :scope > .item-u')].every((other) => !textsMeet(inks, lineRects(other), turn));
    const fits = need.lo >= lo - 0.5 && need.hi <= lo + room + 0.5 && inside && clear;
    return {
        size: Number.parseFloat(getComputedStyle(figure).fontSize),
        room,
        need: need.hi - need.lo,
        figure: widths.reduce((a, b) => a + b, 0),
        widest: Math.max(0, ...widths),
        lines: rows.size,
        block: across(figure.getBoundingClientRect(), turn).hi - across(figure.getBoundingClientRect(), turn).lo,
        over: across(card.getBoundingClientRect(), turn).hi - statusTop,
        fits,
    };
};

let gauge: WallFigureGauge = realGauge;

/** Tests inject a gauge: happy-dom lays out nothing, and every figure would stand. */
export function setWallFigureGauge(next: WallFigureGauge | undefined): void {
    gauge = next ?? realGauge;
}

function dress(head: HTMLElement, figure: HTMLElement, shape: Shape, px: number | undefined): void {
    if (shape === 'line') head.removeAttribute('data-wall-wrap');
    else head.setAttribute('data-wall-wrap', shape);
    if (px === undefined) figure.style.removeProperty('font-size');
    else figure.style.setProperty('font-size', `${px}px`);
}

/** Whether the read stands in `shape`: inside its column, and on one line unless it may break. */
function stands(read: WallFigureRead, shape: Shape): boolean {
    return read.fits && (shape === 'break' || read.lines <= 1);
}

/** How close the fit comes to the largest size that stands, px. */
const FIT_PRECISION_PX = 0.5;

/**
 * The largest size from `start` down to `floor` at which the card stands in
 * `shape` — the size left set — or undefined, the floor left set, when none
 * does. Until a size stands, each try scales by what the last read says the
 * figure needs on one line (the money node scales with its size, `from`,
 * ` XEC` and a tag's chrome do not), and at least 1% down, so a read that
 * does not move cannot loop. **That scale is an estimate, and it can land
 * far under the answer**: a figure Chrome broke at a `<wbr>` reads its
 * price cell stretched across the column, so what stands beside the figure
 * reads larger than it is — measured, Neo's `$1,234,567.89` on the tall wall
 * was taken at 66.7px where one line stands at 113px. So once a size
 * stands below one that did not, the gap between the two is halved, to
 * `FIT_PRECISION_PX`, and the largest size read standing is the one taken.
 */
function settle(head: HTMLElement, figure: HTMLElement, shape: Shape, start: number, floor: number): number | undefined {
    let px = Math.max(start, floor);
    // The largest size read standing, and the smallest read not standing.
    let stood: number | undefined;
    let failed: number | undefined;
    for (let tries = 0; tries < 14; tries += 1) {
        dress(head, figure, shape, px);
        const read = gauge(head, figure);
        if (read === undefined) return undefined;
        if (stands(read, shape)) stood = px;
        else failed = px;
        if (stood !== undefined) {
            if (failed === undefined || failed - stood <= FIT_PRECISION_PX) break;
            const half = Math.floor(((stood + failed) / 2) * 10) / 10;
            if (half <= stood) break;
            px = half;
            continue;
        }
        if (px <= floor) break;
        const rest = read.need - read.widest;
        const wanted = shape === 'break' ? read.need : rest + read.figure;
        const scale = Math.min((read.room - rest) / Math.max(wanted - rest, 1), read.room / Math.max(wanted, 1), 0.99);
        px = Math.max(Math.floor(px * Math.max(scale, 0) * 10) / 10, floor);
    }
    dress(head, figure, shape, stood ?? floor);
    return stood;
}

/**
 * A card that runs past the status line with its figure standing: the
 * figure gives what it can, down to `WALL_FIGURE_MIN_PX`, while giving moves
 * the card's edge — a card held down by its code or its sign keeps its
 * figure's size, and the probe's status-line rule says so.
 */
function relieve(head: HTMLElement, figure: HTMLElement, shape: Shape, start: number, tilt: number): { px: number; over: number } {
    let px = start;
    dress(head, figure, shape, px);
    let read = gauge(head, figure);
    for (let tries = 0; tries < 6 && read !== undefined && read.over + tilt > 0.5 && px > WALL_FIGURE_MIN_PX; tries += 1) {
        const over = read.over + tilt + 0.5;
        const scale = read.block > over ? (read.block - over) / read.block : 0;
        const next = Math.max(Math.floor(px * Math.min(scale, 0.99) * 10) / 10, WALL_FIGURE_MIN_PX);
        dress(head, figure, shape, next);
        const after = gauge(head, figure);
        if (after === undefined || after.over > read.over - 0.5 || !stands(after, shape)) {
            dress(head, figure, shape, px);
            break;
        }
        px = next;
        read = after;
    }
    return { px, over: (read?.over ?? 0) + tilt };
}

/**
 * Hold `nodes` still for a read, and hand back what lets them move again.
 *
 * - **Every transition finished and off** (D-2026-10-19-03 (1), the owner's
 *   "as recommended"; the wall-offsize critic's item 3): a running
 *   transition out-ranks every declaration, the fit's inline size among
 *   them, so a look's `transition: all` on the figure read a size halfway to
 *   the one the read before set — measured on a planted Neo, 22 of 35 cards
 *   moved after a resize, two left at 79.92px past their 65.5px design.
 *   Each running transition is finished, then `transition: none !important`
 *   holds the next ones off while the fit sets and reads sizes. On release
 *   the style the reads left is settled (a computed read) before the
 *   transitions come back, so the size the fit took is the style a
 *   transition starts from, and none runs from the last size read to it.
 * - **The turn and the sway off** (`turn`, the default): `transform` and
 *   `rotate` set to none, important, so an animation cannot out-rank them.
 *   Rural tilts every third card and sways its tag, and an axis-aligned box
 *   of a swaying tag changes with the moment.
 *
 * Through the CSSOM and never the `style` attribute: the page's policy
 * refuses an inline style written as an attribute (`style-src 'self'`), and a
 * refused restore would leave the read's own `none` on the card. An
 * animation's keyframe out-ranks the fit's size too, and is not held here
 * (holding `animation` would restart every look's motion on every fit): the
 * look lint refuses a keyframe that names a size
 * (`a-look-never-animates-a-money-nodes-size`).
 */
export function holdStill(nodes: readonly HTMLElement[], { turn = true }: { turn?: boolean } = {}): () => void {
    const held = turn ? (['transform', 'rotate', 'transition'] as const) : (['transition'] as const);
    const kept = nodes.map((node) => held.map((prop) => [prop, node.style.getPropertyValue(prop), node.style.getPropertyPriority(prop)] as const));
    for (const node of nodes) {
        for (const running of node.getAnimations?.() ?? []) {
            if (typeof CSSTransition === 'function' && running instanceof CSSTransition) running.finish();
        }
        for (const prop of held) node.style.setProperty(prop, 'none', 'important');
    }
    return () => {
        // The turn back first, with no transition to run it, and the style
        // settled; then the transitions, which find nothing to move.
        nodes.forEach((node, i) => {
            for (const [prop, value, priority] of kept[i]!) {
                if (prop === 'transition') continue;
                if (value === '') node.style.removeProperty(prop);
                else node.style.setProperty(prop, value, priority);
            }
        });
        for (const node of nodes) void getComputedStyle(node).fontSize;
        nodes.forEach((node, i) => {
            for (const [prop, value, priority] of kept[i]!) {
                if (prop !== 'transition') continue;
                if (value === '') node.style.removeProperty(prop);
                else node.style.setProperty(prop, value, priority);
            }
            if (node.style.length === 0) node.removeAttribute('style');
        });
    };
}

/** Fit one Cycle card's figure (see the module's docblock). */
function fitCard(head: HTMLElement): void {
    const figure = head.querySelector<HTMLElement>('.item-p > .item-a > .item-x');
    if (figure === null) return;
    const still = [head.parentElement, head, figure.closest<HTMLElement>('.item-p'), figure.parentElement, figure].filter(
        (node): node is HTMLElement => node !== null,
    );
    // Transitions off before the first size is taken off: with one on the
    // figure, taking the last fit's size off would run back to the design.
    const calm = holdStill(still, { turn: false });
    try {
        dress(head, figure, 'line', undefined);
        // The card as painted: a look that tilts it (Rural, every third card)
        // reaches lower than its box, and the status line is read as painted.
        const card = head.parentElement ?? head;
        const turn = head.closest('.shop-window')?.getAttribute('data-turn') ?? null;
        const painted = across(card.getBoundingClientRect(), turn).hi;
        fitStill(head, figure, still, card, turn, painted);
    } finally {
        calm();
    }
}

/** `fitCard` with the card's transitions held off: the turn and the sway off too, then the shapes. */
function fitStill(head: HTMLElement, figure: HTMLElement, still: readonly HTMLElement[], card: HTMLElement, turn: string | null, painted: number): void {
    const release = holdStill(still);
    try {
        const first = gauge(head, figure);
        if (first === undefined) return;
        const tilt = Math.max(0, painted - across(card.getBoundingClientRect(), turn).hi);
        const design = first.size;
        const stacks = head.querySelector('.item-p > .item-a > .item-from') !== null;
        const line = settle(head, figure, 'line', design, WALL_FIGURE_MIN_PX);
        // A listing's `from` on its own line, where that buys the figure a
        // size worth the line: past `STACK_GAIN` of what one line gets.
        const stack = stacks && line !== design ? settle(head, figure, 'stack', design, WALL_FIGURE_MIN_PX) : undefined;
        if (stack !== undefined && (line === undefined || stack > line * STACK_GAIN)) {
            const stacked = relieve(head, figure, 'stack', stack, tilt);
            // The stack's extra line is height: where the stacked card still
            // runs past the status line, one line that clears it wins.
            if (stacked.over <= 0.5 || line === undefined) return;
            if (relieve(head, figure, 'line', line, tilt).over > stacked.over) {
                dress(head, figure, 'stack', stacked.px);
            }
            return;
        }
        if (line !== undefined) {
            relieve(head, figure, 'line', line, tilt);
            return;
        }
        if (figure.querySelector('.fig-say') !== null) {
            settleBreak(head, figure, design, tilt);
            return;
        }
        settle(head, figure, stacks ? 'stack' : 'line', Math.min(design, WALL_FIGURE_MIN_PX), WALL_FIGURE_FLOOR_PX);
    } finally {
        release();
    }
}

/**
 * The broken shape's size (D-2026-10-19-03 (3), the owner's "as
 * recommended"; the wall-offsize critic's item 7): **the largest size at
 * which the broken figure stands, at any number of lines, capped by its
 * design size** — where it was `WALL_FIGURE_MIN_PX` and no larger. The
 * critic measured what that left on the table: none of 332 broken cards
 * stood on one line at 32px, but a break could be larger by a median of
 * 27–56px with the card clear of the status line (Neo's
 * `12,345,678,901.23` at 1280x900: 32px on two lines, standing at 56px on
 * three). Standing in the broken shape is one fact that grows with the
 * size — the widest piece, a comma group or the last group with its unit,
 * inside the figure's own box and the column — so `settle` finds it from the
 * design size down, to `WALL_FIGURE_FLOOR_PX`.
 *
 * More lines are more height, so the card is then held clear of the status
 * line as the other shapes are: where it runs past it at that size, the
 * largest size from `WALL_FIGURE_MIN_PX` up at which it clears (halved to
 * `FIT_PRECISION_PX`); where even that does not clear, the smaller of the
 * two only if giving moved the card's edge — a card held down by its code or
 * its sign keeps its figure's size, and the probe's status-line rule says
 * so. A figure whose pieces stand only under `WALL_FIGURE_MIN_PX` keeps the
 * size it stood at, as before.
 */
function settleBreak(head: HTMLElement, figure: HTMLElement, design: number, tilt: number): void {
    const stood = settle(head, figure, 'break', design, WALL_FIGURE_FLOOR_PX);
    if (stood === undefined || stood <= WALL_FIGURE_MIN_PX) return;
    const overAt = (px: number): number | undefined => {
        dress(head, figure, 'break', px);
        const read = gauge(head, figure);
        return read === undefined || !stands(read, 'break') ? undefined : read.over + tilt;
    };
    const high = overAt(stood);
    if (high === undefined || high <= 0.5) {
        dress(head, figure, 'break', stood);
        return;
    }
    const low = overAt(WALL_FIGURE_MIN_PX);
    if (low === undefined || low > 0.5) {
        dress(head, figure, 'break', low !== undefined && low < high - 0.5 ? WALL_FIGURE_MIN_PX : stood);
        return;
    }
    // Clear at the one-line size, past the line at the size that stands:
    // the largest size between them that clears.
    let clear = WALL_FIGURE_MIN_PX;
    let past = stood;
    for (let tries = 0; tries < 12 && past - clear > FIT_PRECISION_PX; tries += 1) {
        const mid = Math.floor(((clear + past) / 2) * 10) / 10;
        if (mid <= clear) break;
        const over = overAt(mid);
        if (over !== undefined && over <= 0.5) clear = mid;
        else past = mid;
    }
    dress(head, figure, 'break', clear);
}

/** The frame each root's observer watches, and the size it was last fitted at. */
const watching = new WeakMap<ParentNode, ResizeObserver>();

/**
 * What a paint measures beside the figure, run again when the frame changes
 * size with no paint (the wall-offsize critic's item 9): `before` the fit —
 * the sign's name ladder (`applyNameTiers`), whose rung moves the column the
 * card stands in — and `after` it, the marquees, whose runs are measured on
 * the lines the column leaves. Without them a turned tablet kept the name's
 * rung and the runs of the size it was painted at.
 */
export type WallRefit = {
    before?: (root: ParentNode) => void;
    after?: (root: ParentNode) => void;
};

/**
 * Fit every Cycle card's figure under `root`, after the tree is laid out, and
 * watch the wall's frame for a size change no paint follows, measuring
 * `refit`'s `before` and `after` again with the fit there. Inert where no
 * Cycle card is painted, and where nothing lays out (happy-dom). Test:
 * `the-cycle-figure-is-fitted-to-its-column`.
 */
export function fitWallFigures(root: ParentNode, refit: WallRefit = {}): void {
    for (const head of root.querySelectorAll<HTMLElement>(".shop-window[data-mode='cycle'] .sw-strip .item-head")) {
        fitCard(head);
    }
    watching.get(root)?.disconnect();
    watching.delete(root);
    const frame = root.querySelector<HTMLElement>(".shop-window[data-mode='cycle']");
    if (frame === null || typeof ResizeObserver !== 'function') return;
    let fittedAt = `${frame.clientWidth}x${frame.clientHeight}`;
    const observer = new ResizeObserver(() => {
        const now = `${frame.clientWidth}x${frame.clientHeight}`;
        if (now === fittedAt || !frame.isConnected) return;
        fittedAt = now;
        refit.before?.(root);
        for (const head of frame.querySelectorAll<HTMLElement>('.sw-strip .item-head')) {
            fitCard(head);
        }
        refit.after?.(root);
    });
    observer.observe(frame);
    watching.set(root, observer);
}

/** Stop watching the frame `root` painted last: the paint about to run throws it away. */
export function forgetWallFit(root: ParentNode): void {
    watching.get(root)?.disconnect();
    watching.delete(root);
}
