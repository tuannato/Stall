import { decodeCashAddress, isValidCashAddress } from 'ecashaddrjs';
import type { PubKeyHex, RouteParse } from './state';

const PUBKEY_RE = /^(02|03)[0-9a-fA-F]{64}$/;

export function parseSellerParam(raw: string): RouteParse {
    const trimmed = raw.trim();
    if (PUBKEY_RE.test(trimmed)) {
        return { kind: 'pubkey', pubkeyHex: trimmed.toLowerCase() };
    }
    const withPrefix = trimmed.includes(':') ? trimmed : `ecash:${trimmed}`;
    if (!isValidCashAddress(withPrefix)) {
        return { kind: 'invalid', raw };
    }
    try {
        const decoded = decodeCashAddress(withPrefix);
        if (decoded.type !== 'p2pkh' && decoded.type !== 'p2sh') {
            return { kind: 'invalid', raw };
        }
        return {
            kind: 'address',
            address: withPrefix,
            type: decoded.type,
            hash: decoded.hash,
        };
    } catch {
        return { kind: 'invalid', raw };
    }
}

export function isCompressedPubKeyHex(value: string): value is PubKeyHex {
    return PUBKEY_RE.test(value);
}

export function sellerFromPath(pathname: string): string | undefined {
    const match = pathname.match(/^\/s\/([^/]+)\/?$/);
    if (!match) {
        return undefined;
    }
    try {
        return decodeURIComponent(match[1]!);
    } catch {
        return undefined;
    }
}
