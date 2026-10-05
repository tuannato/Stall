/**
 * Every face the page declares, loaded before the probe measures a line
 * (`every-face-is-loaded-before-the-probe-measures`).
 *
 * **Why the probe waits.** Its geometry passes paint and measure every
 * screen in one synchronous task, so a web face that is not loaded when that
 * task starts stays `loading` until it ends, and every line of the pass is
 * laid out in the fallback face. Measured before this module (2026-10-06): the
 * first navigation of a run — the 390 pass, the phone's money pass —
 * measured all 455 of its paints with Inter and JetBrains Mono still
 * `loading`, while later passes got the real faces from Chrome's cache (cache,
 * not rule). Rural's names lay out 1–2 px apart between the two faces, which
 * moved marquee travel and the points that land behind a clip
 * (`layout/PROBE-RULES.md`, "Every face is loaded before the probe
 * measures").
 *
 * **What it loads is what the page declares**, not a list written here:
 * `document.fonts` holds every `@font-face` of every sheet on the page —
 * `stall.css`'s shipped faces and their subsets, and a worn-only look's own
 * faces once its sheet is loaded — and each one not already loaded is asked
 * to load, every subset included, whether or not a fixture's text needs it.
 * A subset carries a `unicode-range`, so loading one no line uses changes no
 * line's layout; it is the state a visitor's page reaches once its faces
 * land. No warm-up paint: a paint before the loop would leave the marquee's
 * runs and the renderer's scroll and focus memory to the first measured
 * screen, a difference that is not the faces, and loading every declared
 * face already covers every face a paint would ask for.
 *
 * **The page echoes, the runner judges** — the `reducedMotion` /
 * `portraitTall` pattern: the verdict carries each face's status at the
 * moment measuring began, and `scripts/probe-faces.mjs` refuses a pass where
 * one is not `loaded`, or where a face `stall.css` declares is missing from
 * the page. The wait is bounded (`FACE_WAIT_MS`), so a face that never loads
 * is a named failure rather than a probe that never reports.
 */

/** One face as the page holds it: what selects it, and its status. */
export interface FaceState {
    readonly family: string;
    readonly style: string;
    readonly weight: string;
    readonly unicodeRange: string;
    readonly status: string;
}

/** What the probe echoes: every face at the moment measuring began. */
export interface FaceEcho {
    /** Every face `document.fonts` held when the wait ended, with its status then. */
    readonly faces: readonly FaceState[];
    /** How many of them this page asked to load (they were not loaded yet). */
    readonly asked: number;
    /** Whether the wait ran out before every face it asked for settled. */
    readonly timedOut: boolean;
    /** How long the wait took, in milliseconds. */
    readonly waitedMs: number;
}

/** The face API this module reads: a structural slice, so a test can hand it plain objects. */
export interface Face {
    readonly family: string;
    readonly style: string;
    readonly weight: string;
    readonly unicodeRange: string;
    readonly status: string;
    load(): Promise<unknown>;
}

/** The face set this module reads (`document.fonts`). */
export interface FaceSet extends Iterable<Face> {
    readonly ready: Promise<unknown>;
}

/**
 * The longest the probe waits for its faces. Eight files from the local
 * preview take tens of milliseconds; a face that has not settled in ten
 * seconds is one that never will, and the runner's own wait for a verdict
 * is fifteen.
 */
export const FACE_WAIT_MS = 10_000;

/** Every face in `set`, with its status now. */
export function faceStates(set: Iterable<Face>): FaceState[] {
    return [...set].map((face) => ({
        family: face.family,
        style: face.style,
        weight: face.weight,
        unicodeRange: face.unicodeRange,
        status: face.status,
    }));
}

/**
 * Ask every face in `set` that is not loaded to load, wait for each to
 * settle and for `set.ready`, bounded by `waitMs`, then read every face's
 * status. A load that fails leaves its face `error`, which the echo carries.
 */
export async function loadEveryFace(
    set: FaceSet,
    { waitMs = FACE_WAIT_MS, now = () => performance.now() }: { waitMs?: number; now?: () => number } = {},
): Promise<FaceEcho> {
    const started = now();
    const asked = [...set].filter((face) => face.status !== 'loaded');
    const settled = Promise.allSettled(asked.map((face) => face.load())).then(() => set.ready);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = await Promise.race([
        settled.then(
            () => false,
            () => false,
        ),
        new Promise<boolean>((resolve) => {
            timer = setTimeout(() => resolve(true), waitMs);
        }),
    ]);
    clearTimeout(timer);
    return { faces: faceStates(set), asked: asked.length, timedOut, waitedMs: Math.round(now() - started) };
}
