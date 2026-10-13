/**
 * Where a spilled strip of words can lie under a control (`text-spills` in
 * `layout/probe.ts`; round 3, corrected in round 4, the critic's P2-1).
 *
 * A control INSIDE the spill's clipper scrolls with the spill, so the whole
 * strip is read against it — below the fold included. Round 3 cut every
 * strip to the scroller's box at scroll 0, and a spill below the fold then
 * lay under nothing: words painted over the covenant's asked amount in the
 * item face's fold passed every pass, at 390 and 1280 and, under a 360-only
 * rule, the whole runner.
 *
 * A control OUTSIDE the clipper never shares the part the clipper hides, so
 * against it the strip is cut to the clipper's box — on each axis only where
 * the clipper clips (`overflow-x: clip` beside a visible `overflow-y` clips
 * one axis). That is round 3's own reason, kept: a 300px Rural card tilted
 * 0.6° bulges 1.6px a side, and its strip, the list's whole height, was read
 * as lying under the dock's tab at 360 though the scroller ends 16px above it.
 *
 * Not read, stated: a control outside the clipper's subtree that stands over
 * the clipper's own box is read against the strip as the clipper shows it at
 * scroll 0, not at every scroll offset.
 */
export type Box = { left: number; top: number; right: number; bottom: number };

export type Clip = { box: Box; clipsX: boolean; clipsY: boolean };

/** The part of `strip` a control can lie under: all of it inside the clipper, the part the clipper shows outside it. */
export function spillReach(strip: Box, clip: Clip | undefined, controlInsideClipper: boolean): Box {
    if (clip === undefined || controlInsideClipper) {
        return strip;
    }
    return {
        left: clip.clipsX ? Math.max(strip.left, clip.box.left) : strip.left,
        right: clip.clipsX ? Math.min(strip.right, clip.box.right) : strip.right,
        top: clip.clipsY ? Math.max(strip.top, clip.box.top) : strip.top,
        bottom: clip.clipsY ? Math.min(strip.bottom, clip.box.bottom) : strip.bottom,
    };
}

/** Whether a reach is a box at all (a strip wholly hidden by the clipper reaches nothing). */
export function reachesAnything(reach: Box): boolean {
    return reach.right > reach.left && reach.bottom > reach.top;
}
