import { describe, expect, it } from 'vitest';
import type { TokenPrice } from './description';
import {
    MAX_SELECTION_ENTRIES,
    pruneSelection,
    selectionCount,
    selectionGlance,
    selectionHasSurcharge,
    selectionNeedsNoRate,
    selectionSats,
    selectionTolerance,
    selectionUnit,
} from './selection';
import { satsForQuote, scaleRate } from './fiat';

const A = 'aa'.repeat(32);
const B = 'bb'.repeat(32);
const C = 'cc'.repeat(32);
const USD5: TokenPrice = { code: 'usd', exponent: 2, amount: 500n };
const USD3_SUR: TokenPrice = { code: 'usd', exponent: 2, amount: 350n, surchargePct: 5, tolerancePct: 2 };
const XEC: TokenPrice = { code: 'xec', exponent: 2, amount: 500_000n, surchargePct: 10 };
const RATE = scaleRate(0.00002)!;

describe('a-selection-holds-one-unit', () => {
    /**
     * The unit is the first item's, and the glance refuses to sum across
     * units rather than converting anything: the strip composes no figure,
     * so it has no rate to convert with.
     */
    it('takes the first item’s unit and refuses a glance over two', () => {
        const prices = new Map([[A, USD5], [B, XEC]]);
        expect(selectionUnit(new Map(), prices)).toBeUndefined();
        expect(selectionUnit(new Map([[A, 1n]]), prices)).toBe('usd');
        expect(selectionUnit(new Map([[B, 1n]]), prices)).toBe('xec');
        expect(selectionGlance(new Map([[A, 1n], [B, 1n]]), prices)).toBeUndefined();
        expect(selectionSats(new Map([[A, 1n], [B, 1n]]), prices, RATE)).toBeUndefined();
    });

    it('an xec selection needs no rate; a usd one does', () => {
        const prices = new Map([[A, USD5], [B, XEC]]);
        expect(selectionNeedsNoRate(new Map([[B, 2n]]), prices)).toBe(true);
        expect(selectionNeedsNoRate(new Map([[A, 2n]]), prices)).toBe(false);
        expect(selectionNeedsNoRate(new Map(), prices)).toBe(false);
    });
});

describe('the-selection-glance-is-the-records-in-the-sellers-unit', () => {
    /**
     * Per item the quote plus its own surcharge, rounded up per item, times
     * its count — the single sheet's arithmetic applied item by item — and
     * the sum in the unit's minor units, never a rate anywhere.
     */
    it('sums counts × surcharged quotes, in minor units', () => {
        const prices = new Map([[A, USD5], [B, USD3_SUR]]);
        // 2 × $5.00 + 1 × ceil($3.50 × 1.05 = $3.675 → $3.68) = $13.68
        expect(selectionGlance(new Map([[A, 2n], [B, 1n]]), prices)).toEqual({
            code: 'usd',
            exponent: 2,
            amount: 1368n,
        });
        expect(selectionCount(new Map([[A, 2n], [B, 1n]]))).toBe(3n);
        expect(selectionHasSurcharge(new Map([[A, 2n]]), prices)).toBe(false);
        expect(selectionHasSurcharge(new Map([[A, 2n], [B, 1n]]), prices)).toBe(true);
        expect(selectionGlance(new Map(), prices)).toBeUndefined();
        expect(selectionGlance(new Map([[C, 1n]]), prices)).toBeUndefined();
    });
});

describe('the-selection-figure-is-one-bigint-per-item-summed', () => {
    /**
     * `satsForQuote` then `satsWithSurcharge` per item, both rounding up —
     * exactly what the single sheet composes for that item alone — and the
     * sum is what the figure, both links and the code carry. Any item that
     * cannot be composed refuses the whole, so no partial total is printed.
     */
    it('equals the single-sheet figure of each item, summed', () => {
        const prices = new Map([[A, USD5], [B, USD3_SUR]]);
        const a = satsForQuote(USD5, 2n, RATE)!;
        const b = satsForQuote(USD3_SUR, 1n, RATE)!;
        const bSur = (b * 105n + 99n) / 100n;
        expect(selectionSats(new Map([[A, 2n], [B, 1n]]), prices, RATE)).toBe(a + bSur);
        expect(selectionSats(new Map([[A, 2n]]), prices, undefined), 'usd needs a rate').toBeUndefined();
        expect(selectionSats(new Map([[B, 3n]]), new Map([[B, XEC]]), undefined)).toBe(
            ((500_000n * 3n) * 110n + 99n) / 100n,
        );
        expect(selectionSats(new Map(), prices, RATE)).toBeUndefined();
    });

    it('the valve takes the tightest stated tolerance, or none', () => {
        const prices = new Map([[A, USD5], [B, USD3_SUR], [C, { ...USD5, tolerancePct: 10 }]]);
        expect(selectionTolerance(new Map([[A, 1n]]), prices)).toBeUndefined();
        expect(selectionTolerance(new Map([[A, 1n], [B, 1n], [C, 1n]]), prices)).toBe(2);
        expect(selectionTolerance(new Map([[C, 1n]]), prices)).toBe(10);
    });
});

describe('a-removed-quote-leaves-the-selection', () => {
    it('prunes what the rail no longer quotes and says so once', () => {
        const pruned = pruneSelection(new Map([[A, 2n], [B, 1n]]), new Set([A]));
        expect([...pruned.selection]).toEqual([[A, 2n]]);
        expect(pruned.dropped).toBe(true);
        const kept = pruneSelection(new Map([[A, 2n]]), new Set([A, B]));
        expect(kept.dropped).toBe(false);
        expect(MAX_SELECTION_ENTRIES).toBe(35);
    });
});
