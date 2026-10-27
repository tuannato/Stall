/**
 * 1d: a code's modules read in pixels (before 8g2; report-only until step 7c;
 * `code-modules.mjs`, `PROBE-RULES.md`, "Before 8g2, 1d: the code's
 * modules"). The pure half: where each module's centre pixel is, what reads
 * wrong, and the read-again it shares with the quiet zone.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    MODULE_DARK_MAX,
    MODULE_LIGHT_MIN,
    MODULE_MIN_PX,
    foldStats,
    moduleCentres,
    moduleReadingLine,
    moduleReport,
    readCodeModules,
    readModules,
    withMatrices,
} from './code-modules.mjs';
import { QUIET_MODULES, QUIET_ZONE_FLOOR, readQuietZones } from './quiet-zone.mjs';

/** A matrix of `n` modules, dark where `dark(r, c)`. */
const matrixOf = (n, dark) => {
    let bits = '';
    for (let r = 0; r < n; r += 1) for (let c = 0; c < n; c += 1) bits += dark(r, c) ? '1' : '0';
    return { n, bits };
};
const CHECKER = matrixOf(21, (r, c) => (r + c) % 2 === 0);

/** A zone for a code of `matrix` drawn at `x, y` with `module` px a module, unclipped. */
const zoneOf = (matrix, { x = 10.3, y = 20.6, module = 4.7, name = 'pay-qr' } = {}) => ({
    name,
    x,
    y,
    side: (matrix.n + 2 * QUIET_MODULES) * module,
    module,
    corner: 0,
    clip: { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 },
    turned: false,
    scrolled: [],
    matrix,
});

/** A white shot with `zone`'s code painted on it as the browser would: black where a module is dark, each pixel by its coverage. */
const shotOf = (zone, width = 220, height = 240) => {
    const data = new Uint8Array(width * height * 4).fill(255);
    const { n, bits } = zone.matrix;
    for (let py = 0; py < height; py += 1) {
        for (let px = 0; px < width; px += 1) {
            // Coverage of the pixel by dark modules, sampled 4x4.
            let dark = 0;
            for (let sy = 0; sy < 4; sy += 1) {
                for (let sx = 0; sx < 4; sx += 1) {
                    const c = Math.floor((px + (sx + 0.5) / 4 - zone.x) / zone.module) - QUIET_MODULES;
                    const r = Math.floor((py + (sy + 0.5) / 4 - zone.y) / zone.module) - QUIET_MODULES;
                    if (r >= 0 && c >= 0 && r < n && c < n && bits[r * n + c] === '1') dark += 1;
                }
            }
            const v = Math.round(255 * (1 - dark / 16));
            const i = (py * width + px) * 4;
            data[i] = data[i + 1] = data[i + 2] = v;
        }
    }
    return { width, height, bpp: 4, data };
};

/** Paints `rgb` over the box `[x0, y0, x1, y1)` of `img`, at `alpha`. */
const paintOver = (img, [x0, y0, x1, y1], rgb, alpha = 1) => {
    for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
            const i = (y * img.width + x) * img.bpp;
            for (let k = 0; k < 3; k += 1) img.data[i + k] = Math.round(alpha * rgb[k] + (1 - alpha) * img.data[i + k]);
        }
    }
    return img;
};

describe('a-codes-modules-read-as-its-matrix', () => {
    it('pins the cuts and the least module by value, the quiet zone’s floor mirrored', () => {
        assert.equal(MODULE_DARK_MAX, 10);
        assert.equal(MODULE_LIGHT_MIN, 245);
        assert.equal(MODULE_LIGHT_MIN, QUIET_ZONE_FLOOR);
        assert.equal(MODULE_DARK_MAX, 255 - QUIET_ZONE_FLOOR);
        assert.equal(MODULE_MIN_PX, 2);
    });

    it('reads one centre pixel a module, wholly inside its module, at any offset from two pixels a module up', () => {
        for (const module of [2, 2.01, 2.5, 3.37, 4.46, 4.94, 5.18, 7.9]) {
            for (const off of [0, 0.01, 0.25, 0.5, 0.75, 0.99]) {
                const z = zoneOf(CHECKER, { x: 3 + off, y: 7 + off / 2, module });
                const { centres, fault } = moduleCentres(z, 1000, 1000);
                assert.equal(fault, undefined);
                assert.equal(centres.length, 21 * 21);
                for (const { r, c, x, y } of centres) {
                    const left = z.x + (c + QUIET_MODULES) * module;
                    const top = z.y + (r + QUIET_MODULES) * module;
                    assert.ok(x >= left && x + 1 <= left + module, `column ${c} at ${module}px, offset ${off}: pixel ${x} outside ${left}–${left + module}`);
                    assert.ok(y >= top && y + 1 <= top + module, `row ${r} at ${module}px, offset ${off}: pixel ${y} outside ${top}–${top + module}`);
                }
            }
        }
    });

    it('refuses a module under two pixels, a matrix that did not arrive and a square that is not its matrix and quiet zone', () => {
        assert.match(moduleCentres(zoneOf(CHECKER, { module: 1.99 }), 1000, 1000).fault, /a module is 1\.99px, under the 2 device pixels/);
        const missing = { ...zoneOf(CHECKER), matrix: undefined, matrixFault: 'its path is not the squares qrSvg draws' };
        assert.match(moduleCentres(missing, 1000, 1000).fault, /could not be read: its path is not the squares qrSvg draws/);
        assert.match(moduleCentres({ ...zoneOf(CHECKER), matrix: { n: 21, bits: '01' } }, 1000, 1000).fault, /did not arrive whole/);
        assert.match(moduleCentres({ ...zoneOf(CHECKER), side: 30 * 4.7 }, 1000, 1000).fault, /draws 30\.00 modules a side where its matrix of 21 and a quiet zone of 4 make 29/);
        assert.match(moduleCentres({ ...zoneOf(CHECKER), clip: { x0: null, y0: 0, x1: 1, y1: 1 } }, 1000, 1000).fault, /did not arrive as numbers/);
    });

    it('reads only the centres every clip and the shot leave', () => {
        const z = zoneOf(CHECKER, { x: 0, y: 0, module: 5 });
        // Rows 0..4 of the matrix start at 20px; a clip at y 45 leaves rows from 5 on (centre 47.5 → pixel 47).
        const clipped = moduleCentres({ ...z, clip: { x0: -1e9, y0: 45, x1: 1e9, y1: 1e9 } }, 1000, 1000);
        assert.equal(clipped.centres.length, 21 * 16);
        assert.ok(clipped.centres.every(({ r }) => r >= 5));
        const shot = moduleCentres(z, 1000, 70); // centres to row 9 (67.5) inside a 70px shot
        assert.equal(shot.centres.length, 21 * 10);
        assert.equal(moduleCentres(z, 1000, 10).centres.length, 0);
    });

    it('reads a clean code right, every dark centre 0 and every light one 255, whatever the offset', () => {
        for (const module of [2, 3.37, 4.7, 5.18]) {
            const z = zoneOf(CHECKER, { x: 4.4, y: 6.8, module });
            const r = readModules(shotOf(z), z);
            assert.equal(r.fault, undefined);
            assert.equal(r.bad, 0, `${module}px`);
            assert.equal(r.px, 441);
            assert.deepEqual(r.stats, { dark: { n: 221, lo: 0, hi: 0 }, light: { n: 220, lo: 255, hi: 255 } });
        }
    });

    it('fails a box laid over the modules, a fade, a white ring and a black block, by kind, and names the first', () => {
        const z = zoneOf(CHECKER);
        const box = [60, 70, 120, 130];
        const white = readModules(paintOver(shotOf(z), box, [255, 255, 255]), z);
        assert.ok(white.wrongDark > 0 && white.wrongLight === 0);
        assert.equal(white.first.dark, true);
        assert.deepEqual(white.first.rgb, [255, 255, 255]);
        assert.ok(white.span[0] >= 60 && white.span[2] < 120 && white.span[1] >= 70 && white.span[3] < 130);
        const black = readModules(paintOver(shotOf(z), box, [0, 0, 0]), z);
        assert.ok(black.wrongLight > 0 && black.wrongDark === 0);
        // A fade over a light ground: the code at 0.4 over white — every dark centre reads 153.
        const faded = readModules(paintOver(shotOf(z), [0, 0, 220, 240], [255, 255, 255], 0.6), z);
        assert.equal(faded.wrongDark, 221);
        assert.equal(faded.stats.dark.lo, 153);
        // The same over a dark ground: every light centre reads dark.
        const fadedDark = readModules(paintOver(shotOf(z), [0, 0, 220, 240], [11, 15, 26], 0.6), z);
        assert.equal(fadedDark.wrongLight, 220);
        // One level inside each cut stands; one past fails.
        const dark = shotOf(z);
        const at = moduleCentres(z, dark.width, dark.height).centres.find((m) => m.dark);
        const i = (at.y * dark.width + at.x) * 4;
        dark.data[i + 2] = MODULE_DARK_MAX;
        assert.equal(readModules(dark, z).bad, 0);
        dark.data[i + 2] = MODULE_DARK_MAX + 1;
        assert.equal(readModules(dark, z).wrongDark, 1);
        const light = moduleCentres(z, dark.width, dark.height).centres.find((m) => !m.dark);
        const j = (light.y * dark.width + light.x) * 4;
        dark.data[j] = MODULE_LIGHT_MIN - 1;
        assert.equal(readModules(dark, z).wrongLight, 1);
    });

    it('says a wrong reading with its module, its colour and where the code stood', () => {
        const z = zoneOf(CHECKER);
        const r = readModules(paintOver(shotOf(z), [60, 70, 120, 130], [255, 255, 255]), z);
        const line = moduleReadingLine({ z, r, at: { shot: [220, 240] } });
        assert.match(line, /^\d+ of 441 module centres wrong \(\d+ dark read light, 0 light read dark; the first, dark, at row \d+ column \d+, \d+,\d+ rgb\(255,255,255\), spanning [\d,]+\)/);
        assert.match(line, /the code at 10\.3,20\.6 side 136\.3 module 4\.70, clip /);
        assert.match(line, /nothing above it scrolled — \{"shot":\[220,240\]\}$/);
        assert.match(moduleReadingLine({ z, r: readModules(shotOf(z), z) }), /^0 of 441 module centres wrong — /);
    });

    it('folds every read’s extremes into one', () => {
        const into = {};
        foldStats(into, { dark: { n: 3, lo: 0, hi: 2 }, light: { n: 0, lo: 255, hi: 0 } });
        foldStats(into, { dark: { n: 1, lo: 1, hi: 9 }, light: { n: 2, lo: 250, hi: 255 } });
        assert.deepEqual(into, { dark: { n: 4, lo: 0, hi: 9 }, light: { n: 2, lo: 250, hi: 255 } });
    });
});

const ZONES = [zoneOf(CHECKER, { name: 'pay-qr' }), zoneOf(CHECKER, { name: 'share-qr' })].map(({ matrix, ...z }) => z);

describe('a-codes-modules-pair-with-their-zones-by-place-and-name', () => {
    it('gives each zone its matrix, and the page’s reason where it had none', () => {
        const out = withMatrices(ZONES, [{ name: 'pay-qr', ...CHECKER, payload: 'checked' }, { name: 'share-qr', fault: 'it has no path' }]);
        assert.deepEqual(out[0].matrix, CHECKER);
        assert.equal(out[0].payload, 'checked');
        assert.equal(out[1].matrix, undefined);
        assert.equal(out[1].matrixFault, 'it has no path');
    });
    it('fails every code closed when the matrices do not line up with the codes', () => {
        for (const matrices of [[{ name: 'pay-qr', ...CHECKER }], [{ name: 'share-qr', ...CHECKER }, { name: 'pay-qr', ...CHECKER }], undefined]) {
            const out = withMatrices(ZONES, matrices);
            assert.ok(out.every((z) => z.matrix === undefined && /did not line up with its codes/.test(z.matrixFault)));
        }
    });
});

/** A fresh pair that answers `answer`, counting how often it was asked. */
const pairOf = (answer) => {
    const asked = { n: 0 };
    return { asked, again: async () => ((asked.n += 1), answer) };
};

const Z = zoneOf(CHECKER);
const CLEAN = shotOf(Z);
const WRONG = paintOver(shotOf(Z), [60, 70, 120, 130], [255, 255, 255]);

describe('a-codes-modules-that-read-wrong-are-read-again-on-a-fresh-pair', () => {
    it('reads a clean code once and asks for no fresh pair', async () => {
        const { asked, again } = pairOf({ why: ['never'] });
        const reads = await readCodeModules({ img: CLEAN, zones: [Z] }, again);
        assert.equal(asked.n, 0);
        assert.equal(reads[0].r.bad, 0);
        assert.equal(reads[0].retry, undefined);
    });

    it('believes a fresh pair that read it right, the code standing still with the same matrix, and keeps both readings', async () => {
        const { asked, again } = pairOf({ img: CLEAN, zones: [Z], before: [Z], at: { n: 2 } });
        const reads = await readCodeModules({ img: WRONG, zones: [Z], at: { n: 1 } }, again);
        assert.equal(asked.n, 1);
        assert.equal(reads[0].r.bad, 0);
        assert.ok(reads[0].retry.first.r.bad > 0);
        assert.equal(reads[0].retry.again.r.bad, 0);
    });

    it('lets the first reading stand when the code moved, its matrix changed, or the pair read fewer centres', async () => {
        const moved = { ...Z, y: Z.y + 1 };
        const one = await readCodeModules({ img: WRONG, zones: [Z] }, pairOf({ img: CLEAN, zones: [moved], before: [moved] }).again);
        assert.ok(one[0].r.bad > 0);
        assert.match(one[0].retry.why.join(' '), /moved between the job's capture and the fresh pair \(y 20\.6 → 21\.6\)/);
        const other = { ...Z, matrix: matrixOf(21, (r, c) => (r * c) % 3 === 0) };
        const two = await readCodeModules({ img: WRONG, zones: [Z] }, pairOf({ img: CLEAN, zones: [other], before: [Z] }).again);
        assert.ok(two[0].r.bad > 0);
        assert.match(two[0].retry.why.join(' '), /its matrix changed during the fresh pair/);
        const shorter = { ...Z, clip: { x0: -1e9, y0: 60, x1: 1e9, y1: 1e9 } };
        const three = await readCodeModules({ img: WRONG, zones: [shorter] }, pairOf({ img: CLEAN, zones: [{ ...shorter, clip: { ...shorter.clip, y0: 90 } }], before: [shorter] }).again);
        assert.match(three[0].retry.why.join(' '), /the fresh pair read \d+ of the \d+ module centres the first read/);
        const none = await readCodeModules({ img: WRONG, zones: [Z] }, pairOf({ img: CLEAN, zones: [{ ...Z, clip: { x0: 0, y0: 0, x1: 1, y1: 1 } }], before: [Z] }).again);
        assert.match(none[0].retry.why.join(' '), /the fresh pair could not read it: no module centre of it is on screen/);
    });

    it('still fails a code that reads wrong on both captures', async () => {
        const reads = await readCodeModules({ img: WRONG, zones: [Z] }, pairOf({ img: WRONG, zones: [Z], before: [Z] }).again);
        assert.ok(reads[0].r.bad > 0);
        assert.ok(reads[0].retry.again.r.bad > 0);
    });

    it('shares one fresh pair with the quiet zone’s read, each deciding by its own rule', async () => {
        // The quiet zone dark and the modules wrong on the first capture, both right on the pair.
        const darkRing = paintOver(shotOf(Z), [11, 22, 20, 60], [18, 21, 26]);
        paintOver(darkRing, [60, 70, 120, 130], [255, 255, 255]);
        let made = 0;
        let pair;
        const again = () => (pair ??= (made += 1, Promise.resolve({ img: CLEAN, zones: [Z], before: [Z] })));
        const ring = await readQuietZones({ img: darkRing, zones: [Z] }, again);
        const mods = await readCodeModules({ img: darkRing, zones: [Z] }, again);
        assert.equal(made, 1);
        assert.equal(ring[0].r.bad, 0);
        assert.ok(ring[0].retry.first.r.bad > 0);
        assert.equal(mods[0].r.bad, 0);
        assert.ok(mods[0].retry.first.r.bad > 0);
    });
});

const RUN = {
    byVpClass: { 'mobile t-modern': { jobs: 2, codes: 2, modules: 5618, wrong: 3, wouldCodes: 1, unread: 0 } },
    stats: { 't-modern bare pay @mobile': { dark: { n: 2, lo: 0, hi: 0 }, light: { n: 3, lo: 255, hi: 255 } }, 't-modern flags 7 broadcast @canvas': { dark: { n: 1, lo: 0, hi: 0 } } },
    would: ['pay @mobile / theme 1: the code pay-qr at 37,815 has 3 of 2809 module centre(s) wrong'],
    readAgain: [],
    faults: [],
    read: new Map([['mobile/pay:pay-qr', 2]]),
    unread: new Map([['mobile/pay-moved:pay-qr', 'its frame is turned']]),
    payloadChecked: 0,
    leastModule: 4.4567,
};

describe('1d-says-what-it-read-and-would-fail', () => {
    it('says the tallies, the extremes, the would-be failures by code, and what it did not read', () => {
        const lines = moduleReport(RUN, { would: [], readAgain: [] }, new Set(['mobile/pay:pay-qr', 'portrait/shop-window-wall:shop-window', 'mobile/pay-moved:pay-qr']));
        assert.match(lines[0], /^1d, a code's modules \(report-only.*\), by viewport and look: mobile t-modern 2 job\(s\), 2 code read\(s\), 5618 centres, 3 wrong on 1 code read\(s\)$/);
        assert.match(lines[1], /t-modern bare dark 0–0 \(2\) light 255–255 \(3\); t-modern flags 7 dark 0–0 \(1\) light none read/);
        assert.match(lines[2], /broadcast @canvas dark 0–0 \(1\) light none read; pay @mobile dark 0–0 \(2\) light 255–255 \(3\)/);
        assert.equal(lines[3], '1d, would-be failures: 1 code read(s); by code (reads): mobile/pay:pay-qr 1');
        assert.ok(lines.includes('1d, codes a contrast job painted and could not read: mobile/pay-moved:pay-qr (its frame is turned)'));
        assert.ok(lines.includes('1d, codes a geometry pass painted and no contrast job read: 1: portrait/shop-window-wall:shop-window'));
        assert.ok(lines.includes('1d, matrices also held to the text their plate carries (data-pay-uri): 0 code read(s); the least module read: 4.46px'));
        assert.ok(lines.includes('1d, read again on a fresh pair and right there: none; on the canary\'s reads again: none'));
    });
    it('says none where nothing would fail', () => {
        const lines = moduleReport({ ...RUN, would: [] }, { would: [], readAgain: [] }, new Set());
        assert.ok(lines.includes('1d, would-be failures: none'));
    });
});
