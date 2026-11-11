import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { SHARED, contrastLookLines, geometryLookLines, lookTotals, unattributedPhases } from './look-timing.mjs';

describe('look-timing (O1: where the probe’s time goes, by look)', () => {
    it('sums per-look maps', () => {
        assert.deepEqual(lookTotals([{ a: 1, b: 2 }, { a: 3 }, undefined]), { a: 4, b: 2 });
    });
    it('splits the geometry passes and says the rest is no look’s', () => {
        const lines = geometryLookLines([
            { pass: 'mobile', lookMs: { 't-a': 1000, 't-b': 500 }, measureMs: 2000 },
            { pass: 'canvas', lookMs: { 't-b': 1500 }, measureMs: 1500 },
        ]);
        assert.match(lines[0], /t-a 1\.0s, t-b 2\.0s · not a look's .* 0\.5s · of 3\.5s measuring/);
        assert.equal(lines[1], '    mobile: t-a 1.0s, t-b 0.5s of 2.0s');
        assert.deepEqual(geometryLookLines([]), []);
    });
    it('splits the contrast phases by look, shared last, and holds the parts to the totals', () => {
        const byLook = new Map([
            ['capture', new Map([['t-a', 1000], ['t-b', 2000]])],
            ['load: ready', new Map([[SHARED, 500]])],
        ]);
        const totals = new Map([['capture', 3000], ['load: ready', 500]]);
        const lines = contrastLookLines(byLook, totals, { 't-a': 1200 });
        assert.match(lines[1], /t-a.*t-b.*\(shared\)/);
        assert.match(lines.at(-1), /\(unattributed\)\s+0\.0s/);
        assert.deepEqual(unattributedPhases(byLook, totals), []);
        totals.set('capture', 3100);
        assert.deepEqual(unattributedPhases(byLook, totals), ['capture']);
        assert.match(contrastLookLines(byLook, totals).at(-1), /0\.1s/);
    });
});
