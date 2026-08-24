import { encodeCashAddress } from 'ecashaddrjs';
import { fromHex, shaRmd160, toHex } from 'ecash-lib';
import { extractP2pkhPubKey, pubKeyMatchesHash } from '../domain/pubkey';
import type { RouteParse, RouteResolution } from '../domain/state';
import {
    HISTORY_PAGE_SIZE,
    MAX_HISTORY_PAGES,
    type AddressChronik,
    type ChainTx,
} from './chain';
import { isP2shOutputScript } from './script';

export async function resolveSeller(
    parse: RouteParse,
    chronik: AddressChronik,
): Promise<RouteResolution> {
    if (parse.kind === 'invalid') {
        return { kind: 'invalid', raw: parse.raw };
    }
    if (parse.kind === 'pubkey') {
        return {
            kind: 'pubkey',
            pubkeyHex: parse.pubkeyHex,
            address: p2pkhAddressFromPubKey(parse.pubkeyHex),
        };
    }

    const endpoint = chronik.address(parse.address);
    const first = await endpoint.history(0, HISTORY_PAGE_SIZE);
    if (first.numTxs === 0) {
        return { kind: 'unresolvable', address: parse.address };
    }

    const hash = parse.hash.toLowerCase();
    const total = Math.max(first.numPages, 1);
    const pages = Math.min(total, MAX_HISTORY_PAGES);
    for (let page = 0; page < pages; page++) {
        const batch = page === 0 ? first : await endpoint.history(page, HISTORY_PAGE_SIZE);
        const found = pubkeyFromSpends(batch.txs, hash);
        if (found) {
            return {
                kind: 'pubkey',
                pubkeyHex: found,
                address: parse.address,
            };
        }
    }

    if (total > pages) {
        // We stopped looking. Saying "this address has never sent" here would
        // hide a real stall behind a confident statement about its owner.
        return { kind: 'unresolved', address: parse.address };
    }

    return { kind: 'unresolvable', address: parse.address };
}

function p2pkhAddressFromPubKey(pubkeyHex: string): string {
    return encodeCashAddress('ecash', 'p2pkh', toHex(shaRmd160(fromHex(pubkeyHex))));
}

function pubkeyFromSpends(txs: readonly ChainTx[], hash: string): string | undefined {
    for (const tx of txs) {
        for (const input of tx.inputs) {
            if (input.outputScript !== undefined && isP2shOutputScript(input.outputScript)) {
                continue;
            }
            let pk: Uint8Array | undefined;
            try {
                pk = extractP2pkhPubKey(input.inputScript);
            } catch {
                continue;
            }
            if (pk === undefined) {
                continue;
            }
            if (!pubKeyMatchesHash(pk, hash)) {
                continue;
            }
            return toHex(pk);
        }
    }
    return undefined;
}
