import { extractP2pkhPubKey, pubKeyMatchesHash } from '../domain/pubkey';
import {
    decodeManifestPushes,
    pickManifestWinner,
    STL1_HEX,
    type ManifestRank,
    type StallManifest,
} from '../domain/manifest';
import {
    HISTORY_PAGE_SIZE,
    type ChainTx,
    type HistoryEndpoint,
    type HistoryPage,
    type ManifestChronik,
} from './chain';
import { isP2shOutputScript, opReturnPushes, p2pkhHashFromOutputScript } from './script';

export type LoadedManifest = StallManifest & ManifestRank;

export async function loadManifest(
    chronik: ManifestChronik,
    stall: { address: string; hash: string },
    hintTxid?: string,
): Promise<LoadedManifest | undefined> {
    const hash = stall.hash.toLowerCase();
    const records: LoadedManifest[] = [];

    if (hintTxid !== undefined && hintTxid.length > 0) {
        try {
            const hinted = recordFromTx(await chronik.tx(hintTxid), hash);
            if (hinted) {
                records.push(hinted);
            }
        } catch {
            // Hint is a cache, not an authority.
        }
    }

    const walked = await walkShorter(chronik, stall.address, hash);
    for (const rec of walked) {
        if (!records.some((r) => r.txid === rec.txid)) {
            records.push(rec);
        }
    }

    return pickManifestWinner(records);
}

async function walkShorter(
    chronik: ManifestChronik,
    address: string,
    hash: string,
): Promise<LoadedManifest[]> {
    const addrEp = chronik.address(address);
    const lokadEp = chronik.lokadId(STL1_HEX);
    const [addrPage, lokadPage] = await Promise.all([
        addrEp.history(0, HISTORY_PAGE_SIZE),
        lokadEp.history(0, HISTORY_PAGE_SIZE),
    ]);

    const useAddr = addrPage.numTxs <= lokadPage.numTxs;
    const first = useAddr ? addrPage : lokadPage;
    const rest = useAddr ? addrEp : lokadEp;
    const records: LoadedManifest[] = [];
    collectRecords(first, hash, records);
    await collectRemaining(rest, first.numPages, hash, records);
    return records;
}

async function collectRemaining(
    endpoint: HistoryEndpoint,
    numPages: number,
    hash: string,
    into: LoadedManifest[],
): Promise<void> {
    for (let page = 1; page < numPages; page++) {
        const next = await endpoint.history(page, HISTORY_PAGE_SIZE);
        collectRecords(next, hash, into);
    }
}

function collectRecords(page: HistoryPage, hash: string, into: LoadedManifest[]): void {
    for (const tx of page.txs) {
        const rec = recordFromTx(tx, hash);
        if (rec && !into.some((r) => r.txid === rec.txid)) {
            into.push(rec);
        }
    }
}

function recordFromTx(tx: ChainTx, hash: string): LoadedManifest | undefined {
    if (!txSignedByStall(tx, hash)) {
        return undefined;
    }
    const decoded = firstStl1(tx);
    if (decoded === undefined) {
        return undefined;
    }
    return {
        ...decoded,
        height: tx.block?.height,
        blockPos: undefined,
        txid: tx.txid,
    };
}

function txSignedByStall(tx: ChainTx, hash: string): boolean {
    for (const input of tx.inputs) {
        if (input.outputScript === undefined) {
            continue;
        }
        if (isP2shOutputScript(input.outputScript)) {
            continue;
        }
        const paid = p2pkhHashFromOutputScript(input.outputScript);
        if (paid !== hash) {
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
        if (pubKeyMatchesHash(pk, hash)) {
            return true;
        }
    }
    return false;
}

function firstStl1(tx: ChainTx): StallManifest | undefined {
    let found: StallManifest | undefined;
    for (const output of tx.outputs) {
        const pushes = opReturnPushes(output.outputScript);
        if (pushes === undefined) {
            continue;
        }
        try {
            const decoded = decodeManifestPushes(pushes);
            if (found !== undefined) {
                return undefined;
            }
            found = decoded;
        } catch {
            continue;
        }
    }
    return found;
}
