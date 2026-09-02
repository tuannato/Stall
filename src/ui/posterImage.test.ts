// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { QR_QUIET_ZONE, qrModuleRects, wrapLines } from './posterImage';

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
