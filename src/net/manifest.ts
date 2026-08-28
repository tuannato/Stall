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

/**
 * `chronik.tx()` concatenates whatever it is given into a request path and
 * never checks it — `verifyTxid` exists in that package and `tx()` does not
 * call it. The value comes from `?m=` in the address bar, and every other id
 * this app hands out is gated on its own shape (`cashtabTokenUrl`, `iconUrl`).
 * This one was not.
 */
const TXID = /^[0-9a-f]{64}$/;

function txidOrNothing(value: string | undefined): string | undefined {
    if (value === undefined) {
        return undefined;
    }
    const lower = value.trim().toLowerCase();
    return TXID.test(lower) ? lower : undefined;
}

export async function loadManifest(
    chronik: ManifestChronik,
    stall: { address: string; hash: string },
    hintTxid?: string,
): Promise<ManifestLookup> {
    const hash = stall.hash.toLowerCase();
    const broken = { seen: false };
    let best: LoadedManifest | undefined;

    const hint = txidOrNothing(hintTxid);
    if (hint !== undefined) {
        try {
            best = better(best, recordFromTx(await chronik.tx(hint), hash));
        } catch (err) {
            // Hint is a candidate, never an authority — but a record of this
            // seller's that will not decode is a fact about them either way,
            // and swallowing it here let a printed `?m=` pointing at their own
            // broken record paint the shipped default in silence. Anything
            // else (a node that did not answer, a txid that is not theirs) is
            // ours and stays quiet.
            if (err instanceof Stl1Unreadable) {
                broken.seen = true;
            }
        }
    }

    // A walk that throws is a walk that did not finish, which is what
    // `truncated` already means. Rejecting instead threw away a hint that had
    // already proved its authorship: the cheap path died because the expensive
    // one did.
    let walked: { best?: LoadedManifest; truncated: boolean };
    try {
        walked = await walkShorter(chronik, stall.address, hash, broken);
    } catch {
        walked = { truncated: true };
    }

    const manifest = better(best, walked.best);
    return {
        manifest,
        truncated: walked.truncated,
        // Only worth saying when there is nothing to show instead. A readable
        // record wins on its own terms and the broken one is simply older.
        unreadable: manifest === undefined && broken.seen,
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
    broken: { seen: boolean },
): Promise<{ best?: LoadedManifest; truncated: boolean }> {
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
    let best = bestInPage(first, hash, undefined, broken);
    for (let page = 1; page < pages; page++) {
        best = bestInPage(await rest.history(page, HISTORY_PAGE_SIZE), hash, best, broken);
    }
    return { best, truncated: total > pages };
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
        isFinal: tx.isFinal === true,
        txid: tx.txid,
    };
}

/**
 * Did the stall's own key sign this transaction? Shared with every other record
 * type this stall authors — a record nobody proved the seller signed is a
 * record anyone can publish *for* them.
 */
export function txSignedByStall(tx: ChainTx, hash: string): boolean {
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

/**
 * The one `STL1` record this transaction carries, or nothing if it carries none.
 *
 * **More than one is unreadable, decodable or not.** The seller signed every
 * output, so nothing in the transaction says which one is the stall, and
 * picking by output order would make the answer depend on where a wallet
 * happened to put it. Returning `undefined` instead would be worse than
 * arbitrary: it reads as "this seller never published", which is our ambiguity
 * stated as a fact about them.
 */
function firstStl1(tx: ChainTx): StallManifest | undefined {
    const ours: Uint8Array[][] = [];
    for (const output of tx.outputs) {
        const pushes = opReturnPushes(output.outputScript);
        // A stall memo is not a broken manifest, so only our LOKAD counts.
        if (pushes !== undefined && isStl1(pushes)) {
            ours.push(pushes);
        }
    }
    if (ours.length === 0) {
        return undefined;
    }
    if (ours.length > 1) {
        throw new Stl1Unreadable();
    }
    try {
        return decodeManifestPushes(ours[0]!);
    } catch {
        throw new Stl1Unreadable();
    }
}
