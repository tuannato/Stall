import { DUST_SATS } from '../domain/money';
import type { RecordAuthority } from '../domain/state';
import { extractP2pkhPubKey, pubKeyMatchesHash } from '../domain/pubkey';
import { decodeManifestPushes, isStl1, pickManifestWinner, STL1_HEX, type ManifestRank, type StallManifest, compareManifestRank } from '../domain/manifest';
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
     * An `STL1` record signed by this stall was refused only by the output
     * test — it does not pay the stall back `DUST_SATS`, so it was not made
     * from this stall's own publish link — and either nothing else won, or the
     * refused record ranks **above** the winner. The seller did sign
     * something newer than what is painted; silence would say they never did.
     */
    unaddressed: boolean;
    /**
     * `unreadable` or `unaddressed` is true **and** a winner is painted: the
     * refused record is newer than the look on screen, so the sign says the
     * earlier settings are showing rather than the shipped default. Since
     * 2026-09-08 — both flags used to speak only with no winner at all, so a
     * seller whose republish was refused saw the old look and no sentence
     * (the descriptions walk always counted; the settings walk did not).
     */
    refusedNewer: boolean;
    /**
     * The walk stopped at its page cap. A newer record may sit beyond it, so
     * the look on screen is not known to be current — and an unthemed stall is
     * not known to be a seller who never published one.
     */
    truncated: boolean;
    /**
     * An `STL1` record signed by this stall was found and could not be read,
     * and either nothing else won or it ranks above the winner. The seller
     * did publish settings; we failed to decode them. Painting the shipped
     * default — or an older look — in silence would say they never published,
     * which is the same lie `truncated` exists to refuse.
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
    /**
     * A pre-read of `chronik.address(stall.address).history(0,
     * HISTORY_PAGE_SIZE)` — that call and nothing else — shared by the
     * initial stall open so one page is not fetched three times. It
     * substitutes for the address head request only: the shorter-index
     * choice (spam resistance, see `loadDescriptions`) still runs on the
     * numbers, and a walk that picks the lokad branch never touches it
     * beyond `numTxs`. Live re-reads pass nothing — what was missed while
     * a socket was down is unknown, and a stale page must not answer.
     */
    addrFirstPage?: Promise<HistoryPage>,
): Promise<ManifestLookup> {
    const hash = stall.hash.toLowerCase();
    const broken: WalkFlags = { seen: false, unaddressed: false };
    let best: LoadedManifest | undefined;

    const hint = txidOrNothing(hintTxid);
    if (hint !== undefined) {
        // Hint is a candidate, never an authority. A node that did not answer,
        // or a txid that is not theirs, is ours and stays quiet.
        let hinted: ChainTx | undefined;
        try {
            hinted = await chronik.tx(hint);
        } catch {
            hinted = undefined;
        }
        if (hinted !== undefined) {
            try {
                // The same flags the walk fills: a hinted record refused by the
                // output test is said like any other (it used to pass none).
                best = better(best, recordFromTx(hinted, hash, broken));
            } catch (err) {
                // A record of this seller's that will not decode is a fact
                // about them either way, and swallowing it here let a printed
                // `?m=` pointing at their own broken record paint the shipped
                // default in silence.
                if (err instanceof Stl1Unreadable) {
                    broken.seen = true;
                    noteRefused(broken, 'brokenBest', hinted);
                }
            }
        }
    }

    // A walk that throws is a walk that did not finish, which is what
    // `truncated` already means. Rejecting instead threw away a hint that had
    // already proved its authorship: the cheap path died because the expensive
    // one did.
    let walked: { best?: LoadedManifest; truncated: boolean };
    try {
        walked = await walkShorter(chronik, stall.address, hash, broken, addrFirstPage);
    } catch {
        walked = { truncated: true };
    }

    const manifest = better(best, walked.best);
    // Said when nothing else won, or when the refused record ranks above the
    // winner: a readable record wins on its own terms only when it is the
    // newer one. "The broken one is simply older" was assumed, not checked,
    // and a seller whose republish was refused saw the old look in silence.
    const newerThanWinner = (refused: ManifestRank | undefined): boolean =>
        manifest === undefined ||
        (refused !== undefined && compareManifestRank(refused, manifest) > 0);
    const unreadable = broken.seen && newerThanWinner(broken.brokenBest);
    const unaddressed = broken.unaddressed && newerThanWinner(broken.unaddressedBest);
    return {
        manifest,
        truncated: walked.truncated,
        unreadable,
        unaddressed,
        refusedNewer: manifest !== undefined && (unreadable || unaddressed),
    };
}

/**
 * Remember the highest-ranking refused record of a kind, so the walk can say
 * whether what it refused is newer than what won. Settled records only — a
 * record that is unmined and unfinalized never ranks, as `pickManifestWinner`
 * never lets one win.
 */
function noteRefused(
    flags: WalkFlags,
    key: 'brokenBest' | 'unaddressedBest',
    tx: ChainTx,
): void {
    if (tx.block?.height === undefined && tx.isFinal !== true) {
        return;
    }
    const rank: ManifestRank = {
        height: tx.block?.height,
        isFinal: tx.isFinal === true,
        txid: tx.txid,
        ...(typeof tx.timeFirstSeen === 'number' && tx.timeFirstSeen > 0
            ? { firstSeen: tx.timeFirstSeen }
            : {}),
    };
    const held = flags[key];
    if (held === undefined || compareManifestRank(rank, held) > 0) {
        flags[key] = rank;
    }
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
    broken: WalkFlags,
    addrFirstPage?: Promise<HistoryPage>,
): Promise<{ best?: LoadedManifest; truncated: boolean }> {
    const addrEp = chronik.address(address);
    const lokadEp = chronik.lokadId(STL1_HEX);
    const [addrPage, lokadPage] = await Promise.all([
        addrFirstPage ?? addrEp.history(0, HISTORY_PAGE_SIZE),
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
    broken: WalkFlags,
): LoadedManifest | undefined {
    let out = best;
    for (const tx of page.txs) {
        try {
            out = better(out, recordFromTx(tx, hash, broken));
        } catch {
            // Ours, signed by this stall, and undecodable.
            broken.seen = true;
            noteRefused(broken, 'brokenBest', tx);
        }
    }
    return out;
}

/**
 * What a walk found besides a winner: an undecodable record, or one refused
 * only by the output test — and the highest rank of each, so the caller can
 * say whether the refused record is newer than what won.
 */
type WalkFlags = {
    seen: boolean;
    unaddressed: boolean;
    brokenBest?: ManifestRank;
    unaddressedBest?: ManifestRank;
};

function recordFromTx(tx: ChainTx, hash: string, flags?: WalkFlags): LoadedManifest | undefined {
    if (!txSignedByStall(tx, hash)) {
        return undefined;
    }
    const decoded = firstStl1(tx);
    if (decoded === undefined) {
        return undefined;
    }
    if (!recordAddressedToStall(tx, hash)) {
        // Signed here, but not made from this stall's publish link. Not this
        // stall's record — and said, when nothing else wins.
        if (flags !== undefined) {
            flags.unaddressed = true;
            noteRefused(flags, 'unaddressedBest', tx);
        }
        return undefined;
    }
    return {
        ...decoded,
        height: tx.block?.height,
        isFinal: tx.isFinal === true,
        txid: tx.txid,
        // The in-block tiebreak. Only the node's own first sighting: the
        // block's timestamp is one value for every record in it.
        ...(typeof tx.timeFirstSeen === 'number' && tx.timeFirstSeen > 0
            ? { firstSeen: tx.timeFirstSeen }
            : {}),
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

/**
 * Does this transaction pay the stall itself exactly `DUST_SATS`? The stall's
 * own publish link does (`publishBip21`, amount composed from the same
 * constant), so a record that does not was not made from it. **Exactly**
 * `DUST_SATS`, never "any output to the stall": change goes back to the
 * signer too, so a replay — a stranger signing this stall's link, dust to
 * this stall and change to themselves — would pass an "any" test on their
 * own stall and fails this one. Absent `sats` is "not addressed": chronik
 * always carries the value, and a node that omitted it refuses a record
 * rather than admitting a spoof.
 *
 * This is a mistake filter, not an attacker filter: it makes signing
 * somebody else's publish link produce a record no stall accepts, and it
 * does nothing against a wallet that composes its own record naming another
 * stall. Applies to `STL1` and `STLD` records only — a genesis is not a
 * record, and `decisionFromGenesisTx` keeps the input test alone.
 */
export function recordAddressedToStall(tx: ChainTx, hash: string): boolean {
    for (const output of tx.outputs) {
        if (isP2shOutputScript(output.outputScript)) {
            continue;
        }
        if (p2pkhHashFromOutputScript(output.outputScript) !== hash) {
            continue;
        }
        if (typeof output.sats === 'bigint' && output.sats === DUST_SATS) {
            return true;
        }
    }
    return false;
}

/** Both, or it is nobody's record: the input signed by the stall, the dust paid back to it. */
export function recordIsStalls(tx: ChainTx, hash: string): boolean {
    return txSignedByStall(tx, hash) && recordAddressedToStall(tx, hash);
}

/** The three-valued answer a row is labelled with — one place, the readers' own predicates. */
export function recordAuthorityOf(tx: ChainTx, hash: string): RecordAuthority {
    if (!txSignedByStall(tx, hash)) {
        return 'unsigned';
    }
    return recordAddressedToStall(tx, hash) ? 'stalls' : 'unaddressed';
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
