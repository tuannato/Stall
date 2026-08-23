/** Display maths. Never Number() on satoshis or atoms. */

const SATS_PER_XEC = 100n;

export function formatXec(sats: bigint): string {
    const sign = sats < 0n ? '-' : '';
    const abs = sats < 0n ? -sats : sats;
    const whole = abs / SATS_PER_XEC;
    const frac = abs % SATS_PER_XEC;
    const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (frac === 0n) {
        return `${sign}${wholeStr}`;
    }
    const fracStr = frac.toString().padStart(2, '0').replace(/0+$/, '');
    return `${sign}${wholeStr}.${fracStr}`;
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
