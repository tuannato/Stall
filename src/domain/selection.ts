/**
 * "Pay several" (2026-09-21): the buyer's chosen quotes and counts, and the
 * arithmetic every surface that prints them shares.
 *
 * Pure. Nothing here knows a screen: the strip's glance, the sheet's total
 * and the row's line all read these, so a figure derived in three places
 * cannot come to mean three things. The selection is `boot` closure state
 * written onto the view at paint time (the `shopTab` rule) and is
 * **session only** (D7): nothing persists it.
 *
 * **One unit per selection** (§3 of the design memo): the selection takes
 * the unit of its first item, and a quote in another unit stays "apart"
 * with its own Pay control, renamed for what it does. A selection that
 * summed a USD quote and an XEC quote would need a rate to say what it is
 * worth on the strip, where no figure is composed (the strip is a glance in
 * the seller's unit; the sheet is where a figure freezes).
 */
import { XEC_PRICE_CODE, surchargedQuote, type TokenPrice } from './description';
import { satsForQuote, satsWithSurcharge } from './fiat';

/** Token id → count, whole items, at least one each. */
export type Selection = ReadonlyMap<string, bigint>;

/**
 * The most distinct items one selection holds. The memo's second shape
 * (`STLP`, D10) carries 35 entries in the 222-byte budget at 4-byte
 * prefixes; the UI stops there so the memo never has to drop an item the
 * buyer chose (step 5 of the build order lands the memo).
 */
export const MAX_SELECTION_ENTRIES = 35;

/** The unit the selection is in: its first item's, or none while empty. */
export function selectionUnit(
    selection: Selection,
    prices: ReadonlyMap<string, TokenPrice> | undefined,
): string | undefined {
    for (const tokenId of selection.keys()) {
        const price = prices?.get(tokenId);
        if (price !== undefined) {
            return price.code;
        }
    }
    return undefined;
}

/** Whole items chosen, summed over every entry. */
export function selectionCount(selection: Selection): bigint {
    let total = 0n;
    for (const count of selection.values()) {
        total += count;
    }
    return total;
}

/**
 * The strip's figure: the selection in the seller's unit, surcharges
 * included — a GLANCE, computed from the records for the eye and never for
 * a link (the memo §1). Each item is its quote plus its own surcharge,
 * rounded up per item (`surchargedQuote`), times its count; the sum is a
 * `TokenPrice` in the selection's unit so `quoteFigure` prints it exactly
 * as it prints a quote. Undefined while the selection is empty, or when an
 * entry's price is missing or in another unit (the rows keep that from
 * happening; the arithmetic refuses rather than mixing).
 */
export function selectionGlance(
    selection: Selection,
    prices: ReadonlyMap<string, TokenPrice> | undefined,
): TokenPrice | undefined {
    const unit = selectionUnit(selection, prices);
    if (unit === undefined) {
        return undefined;
    }
    let exponent: number | undefined;
    let amount = 0n;
    for (const [tokenId, count] of selection) {
        const price = prices?.get(tokenId);
        if (price === undefined || price.code !== unit) {
            return undefined;
        }
        if (exponent === undefined) {
            exponent = price.exponent;
        } else if (exponent !== price.exponent) {
            return undefined;
        }
        amount += surchargedQuote(price).amount * count;
    }
    if (exponent === undefined || amount <= 0n) {
        return undefined;
    }
    return { code: unit, exponent, amount };
}

/** Whether any chosen item's record carries a surcharge — the strip's note. */
export function selectionHasSurcharge(
    selection: Selection,
    prices: ReadonlyMap<string, TokenPrice> | undefined,
): boolean {
    for (const tokenId of selection.keys()) {
        if (prices?.get(tokenId)?.surchargePct !== undefined) {
            return true;
        }
    }
    return false;
}

/**
 * The satoshis the wallet signs for the whole selection: per item, the
 * quote converted at the frozen rate and then that item's own surcharge on
 * top (both rounding up, the single sheet's arithmetic exactly), summed.
 * Undefined when any item cannot be composed — a rate the unit needs and
 * does not have, a price missing — so a sheet never prints a partial total.
 */
export function selectionSats(
    selection: Selection,
    prices: ReadonlyMap<string, TokenPrice> | undefined,
    rate: bigint | undefined,
): bigint | undefined {
    // One unit per selection, refused here as the glance refuses it: the
    // rows never produce a mixed selection, and a sum that quietly crossed
    // units would be a figure nobody could check against the strip.
    const unit = selectionUnit(selection, prices);
    let total = 0n;
    for (const [tokenId, count] of selection) {
        const price = prices?.get(tokenId);
        if (price === undefined || price.code !== unit) {
            return undefined;
        }
        const sats = satsWithSurcharge(satsForQuote(price, count, rate), price.surchargePct);
        if (sats === undefined) {
            return undefined;
        }
        total += sats;
    }
    return selection.size === 0 ? undefined : total;
}

/** True when the selection's unit is the chain's own: no rate is read anywhere on its sheet. */
export function selectionNeedsNoRate(
    selection: Selection,
    prices: ReadonlyMap<string, TokenPrice> | undefined,
): boolean {
    return selectionUnit(selection, prices) === XEC_PRICE_CODE;
}

/**
 * The tightest margin any chosen item states, for the press-time valve —
 * the app's own default stands in when none of them states one, exactly as
 * it does on the single sheet.
 */
export function selectionTolerance(
    selection: Selection,
    prices: ReadonlyMap<string, TokenPrice> | undefined,
): number | undefined {
    let tightest: number | undefined;
    for (const tokenId of selection.keys()) {
        const pct = prices?.get(tokenId)?.tolerancePct;
        if (pct !== undefined && (tightest === undefined || pct < tightest)) {
            tightest = pct;
        }
    }
    return tightest;
}

/**
 * A quote that leaves the rail leaves the selection (D8). Applied at paint
 * time over the quoted set, so a live re-read that removed a record cannot
 * leave a count on an item the seller no longer quotes; `dropped` is what
 * the strip says once, until the selection next changes.
 */
export function pruneSelection(
    selection: Selection,
    quoted: ReadonlySet<string>,
): { selection: Map<string, bigint>; dropped: boolean } {
    const kept = new Map<string, bigint>();
    let dropped = false;
    for (const [tokenId, count] of selection) {
        if (quoted.has(tokenId)) {
            kept.set(tokenId, count);
        } else {
            dropped = true;
        }
    }
    return { selection: kept, dropped };
}
