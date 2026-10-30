/**
 * 1d: a code's modules read in pixels (before 8g2; bound since step 7c;
 * `code-modules.mjs`, `PROBE-RULES.md`, "Before 8g2, 1d: the code's
 * modules"). The pure half: where each module's centre pixel is, what reads
 * wrong, and the read-again it shares with the quiet zone.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    MODULE_CHECK,
    MODULE_DARK_MAX,
    MODULE_LIGHT_MIN,
    MODULE_MIN_PX,
    foldStats,
    moduleCentres,
    moduleReadingLine,
    moduleReport,
    moduleSnapLines,
    moduleSnapVerdict,
    readCodeModules,
    readModules,
    readTurnedUpright,
    readWholeModules,
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
        assert.equal(MODULE_MIN_PX, 3);
    });

    it('reads one centre pixel a module, at least half a pixel inside its module on every side, at any offset from three pixels a module up', () => {
        // Chrome snaps the svg by up to half a pixel, so the centre pixel needs half a pixel of its module on each side: m/2 − 1 ≥ 0.5.
        for (const module of [3, 3.01, 3.37, 3.62, 4.46, 4.94, 5.18, 7.9]) {
            for (const off of [0, 0.01, 0.25, 0.5, 0.75, 0.99]) {
                const z = zoneOf(CHECKER, { x: 3 + off, y: 7 + off / 2, module });
                const { centres, fault } = moduleCentres(z, 1000, 1000);
                assert.equal(fault, undefined);
                assert.equal(centres.length, 21 * 21);
                for (const { r, c, x, y } of centres) {
                    const left = z.x + (c + QUIET_MODULES) * module;
                    const top = z.y + (r + QUIET_MODULES) * module;
                    const eps = 1e-9;
                    assert.ok(x - left >= 0.5 - eps && left + module - (x + 1) >= 0.5 - eps, `column ${c} at ${module}px, offset ${off}: pixel ${x} within half a pixel of ${left}–${left + module}`);
                    assert.ok(y - top >= 0.5 - eps && top + module - (y + 1) >= 0.5 - eps, `row ${r} at ${module}px, offset ${off}: pixel ${y} within half a pixel of ${top}–${top + module}`);
                }
            }
        }
    });

    it('reads a code painted as Chrome snaps it right from three pixels a module, where two pixels would read it wrong', () => {
        // The snapped box: its edges rounded to whole pixels, every module between them moved by at most half a pixel (the tenth critic's snap read).
        const snapped = (z) => {
            const span = z.matrix.n + 2 * QUIET_MODULES;
            const x = Math.round(z.x);
            const y = Math.round(z.y);
            return { ...z, x, y, module: (Math.round(z.x + z.side) - x) / span, side: Math.round(z.x + z.side) - x };
        };
        let wrongUnder = 0;
        for (const module of [2.1, 2.25, 2.4, 2.55, 2.7, 2.85, 3, 3.05, 3.37, 3.62, 4.46, 5.21]) {
            for (const off of [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95]) {
                const z = zoneOf(CHECKER, { x: 3 + off, y: 7 + off, module });
                const shot = shotOf(snapped(z), 260, 260);
                if (module >= MODULE_MIN_PX) {
                    const r = readModules(shot, z);
                    assert.equal(r.fault, undefined);
                    assert.equal(r.bad, 0, `${module}px at offset ${off}`);
                } else {
                    assert.match(readModules(shot, z).fault, /under the 3 device pixels/);
                    wrongUnder += readModules(shot, z, 2).bad;
                }
            }
        }
        assert.ok(wrongUnder > 0, 'a cut of two pixels reads a snapped code wrong somewhere under three');
    });

    it('refuses a module under three pixels and a matrix that did not arrive', () => {
        assert.match(moduleCentres(zoneOf(CHECKER, { module: 2.99 }), 1000, 1000).fault, /a module is 2\.99px, under the 3 device pixels/);
        const missing = { ...zoneOf(CHECKER), matrix: undefined, matrixFault: 'its path is not the squares qrSvg draws' };
        assert.match(moduleCentres(missing, 1000, 1000).fault, /could not be read: its path is not the squares qrSvg draws/);
        assert.match(moduleCentres({ ...zoneOf(CHECKER), matrix: { n: 21, bits: '01' } }, 1000, 1000).fault, /did not arrive whole/);
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
        for (const module of [3, 3.37, 4.7, 5.18]) {
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
    it('fails a code closed when its zone and its matrix are not of one code, and every code when the page threw', () => {
        // A zone read off a code 30 modules a side, a matrix of 21 (29 with its quiet zones): two answers, two codes.
        const out = withMatrices([{ ...ZONES[0], side: 30 * 4.7 }, ZONES[1]], [{ name: 'pay-qr', ...CHECKER }, { name: 'share-qr', ...CHECKER }]);
        assert.equal(out[0].matrix, undefined);
        assert.match(out[0].matrixFault, /^its zone was read off a code 30\.00 modules a side and its matrix off one of 29 \(21 and a quiet zone of 4 each side\): the page's two answers are not of one code$/);
        assert.deepEqual(out[1].matrix, CHECKER);
        assert.match(moduleCentres(out[0], 1000, 1000).fault, /could not be read: its zone was read off a code 30\.00 modules/);
        const thrown = withMatrices(ZONES, { thrown: 'planted' });
        assert.ok(thrown.every((z) => z.matrix === undefined && z.matrixFault === 'the page threw answering for its matrix (planted)'));
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
        // A code read whole on the first capture and clipped on the pair: the pair cannot read it whole, so the first stands.
        const shorter = { ...Z, clip: { x0: -1e9, y0: 60, x1: 1e9, y1: 1e9 } };
        const three = await readCodeModules({ img: WRONG, zones: [Z] }, pairOf({ img: CLEAN, zones: [shorter], before: [Z] }).again);
        assert.ok(three[0].r.bad > 0);
        assert.match(three[0].retry.why.join(' '), /the fresh pair could not read it: only \d+ of its 441 module centres are on screen inside its clips: a code is read whole or not at all/);
        const none = await readCodeModules({ img: WRONG, zones: [Z] }, pairOf({ img: CLEAN, zones: [{ ...Z, clip: { x0: 0, y0: 0, x1: 1, y1: 1 } }], before: [Z] }).again);
        assert.match(none[0].retry.why.join(' '), /the fresh pair could not read it: none of its 441 module centres are on screen inside its clips/);
    });

    it('fails closed a code not read whole, a slot that shows part of it or none (the thirteenth review’s item 8)', async () => {
        // PQS's shape: a slot that shows the top rows; and one that shows the quiet zone alone.
        const slot = { ...Z, clip: { x0: -1e9, y0: -1e9, x1: 1e9, y1: 60 } };
        const part = await readCodeModules({ img: CLEAN, zones: [slot] }, pairOf({ img: CLEAN, zones: [slot], before: [slot] }).again);
        assert.equal(part[0].retry, undefined);
        assert.match(part[0].r.fault, /^only \d+ of its 441 module centres are on screen inside its clips: a code is read whole or not at all$/);
        assert.ok(part[0].r.px > 0 && part[0].r.px < 441);
        const quiet = { ...Z, clip: { x0: -1e9, y0: -1e9, x1: 1e9, y1: Z.y + 3 * Z.module } };
        const zero = readWholeModules(CLEAN, quiet);
        assert.equal(zero.px, 0);
        assert.match(zero.fault, /^none of its 441 module centres are on screen inside its clips/);
        // Every centre on screen reads as it did, and the fault of a module too small or a matrix unread stands.
        assert.equal(readWholeModules(CLEAN, Z).fault, undefined);
        assert.equal(readWholeModules(CLEAN, Z).px, 441);
        assert.match(readWholeModules(CLEAN, { ...Z, module: 2.5 }).fault, /under the 3 device pixels/);
        // One centre off is enough.
        const shot = { ...CLEAN, height: Math.floor(Z.y + (20 + QUIET_MODULES + 0.5) * Z.module) };
        const short = readWholeModules({ ...shot, data: CLEAN.data.slice(0, shot.width * shot.height * 4) }, Z);
        assert.match(short.fault, /^only 420 of its 441 module centres are on screen/);
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

/**
 * `a-turned-code-is-read-upright-or-fails-closed` (the thirteenth review's B1,
 * the owner's D-2026-10-29-01): a code in a turned frame is read by the quiet
 * zone and by 1d on a frame with every transform above it held off, with a
 * fresh pair held the same way, or fails closed — never passed over.
 */
const TURNED = { ...Z, turned: true, turnOnly: true, name: 'shop-window' };
const UNTURNED = zoneOf(CHECKER, { x: 10.3, y: 20.6, name: 'pay-qr' });
describe('a-turned-code-is-read-upright-or-fails-closed', () => {
    const calls = () => {
        const n = { upright: 0, again: 0 };
        return {
            n,
            upright: (frame) => async () => {
                n.upright += 1;
                return frame;
            },
            again: (pair) => async () => {
                n.again += 1;
                return pair;
            },
        };
    };

    it('reads nothing and makes no frame where no code is turned', async () => {
        const c = calls();
        const out = await readTurnedUpright([Z], c.upright({ why: ['never'] }), c.again({ why: ['never'] }));
        assert.equal(out.size, 0);
        assert.deepEqual(c.n, { upright: 0, again: 0 });
    });

    it('reads a turned code by both reads on the frame held upright, and leaves the others to the job', async () => {
        const c = calls();
        const out = await readTurnedUpright([UNTURNED, TURNED], c.upright({ img: CLEAN, zones: [UNTURNED, { ...TURNED, turned: false }], at: { heldOff: { codes: 1, boxes: 3 } } }), c.again({ why: ['never'] }));
        assert.deepEqual([...out.keys()], [1]);
        assert.equal(out.get(1).quiet.r.fault, undefined);
        assert.equal(out.get(1).quiet.r.bad, 0);
        assert.ok(out.get(1).quiet.r.px > 0);
        assert.equal(out.get(1).modules.r.bad, 0);
        assert.equal(out.get(1).modules.r.px, 441);
        assert.deepEqual(c.n, { upright: 1, again: 0 });
    });

    it('fails a turned code read wrong upright, read again on one fresh pair held upright for both reads', async () => {
        const c = calls();
        const faded = paintOver(shotOf(Z), [0, 0, 220, 240], [255, 255, 255], 0.6);
        const upright = { ...TURNED, turned: false };
        const out = await readTurnedUpright([TURNED], c.upright({ img: faded, zones: [upright], at: {} }), c.again({ img: faded, zones: [upright], before: [upright], at: {} }));
        assert.equal(out.get(0).modules.r.wrongDark, 221);
        assert.ok(out.get(0).modules.retry.again.r.bad > 0);
        assert.deepEqual(c.n, { upright: 1, again: 1 });
        // White on the fresh pair held upright: the pair decides, as on any job.
        const d = calls();
        const back = await readTurnedUpright([TURNED], d.upright({ img: faded, zones: [upright], at: {} }), d.again({ img: CLEAN, zones: [upright], before: [upright], at: {} }));
        assert.equal(back.get(0).modules.r.bad, 0);
        assert.ok(back.get(0).modules.retry.first.r.bad > 0);
        // A fresh pair that painted other codes is not believed: the first reading stands.
        const e = calls();
        const lost = await readTurnedUpright([TURNED], e.upright({ img: faded, zones: [upright], at: {} }), e.again({ img: CLEAN, zones: [], before: [], at: {} }));
        assert.ok(lost.get(0).modules.r.bad > 0);
        assert.match(lost.get(0).modules.retry.why.join(' '), /the fresh pair held upright painted the codes none where the first had shop-window/);
    });

    it('fails closed, for both reads, where the frame held upright cannot be had, painted other codes, or is still turned', async () => {
        for (const [frame, said] of [
            [{ why: ['the page threw holding the turns off: planted'] }, /^its frame is turned, and no frame with every transform above it held off could be had \(the page threw holding the turns off: planted\)$/],
            [{ img: CLEAN, zones: [UNTURNED], at: {} }, /^its frame is turned, and the frame with every transform above it held off painted the codes pay-qr where the job had shop-window$/],
            [{ img: CLEAN, zones: [TURNED], at: {} }, /^its frame is turned, and it is still turned with every transform above it held off$/],
        ]) {
            const c = calls();
            const out = await readTurnedUpright([TURNED], c.upright(frame), c.again({ why: ['never'] }));
            assert.match(out.get(0).quiet.r.fault, said);
            assert.match(out.get(0).modules.r.fault, said);
            assert.equal(out.get(0).upright, false);
            assert.equal(c.n.again, 0);
        }
    });

    it('says which answers were read off the upright frame', async () => {
        const c = calls();
        const out = await readTurnedUpright([TURNED], c.upright({ img: CLEAN, zones: [{ ...TURNED, turned: false }], at: {} }), c.again({ why: ['never'] }));
        assert.equal(out.get(0).upright, true);
    });

    /*
     * The fourteenth review's M2 (the owner's D-2026-10-30-01): a frame that
     * scales, mirrors or squashes the code besides turning it is not held
     * upright, since holding that off makes a code the page does not paint
     * (the critic's PSCT and PMIR passed the whole runner).
     */
    it('fails closed, unread and with what its frame does, a turned code whose frame does more than turn it, and reads the others', async () => {
        const scaled = { ...TURNED, turnOnly: 'div.sw-qr has scale: 0.2', name: 'sw-qr' };
        const c = calls();
        const out = await readTurnedUpright([scaled, TURNED], c.upright({ img: CLEAN, zones: [scaled, { ...TURNED, turned: false }], at: {} }), c.again({ why: ['never'] }));
        const said = /^its frame is turned, and what turns it does more than turn it \(div\.sw-qr has scale: 0\.2\): held upright it would not be the code the page paints, so it is not read$/;
        assert.match(out.get(0).quiet.r.fault, said);
        assert.match(out.get(0).modules.r.fault, said);
        assert.equal(out.get(0).upright, false);
        assert.equal(out.get(1).upright, true);
        assert.equal(out.get(1).modules.r.bad, 0);
        assert.equal(c.n.upright, 1);
    });

    it('makes no frame where every turned code does more than turn, and fails a zone that does not say', async () => {
        const c = calls();
        const mirrored = { ...TURNED, turnOnly: "div.pay-qr has transform: matrix(-1, 0, 0, 1, 0, 0), which mirrors it" };
        const silent = { ...TURNED, name: 'pay-qr' };
        delete silent.turnOnly;
        const out = await readTurnedUpright([mirrored, silent], c.upright({ img: CLEAN, zones: [], at: {} }), c.again({ why: ['never'] }));
        assert.match(out.get(0).modules.r.fault, /which mirrors it\): held upright/);
        assert.match(out.get(1).modules.r.fault, /\(the page did not say that it only turns it\)/);
        assert.deepEqual(c.n, { upright: 0, again: 0 });
    });
});

const RUN = {
    byVpClass: { 'mobile t-modern': { jobs: 2, codes: 2, modules: 5618, wrong: 3, wouldCodes: 1, unread: 0 } },
    stats: { 't-modern bare pay @mobile': { dark: { n: 2, lo: 0, hi: 0 }, light: { n: 3, lo: 255, hi: 255 } }, 't-modern flags 7 broadcast @canvas': { dark: { n: 1, lo: 0, hi: 0 } } },
    would: ['pay @mobile / theme 1: the code pay-qr at 37,815 has 3 of 2809 module centre(s) wrong'],
    readAgain: [],
    faults: [],
    read: new Map([['mobile/pay:pay-qr', 2]]),
    unread: new Map([['mobile/pay-moved:pay-qr', 'only 210 of its 441 module centres are on screen inside its clips: a code is read whole or not at all']]),
    uprightByClass: { 't-rural': new Set(['desktop/shop-window-cycle:shop-window']) },
    payloadChecked: 0,
    leastModule: 4.4567,
};

describe('1d-says-what-it-read-and-would-fail', () => {
    it('says the tallies, the extremes, the failures by code, and what it did not read', () => {
        const lines = moduleReport(RUN, { would: [], readAgain: [] }, new Set(['mobile/pay:pay-qr', 'portrait/shop-window-wall:shop-window', 'mobile/pay-moved:pay-qr']));
        assert.match(lines[0], /^1d, a code's modules \(a-codes-modules-read-as-its-matrix, bound.*\), by viewport and look: mobile t-modern 2 job\(s\), 2 code read\(s\), 5618 centres, 3 wrong on 1 code read\(s\)$/);
        assert.match(lines[1], /t-modern bare dark 0–0 \(2\) light 255–255 \(3\); t-modern flags 7 dark 0–0 \(1\) light none read/);
        assert.match(lines[2], /broadcast @canvas dark 0–0 \(1\) light none read; pay @mobile dark 0–0 \(2\) light 255–255 \(3\)/);
        assert.equal(lines[3], '1d, codes read wrong (failures): 1 code read(s); by code (reads): mobile/pay:pay-qr 1');
        assert.ok(lines.includes('1d, codes a contrast job painted and could not read: mobile/pay-moved:pay-qr (only 210 of its 441 module centres are on screen inside its clips: a code is read whole or not at all)'));
        assert.ok(lines.includes('1d, codes a geometry pass painted and no contrast job read: 1: portrait/shop-window-wall:shop-window'));
        assert.ok(lines.includes('1d, matrices also held to the text their plate carries (data-pay-uri): 0 code read(s); the least module read: 4.46px'));
        assert.ok(lines.includes('1d, read again on a fresh pair and right there: none; on the canary\'s reads again: none'));
        assert.ok(lines.includes('1d, threw (in its own read, a failure of the job; answering for the matrices, each code read off that answer fails closed, and on a fresh pair the first reading stands; on the canary\'s reads, said): none'));
        assert.ok(lines.includes('1d, failed closed (failures: a module under 3px, a matrix it cannot read or pair, a code not read whole, a turned code not read upright): none'));
        // A turned frame's code, read upright (the thirteenth review's B1), is said by look and name.
        assert.ok(lines.includes('1d and the quiet zone, codes in a turned frame read upright (every transform above them held off): t-rural desktop/shop-window-cycle:shop-window'));
        // Sightings at the run's tab count and by the tab that read each (the tenth critic's item 4).
        const sighted = moduleReport(
            { ...RUN, tabs: 3, readAgain: ['pay @mobile / theme 3: the code pay-qr at 41,819: wrong on the first capture, right on a fresh pair (on tab 1 of 3)'], readAgainByTab: { 1: 1 } },
            { would: [], readAgain: [], readAgainByTab: {} },
            new Set(),
        );
        assert.ok(sighted.includes('1d, read again on a fresh pair and right there, at 3 tab(s): 1 (by tab: tab 1 1)\n    pay @mobile / theme 3: the code pay-qr at 41,819: wrong on the first capture, right on a fresh pair (on tab 1 of 3); on the canary\'s reads again: none'));
        const thrown = moduleReport({ ...RUN, thrown: ['pay @mobile / theme 1: the page threw answering for the codes\' matrices: planted'] }, { would: [], readAgain: [], thrown: ['(the canary) x'] }, new Set());
        assert.ok(thrown.includes("1d, threw (in its own read, a failure of the job; answering for the matrices, each code read off that answer fails closed, and on a fresh pair the first reading stands; on the canary's reads, said): 2\n    pay @mobile / theme 1: the page threw answering for the codes' matrices: planted\n    (the canary) x"));
        const closed = moduleReport({ ...RUN, faults: ['pay @mobile / theme 1: the code pay-qr at 37,815 — a module is 2.10px, under the 3 device pixels a centre read needs'] }, { would: [], readAgain: [] }, new Set());
        assert.ok(closed.includes('1d, failed closed (failures: a module under 3px, a matrix it cannot read or pair, a code not read whole, a turned code not read upright): 1\n    pay @mobile / theme 1: the code pay-qr at 37,815 — a module is 2.10px, under the 3 device pixels a centre read needs'));
    });
    it('says none where nothing fails', () => {
        const lines = moduleReport({ ...RUN, would: [], uprightByClass: {} }, { would: [], readAgain: [] }, new Set());
        assert.ok(lines.includes('1d, codes read wrong: none'));
        assert.ok(lines.includes('1d and the quiet zone, codes in a turned frame read upright (every transform above them held off): none'));
    });
    it('pins the rule’s name', () => {
        assert.equal(MODULE_CHECK, 'a-codes-modules-read-as-its-matrix');
    });
});

describe('the-module-read-agrees-with-this-chrome', () => {
    // The sheet the probe page draws (`__moduleSnap`), in small: codes under the cut and over it, painted where their zones say.
    const sheet = () => {
        const zones = [zoneOf(CHECKER, { x: 2.3, y: 2.6, module: 2.4 }), zoneOf(CHECKER, { x: 80.6, y: 3.1, module: 3.05 }), zoneOf(CHECKER, { x: 2.8, y: 110.4, module: 4.46 })];
        const img = { width: 240, height: 260, bpp: 4, data: new Uint8Array(240 * 260 * 4).fill(255) };
        for (const z of zones) {
            const one = shotOf(z, 240, 260);
            for (let i = 0; i < img.data.length; i += 1) img.data[i] = Math.min(img.data[i], one.data[i]);
        }
        return { zones, img };
    };

    it('agrees where every code under the cut is refused and every code from it reads every centre right, and measures what the refused ones would read', () => {
        const { zones, img } = sheet();
        const v = moduleSnapVerdict(img, zones);
        assert.deepEqual(v.faults, []);
        assert.equal(v.codes, 3);
        assert.equal(v.under, 1);
        assert.equal(v.over, 2);
        assert.equal(v.centres, 2 * 441);
        assert.equal(v.below.codes, 1);
        assert.equal(v.below.centres, 441);
        assert.match(moduleSnapLines({ first: v }).join('\n'), /^1d's cut held to this Chrome \(the-module-read-agrees-with-this-chrome; MODULE_MIN_PX 3, DPR 1\): 3 code\(s\) drawn by qrSvg; the 1 under the 3px cut refused \(read anyway, at no floor: \d+ of 441 centres wrong on 1 code\(s\)\), the 2 from it read on 882 centres: agreed$/);
    });

    it('disagrees with a code from the cut that reads a centre wrong, one not wholly on screen, one it cannot read, and one under the cut it cannot refuse', () => {
        const { zones, img } = sheet();
        // A snapped neighbour's paint on one centre of the 3.05px code.
        const at = moduleCentres(zones[1], img.width, img.height).centres.find((m) => m.dark);
        const i = (at.y * img.width + at.x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 128;
        const offShot = { ...zones[2], y: 200 };
        const unreadable = { ...zones[2], matrix: undefined, matrixFault: 'its path is not the squares qrSvg draws' };
        const underUnreadable = { ...zones[0], matrix: undefined, matrixFault: 'it has no path' };
        const v = moduleSnapVerdict(img, [zones[0], zones[1], offShot, unreadable, underUnreadable]);
        assert.equal(v.faults.length, 4);
        assert.match(v.faults[0], /^the 3\.050px code at 80\.60,3\.10 read 1 of 441 centres wrong \(1 dark read light, 0 light read dark; the first, dark, at row \d+ column \d+, \d+,\d+ rgb\(128,128,128\)\)$/);
        assert.match(v.faults[1], /^the 4\.460px code at 2\.80,200\.00 had \d+ of its 441 centres on screen$/);
        assert.match(v.faults[2], /could not be read: the matrix it was drawn from could not be read: its path is not the squares qrSvg draws$/);
        assert.match(v.faults[3], /^the 2\.400px code at 2\.30,2\.60 is under the 3px cut and was not refused \(the matrix it was drawn from could not be read: it has no path\)$/);
        const lines = moduleSnapLines({ first: v, again: v }).join('\n');
        assert.match(lines, /: 4 disagreement\(s\)\n {2}the 3\.050px code/);
        assert.match(lines, /read again on a fresh capture after the first disagreed \(4\)/);
    });

    it('disagrees with a sheet that drew no code under the cut, or none from it', () => {
        const { zones, img } = sheet();
        assert.deepEqual(moduleSnapVerdict(img, zones.slice(1)).faults, ['the sheet drew no code under the 3px cut, so nothing showed the read refuses one']);
        assert.deepEqual(moduleSnapVerdict(img, zones.slice(0, 1)).faults, ['the sheet drew no code from the 3px cut up, so nothing was read']);
    });
});
