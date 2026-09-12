/**
 * The marquee: a line that is cut runs a bounded number of times, then rests
 * at its start.
 *
 * Where a row or a stream card has one line for a name or the seller's
 * words and the text is wider than the line, the text used to wrap (a
 * two-line clamp on the listing row, 2026-08-30) or be cut with an ellipsis.
 * Since 2026-09-09 (owner) it **runs**: holds at its start, travels left
 * until its end is in view, holds there so the tail can be read, and then
 * rests at its start with the ellipsis.
 *
 * **How many times is the surface's, not this module's** (owner, 2026-09-12).
 * A shop row runs `ROW_MARQUEE.runs` times — one pass is easy to miss on a
 * page somebody is reading at their own pace — and a stream card runs once,
 * because the carousel brings it back and `cardDwell` sizes the card's stay
 * from the run still ahead. The two are one table (`MarqueeSurface`) so a
 * call site cannot pair one surface's pace with the other's count.
 *
 * **Bounded, and the bound is the rule.** The passes are one CSS animation
 * with `animation-iteration-count`, so the compositor owns the timing and
 * this module owns only "has this line had its turn". A loop is what the
 * bound refuses: a mover that runs for ever beside other content is what
 * WCAG 2.2.2 names, and on a phone it is a compositor animation that never
 * stops. The whole text is one press away on the face.
 *
 * **One text node, always.** The ticker trick — the text twice, scrolling
 * seamlessly — would put a name twice into `textContent`, into a screen
 * reader and into every test that reads a row. The inner `.mq-run` span
 * holds the one node and is the thing that moves; the outer cell clips it
 * with `overflow: hidden`, which is also why the probe's spill rule ignores
 * it: a marquee never paints outside its cell.
 *
 * **`transform`, never `position`.** The probe collects every positioned
 * node as a decoration and refuses one over the asked amount; a transform
 * on a child changes no layout box, so the name floor and the price
 * measure what they measured before.
 *
 * **Measured, not guessed, and measured twice.** `scrollWidth - clientWidth`
 * on the laid-out tree, read for every node first and written after
 * (a write between reads is a layout per row — thirty rows, thirty
 * layouts, on a paint a stranger's dust can force). Then again when
 * `document.fonts` is ready: both faces are `font-display: swap`, so the
 * first paint measures the fallback face and every width changes when the
 * real one lands. A floor of a few pixels, because `scrollWidth` is an
 * integer and Neo's tracking leaves a fraction after the last glyph that
 * would arm a one-pixel run for ever. happy-dom lays out nothing, so the
 * measure is injectable and the layout probe is the judge of the real thing.
 *
 * **A repaint mid-run continues the run, and a finished one stays finished.**
 * `renderStall` rebuilds every row on every live paint; a run that restarted
 * from zero on each book tick would never reach its end on a busy stall. The
 * moment a key started is kept and a rebuilt node picks the run up where it
 * was through a negative `animation-delay`.
 *
 * **An entry leaves when its line leaves the tree, never on a clock**
 * (2026-09-12). A time horizon bounded the map and defeated the bound it was
 * meant to protect: the paint after it found nothing and armed the line
 * again, and since `renderStall` measures twice per paint
 * (`remeasureWhenFontsReady`) the two halves of one paint were enough — the
 * first rested the line and evicted it, the second re-armed it. Dropping
 * what this paint did not see bounds the map by what is on screen, which is
 * smaller, and makes the count mean something: a line rests for as long as
 * its screen keeps painting it, and runs again when that screen comes back.
 * Test: `a-finished-run-does-not-start-again-on-a-later-repaint`.
 */

export type MarqueeKind = 'name' | 'words';

/**
 * Pixels per second, per kind. The rows' pace, ten slower on both kinds
 * since 2026-09-12 (owner) — a row is read at arm's length and three passes
 * of it, so the line may take its time. The words stay quicker than the name
 * at the same distance: a name is recognised and a sentence is read, and in
 * practice the sentence is the longer line by far.
 */
export const ROW_SPEED_PX_PER_S: Readonly<Record<MarqueeKind, number>> = { name: 30, words: 50 };
/** The stream is read from across a room at 1920 wide: faster, and untouched. */
export const STREAM_SPEED_PX_PER_S: Readonly<Record<MarqueeKind, number>> = { name: 60, words: 90 };
/**
 * The hold at each end — the delay before the first pass, and the tail of
 * every pass. Above the contrast sampler's 400 ms freeze, on purpose.
 */
export const MARQUEE_HOLD_MS = 1_500;
/** The longest **single pass**; a surface's own count multiplies it. */
export const MARQUEE_MAX_RUN_MS = 12_000;
/** Below this the "overflow" is rounding, not text. */
export const MARQUEE_MIN_OVERFLOW_PX = 4;

export type MarqueeSpeeds = Readonly<Record<MarqueeKind, number>>;

/**
 * One surface's whole marquee policy: how fast a cut line travels, and how
 * many passes it makes before it rests.
 *
 * **One table, never two constants at a call site.** The pace and the count
 * are a pair — three passes at the stream's pace is a different thing from
 * three at the rows' — and a call site free to mix them is a call site that
 * eventually does.
 */
export type MarqueeSurface = {
    readonly speeds: MarqueeSpeeds;
    /** Passes a cut line makes. At least one; `1` is one pass and then rest. */
    readonly runs: number;
};

/** The shop's rows: slower, and three passes (owner, 2026-09-12). */
export const ROW_MARQUEE: MarqueeSurface = { speeds: ROW_SPEED_PX_PER_S, runs: 3 };
/**
 * The stream overlay: one pass, unchanged.
 *
 * Not a taste decision to revisit lightly — `cardDwell` in `app.ts` sizes a
 * card's stay from `lastMarqueeRunAheadMs()`, so the count here is inside the
 * published rhythm on `/stream` that `the-stream-guide-figures-are-the-apps-own`
 * pins. A card runs again each time the carousel brings it back, which is
 * what the "leaves the tree" rule above gives it for free.
 */
export const STREAM_MARQUEE: MarqueeSurface = { speeds: STREAM_SPEED_PX_PER_S, runs: 1 };

type Measure = (node: HTMLElement) => number;

const realMeasure: Measure = (node) => node.scrollWidth - node.clientWidth;
let measure: Measure = realMeasure;

/** Tests inject a measure: happy-dom lays out nothing and every overflow is 0. */
export function setMarqueeMeasure(next: Measure | undefined): void {
    measure = next ?? realMeasure;
}

type Run = { startedAtMs: number; totalMs: number };
/** What the last `applyMarquees` found still ahead: the carousel's wait. */
let lastRunAhead = 0;

export function lastMarqueeRunAheadMs(): number {
    return lastRunAhead;
}
/**
 * Runs in flight or finished, by key and overflow. An entry leaves when the
 * paint stops carrying its line — never on a clock, which is what let a
 * finished run start again.
 */
const runs = new Map<string, Run>();
let clock: () => number = () => Date.now();

export function setMarqueeClock(next: (() => number) | undefined): void {
    clock = next ?? (() => Date.now());
}

export function resetMarqueesForTests(): void {
    runs.clear();
    lastRunAhead = 0;
    measure = realMeasure;
    clock = () => Date.now();
}

/**
 * Mark a node as a line that may run. The text becomes one inner span, so
 * the cell can clip while the span moves; `textContent` is unchanged.
 */
export function marqueeNode<T extends HTMLElement>(node: T, kind: MarqueeKind, key: string): T {
    const text = node.textContent ?? '';
    node.textContent = '';
    const run = document.createElement('span');
    run.className = 'mq-run';
    run.textContent = text;
    node.append(run);
    node.setAttribute('data-mq', kind);
    node.setAttribute('data-mq-key', key);
    return node;
}

/** The run a cut line owes, in milliseconds, before the holds. */
export function marqueeRunMs(overflowPx: number, kind: MarqueeKind, speeds: MarqueeSpeeds): number {
    return Math.min(MARQUEE_MAX_RUN_MS, Math.round((overflowPx / speeds[kind]) * 1000));
}

/**
 * Measure every marked line under `root` and arm the ones that are cut.
 * Returns the longest whole cycle (hold + every pass + hold) still ahead on
 * this tree, or 0 — what the stream's carousel waits for.
 *
 * **The surface is required, never defaulted.** A default would be one
 * surface's policy quietly applied to the other's tree — three passes at the
 * rows' pace over a stream card, or a second measure re-arming what the first
 * rested. Two call sites, both explicit.
 *
 * **What this paint did not carry, this module forgets.** The keys built
 * below are the lines on screen; every other entry is dropped at the end. A
 * line that is still painted keeps its place in its cycle across any number
 * of repaints, and one whose screen has gone starts again when that screen
 * comes back — which is exactly a stream card's "again each appearance" and
 * a row's "again when you come back to the shop", from one rule.
 */
export function applyMarquees(root: ParentNode, surface: MarqueeSurface): number {
    const nodes = [...root.querySelectorAll<HTMLElement>('[data-mq]')];
    // Read everything first, then write: a write between reads is a layout
    // per row.
    const overflows = nodes.map((node) => measure(node));
    const now = clock();
    const passes = Math.max(1, Math.trunc(surface.runs));
    const painted = new Set<string>();
    let longest = 0;
    for (const [i, node] of nodes.entries()) {
        const overflow = overflows[i] ?? 0;
        const run = node.querySelector<HTMLElement>('.mq-run');
        if (run === null || overflow < MARQUEE_MIN_OVERFLOW_PX) {
            // Not a cut line, so it holds no key: any entry it had leaves
            // with the sweep below, and a line that is cut again runs again.
            continue;
        }
        const kind: MarqueeKind = node.getAttribute('data-mq') === 'words' ? 'words' : 'name';
        const key = `${node.getAttribute('data-mq-key') ?? ''}:${kind}:${overflow}`;
        // Before the rest-check below, not after: a line that has had its
        // turn is still on screen, and forgetting it is what made the next
        // paint start it again.
        painted.add(key);
        const runMs = marqueeRunMs(overflow, kind, surface.speeds);
        // One pass is the travel and the hold at its end. The hold is inside
        // the pass rather than after the last one, so every pass ends with
        // the tail in view — which is the half of "travels, holds, rests"
        // that was written down and never rendered: `animationend` stripped
        // the attribute the instant the travel finished (owner, 2026-09-12).
        const passMs = runMs + MARQUEE_HOLD_MS;
        // The start hold is the delay, once, before the first pass — so the
        // whole cycle is that plus every pass. At one pass this is exactly
        // what it always was, which is why no stream number moves.
        const totalMs = MARQUEE_HOLD_MS + passes * passMs;
        let started = runs.get(key);
        if (started !== undefined && now - started.startedAtMs >= started.totalMs) {
            // Had its passes while this screen has been up: it rests at its
            // start, cut.
            continue;
        }
        if (started === undefined) {
            started = { startedAtMs: now, totalMs };
            runs.set(key, started);
        }
        const elapsed = now - started.startedAtMs;
        node.setAttribute('data-marquee', '');
        run.style.setProperty('--mq-shift', `-${overflow}px`);
        run.style.setProperty('--mq-ms', `${passMs}ms`);
        /*
         * The hold is the easing's, not a second animation and not a timer:
         * the pass travels to its end by `runMs` and the curve then stays
         * there for the rest of the pass. `linear()` takes the stops, so the
         * hold stays a fixed 1.5 s while the travel varies with the text —
         * a ratio expressed as keyframe percentages could not, because those
         * are global and this one is per line.
         *
         * Written as its own property and applied by a longhand *after* the
         * shorthand: a runtime without `linear()` drops this one declaration
         * and keeps an animation that simply travels, where an invalid
         * shorthand would have left no animation at all.
         */
        const travelPct = ((runMs / passMs) * 100).toFixed(2);
        run.style.setProperty('--mq-ease', `linear(0 0%, 1 ${travelPct}%, 1 100%)`);
        // The passes are the compositor's: one animation, N iterations. The
        // count is written even at one, so a node rebuilt by a paint of the
        // other surface can never wear the wrong one.
        run.style.setProperty('--mq-runs', `${passes}`);
        // The start hold is the delay; a rebuilt node picks the run up where
        // it was by owing less of it, negative delay and all.
        run.style.setProperty('--mq-delay', `${MARQUEE_HOLD_MS - elapsed}ms`);
        run.addEventListener('animationend', () => {
            // Rest at the start, cut. `animationend` fires once, after the
            // last iteration — `animationiteration` is the one between them.
            node.removeAttribute('data-marquee');
        });
        longest = Math.max(longest, totalMs - elapsed);
    }
    for (const key of [...runs.keys()]) {
        if (!painted.has(key)) {
            runs.delete(key);
        }
    }
    lastRunAhead = longest;
    return longest;
}

/**
 * The second measure, once the real faces have landed. Guarded by the
 * caller's own token so a paint that has since been replaced measures
 * nothing; a runtime without `document.fonts` (happy-dom) measures once.
 *
 * It runs against the same tree the synchronous measure just did, so it must
 * be handed the **same surface** — a second call under a different policy
 * would re-arm every line the first one rested.
 */
export function remeasureWhenFontsReady(
    root: ParentNode,
    stillCurrent: () => boolean,
    surface: MarqueeSurface,
): void {
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    const ready = fonts?.ready;
    if (ready === undefined) {
        return;
    }
    void ready.then(() => {
        if (stillCurrent()) {
            applyMarquees(root, surface);
        }
    });
}
