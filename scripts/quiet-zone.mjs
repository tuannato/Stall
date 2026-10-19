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
 * many ring pixels were read, how many fall under the floor, the first of
 * them with its colour and the box they span (`dark`: `[x0, y0, x1, y1]`,
 * inclusive) — or the fault that stopped the read.
 */
export function readQuietZone(img, z) {
    const { pixels, fault } = quietZonePixels(z, img.width, img.height);
    if (fault !== undefined) return { px: 0, bad: 0, fault };
    let bad = 0;
    let first;
    let dark;
    for (const [x, y] of pixels) {
        const i = (y * img.width + x) * img.bpp;
        const rgb = [img.data[i], img.data[i + 1], img.data[i + 2]];
        if (rgb.some((c) => c < QUIET_ZONE_FLOOR)) {
            bad += 1;
            first ??= { x, y, rgb };
            dark = dark === undefined ? [x, y, x, y] : [Math.min(dark[0], x), Math.min(dark[1], y), Math.max(dark[2], x), Math.max(dark[3], y)];
        }
    }
    return { px: pixels.length, bad, first, ...(dark === undefined ? {} : { dark }) };
}

/**
 * Every code of one job read, and a code that reads dark read again on a
 * fresh pair before the reading is believed — the ring read's own rule (the
 * money-guards round-7 critic's P2-3). A pay screen's code has read part of
 * its quiet zone non-white and then white on a rerun, four times, once on
 * main (`pay` @mobile, Neo worn, 4,572 of 21,420 pixels; `pay-several`
 * @mobile, Modern worn, 4,500 of 21,312, `rgb(18,21,26)`), and the cause is
 * not known; so a read that fails says what it read on, and a retry that
 * passes says both readings (`quietReadingLine`), to find it.
 *
 * `first` is `{ img, zones, at }`: the capture the job's boxes were read
 * on, the zones the page reported after it (`__quietZones`), and what the
 * runner knows of that capture (`at`, said as it is). `again()` makes the
 * fresh pair — a new capture and the zones read right after it — and
 * answers `{ img, zones, at, before? }` (`before`: the zones read right
 * before that capture), or `{ why: string[] }` when no pair could be had. It
 * is called once at most, and only when a code read dark.
 *
 * One answer per zone, in order: `{ z, turned: true }` for a turned code, or
 * `{ z, r }` as `readQuietZone` read it. For a code read again, `r` is the
 * fresh pair's reading — a real defect is steady state and reads dark there
 * too — and `retry` holds `{ first, again }`, each `{ z, r, at }`. The first
 * reading stands, with `retry.why`, when the fresh pair could not be had,
 * painted another set of codes (their names, in order), or could not read
 * that code at all (turned, a fault, or no pixel on screen) — and, since the
 * probe-shard critic's B2 and B2′, unless both of these hold: the code stood
 * still from the job's own zone read through the fresh pair (that zone,
 * `before`, read just before the fresh capture, and the zone read after it
 * agree on its name, box, module, corner, clip and turn, exactly —
 * `STILL_PX` is 0; a pair with no `before` cannot show that), and the fresh read
 * covers at least the ring pixels the first one did. A code that moved
 * during the fresh pair was read where it no longer was, and a ring cut
 * shorter (a scroller now clipping its top) reads less of the defect; the
 * critic's two cases, a steady band read white on each, are
 * `a-quiet-zone-that-reads-dark-is-read-again-on-a-fresh-pair`'s. A code that
 * read dark is never let off by a weaker read.
 */
/**
 * How far, in CSS px, a code's box, module, corner or clip may move and still
 * be read as standing still: none. Measured on a full two-tab run with a band
 * planted on the job's capture alone, all 257 codes read again had their
 * zones before and after the fresh capture exactly equal, and exactly equal
 * to the job's own zone read; a tolerance buys nothing a real page needs and
 * let a steady one-pixel defect go green (the probe-shard critic's d2).
 */
export const STILL_PX = 0;

/** Why a code did not stand still between two readings of its zone (`a`, `b`), or undefined. */
function movedBy(a, b, when = 'during the fresh pair') {
    if (a === undefined || b === undefined) return 'the fresh pair says nothing of where it stood just before its capture';
    if (a.name !== b.name) return `another code stood there ${when} (${a.name} → ${b.name})`;
    const near = (x, y) => x === y || (typeof x === 'number' && typeof y === 'number' && Math.abs(x - y) <= STILL_PX);
    const moved = [];
    for (const key of ['x', 'y', 'side', 'module', 'corner']) {
        if (!near(a[key], b[key])) moved.push(`${key} ${a[key]} → ${b[key]}`);
    }
    for (const key of ['x0', 'y0', 'x1', 'y1']) {
        if (!near(a.clip?.[key], b.clip?.[key])) moved.push(`clip ${key} ${a.clip?.[key]} → ${b.clip?.[key]}`);
    }
    if (a.turned !== b.turned) moved.push(`turned ${a.turned} → ${b.turned}`);
    return moved.length === 0 ? undefined : `it moved ${when} (${moved.join(', ')})`;
}

export async function readQuietZones(first, again) {
    const reads = first.zones.map((z) => (z.turned ? { z, turned: true } : { z, r: readQuietZone(first.img, z) }));
    const dark = reads.flatMap((read, i) => (read.r !== undefined && read.r.fault === undefined && read.r.px > 0 && read.r.bad > 0 ? [i] : []));
    if (dark.length === 0) return reads;
    const pair = await again();
    const names = (zones) => zones.map((z) => z.name).join(', ');
    let why = pair.why ?? [];
    if (why.length === 0 && names(pair.zones) !== names(first.zones)) {
        why = [`the fresh pair painted the codes ${names(pair.zones) || 'none'} where the first had ${names(first.zones)}`];
    }
    for (const i of dark) {
        const firstRead = { z: reads[i].z, r: reads[i].r, at: first.at };
        if (why.length > 0) {
            reads[i] = { ...reads[i], retry: { first: firstRead, why } };
            continue;
        }
        const z = pair.zones[i];
        const r = z.turned ? undefined : readQuietZone(pair.img, z);
        if (r === undefined || r.fault !== undefined || r.px === 0) {
            const said = r === undefined ? 'its frame is turned' : r.fault ?? 'no pixel of its quiet zone is on screen';
            reads[i] = { ...reads[i], retry: { first: firstRead, why: [`the fresh pair could not read it: ${said}`] } };
            continue;
        }
        // Still from the job's own zone read through the fresh pair: a code
        // that scrolled between the two captures and then stood still read
        // another stretch of its ring (the probe-shard critic's d1).
        const moved = movedBy(firstRead.z, pair.before?.[i], "between the job's capture and the fresh pair") ?? movedBy(pair.before?.[i], z);
        if (moved !== undefined || r.px < firstRead.r.px) {
            reads[i] = {
                ...reads[i],
                retry: {
                    first: firstRead,
                    why: [
                        ...(moved === undefined ? [] : [`the fresh pair cannot be believed: ${moved}`]),
                        ...(r.px < firstRead.r.px ? [`the fresh pair read ${r.px} of the ${firstRead.r.px} ring pixels the first read`] : []),
                    ],
                    // What the fresh pair read, said and never believed.
                    unbelieved: { z, r, at: pair.at, ...(pair.before === undefined ? {} : { before: pair.before[i] }) },
                },
            };
            continue;
        }
        reads[i] = {
            z,
            r,
            retry: { first: firstRead, again: { z, r, at: pair.at, ...(pair.before === undefined ? {} : { before: pair.before[i] }) } },
        };
    }
    return reads;
}

/** How a box is said in a reading: its corner, its side and its module. */
const boxSaid = (z) => `${z.x.toFixed(1)},${z.y.toFixed(1)} side ${z.side.toFixed(1)} module ${z.module.toFixed(2)}`;

/**
 * One reading of one code, said for a person finding why it read dark: the
 * dark pixels, the code's box and clip, the scrolled boxes above it, and
 * what the runner knew of the capture (`at`, as it is). Pure.
 */
export function quietReadingLine({ z, r, at }, before) {
    const parts = [];
    parts.push(
        r.bad === 0
            ? `0 of ${r.px} dark`
            : `${r.bad} of ${r.px} dark (the first at ${r.first.x},${r.first.y} rgb(${r.first.rgb.join(',')}), spanning ${r.dark.join(',')})`,
    );
    parts.push(`the code at ${boxSaid(z)}, clip ${[z.clip.x0, z.clip.y0, z.clip.x1, z.clip.y1].map((v) => Math.round(v)).join(',')}`);
    if (before !== undefined && boxSaid(before) !== boxSaid(z)) parts.push(`at ${boxSaid(before)} just before its capture`);
    const scrolled = (z.scrolled ?? []).map((s) => `${s.at} ${s.top},${s.left}`);
    parts.push(scrolled.length === 0 ? 'nothing above it scrolled' : `scrolled ${scrolled.join('; ')}`);
    if (at !== undefined) parts.push(JSON.stringify(at));
    return parts.join(' — ');
}
