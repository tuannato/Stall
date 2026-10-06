import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { CARRIED_LINE_SKIP_CEILING, PAID_LOOK_UNPAINTED_CODES, carriedTallyFaults } from './look-tallies.mjs';

/**
 * `a-carried-look-is-held-to-its-own-skip-ceilings` (8e2, the 8e2 critic's
 * item 1): a carried private look's line skips, points behind a clip and
 * codes owed by name are its own, held on their own — the public looks' can
 * neither stand in for them nor be tripped by them (the runner keeps those
 * over the public looks' own jobs). The critic's plant — the fixture with
 * `.fine, .stall-sub { max-height: 0; overflow: hidden }` — read 90 lines
 * clipped away at the phone and 78 at the desk and passed; here it fails,
 * and the real run's red proof is in `layout/PROBE-RULES.md`.
 *
 * `node --test`: a TypeScript test importing an `.mjs` breaks `tsc` (TS7016).
 */
const FIXTURE = 't-fixture-private';
const CODES = ['mobile/pay:pay-qr', 'desktop/publish-name:publish-qr', 'canvas/broadcast:broadcast'];

/** The fixture as measured: its own ceilings exactly, every pass hit-tested, every code read. */
function measured() {
    const table = CARRIED_LINE_SKIP_CEILING[FIXTURE];
    return {
        carried: [{ cls: FIXTURE, paid: true }],
        lineSkips: { [FIXTURE]: structuredClone({ mobile: table.mobile, desktop: table.desktop, canvas: table.canvas }) },
        clip: { [FIXTURE]: { mobile: { skips: 100, checks: 2000 }, desktop: { skips: 200, checks: 2500 }, canvas: { skips: 20, checks: 400 } } },
        clipCeiling: 0.3,
        codesRead: { [FIXTURE]: new Set(CODES.filter((code) => !PAID_LOOK_UNPAINTED_CODES.includes(code))) },
        codesRequired: CODES,
    };
}

describe('a-carried-look-is-held-to-its-own-skip-ceilings', () => {
    it('passes a carried look at its own ceilings, and says when it reads under them', () => {
        assert.deepEqual(carriedTallyFaults(measured()), { faults: [], notes: [] });
        const under = measured();
        under.lineSkips[FIXTURE].canvas['clipped-away'] -= 5;
        const { faults, notes } = carriedTallyFaults(under);
        assert.deepEqual(faults, []);
        assert.equal(notes.length, 1);
        assert.match(notes[0], /^t-fixture-private: \d+ line target\(s\) clipped-away at canvas, under its own \d+ — lower it$/);
    });

    it('fails the critic’s plant: lines clipped out of view on the phone and the desk', () => {
        const planted = measured();
        planted.lineSkips[FIXTURE].mobile['clipped-away'] = 90;
        planted.lineSkips[FIXTURE].desktop['clipped-away'] = 78;
        const { faults } = carriedTallyFaults(planted);
        assert.deepEqual(faults, [
            `t-fixture-private: 90 line target(s) clipped-away at mobile, over its own ${CARRIED_LINE_SKIP_CEILING[FIXTURE].mobile['clipped-away']} (CARRIED_LINE_SKIP_CEILING) — a line clipped out of view reads green unless this is held`,
            `t-fixture-private: 78 line target(s) clipped-away at desktop, over its own ${CARRIED_LINE_SKIP_CEILING[FIXTURE].desktop['clipped-away']} (CARRIED_LINE_SKIP_CEILING) — a line clipped out of view reads green unless this is held`,
        ]);
    });

    it('fails a carried look with no ceiling of its own, naming what it measured', () => {
        const { faults } = carriedTallyFaults({ ...measured(), carried: [{ cls: 't-planted-look', paid: true }], lineSkips: { 't-planted-look': { mobile: { 'clipped-away': 3, 'not-rendered': 1 } } }, clip: { 't-planted-look': measured().clip[FIXTURE] }, codesRead: { 't-planted-look': measured().codesRead[FIXTURE] } });
        assert.equal(faults.length, 1);
        assert.match(faults[0], /^t-planted-look is carried and has no line-skip ceiling of its own \(CARRIED_LINE_SKIP_CEILING/);
        assert.match(faults[0], /mobile 3\/1, desktop 0\/0, canvas 0\/0/);
        // An entry is the table's own key, never an inherited property.
        assert.equal(carriedTallyFaults({ ...measured(), carried: [{ cls: 'constructor', paid: false }] }).faults.some((f) => /has no line-skip ceiling/.test(f)), true);
    });

    it('holds a carried look to the clip ceiling on its own points, and a pass that hit-tested none of them fails', () => {
        const hidden = measured();
        hidden.clip[FIXTURE].desktop = { skips: 1200, checks: 1300 };
        hidden.clip[FIXTURE].canvas = { skips: 0, checks: 0 };
        assert.deepEqual(carriedTallyFaults(hidden).faults, [
            't-fixture-private: 1200/2500 of its points behind a clip at desktop (48%), above the 30% ceiling — the clip tolerance is eating the cover check',
            't-fixture-private: the canvas pass hit-tested none of its points — the cover check ran over nothing of it',
        ]);
    });

    it('owes every code by name on its own jobs, the record sheet’s excused under a paid look alone', () => {
        const free = { ...measured(), carried: [{ cls: FIXTURE, paid: false }] };
        assert.deepEqual(carriedTallyFaults(free).faults, [
            't-fixture-private: a-code-keeps-its-quiet-zone-white read no quiet zone on desktop/publish-name:publish-qr under it',
        ]);
        const unread = measured();
        unread.codesRead[FIXTURE].delete('mobile/pay:pay-qr');
        assert.deepEqual(carriedTallyFaults(unread).faults, [
            't-fixture-private: a-code-keeps-its-quiet-zone-white read no quiet zone on mobile/pay:pay-qr under it',
        ]);
        assert.deepEqual(PAID_LOOK_UNPAINTED_CODES, ['desktop/publish-name:publish-qr']);
    });
});
