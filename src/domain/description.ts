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
    | {
          readonly kind: 'text';
          readonly tokenId: string;
          readonly text: string;
          readonly shelf?: string;
      }
    | { readonly kind: 'tombstone'; readonly tokenId: string; readonly shelf?: string };

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
    const shelf = readShelf(decodeTaggedExtras(pushes, REQUIRED_PUSHES).get(SHELF_TAG));
    // A zero-length third push is the removal instruction, not a short record.
    // A shelf rides it unchanged: each record is the whole truth about one
    // token, so "no words, shelved" is one record, not a removal plus a
    // second document — which §5 forbids.
    if (textBytes.length === 0) {
        return {
            kind: 'tombstone',
            tokenId: toHex(idBytes),
            ...(shelf === undefined ? {} : { shelf }),
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

/*
 * The legibility screen lives in `./text` now — the stall name goes through
 * the same set, and two copies of what "legible" means is how they drift.
 */

export type DescriptionExtras = {
    /** Tag 0x01: the seller's own heading over this token's card. */
    shelf?: string;
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
    if (textBytes.length < 1 && shelf === undefined) {
        return undefined;
    }
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
    if (back.shelf !== shelf) {
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
export function descriptionRecordBytes(text: string, shelf = ''): number {
    const textBytes = new TextEncoder().encode(text);
    let total =
        encodePush(lokadBytes()).length +
        encodePush(idBytes('00'.repeat(TOKEN_ID_BYTES))).length +
        encodePush(textBytes).length;
    if (shelf !== '') {
        total += encodePush(new Uint8Array(1 + new TextEncoder().encode(shelf).length))
            .length;
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
