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

/**
 * The two sizes the Worker serves — rows at 128, the opened card's hero at
 * 256 — and nothing else: a wider allowlist is proxy surface we do not use.
 * Sized for the boxes that paint them at retina density: rows are 44–58px
 * (64px sources were visibly soft on any phone), the hero is 120–140px.
 * 512 exists upstream but is ~315KB for one figure — measured — and the
 * upstream falls back to the original bytes when it lacks a generated
 * size, so asking bigger never turns an icon into a miss.
 */
export const ICON_ROW_SIZE = 128;
export const ICON_HERO_SIZE = 256;
export type IconSize = typeof ICON_ROW_SIZE | typeof ICON_HERO_SIZE;

const TOKEN_ID = /^[0-9a-f]{64}$/;

export function iconUrl(tokenId: string, size: IconSize = ICON_ROW_SIZE): string | undefined {
    const id = tokenId.toLowerCase();
    if (!TOKEN_ID.test(id)) {
        return undefined;
    }
    return `${ICON_HOST}/icon/${size}/${id}.png`;
}
