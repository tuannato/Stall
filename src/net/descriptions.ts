import {
    decodeDescriptionPushes,
    STLD_HEX,
    type TokenDescription,
} from '../domain/description';
import { pickManifestWinner, type ManifestRank } from '../domain/manifest';
import { HISTORY_PAGE_SIZE, MAX_HISTORY_PAGES, type ChainTx, type HistoryPage } from './chain';
import type { ManifestChronik } from './chain';
import { txSignedByStall } from './manifest';
import { opReturnPushes } from './script';

/**
 * The seller's own words about the tokens they list.
 *
 * **Its own walk, not the manifest's.** Folding this into `loadManifest` looked
 * free and finds nothing. `walkShorter` takes whichever index is shorter, and
 * `numTxs` for the STL1 lokad is smaller than any address with a transaction in
 * it — so today every stall walks the STL1 index, which by construction holds
 * no STLD transaction: ABC reads a transaction's lokad id from its first output
 * alone, so one transaction is indexed under one lokad. Descriptions would have
 * been absent for every seller, and silently.
 *
 * **And the shorter-index rule is spam resistance, not only speed.** An address
 * walk stops at `MAX_HISTORY_PAGES`, and anyone can pad a seller's address
 * history for dust. Walking the address unconditionally would hand an attacker
 * a cheap way to erase a seller's descriptions. So this asks the same question
 * the manifest asks, of its own pair of indexes: one extra head request, and
 * the STLD index is the cheap branch until it is not.
 *
 * Never throws. A description is worth much less than a shop that paints.
 */
export type LoadedDescription = TokenDescription & ManifestRank;

export type DescriptionLookup = {
    /** tokenId → the winning text. A token whose winner is a removal is absent. */
    readonly descriptions: ReadonlyMap<string, string>;
    /**
     * tokenId → the seller's shelf heading (STLD tag 0x01). Read from the
     * same winning record as the text — including a tombstone, which is how
     * "no words, shelved" travels — so the two can never come from two
     * different records for one token.
     */
    readonly shelves: ReadonlyMap<string, string>;
    /**
     * Tokens whose record we could not read. Distinct from absent: absent means
     * the seller wrote none, this means we failed. A caller must not print the
     * first when it holds the second.
     */
    readonly unreadable: ReadonlySet<string>;
    /**
     * The walk stopped at its cap, so a token with no entry here may still have
     * a description we never reached. Nothing may render "no description" for
     * any token while this is true.
     */
    readonly truncated: boolean;
};

const EMPTY: DescriptionLookup = {
    descriptions: new Map(),
    shelves: new Map(),
    unreadable: new Set(),
    truncated: false,
};

export async function loadDescriptions(
    chronik: ManifestChronik,
    seller: { address: string; hash: string },
    /** Same contract as `loadManifest`'s: the address head request only. */
    addrFirstPage?: Promise<HistoryPage>,
): Promise<DescriptionLookup> {
    try {
        return await walk(chronik, seller.address, seller.hash, addrFirstPage);
    } catch {
        // The offers are the shop. A failed description read is a shop with no
        // descriptions, never a shop that did not paint.
        return EMPTY;
    }
}

async function walk(
    chronik: ManifestChronik,
    address: string,
    hash: string,
    addrFirstPage?: Promise<HistoryPage>,
): Promise<DescriptionLookup> {
    const addrEp = chronik.address(address);
    const lokadEp = chronik.lokadId(STLD_HEX);
    const [addrPage, lokadPage] = await Promise.all([
        addrFirstPage ?? addrEp.history(0, HISTORY_PAGE_SIZE),
        lokadEp.history(0, HISTORY_PAGE_SIZE),
    ]);

    // Same rule as the manifest: walk whichever index is shorter. The STLD
    // index is global and starts empty, so it is the cheap branch for a long
    // time — and when it outgrows a seller's address history, the address
    // branch takes over, which is what keeps a flooded address readable.
    const useAddr = addrPage.numTxs <= lokadPage.numTxs;
    const first = useAddr ? addrPage : lokadPage;
    const rest = useAddr ? addrEp : lokadEp;

    const total = Math.max(first.numPages, 1);
    const pages = Math.min(total, MAX_HISTORY_PAGES);
    const found = new Map<string, LoadedDescription[]>();
    const unreadable = new Set<string>();
    const ambiguous = new Set<string>();

    collectPage(first, hash, found, unreadable, ambiguous);
    for (let page = 1; page < pages; page += 1) {
        collectPage(
            await rest.history(page, HISTORY_PAGE_SIZE),
            hash,
            found,
            unreadable,
            ambiguous,
        );
    }

    const descriptions = new Map<string, string>();
    const shelves = new Map<string, string>();
    for (const [tokenId, records] of found) {
        // Two readable records for one token in one transaction cannot be
        // ranked apart — same txid, same height — so which one wins is where
        // the wallet happened to put them. That is not a record to show; the
        // token is not answered at all.
        if (ambiguous.has(tokenId)) {
            continue;
        }
        // A record we could not read does **not** remove one we could. It is
        // our failure, and letting it delete what a seller published is §4's
        // empty-versus-unreachable mistake — the reason a tombstone and an
        // unreadable record are separate kinds in the first place. The token
        // stays in `unreadable` as well, so a caller can say a newer record
        // exists that this page could not read: an undecodable record cannot be
        // ranked, so we do not know whether it supersedes this one.
        const winner = pickManifestWinner(records);
        // No winner means every record for this token is unmined and
        // unfinalised — one node's opinion, which §5 says never wins.
        if (winner === undefined) {
            continue;
        }
        // The shelf rides whichever record won — a tombstone included, which
        // is how "no words, shelved" travels as one record.
        if (winner.shelf !== undefined) {
            shelves.set(tokenId, winner.shelf);
        }
        if (winner.kind === 'tombstone') {
            continue;
        }
        descriptions.set(tokenId, winner.text);
    }
    return { descriptions, shelves, unreadable, truncated: total > pages };
}

function collectPage(
    page: HistoryPage,
    hash: string,
    found: Map<string, LoadedDescription[]>,
    unreadable: Set<string>,
    ambiguous: Set<string>,
): void {
    for (const tx of page.txs) {
        collectTx(tx, hash, found, unreadable, ambiguous);
    }
}

/**
 * Every description this transaction carries.
 *
 * **All of them, unlike `firstStl1`.** A stall has one name, so two STL1
 * outputs are an ambiguity that must be refused. Descriptions are per token, so
 * several outputs for *different* tokens is the only way to publish several in
 * one transaction, and refusing that would be refusing the feature. Two for the
 * *same* token is the ambiguity: nothing in the transaction says which is meant,
 * and output order is where a wallet happened to put them. That token is
 * unreadable; the rest of the transaction is fine.
 *
 * Deliberately not folded into the manifest's `recordFromTx`: `firstStl1`
 * *throws*, and both of its call sites catch around the whole record — so a
 * transaction with two STL1 outputs would have taken its good descriptions down
 * with it.
 */
function collectTx(
    tx: ChainTx,
    hash: string,
    found: Map<string, LoadedDescription[]>,
    unreadable: Set<string>,
    ambiguous: Set<string>,
): void {
    if (!txSignedByStall(tx, hash)) {
        // Anyone can put an STLD output on chain naming anyone's token. Without
        // this, anyone can write a description *for* a seller.
        return;
    }
    const seenHere = new Set<string>();
    for (const output of tx.outputs) {
        const pushes = opReturnPushes(output.outputScript);
        if (pushes === undefined || !isOurs(pushes)) {
            continue;
        }
        const record = decodeDescriptionPushes(pushes);
        if (record === undefined) {
            // Ours, signed by this stall, and undecodable. Name the token it
            // was about if the id survived, so the screen can say we failed
            // rather than that the seller wrote nothing.
            const tokenId = tokenIdOf(pushes);
            if (tokenId !== undefined) {
                unreadable.add(tokenId);
            }
            continue;
        }
        if (seenHere.has(record.tokenId)) {
            // Ambiguous, not unreadable: both decoded perfectly and neither is
            // newer than the other. Ranking cannot separate them.
            ambiguous.add(record.tokenId);
            unreadable.add(record.tokenId);
            continue;
        }
        seenHere.add(record.tokenId);
        const list = found.get(record.tokenId);
        const loaded: LoadedDescription = {
            ...record,
            height: tx.block?.height,
            isFinal: tx.isFinal === true,
            txid: tx.txid,
        };
        if (list === undefined) {
            found.set(record.tokenId, [loaded]);
        } else {
            list.push(loaded);
        }
    }
}

function isOurs(pushes: Uint8Array[]): boolean {
    const first = pushes[0];
    if (first === undefined || first.length !== 4) {
        return false;
    }
    return toHexLower(first) === STLD_HEX;
}

/** The token an undecodable record was about, when its id push survived. */
function tokenIdOf(pushes: Uint8Array[]): string | undefined {
    const id = pushes[1];
    return id !== undefined && id.length === 32 ? toHexLower(id) : undefined;
}

function toHexLower(bytes: Uint8Array): string {
    let out = '';
    for (const b of bytes) {
        out += b.toString(16).padStart(2, '0');
    }
    return out;
}
