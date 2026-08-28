import { toHex } from 'ecash-lib';
import { decodeTheme, THEME_ID_BYTES, type DecodedTheme } from './theme';

export const STL1_ASCII = 'STL1';
export const STL1_HEX = '53544c31';
export const MAX_STALL_NAME = 32;

export type StallManifest = {
    name: string;
    theme: DecodedTheme;
    /**
     * Fields beyond the three required pushes, keyed by their own tag byte.
     * Nothing reads this yet; it exists so the first field ever added is found
     * by its tag rather than by sitting at push index 3.
     */
    extras: ReadonlyMap<number, Uint8Array>;
};

export class ManifestDecodeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ManifestDecodeError';
    }
}

/**
 * STL1 payload after OP_RETURN: push "STL1", push utf-8 name (1-32 bytes), push
 * a one-byte theme id. **Pushes beyond those three are ignored, never
 * rejected** — that is what lets a field be added later without every published
 * record becoming unreadable, and it is settled before the first STL1 is mined
 * because after that every reader is pinned.
 */

/**
 * True when an OP_RETURN claims to be ours. Checked before anything else, so a
 * record we cannot read can be told apart from one that was never addressed to
 * us — a stall memo and a broken manifest must not look the same.
 *
 * Deliberately says nothing about how many pushes follow: tightening it to
 * exactly three would make a record with an extra field read as somebody's
 * memo while the decoder below happily accepts it.
 */
export function isStl1(pushes: Uint8Array[]): boolean {
    const lokad = pushes[0];
    return (
        lokad !== undefined &&
        lokad.length === 4 &&
        String.fromCharCode(...lokad) === STL1_ASCII
    );
}

/**
 * One extra push is one field: byte 0 is the tag, the rest is the payload.
 *
 * Never a push for the tag and another for the payload — skipping an unknown
 * tag would then read its payload as the next tag, and every later field would
 * land on whatever the skip left behind.
 *
 * A push with no bytes carries no tag, so it is skipped rather than treated as
 * tag 0. A tag that appears twice keeps the first: last-wins would let a
 * trailing push silently overrule the one before it.
 */
function decodeExtras(pushes: Uint8Array[]): ReadonlyMap<number, Uint8Array> {
    const extras = new Map<number, Uint8Array>();
    for (let i = REQUIRED_PUSHES; i < pushes.length; i++) {
        const push = pushes[i]!;
        if (push.length < 1) {
            continue;
        }
        const tag = push[0]!;
        if (extras.has(tag)) {
            continue;
        }
        extras.set(tag, push.slice(1));
    }
    return extras;
}

/** LOKAD, name, theme id. Everything after these is a tagged field. */
const REQUIRED_PUSHES = 3;

export function decodeManifestPushes(pushes: Uint8Array[]): StallManifest {
    if (!isStl1(pushes)) {
        throw new ManifestDecodeError('LOKAD is not STL1');
    }
    if (pushes.length < REQUIRED_PUSHES) {
        throw new ManifestDecodeError(
            `STL1 needs ${REQUIRED_PUSHES} pushes, got ${pushes.length}`,
        );
    }
    const nameBytes = pushes[1]!;
    const themeBytes = pushes[2]!;
    if (nameBytes.length < 1 || nameBytes.length > MAX_STALL_NAME) {
        throw new ManifestDecodeError('stall name length');
    }
    const name = new TextDecoder('utf-8', { fatal: true }).decode(nameBytes);
    // A 28-byte push is the old wire. Accepting it would read its first byte as
    // an id and silently drop the rest, which is a look nobody chose.
    if (themeBytes.length !== THEME_ID_BYTES) {
        throw new ManifestDecodeError('theme id is not one byte');
    }
    return {
        name,
        theme: decodeTheme(themeBytes[0]!),
        extras: decodeExtras(pushes),
    };
}

/**
 * Direct push: opcode = length, then the bytes. Not `pushBytesOp` — a
 * one-byte value 1–16 becomes OP_1…OP_16, which Stall's OP_RETURN reader
 * drops, so a published Modern record would read as unpublished. Empty is
 * never passed here; opcode 0 is a one-byte stack add, not an empty push.
 * Tests: `shipped-theme-id-is-a-one-byte-push`, `theme-zero-is-a-one-byte-push`.
 */
/**
 * The largest payload a direct push can carry. Above it the length no longer
 * fits in the opcode byte and `OP_PUSHDATA1` must carry it separately.
 */
const MAX_DIRECT_PUSH = 75;
const OP_PUSHDATA1 = 0x4c;
/** `OP_PUSHDATA1` carries one length byte, so this is its ceiling. */
export const MAX_PUSH_BYTES = 255;

/**
 * One data push.
 *
 * Writing the length into the opcode byte is only valid up to 75. At 76 that
 * byte *is* `OP_PUSHDATA1` — with no length after it, so the reader takes the
 * first byte of the payload as the length and the whole output decodes as
 * something else. §5 names that failure exactly: the record reads as never
 * published rather than as unreadable, which is the worse of the two.
 *
 * Unreachable while the only payloads were a 4-byte lokad, a 32-byte name and
 * a one-byte theme id. A description is not one of those.
 */
/** One data push, shared with the other record types this app writes. */
export function encodePush(data: Uint8Array): Uint8Array {
    return scriptPush(data);
}

function scriptPush(data: Uint8Array): Uint8Array {
    if (data.length <= MAX_DIRECT_PUSH) {
        const out = new Uint8Array(1 + data.length);
        out[0] = data.length;
        out.set(data, 1);
        return out;
    }
    const out = new Uint8Array(2 + data.length);
    out[0] = OP_PUSHDATA1;
    out[1] = data.length;
    out.set(data, 2);
    return out;
}

function concatBytes(parts: readonly Uint8Array[]): Uint8Array {
    let n = 0;
    for (const part of parts) {
        n += part.length;
    }
    const out = new Uint8Array(n);
    let i = 0;
    for (const part of parts) {
        out.set(part, i);
        i += part.length;
    }
    return out;
}

/**
 * Cashtab `op_return_raw` payload: the three pushes `decodeManifestPushes`
 * reads, as lowercase hex, without a leading `6a`. Cashtab prepends
 * OP_RETURN and rejects a payload that starts with it. Undefined when the
 * input cannot make a valid record.
 */
export function encodeManifestHex(name: string, themeId: number): string | undefined {
    if (typeof name !== 'string') {
        return undefined;
    }
    if (!Number.isInteger(themeId) || themeId < 0 || themeId > 255) {
        return undefined;
    }
    const nameBytes = new TextEncoder().encode(name);
    if (nameBytes.length < 1 || nameBytes.length > MAX_STALL_NAME) {
        return undefined;
    }
    const lokad = Uint8Array.from(STL1_ASCII, (c) => c.charCodeAt(0));
    const themeBytes = new Uint8Array(THEME_ID_BYTES);
    themeBytes[0] = themeId;
    return toHex(
        concatBytes([scriptPush(lokad), scriptPush(nameBytes), scriptPush(themeBytes)]),
    );
}

export type ManifestRank = {
    height: number | undefined;
    /** Avalanche pre-consensus finality, as chronik reports it on the tx. */
    isFinal: boolean;
    txid: string;
};

/** Ranks above every real block height, because it is newer than all of them. */
const FINALIZED_UNMINED = Number.MAX_SAFE_INTEGER;

/**
 * Finalized-and-unmined first, then highest block, then txid.
 *
 * A finalized record that has no block yet is newer than anything with one, so
 * it sorts above every height rather than below them — see `pickManifestWinner`
 * for why finality is the stronger signal.
 *
 * No position-in-block term: chronik's block metadata carries height, hash and
 * timestamp and no index within the block, so the only way to order two records
 * mined together would be another paginated walk on the critical path. Txid
 * decides instead — arbitrary, but identical in every browser, which is the
 * property that matters, and it is the same tiebreak two finalized-unmined
 * records get.
 */
export function compareManifestRank(a: ManifestRank, b: ManifestRank): number {
    const ah = rankHeight(a);
    const bh = rankHeight(b);
    if (ah !== bh) {
        return ah - bh;
    }
    return a.txid < b.txid ? -1 : a.txid > b.txid ? 1 : 0;
}

function rankHeight(record: ManifestRank): number {
    if (record.height !== undefined) {
        return record.height;
    }
    return record.isFinal ? FINALIZED_UNMINED : -1;
}

/**
 * A record competes once the network has agreed it exists — finalized by
 * avalanche, or mined. Everything else is one node's opinion.
 *
 * Finality outranks height rather than merely joining it. Mining is not the
 * durable signal it looks like: chronik reports `BLK_DISCONNECTED` and
 * `BLK_INVALIDATED` for a block that avalanche has not finalized, and its
 * transactions go back to the mempool. Trusting a height while refusing
 * `isFinal` accepts the weaker guarantee and turns down the stronger one.
 *
 * So a finalized record that is not yet mined is the newest thing that exists,
 * and it wins. Two of them tie on txid, exactly as two records in one block
 * already do, because chronik exposes no order within a block either.
 *
 * What still does not compete: unfinalized and unmined. Two browsers reading
 * different nodes see different mempools, and letting that decide means one
 * link renders two stalls.
 *
 * The cost this removes is real: a seller used to wait a block to see their own
 * settings. The cost it keeps is that `isFinal` is an indexer's word, not a
 * consensus proof read from Bitcoin ABC — which is not in this tree.
 */
export function pickManifestWinner<T extends ManifestRank>(records: T[]): T | undefined {
    const settled = records.filter(
        (record) => record.height !== undefined || record.isFinal,
    );
    if (settled.length === 0) {
        return undefined;
    }
    return settled.reduce((best, cur) => (compareManifestRank(cur, best) > 0 ? cur : best));
}
