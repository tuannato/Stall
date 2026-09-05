/**
 * Whose wallet minted the token a quote is written on.
 *
 * A quote is the seller's own figure for an item, and the item is named by a
 * token id. A quote written on a token somebody else minted borrows that
 * token's id, its picture and whatever it stands for off-chain — so the editor
 * refuses to write a new one there and the reader says so under the row. None
 * of that is a wire rule: `STLD` tag `0x02` is unchanged, and every quote a
 * seller signed still paints.
 *
 * Three states, and the third is about this page rather than about the chain.
 * `unknown` is what a read that did not happen leaves behind — beyond a lookup
 * cap, on a walk that took the lokad branch, or after a request that failed —
 * and it warns rather than refusing, because our own gap is not a fact about
 * the seller.
 */
export type GenesisAttribution = 'attributed' | 'not-attributed' | 'unknown';

/**
 * The shape a compressed public key has, and the only shape compared here.
 *
 * `genesisInfo.authPubkey` is bytes the minter chose — chronik's own fixture
 * carries the ASCII "Token Pubkey" in that field — so it is screened before it
 * is compared and never reaches a screen. Forging it makes a token look like
 * this stall's own: the seller is still the one who signs the quote, and the
 * reader paints the claim as what it is — a genesis that names this stall —
 * never as proof of who minted, which this field cannot give.
 */
const COMPRESSED_PUBKEY = /^0[23][0-9a-f]{64}$/;

/**
 * ALP's own answer, free on metadata this page already fetched.
 *
 * Absent or malformed falls through to `unknown`, never to `not-attributed`:
 * plenty of tokens carry no such field at all, and calling those somebody
 * else's would refuse a seller their own item on the strength of a field that
 * was never written.
 */
export function attributionFromAuthPubkey(
    authPubkey: string | undefined,
    stallPubkeyHex: string,
): GenesisAttribution {
    if (authPubkey === undefined) {
        return 'unknown';
    }
    const claimed = authPubkey.toLowerCase();
    if (!COMPRESSED_PUBKEY.test(claimed)) {
        return 'unknown';
    }
    return claimed === stallPubkeyHex.toLowerCase() ? 'attributed' : 'not-attributed';
}

/**
 * One token's attribution, merged with what was already known — **monotonic**.
 *
 * A genesis is permanent, so a decided state is permanent too: `unknown` never
 * overwrites one, and one decided state never flips to the other. Without
 * that, a live re-read whose walk took the lokad branch would downgrade every
 * token this load had already attributed, and the editor would start refusing
 * quotes on the seller's own tokens a few seconds after opening.
 */
export function mergeAttribution(
    prev: GenesisAttribution | undefined,
    next: GenesisAttribution,
): GenesisAttribution {
    if (prev === undefined || prev === 'unknown') {
        return next;
    }
    return prev;
}
