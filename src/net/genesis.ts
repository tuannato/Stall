import type { GenesisAttribution } from '../domain/genesis';
import type { ChainTx } from './chain';
import { txSignedByStall } from './manifest';
import { p2pkhHashFromOutputScript } from './script';

/**
 * How many genesis transactions one page load may read.
 *
 * A quoted token whose ALP `authPubkey` said nothing costs one
 * `chronik.tx(tokenId)` — an SLP genesis names no minter anywhere else, and
 * there is no batch endpoint. So this is bounded the way every other lookup in
 * this codebase is (`MAX_GROUP_LOOKUPS`, the same shape): a cap, a `truncated`
 * flag, and beyond it `unknown`, which warns rather than refusing.
 */
export const MAX_GENESIS_LOOKUPS = 24;

/** `chronik.tx()` concatenates its argument into a request path unchecked. */
const TXID = /^[0-9a-f]{64}$/;

export type GenesisChronik = {
    tx(txid: string): Promise<ChainTx>;
};

export type GenesisLookup = {
    /** tokenId → what this read decided. A token we could not read is absent. */
    readonly attributions: ReadonlyMap<string, GenesisAttribution>;
    /** The cap stopped us short, so some quoted tokens stay undecided. */
    readonly truncated: boolean;
};

/**
 * Whether a token's genesis transaction belongs to this stall.
 *
 * **Two tests, either of which is enough.** An input signed by the stall is
 * the strong one. The mint output paying the stall's script is the one that
 * makes the rule usable at all: Cashtab's HD wallets fund a genesis from a
 * receive or change index, so the stall's own key never signs the input while
 * the mint still lands on its script — requiring the signature alone was a
 * permanent false negative on tokens the seller really did mint.
 *
 * The output test is forgeable: anyone can mint a token to somebody else's
 * address. What it buys them is the seller being allowed to quote it — the
 * seller still signs the `STLD` record — and a reader line that says the
 * genesis names this stall, which is exactly what it proves and no more. It
 * must never be painted as "this stall minted it"; only the signed-input
 * branch could carry that, and the reader is not told which branch decided.
 *
 * A transaction that was read and satisfies neither is decided
 * `not-attributed` — that is the answer the editor's refusal rests on. Only a
 * read that never happened leaves `unknown`.
 */
export function attributionFromGenesisTx(
    tx: ChainTx,
    tokenId: string,
    hash: string,
): GenesisAttribution {
    if (txSignedByStall(tx, hash)) {
        return 'attributed';
    }
    for (const output of tx.outputs) {
        // The output has to carry *this* token: without the token field the
        // check degrades to "any output", and any stranger's genesis that
        // happened to pay the stall a dust output would read as the seller's.
        if (output.token?.tokenId !== tokenId) {
            continue;
        }
        if (p2pkhHashFromOutputScript(output.outputScript) === hash) {
            return 'attributed';
        }
    }
    return 'not-attributed';
}

/**
 * Read the genesis of each token in `tokenIds` and decide whose it is.
 *
 * Never throws and never rejects: a quote whose genesis this page could not
 * read still paints, warned rather than refused, and the offer book does not
 * depend on any of this. A token id is its genesis txid for SLP, ALP and NFT1
 * children alike, so the lookup is one `chronik.tx(tokenId)`.
 */
export async function loadGenesisAttribution(
    chronik: GenesisChronik,
    tokenIds: readonly string[],
    /** The stall's hash160, as `txSignedByStall` and the scripts speak it. */
    hash: string,
): Promise<GenesisLookup> {
    const wanted: string[] = [];
    const seen = new Set<string>();
    for (const id of tokenIds) {
        // Gated as 64 lowercase hex before it reaches a request path, the same
        // discipline `iconUrl` and `loadNftGroups` use — `verifyTxid` sits
        // unused in chronik's own package.
        if (seen.has(id) || !TXID.test(id)) {
            continue;
        }
        seen.add(id);
        wanted.push(id);
    }

    const truncated = wanted.length > MAX_GENESIS_LOOKUPS;
    const asked = wanted.slice(0, MAX_GENESIS_LOOKUPS);
    const attributions = new Map<string, GenesisAttribution>();

    const settled = await Promise.allSettled(
        asked.map(async (tokenId) => {
            const tx = await chronik.tx(tokenId);
            return { tokenId, state: attributionFromGenesisTx(tx, tokenId, hash) } as const;
        }),
    );
    for (const result of settled) {
        if (result.status === 'fulfilled') {
            attributions.set(result.value.tokenId, result.value.state);
        }
        // A read that failed is absent, never a decision: our own gap must not
        // be printed as a claim about who minted somebody's token.
    }
    return { attributions, truncated };
}
