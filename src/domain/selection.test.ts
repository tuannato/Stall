import { describe, expect, it } from 'vitest';
import type { TokenPrice } from './description';
import {
    MAX_SELECTION_ENTRIES,
    lineAmount,
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
    it('sums the lines — count × quote, the surcharge on the product, rounded up once', () => {
        const prices = new Map([[A, USD5], [B, USD3_SUR]]);
        // 2 × $5.00 + ceil(1 × $3.50 × 1.05 = $3.675 → $3.68) = $13.68
        expect(selectionGlance(new Map([[A, 2n], [B, 1n]]), prices)).toEqual({
            code: 'usd',
            exponent: 2,
            amount: 1368n,
        });
        // Per line, not per unit: 3 × $3.50 = $10.50 × 1.05 = $11.025 → $11.03,
        // where rounding each unit first would print $11.04 over a figure
        // worth $11.025 (the critic, 2026-09-21).
        expect(lineAmount(USD3_SUR, 3n)).toBe(1103n);
        expect(selectionGlance(new Map([[B, 3n]]), prices)?.amount).toBe(1103n);
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

    it('the valve takes the tightest margin over every item, an unstated one counting at the default', () => {
        const prices = new Map([[A, USD5], [B, USD3_SUR], [C, { ...USD5, tolerancePct: 10 }]]);
        expect(selectionTolerance(new Map([[A, 1n]]), prices, 2)).toBe(2);
        expect(selectionTolerance(new Map([[A, 1n], [B, 1n], [C, 1n]]), prices, 2)).toBe(2);
        expect(selectionTolerance(new Map([[C, 1n]]), prices, 2)).toBe(10);
        // {10%, none} is valved at the default, never at 10.
        expect(selectionTolerance(new Map([[C, 1n], [A, 1n]]), prices, 2)).toBe(2);
        expect(selectionTolerance(new Map([[B, 1n], [C, 1n]]), prices, 5)).toBe(2);
    });
});

describe('a-removed-quote-leaves-the-selection', () => {
    it('prunes what a complete read no longer quotes and says so once', () => {
        // B's record is gone from a read that finished: the seller removed it.
        const pruned = pruneSelection(new Map([[A, 2n], [B, 1n]]), new Map([[A, USD5]]), true);
        expect([...pruned.selection]).toEqual([[A, 2n]]);
        expect(pruned.dropped).toBe(true);
        const kept = pruneSelection(new Map([[A, 2n]]), new Map([[A, USD5], [B, USD3_SUR]]), true);
        expect(kept.dropped).toBe(false);
        expect(MAX_SELECTION_ENTRIES).toBe(35);
    });

    it('prunes an item a re-read moved to another unit, so a selection never holds two', () => {
        // The seller republished B from USD to XEC under an open strip.
        const moved = new Map([[A, USD5], [B, XEC]]);
        const pruned = pruneSelection(new Map([[A, 2n], [B, 1n]]), moved, true);
        expect([...pruned.selection]).toEqual([[A, 2n]]);
        expect(pruned.dropped).toBe(true);
        // The unit is the first KEPT item's: A gone, B and C stay in theirs.
        const first = pruneSelection(new Map([[A, 1n], [B, 1n], [C, 1n]]), new Map([[B, XEC], [C, { ...XEC, amount: 1n }]]), true);
        expect([...first.selection.keys()]).toEqual([B, C]);
        expect(first.dropped).toBe(true);
        // A unit this page does not paint is a unit that changed, even alone.
        const unpainted = pruneSelection(new Map([[A, 1n]]), new Map([[A, { ...USD5, code: 'zzz' }]]), true);
        expect([...unpainted.selection]).toEqual([]);
        expect(unpainted.dropped).toBe(true);
    });

    it('keeps what a read that did not finish never reached, and never says it was taken out', () => {
        // The critic's fifth pass (2026-09-24): a walk that stopped at our
        // own page cap, or threw, did not reach A — our gap, not the seller's.
        const partial = pruneSelection(new Map([[A, 2n], [B, 1n]]), new Map([[B, USD3_SUR]]), false);
        expect([...partial.selection]).toEqual([[A, 2n], [B, 1n]]);
        expect(partial.dropped).toBe(false);
        // …while a unit it DID read moving is still the seller's doing.
        const movedInPart = pruneSelection(new Map([[A, 2n], [B, 1n]]), new Map([[A, USD5], [B, XEC]]), false);
        expect([...movedInPart.selection]).toEqual([[A, 2n]]);
        expect(movedInPart.dropped).toBe(true);
        // …and so is a removal it DID reach (the sixth pass): a walk reads
        // newest first, so a token it resolved is resolved.
        const removedInPart = pruneSelection(new Map([[A, 2n], [B, 1n]]), new Map([[B, USD3_SUR]]), false, new Set([A, B]));
        expect([...removedInPart.selection]).toEqual([[B, 1n]]);
        expect(removedInPart.dropped).toBe(true);
    });
});
