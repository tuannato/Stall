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
        utxos(): Promise<{ utxos?: readonly { token?: { tokenId?: string } }[] }>;
    };
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
    for (const utxo of utxos) {
        const id = utxo?.token?.tokenId;
        // Only the ids we asked about: a stall's wallet is nobody's business
        // beyond the question being answered, and the set is what gets held in
        // memory for the life of the page.
        if (typeof id === 'string' && wanted.has(id)) {
            held.add(id);
        }
    }
    return held;
}
