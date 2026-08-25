import { extractP2pkhPubKey, pubKeyMatchesHash } from '../domain/pubkey';
import {
    decodeManifestPushes,
    isStl1,
    pickManifestWinner,
    STL1_HEX,
    type ManifestRank,
    type StallManifest,
} from '../domain/manifest';
import {
    HISTORY_PAGE_SIZE,
    MAX_HISTORY_PAGES,
    type ChainTx,
    type HistoryPage,
    type ManifestChronik,
} from './chain';
import { isP2shOutputScript, opReturnPushes, p2pkhHashFromOutputScript } from './script';

export type LoadedManifest = StallManifest & ManifestRank;

export type ManifestLookup = {
    manifest?: LoadedManifest;
    /**
     * The walk stopped at its page cap. A newer record may sit beyond it, so
     * the look on screen is not known to be current — and an unthemed stall is
     * not known to be a seller who never published one.
     */
    truncated: boolean;
    /**
     * An `STL1` record signed by this stall was found and could not be read.
     * The seller did publish settings; we failed to decode them. Painting the
     * shipped default in silence would say they never published, which is the
     * same lie `truncated` exists to refuse.
     */
    unreadable: boolean;
};

export async function loadManifest(
    chronik: ManifestChronik,
    stall: { address: string; hash: string },
    hintTxid?: string,
): Promise<ManifestLookup> {
    const hash = stall.hash.toLowerCase();
    let best: LoadedManifest | undefined;

    if (hintTxid !== undefined && hintTxid.length > 0) {
        try {
            best = better(best, recordFromTx(await chronik.tx(hintTxid), hash));
        } catch {
            // Hint is a candidate, never an authority.
        }
    }

    const walked = await walkShorter(chronik, stall.address, hash);
    const manifest = better(best, walked.best);
    return {
        manifest,
        truncated: walked.truncated,
        // Only worth saying when there is nothing to show instead. A readable
        // record wins on its own terms and the broken one is simply older.
        unreadable: manifest === undefined && walked.unreadable,
    };
}

/** One winner is all this returns, so one is all it holds. */
function better(
    a: LoadedManifest | undefined,
    b: LoadedManifest | undefined,
): LoadedManifest | undefined {
    if (a === undefined) {
        return b === undefined ? undefined : pickManifestWinner([b]);
    }
    if (b === undefined) {
        return pickManifestWinner([a]);
    }
    return pickManifestWinner([a, b]);
}

async function walkShorter(
    chronik: ManifestChronik,
    address: string,
    hash: string,
): Promise<{ best?: LoadedManifest; truncated: boolean; unreadable: boolean }> {
    const addrEp = chronik.address(address);
    const lokadEp = chronik.lokadId(STL1_HEX);
    const [addrPage, lokadPage] = await Promise.all([
        addrEp.history(0, HISTORY_PAGE_SIZE),
        lokadEp.history(0, HISTORY_PAGE_SIZE),
    ]);

    const useAddr = addrPage.numTxs <= lokadPage.numTxs;
    const first = useAddr ? addrPage : lokadPage;
    const rest = useAddr ? addrEp : lokadEp;

    const total = Math.max(first.numPages, 1);
    const pages = Math.min(total, MAX_HISTORY_PAGES);
    const broken = { seen: false };
    let best = bestInPage(first, hash, undefined, broken);
    for (let page = 1; page < pages; page++) {
        best = bestInPage(await rest.history(page, HISTORY_PAGE_SIZE), hash, best, broken);
    }
    return { best, truncated: total > pages, unreadable: broken.seen };
}

function bestInPage(
    page: HistoryPage,
    hash: string,
    best: LoadedManifest | undefined,
    broken: { seen: boolean },
): LoadedManifest | undefined {
    let out = best;
    for (const tx of page.txs) {
        try {
            out = better(out, recordFromTx(tx, hash));
        } catch {
            // Ours, signed by this stall, and undecodable.
            broken.seen = true;
        }
    }
    return out;
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

/** A record addressed to us that we could not decode. */
export class Stl1Unreadable extends Error {
    constructor() {
        super('STL1 record could not be decoded');
        this.name = 'Stl1Unreadable';
    }
}

function firstStl1(tx: ChainTx): StallManifest | undefined {
    let found: StallManifest | undefined;
    let sawBroken = false;
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
            // Only ours counts. A stall memo is not a broken manifest.
            if (isStl1(pushes)) {
                sawBroken = true;
            }
            continue;
        }
    }
    if (found === undefined && sawBroken) {
        throw new Stl1Unreadable();
    }
    return found;
}
