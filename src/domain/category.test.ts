import { describe, expect, it } from 'vitest';
import { CATEGORY_ORDER, categoryOf, sectionsOf } from './category';
import type { StallOffer, TokenMeta } from './state';

const meta = (tokenId: string, type?: string): TokenMeta => ({
    tokenId,
    name: tokenId,
    ticker: 'T',
    decimals: 0,
    ...(type === undefined ? {} : { tokenType: { protocol: 'SLP', type } }),
});

const offer = (tokenId: string, outIdx = 0): StallOffer =>
    ({
        outpoint: { txid: 'ab'.repeat(32), outIdx },
        tokenId,
        atoms: 1n,
        variant: 'PARTIAL',
        askedSats: 100n,
        askedAtoms: 1n,
    }) as StallOffer;

describe('unknown-token-type-is-not-a-category', () => {
    /**
     * `loadTokenMeta` keeps only the reads that succeeded, so an offer whose
     * `chronik.token()` call failed has no metadata at all. Filing that row
     * under either heading would print our failure as a fact about the seller's
     * stock — the collapse §4 forbids. It gets its own section, named for what
     * it is.
     */
    it('sorts a missing or unrecognised type into its own bucket', () => {
        expect(categoryOf(undefined)).toBe('unsorted');
        expect(categoryOf(meta('a'))).toBe('unsorted');
        expect(categoryOf(meta('a', ''))).toBe('unsorted');
        // chronik answers this for a protocol version this build predates.
        expect(categoryOf(meta('a', 'SLP_TOKEN_TYPE_UNKNOWN'))).toBe('unsorted');
        expect(categoryOf(meta('a', 'ALP_TOKEN_TYPE_UNKNOWN'))).toBe('unsorted');
        expect(categoryOf(meta('a', 'SOMETHING_INVENTED_LATER'))).toBe('unsorted');
    });

    it('files fungibles and NFTs where a buyer would look for them', () => {
        expect(categoryOf(meta('a', 'SLP_TOKEN_TYPE_FUNGIBLE'))).toBe('etoken');
        expect(categoryOf(meta('a', 'ALP_TOKEN_TYPE_STANDARD'))).toBe('etoken');
        expect(categoryOf(meta('a', 'SLP_TOKEN_TYPE_MINT_VAULT'))).toBe('etoken');
        expect(categoryOf(meta('a', 'SLP_TOKEN_TYPE_NFT1_CHILD'))).toBe('nft');
        // The group token is the collection itself, so it belongs with them.
        expect(categoryOf(meta('a', 'SLP_TOKEN_TYPE_NFT1_GROUP'))).toBe('nft');
    });

    it('puts our own failure last, never above the seller’s stock', () => {
        expect(CATEGORY_ORDER).toEqual(['etoken', 'nft', 'unsorted']);
    });
});

describe('sections-preserve-the-order-they-were-given', () => {
    const tokens = new Map([
        ['fung', meta('fung', 'SLP_TOKEN_TYPE_FUNGIBLE')],
        ['nftA', meta('nftA', 'SLP_TOKEN_TYPE_NFT1_CHILD')],
        ['nftB', meta('nftB', 'SLP_TOKEN_TYPE_NFT1_CHILD')],
        ['lost', meta('lost')],
    ]);

    it('divides without reordering or dropping a row', () => {
        const rows = [offer('nftA'), offer('fung'), offer('lost'), offer('nftB')];
        const sections = sectionsOf(rows, tokens);
        expect(sections.map((s) => s.category)).toEqual(['etoken', 'nft', 'unsorted']);
        const painted = sections.flatMap((s) => s.groups.flatMap((g) => g.offers));
        expect(painted, 'every row still painted exactly once').toHaveLength(rows.length);
        expect(new Set(painted.map((o) => o.tokenId)).size).toBe(4);
        // Within a section the caller's order survives.
        expect(sections[1]!.groups.flatMap((g) => g.offers).map((o) => o.tokenId)).toEqual([
            'nftA',
            'nftB',
        ]);
    });

    it('omits a section nobody has anything in', () => {
        const sections = sectionsOf([offer('fung')], tokens);
        expect(sections.map((s) => s.category)).toEqual(['etoken']);
    });

    it('runs NFTs of one collection together and names no price', () => {
        const rows = [offer('nftA'), offer('nftB')];
        const groups = sectionsOf(rows, tokens, (id) =>
            id === 'nftA' || id === 'nftB' ? 'GROUP1' : undefined,
        )[0]!.groups;
        expect(groups).toHaveLength(1);
        expect(groups[0]!.groupTokenId).toBe('GROUP1');
        expect(groups[0]!.offers).toHaveLength(2);
        // A group carries an id and its rows. Nothing here is a figure: a
        // heading priced at its cheapest member would name a number no
        // covenant encodes.
        expect(Object.keys(groups[0]!)).toEqual(['groupTokenId', 'offers']);
    });

    it('keeps an ungrouped NFT out of a collection it was not minted from', () => {
        const rows = [offer('nftA'), offer('nftB')];
        const groups = sectionsOf(rows, tokens, (id) =>
            id === 'nftA' ? 'GROUP1' : undefined,
        )[0]!.groups;
        expect(groups).toHaveLength(2);
        expect(groups[0]!.groupTokenId).toBe('GROUP1');
        expect(groups[1]!.groupTokenId).toBeUndefined();
    });
});
