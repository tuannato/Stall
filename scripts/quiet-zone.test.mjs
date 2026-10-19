/**
 * `a-code-keeps-its-quiet-zone-white`, its pure half: the ring the contrast
 * pass reads around every painted code (`quiet-zone.mjs`). The browser half
 * is the pass itself (`layout-check.mjs`).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QUIET_MODULES, QUIET_ZONE_FLOOR, quietReadingLine, quietZonePixels, readQuietZone, readQuietZones } from './quiet-zone.mjs';

const OPEN = { x0: -Infinity, y0: -Infinity, x1: Infinity, y1: Infinity };

/** A white shot, `w` by `h`, with `paint(x, y)` returning a colour where it is not white. */
function shot(w, h, paint = () => undefined) {
    const data = new Uint8Array(w * h * 3).fill(255);
    for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
            const c = paint(x, y);
            if (c !== undefined) data.set(c, (y * w + x) * 3);
        }
    }
    return { width: w, height: h, bpp: 3, data };
}

/** A 45-module code (37 data + 8 quiet) drawn at 5px a module, from 10,10. */
const CODE = { x: 10, y: 10, side: 225, module: 5, corner: 0, clip: OPEN };

describe('a-code-keeps-its-quiet-zone-white', () => {
    it('pins the floor and the width of the zone', () => {
        assert.equal(QUIET_ZONE_FLOOR, 245);
        assert.equal(QUIET_MODULES, 4);
    });

    it('reads from a device pixel in to a device pixel short of the matrix, and nothing past it', () => {
        const { pixels, fault } = quietZonePixels(CODE, 400, 400);
        assert.equal(fault, undefined);
        const xs = pixels.map(([x]) => x);
        const ys = pixels.map(([, y]) => y);
        assert.equal(Math.min(...xs), 11);
        assert.equal(Math.max(...xs), 233);
        assert.equal(Math.min(...ys), 11);
        // The matrix starts at 10 + 20 = 30: the band stops a pixel short.
        const onRow = pixels.filter(([, y]) => y === 120).map(([x]) => x);
        assert.deepEqual(onRow, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233]);
        assert.ok(!pixels.some(([x, y]) => x >= 30 && x < 205 && y >= 30 && y < 205), 'no pixel of the matrix');
    });

    it('passes a white ring whatever the matrix and the page paint', () => {
        const img = shot(400, 400, (x, y) => {
            if (x < 10 || y < 10 || x >= 235 || y >= 235) return [30, 60, 200];
            if (x >= 30 && x < 205 && y >= 30 && y < 205 && (x + y) % 2) return [0, 0, 0];
            return undefined;
        });
        const r = readQuietZone(img, CODE);
        assert.equal(r.bad, 0);
        assert.equal(r.px, 223 * 223 - 187 * 187);
    });

    it('fails a tint on the plate’s inner edge, and names the first pixel', () => {
        const img = shot(400, 400, (x, y) => (x >= 12 && x < 18 && y >= 40 && y < 60 ? [240, 250, 250] : undefined));
        const r = readQuietZone(img, CODE);
        assert.equal(r.bad, 6 * 20);
        assert.deepEqual(r.first, { x: 12, y: 40, rgb: [240, 250, 250] });
    });

    it('fails a clip that cuts into the code, which shows the page there', () => {
        const img = shot(400, 400, (x, y) => (x < 22 ? [20, 20, 20] : undefined));
        assert.ok(readQuietZone(img, CODE).bad > 0);
    });

    it('steps past the code’s own rounded corner up to one module, and refuses a deeper one', () => {
        const img = shot(400, 400, (x, y) => (x < 14 && y < 14 ? [0, 0, 255] : undefined));
        assert.ok(readQuietZone(img, CODE).bad > 0, 'square corner: the blue is read');
        assert.equal(readQuietZone(img, { ...CODE, corner: 4 }).bad, 0, 'a 4px corner under a 5px module is stepped past');
        const deep = readQuietZone(img, { ...CODE, corner: 6 });
        assert.match(deep.fault, /past one module/);
    });

    it('reads only what the clip and the shot leave, and says when nothing is left', () => {
        const half = quietZonePixels({ ...CODE, clip: { x0: -Infinity, y0: -Infinity, x1: Infinity, y1: 100 } }, 400, 400);
        assert.ok(half.pixels.every(([, y]) => y < 100));
        assert.ok(half.pixels.length > 0);
        const gone = quietZonePixels({ ...CODE, clip: { x0: 500, y0: -Infinity, x1: Infinity, y1: Infinity } }, 400, 400);
        assert.equal(gone.pixels.length, 0);
        const off = quietZonePixels(CODE, 100, 100);
        assert.ok(off.pixels.every(([x, y]) => x < 100 && y < 100));
    });

    it('refuses a clip that did not arrive as numbers, rather than reading nothing', () => {
        const nulls = { x0: null, y0: null, x1: null, y1: null };
        assert.match(quietZonePixels({ ...CODE, clip: nulls }, 400, 400).fault, /did not arrive as numbers/);
    });

    it('refuses a module too small to leave a zone', () => {
        assert.match(quietZonePixels({ ...CODE, module: 0.4 }, 400, 400).fault, /no quiet zone/);
    });
});

/** A zone as `__quietZones` reports it. */
const named = (z, name = 'pay-qr') => ({ ...z, name, turned: false });
const white = shot(400, 400);
/** A band of the page over the top of the ring: the flake's shape. */
const banded = shot(400, 400, (x, y) => (y >= 10 && y < 26 ? [18, 21, 26] : undefined));
/** A fresh pair that answers `answer`, counting how often it was asked. */
const counted = (answer) => {
    const calls = { n: 0 };
    return { calls, again: async () => ((calls.n += 1), answer) };
};

describe('a-quiet-zone-that-reads-dark-is-read-again-on-a-fresh-pair', () => {
    /**
     * The money-guards round-7 critic's P2-3: a pay screen's code read part
     * of its quiet zone non-white and white on a rerun, four times, once on
     * main. A code that reads dark is read again on a fresh pair — a new
     * capture and the zones read beside it — and the fresh pair's reading
     * is the verdict; a real defect is steady state and reads dark there
     * too. Never a weaker read: a fresh pair that cannot read the code
     * leaves the first reading standing.
     */
    it('reads a clean code once and asks for no fresh pair', async () => {
        const { calls, again } = counted({ why: ['never asked'] });
        const reads = await readQuietZones({ img: white, zones: [named(CODE)], at: { shot: [400, 400] } }, again);
        assert.equal(calls.n, 0);
        assert.equal(reads[0].r.bad, 0);
        assert.equal(reads[0].retry, undefined);
    });

    it('believes the fresh pair when the first capture read dark and the second white, and keeps both readings', async () => {
        const { calls, again } = counted({ img: white, zones: [named(CODE)], at: { pair: 'fresh' }, before: [named({ ...CODE, y: 12 })] });
        const reads = await readQuietZones({ img: banded, zones: [named(CODE)], at: { pair: 'first' } }, again);
        assert.equal(calls.n, 1);
        assert.equal(reads[0].r.bad, 0);
        assert.ok(reads[0].retry.first.r.bad > 0);
        assert.deepEqual(reads[0].retry.first.r.dark, [11, 11, 233, 25]);
        assert.deepEqual(reads[0].retry.first.at, { pair: 'first' });
        assert.deepEqual(reads[0].retry.again.at, { pair: 'fresh' });
        assert.equal(reads[0].retry.again.before.y, 12);
        assert.equal(reads[0].retry.why, undefined);
    });

    it('still fails a quiet zone that is dark on both captures', async () => {
        const { calls, again } = counted({ img: banded, zones: [named(CODE)], at: {} });
        const reads = await readQuietZones({ img: banded, zones: [named(CODE)], at: {} }, again);
        assert.equal(calls.n, 1);
        assert.ok(reads[0].r.bad > 0);
        assert.ok(reads[0].retry.again.r.bad > 0);
    });

    it('asks once for every dark code, and reads again only the codes that read dark', async () => {
        const other = named({ ...CODE, x: 250, y: 250, side: 140, module: 4 }, 'share-qr');
        const { calls, again } = counted({ img: white, zones: [named(CODE), other], at: {} });
        const reads = await readQuietZones({ img: banded, zones: [named(CODE), other], at: {} }, again);
        assert.equal(calls.n, 1);
        assert.equal(reads[1].retry, undefined);
        assert.equal(reads[1].r.bad, 0);
        assert.equal(reads[0].r.bad, 0);
    });

    it('lets the first reading stand when the fresh pair cannot be had, paints other codes, or cannot read the code', async () => {
        const cases = [
            [{ why: ['the shot is 400x300 where the job is 400x400'] }, /the shot is 400x300/],
            [{ img: white, zones: [named(CODE, 'share-qr')], at: {} }, /painted the codes share-qr where the first had pay-qr/],
            [{ img: white, zones: [], at: {} }, /painted the codes none where the first had pay-qr/],
            [{ img: white, zones: [named({ ...CODE, clip: { x0: 500, y0: -Infinity, x1: Infinity, y1: Infinity } })], at: {} }, /no pixel of its quiet zone is on screen/],
            [{ img: white, zones: [{ ...named(CODE), turned: true }], at: {} }, /its frame is turned/],
            [{ img: white, zones: [named({ ...CODE, corner: 6 })], at: {} }, /past one module/],
        ];
        for (const [answer, why] of cases) {
            const reads = await readQuietZones({ img: banded, zones: [named(CODE)], at: {} }, async () => answer);
            assert.ok(reads[0].r.bad > 0, String(why));
            assert.match(reads[0].retry.why.join(' '), why);
            assert.equal(reads[0].retry.again, undefined);
        }
    });

    it('asks for no fresh pair over a fault, a turned code or a code with nothing on screen', async () => {
        const { calls, again } = counted({ why: ['never asked'] });
        const reads = await readQuietZones(
            {
                img: banded,
                zones: [
                    named({ ...CODE, corner: 6 }),
                    { ...named(CODE), turned: true },
                    named({ ...CODE, clip: { x0: 500, y0: -Infinity, x1: Infinity, y1: Infinity } }),
                ],
                at: {},
            },
            again,
        );
        assert.equal(calls.n, 0);
        assert.match(reads[0].r.fault, /past one module/);
        assert.equal(reads[1].turned, true);
        assert.equal(reads[2].r.px, 0);
    });

    it('says a reading with what a person needs to find the cause', () => {
        const z = { ...named(CODE), scrolled: [{ at: 'div.sheet', top: 120, left: 0 }] };
        const line = quietReadingLine({ z, r: readQuietZone(banded, z), at: { shot: [400, 400], page: { dpr: 1 } } }, { ...z, y: 14 });
        assert.match(line, /^\d+ of \d+ dark \(the first at 11,11 rgb\(18,21,26\), spanning 11,11,233,25\)/);
        assert.match(line, /the code at 10\.0,10\.0 side 225\.0 module 5\.00, clip/);
        assert.match(line, /at 10\.0,14\.0 side 225\.0 module 5\.00 just before its capture/);
        assert.match(line, /scrolled div\.sheet 120,0/);
        assert.match(line, /\{"shot":\[400,400\],"page":\{"dpr":1\}\}$/);
        assert.match(quietReadingLine({ z: named(CODE), r: readQuietZone(white, CODE), at: undefined }), /^0 of \d+ dark — .* — nothing above it scrolled$/);
    });
});

