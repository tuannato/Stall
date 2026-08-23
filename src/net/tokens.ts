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
            return {
                tokenId,
                name: info.genesisInfo.tokenName,
                ticker: info.genesisInfo.tokenTicker,
                decimals: info.genesisInfo.decimals,
            };
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
