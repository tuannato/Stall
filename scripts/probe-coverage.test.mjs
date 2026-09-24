import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { probeCoverageGaps, probeCoverageLine } from './probe-coverage.mjs';

const SHIPPED = ['t-modern', 't-neo', 't-rural'];
const full = {
    unbuyableChecks: { row: 8, face: 8, 'wall-browse': 6 },
    skipChecks: { 'wall-cycle': 7, 'stream-card': 4, 'stream-ticker': 4 },
    rowSizeClasses: SHIPPED,
    doorMiniClasses: SHIPPED,
    ladderTiers: { 1: 2, 2: 1, 3: 1 },
    wallControlChecks: 24,
    wallControlRoles: {
        'window-back': 6,
        'window-pay': 6,
        'window-clear': 6,
        'window-step-fewer': 3,
        'window-step-more': 3,
        'pay-lines-more': 6,
        'pay-borrowed': 3,
    },
};

describe('a-probe-rule-that-compared-nothing-fails-the-pass', () => {
    it('passes a phone, a desk and a canvas pass that read everything they owe', () => {
        for (const pass of ['mobile', 'desktop', 'canvas']) {
            assert.deepEqual(probeCoverageGaps(pass, full, { shippedClasses: SHIPPED, skeleton: true }), []);
        }
    });

    it('names each place, look and tier a pass read nothing on', () => {
        const gaps = probeCoverageGaps(
            'desktop',
            {
                unbuyableChecks: { row: 3, face: 3 },
                rowSizeClasses: ['t-modern', 't-rural'],
                doorMiniClasses: ['t-modern', 't-neo'],
            },
            { shippedClasses: SHIPPED, skeleton: true },
        );
        assert.deepEqual(gaps, [
            'an-unbuyable-offer-paints-no-figure-and-says-so read no label on a wall-browse',
            'an-unbuyable-offer-paints-no-figure-and-says-so saw no wall-cycle skip an unbuyable listing',
            'a-shipped-row-states-the-sizes-its-sheet-paints read no row for t-neo',
            'a-door-mini-paints-as-its-own-look compared no t-rural mini with its shop',
        ]);
        const phone = probeCoverageGaps('mobile', { ...full, ladderTiers: { 2: 1, 3: 1 } }, {
            shippedClasses: SHIPPED,
            skeleton: true,
        });
        assert.deepEqual(phone, ['the-skeletons-ladder-steps-the-rows-size read no tier-1 figure']);
    });

    it('asks the wall only of the desk, the stream only of the canvas, and nothing of the other passes', () => {
        const phoneOnly = { ...full, unbuyableChecks: { row: 1, face: 1 }, skipChecks: {} };
        assert.deepEqual(probeCoverageGaps('mobile', phoneOnly, { shippedClasses: SHIPPED, skeleton: true }), []);
        // The canvas owes the stream's two skips and the wall's controls, and no label, row or ladder.
        assert.deepEqual(probeCoverageGaps('canvas', { skipChecks: { 'stream-card': 1 }, wallControlRoles: full.wallControlRoles }, {
            shippedClasses: SHIPPED,
            skeleton: true,
        }), ['an-unbuyable-offer-paints-no-figure-and-says-so saw no stream-ticker skip an unbuyable listing']);
        assert.deepEqual(probeCoverageGaps('reduced-motion', {}, { shippedClasses: SHIPPED, skeleton: true }), []);
    });

    it('asks the three wall passes for the wall controls, and nothing else of portrait and tablet', () => {
        for (const pass of ['portrait', 'tablet']) {
            assert.deepEqual(probeCoverageGaps(pass, full), []);
            assert.deepEqual(
                probeCoverageGaps(pass, {
                    wallControlRoles: { ...full.wallControlRoles, 'window-step-fewer': 0, 'pay-borrowed': 0 },
                }),
                [
                    'nothing-on-the-wall-is-cut-from-below read no window-step-fewer on a wall',
                    'nothing-on-the-wall-is-cut-from-below read no pay-borrowed on a wall',
                ],
            );
        }
        assert.equal(probeCoverageGaps('canvas', { ...full, wallControlRoles: {} }).length, 7);
        assert.deepEqual(probeCoverageGaps('desktop', { ...full, wallControlRoles: {} }, { shippedClasses: SHIPPED }), []);
    });

    it('asks a kit run for the labels and skips alone: it measures no shipped look and no skeleton', () => {
        const kit = { unbuyableChecks: { row: 1, face: 1, 'wall-browse': 1 }, skipChecks: { 'wall-cycle': 1 } };
        assert.deepEqual(probeCoverageGaps('mobile', kit), []);
        assert.deepEqual(probeCoverageGaps('desktop', kit), []);
        assert.equal(probeCoverageGaps('mobile', {}).length, 2);
        assert.equal(probeCoverageGaps('canvas', {}).length, 9);
    });

    it('says what a pass read in one line, and nothing for a pass that owes nothing', () => {
        assert.equal(
            probeCoverageLine('desktop', full),
            'unbuyable labels read: face 8, row 8, wall-browse 6 · skips seen: stream-card 4, stream-ticker 4, wall-cycle 7 · rows read: t-modern, t-neo, t-rural · door minis: t-modern, t-neo, t-rural · skeleton ladder: tier 1 2, tier 2 1, tier 3 1',
        );
        assert.equal(
            probeCoverageLine('canvas', full),
            'unbuyable labels read: face 8, row 8, wall-browse 6 · skips seen: stream-card 4, stream-ticker 4, wall-cycle 7 · wall controls read: 24',
        );
        assert.equal(probeCoverageLine('tablet', full), 'wall controls read: 24');
        assert.equal(
            probeCoverageLine('tablet', {
                ...full,
                wallSlivers: ['pay-3 Modern: window-step-more 12/72px y', 'pay-3 Rural: window-step-more 28/72px y'],
            }),
            'wall controls read: 24 · shown only in part inside a scroller: window-step-more ×2 (least 12/72px)',
        );
        assert.equal(probeCoverageLine('reduced-motion', full), '');
    });
});
