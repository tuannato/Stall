/**
 * The comparison every step-3 change to the contrast passes is proved with:
 * two dumps, box by box, over hand-built records — a real run cannot stage a
 * box that moves by one ulp on demand.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { boxKey, compareDumps, comparisonLines, dumpValue, jobKey } from './contrast-dump.mjs';

const job = { pass: 'contrast', viewport: 'mobile', screen: 'offers', look: 1, flags: 0 };
const box = (i, worst, extra = {}) => ({
    key: boxKey(job, { i, sel: `span.x${i}`, ...extra }),
    x: 0,
    y: i * 10,
    w: 10,
    h: 10,
    worst,
});

describe('a-contrast-change-is-lossless-only-box-for-box', () => {
    it('keys a box by its job, its node index and its node, and a clear box by its ground', () => {
        assert.equal(jobKey(job), 'contrast|mobile|offers|1|0');
        assert.equal(boxKey(job, { i: 3, sel: 'span.a' }), 'contrast|mobile|offers|1|0|3|span.a');
        assert.equal(boxKey(job, { i: 3, sel: 'span.a', ground: 'black' }), 'contrast|mobile|offers|1|0|3|span.a|black');
    });

    it('carries a value JSON cannot: Infinity by name, a dropped box as null', () => {
        assert.equal(dumpValue(4.5), 4.5);
        assert.equal(dumpValue(Infinity), 'Infinity');
        assert.equal(dumpValue(undefined), null);
        assert.equal(JSON.parse(JSON.stringify(dumpValue(0.1 + 0.2))), 0.1 + 0.2);
    });

    it('calls two identical dumps identical', () => {
        const a = { boxes: [box(0, 4.5), box(1, 'Infinity'), box(2, null)] };
        const b = structuredClone(a);
        const r = compareDumps(a, b);
        assert.equal(r.identical.length, 3);
        assert.deepEqual([r.moved, r.added, r.removed], [[], [], []]);
    });

    it('calls a move of one ulp a move, and names a crossing of the floor', () => {
        const a = { boxes: [box(0, 4.5), box(1, 3.1), box(2, 2.9)] };
        const b = { boxes: [box(0, 4.5 + Number.EPSILON * 4), box(1, 2.95), box(2, 3.2)] };
        const r = compareDumps(a, b);
        assert.equal(r.identical.length, 0);
        assert.deepEqual(
            r.moved.map((m) => [m.key.split('|')[5], m.crosses]),
            [
                ['0', false],
                ['1', true],
                ['2', true],
            ],
        );
        const lines = comparisonLines(r);
        assert.equal(lines[0], 'boxes: 0 identical, 3 moved, 0 added, 0 removed');
        assert.match(lines[1], /^CROSSES 3:1 — 2 box\(es\):$/);
    });

    it('calls a box sampled on one side and dropped on the other a move, and a missing key added or removed', () => {
        const a = { boxes: [box(0, 4.5), box(1, 5)] };
        const b = { boxes: [box(0, null), box(2, 5)] };
        const r = compareDumps(a, b);
        assert.equal(r.moved.length, 1);
        assert.equal(r.moved[0].after, null);
        assert.deepEqual(r.removed.map((x) => x.key), [box(1, 5).key]);
        assert.deepEqual(r.added.map((x) => x.key), [box(2, 5).key]);
    });
});
