import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import {
    CARRIED_LINE_SKIP_CEILING,
    PAID_LOOK_UNPAINTED_CODES,
    carriedTallyFaults,
    clipCeilingFault,
    clipLine,
    coverTally,
    reachTally,
    walkTally,
    skipsByScreen,
    skipsByScreenLine,
} from './look-tallies.mjs';

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

/** One look's 1a tally on a pass (`coverByClass`'s shape), its other counts nothing. */
function tally(counts) {
    return { paints: 10, nodes: 50, points: 0, checked: 0, below: 0, offSide: 0, above: 0, clipSkips: 0, wallScroll: 0, appHidden: 0, failed: 0, ...counts };
}

/** The fixture as measured: its own ceilings exactly, every pass hit-tested, every code read. */
function measured() {
    const table = CARRIED_LINE_SKIP_CEILING[FIXTURE];
    return {
        carried: [{ cls: FIXTURE, paid: true }],
        lineSkips: { [FIXTURE]: structuredClone({ mobile: table.mobile, desktop: table.desktop, canvas: table.canvas }) },
        cover: {
            mobile: { [FIXTURE]: tally({ clipSkips: 100, checked: 2000 }) },
            desktop: { [FIXTURE]: tally({ clipSkips: 200, checked: 2500 }) },
            canvas: { [FIXTURE]: tally({ clipSkips: 20, checked: 400, wallScroll: 900 }) },
            tablet: { [FIXTURE]: tally({ clipSkips: 0, checked: 3000, wallScroll: 2500 }) },
        },
        reach: {
            mobile: { [FIXTURE]: { paints: 90, targets: 400, pairs: 120 } },
            tablet: { [FIXTURE]: { paints: 60, targets: 200, pairs: 0 } },
        },
        walk: {
            mobile: { [FIXTURE]: { elements: 120, failed: 0, thrown: 0 } },
            tablet: { [FIXTURE]: { elements: 60, failed: 0, thrown: 0 } },
        },
        clipCeiling: 0.3,
        codesRead: { [FIXTURE]: new Set(CODES.filter((code) => !PAID_LOOK_UNPAINTED_CODES.includes(code))) },
        moduleCodesRead: { [FIXTURE]: new Set(CODES.filter((code) => !PAID_LOOK_UNPAINTED_CODES.includes(code))) },
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
        const { faults } = carriedTallyFaults({ ...measured(), carried: [{ cls: 't-planted-look', paid: true }], lineSkips: { 't-planted-look': { mobile: { 'clipped-away': 3, 'not-rendered': 1 } } }, cover: Object.fromEntries(Object.entries(measured().cover).map(([pass, byClass]) => [pass, { 't-planted-look': byClass[FIXTURE] }])), reach: Object.fromEntries(Object.entries(measured().reach).map(([pass, byClass]) => [pass, { 't-planted-look': byClass[FIXTURE] }])), walk: Object.fromEntries(Object.entries(measured().walk).map(([pass, byClass]) => [pass, { 't-planted-look': byClass[FIXTURE] }])), codesRead: { 't-planted-look': measured().codesRead[FIXTURE] }, moduleCodesRead: { 't-planted-look': measured().moduleCodesRead[FIXTURE] } });
        assert.equal(faults.length, 1);
        assert.match(faults[0], /^t-planted-look is carried and has no line-skip ceiling of its own \(CARRIED_LINE_SKIP_CEILING/);
        assert.match(faults[0], /mobile 3\/1, desktop 0\/0, canvas 0\/0/);
        // An entry is the table's own key, never an inherited property.
        assert.equal(carriedTallyFaults({ ...measured(), carried: [{ cls: 'constructor', paid: false }] }).faults.some((f) => /has no line-skip ceiling/.test(f)), true);
    });

    it('holds a carried look to the clip ceiling on its own points of 1a, on every pass that read it, and a pass that hit-tested none of them fails', () => {
        const hidden = measured();
        hidden.cover.desktop[FIXTURE] = tally({ clipSkips: 1200, checked: 1300 });
        hidden.cover.canvas[FIXTURE] = tally({ clipSkips: 0, checked: 0, wallScroll: 40 });
        hidden.cover.tablet = { 't-modern': tally({ checked: 10 }) };
        assert.deepEqual(carriedTallyFaults(hidden).faults, [
            't-fixture-private at desktop: 1200/2500 points behind a clip (48%), above the 30% ceiling — the clip tolerance is eating the cover check',
            't-fixture-private at canvas: every one of its 40 points inside the viewport was behind a clip — the cover check ran over nothing',
            't-fixture-private at tablet: it hit-tested no point — the cover check ran over nothing',
        ]);
    });

    it('owes a read of 1b that held a target on every geometry pass that ran it (7b)', () => {
        const unread = measured();
        unread.reach.mobile = { 't-modern': { paints: 9, targets: 9 } };
        unread.reach.tablet[FIXTURE] = { paints: 60, targets: 0 };
        assert.deepEqual(carriedTallyFaults(unread).faults, [
            't-fixture-private at mobile: a-paint-with-no-hit-area-reaches-no-money read no paint of it',
            't-fixture-private at tablet: a-paint-with-no-hit-area-reaches-no-money held no target on it',
        ]);
        assert.equal(reachTally({ a: { paints: 2, targets: 3, would: 1 }, b: { paints: 1, accepted: 4 } }, ['a', 'b', 'constructor']).accepted, 4);
        assert.equal(reachTally({ a: { paints: 2, targets: 3, would: 1 } }).would, 1);
    });

    it('owes a figure read to its stall on every geometry pass that ran 3a (D-2026-10-28-01)', () => {
        const unread = measured();
        unread.walk.mobile = { 't-modern': { elements: 9 } };
        unread.walk.tablet[FIXTURE] = { elements: 0 };
        assert.deepEqual(carriedTallyFaults(unread).faults, [
            't-fixture-private at mobile: the-ground-walk-reaches-the-stall read no figure of it',
            't-fixture-private at tablet: the-ground-walk-reaches-the-stall read no figure of it',
        ]);
        assert.deepEqual(walkTally({ a: { elements: 2, failed: 1 }, b: { elements: 1 } }, ['a', 'b', 'constructor']), { elements: 3, failed: 1, thrown: 0 });
    });

    it('owes every code by name on its own jobs, the record sheet’s excused under a paid look alone', () => {
        const free = { ...measured(), carried: [{ cls: FIXTURE, paid: false }] };
        assert.deepEqual(carriedTallyFaults(free).faults, [
            't-fixture-private: a-code-keeps-its-quiet-zone-white read no quiet zone on desktop/publish-name:publish-qr under it',
            't-fixture-private: a-codes-modules-read-as-its-matrix read no module of desktop/publish-name:publish-qr under it',
        ]);
        // 1d (7c) owes its modules read on the same codes, on its own jobs.
        const modulesUnread = measured();
        modulesUnread.moduleCodesRead[FIXTURE].delete('canvas/broadcast:broadcast');
        assert.deepEqual(carriedTallyFaults(modulesUnread).faults, [
            't-fixture-private: a-codes-modules-read-as-its-matrix read no module of canvas/broadcast:broadcast under it',
        ]);
        const unread = measured();
        unread.codesRead[FIXTURE].delete('mobile/pay:pay-qr');
        assert.deepEqual(carriedTallyFaults(unread).faults, [
            't-fixture-private: a-code-keeps-its-quiet-zone-white read no quiet zone on mobile/pay:pay-qr under it',
        ]);
        assert.deepEqual(PAID_LOOK_UNPAINTED_CODES, ['desktop/publish-name:publish-qr']);
    });

    it('owes 1c’s characters read on every viewport where its own jobs triggered it (7d)', () => {
        const fired = { ...measured(), chars: { [`mobile ${FIXTURE}`]: { jobs: 9, triggered: 2, chars: 0 }, [`desktop ${FIXTURE}`]: { jobs: 9, triggered: 1, chars: 40 }, 'mobile t-modern': { jobs: 9, triggered: 3, chars: 0 } } };
        assert.deepEqual(carriedTallyFaults(fired).faults, [
            't-fixture-private: every-money-character-reads-where-a-mover-is-near: its trigger fired on 2 t-fixture-private job(s) at mobile and read no character on them',
        ]);
        // Where its trigger fired on no job, it owes nothing.
        assert.deepEqual(carriedTallyFaults({ ...measured(), chars: { [`mobile ${FIXTURE}`]: { jobs: 9, triggered: 0, chars: 0 } } }).faults, []);
    });
});

/**
 * The clip ceiling on 1a's tallies (7a; the critic's third review, its
 * checklist item 8): the two wall scrollers' points are counted apart and
 * never in the ratio — the counter tablet's 34% and the narrow wall's 33%
 * on the clean tree were theirs — while every other point behind a clip is
 * held to the ceiling, and a tally that hit-tested nothing fails.
 */
describe('the clip ceiling reads 1a', () => {
    it('sums a pass’s tallies over the classes asked, a class that is not a key read as nothing', () => {
        const byClass = { 't-modern': tally({ checked: 10, clipSkips: 2, failed: 1 }), 't-neo': tally({ checked: 5, wallScroll: 7 }) };
        assert.deepEqual(coverTally(byClass), { ...tally({ checked: 15, clipSkips: 2, wallScroll: 7, failed: 1 }), paints: 20, nodes: 100 });
        assert.equal(coverTally(byClass, ['t-neo', 'constructor', 't-gone']).checked, 5);
    });

    it('counts the wall scrollers’ points apart, outside the ratio', () => {
        // The counter tablet on the clean tree, before 7a: 34% behind a clip, every one a wall scroller's.
        const tablet = tally({ checked: 338919, clipSkips: 0, wallScroll: 173880 });
        assert.equal(clipCeilingFault(tablet, 0.3), undefined);
        assert.equal(clipLine(tablet), '0/338919 points behind a clip (0%), 173880 behind a wall scroller, apart');
        // The same points behind any other clip break the ceiling.
        assert.equal(
            clipCeilingFault(tally({ checked: 338919, clipSkips: 173880 }), 0.3),
            '173880/512799 points behind a clip (34%), above the 30% ceiling — the clip tolerance is eating the cover check',
        );
        assert.equal(clipCeilingFault(tally({ checked: 70, clipSkips: 30 }), 0.3), undefined);
    });

    it('fails a tally that hit-tested nothing, whatever stood behind a clip', () => {
        assert.match(clipCeilingFault(tally({ wallScroll: 9 }), 0.3), /^every one of its 9 points inside the viewport was behind a clip/);
        assert.match(clipCeilingFault(tally({}), 0.3), /^it hit-tested no point/);
    });
});

const SKIP_RECORDS = [
    { viewport: 'mobile', screen: 'studio-items', classes: [FIXTURE], skips: { 'clipped-away': 8, sliver: 2 } },
    { viewport: 'mobile', screen: 'studio-items', classes: [FIXTURE], skips: { 'clipped-away': 8 } },
    { viewport: 'mobile', screen: 'shop-window-sheet', classes: [FIXTURE], skips: { 'not-rendered': 5 } },
    { viewport: 'mobile', screen: 'offers', classes: [FIXTURE], skips: {} },
    { viewport: 'desktop', screen: 'shop-window-browse', classes: [FIXTURE], skips: { 'clipped-away': 2 } },
    { viewport: 'desktop', screen: 'studio-items', classes: ['t-modern'], skips: { 'clipped-away': 9 } },
];

describe('a-carried-looks-skips-are-printed-per-screen', () => {
    /**
     * The 8g1 critic's P3-1: one sum per viewport let a new clipped line on
     * one screen hide behind one fewer on another. The run prints each
     * carried look's skips per screen beside the sums its ceiling holds.
     */
    it('sums each screen of the look, and only the kinds the ceiling counts', () => {
        assert.deepEqual(skipsByScreen(SKIP_RECORDS, FIXTURE), {
            mobile: {
                'studio-items': { 'clipped-away': 16, 'not-rendered': 0 },
                'shop-window-sheet': { 'clipped-away': 0, 'not-rendered': 5 },
            },
            desktop: { 'shop-window-browse': { 'clipped-away': 2, 'not-rendered': 0 } },
        });
    });

    it('says each viewport in one line, screens sorted, and none where none skipped', () => {
        assert.equal(
            skipsByScreenLine(skipsByScreen(SKIP_RECORDS, FIXTURE)),
            'mobile shop-window-sheet 0/5, studio-items 16/0; desktop shop-window-browse 2/0; canvas none',
        );
        assert.equal(skipsByScreenLine(skipsByScreen(SKIP_RECORDS, 't-none')), 'mobile none; desktop none; canvas none');
    });
});
