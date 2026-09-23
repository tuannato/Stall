/**
 * The classification `pnpm looks:diff` stands on, over synthetic frames — a
 * run against a real browser cannot stage a flicker on demand, so the four
 * shapes a shot can take are built here pixel by pixel.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NOISE_PX, classify, diffMap, summarize } from './looks-diff-lib.mjs';

/** A 10×10 RGBA frame, grey, with `paint` pixels set to red. */
function frame(paint = []) {
    const width = 10;
    const height = 10;
    const data = Buffer.alloc(width * height * 4, 128);
    for (const [x, y] of paint) {
        const i = (y * width + x) * 4;
        data[i] = 255;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
    }
    for (let i = 3; i < data.length; i += 4) data[i] = 255;
    return { width, height, bpp: 4, data };
}

const DASH = [
    [2, 2],
    [3, 2],
    [4, 2],
];

describe('looks-diff-classifies-a-shot', () => {
    it('calls a first pair that agrees identical, and needs no second pair', () => {
        assert.deepEqual(classify({ before1: frame(), after1: frame() }).verdict, 'identical');
    });

    it('calls a difference both pairs reproduce, each side agreeing with itself, real — whatever its size', () => {
        const one = [[5, 5]];
        const result = classify({
            before1: frame(),
            after1: frame(one),
            before2: frame(),
            after2: frame(one),
        });
        assert.equal(result.verdict, 'real');
        assert.equal(result.count, 1, 'a one-pixel change that reproduces is not excused');
        const dash = classify({ before1: frame(), after1: frame(DASH), before2: frame(), after2: frame(DASH) });
        assert.deepEqual([dash.verdict, dash.count], ['real', 3]);
    });

    it('excuses a small difference seen in one pair only, and not a large one', () => {
        const flicker = classify({ before1: frame(), after1: frame([[1, 1]]), before2: frame(), after2: frame() });
        assert.deepEqual([flicker.verdict, flicker.count], ['noise', 1]);
        const big = Array.from({ length: NOISE_PX + 1 }, (_, i) => [i, 0]);
        const once = classify({ before1: frame(), after1: frame(big), before2: frame(), after2: frame() });
        assert.equal(once.verdict, 'inconclusive', 'a large difference seen once is not excused');
    });

    it('compares nothing under a mask: a moving ribbon inside it is identical', () => {
        const ribbon = { x: 0, y: 6, w: 10, h: 3 };
        const moved = classify({
            before1: frame([[1, 7]]),
            after1: frame([[8, 7]]),
            masks: [ribbon],
        });
        assert.equal(moved.verdict, 'identical');
        // A change outside the mask is still seen.
        const beside = classify({
            before1: frame([[1, 7]]),
            after1: frame([[8, 7], ...DASH]),
            before2: frame([[4, 7]]),
            after2: frame([[2, 8], ...DASH]),
            masks: [ribbon],
        });
        assert.deepEqual([beside.verdict, beside.count], ['real', 3]);
    });

    it('calls both sides flickering where they differ inconclusive, never real', () => {
        const result = classify({
            before1: frame([[5, 5]]),
            after1: frame([[6, 6]]),
            before2: frame([[6, 6]]),
            after2: frame([[5, 5]]),
        });
        assert.equal(result.verdict, 'inconclusive');
        assert.ok(result.selfRef > 0 && result.selfWork > 0);
    });

    it('counts only the stable pixels when a real change sits beside a flicker', () => {
        const result = classify({
            before1: frame([[9, 9]]),
            after1: frame(DASH),
            before2: frame(),
            after2: frame([[9, 9], ...DASH]),
        });
        assert.deepEqual([result.verdict, result.count], ['real', 3]);
    });

    it('counts a frame of another size as differing outside the overlap', () => {
        const small = { ...frame(), width: 10, height: 9, data: frame().data.subarray(0, 10 * 9 * 4) };
        assert.equal(diffMap(small, frame()).count, 10);
    });
});

describe('looks-diff-says-what-the-run-proves', () => {
    const compared = new Set(['offers', 'unbuyable', 'item-unbuyable']);

    it('passes a run whose only real differences are on the screens it was told to expect', () => {
        const out = summarize(
            [
                { screen: 'unbuyable', verdict: 'real' },
                { screen: 'item-unbuyable', verdict: 'real' },
                { screen: 'offers', verdict: 'noise' },
            ],
            { expected: ['unbuyable', 'item-unbuyable'], compared },
        );
        assert.equal(out.code, 0);
        assert.equal(out.expectedReal.length, 2);
    });

    it('fails a real difference anywhere else, and an expected screen that did not move', () => {
        assert.equal(summarize([{ screen: 'offers', verdict: 'real' }], { expected: [], compared }).code, 1);
        const unmet = summarize([{ screen: 'unbuyable', verdict: 'real' }], {
            expected: ['unbuyable', 'item-unbuyable'],
            compared,
        });
        assert.deepEqual([unmet.code, unmet.unmet], [1, ['item-unbuyable']]);
        const absent = summarize([], { expected: ['shop-window-unbuyable'], compared });
        assert.deepEqual([absent.code, absent.notCompared], [1, ['shop-window-unbuyable']]);
    });

    it('gives an inconclusive shot its own code and no pass', () => {
        const out = summarize(
            [
                { screen: 'unbuyable', verdict: 'real' },
                { screen: 'broadcast-ticker-live', verdict: 'inconclusive' },
            ],
            { expected: ['unbuyable'], compared },
        );
        assert.equal(out.code, 2);
    });
});
