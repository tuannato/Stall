/**
 * A private look's og card (step 8j, public half; STEP-8-PLAN §4.9).
 *
 * A look's repository may hold `<slug>/og.png`: the card an unfurler would
 * show for a stall wearing it. A build that carries the look emits it, byte
 * for byte as git holds it, at `og/look-<id as two lower-case hex digits>.png`
 * (`ogCardPath`); a look with no `og.png` emits nothing. **Nothing names the
 * card yet**: the edge (`functions/`) still answers Modern's card for every
 * id in step 8 (`ogImageFor`, `embedImagePath`), and step 9 makes that
 * change on purpose (`the-edge-never-names-a-look-card`).
 *
 * The rules, checked before the build reads a byte of Vite (`ogCardProblems`),
 * by the dist check over what was written, and by
 * `each-private-look-card-has-a-ceiling`:
 * - a PNG: the eight-byte signature, then an IHDR chunk first;
 * - 1200 x 630 from that IHDR (`OG_CARD_WIDTH`, `OG_CARD_HEIGHT`, the size
 *   the shipped cards under `public/og/` are);
 * - at most `OG_CARD_MAX_BYTES` (250,000). **Figure and source**: the owner's
 *   approval on 2026-09-26 of about 250 KB for a card, re-homed to this
 *   constant by STEP-8-PLAN §4.9. It is a weight nobody's page pays: only an
 *   unfurler fetches the card, so it is filed in no visitor's bucket
 *   (`weight-buckets.mjs`, `cards`).
 * Node built-ins only.
 */

/** The card's width in pixels. */
export const OG_CARD_WIDTH = 1200;
/** The card's height in pixels. */
export const OG_CARD_HEIGHT = 630;
/** The most bytes a card may be: the owner's ~250 KB (2026-09-26), re-homed by STEP-8-PLAN §4.9. */
export const OG_CARD_MAX_BYTES = 250_000;
/** A built card's path, whatever the look: `og/look-<two hex digits>.png`. */
export const OG_CARD_PATH = /^og\/look-[0-9a-f]{2}\.png$/;

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Where a built look's card stands in `dist`: `og/look-04.png` for id 4. */
export function ogCardPath(id) {
    if (!Number.isInteger(id) || id < 0 || id > 0xff) {
        throw new RangeError(`an og card path takes a look id in 0..255, not ${id}`);
    }
    return `og/look-${id.toString(16).padStart(2, '0')}.png`;
}

/** Every problem with `bytes` as a card, or none. */
export function ogCardProblems(bytes) {
    const problems = [];
    if (bytes.length > OG_CARD_MAX_BYTES) {
        problems.push(`is ${bytes.length} bytes, over the ${OG_CARD_MAX_BYTES}-byte ceiling`);
    }
    if (bytes.length < 33 || !bytes.subarray(0, 8).equals(SIGNATURE) || bytes.subarray(12, 16).toString('latin1') !== 'IHDR' || bytes.readUInt32BE(8) !== 13) {
        problems.push('is not a PNG (no signature and IHDR)');
        return problems;
    }
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    if (width !== OG_CARD_WIDTH || height !== OG_CARD_HEIGHT) {
        problems.push(`is ${width}x${height}, where a card is ${OG_CARD_WIDTH}x${OG_CARD_HEIGHT}`);
    }
    return problems;
}
