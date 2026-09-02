/**
 * The OBS "sticker" source: the smallest Browser Source that holds the
 * overlay with its 60px insets, so a streamer drags and scales it like a
 * sticker instead of dropping in a full 1920×1080 canvas.
 *
 * Width is the one number the stylesheet implies (252px plate + 60 + 60).
 * The heights hold the tallest card any look paints at 1× — Neo's three-line
 * name included — and the layout probe asserts exactly that
 * (`the-sticker-height-fits-the-tallest-card`), so a value here changes only
 * with a measurement, never by hand. The studio's recipe quotes these.
 */
export const OBS_STICKER_WIDTH = 372;
/** Corner card (bottom-right anchored): the card's box plus both insets. */
export const OBS_STICKER_HEIGHT = 800;
/** Side rail (mid-right, centred): the rail's box plus both insets. */
export const OBS_RAIL_STICKER_HEIGHT = 580;
