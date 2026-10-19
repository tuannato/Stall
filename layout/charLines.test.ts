/**
 * Which line a character of a text node set over several lines stands on
 * (`layout/charLines.ts`; round 6 of `a-money-figure-is-never-misdressed`,
 * the critic's P1-3 on round 5). Held by behaviour, on the rects Chrome 155
 * hands the probe for one text node of 18px text set at `line-height` 0.3
 * (lines 5.4px apart, each rect 21px tall), 0 (every line on one top) and
 * 1.2: every character goes to the line it stands on, so a node piled
 * within half a line is two lines and "lines apart" reads them. The
 * browser half — that a character's rect shares its line's top — is the
 * probe's, proved red in a browser (`layout/PROBE-RULES.md`, round 6).
 */
import { describe, expect, it } from 'vitest';
import { lineOfCharacter } from './charLines';
import type { Box } from '../src/ui/signInk';

const box = (left: number, top: number, right: number, bottom: number): Box => ({ left, top, right, bottom });

/** Assign a run of characters (`[left, top]`, 10px wide, 21px tall) the way `fragmentsOf` does. */
function assign(chars: readonly (readonly [number, number])[], lines: readonly Box[]): number[] {
    let line = 0;
    let previous: Box | undefined;
    return chars.map(([left, top]) => {
        const r = box(left, top, left + 10, top + 21);
        line = lineOfCharacter(r, lines, line, previous);
        previous = r;
        return line;
    });
}

describe('a-money-figure-is-never-misdressed: a character goes to the line it stands on', () => {
    it('splits two lines piled within half a line, which a character’s middle cannot', () => {
        // line-height 0.3 at 18px: the second line's top is 5.4px below the
        // first's, so its characters' middles (top + 10.5) lie inside the
        // first line's rect, and round 5 gave them all to it.
        const lines = [box(40, 32, 180, 53), box(40, 37.4, 216, 58.4)];
        const chars = [
            [40, 32],
            [90, 32],
            [170, 32],
            [40, 37.4],
            [100, 37.4],
            [200, 37.4],
        ] as const;
        expect(assign(chars, lines)).toEqual([0, 0, 0, 1, 1, 1]);
        // Each character's middle is inside the first line's rect: the old
        // rule's answer for every one of them.
        for (const [, top] of chars) expect(top + 10.5 >= lines[0]!.top && top + 10.5 <= lines[0]!.bottom).toBe(true);
    });

    it('splits lines that share a top by the text’s own order: a step back to the left starts the next line', () => {
        // line-height 0: three lines on one top.
        const lines = [box(40, 29, 180, 50), box(40, 29, 216, 50), box(40, 29, 204, 50)];
        const chars = [
            [40, 29],
            [100, 29],
            [170, 29],
            [40, 29],
            [150, 29],
            [200, 29],
            [56, 29],
            [148, 29],
        ] as const;
        expect(assign(chars, lines)).toEqual([0, 0, 0, 1, 1, 1, 2, 2]);
    });

    it('keeps lines set apart as they are', () => {
        const lines = [box(40, 40, 180, 61), box(40, 61.6, 216, 82.6), box(40, 83.2, 204, 104.2)];
        expect(
            assign(
                [
                    [40, 40],
                    [170, 40],
                    [40, 61.6],
                    [205, 61.6],
                    [56, 83.2],
                ],
                lines,
            ),
        ).toEqual([0, 0, 1, 1, 2]);
    });

    it('takes the nearest top among every line when no line holds the character across', () => {
        const lines = [box(40, 32, 100, 53), box(40, 37.4, 100, 58.4)];
        expect(lineOfCharacter(box(300, 37.4, 310, 58.4), lines, 0, undefined)).toBe(1);
    });
});
