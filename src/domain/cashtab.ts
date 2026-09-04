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
import { DUST_SATS, formatXecUngrouped } from './money';

const CASHTAB_ORIGIN = 'https://cashtab.com';
const PAY_E_CASH_ORIGIN = 'https://pay.e.cash';

/**
 * Cashtab's token list, where a seller holding a token lists it on Agora. Not a
 * token page: the stall has not resolved, so there is no token id to aim at.
 * `#/etokens` renders Cashtab's Etokens screen.
 */
export const CASHTAB_LIST_URL = `${CASHTAB_ORIGIN}/#/etokens`;
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

/**
 * The bare BIP21 the seller's wallet signs: `ecash:<addr>?amount=…&op_return_raw=…`.
 * This is what a phone wallet scans from a QR — no `cashtab.com` wrapper, no
 * `pay.e.cash` bridge, just the payment URI a wallet understands directly.
 */
export function publishBip21(
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
 * The BIP21 a buyer's wallet signs to pay the seller directly.
 *
 * **A sibling of `publishBip21`, never a widening of it.** That one's amount
 * is dust and always dust, and four call sites rest on it; this one carries a
 * figure derived from the seller's own quote. One function taking an optional
 * amount would be one function two very different screens could get wrong.
 *
 * Two rules the amount has to keep, and both are why `formatXecUngrouped`
 * exists: the field is XEC (writing `546` sends 546 XEC), and it carries no
 * thousands separator and exactly two decimals.
 *
 * **Nothing below the dust floor is composed.** Under `DUST_SATS` the network
 * will not relay the output, so a link built from one fails inside the wallet
 * after the buyer has read the page and pressed Pay. The screen says why
 * instead.
 */
export function payBip21(
    address: string,
    sats: bigint,
    opReturnRawHex: string,
): string | undefined {
    const dest = p2pkhEcashAddress(address);
    if (dest === undefined || !isEncoderOpReturnRaw(opReturnRawHex)) {
        return undefined;
    }
    // `typeof`, not a comparison: a `Number` here would compare fine and then
    // print a rounded figure into a payment URI.
    if (typeof sats !== 'bigint' || sats < DUST_SATS) {
        return undefined;
    }
    return `${dest}?amount=${formatXecUngrouped(sats)}&op_return_raw=${opReturnRawHex}`;
}

/** Cashtab web takes the pay BIP21 raw in the fragment, as it does a publish. */
export function cashtabPayUrl(
    address: string,
    sats: bigint,
    opReturnRawHex: string,
): string | undefined {
    const bip21 = payBip21(address, sats, opReturnRawHex);
    if (bip21 === undefined) {
        return undefined;
    }
    return `${CASHTAB_ORIGIN}/#/send?bip21=${bip21}`;
}

/** pay.e.cash takes the same string encoded in a query, as it does a publish. */
export function payECashPayUrl(
    address: string,
    sats: bigint,
    opReturnRawHex: string,
): string | undefined {
    const bip21 = payBip21(address, sats, opReturnRawHex);
    if (bip21 === undefined) {
        return undefined;
    }
    return `${PAY_E_CASH_ORIGIN}/?bip21=${encodeURIComponent(bip21)}`;
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
