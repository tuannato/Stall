import { encodePush } from './manifest';
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

const TOKEN_ID_BYTES = 32;
const REQUIRED_PUSHES = 3;

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
    | { readonly kind: 'text'; readonly tokenId: string; readonly text: string }
    | { readonly kind: 'tombstone'; readonly tokenId: string };

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
    // A zero-length third push is the removal instruction, not a short record.
    if (textBytes.length === 0) {
        return { kind: 'tombstone', tokenId: toHex(idBytes) };
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
    if (!isLegibleDescription(text)) {
        return undefined;
    }
    // Control characters are not description: they are a way to make one line
    // look like several, or to hide the rest of a sentence from a reader.
    if (/[\u0000-\u001f\u007f\u2028\u2029]/.test(text)) {
        return undefined;
    }
    return { kind: 'text', tokenId: toHex(idBytes), text };
}

/**
 * What a description is allowed to be made of.
 *
 * This is the first attacker-chosen free text on the paint path since the stall
 * name, so §6's "the chain supplies a row, never bytes" stops covering it here
 * and the check has to be explicit. It lives in the decoder rather than in CSS
 * because this runner cannot lay anything out, so the decoder is the only place
 * an enforceable test can sit — and because tightening it after the first
 * record is on chain would make published records unreadable.
 */
function isLegibleDescription(text: string): boolean {
    if (text.trim() === '') {
        return false;
    }
    // C0/C1, DEL, and the two separators that end a line.
    if (/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/.test(text)) {
        return false;
    }
    // Bidi overrides, embeddings and isolates. An unterminated U+202E reorders
    // the rest of its paragraph: a seller could write a price that reads
    // backwards from the one they typed. A block boundary happens to contain it
    // today, which is a CSS accident and not a boundary.
    if (/[\u202a-\u202e\u2066-\u2069\u200e\u200f\u061c]/.test(text)) {
        return false;
    }
    // Invisible characters. They pad a name into a lookalike, or hide a word.
    if (/[\u00ad\u200b-\u200d\ufeff]/u.test(text)) {
        return false;
    }
    // A long stack of combining marks grows out of its line box and can cover
    // the row beside it — chain-supplied bytes over the asked amount, which is
    // the one thing §6 says must never happen. Four is past any real language.
    if (/\p{Mn}{5,}/u.test(text)) {
        return false;
    }
    return true;
}

/**
 * The `op_return_raw` payload for a record — these pushes without the `6a`
 * Cashtab prepends. `undefined` when the input cannot be represented, so a
 * caller never hands a wallet a record this app could not read back.
 */
export function encodeDescriptionHex(
    tokenId: string,
    text: string,
): string | undefined {
    if (typeof tokenId !== 'string' || !/^[0-9a-f]{64}$/.test(tokenId)) {
        return undefined;
    }
    if (typeof text !== 'string') {
        return undefined;
    }
    const textBytes = new TextEncoder().encode(text);
    if (textBytes.length < 1 || textBytes.length > MAX_DESCRIPTION_BYTES) {
        return undefined;
    }
    // Encode only what decode would accept back, and only as text. A record
    // this app writes and cannot read is the failure §5 calls the worst one,
    // and a "description" that decoded as a removal would be worse still.
    const back = decodeDescriptionPushes([lokadBytes(), idBytes(tokenId), textBytes]);
    if (back === undefined || back.kind !== 'text') {
        return undefined;
    }
    return toHex(
        concat([
            encodePush(lokadBytes()),
            encodePush(idBytes(tokenId)),
            encodePush(textBytes),
        ]),
    );
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
export function encodeRemovalHex(tokenId: string): string | undefined {
    if (typeof tokenId !== 'string' || !/^[0-9a-f]{64}$/.test(tokenId)) {
        return undefined;
    }
    const empty = new Uint8Array(0);
    const back = decodeDescriptionPushes([lokadBytes(), idBytes(tokenId), empty]);
    if (back === undefined || back.kind !== 'tombstone') {
        return undefined;
    }
    return toHex(
        concat([encodePush(lokadBytes()), encodePush(idBytes(tokenId)), encodePush(empty)]),
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
