import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { probeCoverageGaps, probeCoverageLine } from './probe-coverage.mjs';

const SHIPPED = ['t-modern', 't-neo', 't-rural'];
const full = {
    dashChecks: { row: 8, face: 8, 'wall-browse': 6, 'wall-cycle': 6 },
    rowSizeClasses: SHIPPED,
    ladderTiers: { 1: 2, 2: 1, 3: 1 },
};

describe('a-probe-rule-that-compared-nothing-fails-the-pass', () => {
    it('passes a phone and a desk pass that compared everything they owe', () => {
        for (const pass of ['mobile', 'desktop']) {
            assert.deepEqual(probeCoverageGaps(pass, full, { shippedClasses: SHIPPED, skeleton: true }), []);
        }
    });

    it('names each place, look and tier a pass compared nothing on', () => {
        const gaps = probeCoverageGaps(
            'desktop',
            { dashChecks: { row: 3, face: 3, 'wall-browse': 2 }, rowSizeClasses: ['t-modern', 't-rural'] },
            { shippedClasses: SHIPPED, skeleton: true },
        );
        assert.deepEqual(gaps, [
            'the-dash-is-the-size-of-the-figure compared no dash with a figure on a wall-cycle',
            'a-shipped-row-states-the-sizes-its-sheet-paints read no row for t-neo',
        ]);
        const phone = probeCoverageGaps('mobile', { ...full, ladderTiers: { 2: 1, 3: 1 } }, {
            shippedClasses: SHIPPED,
            skeleton: true,
        });
        assert.deepEqual(phone, ['the-skeletons-ladder-steps-the-rows-size read no tier-1 figure']);
    });

    it('asks the wall only of the desk, and nothing of the other passes', () => {
        const phoneOnly = { ...full, dashChecks: { row: 1, face: 1 } };
        assert.deepEqual(probeCoverageGaps('mobile', phoneOnly, { shippedClasses: SHIPPED, skeleton: true }), []);
        assert.deepEqual(probeCoverageGaps('canvas', {}, { shippedClasses: SHIPPED, skeleton: true }), []);
    });

    it('asks a kit run for the dash alone: it measures no shipped look and no skeleton', () => {
        const kit = { dashChecks: { row: 1, face: 1 } };
        assert.deepEqual(probeCoverageGaps('mobile', kit), []);
        assert.equal(probeCoverageGaps('mobile', {}).length, 2);
    });

    it('says what a pass compared in one line, and nothing for a pass that owes nothing', () => {
        assert.equal(
            probeCoverageLine('desktop', full),
            'dash against figure: face 8, row 8, wall-browse 6, wall-cycle 6 · rows read: t-modern, t-neo, t-rural · skeleton ladder: tier 1 2, tier 2 1, tier 3 1',
        );
        assert.equal(probeCoverageLine('canvas', full), '');
    });
});
