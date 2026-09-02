// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
    QR_QUIET_ZONE,
    type PosterKind,
    type PosterPaint,
    drawPoster,
    paintQr,
    posterSpec,
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

/*
 * The four formats, measured. happy-dom's `getContext('2d')` is null, so the
 * canvas here is a recorder: every fillRect and fillText is kept with the
 * fillStyle and font that were current, and `measureText` is a glyph model the
 * test controls. That is enough to read a layout back out of `drawPoster`
 * without a browser — what it cannot see is the real face's metrics, so it
 * proves anchoring and case, never kerning.
 */
type DrawnRect = { fill: string; x: number; y: number; w: number; h: number };
type DrawnText = { text: string; x: number; y: number; font: string; fill: string };

/** Width of `s` at `size` px. Default: one flat advance for every code unit. */
type Glyph = (s: string, size: number) => number;

class Recorder {
    fillStyle = '';
    strokeStyle = '';
    lineWidth = 1;
    font = '16px test';
    textAlign = 'left';
    textBaseline = 'alphabetic';
    letterSpacing = '0px';
    readonly rects: DrawnRect[] = [];
    readonly texts: DrawnText[] = [];
    constructor(private readonly glyph?: Glyph) {}
    fillRect(x: number, y: number, w: number, h: number): void {
        this.rects.push({ fill: this.fillStyle, x, y, w, h });
    }
    fillText(text: string, x: number, y: number): void {
        this.texts.push({ text, x, y, font: this.font, fill: this.fillStyle });
    }
    measureText(s: string): { width: number } {
        const size = Number(/(\d+(?:\.\d+)?)px/.exec(this.font)?.[1] ?? 16);
        return { width: this.glyph !== undefined ? this.glyph(s, size) : s.length * size * 0.55 };
    }
    beginPath(): void {}
    closePath(): void {}
    moveTo(): void {}
    lineTo(): void {}
    arcTo(): void {}
    save(): void {}
    restore(): void {}
    clip(): void {}
    stroke(): void {}
    fill(): void {}
}

/** A 25-module stand-in: the shape of a real matrix, none of its bytes. */
const MATRIX: boolean[][] = Array.from({ length: 25 }, (_, r) =>
    Array.from({ length: 25 }, (_, c) => (r + c) % 3 === 0),
);

const LINK = 'https://stall.test/s/ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09';

/** Deliberately no white and no repeats: every mark below is attributable. */
const paint = (over: Partial<PosterPaint> = {}): PosterPaint => ({
    bg: '#111111',
    surface: '#222222',
    text: '#333333',
    muted: '#444444',
    accent: '#555555',
    accent2: '#666666',
    radius: 14,
    font: 'TestFace',
    name: 'Riverside Goods',
    nameCase: 'none',
    nameWeight: '800',
    tagline: 'Fresh weekly',
    url: LINK,
    matrix: MATRIX,
    nameLines: 2,
    ...over,
});

function draw(kind: PosterKind, p: PosterPaint, glyph?: Glyph): Recorder {
    const rec = new Recorder(glyph);
    const canvas = {
        width: 0,
        height: 0,
        getContext: () => rec,
    } as unknown as HTMLCanvasElement;
    drawPoster(canvas, posterSpec(kind, p));
    return rec;
}

/** `paintQr` opens with one white square: that is the box, quiet zone included. */
function qrBox(rec: Recorder): DrawnRect {
    const box = rec.rects.find((r) => r.fill === '#ffffff' && r.w === r.h && r.w > 0);
    if (box === undefined) {
        throw new Error('no QR box was painted');
    }
    return box;
}

const monoTexts = (rec: Recorder): string[] =>
    rec.texts.filter((t) => t.font.includes('monospace')).map((t) => t.text);

describe('square-and-story-anchor-the-qr-row-regardless-of-tagline', () => {
    it('puts the QR box at the same place with a long tagline, a short one and none', () => {
        for (const kind of ['square', 'story'] as const) {
            const long = qrBox(
                draw(kind, paint({ tagline: 'Fresh from the riverside — roasted and packed weekly' })),
            );
            const short = qrBox(draw(kind, paint({ tagline: 'Open Sundays' })));
            const none = qrBox(draw(kind, paint({ tagline: undefined })));
            expect(short, kind).toEqual(long);
            expect(none, kind).toEqual(long);
        }
    });
});

describe('the-head-yields-to-the-qr-row', () => {
    /**
     * The row is anchored from the foot, so a tall head — a name that wraps
     * to three lines, a two-line tagline — used to run straight into the QR
     * (measured on the Neo square: the tagline's second line sat under the
     * code). The head gives way instead: the name steps down through its
     * sizes until it clears the row, and the tagline keeps only the lines
     * that fit, or none. The name is never cut for room; the tagline is.
     */
    // With the default glyph (0.55em advance) these wrap to two and three
    // name lines and two tagline lines, and the link fits, so the row is
    // lifted by the link block — the exact stack that overlapped.
    const twoLineTagline = 'Fresh from the riverside — roasted, packed and posted every single week';
    const cases: Array<[string, Partial<PosterPaint>, Glyph | undefined]> = [
        ['two-line name, two-line tagline', { name: 'Riverside Goods and Wares', tagline: twoLineTagline }, undefined],
        ['three-line name', { name: 'Riverside Goods, Wares and Sundries Co', nameLines: 3, tagline: twoLineTagline }, undefined],
        ['uppercase name', { name: 'Riverside Goods and Wares', nameCase: 'uppercase', tagline: twoLineTagline }, undefined],
    ];
    it('paints nothing of the head below the top of the QR box', () => {
        for (const kind of ['square', 'story'] as const) {
            for (const [label, over, glyph] of cases) {
                const rec = draw(kind, paint(over), glyph);
                const qr = qrBox(rec);
                for (const t of rec.texts) {
                    if (t.y >= qr.y) {
                        continue; // the row and the link, below the code
                    }
                    const size = Number(/(\d+(?:\.\d+)?)px/.exec(t.font)?.[1] ?? 0);
                    expect(t.y + size, `${kind} ${label}: "${t.text}"`).toBeLessThanOrEqual(qr.y);
                }
                const nameLine = rec.texts.find((t) => t.fill === '#333333' && t.y < qr.y);
                expect(nameLine, `${kind} ${label}: the name is still painted`).toBeDefined();
            }
        }
    });
});

describe('every-format-keeps-the-qr-at-a-third-of-the-short-side', () => {
    it('reserves and paints a QR box no smaller than a third of the format', () => {
        for (const kind of ['square', 'story', 'stream'] as const) {
            const spec = posterSpec(kind, paint());
            const floor = Math.min(spec.width, spec.height) / 3;
            expect(spec.qrSide, `${kind} reserved`).toBeGreaterThanOrEqual(floor);
            expect(qrBox(draw(kind, paint())).w, `${kind} painted`).toBeGreaterThanOrEqual(floor);
        }
    });
});

describe('the-stream-card-height-follows-the-name-lines', () => {
    it('grows by exactly one name line from two lines to three', () => {
        const two = posterSpec('stream', paint({ nameLines: 2 })).height;
        const three = posterSpec('stream', paint({ nameLines: 3 })).height;
        expect(three - two).toBe(Math.ceil(48 * 1.02));
        // The design's constants, added up: 40 pad, 16 bars, 28, 16 brand, 14,
        // n x 49 of name, 232 of QR, 40 pad.
        expect(two).toBe(484);
        expect(three).toBe(533);
    });
});

describe('a-saved-poster-names-the-stall-the-qr-opens', () => {
    it('draws the whole link under the QR, or nothing at all', () => {
        for (const kind of ['square', 'story'] as const) {
            expect(monoTexts(draw(kind, paint())).join(''), kind).toBe(LINK);
            const huge = `https://stall.test/s/${'a'.repeat(400)}`;
            expect(monoTexts(draw(kind, paint({ url: huge }))), `${kind} overlong`).toEqual([]);
        }
    });

    it('never puts a link on the stream card', () => {
        expect(monoTexts(draw('stream', paint()))).toEqual([]);
        expect(draw('stream', paint()).texts.map((t) => t.text).join(' ')).not.toContain('stall.test');
    });
});

describe('the-name-is-measured-in-the-case-it-is-painted', () => {
    it('uppercases before wrapping, so no painted line overruns the column', () => {
        // A capital is twice the advance of a lowercase letter here: a name
        // wrapped lowercase and then uppercased runs off the plate.
        const glyph: Glyph = (s, size) => {
            let w = 0;
            for (const ch of s) {
                const upper = ch === ch.toUpperCase() && ch !== ch.toLowerCase();
                w += upper ? size * 0.9 : size * 0.45;
            }
            return w;
        };
        const rec = draw(
            'square',
            paint({ name: 'riverside goods weekly market', nameCase: 'uppercase', nameLines: 3 }),
            glyph,
        );
        // The name's lines are the ones in the name's weight: the head may
        // have stepped them below 108px to clear the QR row.
        const lines = rec.texts.filter((t) => t.font.startsWith('800 '));
        expect(lines.length).toBeGreaterThan(1);
        for (const line of lines) {
            expect(line.text).toBe(line.text.toUpperCase());
            // Measured at the size the line was painted at: the head steps the
            // name down to clear the QR row (`the-head-yields-to-the-qr-row`),
            // so 108 is the largest size, not the only one.
            const size = Number(/(\d+(?:\.\d+)?)px/.exec(line.font)?.[1] ?? 108);
            expect(glyph(line.text, size)).toBeLessThanOrEqual(1080 - 80 * 2);
        }
    });
});

describe('the-second-accent-is-a-second-bar-only-when-it-is-a-second-colour', () => {
    it('draws one bar when accentTwo equals accent and two when it differs', () => {
        const one = draw('square', paint({ accent: '#555555', accent2: '#555555' }));
        expect(one.rects.filter((r) => r.fill === '#555555')).toHaveLength(1);
        const two = draw('square', paint());
        expect(two.rects.filter((r) => r.fill === '#555555')).toHaveLength(1);
        expect(two.rects.filter((r) => r.fill === '#666666')).toHaveLength(1);
    });
});

describe('the-stream-plate-is-the-surface-and-the-page-is-the-ground', () => {
    it('fills square and story with --s-bg and never with the card surface', () => {
        const rec = draw('square', paint());
        expect(rec.rects[0]).toEqual({ fill: '#111111', x: 0, y: 0, w: 1080, h: 1080 });
        expect(rec.rects.some((r) => r.fill === '#222222')).toBe(false);
    });
});
