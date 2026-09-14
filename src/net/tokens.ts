import type { TokenMeta } from '../domain/state';
import type { TokenChronik } from './chain';

/**
 * How many `chronik.token()` reads are in flight at once.
 *
 * One read per listed token, and a stranger can grow that number through
 * gift listings under the seller's key (CLAUDE §10): until 2026-09-14 every
 * read left at once, two hundred requests in one burst on a two-hundred-token
 * stall. A window bounds the burst without changing what paints — a busy
 * stall opens in waves — and every call site inherits it (the cold load, the
 * live path's `fillNewTokens`, the quoted-but-unlisted read, the group
 * names). PLAN § Open item 4 records why this and not "read the tail after
 * the paint": that option printed a count before the name fence could run,
 * jumped rows window by window, and left the live path unbounded.
 */
export const TOKEN_META_WINDOW = 8;

export async function loadTokenMeta(
    chronik: TokenChronik,
    tokenIds: readonly string[],
): Promise<TokenMeta[]> {
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const id of tokenIds) {
        if (seen.has(id)) {
            continue;
        }
        seen.add(id);
        unique.push(id);
    }

    const readOne = async (tokenId: string): Promise<TokenMeta> => {
            const info = await chronik.token(tokenId);
            const meta: TokenMeta = {
                tokenId,
                name: info.genesisInfo.tokenName,
                ticker: info.genesisInfo.tokenTicker,
                decimals: info.genesisInfo.decimals,
                // A homepage the minter wrote, kept as the raw string: what it
                // is allowed to become is `domain/tokenlink.ts`'s decision, and
                // it is never an image source (`genesis-url-is-not-an-image-source`).
                url: info.genesisInfo.url,
                // The minter's own claim about who minted this, kept raw: what
                // it is allowed to mean is `domain/genesis.ts`'s decision, and
                // it never reaches a screen (`auth-pubkey-is-never-painted`).
                authPubkey: info.genesisInfo.authPubkey,
            };
            const tokenType = info.tokenType;
            if (
                tokenType !== undefined &&
                tokenType.protocol !== '' &&
                tokenType.type !== ''
            ) {
                meta.tokenType = {
                    protocol: tokenType.protocol,
                    type: tokenType.type,
                };
            }
            return meta;
    };

    // The window: `TOKEN_META_WINDOW` workers pull the next id off one cursor,
    // so at most that many reads are in flight and the answers keep the input
    // order. A read that throws is dropped, exactly as `allSettled` dropped
    // it before — a token the index did not answer is not a reason to lose
    // the rest.
    const results: (TokenMeta | undefined)[] = new Array<TokenMeta | undefined>(unique.length).fill(undefined);
    let next = 0;
    const worker = async (): Promise<void> => {
        while (next < unique.length) {
            const i = next;
            next += 1;
            try {
                results[i] = await readOne(unique[i]!);
            } catch {
                // dropped
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(TOKEN_META_WINDOW, unique.length) }, worker));
    return results.filter((m): m is TokenMeta => m !== undefined);
}
