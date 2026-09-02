// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    QR_QUIET_ZONE,
    paintQr,
    qrModuleRects,
    savePng,
    urlLinesOrNone,
    wrapLines,
} from './posterImage';

const UI_DIR = dirname(fileURLToPath(import.meta.url));

/** Same transform as `stripForTest` in walls.test.ts — importing that file re-registers its tests. */
function stripForTest(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

const MODULE = stripForTest(readFileSync(join(UI_DIR, 'posterImage.ts'), 'utf8'));

describe('an-exported-poster-carries-no-price', () => {
    it('never mentions askedSats, formatXec, price, or PRICE_FROM', () => {
        expect(MODULE).not.toMatch(/\baskedSats\b/);
        expect(MODULE).not.toMatch(/\bformatXec\b/);
        expect(MODULE).not.toMatch(/\bprice\b/i);
        expect(MODULE).not.toMatch(/\bPRICE_FROM\b/);
    });
});

describe('the-export-draws-the-qr-from-the-matrix-not-an-image', () => {
    it('never constructs an Image, an img, drawImage, or toDataURL', () => {
        expect(MODULE).not.toMatch(/\bImage\b/);
        expect(MODULE).not.toMatch(/\bimg\b/);
        expect(MODULE).not.toMatch(/\bdrawImage\b/);
        expect(MODULE).not.toMatch(/\btoDataURL\b/);
    });
});

describe('the-exported-qr-keeps-its-quiet-zone', () => {
    it('offsets every module by a 4-module white quiet zone', () => {
        expect(QR_QUIET_ZONE).toBe(4);
        const modulePx = 10;
        const rects = qrModuleRects(
            [
                [true, false],
                [false, true],
            ],
            modulePx,
        );
        expect(rects).toEqual([
            { x: (0 + QR_QUIET_ZONE) * modulePx, y: (0 + QR_QUIET_ZONE) * modulePx, size: modulePx },
            { x: (1 + QR_QUIET_ZONE) * modulePx, y: (1 + QR_QUIET_ZONE) * modulePx, size: modulePx },
        ]);
    });
});

describe('an-exported-name-stays-inside-the-plate', () => {
    it('wraps a hostile 32-byte name so no line exceeds maxWidth', () => {
        const maxWidth = 40;
        const glyph = 40;
        const measure = (s: string): number => s.length * glyph;
        const lines = wrapLines('W'.repeat(32), maxWidth, measure);
        expect(lines.length).toBeGreaterThan(1);
        for (const line of lines) {
            expect(measure(line)).toBeLessThanOrEqual(maxWidth);
        }
    });
});

describe('wrapLines-zero-measure-still-breaks', () => {
    it('does not treat a 0-width measure as "the whole name fits"', () => {
        const measure = (_s: string): number => 0;
        const lines = wrapLines('W'.repeat(32), 40, measure);
        expect(lines.length).toBeGreaterThan(1);
        for (const line of lines) {
            expect(measure(line)).toBeLessThanOrEqual(40);
            expect(line.length).toBeLessThanOrEqual(1);
        }
    });
});

describe('wrapLines-nan-does-not-hang', () => {
    it('returns without looping forever when every measure is NaN', () => {
        const lines = wrapLines('W'.repeat(32), 40, () => Number.NaN);
        expect(lines.length).toBeGreaterThan(0);
        expect(lines.join('').length).toBe(32);
    });
});

describe('wrapLines-whitespace-name-is-one-empty-line', () => {
    it('yields a single empty line for whitespace-only input', () => {
        const measure = (s: string): number => s.length;
        expect(wrapLines('   ', 40, measure)).toEqual(['']);
        expect(wrapLines('', 40, measure)).toEqual(['']);
        expect(wrapLines('\t\n', 40, measure)).toEqual(['']);
    });
});

describe('a-clamped-name-says-it-was-cut', () => {
    it('ends the last kept line in an ellipsis when maxLines drops a tail', () => {
        const measure = (s: string): number => s.length * 10;
        const lines = wrapLines('W'.repeat(32), 40, measure, 2);
        expect(lines).toHaveLength(2);
        expect(lines[1]!.endsWith('…')).toBe(true);
        for (const line of lines) {
            expect(measure(line)).toBeLessThanOrEqual(40);
        }
    });
});

describe('the-exported-qr-sits-on-a-white-quiet-box', () => {
    it('fills a white square covering the quiet zone before any black module', () => {
        const ops: Array<{
            fillStyle: string;
            x: number;
            y: number;
            w: number;
            h: number;
        }> = [];
        const ctx = {
            fillStyle: '',
            fillRect(this: { fillStyle: string }, x: number, y: number, w: number, h: number) {
                ops.push({ fillStyle: String(this.fillStyle), x, y, w, h });
            },
        };
        const matrix = [
            [true, false],
            [false, true],
        ];
        const modulePx = 10;
        paintQr(ctx as unknown as CanvasRenderingContext2D, matrix, 5, 7, modulePx);
        const box = (matrix.length + 2 * QR_QUIET_ZONE) * modulePx;
        expect(ops[0]).toEqual({
            fillStyle: '#ffffff',
            x: 5,
            y: 7,
            w: box,
            h: box,
        });
        expect(ops.length).toBeGreaterThan(1);
        expect(ops.slice(1).every((op) => op.fillStyle === '#000000')).toBe(true);
    });
});

describe('an-exported-url-is-the-whole-link-or-absent', () => {
    it('keeps a URL that fits in two lines and drops one that does not', () => {
        const measure = (s: string): number => s.length * 10;
        const long = `https://example.test/s/${'a'.repeat(80)}`;
        expect(urlLinesOrNone(long, 40, measure)).toEqual([]);
        const short = 'https://ex.test/s/ab';
        const kept = urlLinesOrNone(short, 400, measure);
        expect(kept.join('')).toBe(short);
        expect(kept.length).toBeLessThanOrEqual(2);
        expect(kept.join('')).not.toContain('…');
        const two = 'AAAA BBBB';
        const wrapped = urlLinesOrNone(two, 50, measure);
        expect(wrapped).toEqual(['AAAA', 'BBBB']);
    });
});

describe('savePng-does-not-start-a-second-download-while-one-is-open', () => {
    it('ignores a second call until the first blob callback runs', () => {
        const canvas = document.createElement('canvas');
        let pending: BlobCallback | undefined;
        let started = 0;
        canvas.toBlob = ((cb: BlobCallback) => {
            started += 1;
            pending = cb;
        }) as typeof canvas.toBlob;

        const downloads: string[] = [];
        const origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
            downloads.push(this.download);
        };
        const origCreate = URL.createObjectURL.bind(URL);
        const origRevoke = URL.revokeObjectURL.bind(URL);
        URL.createObjectURL = () => 'blob:test';
        URL.revokeObjectURL = () => undefined;

        try {
            savePng(canvas, 'stall-a.png');
            savePng(canvas, 'stall-b.png');
            expect(started).toBe(1);
            pending?.(new Blob(['x'], { type: 'image/png' }));
            expect(downloads).toEqual(['stall-a.png']);
            savePng(canvas, 'stall-c.png');
            expect(started).toBe(2);
        } finally {
            HTMLAnchorElement.prototype.click = origClick;
            URL.createObjectURL = origCreate;
            URL.revokeObjectURL = origRevoke;
        }
    });
});
