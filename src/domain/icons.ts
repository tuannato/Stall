/**
 * Where a token icon comes from.
 *
 * Our own Worker, not the upstream CDN: the shape eCash-Live proved, written
 * here rather than copied. It sits on a sibling hostname so that a dead icon
 * service cannot take the shop with it — every row already paints `initials()`
 * and keeps them when no image arrives.
 *
 * The id is gated the same way `cashtabTokenUrl` gates one, because the same
 * rule applies: a genesis field is a string the minter chose, and `GenesisInfo`
 * carries a `url` that is a homepage. Nothing from genesis reaches an image
 * source — only a token id that already looks like a token id.
 */
export const ICON_HOST = 'https://icons.stall.cash';

/** The one size the Worker serves. A wider allowlist is proxy surface we do not use. */
export const ICON_SIZE = 64;

const TOKEN_ID = /^[0-9a-f]{64}$/;

export function iconUrl(tokenId: string): string | undefined {
    const id = tokenId.toLowerCase();
    if (!TOKEN_ID.test(id)) {
        return undefined;
    }
    return `${ICON_HOST}/icon/${ICON_SIZE}/${id}.png`;
}
