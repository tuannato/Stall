import type { StallOffer, TokenMeta } from './state';

/**
 * Which section of the stall a row belongs in.
 *
 * **Three, not two.** Splitting a shop into "eTokens" and "NFTs" needs a type,
 * and the type can be missing for a reason that is ours: `loadTokenMeta` uses
 * `Promise.allSettled` and keeps only the fulfilled reads, so an offer whose
 * `chronik.token()` call failed has no `TokenMeta` at all. Sorting that row
 * into either bucket would print our failure as a fact about the seller's
 * inventory — the collapse CLAUDE.md §4 names: "three layers, not one enum".
 *
 * The third bucket is also where a type we do not recognise goes. chronik
 * legitimately answers `SLP_TOKEN_TYPE_UNKNOWN` for a protocol version this
 * build predates, and inventing a category for it would be a claim we cannot
 * support. `tokenTypeLabel` already passes unknown strings through rather than
 * renaming them, and this follows that.
 */
export type Category = 'etoken' | 'nft' | 'unsorted';

/**
 * NFT1 group is filed with the NFTs, not with the fungibles. A group token is
 * the collection itself — the thing an NFT is minted from — so a buyer looking
 * for NFTs is looking for it, and a buyer looking for a currency is not.
 */
const NFT_TYPES = new Set(['SLP_TOKEN_TYPE_NFT1_GROUP', 'SLP_TOKEN_TYPE_NFT1_CHILD']);

/** Types this build knows are fungible. Everything else is not guessed at. */
const ETOKEN_TYPES = new Set([
    'SLP_TOKEN_TYPE_FUNGIBLE',
    'SLP_TOKEN_TYPE_MINT_VAULT',
    'ALP_TOKEN_TYPE_STANDARD',
]);

export function categoryOf(meta: TokenMeta | undefined): Category {
    const type = meta?.tokenType?.type;
    if (type === undefined || type === '') {
        // No metadata: either it has not arrived yet or the read failed. Both
        // are ours, and neither is a statement about what the seller sells.
        return 'unsorted';
    }
    if (NFT_TYPES.has(type)) {
        return 'nft';
    }
    if (ETOKEN_TYPES.has(type)) {
        return 'etoken';
    }
    return 'unsorted';
}

/** True when this row is an NFT that was minted from a group. */
export function isNftChild(meta: TokenMeta | undefined): boolean {
    return meta?.tokenType?.type === 'SLP_TOKEN_TYPE_NFT1_CHILD';
}

/**
 * The order sections are printed in. Unsorted is last: it is the smallest and
 * the least interesting, and putting our own failure above a seller's stock
 * would be a strange way to run their shop.
 */
export const CATEGORY_ORDER: readonly Category[] = ['etoken', 'nft', 'unsorted'] as const;

export type OfferGroup = {
    /**
     * The NFT group this run belongs to, when every row in it shares one.
     * `undefined` for eTokens, for NFTs whose group is unknown, and for the
     * unsorted section.
     */
    readonly groupTokenId?: string;
    readonly offers: readonly StallOffer[];
};

export type CategorySection = {
    readonly category: Category;
    readonly groups: readonly OfferGroup[];
};

/**
 * Split already-ordered offers into sections, and inside the NFT section into
 * runs that share a parent.
 *
 * Ordering is the caller's job (`compareOffers`) and is preserved exactly: this
 * only decides where the dividers go. Nothing is priced, counted into a
 * headline figure, or merged — each row keeps its own covenant and its own
 * asked amount, because a heading that carried a price would be naming a number
 * no covenant encodes.
 */
export function sectionsOf(
    offers: readonly StallOffer[],
    tokens: ReadonlyMap<string, TokenMeta>,
    groupOf: (tokenId: string) => string | undefined = () => undefined,
): CategorySection[] {
    const buckets = new Map<Category, StallOffer[]>();
    for (const offer of offers) {
        const category = categoryOf(tokens.get(offer.tokenId));
        const list = buckets.get(category);
        if (list === undefined) {
            buckets.set(category, [offer]);
        } else {
            list.push(offer);
        }
    }

    const out: CategorySection[] = [];
    for (const category of CATEGORY_ORDER) {
        const rows = buckets.get(category);
        if (rows === undefined || rows.length === 0) {
            continue;
        }
        out.push({
            category,
            groups: category === 'nft' ? runsByGroup(rows, tokens, groupOf) : [{ offers: rows }],
        });
    }
    return out;
}

/**
 * Consecutive NFT rows sharing a parent become one run. Consecutive, not
 * gathered: the incoming order is the caller's and re-sorting here would
 * silently override it. Offers are already grouped by token id, and an NFT's
 * token id is unique to it, so rows of one collection land together whenever
 * their ids do — and when they do not, the extra heading is honest about it
 * rather than reordering the shop to hide it.
 */
function runsByGroup(
    rows: readonly StallOffer[],
    tokens: ReadonlyMap<string, TokenMeta>,
    groupOf: (tokenId: string) => string | undefined,
): OfferGroup[] {
    const runs: OfferGroup[] = [];
    let current: StallOffer[] = [];
    let currentGroup: string | undefined;
    let started = false;

    for (const offer of rows) {
        const group = isNftChild(tokens.get(offer.tokenId))
            ? groupOf(offer.tokenId)
            : undefined;
        if (started && group === currentGroup) {
            current.push(offer);
            continue;
        }
        if (started) {
            runs.push({ groupTokenId: currentGroup, offers: current });
        }
        current = [offer];
        currentGroup = group;
        started = true;
    }
    if (started) {
        runs.push({ groupTokenId: currentGroup, offers: current });
    }
    return runs;
}
