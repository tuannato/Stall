import { toHex } from 'ecash-lib';
import { decodeTaggedExtras, encodePush } from './manifest';

/**
 * What a buyer's wallet writes when it pays a seller directly. LOKAD `STLP`.
 *
 * **The memo is payer-authored, and it is a claim.** Nothing about it is
 * verified: not the signature, not the item, not the quantity. The satoshis
 * that arrived at the seller's address are the only fact the chain proves, so
 * every screen that shows a memo says whose words they are. That is why the
 * record carries **no amount, no rate and no currency** — a `$500` in a memo
 * over five sats of dust would otherwise paint a $500 receipt on a stall the
 * payer does not own.
 *
 * Wire, mirroring `STL1` and `STLD`:
 *
 *     push "STLP" | push tokenId (32 bytes) | tagged fields
 *
 * Same tag grammar as those two: one push per field, the first byte is the
 * tag, an empty push carries none and is skipped, a repeated tag keeps the
 * first, and a malformed payload voids **that field alone**.
 *
 * **The three registries are separate.** A tag number means nothing across
 * LOKADs: `STL1`'s `0x03` is burned, `STLD`'s `0x03` is the seller's
 * tolerance, and `0x01` here is the quantity. Reading one table against
 * another record is how a reader invents a field nobody wrote.
 */
export const STLP_ASCII = 'STLP';
export const STLP_HEX = '53544c50';

/**
 * The lokad and the token id. **Its own count**, deliberately not `STL1`'s
 * three: everything after these two is a tagged field, so a memo carrying no
 * quantity is a complete record rather than a short one.
 */
export const PAYMENT_REQUIRED_PUSHES = 2;

/**
 * Tag 0x01: how many whole items the payer says this covers.
 *
 * Unsigned big-endian, **minimal** — no leading zero byte, at least one byte,
 * at most eight, and never zero. Canonical or nothing: two encodings of one
 * number are two records that say the same thing, and accepting both lets a
 * payer pick which one a later index files them under.
 *
 * **Absent means one.** A field that is present and malformed means the
 * quantity is *not stated*, which a screen prints as words and never as a
 * number: guessing one there would put a figure nobody wrote beside a figure
 * somebody paid.
 */
export const QUANTITY_TAG = 0x01;

/** Eight unsigned bytes, the same ceiling the price field's amount has. */
export const MAX_QUANTITY_BYTES = 8;

const MAX_QUANTITY = (1n << 64n) - 1n;
const TOKEN_ID_BYTES = 32;
const TOKEN_ID_RE = /^[0-9a-f]{64}$/;

/** One payer's claim about one payment. Nothing here is verified. */
export type PaymentMemo = {
    /** The item the payer says they were buying. Lowercase hex. */
    readonly tokenId: string;
    /**
     * Whole items claimed. Absent when the field was written and could not be
     * read — "not stated", never one.
     */
    readonly quantity?: bigint;
};

/** True when an OP_RETURN claims to be a payment memo of ours. */
export function isStlp(pushes: Uint8Array[]): boolean {
    const first = pushes[0];
    if (first === undefined || first.length !== STLP_ASCII.length) {
        return false;
    }
    for (let i = 0; i < STLP_ASCII.length; i += 1) {
        if (first[i] !== STLP_ASCII.charCodeAt(i)) {
            return false;
        }
    }
    return true;
}

/**
 * Decode one memo, or `undefined` when it is not a readable one. Never throws:
 * a stranger's malformed memo must not take an Activity list down.
 */
export function decodePaymentPushes(pushes: Uint8Array[]): PaymentMemo | undefined {
    if (pushes.length < PAYMENT_REQUIRED_PUSHES || !isStlp(pushes)) {
        return undefined;
    }
    const idBytes = pushes[1]!;
    if (idBytes.length !== TOKEN_ID_BYTES) {
        return undefined;
    }
    const extras = decodeTaggedExtras(pushes, PAYMENT_REQUIRED_PUSHES);
    const stated = extras.get(QUANTITY_TAG);
    const quantity = stated === undefined ? 1n : readQuantity(stated);
    return {
        tokenId: toHex(idBytes),
        ...(quantity === undefined ? {} : { quantity }),
    };
}

/**
 * The payload under the tag: minimal unsigned big-endian, 1–8 bytes, ≥ 1.
 * Assembled as a `bigint` — eight bytes overflow a double, the same rule the
 * price field's amount keeps.
 */
function readQuantity(payload: Uint8Array): bigint | undefined {
    if (payload.length < 1 || payload.length > MAX_QUANTITY_BYTES) {
        return undefined;
    }
    if (payload[0] === 0) {
        return undefined;
    }
    let value = 0n;
    for (const byte of payload) {
        value = (value << 8n) | BigInt(byte);
    }
    return value >= 1n ? value : undefined;
}

/**
 * The `op_return_raw` payload for a memo — these pushes without the `6a`
 * Cashtab prepends. `undefined` when the input cannot be represented, so a
 * caller never hands a wallet a memo this app could not read back.
 *
 * The quantity field is **omitted at one**, because absent already means one
 * and a byte spent restating the default is a byte the shared budget does not
 * get back.
 */
export function encodePaymentMemoHex(
    tokenId: string,
    quantity: bigint,
): string | undefined {
    if (typeof tokenId !== 'string' || !TOKEN_ID_RE.test(tokenId)) {
        return undefined;
    }
    // `typeof`, not a comparison: a `Number` would compare fine here and lose
    // the low bits of an eight-byte quantity on the way to the wire.
    if (typeof quantity !== 'bigint' || quantity < 1n || quantity > MAX_QUANTITY) {
        return undefined;
    }
    const pushes = [lokadBytes(), idBytes(tokenId)];
    if (quantity > 1n) {
        pushes.push(quantityField(quantity));
    }
    const record = concat(pushes.map((push) => encodePush(push)));
    return toHex(record);
}

/** The tag and the minimal big-endian bytes of the number under it. */
function quantityField(quantity: bigint): Uint8Array {
    const digits: number[] = [];
    let rest = quantity;
    while (rest > 0n) {
        digits.unshift(Number(rest & 0xffn));
        rest >>= 8n;
    }
    return Uint8Array.from([QUANTITY_TAG, ...digits]);
}

function lokadBytes(): Uint8Array {
    return Uint8Array.from(STLP_ASCII, (c) => c.charCodeAt(0));
}

function idBytes(tokenId: string): Uint8Array {
    const out = new Uint8Array(TOKEN_ID_BYTES);
    for (let i = 0; i < TOKEN_ID_BYTES; i += 1) {
        out[i] = Number.parseInt(tokenId.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
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
