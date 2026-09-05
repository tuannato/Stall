/**
 * Which attachment tokens a stall address actually holds.
 *
 * The entitlement half of §7's rule, and it is asked **only when the manifest
 * carries a flag** — the majority who wear nothing pay nothing for this. What
 * it costs when it is asked is one round after the manifest, on the same axis
 * the page already waits on.
 *
 * Read narrowly on purpose. `chronik.address(a).utxos()` takes no page argument
 * and has no truncation signal, which is the opposite of the treatment every
 * history walk gets — so the answer is reduced to a set of token ids and the
 * whole response is never held. It is also **capped**: a set this large is a
 * shop with a very unusual wallet, and a decoration is not worth an unbounded
 * scan.
 */

export type UtxoChronik = {
    address(address: string): {
        utxos(): Promise<{
            utxos?: readonly { token?: { tokenId?: string; isMintBaton?: boolean } }[];
        }>;
    };
};

/** One utxo read, two answers: the wanted ids held, and the tokens this wallet can still mint. */
export type Holdings = {
    held: ReadonlySet<string>;
    mintedHere: ReadonlySet<string>;
};

/** More token UTXOs than this and the answer is refused rather than trusted. */
export const MAX_HELD_UTXOS = 5_000;

/**
 * The token ids this address holds, or `undefined` when the read did not
 * answer.
 *
 * `undefined` is not an empty set and nothing may collapse the two: an empty
 * set says "holds none of them", which is a statement about the seller, and a
 * failed read is a statement about us. The picker says the weaker thing.
 */
export async function loadHeldTokens(
    chronik: UtxoChronik,
    address: string,
    wanted: ReadonlySet<string>,
): Promise<ReadonlySet<string> | undefined> {
    if (wanted.size === 0) {
        return new Set();
    }
    return (await loadHoldings(chronik, address, wanted))?.held;
}

/**
 * The same read, answering both questions at once: which of the wanted ids
 * the address holds, and which tokens it holds a **mint baton** for. The
 * baton set is the one enumeration this page makes of a wallet's utxos, and
 * it is deliberately narrow: a baton is the seller's own product, not their
 * purse — it is how a freshly minted, unlisted token reaches the studio
 * without its id being pasted by hand. `undefined` when the read did not
 * answer, or answered with more utxos than this page trusts.
 */
export async function loadHoldings(
    chronik: UtxoChronik,
    address: string,
    wanted: ReadonlySet<string>,
): Promise<Holdings | undefined> {
    let answer;
    try {
        answer = await chronik.address(address).utxos();
    } catch {
        return undefined;
    }
    const utxos = answer?.utxos;
    if (!Array.isArray(utxos) || utxos.length > MAX_HELD_UTXOS) {
        return undefined;
    }
    const held = new Set<string>();
    const mintedHere = new Set<string>();
    for (const utxo of utxos) {
        const id = utxo?.token?.tokenId;
        if (typeof id !== 'string' || !/^[0-9a-f]{64}$/.test(id)) {
            continue;
        }
        // Only the ids we asked about, and the batons: a stall's wallet is
        // nobody's business beyond the two questions being answered, and
        // the sets are what gets held in memory for the life of the page.
        if (wanted.has(id)) {
            held.add(id);
        }
        if (utxo?.token?.isMintBaton === true) {
            mintedHere.add(id);
        }
    }
    return { held, mintedHere };
}
