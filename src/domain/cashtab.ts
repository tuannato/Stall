/**
 * Where a buyer is sent to complete a purchase. Stall reads; Cashtab signs.
 *
 * Deliberately no `action=BUY`. That deep-link action hands the buyer to a
 * confirm screen which selects the cheapest affordable offer and never names
 * the maker, so on a per-seller stall it can quietly sell someone else's
 * tokens. With no action the wallet falls back to opening its token page,
 * where every offer is listed and the buyer can pick a row themselves.
 *
 * Publish URLs are the same shape: Stall composes a BIP21, the seller's
 * wallet signs. Two bridges, two opposite encoding rules. Cashtab web
 * parses `window.location.hash` and must receive the BIP21 raw;
 * `encodeURIComponent` produces `ecash%3A...`, which it rejects as
 * "Invalid address". pay.e.cash takes a real query string, so there
 * the encoding is required.
 */

import { decodeCashAddress, encodeCashAddress } from 'ecashaddrjs';

const CASHTAB_ORIGIN = 'https://cashtab.com';
const PAY_E_CASH_ORIGIN = 'https://pay.e.cash';
const TOKEN_ID_RE = /^[0-9a-f]{64}$/;
/**
 * Dust in XEC. 546 sats is 5.46 XEC; BIP21 `amount` is XEC, so writing
 * 546 would send 546 XEC.
 */
const DUST_XEC = '5.46';
const OP_RETURN_RAW_RE = /^([0-9a-f]{2})+$/;
/** BIP21 `op_return_raw` is the payload without `6a`, capped at 222 bytes. */
const OP_RETURN_RAW_MAX_BYTES = 222;

/**
 * Cashtab uses hash routing, so the path lives after the `#`. Returns
 * undefined rather than a guess when the token id is not one we can vouch for.
 */
export function cashtabTokenUrl(tokenId: string): string | undefined {
    const id = tokenId.toLowerCase();
    if (!TOKEN_ID_RE.test(id)) {
        return undefined;
    }
    return `${CASHTAB_ORIGIN}/#/token/${id}`;
}

function p2pkhEcashAddress(address: string): string | undefined {
    const trimmed = address.trim();
    const withPrefix = trimmed.includes(':') ? trimmed : `ecash:${trimmed}`;
    try {
        const decoded = decodeCashAddress(withPrefix);
        if (decoded.prefix !== 'ecash' || decoded.type !== 'p2pkh') {
            return undefined;
        }
        return encodeCashAddress('ecash', 'p2pkh', decoded.hash);
    } catch {
        return undefined;
    }
}

function isEncoderOpReturnRaw(hex: string): boolean {
    if (!OP_RETURN_RAW_RE.test(hex)) {
        return false;
    }
    if (hex.startsWith('6a')) {
        return false;
    }
    return hex.length / 2 <= OP_RETURN_RAW_MAX_BYTES;
}

function publishBip21(
    address: string,
    opReturnRawHex: string,
): string | undefined {
    const dest = p2pkhEcashAddress(address);
    if (dest === undefined || !isEncoderOpReturnRaw(opReturnRawHex)) {
        return undefined;
    }
    return `${dest}?amount=${DUST_XEC}&op_return_raw=${opReturnRawHex}`;
}

/**
 * Cashtab web: BIP21 concatenated raw after `#/send?bip21=`. A fragment
 * is not touched by the browser, so encoding it is the silent reject.
 */
export function cashtabPublishUrl(
    address: string,
    opReturnRawHex: string,
): string | undefined {
    const bip21 = publishBip21(address, opReturnRawHex);
    if (bip21 === undefined) {
        return undefined;
    }
    return `${CASHTAB_ORIGIN}/#/send?bip21=${bip21}`;
}

/**
 * pay.e.cash: the same BIP21 as a query value, so it is encoded.
 * Native Cashtab has no manual field for this payload; this is the
 * App Links bridge onto a phone.
 */
export function payECashPublishUrl(
    address: string,
    opReturnRawHex: string,
): string | undefined {
    const bip21 = publishBip21(address, opReturnRawHex);
    if (bip21 === undefined) {
        return undefined;
    }
    return `${PAY_E_CASH_ORIGIN}/?bip21=${encodeURIComponent(bip21)}`;
}
