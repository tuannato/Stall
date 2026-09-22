import { describe, expect, it } from 'vitest';
import {
    qrMatrix,
    fitsQr,
    qrScansInBox,
    qrSpan,
    MAX_QR_CHARS,
    QR_PROVEN_PX_PER_MODULE,
    QR_QUIET_MODULES,
} from './qr';

describe('qrMatrix', () => {
    it('returns a square matrix of booleans', () => {
        const m = qrMatrix('ecash:qp63uahgrxged4z5jswyt5dn5v3lzsem6cacy2kzvq');
        expect(m.length).toBeGreaterThan(0);
        for (const row of m) {
            expect(row.length).toBe(m.length);
            for (const cell of row) {
                expect(typeof cell).toBe('boolean');
            }
        }
    });

    it('has the finder pattern corners dark', () => {
        // Every QR has a 7x7 finder in three corners; its outer ring is dark.
        const m = qrMatrix('https://stall.cash/s/x');
        const n = m.length;
        expect(m[0]![0]).toBe(true);
        expect(m[0]![6]).toBe(true);
        expect(m[6]![0]).toBe(true);
        expect(m[0]![n - 1]).toBe(true);
        expect(m[n - 1]![0]).toBe(true);
    });

    it('grows with the payload rather than truncating it', () => {
        const short = qrMatrix('ecash:qp').length;
        const long = qrMatrix(
            'ecash:qp63uahgrxged4z5jswyt5dn5v3lzsem6cacy2kzvq?amount=5.46&op_return_raw=' +
                '0453544c31'.repeat(20),
        ).length;
        expect(long).toBeGreaterThan(short);
    });
});

describe('a-link-past-the-scan-cap-is-refused-before-the-matrix', () => {
    /**
     * `shareUrl()` now keeps only a well-formed `?m=`, so no share link reaches
     * this cap from the address bar any more — the guard stays as insurance,
     * and this is the one place it is pinned directly.
     */
    it('fits at the cap, refuses one over, and the matrix throws rather than paints', () => {
        expect(fitsQr('a'.repeat(MAX_QR_CHARS))).toBe(true);
        expect(fitsQr('a'.repeat(MAX_QR_CHARS + 1))).toBe(false);
        expect(() => qrMatrix('a'.repeat(MAX_QR_CHARS + 1))).toThrow(RangeError);
    });
});

describe('a-code-is-drawn-only-where-its-own-density-is-one-we-have-read', () => {
    /**
     * The gate the memo's scan code rests on. **Pinned by literal value**:
     * every number here decided whether a permanent screen draws a code a
     * phone can read, and a test that derived its expectation from the symbol
     * it tests would stay green at any value (the `WINDOW_CARD_MS` lesson).
     *
     * 4.94 is the one reading this project has — 81 data modules in the
     * record sheet's 440px painted code — and 3.37 is the one refusal. The
     * span is the data count plus both four-module margins.
     */
    it('measures the span the drawer paints and holds the floor by value', () => {
        expect(QR_PROVEN_PX_PER_MODULE).toBe(4.94);
        expect(QR_QUIET_MODULES).toBe(4);
        const text = 'ecash:qp63uahgrxged4z5jswyt5dn5v3lzsem6cacy2kzvq?amount=5.46';
        const span = qrSpan(text)!;
        expect(span).toBe(qrMatrix(text).length + QR_QUIET_MODULES * 2);
        // The arithmetic, both sides of the line, on the same string.
        expect(qrScansInBox(text, Math.ceil(span * QR_PROVEN_PX_PER_MODULE))).toBe(true);
        expect(qrScansInBox(text, Math.floor(span * QR_PROVEN_PX_PER_MODULE) - 1)).toBe(false);
        // Past the character cap there is no code to measure, so nothing is
        // drawn — never a span of zero, which would read as "it scans".
        expect(qrSpan('a'.repeat(MAX_QR_CHARS + 1))).toBeUndefined();
        expect(qrScansInBox('a'.repeat(MAX_QR_CHARS + 1), 10_000)).toBe(false);
    });
});
