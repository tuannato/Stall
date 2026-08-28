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
        // A script address is refused here rather than walked. Offers are
        // grouped by public key, and the only way to recover one is a p2pkh
        // spend revealing it in an input script — a p2sh input never does, and
        // `pubkeyFromSpends` skips those inputs outright. So a p2sh route could
        // only ever spend ten pages of history to arrive at "this address has
        // never sent", which is false about an address that has sent thousands
        // of times. It carries `why` so the screen can say the true thing.
        if (decoded.type === 'p2sh') {
            return { kind: 'invalid', raw, why: 'script-address' };
        }
        if (decoded.type !== 'p2pkh') {
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

/** The apex and nothing else. `/s/...` is a stall; anything else is unreadable. */
export function isHomePath(pathname: string): boolean {
    return pathname === '/' || pathname === '';
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

export function stallPath(raw: string): string {
    const parsed = parseSellerParam(raw);
    const token =
        parsed.kind === 'pubkey'
            ? parsed.pubkeyHex
            : parsed.kind === 'address'
              ? parsed.address
              : raw.trim();
    return `/s/${encodeURIComponent(token)}`;
}
