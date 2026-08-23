import { fromHex } from 'ecash-lib';

const OP_RETURN = 0x6a;
const OP_PUSHDATA1 = 76;

export function isP2shOutputScript(outputScriptHex: string): boolean {
    const hex = outputScriptHex.toLowerCase();
    return hex.length === 46 && hex.startsWith('a914') && hex.endsWith('87');
}

export function p2pkhHashFromOutputScript(outputScriptHex: string): string | undefined {
    const hex = outputScriptHex.toLowerCase();
    if (hex.length !== 50 || !hex.startsWith('76a914') || !hex.endsWith('88ac')) {
        return undefined;
    }
    return hex.slice(6, 46);
}

/**
 * Pushes after OP_RETURN. Same opcode subset as extractP2pkhPubKey
 * (direct push 1–75 and OP_PUSHDATA1). Anything else rejects the output.
 */
export function opReturnPushes(outputScriptHex: string): Uint8Array[] | undefined {
    let bytes: Uint8Array;
    try {
        bytes = fromHex(outputScriptHex.toLowerCase());
    } catch {
        return undefined;
    }
    if (bytes.length < 1 || bytes[0] !== OP_RETURN) {
        return undefined;
    }
    const pushes: Uint8Array[] = [];
    let i = 1;
    while (i < bytes.length) {
        const op = bytes[i]!;
        i += 1;
        let len: number;
        if (op > 0 && op <= 75) {
            len = op;
        } else if (op === OP_PUSHDATA1) {
            if (i >= bytes.length) {
                return undefined;
            }
            len = bytes[i]!;
            i += 1;
        } else {
            return undefined;
        }
        if (i + len > bytes.length) {
            return undefined;
        }
        pushes.push(bytes.slice(i, i + len));
        i += len;
    }
    return pushes;
}
