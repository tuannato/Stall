/**
 * Which fixture screens a viewport measures — one function, read by the
 * probe (`screensForViewport` in `layout/probe.ts`) and by the workshop's
 * shot plan (`layout/shotPlan.ts`), so a screenshot is taken of exactly what
 * the probe measured at that width and the two can never drift apart.
 */
import { WINDOW_MIN_PX } from '../src/ui/render';
import { CANVAS_SCREENS, SCREENS } from './fixtures';

/**
 * `canvas` is the 1920x1080 pass and runs the canvas screens **only**;
 * anything else is a page width and runs everything else.
 *
 * A wall screen is not in a pass narrower than the wall's own floor
 * (2026-09-20).
 *
 * `renderStall` used to take the width itself, so a wall fixture at
 * 390px quietly painted the ordinary stall here and measured that. The
 * app settles wall-ness once per load now — a predicate reading a live
 * width flipped under a rotation and threw away an open sheet — which
 * left this pass painting the wall layout at a phone's width: 42
 * failures per look of a screen the app cannot produce there.
 *
 * The first fix stripped `window` inside `paint()`, and a reviewer was
 * right to call that a guard taught to look away: it restated the app's
 * rule by hand and hid a case rather than declaring it out of scope.
 * This is the matrix saying so instead — the same shape as the canvas
 * split, and `screensMeasured` reports what actually ran, so a pass that
 * quietly measured the wrong side can be refused.
 *
 * The sheet that COMPOSES a wall link is not a wall screen: it paints on
 * an ordinary stall, carries no `window`, and stays in every pass.
 */
export function screensAt(width: number, canvas: boolean): string[] {
    const wallFits = width >= WINDOW_MIN_PX;
    return Object.keys(SCREENS).filter(
        (name) =>
            CANVAS_SCREENS.has(name) === canvas &&
            (wallFits || SCREENS[name]!.window === undefined),
    );
}

/**
 * The shop-window screens the wall passes measure: every fixture carrying
 * `window`, on the tall wall (1080x1920), the counter tablet (768x1024) and
 * the short desk wall (1280x800). Since the Cycle card has its own ladder
 * (`WALL_FIGURE_CEILINGS`), its long-figure screens are measured at every
 * wall size like the rest; until then the canvas pass alone measured those at
 * the rows' cuts.
 */
export function wallScreens(): string[] {
    return Object.keys(SCREENS).filter((name) => SCREENS[name]!.window !== undefined);
}

/**
 * The wall screens the desk pass (1280x900) does not reach by the canvas
 * split: every canvas screen carrying `window` — the touch wall, the Cycle
 * card's ladder, and the four canvas twins of desk screens. The runner's
 * desk wall pass measures them at the desk's own size, so every wall screen
 * is measured at 1280x900 too.
 */
export function deskWallScreens(): string[] {
    return Object.keys(SCREENS).filter((name) => CANVAS_SCREENS.has(name) && SCREENS[name]!.window !== undefined);
}

/** The overlay screens painted on the transparent wire (`bg=transparent`). */
export function clearScreens(): string[] {
    return Object.keys(SCREENS).filter((name) => SCREENS[name]!.broadcast?.transparent === true);
}
