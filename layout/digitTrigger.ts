/**
 * **1c(c)'s trigger** (before 8g2, the plan's item 1c, the owner's
 * D-2026-10-20-06 D1 (c); bound since step 7d, the owner's
 * D-2026-10-30-02, on the jobs this finds and no others; `PROBE-RULES.md`,
 * "Before 8g2, 1c(c): every digit, where a mover is near" and "Before 8g2,
 * 7d: 1c binds"). The per-character
 * digit read runs only on a contrast job whose page holds a mover near money,
 * and this is the pure half of how a job is found to hold one: what moves a
 * box (`moverKinds`) and whether what it paints meets a money node's line
 * boxes (`meetsLines`). The probe's half (`digitTrigger` in `probe.ts`) reads
 * the computed styles, the boxes and the animations off the prepared paint,
 * which it already holds, so a job that triggers nothing costs one walk of
 * its scope's styles and no capture.
 *
 * **What moves a box**, any of:
 * - an offset of a relative or sticky box, a transform, a `translate`,
 *   `rotate` or `scale`, a negative margin (`movedBy`, 1a's own reading in
 *   `coverPoints.ts`);
 * - a sticky box with any inset at all, `0` included: at rest it stands in
 *   flow, and scrolled it stands over whatever its container scrolls under it;
 * - an absolutely positioned or fixed box, which stands where its offsets put
 *   it and not where the flow would;
 * - a motion path (`offset-path`);
 * - an animation whose keyframes set a property outside
 *   `PAINT_ONLY_ANIMATION`, or whose keyframes this page cannot read (a custom
 *   property, which Chrome's `getKeyframes()` leaves out, fails closed).
 *
 * **What it paints**: its own border box and every box it holds, each grown by
 * 1b's whole sharp reach set (`ownPaints` in the probe: a box shadow's offset
 * and spread, an outline, a border image's outset, a `drop-shadow()`, its own
 * text's text-shadow off its lines' measured ink, its decoration lines'
 * bands; a blurred layer by its core); a look's moved pseudo-element by the
 * region 1b reads it in (`pseudoRegion`) and that same set off it
 * (`pseudoReachPaints`). A paint 1b cannot read triggers the job (fails
 * closed). Each painted rect is cut by the clips of the box whose
 * content it is — its parent, or an out-of-flow box's containing block — held
 * to the money node's own, 1b's `reachClipChain` and `pairClip` in the probe:
 * a clip between an absolute box and its containing block does not cut it,
 * as Chrome does not (the eleventh critic's ESC).
 */
import { movedBy, type Placement } from './coverPoints';

/** A box as the trigger reads it: page coordinates, edges. */
export type Box = { left: number; top: number; right: number; bottom: number };

/** What `moverKinds` reads off one computed style: 1a's placement, and the motion path. */
export type MoverFacts = Placement & { offsetPath: string };

/** One animation running on a box: its name, and the longhands its keyframes set as Chrome reads them (`getKeyframes()`). */
export type AnimationFacts = { name: string; props: readonly string[] };

/**
 * The longhands an animation may set and place no paint over money: an ink, a
 * ground, a ground's pattern, an opacity. Anything else — a size, a margin, a
 * transform, a shadow, a filter, an outline's width — can move a box or what
 * it paints, and so can a keyframe this page cannot read (`moverKinds`).
 * Kebab case, as the computed style names them.
 */
export const PAINT_ONLY_ANIMATION: ReadonlySet<string> = new Set([
    'color',
    '-webkit-text-fill-color',
    'caret-color',
    'background-color',
    'background-image',
    'background-position',
    'background-position-x',
    'background-position-y',
    'background-size',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'text-decoration-color',
    'fill',
    'stroke',
    'stop-color',
    'opacity',
]);

/** A keyframe's key as the property it names, and a run of keyframes' properties: the one mapping (`keyframeKeys.ts`). */
export { keyframeLonghands, keyframeProperty as kebab } from './keyframeKeys';

/**
 * Why a box moves, each reason in words, or none: the reasons the module's
 * docblock lists. An animation that sets only `PAINT_ONLY_ANIMATION` moves
 * nothing; one whose keyframes name no property at all (Chrome lists no
 * custom property) is counted as moving, since what it sets cannot be read.
 */
export function moverKinds(f: MoverFacts, animations: readonly AnimationFacts[] = []): string[] {
    const out: string[] = [];
    const moved = movedBy(f);
    if (moved !== undefined) out.push(moved);
    if (f.position === 'sticky' && moved === undefined && [f.top, f.right, f.bottom, f.left].some((v) => v !== 'auto' && v !== '')) {
        out.push('position sticky');
    }
    if (f.position === 'absolute' || f.position === 'fixed') out.push(`position ${f.position}`);
    if (f.offsetPath !== 'none' && f.offsetPath !== '') out.push(`offset-path ${f.offsetPath.slice(0, 40)}`);
    for (const a of animations) {
        if (a.props.length === 0) out.push(`animation ${a.name} (keyframes this page cannot read)`);
        else {
            const moving = a.props.filter((p) => !PAINT_ONLY_ANIMATION.has(p));
            if (moving.length > 0) out.push(`animation ${a.name} (${moving.slice(0, 3).join(', ')})`);
        }
    }
    return out;
}

/** The overlap of two boxes, or undefined where they do not overlap by more than `tol` on both axes. */
export function overlap(a: Box, b: Box, tol = 0): Box | undefined {
    const left = Math.max(a.left, b.left);
    const top = Math.max(a.top, b.top);
    const right = Math.min(a.right, b.right);
    const bottom = Math.min(a.bottom, b.bottom);
    return right - left > tol && bottom - top > tol ? { left, top, right, bottom } : undefined;
}

/**
 * A meet must overlap by more than this on both axes, in CSS pixels: two
 * boxes laid edge to edge — a grid's neighbouring cells, a line box against
 * the next line's — share an edge and nothing else, and rounding puts a
 * fraction of a pixel of overlap there.
 */
export const MEET_TOL = 0.5;

/** The first of a mover's painted boxes that meets one of a money node's line boxes, with where; `MEET_TOL` of slack. */
export function meetsLines(painted: readonly Box[], lines: readonly Box[]): { at: Box } | undefined {
    for (const p of painted) {
        for (const line of lines) {
            const at = overlap(p, line, MEET_TOL);
            if (at !== undefined) return { at };
        }
    }
    return undefined;
}
