import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { owedFaults, probeCoverageGaps, probeCoverageLine, wornSheetJobFaults } from './probe-coverage.mjs';

const SHIPPED = ['t-modern', 't-neo', 't-rural'];
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
        assert.equal(
            probeCoverageLine('desktop', full),
            'unbuyable labels read: face 8, row 8, wall-browse 6 · skips seen: stream-card 4, stream-ticker 4, wall-cycle 7 · rows read: t-modern, t-neo, t-rural · door minis: t-modern, t-neo, t-rural · small text read: 900 (under 11px, aria-hidden: t-neo span.sm-cap 9.5px (aria-hidden)) · outlined lines read: 400 · money nodes asked: 300 · halos asked: 30 · words asked about a mask from a file: 5000 · at rest, set aside: the backdrop’s scanlines 120, the rain 120 · bunting rows swept: 40 · skeleton ladder: tier 1 2, tier 2 1, tier 3 1',
        );
        const quiet = { ...full, smallText: [] };
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
            probeCoverageLine('portrait', full),
            'wall controls read: 24 · status line asked: 50 · under 11px, aria-hidden: t-neo span.sm-cap 9.5px (aria-hidden)',
        );
        assert.equal(probeCoverageLine('reduced-motion', full), '');
        // The marks read hidden, per look, on every pass that reports them.
        const marked = { ...quiet, markChecksByClass: { 't-neo': 9, 't-modern': 7 } };
        assert.match(probeCoverageLine('desktop', marked), / · rows read: t-modern, t-neo, t-rural · marks read hidden: t-modern 7, t-neo 9 · door minis/);
        assert.match(probeCoverageLine('canvas', marked), /status line asked: 50 · marks read hidden: t-modern 7, t-neo 9$/);
        assert.equal(probeCoverageLine('tablet', marked), 'wall controls read: 24 · status line asked: 50 · marks read hidden: t-modern 7, t-neo 9');
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
