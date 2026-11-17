/**
 * `stillPainter.ts`, the page run's judgement of
 * `a-file-below-the-goods-is-painted-once-on-a-still-box` (the still-painter
 * step, D-2026-11-17-02): shared art moves on no box, a row's own art may,
 * and a moving box whose art the run cannot tell its row's own fails closed.
 * The probe's half, and the red and green plants through the real probe, are
 * in `layout/PROBE-RULES.md`, "The still painter".
 */
import { describe, expect, it } from 'vitest';
import { judgeStillPainters, type StillBox } from './stillPainter';

const at = { screen: 'offers', label: 'Look', at: '390x844' };
const box = (row: string, who: string, files: string[], moves?: 'own' | 'node'): StillBox => ({ row, who, files, moves, ...at });
const TILE = 'http://localhost/assets/tile-abc.svg';
const MARK = 'http://localhost/assets/mark-def.svg';

describe('a file below the goods is painted once, on a still box, where rows share it (judgeStillPainters)', () => {
    // Two rows that share a tile carried by the first worn, the second with a mark of its own.
    const rows = new Set(['att-a', 'att-b']);
    const alone = new Set(['att-a', 'att-b']);
    const singles = [box('att-a', '.att-a::after', [TILE]), box('att-b', '.att-b::after', [TILE]), box('att-b', '.att-b::before', [MARK])];

    it('passes a row’s own art on a box that moves, and counts it', () => {
        const v = judgeStillPainters({ rows, alone, boxes: [...singles, box('att-a', '.att-a::after', [TILE]), box('att-b', '.att-b::before', [MARK], 'node')] });
        expect(v.faults).toEqual([]);
        expect(v.shared).toEqual([TILE]);
        expect(v.sharedBoxes).toBe(3);
        expect(v.movingOwn).toBe(1);
        // Its own animation, not its node's, passes the same.
        expect(judgeStillPainters({ rows, alone, boxes: [...singles, box('att-b', '.att-b::before', [MARK], 'own')] }).faults).toEqual([]);
    });

    it('fails shared art on a box that runs an animation, and on one that hangs on a node that runs one', () => {
        const own = judgeStillPainters({ rows, alone, boxes: [...singles, box('att-a', '.att-a::after', [TILE], 'own')] });
        expect(own.faults.map((f) => f.detail)).toEqual(['.att-a::after names tile-abc.svg, art .att-a and .att-b share below the goods, and runs an animation at 390x844']);
        const node = judgeStillPainters({ rows, alone, boxes: [...singles, box('att-b', '.att-b::after', [TILE], 'node')] });
        expect(node.faults.map((f) => f.detail)).toEqual(['.att-b::after names tile-abc.svg, art .att-a and .att-b share below the goods, and hangs on a node that runs an animation at 390x844']);
        expect(node.faults[0]).toMatchObject({ screen: 'offers', label: 'Look' });
        expect(node.movingOwn).toBe(0);
    });

    it('fails a box that moves and paints both its own art and shared art', () => {
        const v = judgeStillPainters({ rows, alone, boxes: [...singles, box('att-b', '.att-b::after', [MARK, TILE], 'node')] });
        expect(v.faults).toHaveLength(1);
        expect(v.faults[0]!.detail).toMatch(/names tile-abc\.svg, art \.att-a and \.att-b share/);
    });

    it('fails closed where another row below the goods was never painted alone on the run', () => {
        const v = judgeStillPainters({ rows, alone: new Set(['att-b']), boxes: [box('att-b', '.att-b::before', [MARK], 'node')] });
        expect(v.faults.map((f) => f.detail)).toEqual([
            ".att-b::before names mark-def.svg and hangs on a node that runs an animation at 390x844, and whether that art is its row's own cannot be told on this pass: .att-a was never painted alone here, and alone it might name the same file",
        ]);
        expect(v.movingOwn).toBe(0);
        // Its own row unread alone is no matter: only another row could share its file.
        expect(judgeStillPainters({ rows, alone: new Set(['att-a']), boxes: [box('att-b', '.att-b::before', [MARK], 'node')] }).faults).toEqual([]);
        // A run that painted no row alone, with two others unread, names both.
        const three = judgeStillPainters({ rows: new Set(['att-a', 'att-b', 'att-c']), alone: new Set(), boxes: [box('att-c', '.att-c::before', [MARK], 'own')] });
        expect(three.faults[0]!.detail).toMatch(/\.att-a and \.att-b were never painted alone here, and alone they might/);
    });

    it('asks nothing of a still box, whatever it names, and nothing of a look with one row below the goods', () => {
        expect(judgeStillPainters({ rows, alone: new Set(), boxes: [box('att-a', '.att-a::after', [TILE]), box('att-b', '.att-b::after', [TILE])] }).faults).toEqual([]);
        const one = judgeStillPainters({ rows: new Set(['att-a']), alone: new Set(), boxes: [box('att-a', '.att-a::before', [MARK], 'own')] });
        expect(one.faults).toEqual([]);
        expect(one.movingOwn).toBe(1);
    });

    it('reads which rows paint a file from every paint, so a file a second row names only worn together is shared', () => {
        // Alone, only att-a names the tile; worn together, att-b's box names it too (a combination rule).
        const v = judgeStillPainters({ rows, alone, boxes: [box('att-a', '.att-a::after', [TILE]), box('att-b', '.att-b::before', [TILE], 'node')] });
        expect(v.shared).toEqual([TILE]);
        expect(v.faults).toHaveLength(1);
    });
});
