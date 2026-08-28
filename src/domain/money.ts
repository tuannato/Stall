/** Display maths. Never Number() on satoshis or atoms. */

import type { StallOffer } from './state';

const SATS_PER_XEC = 100n;
/** 1 sat = 1e9 nanosats. AgoraPartial.priceNanoSatsPerAtom uses this scale. */
export const NANOSATS_PER_SAT = 1_000_000_000n;
const NANOSATS_PER_XEC = SATS_PER_XEC * NANOSATS_PER_SAT;
/**
 * 4 XEC decimal places — the < 10 XEC rate band, and the "not free" floor.
 * Exported so the row can label a bound without wrapping it in `≈`.
 */
export const RATE_TOO_SMALL = '< 0.0001';
/** SLP/ALP genesis decimals sit in 0–9; 18 is a hard ceiling, not a guess. */
const MAX_DECIMALS = 18;

export function formatXec(sats: bigint): string {
    return formatScaled(sats, SATS_PER_XEC, 2);
}

/**
 * Format nanosats as XEC. 1 XEC = 1e11 nanosats, so the fraction can run to
 * 11 digits. Trailing zeros are dropped. Not a covenant amount — this
 * helper does not round; `formatTokenRate` does.
 */
export function formatXecFromNanoSats(nanoSats: bigint): string {
    return formatScaled(nanoSats, NANOSATS_PER_XEC, 11);
}

function formatScaled(amount: bigint, base: bigint, fracWidth: number): string {
    const sign = amount < 0n ? '-' : '';
    const abs = amount < 0n ? -amount : amount;
    const whole = abs / base;
    const frac = abs % base;
    const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (frac === 0n) {
        return `${sign}${wholeStr}`;
    }
    const fracStr = frac.toString().padStart(fracWidth, '0').replace(/0+$/, '');
    return `${sign}${wholeStr}.${fracStr}`;
}

/**
 * Floor-divides asked sats by atoms into nanosats-per-atom. Multiplying
 * back does not recover `askedSats` when the division had a remainder —
 * that is why a rate built from this is labelled as a rate.
 */
export function nanoSatsPerAtom(askedSats: bigint, atoms: bigint): bigint | undefined {
    if (atoms <= 0n) {
        return undefined;
    }
    return (askedSats * NANOSATS_PER_SAT) / atoms;
}

/**
 * Nanosats per whole token from a per-atom rate. `decimals` is genesis
 * metadata, not an amount — refuse a value that is not a small integer
 * rather than raising `10n ** BigInt(decimals)` into a hang.
 */
export function nanoSatsPerToken(
    priceNanoSatsPerAtom: bigint,
    decimals: number,
): bigint | undefined {
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECIMALS) {
        return undefined;
    }
    return priceNanoSatsPerAtom * 10n ** BigInt(decimals);
}

/**
 * Glance rate, not a covenant amount. One fraction width is a wall of
 * nanosats at 190.0000976562 and a lie at 0.0009. Magnitude picks a
 * rounding unit in nanosats (never Number() on the amount): 2 XEC
 * decimals at ≥ 10, 4 below. Half-up — paid figures in this module
 * floor; this one is not. A positive rate that still rounds to 0
 * prints `< 0.0001`, not `0`, which would read as free. A per-atom
 * 0 is omitted (the floor-div already threw it away), not dressed
 * as a bound. Trailing zeros are stripped, so 190.00 becomes `190`;
 * the `≈` on the row is what marks it inexact.
 */
export function formatTokenRate(
    priceNanoSatsPerAtom: bigint,
    decimals: number,
): string | undefined {
    const perToken = nanoSatsPerToken(priceNanoSatsPerAtom, decimals);
    if (perToken === undefined || perToken === 0n) {
        return undefined;
    }
    const rounded = roundHalfUp(perToken, rateRoundingUnit(perToken));
    if (rounded === 0n) {
        return RATE_TOO_SMALL;
    }
    return formatXecFromNanoSats(rounded);
}

function rateRoundingUnit(nanoSatsPerToken: bigint): bigint {
    const n = nanoSatsPerToken < 0n ? -nanoSatsPerToken : nanoSatsPerToken;
    if (n >= 10n * NANOSATS_PER_XEC) {
        return NANOSATS_PER_XEC / 100n;
    }
    return NANOSATS_PER_XEC / 10_000n;
}

function roundHalfUp(amount: bigint, unit: bigint): bigint {
    if (unit <= 1n) {
        return amount;
    }
    const abs = amount < 0n ? -amount : amount;
    const rounded = ((abs + unit / 2n) / unit) * unit;
    return amount < 0n ? -rounded : rounded;
}

export function formatAtoms(atoms: bigint, decimals: number): string {
    if (decimals === 0) {
        return atoms.toString();
    }
    const sign = atoms < 0n ? '-' : '';
    const abs = atoms < 0n ? -atoms : atoms;
    const base = 10n ** BigInt(decimals);
    const whole = abs / base;
    const frac = abs % base;
    if (frac === 0n) {
        return `${sign}${whole.toString()}`;
    }
    const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${sign}${whole.toString()}.${fracStr}`;
}

/** True when a is a strictly better price than b (fewer sats per atom). */
export function isCheaper(
    a: { askedSats: bigint; askedAtoms: bigint },
    b: { askedSats: bigint; askedAtoms: bigint },
): boolean {
    if (a.askedAtoms === 0n || b.askedAtoms === 0n) {
        return false;
    }
    return a.askedSats * b.askedAtoms < b.askedSats * a.askedAtoms;
}

export function cheaperOfferCount(
    selected: { tokenId: string; askedSats: bigint; askedAtoms: bigint },
    others: Array<{ tokenId: string; askedSats: bigint; askedAtoms: bigint }>,
): number {
    let n = 0;
    for (const o of others) {
        if (o.tokenId !== selected.tokenId) {
            continue;
        }
        if (isCheaper(o, selected)) {
            n += 1;
        }
    }
    return n;
}

/**
 * The covenant's minimum accept exceeds what is left on the UTXO, so no
 * quantity satisfies the script and the offer can only be cancelled by its
 * maker. Reached in the wild as the remainder of a partial fill, not at
 * listing time — `AgoraPartial` refuses to create one this way.
 *
 * Not a display preference: the asked price we hold for such an offer is the
 * price of a take that cannot happen, so it must not be shown as a price.
 */
export function isUnbuyable(offer: {
    minAcceptedAtoms?: bigint;
    atoms: bigint;
}): boolean {
    return offer.minAcceptedAtoms !== undefined && offer.minAcceptedAtoms > offer.atoms;
}

/**
 * Reading order for a stall's rows. Offers of the same token sit together, and
 * within a token the cheaper rate comes first.
 *
 * This is ordering, not grouping. Every row stays its own covenant with its own
 * asked amount: a group header priced at its cheapest member would be a number
 * no covenant encodes, which is exactly what §8 forbids. Nothing here computes
 * a price — it only decides which row is printed next.
 *
 * Offers with no comparable rate keep their relative order at the end of their
 * token's run rather than being dropped or floated to the top.
 */
export function compareOffers(a: StallOffer, b: StallOffer): number {
    if (a.tokenId !== b.tokenId) {
        return a.tokenId < b.tokenId ? -1 : 1;
    }
    const ra = a.priceNanoSatsPerAtom;
    const rb = b.priceNanoSatsPerAtom;
    if (ra === undefined && rb === undefined) {
        return 0;
    }
    if (ra === undefined) {
        return 1;
    }
    if (rb === undefined) {
        return -1;
    }
    if (ra === rb) {
        return 0;
    }
    return ra < rb ? -1 : 1;
}
