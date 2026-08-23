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
export function decodeManifestPushes(pushes: Uint8Array[]): StallManifest {
    if (pushes.length !== 3) {
        throw new ManifestDecodeError(`STL1 expects 3 pushes, got ${pushes.length}`);
    }
    const lokad = pushes[0]!;
    const nameBytes = pushes[1]!;
    const themeBytes = pushes[2]!;
    if (lokad.length !== 4 || String.fromCharCode(...lokad) !== STL1_ASCII) {
        throw new ManifestDecodeError('LOKAD is not STL1');
    }
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
    blockPos: number | undefined;
    txid: string;
};

/** Highest block, then position in block, then txid. Mempool (no height) ranks above any mined tx. */
export function compareManifestRank(a: ManifestRank, b: ManifestRank): number {
    const ah = a.height ?? Number.MAX_SAFE_INTEGER;
    const bh = b.height ?? Number.MAX_SAFE_INTEGER;
    if (ah !== bh) {
        return ah - bh;
    }
    const ap = a.blockPos ?? Number.MAX_SAFE_INTEGER;
    const bp = b.blockPos ?? Number.MAX_SAFE_INTEGER;
    if (ap !== bp) {
        return ap - bp;
    }
    return a.txid < b.txid ? -1 : a.txid > b.txid ? 1 : 0;
}

export function pickManifestWinner<T extends ManifestRank>(records: T[]): T | undefined {
    if (records.length === 0) {
        return undefined;
    }
    return records.reduce((best, cur) =>
        compareManifestRank(cur, best) > 0 ? cur : best,
    );
}
