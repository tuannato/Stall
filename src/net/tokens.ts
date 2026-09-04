import type { TokenMeta } from '../domain/state';
import type { TokenChronik } from './chain';

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

    const settled = await Promise.allSettled(
        unique.map(async (tokenId): Promise<TokenMeta> => {
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
        }),
    );

    const out: TokenMeta[] = [];
    for (const result of settled) {
        if (result.status === 'fulfilled') {
            out.push(result.value);
        }
    }
    return out;
}
