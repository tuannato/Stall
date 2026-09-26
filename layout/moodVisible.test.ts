import { describe, expect, it } from 'vitest';
import { SHARMA_PAIRS } from './ciede2000-sharma';
import { MOOD_VISIBLE_MIN, deltaE2000, moodDistance, paintedDistance, type Rgb } from './moodVisible';

const rgb = (r: number, g: number, b: number): Rgb => ({ r, g, b });

describe('ciede2000-matches-the-published-pairs', () => {
    it('reads all 34 of Sharma’s pairs to 4 decimals, in both orders', () => {
        expect(SHARMA_PAIRS).toHaveLength(34);
        for (const [L1, a1, b1, L2, a2, b2, want] of SHARMA_PAIRS) {
            expect(deltaE2000([L1, a1, b1], [L2, a2, b2]).toFixed(4)).toBe(want.toFixed(4));
            expect(deltaE2000([L2, a2, b2], [L1, a1, b1]).toFixed(4)).toBe(want.toFixed(4));
        }
    });
});

/**
 * The billboard's verdicts, as RGB literals and never by a row's name — a
 * fixture that read the shipped table would move with it. Where each came
 * from is in `moodVisible.ts`'s docblock (2dc16aa, a450bc2, today's table).
 */
describe('a-mood-is-measured-in-ciede2000', () => {
    const verdict = (n: number): boolean => n >= MOOD_VISIBLE_MIN;

    it('holds the threshold at 5 by value', () => {
        expect(MOOD_VISIBLE_MIN).toBe(5);
    });

    it('lets 青墨 through: a chroma loss on a pale paper, bg only', () => {
        const paper = rgb(0xec, 0xe5, 0xd4);
        const n = moodDistance({ bg: paper, surface: paper }, { bg: rgb(0xdd, 0xe3, 0xdf) });
        expect(n.toFixed(2)).toBe('7.34');
        expect(verdict(n)).toBe(true);
    });

    it('refuses the first Sun-faded against Rural’s paper of its day', () => {
        const n = moodDistance(
            { bg: rgb(251, 244, 230), surface: rgb(243, 231, 206) },
            { bg: rgb(247, 240, 226), surface: rgb(238, 226, 203) },
        );
        expect(n.toFixed(2)).toBe('1.28');
        expect(verdict(n)).toBe(false);
    });

    it('refuses the second Sun-faded against today’s Rural paper', () => {
        const n = moodDistance(
            { bg: rgb(251, 242, 223), surface: rgb(255, 253, 244) },
            { bg: rgb(255, 251, 241), surface: rgb(252, 247, 238) },
        );
        expect(n.toFixed(2)).toBe('4.11');
        expect(verdict(n)).toBe(false);
    });

    it('lets Sun-faded as shipped through', () => {
        const n = moodDistance(
            { bg: rgb(251, 242, 223), surface: rgb(255, 253, 244) },
            { bg: rgb(255, 254, 250), surface: rgb(247, 244, 238) },
        );
        expect(n.toFixed(2)).toBe('6.86');
        expect(verdict(n)).toBe(true);
    });

    it('lets After hours through', () => {
        const n = moodDistance(
            { bg: rgb(242, 242, 239), surface: rgb(255, 255, 255) },
            { bg: rgb(18, 21, 26), surface: rgb(27, 32, 41) },
        );
        expect(n.toFixed(1)).toBe('88.6');
        expect(verdict(n)).toBe(true);
    });

    it('takes the larger of the two grounds, and a ground the mood leaves does not move', () => {
        const base = { bg: rgb(251, 242, 223), surface: rgb(255, 253, 244) };
        expect(moodDistance(base, {})).toBe(0);
        const bgOnly = moodDistance(base, { bg: rgb(255, 254, 250) });
        const surfaceOnly = moodDistance(base, { surface: rgb(247, 244, 238) });
        expect(moodDistance(base, { bg: rgb(255, 254, 250), surface: rgb(247, 244, 238) })).toBe(
            Math.max(bgOnly, surfaceOnly),
        );
    });

    it('measures the painted page over the grounds read opaque both ways, and says when none was', () => {
        const paper = rgb(251, 242, 223);
        const faded = rgb(255, 254, 250);
        expect(paintedDistance([])).toBeUndefined();
        expect(paintedDistance([{ bare: paper, worn: undefined }, { bare: undefined, worn: faded }])).toBeUndefined();
        expect(paintedDistance([{ bare: paper, worn: paper }])).toBe(0);
        const one = paintedDistance([{ bare: paper, worn: faded }])!;
        expect(one).toBe(moodDistance({ bg: paper, surface: paper }, { bg: faded }));
        expect(paintedDistance([{ bare: paper, worn: faded }, { bare: undefined, worn: paper }])).toBe(one);
    });
});
