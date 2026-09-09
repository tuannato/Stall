/**
 * The marquee: a line that is cut runs once, then rests at its start.
 *
 * Where a row or a stream card has one line for a name or the seller's
 * words and the text is wider than the line, the text used to wrap (a
 * two-line clamp on the listing row, 2026-08-30) or be cut with an ellipsis.
 * Since 2026-09-09 (owner) it **runs**: holds at its start, travels left
 * until its end is in view, holds, and then rests at its start with the
 * ellipsis — once per key per page load, never a loop. Once, because a
 * mover that starts on its own and lasts past five seconds beside other
 * content is what WCAG 2.2.2 names, and because a loop is a compositor
 * animation running for ever on a phone. The whole text is one press away
 * on the face.
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
 * **A repaint mid-run continues the run.** `renderStall` rebuilds every row
 * on every live paint; a run that restarted from zero on each book tick
 * would never reach its end on a busy stall. The moment a key started is
 * kept, bounded (entries leave once their run is over), and a rebuilt node
 * picks the run up where it was through a negative `animation-delay`.
 */

export type MarqueeKind = 'name' | 'words';

/** Pixels per second, per kind. The rows' pace; the stream has its own. */
export const ROW_SPEED_PX_PER_S: Readonly<Record<MarqueeKind, number>> = { name: 40, words: 60 };
/** The stream is read from across a room at 1920 wide: faster. */
export const STREAM_SPEED_PX_PER_S: Readonly<Record<MarqueeKind, number>> = { name: 60, words: 90 };
/** The hold at each end. Above the contrast sampler's 400 ms freeze, on purpose. */
export const MARQUEE_HOLD_MS = 1_500;
/** The longest run: a 178-character name at row pace would take ~42 s. */
export const MARQUEE_MAX_RUN_MS = 12_000;
/** Below this the "overflow" is rounding, not text. */
export const MARQUEE_MIN_OVERFLOW_PX = 4;

export type MarqueeSpeeds = Readonly<Record<MarqueeKind, number>>;

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
/** Runs in flight or finished, by key and overflow; entries leave once over. */
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
 * Returns the longest whole run (hold + run + hold) still ahead on this
 * tree, or 0 — what the stream's carousel waits for.
 */
export function applyMarquees(root: ParentNode, speeds: MarqueeSpeeds = ROW_SPEED_PX_PER_S): number {
    const nodes = [...root.querySelectorAll<HTMLElement>('[data-mq]')];
    // Read everything first, then write: a write between reads is a layout
    // per row.
    const overflows = nodes.map((node) => measure(node));
    const now = clock();
    let longest = 0;
    for (const [i, node] of nodes.entries()) {
        const overflow = overflows[i] ?? 0;
        const run = node.querySelector<HTMLElement>('.mq-run');
        if (run === null || overflow < MARQUEE_MIN_OVERFLOW_PX) {
            continue;
        }
        const kind: MarqueeKind = node.getAttribute('data-mq') === 'words' ? 'words' : 'name';
        const key = `${node.getAttribute('data-mq-key') ?? ''}:${kind}:${overflow}`;
        const runMs = marqueeRunMs(overflow, kind, speeds);
        const totalMs = MARQUEE_HOLD_MS + runMs + MARQUEE_HOLD_MS;
        let started = runs.get(key);
        if (started !== undefined && now - started.startedAtMs >= started.totalMs) {
            // Ran already this page load: it rests at its start, cut.
            continue;
        }
        if (started === undefined) {
            started = { startedAtMs: now, totalMs };
            runs.set(key, started);
        }
        const elapsed = now - started.startedAtMs;
        node.setAttribute('data-marquee', '');
        run.style.setProperty('--mq-shift', `-${overflow}px`);
        run.style.setProperty('--mq-ms', `${runMs}ms`);
        // The start hold is the delay; a rebuilt node picks the run up where
        // it was by owing less of it.
        run.style.setProperty('--mq-delay', `${MARQUEE_HOLD_MS - elapsed}ms`);
        run.addEventListener('animationend', () => {
            // Rest at the start, cut: the run is over and does not repeat.
            node.removeAttribute('data-marquee');
        });
        longest = Math.max(longest, totalMs - elapsed);
    }
    // Entries whose run is over leave, so the map is bounded by what is
    // running rather than by everything ever painted.
    for (const [key, run] of runs) {
        if (now - run.startedAtMs >= run.totalMs + MARQUEE_HOLD_MS) {
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
 */
export function remeasureWhenFontsReady(root: ParentNode, stillCurrent: () => boolean, speeds?: MarqueeSpeeds): void {
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    const ready = fonts?.ready;
    if (ready === undefined) {
        return;
    }
    void ready.then(() => {
        if (stillCurrent()) {
            applyMarquees(root, speeds);
        }
    });
}
