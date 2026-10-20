import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HORIZON_WORST, SAME, horizonWorstVerdict } from './horizon-worst.mjs';

const reads = (rows) => {
    const out = new Map();
    for (const [part, job, least] of rows) {
        const byJob = out.get(part) ?? new Map();
        byJob.set(job, least);
        out.set(part, byJob);
    }
    return out;
};
const AS_PINNED = Object.entries(HORIZON_WORST).map(([part, at]) => [part, at.job, at.least]);

describe('horizon-worst-baselines-are-the-owners-numbers', () => {
    it('pins the owner’s numbers and the jobs they were read on, by value', () => {
        assert.deepEqual(HORIZON_WORST, {
            name: { least: 2.76, job: 'desktop/unreachable/2/65535' },
            tagline: { least: 1.92, job: 'desktop/shop-window-cycle/2/65535' },
            sub: { least: 9.3, job: 'mobile/item-listing/2/65535' },
        });
        assert.equal(SAME, 0.01);
    });

    it('passes a run that reads the numbers on their jobs', () => {
        assert.deepEqual(horizonWorstVerdict(reads(AS_PINNED)), []);
    });

    /*
     * D-2026-10-20-13 (D2(a)): the runner reads the horizon's worst on the
     * three pinned jobs alone, so a read anywhere else — higher or lower —
     * means the prune did not hold. What it gave up is the guard that no
     * other job reads lower.
     */
    it('fails a read on any job no number was read on, higher or lower', () => {
        for (const least of [8.9, 1.5]) {
            const out = horizonWorstVerdict(reads([...AS_PINNED, ['name', 'mobile/offers/2/4', least]])).join('\n');
            assert.match(out, /was read on mobile\/offers\/2\/4 .* the runner reads the pinned jobs alone/);
        }
    });

    it('fails an owed job unread, a fall and a rise', () => {
        const without = AS_PINNED.filter(([part]) => part !== 'tagline');
        assert.match(horizonWorstVerdict(reads(without)).join('\n'), /tagline .* was not read on desktop\/shop-window-cycle/);
        const fell = AS_PINNED.map(([p, j, l]) => [p, j, p === 'name' ? l - 0.3 : l]);
        assert.match(horizonWorstVerdict(reads(fell)).join('\n'), /name .* a regression/);
        const rose = AS_PINNED.map(([p, j, l]) => [p, j, p === 'name' ? l + 0.3 : l]);
        assert.match(horizonWorstVerdict(reads(rose)).join('\n'), /update HORIZON_WORST/);
    });
});
