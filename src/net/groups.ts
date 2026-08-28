import type { TokenMeta } from '../domain/state';

/**
 * The collection an NFT was minted from.
 *
 * **This costs a request per NFT, and that is why it is capped.** The parent id
 * is not on `chronik.token()` — `TokenInfo` carries `tokenId`, `tokenType` and
 * `genesisInfo`, and nothing else. `groupTokenId` lives on `TokenEntry`, which
 * appears on a *transaction*. An NFT's token id is its genesis txid, so the
 * lookup is `chronik.tx(tokenId)` and then reading the entry for that token.
 *
 * So a stall with twenty NFTs would ask twenty more questions on the paint
 * path, on top of the `token()` call each already makes. `MAX_GROUP_LOOKUPS`
 * bounds it, and a stall past the cap simply shows its NFTs ungrouped —
 * every other walk in this codebase is capped and says so rather than
 * answering from half the data (§5), and this is the same bargain.
 *
 * A failure is silence, never a wrong parent: the row falls back to no group.
 */
export const MAX_GROUP_LOOKUPS = 24;

/** `chronik.tx()` concatenates its argument into a request path unchecked. */
const TXID = /^[0-9a-f]{64}$/;

export type GroupChronik = {
    tx(txid: string): Promise<{
        tokenEntries?: readonly {
            tokenId: string;
            groupTokenId?: string;
        }[];
    }>;
};

export type GroupLookup = {
    /** tokenId -> the group it was minted from, for the ones we could read. */
    readonly groups: ReadonlyMap<string, string>;
    /** True when the cap stopped us short, so the shop is grouped in part. */
    readonly truncated: boolean;
};

/**
 * Read the parent of each NFT child in `tokenIds`. Never throws and never
 * rejects: an ungrouped NFT is a smaller loss than a stall that fails to paint,
 * and the offer book does not depend on any of this.
 */
export async function loadNftGroups(
    chronik: GroupChronik,
    tokenIds: readonly string[],
    isChild: (tokenId: string) => boolean,
): Promise<GroupLookup> {
    const wanted: string[] = [];
    const seen = new Set<string>();
    for (const id of tokenIds) {
        // Gated as 64 hex before it reaches a request path, the same discipline
        // `iconUrl` uses — `verifyTxid` sits unused in chronik's own package.
        if (seen.has(id) || !TXID.test(id) || !isChild(id)) {
            continue;
        }
        seen.add(id);
        wanted.push(id);
    }

    const truncated = wanted.length > MAX_GROUP_LOOKUPS;
    const asked = wanted.slice(0, MAX_GROUP_LOOKUPS);
    const groups = new Map<string, string>();

    const settled = await Promise.allSettled(
        asked.map(async (tokenId) => {
            const tx = await chronik.tx(tokenId);
            const entry = tx.tokenEntries?.find((e) => e.tokenId === tokenId);
            const group = entry?.groupTokenId;
            return group !== undefined && TXID.test(group)
                ? ({ tokenId, group } as const)
                : undefined;
        }),
    );
    for (const result of settled) {
        if (result.status === 'fulfilled' && result.value !== undefined) {
            groups.set(result.value.tokenId, result.value.group);
        }
    }
    return { groups, truncated };
}

/** The ids of groups we found, for a second pass that fetches their names. */
export function groupIdsToName(
    lookup: GroupLookup,
    known: ReadonlyMap<string, TokenMeta>,
): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const group of lookup.groups.values()) {
        if (!seen.has(group) && !known.has(group)) {
            seen.add(group);
            out.push(group);
        }
    }
    return out;
}
