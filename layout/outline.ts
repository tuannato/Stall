/**
 * The outline a line wears where a decoration falls behind it (round 8,
 * 2026-09-25) — pure, and the one statement of its two sets.
 *
 * `text-shadow` in the look's own ground (`var(--s-bg)`) at alpha 1 and zero
 * blur: the eight one-pixel offsets, or those and the twelve at two pixels.
 * `stall.css` states them as `--rain-outline-1` and `--rain-outline-2`; the
 * probe reads an outline off the computed `text-shadow` against these
 * (`outlineOf`), and `an-outline-is-the-only-mark-under-text-on-a-decoration`
 * (`src/ui/decor-gate.test.ts`) holds every served sheet to them.
 */

export type Offset = readonly [number, number];

export const OUTLINE_1: readonly Offset[] = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
];

export const OUTLINE_2: readonly Offset[] = [
    ...OUTLINE_1,
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
    [2, 1],
    [-2, 1],
    [2, -1],
    [-2, -1],
    [1, 2],
    [-1, 2],
    [1, -2],
    [-1, -2],
];

/** Text under this size wears the two-pixel set; at or over it, the one-pixel set. */
export const OUTLINE_2_UNDER_PX = 14;

/** Which set `offsets` is, exactly — 1, 2 — or 0 when it is neither. */
export function outlineSet(offsets: readonly Offset[]): 0 | 1 | 2 {
    const keys = new Set(offsets.map(([x, y]) => `${x},${y}`));
    const is = (set: readonly Offset[]): boolean =>
        keys.size === set.length && offsets.length === set.length && set.every(([x, y]) => keys.has(`${x},${y}`));
    return is(OUTLINE_1) ? 1 : is(OUTLINE_2) ? 2 : 0;
}
