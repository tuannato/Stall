import { fromHex, shaRmd160, toHex } from 'ecash-lib';

export function extractP2pkhPubKey(inputScriptHex: string): Uint8Array | undefined {
    const bytes = fromHex(inputScriptHex);
    let i = 0;
    const pushes: Uint8Array[] = [];
    while (i < bytes.length) {
        const op = bytes[i]!;
        i += 1;
        let len: number;
        if (op > 0 && op <= 75) {
            len = op;
        } else if (op === 76) {
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
    if (pushes.length !== 2) {
        return undefined;
    }
    const pk = pushes[1]!;
    if (pk.length !== 33 || (pk[0] !== 0x02 && pk[0] !== 0x03)) {
        return undefined;
    }
    return pk;
}

export function pubKeyMatchesHash(pubKey: Uint8Array, hashHex: string): boolean {
    return toHex(shaRmd160(pubKey)) === hashHex.toLowerCase();
}
