/**
 * A protobuf-lite reader for exactly one chronik shape: `TxHistoryPage`, with
 * the handful of `Tx` fields the unfurl's manifest walk needs. Chronik speaks
 * protobuf and nothing else; the app's client rides `ecash-lib`'s barrel,
 * which carries the wasm §9 evicted — so the edge gets a reader that knows
 * only what it needs.
 *
 * **The field numbers are not guessed.** Each one is read from the vendored
 * `chronik-client`'s own generated codec, and `pb-reads-what-chronik-writes`
 * in `src/unfurl.test.ts` round-trips through that codec's `encode` — the
 * vendor's writer is the fixture for this reader, so a drift fails the suite.
 *
 *   TxHistoryPage: 1 txs (Tx), 2 numPages, 3 numTxs
 *   Tx:            1 txid (bytes, reversed for display), 3 inputs,
 *                  4 outputs, 8 block, 16 isFinal
 *   TxInput:       2 inputScript, 3 outputScript
 *   TxOutput:      2 outputScript
 *   BlockMetadata: 1 height
 *
 * Unknown fields are skipped by wire type, which is what lets chronik grow
 * without breaking this.
 */

export type LiteInput = { inputScript: string; outputScript?: string };
export type LiteOutput = { outputScript: string };
export type LiteTx = {
    txid: string;
    inputs: LiteInput[];
    outputs: LiteOutput[];
    height?: number;
    isFinal: boolean;
};
export type LitePage = { txs: LiteTx[]; numPages: number; numTxs: number };

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

function toHexBytes(bytes: Uint8Array, start: number, end: number): string {
    if (end > bytes.length) {
        throw new Error('field ran off the buffer');
    }
    let out = '';
    for (let i = start; i < end; i += 1) {
        out += HEX[bytes[i]!];
    }
    return out;
}

function toHexReversed(bytes: Uint8Array, start: number, end: number): string {
    if (end > bytes.length) {
        throw new Error('field ran off the buffer');
    }
    let out = '';
    for (let i = end - 1; i >= start; i -= 1) {
        out += HEX[bytes[i]!];
    }
    return out;
}

type Cursor = { pos: number };

/**
 * Where a length-delimited field ends — checked against the buffer, because
 * the length came from the page and the page came from a host. Read past the
 * end, `bytes[i]` is `undefined` and a hex loop builds a string of
 * "undefined"s the length the sender declared: a seven-byte page asking for
 * eighty megabytes. A field that runs off the buffer is a corrupt page and
 * throws like a varint that did.
 */
function fieldEnd(bytes: Uint8Array, cur: Cursor, len: number): number {
    const end = cur.pos + len;
    if (end > bytes.length) {
        throw new Error('field ran off the buffer');
    }
    return end;
}

function varint(bytes: Uint8Array, cur: Cursor): number {
    let shift = 0;
    let value = 0;
    for (;;) {
        if (cur.pos >= bytes.length) {
            throw new Error('varint ran off the buffer');
        }
        const byte = bytes[cur.pos]!;
        cur.pos += 1;
        // Past 2^53 the caller's number lies; nothing this reader needs is
        // that large, and a height or a page count that big is a broken page.
        if (shift < 53) {
            value += (byte & 0x7f) * 2 ** shift;
        }
        if ((byte & 0x80) === 0) {
            return value;
        }
        shift += 7;
    }
}

/** Skip one field by its wire type; unknown fields must not break the read. */
function skip(bytes: Uint8Array, cur: Cursor, wireType: number): void {
    if (wireType === 0) {
        varint(bytes, cur);
        return;
    }
    if (wireType === 1) {
        cur.pos += 8;
        return;
    }
    if (wireType === 2) {
        const len = varint(bytes, cur);
        cur.pos = fieldEnd(bytes, cur, len);
        return;
    }
    if (wireType === 5) {
        cur.pos += 4;
        return;
    }
    throw new Error(`wire type ${wireType} is not one chronik writes`);
}

function decodeInput(bytes: Uint8Array, start: number, end: number): LiteInput {
    const cur: Cursor = { pos: start };
    const input: LiteInput = { inputScript: '' };
    while (cur.pos < end) {
        const tag = varint(bytes, cur);
        const field = tag >>> 3;
        const wire = tag & 7;
        if (field === 2 && wire === 2) {
            const len = varint(bytes, cur);
            input.inputScript = toHexBytes(bytes, cur.pos, fieldEnd(bytes, cur, len));
            cur.pos += len;
        } else if (field === 3 && wire === 2) {
            const len = varint(bytes, cur);
            input.outputScript = toHexBytes(bytes, cur.pos, fieldEnd(bytes, cur, len));
            cur.pos += len;
        } else {
            skip(bytes, cur, wire);
        }
    }
    return input;
}

function decodeOutput(bytes: Uint8Array, start: number, end: number): LiteOutput {
    const cur: Cursor = { pos: start };
    const output: LiteOutput = { outputScript: '' };
    while (cur.pos < end) {
        const tag = varint(bytes, cur);
        const field = tag >>> 3;
        const wire = tag & 7;
        if (field === 2 && wire === 2) {
            const len = varint(bytes, cur);
            output.outputScript = toHexBytes(bytes, cur.pos, fieldEnd(bytes, cur, len));
            cur.pos += len;
        } else {
            skip(bytes, cur, wire);
        }
    }
    return output;
}

function decodeBlockHeight(
    bytes: Uint8Array,
    start: number,
    end: number,
): number | undefined {
    const cur: Cursor = { pos: start };
    while (cur.pos < end) {
        const tag = varint(bytes, cur);
        const field = tag >>> 3;
        const wire = tag & 7;
        if (field === 1 && wire === 0) {
            return varint(bytes, cur);
        }
        skip(bytes, cur, wire);
    }
    return undefined;
}

function decodeTx(bytes: Uint8Array, start: number, end: number): LiteTx {
    const cur: Cursor = { pos: start };
    const tx: LiteTx = { txid: '', inputs: [], outputs: [], isFinal: false };
    while (cur.pos < end) {
        const tag = varint(bytes, cur);
        const field = tag >>> 3;
        const wire = tag & 7;
        if (field === 1 && wire === 2) {
            const len = varint(bytes, cur);
            // Chronik sends txid bytes little-endian; every display and every
            // comparison in this repo uses the reversed hex, so reverse here.
            tx.txid = toHexReversed(bytes, cur.pos, fieldEnd(bytes, cur, len));
            cur.pos += len;
        } else if (field === 3 && wire === 2) {
            const len = varint(bytes, cur);
            tx.inputs.push(decodeInput(bytes, cur.pos, fieldEnd(bytes, cur, len)));
            cur.pos += len;
        } else if (field === 4 && wire === 2) {
            const len = varint(bytes, cur);
            tx.outputs.push(decodeOutput(bytes, cur.pos, fieldEnd(bytes, cur, len)));
            cur.pos += len;
        } else if (field === 8 && wire === 2) {
            const len = varint(bytes, cur);
            tx.height = decodeBlockHeight(bytes, cur.pos, fieldEnd(bytes, cur, len));
            cur.pos += len;
        } else if (field === 16 && wire === 0) {
            tx.isFinal = varint(bytes, cur) !== 0;
        } else {
            skip(bytes, cur, wire);
        }
    }
    return tx;
}

export function decodeTxHistoryPage(bytes: Uint8Array): LitePage {
    const cur: Cursor = { pos: 0 };
    const page: LitePage = { txs: [], numPages: 0, numTxs: 0 };
    while (cur.pos < bytes.length) {
        const tag = varint(bytes, cur);
        const field = tag >>> 3;
        const wire = tag & 7;
        if (field === 1 && wire === 2) {
            const len = varint(bytes, cur);
            page.txs.push(decodeTx(bytes, cur.pos, fieldEnd(bytes, cur, len)));
            cur.pos += len;
        } else if (field === 2 && wire === 0) {
            page.numPages = varint(bytes, cur);
        } else if (field === 3 && wire === 0) {
            page.numTxs = varint(bytes, cur);
        } else {
            skip(bytes, cur, wire);
        }
    }
    return page;
}
