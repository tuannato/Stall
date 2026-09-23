/**
 * The PNG reader every screenshot in this repository goes through, held to
 * an encoder written here from the PNG specification: every filter type, on
 * the first row and after it, at three and four bytes a pixel. A wrong
 * reconstruction does not throw — it hands the contrast pass a different
 * ground and it measures that — so it is pinned byte for byte.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { crc32, deflateSync } from 'node:zlib';
import { decodePng } from './browser.mjs';

function chunk(type, data) {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
    return Buffer.concat([head, data, crc]);
}

/** The predictor the specification names for `filter`, from the left, above and upper-left bytes. */
function predict(filter, a, b, c) {
    switch (filter) {
        case 0:
            return 0;
        case 1:
            return a;
        case 2:
            return b;
        case 3:
            return (a + b) >> 1;
        case 4: {
            const p = a + b - c;
            const pa = Math.abs(p - a);
            const pb = Math.abs(p - b);
            const pc = Math.abs(p - c);
            return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        default:
            throw new Error(`filter ${filter}`);
    }
}

/** `pixels` as a PNG whose row `y` is filtered with `filters[y % filters.length]`. */
function encode(width, height, bpp, pixels, filters) {
    const stride = width * bpp;
    const raw = Buffer.alloc(height * (stride + 1));
    for (let y = 0; y < height; y += 1) {
        const filter = filters[y % filters.length];
        raw[y * (stride + 1)] = filter;
        for (let x = 0; x < stride; x += 1) {
            const a = x >= bpp ? pixels[y * stride + x - bpp] : 0;
            const b = y > 0 ? pixels[(y - 1) * stride + x] : 0;
            const c = x >= bpp && y > 0 ? pixels[(y - 1) * stride + x - bpp] : 0;
            raw[y * (stride + 1) + 1 + x] = (pixels[y * stride + x] - predict(filter, a, b, c)) & 0xff;
        }
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = bpp === 4 ? 6 : 2;
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

/** Deterministic noise with long flat runs, so every predictor meets carries and ties. */
function pixelsFor(width, height, bpp, seed) {
    const out = Buffer.alloc(width * height * bpp);
    let s = seed;
    for (let i = 0; i < out.length; i += 1) {
        s = (s * 1103515245 + 12345) >>> 0;
        out[i] = (s >>> 16) % 7 === 0 ? 255 : (s >>> 8) & 0xff;
    }
    return out;
}

describe('decode-png-undoes-every-filter', () => {
    for (const bpp of [3, 4]) {
        for (const filters of [[0], [1], [2], [3], [4], [4, 3, 2, 1, 0], [2, 4, 0, 3, 1]]) {
            it(`reads ${bpp} bytes a pixel under filter${filters.length > 1 ? 's' : ''} ${filters.join(',')}`, () => {
                const width = 13;
                const height = 9;
                const pixels = pixelsFor(width, height, bpp, bpp * 31 + filters.join('').length);
                const img = decodePng(encode(width, height, bpp, pixels, filters));
                assert.deepEqual([img.width, img.height, img.bpp], [width, height, bpp]);
                assert.ok(img.data.equals(pixels));
            });
        }
    }

    it('refuses a filter the specification does not have, and data shorter than the header', () => {
        const png = encode(4, 2, 3, pixelsFor(4, 2, 3, 1), [0]);
        const bad = Buffer.from(png);
        // Rebuild with filter byte 5 on the first row.
        const pixels = pixelsFor(4, 2, 3, 1);
        const raw = Buffer.alloc(2 * 13);
        raw[0] = 5;
        pixels.copy(raw, 1, 0, 12);
        pixels.copy(raw, 14, 12, 24);
        const ihdr = Buffer.alloc(13);
        ihdr.writeUInt32BE(4, 0);
        ihdr.writeUInt32BE(2, 4);
        ihdr[8] = 8;
        ihdr[9] = 2;
        const make = (data) =>
            Buffer.concat([bad.subarray(0, 8), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(data)), chunk('IEND', Buffer.alloc(0))]);
        assert.throws(() => decodePng(make(raw)), /PNG filter 5/);
        assert.throws(() => decodePng(make(raw.subarray(0, 20))), /shorter than its IHDR/);
    });
});
