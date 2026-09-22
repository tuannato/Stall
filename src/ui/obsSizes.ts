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
/**
 * Corner card (bottom-right anchored): the card's box plus both insets.
 *
 * 871 since 2026-09-21 — 839 plus the surcharge line's 31.5px (22px at 1.25
 * with its 4px margin), rounded up; the probe's rule asserts the card fits
 * UNDER it, so this is a ceiling the tallest card fits, not a tightest
 * measurement. The tallest card is a quote card under
 * a 32-byte name on Neo, which clamps the name at three lines where the
 * other looks stop at two, carrying the seller's words line under the chip
 * (`bc-words`, one line) and, since this date, the surcharge line under the
 * figure (`bc-sur`, one line by its copy). It was 839 before the surcharge
 * and 820 before the words; a quote card is three lines taller than a
 * listing card (the chip, the words, the surcharge, and the line under its
 * rule), and the stresses stack: none alone reaches this, which is why the
 * fixture carries them all. **The cost, stated:** a Browser Source a
 * streamer typed at 839 clips the top of a surcharge card by that
 * difference until they retype the height the recipe now says.
 */
export const OBS_STICKER_HEIGHT = 871;
/** Side rail (mid-right, centred): the rail's box plus both insets. */
export const OBS_RAIL_STICKER_HEIGHT = 580;

/**
 * The ticker preset's strip, for a cropped Browser Source: the bar's box is
 * `left: 60px; right: 60px; bottom: 60px` (or `top`) on the 1920 canvas —
 * 1800 wide by the code plate's height — so the strip is the full width
 * and that height plus 60 + 60, anchored to the edge the link named. The
 * plate is 311 tall, not the design's 268: its caption is the shop's
 * ("Scan to browse this shop on your phone", the owner's D-A), three lines
 * at 18px in a 204px plate where the corner's "Scan to open" is one —
 * measured by the probe on all three looks, 2026-09-21. **Never
 * scaled down** (the recipe says so): at 0.75× the 204px code is 3.4 px a
 * module, the unreadable end of the only bracket this project has measured.
 * Asserted by the probe's sticker rule against the painted box, per preset.
 */
export const OBS_TICKER_STICKER_WIDTH = 1920;
export const OBS_TICKER_STICKER_HEIGHT = 431;
