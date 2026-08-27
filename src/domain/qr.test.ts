import { describe, expect, it } from 'vitest';
import { qrMatrix } from './qr';

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
