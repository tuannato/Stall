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
 * The three sizes the Worker serves, and nothing else: a wider allowlist is
 * proxy surface we do not use. Each is sized for the box that paints it at
 * retina density — rows are 44–58px (64px sources were visibly soft on any
 * phone), the hero is 120–140px.
 *
 * **The wall size is the shop window's cycle card, and only that.** That
 * tile is `clamp(200px, 40vh, 460px)` — one item on a television — and 256
 * upscaled into it is the softness the row size was raised to fix, two
 * doublings later and across a room. It costs ~315KB against 256's, measured
 * upstream, which is why it is not simply the new hero: `cycle` paints ONE
 * card, so one stall-window screen pays it once, while `browse` paints the
 * whole catalogue into 72–160px tiles and keeps 256. An ordinary stall never
 * asks for it at all.
 *
 * The upstream falls back to a token's original bytes when it lacks a
 * generated size, so asking bigger never turns an icon into a miss — but the
 * **Worker must be deployed before the app**, or every window tile asks a
 * route that answers 404 and paints letters (§4).
 */
export const ICON_ROW_SIZE = 128;
export const ICON_HERO_SIZE = 256;
export const ICON_WALL_SIZE = 512;
export type IconSize =
    | typeof ICON_ROW_SIZE
    | typeof ICON_HERO_SIZE
    | typeof ICON_WALL_SIZE;

const TOKEN_ID = /^[0-9a-f]{64}$/;

export function iconUrl(tokenId: string, size: IconSize = ICON_ROW_SIZE): string | undefined {
    const id = tokenId.toLowerCase();
    if (!TOKEN_ID.test(id)) {
        return undefined;
    }
    return `${ICON_HOST}/icon/${size}/${id}.png`;
}
