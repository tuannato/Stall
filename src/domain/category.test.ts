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
        // Decorations sit below the seller's own goods for the same reason
        // `unsorted` sits below everything: on the shop that sells them there
        // is one section and no heading at all, so the only stall where this
        // order shows is somebody else's, reselling one.
        expect(CATEGORY_ORDER).toEqual(['etoken', 'nft', 'decor', 'unsorted']);
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

describe('a-decoration-is-known-by-its-token-id-not-its-ticker', () => {
    const MOD_A = '11'.repeat(32);
    const MOD_B = '22'.repeat(32);
    const NEO_A = '33'.repeat(32);
    const PLAIN = '44'.repeat(32);

    /** The shipped catalogue's answer, described rather than minted. */
    const lookOf = (id: string): string | undefined =>
        id === MOD_A || id === MOD_B ? 'Modern' : id === NEO_A ? 'Neo city' : undefined;

    const offerOf = (tokenId: string): StallOffer => ({
        outpoint: { txid: tokenId, outIdx: 0 },
        tokenId,
        atoms: 1n,
        variant: 'PARTIAL',
        askedSats: 1000n,
        askedAtoms: 1n,
    });

    const fungible: TokenMeta = {
        tokenId: PLAIN,
        name: 'Roasted Beans',
        // The ticker a decoration's own token would carry. A row that is not in
        // the catalogue must not be filed as one for wearing the same name.
        ticker: 'MODERN',
        decimals: 0,
        tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE' },
    };

    it('files a catalogue token under decorations, whatever its type says', () => {
        const sections = sectionsOf(
            [offerOf(MOD_A), offerOf(PLAIN)],
            new Map([[PLAIN, fungible]]),
            () => undefined,
            lookOf,
        );
        expect(sections.map((s) => s.category)).toEqual(['etoken', 'decor']);
    });

    it('does not file a token that merely shares a ticker', () => {
        const sections = sectionsOf(
            [offerOf(PLAIN)],
            new Map([[PLAIN, fungible]]),
            () => undefined,
            lookOf,
        );
        expect(sections.map((s) => s.category)).toEqual(['etoken']);
    });

    it('runs decorations by the look they fit', () => {
        const sections = sectionsOf(
            [offerOf(MOD_A), offerOf(MOD_B), offerOf(NEO_A)],
            new Map(),
            () => undefined,
            lookOf,
        );
        expect(sections).toHaveLength(1);
        expect(sections[0]!.groups.map((g) => [g.groupLabel, g.offers.length])).toEqual([
            ['Modern', 2],
            ['Neo city', 1],
        ]);
    });

    it("puts decorations below a seller's own stock", () => {
        const nft: TokenMeta = {
            tokenId: 'aa'.repeat(32),
            name: 'Pixel',
            ticker: 'PX',
            decimals: 0,
            tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_NFT1_CHILD' },
        };
        const sections = sectionsOf(
            [offerOf(MOD_A), offerOf('aa'.repeat(32)), offerOf(PLAIN)],
            new Map([
                [PLAIN, fungible],
                ['aa'.repeat(32), nft],
            ]),
            () => undefined,
            lookOf,
        );
        expect(sections.map((s) => s.category)).toEqual(['etoken', 'nft', 'decor']);
    });

    it('reads the shipped catalogue when nothing is injected', () => {
        // No token is minted yet, so the real answer for every id is "not a
        // decoration" — and that is the honest default until one exists.
        const sections = sectionsOf([offerOf(MOD_A)], new Map());
        expect(sections.map((s) => s.category)).toEqual(['unsorted']);
    });
});

