import { decodeCashAddress, isValidCashAddress } from 'ecashaddrjs';
import type { BroadcastParams, PubKeyHex, RouteParse } from './state';

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

/**
 * `?pay=<hex>` on `/s/<seller>`: which item a scanned code was aimed at.
 *
 * A **prefix of a token id**, not the whole thing, because a QR that carries
 * this link has to stay at the module count the share link already scans at.
 * Twelve hex characters is 48 bits inside one stall's own price map, which
 * cannot collide in practice — and the ambiguous case is handled anyway, by
 * opening nothing.
 *
 * Bounded and lowercase-hex or nothing. The value never reaches a request:
 * it is compared against records this page already holds, never looked up on
 * chain. The bound is here so an unbounded search string never becomes the
 * comparison in the first place.
 */
export const MIN_PAY_PARAM_CHARS = 12;
export const MAX_PAY_PARAM_CHARS = 64;

/** How much of an id a link this app writes carries. The parser accepts more. */
export const PAY_PARAM_PREFIX = 12;

const PAY_PARAM_RE = new RegExp(
    `^[0-9a-f]{${MIN_PAY_PARAM_CHARS},${MAX_PAY_PARAM_CHARS}}$`,
);

/**
 * The item a scanned link named, or nothing. Pure and no-throw, beside
 * `parseBroadcastParams` and read where `?m=` is read.
 */
export function parsePayParam(search: string): string | undefined {
    let params: URLSearchParams;
    try {
        params = new URLSearchParams(search);
    } catch {
        return undefined;
    }
    const raw = params.get('pay');
    if (raw === null || raw.length > MAX_PAY_PARAM_CHARS) {
        return undefined;
    }
    return PAY_PARAM_RE.test(raw) ? raw : undefined;
}

/**
 * A link to this stall's page, at one item.
 *
 * **The base is handed in.** `src/domain` is pure — reading `location` here
 * would put the browser's URL inside the layer that has no browser, which the
 * directory walls exist to prevent — so the caller supplies origin and path
 * and this decides only what the parameter says.
 *
 * A link and not a payment URI, deliberately: a raw BIP21 drops a buyer into a
 * wallet holding an amount and a hex memo nobody explained to them. This opens
 * the page that explains it, with the Pay control on it.
 */
export function payLandingUrl(base: string, tokenId: string): string | undefined {
    if (typeof base !== 'string' || base === '') {
        return undefined;
    }
    const id = typeof tokenId === 'string' ? tokenId.toLowerCase() : '';
    if (!/^[0-9a-f]{64}$/.test(id)) {
        return undefined;
    }
    return `${base}?pay=${id.slice(0, PAY_PARAM_PREFIX)}`;
}

/** No accepted value is longer than `lower-third` / `transparent`. */
const MAX_BROADCAST_PARAM = 16;

function broadcastParam(params: URLSearchParams, key: string): string | undefined {
    const raw = params.get(key);
    if (raw === null || raw.length > MAX_BROADCAST_PARAM) {
        return undefined;
    }
    return raw;
}

/**
 * Query params that turn `/s/<seller>` into the stream overlay.
 *
 * `view=broadcast` is the gate: anything else is the ordinary stall. A bad
 * option falls back to its default rather than dropping the overlay — a
 * stream that silently became a shop is the failure. Each raw value is
 * length-clamped before comparison so an unbounded search string never
 * becomes the lookup.
 */
export function parseBroadcastParams(search: string): BroadcastParams | undefined {
    let params: URLSearchParams;
    try {
        params = new URLSearchParams(search);
    } catch {
        return undefined;
    }
    if (broadcastParam(params, 'view') !== 'broadcast') {
        return undefined;
    }
    const preset = broadcastParam(params, 'preset') === 'rail' ? 'rail' : 'corner';
    const mode =
        preset === 'rail'
            ? 'rail'
            : broadcastParam(params, 'mode') === 'fixed'
              ? 'fixed'
              : 'rail';
    return {
        preset,
        mode,
        transparent: broadcastParam(params, 'bg') === 'transparent',
    };
}
