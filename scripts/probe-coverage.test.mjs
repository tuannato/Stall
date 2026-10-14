import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { CARD_FIGURES_OWED, CARD_LADDERS_OWED, CYCLE_STEPS_OWED, FIGURE_SURFACES_OWED, owedFaults, probeCoverageGaps, probeCoverageLine, wornSheetJobFaults } from './probe-coverage.mjs';

const SHIPPED = ['t-modern', 't-neo', 't-rural'];
/*
 * Every card figure a phone pass owes, read on every look the tests paint
 * (round 2: every step of the face's figure, "You pay" and a pay figure,
 * and a Pay several line's three dresses), and the four figures' painted
 * ladders compared over all four tiers.
 */
const CARD_LOOKS = [...SHIPPED, 't-skeleton', 't-fixture-private'];
const EVERY_CARD_STEP = Object.fromEntries(
    ['face', 'paid', 'pay'].flatMap((place) => ['0', '1', '2', '3'].map((tier) => [`${place}:${tier}`, 2])).concat([
        ['line:0', 4],
        ['line:2', 2],
        ['line:3', 4],
        ['total:0', 4],
    ]),
);
const EVERY_LADDER = Object.fromEntries(['face:price', 'face:seller-price', 'paid:figure', 'pay:price'].map((figure) => [figure, '0123']));
const cardRead = {
    cardFigureByClass: Object.fromEntries(CARD_LOOKS.map((cls) => [cls, EVERY_CARD_STEP])),
    cardLadderByClass: Object.fromEntries(CARD_LOOKS.map((cls) => [cls, EVERY_LADDER])),
};
/*
 * D-2026-10-14-02: a broken figure held to its ink on every look a pass may
 * paint, and money figures asked about a self-clip — every geometry pass
 * owes both.
 */
/** Every surface a broken figure stands on (round 2: the ink rule is owed per surface). */
const EVERY_SURFACE = Object.fromEntries(['face', 'paid', 'pay', 'line', 'total', 'strip', 'chosen', 'row', 'wall', 'cycle'].map((surface) => [surface, 4]));
const moneyRead = {
    figureInkByClass: Object.fromEntries(CARD_LOOKS.map((cls) => [cls, EVERY_SURFACE])),
    selfClipByClass: Object.fromEntries(CARD_LOOKS.map((cls) => [cls, 80])),
};
const full = {
    unbuyableChecks: { row: 8, face: 8, 'wall-browse': 6 },
    skipChecks: { 'wall-cycle': 7, 'stream-card': 4, 'stream-ticker': 4 },
    rowSizeClasses: SHIPPED,
    doorMiniClasses: SHIPPED,
    ladderTiers: { 1: 2, 2: 1, 3: 1 },
    wallControlChecks: 24,
    statusLineChecks: 50,
    wallControlRoles: {
        'window-back': 6,
        'window-pay': 6,
        'window-clear': 6,
        'window-step-fewer': 3,
        'window-step-more': 3,
        'pay-lines-more': 6,
        'pay-borrowed': 3,
    },
    floorNamedChecks: 900,
    outlineChecks: 400,
    moneyChecks: 300,
    haloChecks: 30,
    fileClipChecks: 5000,
    atRestSetAside: { 'the rain': 120, 'the backdrop’s scanlines': 120 },
    buntingChecks: 40,
    smallText: ['t-neo span.sm-cap 9.5px (aria-hidden)'],
    // 8f2: the sign's lines read whole on every look a pass may paint, and
    // the tracked fixture's subjects — a rung climbed, a mark shown, a
    // sticky sign whose region scrolled.
    nameLinesByClass: { 't-modern': 40, 't-neo': 40, 't-rural': 40, 't-skeleton': 40, 't-fixture-private': 40 },
    nameTiersByClass: { 't-fixture-private': { 1: 2, 2: 1 } },
    nameVerticalByClass: { 't-fixture-private': 6 },
    nameOwnClipByClass: { 't-fixture-private': 30 },
    marksShownByClass: { 't-fixture-private': 30 },
    stickyByClass: { 't-fixture-private': { paints: 20, scrolled: 18, stops: 90 } },
    tryOnNamesByClass: { 't-fixture-private': 2 },
    // 8g1's critic: pairs of sign lines compared on every look a page pass
    // may paint, and the tagline invite read in the sign.
    signWordsByClass: Object.fromEntries(
        ['t-modern', 't-neo', 't-rural', 't-skeleton', 't-fixture-private'].map((cls) => [cls, { pairs: 50, invites: 2 }]),
    ),
    // Round 2: the phone pass owes every step of the card figures too.
    ...cardRead,
    // The Cycle card's ladder (2026-10-13): every step read on every look a
    // wall pass may paint.
    cycleFigureByClass: Object.fromEntries(CARD_LOOKS.map((cls) => [cls, Object.fromEntries(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((step) => [step, 3]))])),
    ...moneyRead,
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
                floorNamedChecks: 3,
                outlineChecks: 5,
                moneyChecks: 4,
                haloChecks: 1,
                fileClipChecks: 1,
                atRestSetAside: { 'the rain': 1 },
                buntingChecks: 2,
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

    it('owes a mark read on every look a pass painted but a private one (step 8f1)', () => {
        const painted = { sheetClasses: [...SHIPPED, 't-skeleton', 't-fixture-private'] };
        const marks = { 't-modern': 40, 't-neo': 40, 't-rural': 40, 't-skeleton': 40 };
        const options = { shippedClasses: SHIPPED, privateClasses: ['t-fixture-private'], skeleton: true };
        for (const pass of ['mobile', 'desktop', 'canvas', 'portrait', 'tablet']) {
            const read = {
                ...full,
                ...painted,
                rowSizeClasses: [...SHIPPED, 't-fixture-private'],
                markChecksByClass: marks,
                wallControlRolesByClass: { 't-modern': full.wallControlRoles, 't-fixture-private': full.wallControlRoles },
            };
            assert.deepEqual(probeCoverageGaps(pass, read, options), [], pass);
            assert.deepEqual(
                probeCoverageGaps(pass, { ...read, markChecksByClass: { ...marks, 't-rural': 0 } }, options),
                ['no-shipped-look-shows-a-mark read no mark on a t-rural stall'],
                pass,
            );
        }
    });

    it('owes a carried private look its row and its locked record, and never a door mini (8e2)', () => {
        const PRIVATE = ['t-fixture-private'];
        const options = { shippedClasses: SHIPPED, privateClasses: PRIVATE, paidPrivateClasses: PRIVATE, skeleton: true };
        const read = { ...full, rowSizeClasses: [...SHIPPED, ...PRIVATE], recordRoadChecks: 1 };
        for (const pass of ['mobile', 'desktop']) {
            assert.deepEqual(probeCoverageGaps(pass, read, options), [], pass);
            assert.deepEqual(probeCoverageGaps(pass, { ...read, rowSizeClasses: SHIPPED }, options), [
                'a-shipped-row-states-the-sizes-its-sheet-paints read no row for t-fixture-private',
            ]);
            assert.deepEqual(probeCoverageGaps(pass, { ...read, recordRoadChecks: 0 }, options), [
                'the-record-road-paints-a-locked-look-as-the-default painted 0 record(s) where the run carries 1 paid look(s) (t-fixture-private)',
            ]);
        }
        // The canvas paints no `offers`, and owes neither — but it owes the
        // carried look's own wall controls (8e2), never the public looks'.
        const walls = { wallControlRolesByClass: { 't-modern': full.wallControlRoles, 't-fixture-private': full.wallControlRoles } };
        assert.deepEqual(probeCoverageGaps('canvas', { ...full, ...walls, rowSizeClasses: [], recordRoadChecks: 0 }, options), []);
        assert.deepEqual(
            probeCoverageGaps('canvas', { ...full, wallControlRolesByClass: { 't-modern': full.wallControlRoles, 't-fixture-private': { ...full.wallControlRoles, 'window-pay': 0 } } }, options),
            ['nothing-on-the-wall-is-cut-from-below read no window-pay on a t-fixture-private wall'],
        );
        // The public count is the public looks' own: a carried look's reads
        // never stand in for theirs.
        assert.deepEqual(
            probeCoverageGaps('portrait', { ...full, wallControlRolesByClass: { 't-modern': { ...full.wallControlRoles, 'pay-borrowed': 0 }, 't-fixture-private': full.wallControlRoles } }, options),
            ['nothing-on-the-wall-is-cut-from-below read no pay-borrowed on a wall'],
        );
        // A free private look owes its row and no locked record; a run that
        // carries none owes no record either — and paints none.
        assert.deepEqual(
            probeCoverageGaps('mobile', { ...read, recordRoadChecks: 0 }, { ...options, paidPrivateClasses: [] }),
            [],
        );
        assert.deepEqual(probeCoverageGaps('mobile', { ...full, recordRoadChecks: 1 }, { shippedClasses: SHIPPED, skeleton: true }), [
            'the-record-road-paints-a-locked-look-as-the-default painted 1 record(s) where the run carries 0 paid look(s)',
        ]);
        assert.match(probeCoverageLine('mobile', read), /locked records painted as the default: 1/);
    });

    it('owes money nodes asked on the phone and the desk, and nowhere else', () => {
        for (const pass of ['mobile', 'desktop']) {
            assert.deepEqual(probeCoverageGaps(pass, { ...full, moneyChecks: 0 }, { shippedClasses: SHIPPED, skeleton: true }), [
                'the-money-set-is-every-protected-contrast-target asked no node',
            ]);
        }
        assert.deepEqual(probeCoverageGaps('canvas', { ...full, moneyChecks: 0 }, { shippedClasses: SHIPPED }), []);
    });

    it('owes a bunting swept wherever Rural is measured, and nowhere else', () => {
        assert.deepEqual(probeCoverageGaps('mobile', { ...full, buntingChecks: 0 }, { shippedClasses: SHIPPED, skeleton: true }), [
            'the-bunting-never-swings-into-the-ornament-label swept no bunting',
        ]);
        assert.deepEqual(probeCoverageGaps('desktop', { ...full, buntingChecks: 0 }, { shippedClasses: ['t-modern', 't-neo'] }).filter((g) => g.includes('bunting')), []);
        assert.deepEqual(probeCoverageGaps('canvas', { ...full, buntingChecks: 0 }, { shippedClasses: SHIPPED }), []);
    });

    it('owes an outlined line wherever Neo is measured, and nowhere else', () => {
        assert.deepEqual(probeCoverageGaps('mobile', { ...full, outlineChecks: 0 }, { shippedClasses: SHIPPED }), [
            'an-outline-where-the-text-has-its-own-ground read no outlined line',
        ]);
        assert.deepEqual(probeCoverageGaps('mobile', { ...full, atRestSetAside: {} }, { shippedClasses: SHIPPED }), [
            'an-outline-that-shows-at-rest read no rain-wearing root',
        ]);
        assert.deepEqual(probeCoverageGaps('desktop', { ...full, outlineChecks: 0 }, { shippedClasses: ['t-modern', 't-rural'] }).filter((g) => g.startsWith('an-outline')), []);
        assert.deepEqual(probeCoverageGaps('canvas', { ...full, outlineChecks: 0 }, { shippedClasses: SHIPPED }), []);
    });

    it('owes the rain’s outline rules and the bunting’s sweep wherever a look wore them, whatever its class', () => {
        // The kit's Neo starter is Neo's rows under `t-workshop`: no shipped
        // class is measured, and what the pass wore is what it owes.
        const kit = { unbuyableChecks: { row: 1, face: 1, 'wall-browse': 1 }, skipChecks: { 'wall-cycle': 1 }, floorNamedChecks: 40, moneyChecks: 20, haloChecks: 2, fileClipChecks: 90 };
        const neoKit = { ...kit, wornClasses: ['att-aurora', 'att-horizon', 'att-hum', 'att-rainfall'] };
        assert.deepEqual(probeCoverageGaps('mobile', neoKit), [
            'an-outline-where-the-text-has-its-own-ground read no outlined line',
            'an-outline-that-shows-at-rest read no rain-wearing root',
        ]);
        assert.deepEqual(probeCoverageGaps('mobile', { ...neoKit, outlineChecks: 9, atRestSetAside: { 'the rain': 9 } }), []);
        assert.deepEqual(probeCoverageGaps('desktop', { ...kit, wornClasses: ['att-bunting'] }), [
            'the-bunting-never-swings-into-the-ornament-label swept no bunting',
        ]);
        assert.deepEqual(probeCoverageGaps('desktop', { ...kit, wornClasses: ['att-bunting'], buntingChecks: 3 }), []);
        // Worn on the canvas, owed on the page passes alone, as for Neo.
        assert.deepEqual(probeCoverageGaps('canvas', { skipChecks: { 'stream-card': 1, 'stream-ticker': 1 }, wallControlRoles: full.wallControlRoles, statusLineChecks: 3, wornClasses: ['att-rainfall', 'att-bunting'] }), []);
    });

    it('asks the wall only of the desk, the stream only of the canvas, and nothing of the other passes', () => {
        const phoneOnly = { ...full, unbuyableChecks: { row: 1, face: 1 }, skipChecks: {} };
        assert.deepEqual(probeCoverageGaps('desktop', { ...full, floorNamedChecks: 0 }, { shippedClasses: SHIPPED }), [
            'small-text-is-at-least-11px read no named small-text node',
        ]);
        assert.deepEqual(probeCoverageGaps('mobile', phoneOnly, { shippedClasses: SHIPPED, skeleton: true }), []);
        // The canvas owes the stream's two skips and the wall's controls, and no label, row or ladder.
        assert.deepEqual(probeCoverageGaps('canvas', { skipChecks: { 'stream-card': 1 }, wallControlRoles: full.wallControlRoles, statusLineChecks: 3 }, {
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
                    statusLineChecks: 3,
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

    it('asks a kit run for the labels, skips and small text alone: it measures no shipped look and no skeleton', () => {
        const kit = { unbuyableChecks: { row: 1, face: 1, 'wall-browse': 1 }, skipChecks: { 'wall-cycle': 1 }, floorNamedChecks: 40, moneyChecks: 20, haloChecks: 2, fileClipChecks: 90 };
        assert.deepEqual(probeCoverageGaps('mobile', kit), []);
        assert.deepEqual(probeCoverageGaps('desktop', kit), []);
        assert.equal(probeCoverageGaps('mobile', {}).length, 6);
        assert.equal(probeCoverageGaps('canvas', {}).length, 10);
    });

    it('says what a pass read in one line, and nothing for a pass that owes nothing', () => {
        // The lines before 8f2's tallies and the Cycle card's steps, which have cases of their own.
        const { nameLinesByClass, nameTiersByClass, nameVerticalByClass, marksShownByClass, stickyByClass, tryOnNamesByClass, cycleFigureByClass, figureInkByClass, selfClipByClass, ...before } = full;
        assert.equal(
            probeCoverageLine('desktop', before),
            'unbuyable labels read: face 8, row 8, wall-browse 6 · skips seen: stream-card 4, stream-ticker 4, wall-cycle 7 · rows read: t-modern, t-neo, t-rural · door minis: t-modern, t-neo, t-rural · small text read: 900 (under 11px, aria-hidden: t-neo span.sm-cap 9.5px (aria-hidden)) · outlined lines read: 400 · money nodes asked: 300 · halos asked: 30 · words asked about a mask from a file: 5000 · at rest, set aside: the backdrop’s scanlines 120, the rain 120 · bunting rows swept: 40 · skeleton ladder: tier 1 2, tier 2 1, tier 3 1',
        );
        const quiet = { ...before, smallText: [] };
        assert.equal(
            probeCoverageLine('canvas', quiet),
            'unbuyable labels read: face 8, row 8, wall-browse 6 · skips seen: stream-card 4, stream-ticker 4, wall-cycle 7 · wall controls read: 24 · status line asked: 50',
        );
        assert.equal(probeCoverageLine('tablet', quiet), 'wall controls read: 24 · status line asked: 50');
        assert.equal(
            probeCoverageLine('tablet', {
                ...quiet,
                wallSlivers: ['pay-3 Modern: window-step-more 12/72px y', 'pay-3 Rural: window-step-more 28/72px y'],
            }),
            'wall controls read: 24 · status line asked: 50 · shown only in part inside a scroller: window-step-more ×2 (least 12/72px)',
        );
        // Text no reader is given is printed on every pass that paints some.
        assert.equal(
            probeCoverageLine('portrait', before),
            'wall controls read: 24 · status line asked: 50 · under 11px, aria-hidden: t-neo span.sm-cap 9.5px (aria-hidden)',
        );
        assert.equal(probeCoverageLine('reduced-motion', before), '');
        // The marks read hidden, per look, on every pass that reports them.
        const marked = { ...quiet, markChecksByClass: { 't-neo': 9, 't-modern': 7 } };
        assert.match(probeCoverageLine('desktop', marked), / · rows read: t-modern, t-neo, t-rural · marks read hidden: t-modern 7, t-neo 9 · door minis/);
        assert.match(probeCoverageLine('canvas', marked), /status line asked: 50 · marks read hidden: t-modern 7, t-neo 9$/);
        assert.equal(probeCoverageLine('tablet', marked), 'wall controls read: 24 · status line asked: 50 · marks read hidden: t-modern 7, t-neo 9');
        // 8f2: the sign's lines, the rungs, the marks shown and the sticky
        // signs, per look, on the page and wall passes.
        assert.match(
            probeCoverageLine('desktop', { ...quiet, nameLinesByClass, nameTiersByClass, marksShownByClass, stickyByClass, tryOnNamesByClass }),
            / · sign lines read whole: t-fixture-private 40, t-modern 40, t-neo 40, t-rural 40, t-skeleton 40 · name rungs: t-fixture-private 1:2\/2:1 · marks shown: t-fixture-private 30 · sticky signs \(paints\/scrolled\/stops\): t-fixture-private paints:20\/scrolled:18\/stops:90 · stress names tried on: t-fixture-private 2$/,
        );
        assert.match(probeCoverageLine('tablet', { ...quiet, nameLinesByClass: { 't-neo': 3 } }), /status line asked: 50 · sign lines read whole: t-neo 3$/);
    });
});

describe('the-step-8f2-rules-owe-their-subjects', () => {
    /**
     * Step 8f2: every look a page or wall pass painted owes sign lines read
     * whole (`the-sellers-name-stands-whole`); a sticky sign on a page pass
     * owes a region that scrolled under it
     * (`a-sticky-sign-covers-nothing-as-the-region-scrolls`); and a run that
     * carries the tracked fixture owes each of its subjects — a region
     * scrolled under its sticky sign and a mark it showed at the desk, a
     * rung its long name climbed on both page passes — so a fixture edit
     * that took one away fails the run.
     */
    const marks = { 't-modern': 40, 't-neo': 40, 't-rural': 40, 't-skeleton': 40 };
    let painted;
    let options;
    let read;
    before(() => {
        painted = { sheetClasses: [...SHIPPED, 't-skeleton', 't-fixture-private'] };
        options = { shippedClasses: SHIPPED, privateClasses: ['t-fixture-private'], skeleton: true };
        read = {
            ...full,
            ...painted,
            rowSizeClasses: [...SHIPPED, 't-fixture-private'],
            markChecksByClass: marks,
            wallControlRolesByClass: { 't-modern': full.wallControlRoles, 't-fixture-private': full.wallControlRoles },
        };
    });

    it('passes every pass that read every subject it owes', () => {
        for (const pass of ['mobile', 'desktop', 'canvas', 'portrait', 'tablet']) {
            assert.deepEqual(probeCoverageGaps(pass, read, options), [], pass);
        }
    });

    it('owes sign lines on every look a page or wall pass painted, and none of a pass that paints no sign', () => {
        for (const pass of ['mobile', 'desktop', 'canvas', 'portrait', 'tablet']) {
            assert.deepEqual(
                probeCoverageGaps(pass, { ...read, nameLinesByClass: { ...full.nameLinesByClass, 't-neo': 0 } }, options),
                ['the-sellers-name-stands-whole read no line of the sign on a t-neo stall'],
                pass,
            );
        }
        assert.deepEqual(probeCoverageGaps('reduced-motion', { ...read, nameLinesByClass: {} }, options), []);
    });

    it('owes a sticky sign a region that scrolled, on a page pass', () => {
        const stuck = { ...read, stickyByClass: { ...full.stickyByClass, 't-rural': { paints: 4, scrolled: 0, stops: 0 } } };
        assert.deepEqual(probeCoverageGaps('desktop', stuck, options), [
            'a-sticky-sign-covers-nothing-as-the-region-scrolls found a sticky sign on a t-rural stall and no region it scrolled',
        ]);
        assert.deepEqual(probeCoverageGaps('canvas', stuck, options), []);
    });

    it('owes the tracked fixture its sticky sign, its mark and its rung, where it is carried', () => {
        const bare = { ...read, stickyByClass: {}, marksShownByClass: {}, nameTiersByClass: {}, nameVerticalByClass: {}, nameOwnClipByClass: {} };
        assert.deepEqual(probeCoverageGaps('desktop', bare, options), [
            'a-sticky-sign-covers-nothing-as-the-region-scrolls scrolled no region under the t-fixture-private sign',
            'no-look-mark-paints-inside-a-protected-box has no subject: the t-fixture-private stall showed no mark',
            'the-sellers-name-stands-whole read no t-fixture-private name on a rung of its ladder',
            'the-sellers-name-stands-whole read no vertical t-fixture-private name',
            'the-sellers-name-stands-whole read no t-fixture-private line under its own clip',
        ]);
        assert.deepEqual(probeCoverageGaps('mobile', bare, options), [
            'the-sellers-name-stands-whole read no t-fixture-private name on a rung of its ladder',
            'the-sellers-name-stands-whole read no t-fixture-private name on the last rung of its ladder',
            'the-sellers-name-stands-whole read no t-fixture-private line under its own clip',
        ]);
        assert.deepEqual(probeCoverageGaps('mobile', { ...read, nameTiersByClass: { 't-fixture-private': { 1: 4 } } }, options), [
            'the-sellers-name-stands-whole read no t-fixture-private name on the last rung of its ladder',
        ]);
        // A pass that measured the CJK screen owes the face it read.
        assert.deepEqual(probeCoverageGaps('mobile', { ...read, screensMeasured: ['cjk-name'] }, options), [
            'a-cjk-name-is-set-in-a-cjk-face read no CJK sign line on a pass that measured cjk-name',
        ]);
        assert.deepEqual(probeCoverageGaps('mobile', { ...read, screensMeasured: ['cjk-name'], cjkFaces: ['0.945em'] }, options), []);
        // Every carried look owes its stress names on a try-on, on a page pass.
        assert.deepEqual(probeCoverageGaps('mobile', { ...read, tryOnNamesByClass: {} }, options), [
            'the-sellers-name-stands-whole measured no stress name on a try-on of t-fixture-private',
        ]);
        assert.deepEqual(probeCoverageGaps('canvas', { ...read, tryOnNamesByClass: {} }, options), []);
        // A run that carries other private looks owes the fixture's nothing.
        assert.deepEqual(
            probeCoverageGaps('desktop', { ...bare, sheetClasses: [...SHIPPED, 't-skeleton'] }, { shippedClasses: SHIPPED, skeleton: true }),
            [],
        );
    });
});

describe('a-look-is-measured-with-its-sheet', () => {
    /** A pass owes, for every look it measures but the skeleton, a stall whose sheet named it. */
    it('refuses a pass that read no sheet name for a look it measures, on every pass', () => {
        for (const pass of ['mobile', 'desktop', 'canvas', 'portrait', 'tablet']) {
            const gaps = probeCoverageGaps(pass, { ...full, lookSheetsRead: ['t-modern', 't-neo'] }, { sheetedClasses: SHIPPED });
            assert.ok(gaps.includes("a-look-is-measured-with-its-sheet read no sheet's name on a t-rural stall"), `${pass}: ${gaps.join('; ')}`);
            const whole = probeCoverageGaps(pass, { ...full, lookSheetsRead: SHIPPED }, { sheetedClasses: SHIPPED });
            assert.ok(!whole.some((g) => g.startsWith('a-look-is-measured-with-its-sheet')), `${pass}: ${whole.join('; ')}`);
        }
    });
});

describe('a-worn-only-sheet-loads-under-the-production-policy', () => {
    const held = {
        url: '/assets/fixture-look-abc.css',
        before: '',
        loaded: true,
        error: '',
        last: true,
        sameOrigin: true,
        after: 't-fixture-worn',
        art: [200],
        state: 'ready',
        askedAgain: true,
        links: 1,
        missingRejected: true,
        missingState: 'failed',
        missingAgainRejected: true,
        missingLinks: 1,
        inEntryCss: false,
        refusals: [],
    };

    it('holds a job that loaded, landed last, named itself, fetched its art and refused a missing sheet', () => {
        assert.deepEqual(wornSheetJobFaults(held), []);
    });

    it('names each way the road can fail', () => {
        for (const [change, pattern] of [
            [{ before: 't-fixture-worn' }, /in the entry CSS/],
            [{ inEntryCss: true }, /already on the page/],
            [{ loaded: false, error: 'the look sheet at x did not load', after: '' }, /did not load/],
            [{ last: false }, /did not land after/],
            [{ sameOrigin: false }, /not same-origin/],
            [{ after: '' }, /names ""/],
            [{ art: [] }, /never fetched/],
            [{ art: [404] }, /answered 404/],
            [{ missingRejected: false }, /did not reject/],
            [{ state: 'pending' }, /holds the loaded sheet as "pending"/],
            [{ askedAgain: false }, /did not answer the same link/],
            [{ links: 2 }, /2 links on the page for one sheet/],
            [{ links: 0 }, /0 links on the page for one sheet/],
            [{ missingState: 'ready' }, /does not exist as "ready"/],
            [{ missingAgainRejected: false }, /asked again, a sheet that does not exist did not reject/],
            [{ missingLinks: 2 }, /2 links on the page for a sheet that does not exist/],
            [{ refusals: [{ directive: 'style-src-elem', blocked: 'inline', source: '' }] }, /refused inline under style-src-elem/],
        ]) {
            const faults = wornSheetJobFaults({ ...held, ...change });
            assert.ok(faults.some((f) => pattern.test(f)), `${JSON.stringify(change)}: ${faults.join('; ') || '(none)'}`);
        }
    });
});

describe('no-word-is-clipped-by-a-file', () => {
    it('refuses a phone or desk pass that asked no element with words, and owes nothing elsewhere', () => {
        for (const pass of ['mobile', 'desktop']) {
            const gaps = probeCoverageGaps(pass, { ...full, fileClipChecks: 0 }, { shippedClasses: SHIPPED });
            assert.ok(gaps.includes('no-word-is-clipped-by-a-file asked no element with words'), `${pass}: ${gaps.join('; ')}`);
        }
        const canvas = probeCoverageGaps('canvas', { ...full, fileClipChecks: 0 }, { shippedClasses: SHIPPED });
        assert.ok(!canvas.some((g) => g.startsWith('no-word-is-clipped-by-a-file')), canvas.join('; '));
    });
});

describe('owed-follows-what-a-pass-wore', () => {
    it('holds when what the passes wore is owed, and when nothing that is owed by name was worn', () => {
        assert.deepEqual(owedFaults({ rain: ['mobile/empty/255/65535'], horizon: ['mobile/offers/255/4'] }, ['att-aurora', 'att-horizon', 'att-rainfall']), []);
        assert.deepEqual(owedFaults({ rain: [], horizon: [] }, ['att-awning', 'att-pinstripe']), []);
        assert.deepEqual(owedFaults({ rain: [], horizon: [] }, []), []);
    });

    it('fails an answer that is not two lists', () => {
        const said = ['owed-follows-what-a-pass-wore: the page answered no rain list and horizon list (__contrastOwed)'];
        for (const answer of [undefined, null, {}, { rain: [] }, { horizon: [] }, { rain: 'mobile/empty/2/65535', horizon: [] }, []]) {
            assert.deepEqual(owedFaults(answer, ['att-rainfall']), said, JSON.stringify(answer));
            assert.deepEqual(owedFaults(answer, []), said, JSON.stringify(answer));
        }
    });

    it('fails a decoration a pass wore that no job owes', () => {
        assert.deepEqual(owedFaults({ rain: [], horizon: ['mobile/offers/255/4'] }, ['att-rainfall', 'att-horizon']), [
            'owed-follows-what-a-pass-wore: a pass wore att-rainfall and the page owes its rain on no contrast job (__contrastOwed)',
        ]);
        assert.deepEqual(owedFaults({ rain: ['x'], horizon: [] }, ['att-rainfall', 'att-horizon']), [
            'owed-follows-what-a-pass-wore: a pass wore att-horizon and the page owes its horizon on no contrast job (__contrastOwed)',
        ]);
    });
});

const STATES_8G1_CLASSES = [...SHIPPED, 't-skeleton'];
const STATES_8G1_OPTIONS = { shippedClasses: SHIPPED, skeleton: true };

describe('the-8g1-states-owe-their-subjects', () => {
    /**
     * The 8g1 critic's states: a staged screen (`STAGED` in
     * `layout/fixtures.ts`) owes a node it pressed on every look it was
     * painted on, and `addr-shown` an address in its shown state on every
     * look a pass painted. A fixture or a stage that stopped putting its
     * state on the tree fails the run rather than leaving the rule green
     * over the plain paint.
     *
     * The sign's words rule owes pairs compared on every look a page pass
     * painted, and the tagline invite read where the pass measured
     * `empty-pasted`.
     */
    let read;
    before(() => {
        read = {
            ...full,
            sheetClasses: STATES_8G1_CLASSES,
            rowSizeClasses: SHIPPED,
            markChecksByClass: Object.fromEntries(STATES_8G1_CLASSES.map((cls) => [cls, 40])),
            screensMeasured: ['addr-shown', 'empty-pasted'],
            stagedByClass: Object.fromEntries(STATES_8G1_CLASSES.map((cls) => [cls, { 'addr-shown': 2 }])),
        };
    });

    it('passes a page pass that staged and read every state it owes', () => {
        for (const pass of ['mobile', 'desktop']) {
            assert.deepEqual(probeCoverageGaps(pass, read, STATES_8G1_OPTIONS), [], pass);
        }
    });

    it('owes every staged screen a node it pressed, and addr-shown an address on every look', () => {
        assert.deepEqual(
            probeCoverageGaps('mobile', { ...read, stagedByClass: { ...read.stagedByClass, 't-neo': { 'addr-shown': 0 } } }, STATES_8G1_OPTIONS),
            [
                'addr-shown staged nothing on a t-neo stall — its state was never on the tree it measured',
                'addr-shown put no address in its shown state on a t-neo stall',
            ],
        );
        const { 't-rural': _gone, ...rest } = read.stagedByClass;
        assert.deepEqual(probeCoverageGaps('desktop', { ...read, stagedByClass: rest }, STATES_8G1_OPTIONS), [
            'addr-shown put no address in its shown state on a t-rural stall',
        ]);
        // A pass that did not measure the screen owes nothing of it.
        assert.deepEqual(probeCoverageGaps('desktop', { ...read, stagedByClass: rest, screensMeasured: [] }, STATES_8G1_OPTIONS), []);
    });

    it('owes pairs of sign lines on every look a page pass painted, and the invite where empty-pasted was measured', () => {
        const words = { ...read.signWordsByClass, 't-modern': { pairs: 0, invites: 0 } };
        assert.deepEqual(probeCoverageGaps('mobile', { ...read, signWordsByClass: words }, STATES_8G1_OPTIONS), [
            'the-signs-words-never-stand-on-each-other compared no two lines of the sign on a t-modern stall',
            'the-signs-words-never-stand-on-each-other read no tagline invite in the sign on a t-modern stall',
        ]);
        assert.deepEqual(probeCoverageGaps('mobile', { ...read, signWordsByClass: words, screensMeasured: ['addr-shown'] }, STATES_8G1_OPTIONS), [
            'the-signs-words-never-stand-on-each-other compared no two lines of the sign on a t-modern stall',
        ]);
        assert.deepEqual(probeCoverageGaps('canvas', { ...read, signWordsByClass: {}, stagedByClass: {}, screensMeasured: [] }, STATES_8G1_OPTIONS), []);
    });
});

/*
 * The narrow pass (360x800, 2026-10-13; round 2): what it read of the card
 * figures, on every look it painted, built at module top (a describe body
 * registers and never computes, `no-node-test-computes-in-a-describe-body`).
 */
const NARROW_LOOKS = [...SHIPPED, 't-skeleton', 't-fixture-private'];
const narrowRead = {
    sheetClasses: NARROW_LOOKS,
    lookSheetsRead: [...SHIPPED, 't-fixture-private'],
    markChecksByClass: Object.fromEntries(NARROW_LOOKS.filter((cls) => cls !== 't-fixture-private').map((cls) => [cls, 20])),
    ...cardRead,
    ...moneyRead,
};
const NARROW_OPTIONS = { privateClasses: ['t-fixture-private'], sheetedClasses: [...SHIPPED, 't-fixture-private'] };
/** The narrow read with one look's card figure reads replaced. */
const narrowWithout = (cls, read) => ({ ...narrowRead, cardFigureByClass: { ...narrowRead.cardFigureByClass, [cls]: read } });
const RURAL_NO_FACE_1 = Object.fromEntries(Object.entries(EVERY_CARD_STEP).filter(([place]) => place !== 'face:1'));
const NEO_NO_PAID_2 = Object.fromEntries(Object.entries(EVERY_CARD_STEP).filter(([place]) => place !== 'paid:2'));

describe('the-narrow-pass-owes-the-long-card-figures', () => {
    it('owes every step of the face, You pay and a pay figure, and a line beside its name, on its own row and broken, on every look', () => {
        assert.deepEqual(
            [...CARD_FIGURES_OWED],
            ['face:0', 'face:1', 'face:2', 'face:3', 'paid:0', 'paid:1', 'paid:2', 'paid:3', 'pay:0', 'pay:1', 'pay:2', 'pay:3', 'line:0', 'line:2', 'line:3'],
        );
        assert.deepEqual(probeCoverageGaps('narrow', narrowRead, NARROW_OPTIONS), []);
        assert.deepEqual(probeCoverageGaps('narrow', narrowWithout('t-rural', RURAL_NO_FACE_1), NARROW_OPTIONS), [
            'a-card-figure-stands-inside-its-row read no face:1 figure on a t-rural stall',
        ]);
        assert.deepEqual(probeCoverageGaps('narrow', narrowWithout('t-neo', NEO_NO_PAID_2), NARROW_OPTIONS), [
            'a-card-figure-stands-inside-its-row read no paid:2 figure on a t-neo stall',
        ]);
        assert.deepEqual(
            probeCoverageGaps('narrow', { ...narrowRead, cardFigureByClass: {} }, NARROW_OPTIONS).length,
            NARROW_LOOKS.length * CARD_FIGURES_OWED.length,
        );
    });

    it('owes the four figures\' painted ladders over all four tiers, by name', () => {
        assert.deepEqual([...CARD_LADDERS_OWED], ['face:price', 'face:seller-price', 'paid:figure', 'pay:price']);
        const shortLadder = {
            ...narrowRead,
            cardLadderByClass: { ...narrowRead.cardLadderByClass, 't-neo': { ...EVERY_LADDER, 'pay:price': '03', 'paid:figure': undefined } },
        };
        assert.deepEqual(probeCoverageGaps('narrow', shortLadder, NARROW_OPTIONS), [
            'a-card-figure-steps-down-on-every-look compared the paid:figure ladder over no tier on a t-neo stall, not all four',
            'a-card-figure-steps-down-on-every-look compared the pay:price ladder over tiers 0, 3 on a t-neo stall, not all four',
        ]);
        // A fifth figure never stands in for a missing one.
        const swapped = {
            ...narrowRead,
            cardLadderByClass: { ...narrowRead.cardLadderByClass, 't-rural': { 'face:price': '0123', 'face:seller-price': '0123', 'pay:price': '0123', 'line:figure': '0123' } },
        };
        assert.deepEqual(probeCoverageGaps('narrow', swapped, NARROW_OPTIONS), [
            'a-card-figure-steps-down-on-every-look compared the paid:figure ladder over no tier on a t-rural stall, not all four',
        ]);
    });

    it('owes the same of the phone at 390, which measures the same screens, and nothing of the desk', () => {
        const owed = probeCoverageGaps('mobile', { ...full, ...narrowRead, cardFigureByClass: {}, cardLadderByClass: {} }, NARROW_OPTIONS);
        assert.equal(
            owed.filter((gap) => gap.startsWith('a-card-figure-stands-inside-its-row')).length,
            NARROW_LOOKS.length * CARD_FIGURES_OWED.length,
        );
        assert.equal(
            owed.filter((gap) => gap.startsWith('a-card-figure-steps-down-on-every-look')).length,
            NARROW_LOOKS.length * CARD_LADDERS_OWED.length,
        );
        const desk = probeCoverageGaps('desktop', { ...full, ...narrowRead, cardFigureByClass: {}, cardLadderByClass: {} }, NARROW_OPTIONS);
        assert.equal(desk.filter((gap) => gap.startsWith('a-card-figure')).length, 0);
    });

    it('prints the card figures it read and the ladders it compared on the pass\'s line', () => {
        assert.match(
            probeCoverageLine('narrow', narrowRead),
            /^card figures read: face:0 10, face:1 10, face:2 10, face:3 10, line:0 20, line:2 10, line:3 20, paid:0 10, paid:1 10, paid:2 10, paid:3 10, pay:0 10, pay:1 10, pay:2 10, pay:3 10 · ladders compared: 20/,
        );
    });
});

/** The five wall passes, and every look they may paint (the Cycle card's ladder, 2026-10-13). */
const WALLS = ['canvas', 'desk-wall', 'short-wall', 'portrait', 'tablet'];
const painted = { sheetClasses: CARD_LOOKS };

describe('the-wall-passes-owe-the-cycle-cards-every-step', () => {
    /**
     * The Cycle card's ladder (2026-10-13, the critic's P1 on narrow-phone
     * round 4): every wall pass — the canvas, the two desk walls, the tall
     * wall and the counter tablet — owes `a-cycle-card-shows-every-digit-at-every-wall-size`
     * a read of every step on every look it painted, so a fixture that stopped
     * painting a step leaves a gap and not a green pass over nothing.
     */
    it('owes ten steps, and every wall pass owes each on every look it painted', () => {
        assert.deepEqual([...CYCLE_STEPS_OWED], ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
        for (const pass of WALLS) {
            const read = { ...full, ...painted, wallControlRolesByClass: undefined };
            assert.deepEqual(
                probeCoverageGaps(pass, read).filter((gap) => gap.startsWith('a-cycle-card')),
                [],
                pass,
            );
            const noStep7 = { ...read, cycleFigureByClass: { ...full.cycleFigureByClass, 't-rural': { ...full.cycleFigureByClass['t-rural'], 7: 0 } } };
            assert.deepEqual(
                probeCoverageGaps(pass, noStep7).filter((gap) => gap.startsWith('a-cycle-card')),
                ['a-cycle-card-shows-every-digit-at-every-wall-size read no step-7 Cycle figure on a t-rural wall'],
                pass,
            );
            assert.equal(
                probeCoverageGaps(pass, { ...read, cycleFigureByClass: {} }).filter((gap) => gap.startsWith('a-cycle-card')).length,
                CARD_LOOKS.length * CYCLE_STEPS_OWED.length,
                pass,
            );
        }
        // A page pass owes none: the desk wall pass reads the desk's own size.
        for (const pass of ['mobile', 'desktop', 'narrow']) {
            assert.equal(
                probeCoverageGaps(pass, { ...full, ...painted, cycleFigureByClass: {} }).filter((gap) => gap.startsWith('a-cycle-card')).length,
                0,
                pass,
            );
        }
    });

    it('owes the touch wall\'s controls of the two desk walls too', () => {
        for (const pass of ['desk-wall', 'short-wall']) {
            assert.deepEqual(
                probeCoverageGaps(pass, { ...full, wallControlRoles: { ...full.wallControlRoles, 'window-back': 0 } }),
                ['nothing-on-the-wall-is-cut-from-below read no window-back on a wall'],
                pass,
            );
        }
    });

    it('prints the Cycle figures it read by step on a wall pass\'s line', () => {
        assert.match(
            probeCoverageLine('short-wall', { wallControlChecks: 2, statusLineChecks: 3, cycleFigureByClass: { 't-neo': { 0: 2, 9: 1 }, 't-rural': { 0: 1, 10: 4 } } }),
            /^wall controls read: 2 · status line asked: 3 · Cycle figures read by step: 0:3 9:1 10:4$/,
        );
    });

    it('owes the ladder\'s own steps: one more than window.ts\'s ceilings', () => {
        const source = readFileSync(new URL('../src/ui/window.ts', import.meta.url), 'utf8');
        const ceilings = source.match(/export const WALL_FIGURE_CEILINGS = \[([^\]]*)\] as const;/);
        assert.ok(ceilings, 'WALL_FIGURE_CEILINGS in window.ts');
        assert.equal(CYCLE_STEPS_OWED.length, ceilings[1].split(',').length + 1);
    });
});

/** Every geometry pass the runner names (D-2026-10-14-02's two money rules are owed on each). */
const GEOMETRY = ['mobile', 'desktop', 'canvas', 'portrait', 'tablet', 'desk-wall', 'short-wall', 'narrow'];
const MONEY_RULE = /^a-(?:broken-figure-wears-the-figures-own-ink|money-figure-never-clips-itself) /;

describe('the-money-rules-are-owed-on-every-look-of-every-geometry-pass', () => {
    /**
     * D-2026-10-14-02: `a-broken-figure-wears-the-figures-own-ink` and
     * `a-money-figure-never-clips-itself` run on every geometry pass. The ink
     * rule is owed on every surface a pass paints a broken figure on, every
     * look (round 2, the critic's P3-3: one read a look let a surface stop
     * being read and stay green); the self-clip rule some money figures a
     * look. The contrast and reduced-motion passes owe neither.
     */
    it('owes the surfaces each geometry pass paints, by name', () => {
        const page = ['face', 'paid', 'pay', 'line', 'total', 'strip', 'chosen', 'row'];
        assert.deepEqual(FIGURE_SURFACES_OWED, {
            mobile: page,
            narrow: page,
            desktop: [...page, 'wall', 'cycle'],
            canvas: ['wall', 'cycle'],
            portrait: ['wall', 'cycle'],
            tablet: ['wall', 'cycle'],
            'desk-wall': ['wall', 'cycle'],
            'short-wall': ['wall', 'cycle'],
        });
        assert.deepEqual(Object.keys(FIGURE_SURFACES_OWED).sort(), [...GEOMETRY].sort());
    });

    it('owes both on every look each geometry pass painted, and names the look and surface that read none', () => {
        for (const pass of GEOMETRY) {
            const read = { ...full, ...painted, wallControlRolesByClass: undefined };
            assert.deepEqual(probeCoverageGaps(pass, read).filter((gap) => MONEY_RULE.test(gap)), [], pass);
            const surface = FIGURE_SURFACES_OWED[pass].at(-1);
            const short = {
                ...read,
                figureInkByClass: { ...read.figureInkByClass, 't-neo': { ...EVERY_SURFACE, [surface]: 0 } },
                selfClipByClass: { ...read.selfClipByClass, 't-rural': 0 },
            };
            assert.deepEqual(
                probeCoverageGaps(pass, short).filter((gap) => MONEY_RULE.test(gap)),
                [
                    `a-broken-figure-wears-the-figures-own-ink read no broken figure on a t-neo stall's ${surface}`,
                    'a-money-figure-never-clips-itself asked no money figure on a t-rural stall',
                ],
                pass,
            );
            assert.equal(
                probeCoverageGaps(pass, { ...read, figureInkByClass: {}, selfClipByClass: {} }).filter((gap) => MONEY_RULE.test(gap)).length,
                CARD_LOOKS.length * (FIGURE_SURFACES_OWED[pass].length + 1),
                pass,
            );
        }
        for (const pass of ['reduced-motion', 'contrast']) {
            assert.deepEqual(probeCoverageGaps(pass, { ...painted }).filter((gap) => MONEY_RULE.test(gap)), [], pass);
        }
    });

    it('prints both on every geometry pass\'s line', () => {
        const read = { figureInkByClass: { 't-neo': { face: 3 }, 't-modern': { cycle: 2, wall: 1 } }, selfClipByClass: { 't-modern': 40 } };
        assert.match(probeCoverageLine('narrow', read), / · broken figures held to their ink: t-modern cycle:2\/wall:1, t-neo face:3 · money figures asked about a self-clip: t-modern 40/);
        assert.match(
            probeCoverageLine('tablet', { wallControlChecks: 2, statusLineChecks: 3, ...read }),
            /^wall controls read: 2 · status line asked: 3 · broken figures held to their ink: t-modern cycle:2\/wall:1, t-neo face:3 · money figures asked about a self-clip: t-modern 40$/,
        );
        assert.match(probeCoverageLine('desktop', { ...full, ...read }), / · broken figures held to their ink: t-modern cycle:2\/wall:1, t-neo face:3 · money figures asked about a self-clip: t-modern 40/);
    });
});
