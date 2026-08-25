/** Display maths. Never Number() on satoshis or atoms. */

const SATS_PER_XEC = 100n;
/** 1 sat = 1e9 nanosats. AgoraPartial.priceNanoSatsPerAtom uses this scale. */
export const NANOSATS_PER_SAT = 1_000_000_000n;
const NANOSATS_PER_XEC = SATS_PER_XEC * NANOSATS_PER_SAT;
/** SLP/ALP genesis decimals sit in 0–9; 18 is a hard ceiling, not a guess. */
const MAX_DECIMALS = 18;

export function formatXec(sats: bigint): string {
    return formatScaled(sats, SATS_PER_XEC, 2);
}

/**
 * Format nanosats as XEC. 1 XEC = 1e11 nanosats, so the fraction can run to
 * 11 digits. Trailing zeros are dropped. This is a rate, not a covenant
 * amount: floor-dividing sats into nanosats-per-atom does not invert.
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

export function formatTokenRate(
    priceNanoSatsPerAtom: bigint,
    decimals: number,
): string | undefined {
    const perToken = nanoSatsPerToken(priceNanoSatsPerAtom, decimals);
    if (perToken === undefined) {
        return undefined;
    }
    return formatXecFromNanoSats(perToken);
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
