import {
    decodeTaggedExtras,
    encodePush,
    OP_RETURN_BUDGET,
    readTaggedText,
} from './manifest';
import { isLegibleText } from './text';
import { toHex } from 'ecash-lib';

/**
 * A seller's own words about one token they list. LOKAD `STLD`.
 *
 * **Why not a field in `STL1`.** Measured: at the maximum 32-byte stall name the
 * settings record is 40 bytes, leaving 182 of Cashtab's 222. A field that says
 * which token it describes must carry the 32-byte token id, so one 40-character
 * description costs 75 bytes and **two** is the ceiling. Shortening the id does
 * not rescue it — the binding constraint is that a whole transaction holds
 * about 200 bytes, and a shop with twenty tokens needs thousands. And a second
 * `STL1` output cannot help either: §5 is explicit that it is not a longer
 * document.
 *
 * **Why a second LOKAD is cheap.** Chronik indexes lokad ids generically —
 * `parse_lokad_id_pushop_prefix` takes any four-byte first push and there is no
 * allowlist, no registry and no per-protocol code — so the index for `STLD`
 * exists the moment the first record is broadcast, with no work by anyone
 * running a node. Unlike `agora`, which is a plugin and must be installed (§4).
 *
 * **One transaction, one complete document.** §5 forbids a document spread over
 * several transactions because it cannot know it has been read completely. Each
 * record here is the whole truth about exactly one token, so reading one is
 * reading all of it. Many records is many documents, not one long one.
 *
 * Wire, mirroring `STL1`:
 *
 *     push "STLD" | push tokenId (32 bytes) | push utf-8 text
 *
 * Everything after those three is a tagged field, as in §5: first byte is the
 * tag, an empty push carries none and is skipped, a repeated tag keeps the
 * first. Nothing reads them yet; the grammar is the insurance against a flag
 * day, which is why it is settled before the first record exists.
 */
export const STLD_ASCII = 'STLD';
export const STLD_HEX = '53544c44';

/**
 * The cap is in **bytes, not characters**. A Vietnamese or CJK description
 * spends two or three bytes per character, so promising a number of characters
 * would be promising something the wire does not measure. 180 leaves room for
 * the lokad, the id and their push bytes inside Cashtab's 222.
 */
export const MAX_DESCRIPTION_BYTES = 180;

/*
 * The tag registry for STLD extras, allocated the day its screen ships, like
 * STL1's (PLAN-REDESIGN §2).
 */
export const SHELF_TAG = 0x01;

/**
 * A shelf is a heading, so it is capped like the stall name — and then the
 * shared 222-byte record budget binds again on top: at a 180-byte
 * description no shelf fits at all, at 179 exactly one byte of shelf does.
 * The encoder refuses the overflow; the editor shows one meter for both
 * fields, because two meters would promise two budgets where there is one.
 */
export const MAX_SHELF_BYTES = 32;

/**
 * Tag 0x02: what the seller asks for **one whole token**, in a unit they name.
 *
 * Frozen shape, and every part of it is load-bearing on a wire nobody can
 * amend: **one push of exactly thirteen bytes** — the tag, three ASCII letters
 * of code, one exponent byte, then eight bytes of unsigned big-endian amount.
 * Twelve bytes of payload under the tag, which is what `decodeTaggedExtras`
 * hands the reader. Any other length, an exponent above 8, or an amount of
 * zero voids **this field alone**, never the record.
 *
 * **The exponent is in the record, not in a table.** `fiatFractionDigits` is a
 * display convention this app may change on any deploy — it already prints
 * `bhd` at two digits where the currency has three — and a record whose meaning
 * moved with it would be a different price after an unrelated release.
 *
 * **The amount is a `bigint`, always.** Eight bytes overflow a double at 2^53,
 * and §8's rule about never running `Number()` over satoshis is the same rule.
 *
 * **Zero is not a price.** It is the absence of one; painting it would say a
 * seller gives a token away.
 *
 * `xec` is reserved: the chain's own unit, `amount × 10^-exponent` XEC, with no
 * rate anywhere in it. Everything else is a currency code. This app writes
 * `usd` and `xec`; any other code is decoded — a record is permanent and a
 * later version will paint more of them — but never painted and never
 * mentioned, and the editor carries it forward untouched rather than dropping a
 * field it cannot read back.
 */
export const PRICE_TAG = 0x02;

/** Tag + three code bytes + one exponent byte + eight amount bytes. */
export const PRICE_FIELD_BYTES = 13;

/**
 * Tag 0x03: the shortfall the seller accepts on this quote, as a percentage.
 *
 * **One-sided and timeless.** It says a payment still counts as paid in full
 * when it lands within this margin *below* the quote; overpayment always
 * covers, and there is no window — a rate moves between the glance and the
 * signature, and the seller checks whenever they look.
 *
 * One byte, read 1–100. Zero is unsayable on purpose: an absent field already
 * means the seller stated nothing, and a reader that turned a missing byte
 * into a number would print the app's policy as the seller's promise.
 *
 * **It rides the price entry, and is carried whatever the code says.** An
 * `xec` quote involves no rate, so nothing paints a margin beside one — but a
 * field this app does not edit is not a field it may erase, so a record that
 * carries one keeps it through every republish.
 */
export const TOLERANCE_TAG = 0x03;

/** Tag plus the one byte under it. */
export const TOLERANCE_FIELD_BYTES = 2;

const MAX_TOLERANCE_PCT = 100;

/** A bound on the fractional digits a reader prints, not on the range. */
export const MAX_PRICE_EXPONENT = 8;

/** Eight unsigned bytes. */
const MAX_PRICE_AMOUNT = (1n << 64n) - 1n;

/** The chain's own unit. Not a currency, and never converted. */
export const XEC_PRICE_CODE = 'xec';

const PRICE_CODE_BYTES = 3;

/**
 * What the seller asks for one whole token. Quantity is whole tokens: a
 * fractional quantity has no price here, and nothing pretends otherwise.
 */
export type TokenPrice = {
    /** Three lowercase ASCII letters. `xec` is the chain's own unit. */
    readonly code: string;
    /** 0–8. `amount × 10^-exponent` is the figure. */
    readonly exponent: number;
    /** Minor units, `>= 1`. Never a `Number`. */
    readonly amount: bigint;
    /**
     * Tag 0x03: the shortfall this seller accepts, 1–100. **Absent is "none
     * stated"**, never a number — the reader has no default, because a default
     * here would be this app's policy wearing the seller's signature.
     */
    readonly tolerancePct?: number;
};

const TOKEN_ID_BYTES = 32;
const REQUIRED_PUSHES = 3;

/*
 * The maxima the editor's ladder names, and the arithmetic behind them, so a
 * number in a sentence on screen has a derivation somebody can check.
 *
 * The record is `push("STLD")` 5 + `push(tokenId)` 33 = 38 bytes before the
 * text, against `OP_RETURN_BUDGET` 222. The price field costs
 * `PRICE_FIELD_BYTES + 1` = 14 with its push byte; a full 32-byte shelf costs
 * 34. Above 75 bytes a text push costs its length plus two.
 */
const RECORD_HEAD_BYTES = 38;
const PRICE_PUSH_BYTES = PRICE_FIELD_BYTES + 1;
const TOLERANCE_PUSH_BYTES = TOLERANCE_FIELD_BYTES + 1;
const FULL_SHELF_PUSH_BYTES = 1 + 1 + MAX_SHELF_BYTES;
const LONG_TEXT_PUSH_OVERHEAD = 2;

/** Words that still fit beside a price: 222 − 38 − 14 − 2. */
export const MAX_PRICED_DESCRIPTION_BYTES =
    OP_RETURN_BUDGET - RECORD_HEAD_BYTES - PRICE_PUSH_BYTES - LONG_TEXT_PUSH_OVERHEAD;

/** Words that still fit beside a price and a full shelf: that, minus 34. */
export const MAX_PRICED_SHELVED_DESCRIPTION_BYTES =
    MAX_PRICED_DESCRIPTION_BYTES - FULL_SHELF_PUSH_BYTES;

/** With a tolerance byte riding the price as well: that, minus three. */
export const MAX_TOLERANCE_DESCRIPTION_BYTES =
    MAX_PRICED_DESCRIPTION_BYTES - TOLERANCE_PUSH_BYTES;

/** And with a full shelf on top of both. */
export const MAX_TOLERANCE_SHELVED_DESCRIPTION_BYTES =
    MAX_PRICED_SHELVED_DESCRIPTION_BYTES - TOLERANCE_PUSH_BYTES;

/**
 * A record says one of two things: here are the words, or take them away.
 *
 * These must never collapse into one "no description" answer. A tombstone is
 * the seller's instruction and **wins**, erasing an older record; a record we
 * could not read is our failure and **must not win**, or an undecodable byte
 * would silently delete a description the seller published. That is the
 * empty/unreachable mistake of §4, moved to the wire.
 */
export type TokenDescription =
    | {
          readonly kind: 'text';
          readonly tokenId: string;
          readonly text: string;
          readonly shelf?: string;
          readonly price?: TokenPrice;
      }
    | {
          readonly kind: 'tombstone';
          readonly tokenId: string;
          readonly shelf?: string;
          readonly price?: TokenPrice;
      };

export function isStld(pushes: Uint8Array[]): boolean {
    const first = pushes[0];
    if (first === undefined || first.length !== STLD_ASCII.length) {
        return false;
    }
    for (let i = 0; i < STLD_ASCII.length; i += 1) {
        if (first[i] !== STLD_ASCII.charCodeAt(i)) {
            return false;
        }
    }
    return true;
}

/**
 * Decode one record, or `undefined` when it is not a readable one. Never
 * throws: a malformed record must not take a stall down, exactly as a bad theme
 * byte must not.
 *
 * The text is decoded with `fatal: true` — invalid utf-8 is a record we cannot
 * read, not one we render as replacement characters and attribute to a seller.
 */
export function decodeDescriptionPushes(
    pushes: Uint8Array[],
): TokenDescription | undefined {
    if (pushes.length < REQUIRED_PUSHES || !isStld(pushes)) {
        return undefined;
    }
    const idBytes = pushes[1]!;
    const textBytes = pushes[2]!;
    if (idBytes.length !== TOKEN_ID_BYTES) {
        return undefined;
    }
    // The tagged extras, same grammar and same rules as STL1's (§5): first
    // byte is the tag, empty pushes are skipped, a repeated tag keeps the
    // first, a malformed payload under a known tag voids that field alone.
    const extras = decodeTaggedExtras(pushes, REQUIRED_PUSHES);
    const shelf = readShelf(extras.get(SHELF_TAG));
    // A price rides the same grammar and voids the same way: a payload that is
    // not twelve bytes under the tag, an exponent out of range or an amount of
    // zero costs this field and nothing else.
    // The tolerance rides the price rather than standing on its own: it is a
    // fact about the quote, so with no quote to qualify there is nothing a
    // reader could say about it and it goes nowhere.
    const price = withTolerance(
        readPrice(extras.get(PRICE_TAG)),
        readTolerance(extras.get(TOLERANCE_TAG)),
    );
    // A zero-length third push is the removal instruction, not a short record.
    // A shelf rides it unchanged: each record is the whole truth about one
    // token, so "no words, shelved" is one record, not a removal plus a
    // second document — which §5 forbids.
    if (textBytes.length === 0) {
        return {
            kind: 'tombstone',
            tokenId: toHex(idBytes),
            ...(shelf === undefined ? {} : { shelf }),
            ...(price === undefined ? {} : { price }),
        };
    }
    if (textBytes.length > MAX_DESCRIPTION_BYTES) {
        return undefined;
    }
    let text: string;
    try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(textBytes);
    } catch {
        return undefined;
    }
    if (!isLegibleText(text)) {
        return undefined;
    }
    // Control characters are not description: they are a way to make one line
    // look like several, or to hide the rest of a sentence from a reader.
    if (/[\u0000-\u001f\u007f\u2028\u2029]/.test(text)) {
        return undefined;
    }
    return {
        kind: 'text',
        tokenId: toHex(idBytes),
        text,
        ...(shelf === undefined ? {} : { shelf }),
        ...(price === undefined ? {} : { price }),
    };
}

/**
 * Tag 0x01: the seller's own heading over a run of their cards. Screened
 * exactly as the description text is — a heading is a better place to hide
 * a character than a sentence, not a worse one.
 */
function readShelf(payload: Uint8Array | undefined): string | undefined {
    const text = readTaggedText(payload, MAX_SHELF_BYTES);
    if (text === undefined || /[\u0000-\u001f\u007f\u2028\u2029]/.test(text)) {
        return undefined;
    }
    return text;
}

/**
 * Tag 0x02, the reading half. Twelve bytes under the tag or nothing: length,
 * exponent range and a non-zero amount are all checked before anything is
 * believed, because every one of them is a way to paint a figure nobody signed.
 *
 * The code is lowercased the way `readFiatHint` lowercases the STL1 hint, so
 * `USD` and `usd` are one code rather than two records that disagree.
 */
function readPrice(payload: Uint8Array | undefined): TokenPrice | undefined {
    if (payload === undefined || payload.length !== PRICE_FIELD_BYTES - 1) {
        return undefined;
    }
    let code = '';
    for (let i = 0; i < PRICE_CODE_BYTES; i += 1) {
        const lower = payload[i]! | 0x20;
        if (lower < 0x61 || lower > 0x7a) {
            return undefined;
        }
        code += String.fromCharCode(lower);
    }
    const exponent = payload[PRICE_CODE_BYTES]!;
    if (exponent > MAX_PRICE_EXPONENT) {
        return undefined;
    }
    // Big-endian, assembled as a bigint. Eight bytes overflow a double.
    let amount = 0n;
    for (let i = PRICE_CODE_BYTES + 1; i < payload.length; i += 1) {
        amount = (amount << 8n) | BigInt(payload[i]!);
    }
    if (amount < 1n) {
        return undefined;
    }
    return { code, exponent, amount };
}

/**
 * Tag 0x03, the reading half: exactly one byte, 1–100. Any other length, a
 * zero or a value above a hundred voids **this field alone** — the quote it
 * rides is untouched, the same way a malformed shelf costs only the shelf.
 */
function readTolerance(payload: Uint8Array | undefined): number | undefined {
    if (payload === undefined || payload.length !== TOLERANCE_FIELD_BYTES - 1) {
        return undefined;
    }
    const pct = payload[0]!;
    return pct >= 1 && pct <= MAX_TOLERANCE_PCT ? pct : undefined;
}

function withTolerance(
    price: TokenPrice | undefined,
    tolerancePct: number | undefined,
): TokenPrice | undefined {
    if (price === undefined || tolerancePct === undefined) {
        return price;
    }
    return { ...price, tolerancePct };
}

/** The same one byte, written. `undefined` when the value cannot be one. */
function toleranceField(tolerancePct: number): Uint8Array | undefined {
    if (
        !Number.isInteger(tolerancePct) ||
        tolerancePct < 1 ||
        tolerancePct > MAX_TOLERANCE_PCT
    ) {
        return undefined;
    }
    return Uint8Array.of(TOLERANCE_TAG, tolerancePct);
}

/** The same thirteen bytes, written. `undefined` when they cannot be. */
function priceField(price: TokenPrice): Uint8Array | undefined {
    if (!/^[a-z]{3}$/.test(price.code)) {
        return undefined;
    }
    if (
        !Number.isInteger(price.exponent) ||
        price.exponent < 0 ||
        price.exponent > MAX_PRICE_EXPONENT
    ) {
        return undefined;
    }
    // `typeof`, not a comparison: a `Number` here would compare fine and then
    // lose the low bits of an eight-byte amount on the way to the wire.
    if (typeof price.amount !== 'bigint' || price.amount < 1n || price.amount > MAX_PRICE_AMOUNT) {
        return undefined;
    }
    const out = new Uint8Array(PRICE_FIELD_BYTES);
    out[0] = PRICE_TAG;
    for (let i = 0; i < PRICE_CODE_BYTES; i += 1) {
        out[1 + i] = price.code.charCodeAt(i);
    }
    out[1 + PRICE_CODE_BYTES] = price.exponent;
    let rest = price.amount;
    for (let i = PRICE_FIELD_BYTES - 1; i > PRICE_CODE_BYTES + 1; i -= 1) {
        out[i] = Number(rest & 0xffn);
        rest >>= 8n;
    }
    return out;
}

/**
 * The figure a seller reads and types, from the record's own exponent. Plain
 * digits and no grouping: what this prints must go straight back into the
 * field it came from, and a thousands separator does not.
 */
export function formatPriceFigure(price: TokenPrice): string {
    const digits = price.amount.toString().padStart(price.exponent + 1, '0');
    if (price.exponent === 0) {
        return digits;
    }
    const cut = digits.length - price.exponent;
    return `${digits.slice(0, cut)}.${digits.slice(cut)}`;
}

/**
 * A typed figure into minor units, through the decimal text and never through
 * a float — the same reason `scaleRate` goes via `toFixed`. `undefined` for
 * anything the record cannot hold, including a figure that rounds to nothing:
 * below one minor unit there is no price, only a zero, and zero is not one.
 */
export function parsePriceFigure(
    figure: string,
    code: string,
    exponent: number,
): TokenPrice | undefined {
    if (typeof figure !== 'string' || !/^[a-z]{3}$/.test(code)) {
        return undefined;
    }
    if (!Number.isInteger(exponent) || exponent < 0 || exponent > MAX_PRICE_EXPONENT) {
        return undefined;
    }
    const text = figure.trim();
    if (!/^\d{1,20}(\.\d{0,8})?$/.test(text)) {
        return undefined;
    }
    const [whole = '', frac = ''] = text.split('.');
    if (frac.length > exponent) {
        return undefined;
    }
    let amount: bigint;
    try {
        amount = BigInt(`${whole}${frac.padEnd(exponent, '0')}`);
    } catch {
        return undefined;
    }
    if (amount < 1n || amount > MAX_PRICE_AMOUNT) {
        return undefined;
    }
    return { code, exponent, amount };
}

/*
 * The legibility screen lives in `./text` now — the stall name goes through
 * the same set, and two copies of what "legible" means is how they drift.
 */

export type DescriptionExtras = {
    /** Tag 0x01: the seller's own heading over this token's card. */
    shelf?: string;
    /** Tag 0x02: what one whole token costs, in the unit the record names. */
    price?: TokenPrice;
};

/**
 * The `op_return_raw` payload for a record — these pushes without the `6a`
 * Cashtab prepends. `undefined` when the input cannot be represented, so a
 * caller never hands a wallet a record this app could not read back.
 *
 * Empty text with a shelf is a real record — "no words, shelved" — carried
 * as the tombstone shape plus the tag, because one record is the whole truth
 * about one token. Empty text with no shelf stays refused here: a removal is
 * an instruction, and it keeps its own encoder below.
 */
export function encodeDescriptionHex(
    tokenId: string,
    text: string,
    extras: DescriptionExtras = {},
): string | undefined {
    if (typeof tokenId !== 'string' || !/^[0-9a-f]{64}$/.test(tokenId)) {
        return undefined;
    }
    if (typeof text !== 'string') {
        return undefined;
    }
    const textBytes = new TextEncoder().encode(text);
    if (textBytes.length > MAX_DESCRIPTION_BYTES) {
        return undefined;
    }
    const shelf = extras.shelf === undefined || extras.shelf === '' ? undefined : extras.shelf;
    const price = extras.price;
    // A price with no words is a record — the tombstone shape plus the tag,
    // the same way "no words, shelved" is one. Nothing at all is still the
    // refusal: a removal is an instruction and keeps its own encoder below.
    if (textBytes.length < 1 && shelf === undefined && price === undefined) {
        return undefined;
    }
    const pushes = taggedPushes(tokenId, textBytes, shelf, price);
    if (pushes === undefined) {
        return undefined;
    }
    // Encode only what decode would accept back — field for field. A record
    // this app writes and cannot read is the failure §5 calls the worst one,
    // and a shelf that decode drops would be a dead field sold as published.
    const back = decodeDescriptionPushes(pushes);
    if (back === undefined) {
        return undefined;
    }
    if (textBytes.length >= 1 && back.kind !== 'text') {
        return undefined;
    }
    if (back.shelf !== shelf || !samePrice(back.price, price)) {
        return undefined;
    }
    const record = concat(pushes.map((push) => encodePush(push)));
    // The shared ceiling (§5, one helper's number): at a 180-byte description
    // no shelf fits, and the editor's single meter is this same comparison.
    if (record.length > OP_RETURN_BUDGET) {
        return undefined;
    }
    return toHex(record);
}

/**
 * What one record costs on the wire, for the editor's single meter — the
 * same arithmetic `encodeDescriptionHex` enforces, so the meter and the
 * refusal cannot disagree.
 */
export function descriptionRecordBytes(
    text: string,
    shelf = '',
    price?: TokenPrice,
): number {
    const textBytes = new TextEncoder().encode(text);
    let total =
        encodePush(lokadBytes()).length +
        encodePush(idBytes('00'.repeat(TOKEN_ID_BYTES))).length +
        encodePush(textBytes).length;
    if (shelf !== '') {
        total += encodePush(new Uint8Array(1 + new TextEncoder().encode(shelf).length))
            .length;
    }
    if (price !== undefined) {
        total += encodePush(new Uint8Array(PRICE_FIELD_BYTES)).length;
        // Counted from the price entry, which is where it lives: a meter that
        // asked for the margin separately would be a second place the record's
        // shape is written down.
        if (price.tolerancePct !== undefined) {
            total += encodePush(new Uint8Array(TOLERANCE_FIELD_BYTES)).length;
        }
    }
    return total;
}

/**
 * The payload that removes a description: the same record with an empty third
 * push. Separate from `encodeDescriptionHex` on purpose — erasing what a seller
 * wrote is an instruction, not an empty string that slipped through a form.
 *
 * The empty push must be `OP_PUSHDATA1 0x00`; the direct form is opcode `0x00`,
 * which `opReturnPushes` refuses, taking the whole record with it. `encodePush`
 * handles that.
 */
export function encodeRemovalHex(
    tokenId: string,
    extras: DescriptionExtras = {},
): string | undefined {
    if (typeof tokenId !== 'string' || !/^[0-9a-f]{64}$/.test(tokenId)) {
        return undefined;
    }
    const shelf = extras.shelf === undefined || extras.shelf === '' ? undefined : extras.shelf;
    const price = extras.price;
    const pushes = taggedPushes(tokenId, new Uint8Array(0), shelf, price);
    if (pushes === undefined) {
        return undefined;
    }
    const back = decodeDescriptionPushes(pushes);
    if (back === undefined || back.kind !== 'tombstone') {
        return undefined;
    }
    // Every other field, restated. One record is the whole truth about one
    // token, so a removal that carried only the empty push would erase the
    // shelf and the price along with the words — which is what it did to the
    // shelf until this took them.
    if (back.shelf !== shelf || !samePrice(back.price, price)) {
        return undefined;
    }
    const record = concat(pushes.map((push) => encodePush(push)));
    if (record.length > OP_RETURN_BUDGET) {
        return undefined;
    }
    return toHex(record);
}

/**
 * The three required pushes and the tagged fields after them, ascending by
 * tag. One builder for both encoders: a removal that assembled its own would
 * be a second place the grammar is written down.
 */
function taggedPushes(
    tokenId: string,
    textBytes: Uint8Array,
    shelf: string | undefined,
    price: TokenPrice | undefined,
): Uint8Array[] | undefined {
    const pushes = [lokadBytes(), idBytes(tokenId), textBytes];
    if (shelf !== undefined) {
        const shelfBytes = new TextEncoder().encode(shelf);
        if (shelfBytes.length < 1 || shelfBytes.length > MAX_SHELF_BYTES) {
            return undefined;
        }
        const tagged = new Uint8Array(1 + shelfBytes.length);
        tagged[0] = SHELF_TAG;
        tagged.set(shelfBytes, 1);
        pushes.push(tagged);
    }
    if (price !== undefined) {
        const field = priceField(price);
        if (field === undefined) {
            return undefined;
        }
        pushes.push(field);
        // After the price, because the tags run ascending and decode-back
        // leans on that order — and because it is a fact about the quote,
        // which has to exist for it to mean anything.
        if (price.tolerancePct !== undefined) {
            const margin = toleranceField(price.tolerancePct);
            if (margin === undefined) {
                return undefined;
            }
            pushes.push(margin);
        }
    }
    return pushes;
}

/**
 * Field by field, because a `toEqual` here would be an object identity check.
 *
 * The tolerance is compared with the rest: the encoder's decode-back guard is
 * this function, and one blind to the byte would let a record be written whose
 * margin the reader drops — published, and not what the seller was shown.
 */
export function samePrice(
    a: TokenPrice | undefined,
    b: TokenPrice | undefined,
): boolean {
    if (a === undefined || b === undefined) {
        return a === b;
    }
    return (
        a.code === b.code &&
        a.exponent === b.exponent &&
        a.amount === b.amount &&
        a.tolerancePct === b.tolerancePct
    );
}

/** How many bytes a description costs on the wire, for a live counter. */
export function descriptionBytes(text: string): number {
    return new TextEncoder().encode(text).length;
}

function lokadBytes(): Uint8Array {
    return Uint8Array.from(STLD_ASCII, (c) => c.charCodeAt(0));
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
