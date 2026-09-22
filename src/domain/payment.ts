import { toHex } from 'ecash-lib';
import { OP_RETURN_BUDGET, decodeTaggedExtras, encodePush } from './manifest';

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
 * **A second shape, for one payment covering several quotes** (2026-09-22,
 * PLAN § D; three LOKADs and never a fourth, so a new kind of record is a
 * new shape under one of them):
 *
 *     push "STLP" | push 0x00 (one byte) | push <entries>
 *
 * Push 1 is the marker and nothing else. That is the whole of the
 * compatibility story: `decodePaymentPushes` has always refused a push 1
 * that is not exactly 32 bytes, so **every un-updated reader refuses this
 * record outright** and makes no claim at all — which is the honest failure,
 * not a wrong one. The marker is its own push rather than the list's first
 * byte (the design had it inline): entries vary in width, so an inline
 * marker puts the list one byte from 32 and an ordinary five-item basket
 * with one count past 255 lands exactly there — an old reader would then
 * read a garbage token id as a single-item claim, and the pad rule that
 * would be needed is a canonical-form branch on the money path. One byte
 * buys its absence.
 *
 * An entry is **four bytes of token id · one byte `n` (1–8) · `n` bytes of
 * quantity**, unsigned big-endian, minimal, at least one. The list must be
 * exactly consumed by whole entries; a bad `n`, a leading zero, a zero
 * quantity, a duplicate prefix, an empty list, a trailing byte or more than
 * `MAX_MEMO_ITEMS` entries voids the memo, which then reads as no memo at
 * all rather than as a partial claim.
 *
 * **Entry order is free**, and that is not a contradiction of the quantity's
 * "canonical or nothing": a quantity's two encodings say one thing twice,
 * where an order is what the buyer chose. **Pushes after the list are
 * ignored, never rejected** — `STL1`'s own rule, settled here before the
 * first record exists, so a field added later does not make every record on
 * chain unreadable.
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
 * Push 1 in the second shape: one byte, `0x00`. **Not a tag number** — `0x01`
 * is the quantity in this same LOKAD's grammar, and a marker that collided
 * with one would be a number meaning two things in one record.
 */
export const MULTI_MARKER = 0x00;

/**
 * How much of a token id an entry names. **Frozen here and never the route's
 * `PAY_PARAM_PREFIX`**, which is a link's display width this app may change
 * on any deploy: a permanent record whose meaning moved with a URL decision
 * would be a different claim after an unrelated release (§5's own lesson
 * about the exponent and `fiatFractionDigits`). Four bytes is 32 bits, which
 * cannot collide in practice inside one stall's own quotes, and an entry a
 * reader cannot resolve prints its eight hex rather than guessing.
 */
export const MEMO_PREFIX_BYTES = 4;

/**
 * The most entries a reader accepts. **Its own number, never
 * `MAX_SELECTION_ENTRIES`**: that one is a UI ceiling this app may move, and
 * a record on chain must not become unreadable after an unrelated release.
 * The byte budget already caps a well-formed record at 35 (`9 + 6 × 35 =
 * 219` of 222 at one-byte quantities), so this is a belt over braces.
 */
export const MAX_MEMO_ITEMS = 35;

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

/** One entry of the second shape: four bytes of id, and a count. */
export type PaymentMemoItem = {
    /** The first `MEMO_PREFIX_BYTES` of a token id. Eight lowercase hex. */
    readonly prefix: string;
    /** Whole items claimed. Always a number here: a bad one voids the memo. */
    readonly quantity: bigint;
};

/**
 * One payer's claim about one payment. Nothing here is verified.
 *
 * **A union, so no reader can print a list as if it named one item.** The
 * two shapes carry different things and the type says so rather than leaving
 * `tokenId` optional, which every existing caller would have kept reading.
 */
export type PaymentMemo =
    | {
          readonly kind: 'item';
          /** The item the payer says they were buying. Lowercase hex, 64. */
          readonly tokenId: string;
          /**
           * Whole items claimed. Absent when the field was written and could
           * not be read — "not stated", never one.
           */
          readonly quantity?: bigint;
      }
    | {
          readonly kind: 'items';
          /** At least one, in the order the payer wrote them. */
          readonly items: readonly PaymentMemoItem[];
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
    const head = pushes[1]!;
    if (head.length === 1 && head[0] === MULTI_MARKER) {
        return readItems(pushes[2]);
    }
    if (head.length !== TOKEN_ID_BYTES) {
        return undefined;
    }
    const extras = decodeTaggedExtras(pushes, PAYMENT_REQUIRED_PUSHES);
    const stated = extras.get(QUANTITY_TAG);
    const quantity = stated === undefined ? 1n : readQuantity(stated);
    return {
        kind: 'item',
        tokenId: toHex(head),
        ...(quantity === undefined ? {} : { quantity }),
    };
}

/**
 * The list push of the second shape, or `undefined` for the whole memo.
 *
 * **Exactly consumed, or nothing.** A record that is one byte short of a
 * whole entry is not a shorter claim, it is a record this reader cannot
 * read — and half a list beside an amount somebody paid is worse than no
 * list at all. An empty list is not a memo either: a claim naming nothing
 * would paint the payer's-claim label over an empty line.
 */
function readItems(list: Uint8Array | undefined): PaymentMemo | undefined {
    if (list === undefined || list.length === 0) {
        return undefined;
    }
    const items: PaymentMemoItem[] = [];
    const seen = new Set<string>();
    let i = 0;
    while (i < list.length) {
        const rest = list.length - i;
        if (rest < MEMO_PREFIX_BYTES + 2) {
            return undefined;
        }
        const prefix = toHex(list.subarray(i, i + MEMO_PREFIX_BYTES));
        i += MEMO_PREFIX_BYTES;
        const width = list[i]!;
        i += 1;
        if (width < 1 || width > MAX_QUANTITY_BYTES || i + width > list.length) {
            return undefined;
        }
        const quantity = readQuantity(list.subarray(i, i + width));
        i += width;
        if (quantity === undefined || seen.has(prefix)) {
            return undefined;
        }
        seen.add(prefix);
        items.push({ prefix, quantity });
        if (items.length > MAX_MEMO_ITEMS) {
            return undefined;
        }
    }
    return { kind: 'items', items };
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

/**
 * The `op_return_raw` payload for the second shape: one payment naming
 * several quoted items. `undefined` when the list cannot be represented, so
 * a caller never hands a wallet a memo this app could not read back — and
 * the caller's own job when that happens is to compose the payment **with no
 * memo**, never to refuse the payment.
 *
 * Refused: fewer than two items (one item is the shape that already exists
 * and every un-updated reader understands — compose that instead), more than
 * `MAX_MEMO_ITEMS`, a token id that is not 64 lowercase hex, two ids sharing
 * a four-byte prefix, a quantity outside 1…2^64-1, and **a record over
 * `OP_RETURN_BUDGET`**, which is the authority: an entry grows with its own
 * count, so 35 items fit only while every count is under 256.
 */
export function encodeMultiPaymentMemoHex(
    items: readonly { readonly tokenId: string; readonly quantity: bigint }[],
): string | undefined {
    if (!Array.isArray(items) || items.length < 2 || items.length > MAX_MEMO_ITEMS) {
        return undefined;
    }
    const parts: Uint8Array[] = [];
    const seen = new Set<string>();
    for (const item of items) {
        const id = item?.tokenId;
        if (typeof id !== 'string' || !TOKEN_ID_RE.test(id)) {
            return undefined;
        }
        const quantity = item.quantity;
        // `typeof`, not a comparison: a `Number` would compare fine here and
        // lose the low bits of an eight-byte count on the way to the wire.
        if (typeof quantity !== 'bigint' || quantity < 1n || quantity > MAX_QUANTITY) {
            return undefined;
        }
        const prefix = id.slice(0, MEMO_PREFIX_BYTES * 2);
        if (seen.has(prefix)) {
            return undefined;
        }
        seen.add(prefix);
        const digits = minimalBytes(quantity);
        parts.push(
            Uint8Array.from([
                ...hexBytes(prefix),
                digits.length,
                ...digits,
            ]),
        );
    }
    const record = concat([
        encodePush(lokadBytes()),
        encodePush(Uint8Array.from([MULTI_MARKER])),
        encodePush(concat(parts)),
    ]);
    if (record.length > OP_RETURN_BUDGET) {
        return undefined;
    }
    const hex = toHex(record);
    // Decode back before answering, the describe encoder's own guard: what a
    // wallet is handed has to be what this app reads on the way in.
    const back = decodePaymentPushes([lokadBytes(), Uint8Array.from([MULTI_MARKER]), concat(parts)]);
    if (back === undefined || back.kind !== 'items' || back.items.length !== items.length) {
        return undefined;
    }
    return hex;
}

/** The tag and the minimal big-endian bytes of the number under it. */
function quantityField(quantity: bigint): Uint8Array {
    return Uint8Array.from([QUANTITY_TAG, ...minimalBytes(quantity)]);
}

/** Unsigned big-endian, no leading zero, at least one byte. */
function minimalBytes(value: bigint): number[] {
    const digits: number[] = [];
    let rest = value;
    while (rest > 0n) {
        digits.unshift(Number(rest & 0xffn));
        rest >>= 8n;
    }
    return digits;
}

function hexBytes(hex: string): number[] {
    const out: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
        out.push(Number.parseInt(hex.slice(i, i + 2), 16));
    }
    return out;
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
