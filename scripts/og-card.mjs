/**
 * A private look's og card (step 8j, public half; STEP-8-PLAN §4.9).
 *
 * A look's repository may hold `<slug>/og.png`: the card an unfurler would
 * show for a stall wearing it. A build that carries the look emits it, byte
 * for byte as git holds it, at `og/look-<id as two lower-case hex digits>.png`
 * (`ogCardPath`); a look with no `og.png` emits nothing. **Nothing names the
 * card yet**: the edge (`functions/`) still answers Modern's card for every
 * id in step 8 (`ogImageFor`, `embedImagePath`, held by value over every
 * reserved id), and step 9 makes that change on purpose
 * (`the-edge-never-names-a-look-card`). **Step 9 must also decide which weight
 * bucket the card belongs in**: once `embedImagePath` names it, the Studio's
 * embed sheet and every pasted widget fetch it, and the shipped cards are
 * counted in `public/` for that reason (on demand has 8,614 bytes of room).
 *
 * The card is the one private file served raw (every SVG is re-serialised),
 * so it is read whole (`ogCardProblems`, before the build reads a byte of
 * Vite, by the dist check over what was written, and by
 * `each-private-look-card-has-a-ceiling` and `an-og-card-carries-pixels-and-nothing-else`):
 * - every chunk walked, each CRC checked; only IHDR, PLTE, tRNS, IDAT, IEND
 *   and sRGB, gAMA, pHYs (`OG_CARD_CHUNKS`) — no text, EXIF, iCCP or animation
 *   chunk, so no author name or local path travels and no APNG plays;
 * - IHDR first and once, IEND last with nothing after it, the IDATs in one
 *   run, PLTE where the colour type wants one; a valid depth and colour
 *   pair, no interlace;
 * - ancillary chunks (tRNS, sRGB, gAMA, pHYs) before the first IDAT, each at
 *   most once;
 * - the IDAT data inflated, the whole of it consumed by the zlib stream (no
 *   bytes trailing it): exactly height x (1 + bytes per row) bytes, each
 *   row's filter byte 0 to 4 (the rows are all there; the pixels are not
 *   decoded or judged);
 * - 1200 x 630 from that IHDR (`OG_CARD_WIDTH`, `OG_CARD_HEIGHT`, the size
 *   the shipped cards under `public/og/` are);
 * - at most `OG_CARD_MAX_BYTES` (250,000). **Figure and source**: the owner's
 *   approval on 2026-09-26 of about 250 KB for a card, re-homed to this
 *   constant by STEP-8-PLAN §4.9. In step 8 no page pays it: only an
 *   unfurler would fetch the card, so it is filed in no visitor's bucket
 *   (`weight-buckets.mjs`, `cards`).
 * Node built-ins only.
 */

import { inflateSync } from 'node:zlib';

/** The card's width in pixels. */
export const OG_CARD_WIDTH = 1200;
/** The card's height in pixels. */
export const OG_CARD_HEIGHT = 630;
/** The most bytes a card may be: the owner's ~250 KB (2026-09-26), re-homed by STEP-8-PLAN §4.9. */
export const OG_CARD_MAX_BYTES = 250_000;
/** A built card's path, whatever the look: `og/look-<two hex digits>.png`. */
export const OG_CARD_PATH = /^og\/look-[0-9a-f]{2}\.png$/;

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The chunks a card may hold, and no others. */
export const OG_CARD_CHUNKS = Object.freeze(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND', 'sRGB', 'gAMA', 'pHYs']);

/** Valid bit depths by colour type, and each type's samples per pixel. */
const DEPTHS = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

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
    if (bytes.length < 8 || !bytes.subarray(0, 8).equals(SIGNATURE)) {
        problems.push('is not a PNG (no signature)');
        return problems;
    }
    const chunks = [];
    let at = 8;
    while (at < bytes.length) {
        if (at + 12 > bytes.length) {
            problems.push(`has a chunk cut short at byte ${at}`);
            return problems;
        }
        const length = bytes.readUInt32BE(at);
        const type = bytes.subarray(at + 4, at + 8).toString('latin1');
        if (at + 12 + length > bytes.length) {
            problems.push(`has a ${JSON.stringify(type)} chunk running past its end`);
            return problems;
        }
        const data = bytes.subarray(at + 8, at + 8 + length);
        if (crc32(bytes.subarray(at + 4, at + 8 + length)) !== bytes.readUInt32BE(at + 8 + length)) {
            problems.push(`has a ${JSON.stringify(type)} chunk with a bad CRC`);
        }
        if (!OG_CARD_CHUNKS.includes(type)) {
            problems.push(`holds a ${JSON.stringify(type)} chunk, where a card holds ${OG_CARD_CHUNKS.join(', ')} only`);
        }
        chunks.push({ type, data });
        at += 12 + length;
        if (type === 'IEND') break;
    }
    if (chunks[0]?.type !== 'IHDR' || chunks[0].data.length !== 13) {
        problems.push('does not open with its IHDR chunk');
        return problems;
    }
    if (chunks.filter((c) => c.type === 'IHDR').length > 1) problems.push('holds more than one IHDR');
    if (chunks[chunks.length - 1].type !== 'IEND') problems.push('has no IEND chunk');
    else if (at !== bytes.length) problems.push(`has ${bytes.length - at} bytes after its IEND`);
    const idat = chunks.map((c, i) => (c.type === 'IDAT' ? i : -1)).filter((i) => i >= 0);
    if (idat.length === 0) problems.push('has no IDAT chunk');
    else if (idat[idat.length - 1] - idat[0] + 1 !== idat.length) problems.push('has its IDAT chunks apart');
    const width = chunks[0].data.readUInt32BE(0);
    const height = chunks[0].data.readUInt32BE(4);
    const depth = chunks[0].data[8];
    const colour = chunks[0].data[9];
    if (width !== OG_CARD_WIDTH || height !== OG_CARD_HEIGHT) {
        problems.push(`is ${width}x${height}, where a card is ${OG_CARD_WIDTH}x${OG_CARD_HEIGHT}`);
    }
    if (DEPTHS[colour] === undefined || !DEPTHS[colour].includes(depth)) {
        problems.push(`has bit depth ${depth} with colour type ${colour}, which PNG does not allow`);
        return problems;
    }
    if (chunks[0].data[10] !== 0 || chunks[0].data[11] !== 0) problems.push('has a compression or filter method PNG does not define');
    if (chunks[0].data[12] !== 0) problems.push('is interlaced, where a card is not');
    const plte = chunks.filter((c) => c.type === 'PLTE').length;
    const ancillary = ['tRNS', 'sRGB', 'gAMA', 'pHYs'];
    const firstIdat = idat.length > 0 ? idat[0] : chunks.length;
    for (const type of ancillary) {
        const at = chunks.map((c, i) => (c.type === type ? i : -1)).filter((i) => i >= 0);
        if (at.length > 1) problems.push(`holds more than one ${type} chunk`);
        if (at.some((i) => i > firstIdat)) problems.push(`has a ${type} chunk after its IDAT`);
    }
    if (colour === 3 && plte !== 1) problems.push('is paletted and holds no single PLTE chunk');
    if ((colour === 0 || colour === 4) && plte > 0) problems.push('holds a PLTE chunk its colour type forbids');
    if (idat.length > 0 && problems.every((p) => !/bad CRC|IDAT/.test(p))) {
        const rowBytes = Math.ceil((width * CHANNELS[colour] * depth) / 8);
        const want = height * (1 + rowBytes);
        try {
            const data = Buffer.concat(idat.map((i) => chunks[i].data));
            const { buffer: raw, engine } = inflateSync(data, { maxOutputLength: want + 1, info: true });
            if (raw.length !== want) {
                problems.push(`inflates to ${raw.length} bytes of pixels, where ${width}x${height} is ${want}`);
            } else {
                if (engine.bytesWritten !== data.length) problems.push(`has ${data.length - engine.bytesWritten} bytes after its zlib stream in the IDAT data`);
                for (let y = 0; y < height; y++) {
                    if (raw[y * (1 + rowBytes)] > 4) {
                        problems.push(`has filter byte ${raw[y * (1 + rowBytes)]} on row ${y}, where PNG defines 0 to 4`);
                        break;
                    }
                }
            }
        } catch {
            problems.push('has IDAT data that does not inflate to its pixels');
        }
    }
    return problems;
}
