/**
 * **A code keeps its quiet zone white** (step 5a″, D4; `PROBE-RULES.md`,
 * "A code keeps its quiet zone white"). `qrSvg` draws every code with four
 * modules of white around its matrix, on a white rect of its own — the
 * quiet zone a camera needs to find the code at all. A look rule that tints
 * the plate's inner edge, clips the code, or strokes an inset outline over
 * it takes the quiet zone away while every box the probe reads stands where
 * it stood. So the contrast pass reads it in pixels: for every painted code
 * (`__quietZones` in the probe), the ring inside the square the SVG draws
 * into, from one device pixel in (the square's own antialiased edge) to one
 * device pixel short of the matrix (four modules in), must be white on
 * every channel: `QUIET_ZONE_FLOOR`.
 *
 * The code's own rounded corner is stepped past — the element's radius cuts
 * the square's corner where it reaches past the padding and border, and the
 * page shows there — but only up to one module: a radius that cuts deeper
 * than that eats the quiet zone itself, and is a fault (CRITIC-STEP-5
 * item 3). The ring is read only where the code is on screen: inside every
 * clipping ancestor and the shot. Pure, so the geometry is tested on its
 * own (`quiet-zone.test.mjs`).
 */

/** Every channel of a quiet-zone pixel is at least this. */
export const QUIET_ZONE_FLOOR = 245;

/** The quiet zone `qrSvg` draws, in modules. */
export const QUIET_MODULES = 4;

/**
 * The ring's pixels for one code, as `[x, y]` pairs of whole device pixels,
 * and the fault that stops it from being read, if any.
 *
 * `z` is `{ x, y, side, module, corner, clip: { x0, y0, x1, y1 } }` in CSS
 * px, which are device px at the pass's scale of 1.
 */
export function quietZonePixels(z, width, height) {
    // A clip that did not arrive as numbers (an infinity through JSON is
    // `null`, and `Math.ceil(null)` is 0) would read every code as clipped
    // away — a code painted and never read, green.
    if ([z.clip.x0, z.clip.y0, z.clip.x1, z.clip.y1].some((v) => typeof v !== 'number' || Number.isNaN(v))) {
        return { pixels: [], fault: `its clip did not arrive as numbers (${JSON.stringify(z.clip)})` };
    }
    if (z.corner > z.module) {
        return {
            pixels: [],
            fault: `its own radius cuts ${z.corner.toFixed(1)}px into the square it draws in, past one module (${z.module.toFixed(2)}px) — the quiet zone's corner is the page's paint`,
        };
    }
    const band = QUIET_MODULES * z.module - 1;
    if (band <= 1) {
        return { pixels: [], fault: `a module is ${z.module.toFixed(2)}px, which leaves no quiet zone to read` };
    }
    const left = z.x;
    const top = z.y;
    const right = z.x + z.side;
    const bottom = z.y + z.side;
    // Wholly inside: the square one device pixel in, the clip and the shot.
    const x0 = Math.max(Math.ceil(left + 1), Math.ceil(z.clip.x0), 0);
    const y0 = Math.max(Math.ceil(top + 1), Math.ceil(z.clip.y0), 0);
    const x1 = Math.min(Math.floor(right - 1), Math.floor(z.clip.x1), width); // exclusive
    const y1 = Math.min(Math.floor(bottom - 1), Math.floor(z.clip.y1), height);
    const pixels = [];
    for (let y = y0; y < y1; y += 1) {
        for (let x = x0; x < x1; x += 1) {
            // Wholly in the band: at most `band` in from some edge, so a
            // device pixel short of the matrix.
            const inBand = x + 1 <= left + band || x >= right - band || y + 1 <= top + band || y >= bottom - band;
            if (!inBand) continue;
            if (z.corner > 0) {
                const nearX = x < left + z.corner || x + 1 > right - z.corner;
                const nearY = y < top + z.corner || y + 1 > bottom - z.corner;
                if (nearX && nearY) continue;
            }
            pixels.push([x, y]);
        }
    }
    return { pixels };
}

/**
 * One code's read on a decoded shot (`{ width, height, bpp, data }`): how
 * many ring pixels were read, how many fall under the floor, and the first
 * of them with its colour — or the fault that stopped the read.
 */
export function readQuietZone(img, z) {
    const { pixels, fault } = quietZonePixels(z, img.width, img.height);
    if (fault !== undefined) return { px: 0, bad: 0, fault };
    let bad = 0;
    let first;
    for (const [x, y] of pixels) {
        const i = (y * img.width + x) * img.bpp;
        const rgb = [img.data[i], img.data[i + 1], img.data[i + 2]];
        if (rgb.some((c) => c < QUIET_ZONE_FLOOR)) {
            bad += 1;
            first ??= { x, y, rgb };
        }
    }
    return { px: pixels.length, bad, first };
}
