import { SHIPPED_ATTACHMENTS, attachmentByTokenId } from './attachments';
import { SHIPPED_THEMES } from './theme';
import type { StallOffer, TokenMeta } from './state';

/**
 * The shipped catalogue's answer, which is the one production uses. Injectable
 * so a test can describe a shop without minting a token — the same seam
 * `groupOf` already is.
 */
export type DecorPlace = {
    /** The look this decoration fits, named by the shipped table. */
    readonly label: string;
    /** Its position in the catalogue, which is the order the runs print in. */
    readonly order: number;
};

function defaultLookOf(tokenId: string): DecorPlace | undefined {
    const row = attachmentByTokenId(tokenId);
    if (row === undefined) {
        return undefined;
    }
    const label = SHIPPED_THEMES.find((t) => t.id === row.themeId)?.label;
    if (label === undefined) {
        return undefined;
    }
    return { label, order: SHIPPED_ATTACHMENTS.indexOf(row) };
}

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
export type Category = 'etoken' | 'nft' | 'decor' | 'unsorted';

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

/**
 * The category one row is filed under — the catalogue's override included.
 *
 * Factored out of `sectionsOf` so the editor and, later, the painter ask
 * exactly the question the sections answer. The catalogue is asked first and
 * by token id, so a decoration that is fungible on chain is still a
 * decoration; a token that merely shares a ticker with one is not.
 */
export function rowCategoryOf(
    tokenId: string,
    meta: TokenMeta | undefined,
    lookOf: (tokenId: string) => DecorPlace | undefined = defaultLookOf,
): Category {
    return lookOf(tokenId) === undefined ? categoryOf(meta) : 'decor';
}

/**
 * Whether a seller may put a price on this row (STLD tag 0x02).
 *
 * **Affirmative, never a suppression list.** `categoryOf` answers `unsorted`
 * whenever the metadata has not arrived or its read failed, so a predicate
 * shaped as "not an NFT" would let a permanent record be written about a token
 * this page knows nothing about. Fungible, or no field at all.
 *
 * Price is per **whole token**, and quantity is whole tokens — which is the
 * other half of why an NFT is excluded rather than merely awkward.
 */
export function isPriceable(
    tokenId: string,
    meta: TokenMeta | undefined,
    lookOf: (tokenId: string) => DecorPlace | undefined = defaultLookOf,
): boolean {
    return rowCategoryOf(tokenId, meta, lookOf) === 'etoken';
}

/** True when this row is an NFT that was minted from a group. */
export function isNftChild(meta: TokenMeta | undefined): boolean {
    return meta?.tokenType?.type === 'SLP_TOKEN_TYPE_NFT1_CHILD';
}

/**
 * The order sections are printed in. Unsorted is last: it is the smallest and
 * the least interesting, and putting our own failure above a seller's stock
 * would be a strange way to run their shop.
 *
 * **Decorations sit below a seller's own stock, not above it.** On the shop
 * that sells them the order does not show at all — one section prints no
 * heading — so the only place this order is visible is somebody else's stall
 * reselling one, and there their own goods lead.
 */
export const CATEGORY_ORDER: readonly Category[] = [
    'etoken',
    'nft',
    'decor',
    'unsorted',
] as const;

export type OfferGroup = {
    /**
     * The NFT group this run belongs to, when every row in it shares one.
     * `undefined` for eTokens, for NFTs whose group is unknown, and for the
     * unsorted section.
     */
    readonly groupTokenId?: string;
    /**
     * A run's heading when it is not an NFT collection — today, the look a
     * decoration is for. Text this app ships, never chain-supplied: a heading
     * built from a seller's own string is a heading anyone can write.
     */
    readonly groupLabel?: string;
    readonly offers: readonly StallOffer[];
};

export type CategorySection = {
    readonly category: Category;
    readonly groups: readonly OfferGroup[];
};

/**
 * Split already-ordered offers into sections, and inside two of them into runs:
 * NFTs by the collection they were minted from, decorations by the look they
 * fit.
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
    lookOf: (tokenId: string) => DecorPlace | undefined = defaultLookOf,
): CategorySection[] {
    const buckets = new Map<Category, StallOffer[]>();
    for (const offer of offers) {
        // One decision, shared with `isPriceable`: the catalogue is asked
        // first, and it is asked by token id.
        const category = rowCategoryOf(offer.tokenId, tokens.get(offer.tokenId), lookOf);
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
        let groups: OfferGroup[];
        if (category === 'nft') {
            groups = runsByGroup(rows, tokens, groupOf);
        } else if (category === 'decor') {
            /*
             * The one place this module orders anything, and it is deliberate.
             * Everywhere else the caller's order is preserved exactly. But
             * `compareOffers` sorts by token id, and a genesis txid is random
             * with respect to which look a decoration fits — so the shipped
             * catalogue arrived interleaved and every run was one row long,
             * which is worse than no runs at all. These rows are ours and the
             * catalogue is their order. Stable, so two offers of one token keep
             * the price order `compareOffers` gave them.
             */
            groups = runsByLook(
                [...rows].sort(
                    (a, b) =>
                        (lookOf(a.tokenId)?.order ?? 0) - (lookOf(b.tokenId)?.order ?? 0),
                ),
                lookOf,
            );
        } else {
            groups = [{ offers: rows }];
        }
        out.push({ category, groups });
    }
    return out;
}

/**
 * Consecutive decoration rows for one look become one run, the same way an NFT
 * collection does — consecutive rather than gathered, because the incoming
 * order is the caller's and re-sorting here would silently override it.
 *
 * This is what gives the shop that sells decorations its structure: it sells
 * nothing else, so it has one section and prints no section heading, and these
 * run headings are the only dividers on the page.
 */
function runsByLook(
    rows: readonly StallOffer[],
    lookOf: (tokenId: string) => DecorPlace | undefined,
): OfferGroup[] {
    const runs: OfferGroup[] = [];
    let current: StallOffer[] = [];
    let currentLook: string | undefined;
    let started = false;

    for (const offer of rows) {
        const look = lookOf(offer.tokenId)?.label;
        if (started && look === currentLook) {
            current.push(offer);
            continue;
        }
        if (started) {
            runs.push({ groupLabel: currentLook, offers: current });
        }
        current = [offer];
        currentLook = look;
        started = true;
    }
    if (started) {
        runs.push({ groupLabel: currentLook, offers: current });
    }
    return runs;
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
