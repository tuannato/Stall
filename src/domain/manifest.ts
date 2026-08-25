import { decodeTheme, THEME_BYTES, type DecodedTheme } from './theme';

export const STL1_ASCII = 'STL1';
export const STL1_HEX = '53544c31';
export const MAX_STALL_NAME = 32;

export type StallManifest = {
    name: string;
    theme: DecodedTheme;
};

export class ManifestDecodeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ManifestDecodeError';
    }
}

/**
 * STL1 payload after OP_RETURN: push "STL1", push utf-8 name (1–32 bytes),
 * push exactly 28 theme bytes. Extra pushes reject the record.
 */
/**
 * True when an OP_RETURN claims to be ours. Checked before anything else, so a
 * record we cannot read can be told apart from one that was never addressed to
 * us — a stall memo and a broken manifest must not look the same.
 */
export function isStl1(pushes: Uint8Array[]): boolean {
    const lokad = pushes[0];
    return (
        lokad !== undefined &&
        lokad.length === 4 &&
        String.fromCharCode(...lokad) === STL1_ASCII
    );
}

export function decodeManifestPushes(pushes: Uint8Array[]): StallManifest {
    if (!isStl1(pushes)) {
        throw new ManifestDecodeError('LOKAD is not STL1');
    }
    if (pushes.length !== 3) {
        throw new ManifestDecodeError(`STL1 expects 3 pushes, got ${pushes.length}`);
    }
    const nameBytes = pushes[1]!;
    const themeBytes = pushes[2]!;
    if (nameBytes.length < 1 || nameBytes.length > MAX_STALL_NAME) {
        throw new ManifestDecodeError('stall name length');
    }
    const name = new TextDecoder('utf-8', { fatal: true }).decode(nameBytes);
    if (themeBytes.length !== THEME_BYTES) {
        throw new ManifestDecodeError('theme is not 28 bytes');
    }
    return { name, theme: decodeTheme(themeBytes) };
}

export type ManifestRank = {
    height: number | undefined;
    txid: string;
};

/**
 * Highest block, then txid.
 *
 * No position-in-block term: chronik's block metadata carries height, hash and
 * timestamp and no index within the block, so the only way to order two records
 * mined together would be another paginated walk on the critical path. Txid
 * decides instead — arbitrary, but identical in every browser, which is the
 * property that matters.
 */
export function compareManifestRank(a: ManifestRank, b: ManifestRank): number {
    const ah = a.height ?? -1;
    const bh = b.height ?? -1;
    if (ah !== bh) {
        return ah - bh;
    }
    return a.txid < b.txid ? -1 : a.txid > b.txid ? 1 : 0;
}

/**
 * Unconfirmed records do not compete at all.
 *
 * Two browsers reading different nodes see different mempools, so letting an
 * unconfirmed record win means one link renders two different stalls — the
 * exact failure this ordering exists to prevent. A freshly published manifest
 * is therefore invisible until it is mined, which costs minutes and buys the
 * only guarantee worth having here.
 */
export function pickManifestWinner<T extends ManifestRank>(records: T[]): T | undefined {
    const mined = records.filter((record) => record.height !== undefined);
    if (mined.length === 0) {
        return undefined;
    }
    return mined.reduce((best, cur) => (compareManifestRank(cur, best) > 0 ? cur : best));
}
