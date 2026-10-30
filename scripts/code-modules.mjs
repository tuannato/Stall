/**
 * **1d: a code's modules read in pixels** (before 8g2, item 1d; bound since
 * step 7c, `a-codes-modules-read-as-its-matrix`; `PROBE-RULES.md`, "Before
 * 8g2, 1d: the code's modules" and "Before 8g2, 7c: 1d binds"). The quiet-zone read (`quiet-zone.mjs`) holds the white ring
 * around a code's matrix; nothing read the matrix itself. A box moved over a
 * pay code by a relative offset or a transform (the critic's PQ), a box
 * above it faded (PQO), a shadow ring with no hit area laid across it, or a
 * pseudo-element painted in the code's own black over a block of modules
 * changes what a camera reads while every box and the ring stand where they
 * stood. So on every contrast job, for every code the quiet-zone read reads,
 * the centre pixel of each module is read on the job's own capture and held
 * to the module the code was drawn from: dark where the matrix is dark,
 * light where it is light, on every channel.
 *
 * The matrix is the one `qrSvg` drew from `qrMatrix(text)`, read by the
 * probe off the path's `d` attribute (`__codeMatrices`,
 * `layout/codeMatrix.ts`), never off these pixels. A centre is the pixel
 * under the module's middle; from `MODULE_MIN_PX` a module up, that pixel
 * lies wholly inside the module as Chrome paints it — the svg snapped by up
 * to half a pixel — so it is the module's own paint and never an edge's
 * antialiasing. It is read only where the code is on screen: inside every
 * clipping ancestor and the shot, the quiet-zone read's rule.
 *
 * A code read wrong is read again on a fresh pair by the quiet-zone read's
 * own rule (`readAgainOnFreshPair`): the code stood still from the job's own
 * zone read through the pair, the pair read at least the module centres the
 * first did, and its matrix is the same. Pure, so the geometry and the cuts
 * are tested on their own (`code-modules.test.mjs`).
 */
import { QUIET_MODULES, readAgainOnFreshPair, readQuietZones, readingContext } from './quiet-zone.mjs';

/**
 * Every channel of a dark module's centre is at most this, and every
 * channel of a light module's at least `MODULE_LIGHT_MIN`. Measured first
 * (`PROBE-RULES.md`, "Before 8g2, 1d"): on the clean tree, the whole runner
 * with the tracked fixture carried, every dark centre read exactly 0 and
 * every light centre exactly 255 on every channel — 507,960 centres of
 * 256 code reads, on every look and the skeleton, bare and all worn, and
 * on Neo's one solo job, at 390, 1280 and 1920 — and
 * so did the three transparent overlays' codes (`broadcast-clear`,
 * `-quotes-clear`, `-ticker-clear`, which the contrast pass keeps geometry
 * only), sampled in a scratch run. So the margin is the whole range to the
 * cut: the cuts mirror the quiet zone's floor (`QUIET_ZONE_FLOOR`, 245),
 * ten levels either way of a paint that never moved off 0 or 255.
 */
export const MODULE_DARK_MAX = 10;
/** The rule's name, as its failures and the codes it owes name it (bound since step 7c). */
export const MODULE_CHECK = 'a-codes-modules-read-as-its-matrix';
export const MODULE_LIGHT_MIN = 245;

/**
 * A module this many device pixels wide or more has a centre pixel wholly
 * inside it as Chrome paints it. The pixel under a module's middle (`floor`
 * of it) stands at least m/2 − 1 inside the module's edges as the box's
 * geometry puts them, on either side. Chrome does not paint the svg there:
 * it snaps it to whole pixels, so a module's edges land up to half a pixel
 * from where `getBoundingClientRect` and the viewBox put them (the tenth
 * critic's snap read, DPR 1: 742 of 5,887 centres wrong at 2.1px a module,
 * 335 at 2.25, 237 at 2.4, 74–90 at 2.6, 36 at 2.7, 7 at 2.85, none from
 * 2.9 to 4). So the centre pixel stays wholly inside its module, a half
 * pixel's snap either way, exactly when m/2 − 1 ≥ 0.5: from three pixels a
 * module. A smaller module is a fault: its centre would read its
 * neighbours' paint. The cut is held to this Chrome on every run
 * (`the-module-read-agrees-with-this-chrome`, `moduleSnapVerdict`): codes
 * drawn by `qrSvg` at fractional sizes and offsets, under the cut each
 * refused, from it every centre read right.
 */
export const MODULE_MIN_PX = 3;

/**
 * The centre pixel of every module of one code that is on screen, as `{ r,
 * c, x, y, dark }` (whole device pixels; `dark` the matrix's word), and the
 * fault that stops the read, if any. `z` is a quiet zone (`quiet-zone.mjs`)
 * with the code's `matrix` (`{ n, bits }`) or its `matrixFault`. `minPx` is
 * the least module read (`MODULE_MIN_PX`; the check that measures the cut
 * reads under it too).
 */
export function moduleCentres(z, width, height, minPx = MODULE_MIN_PX) {
    if ([z.clip.x0, z.clip.y0, z.clip.x1, z.clip.y1].some((v) => typeof v !== 'number' || Number.isNaN(v))) {
        return { centres: [], fault: `its clip did not arrive as numbers (${JSON.stringify(z.clip)})` };
    }
    if (z.matrix === undefined) {
        return { centres: [], fault: `the matrix it was drawn from could not be read: ${z.matrixFault ?? 'the page sent none'}` };
    }
    const { n, bits } = z.matrix;
    if (!(n > 0) || bits.length !== n * n || /[^01]/.test(bits)) {
        return { centres: [], fault: `its matrix did not arrive whole (${n} a side, ${bits.length} modules)` };
    }
    if (z.module < minPx) {
        return { centres: [], fault: `a module is ${z.module.toFixed(2)}px, under the ${minPx} device pixels a centre read needs` };
    }
    const x0 = Math.max(Math.ceil(z.clip.x0), 0);
    const y0 = Math.max(Math.ceil(z.clip.y0), 0);
    const x1 = Math.min(Math.floor(z.clip.x1), width); // exclusive
    const y1 = Math.min(Math.floor(z.clip.y1), height);
    const centres = [];
    for (let r = 0; r < n; r += 1) {
        const y = Math.floor(z.y + (r + QUIET_MODULES + 0.5) * z.module);
        if (y < y0 || y + 1 > y1) continue;
        for (let c = 0; c < n; c += 1) {
            const x = Math.floor(z.x + (c + QUIET_MODULES + 0.5) * z.module);
            if (x < x0 || x + 1 > x1) continue;
            centres.push({ r, c, x, y, dark: bits[r * n + c] === '1' });
        }
    }
    return { centres };
}

/**
 * One code's modules read on a decoded shot (`{ width, height, bpp, data }`):
 * how many centres were read (`px`, the read-again's unit), how many read
 * wrong (`bad`, of which `wrongDark` dark modules read light and
 * `wrongLight` light modules read dark), the first wrong one with its
 * colour, the box the wrong ones span (`span`, inclusive), and every
 * channel's extremes over the dark and the light centres (`stats`, the
 * measurement the cuts were set from) — or the fault that stopped the read.
 */
export function readModules(img, z, minPx = MODULE_MIN_PX) {
    const { centres, fault } = moduleCentres(z, img.width, img.height, minPx);
    if (fault !== undefined) return { px: 0, bad: 0, fault };
    let wrongDark = 0;
    let wrongLight = 0;
    let first;
    let span;
    const stats = { dark: { n: 0, lo: 255, hi: 0 }, light: { n: 0, lo: 255, hi: 0 } };
    for (const { r, c, x, y, dark } of centres) {
        const i = (y * img.width + x) * img.bpp;
        const rgb = [img.data[i], img.data[i + 1], img.data[i + 2]];
        const s = dark ? stats.dark : stats.light;
        s.n += 1;
        s.lo = Math.min(s.lo, ...rgb);
        s.hi = Math.max(s.hi, ...rgb);
        const wrong = dark ? rgb.some((v) => v > MODULE_DARK_MAX) : rgb.some((v) => v < MODULE_LIGHT_MIN);
        if (!wrong) continue;
        if (dark) wrongDark += 1;
        else wrongLight += 1;
        first ??= { r, c, x, y, rgb, dark };
        span = span === undefined ? [x, y, x, y] : [Math.min(span[0], x), Math.min(span[1], y), Math.max(span[2], x), Math.max(span[3], y)];
    }
    return { px: centres.length, bad: wrongDark + wrongLight, wrongDark, wrongLight, stats, ...(first === undefined ? {} : { first, span }) };
}

/** Why the code a fresh pair read is not the code the first read, by its matrix, or undefined. */
function sameMatrix(a, b) {
    if (b.matrix === undefined) return 'the fresh pair says nothing of the matrix it was drawn from';
    if (a.matrix?.bits !== b.matrix.bits) return 'its matrix changed during the fresh pair';
    return undefined;
}

/**
 * **A code is read whole or not at all** (the thirteenth review's item 8):
 * one code's modules read as `readModules` reads them, and a fault where
 * fewer than every centre of its matrix is on screen inside every clip and
 * the shot — none of them included. Until then 1d held only the centres it
 * could see and owed nothing past them: the critic's PQS, the box that
 * wraps every pay code made a 48px scroller, showed a strip of the top row
 * and read 6,930 of the 37,938 centres at the phone, all of them right; and
 * a slot that showed the quiet zone alone would have read none and been
 * excused. Pure.
 */
export function readWholeModules(img, z, minPx = MODULE_MIN_PX) {
    const r = readModules(img, z, minPx);
    if (r.fault !== undefined) return r;
    const whole = z.matrix.n * z.matrix.n;
    if (r.px === whole) return r;
    return {
        px: r.px,
        bad: 0,
        fault: `${r.px === 0 ? 'none' : `only ${r.px}`} of its ${whole} module centres ${r.px === 1 ? 'is' : 'are'} on screen inside its clips: a code is read whole or not at all`,
    };
}

/**
 * Every code of one job's modules read whole (`readWholeModules`), and a code
 * read wrong read again on a fresh pair under the quiet zone's own rule
 * (`readAgainOnFreshPair`; `first` and `again` as `readQuietZones` takes
 * them, the zones carrying their matrices). One answer per zone, in order, as
 * that read answers.
 */
export function readCodeModules(first, again) {
    return readAgainOnFreshPair(first, again, readWholeModules, {
        unit: 'module centres',
        nothing: 'no module centre of it is on screen',
        same: sameMatrix,
    });
}

/**
 * How far, in modules, holding a turned code's frame upright may move a
 * corner of its square before the code is not read upright
 * (`readTurnedUpright`; the fifteenth review's B1, the owner's
 * D-2026-10-31-01). Pinned by value.
 */
export const UPRIGHT_TRAVEL_MODULES = 1.5;

/**
 * How far the frame held upright moves a turned code (the fifteenth review's
 * B1): the centre of its square between the job's zone (`painted`, the
 * centre of its turned bounds) and the zone on the frame held upright
 * (`upright`), and the most any of its four corners moves. A frame that only
 * turns (`turnOnly`) maps the code's square by one turn and one move, so a
 * corner stands on the job's frame at the painted centre plus the upright
 * half-diagonal turned by the painted zone's `angle`, and on the upright
 * frame at the upright centre plus that half-diagonal: the travel is
 * computed from the two centres, the turn and the upright side, exactly for
 * such a frame, and never more than the centre's travel plus 2·sin(θ/2) of
 * the half-diagonal. `undefined` where the painted zone carries no finite
 * angle. Pure.
 */
export function uprightCornerTravel(painted, upright) {
    if (typeof painted?.angle !== 'number' || !Number.isFinite(painted.angle)) return undefined;
    const half = upright.side / 2;
    const dx = painted.x + painted.side / 2 - (upright.x + half);
    const dy = painted.y + painted.side / 2 - (upright.y + half);
    const c = Math.cos(painted.angle);
    const s = Math.sin(painted.angle);
    let corner = 0;
    for (const [vx, vy] of [
        [-half, -half],
        [half, -half],
        [half, half],
        [-half, half],
    ]) {
        corner = Math.max(corner, Math.hypot(dx + c * vx - s * vy - vx, dy + s * vx + c * vy - vy));
    }
    return { centre: Math.hypot(dx, dy), corner };
}

/**
 * **The codes of one job whose frame is turned, read upright** (the
 * thirteenth review's B1; the owner's D-2026-10-29-01). A code whose frame is
 * turned (`turned`: any turn the probe's `angleOf` reads, a hundredth of a
 * degree and a whole turn among them) cannot be read on the job's own frame,
 * and was read by neither the quiet zone nor 1d: a look that turned the box
 * around its pay codes by 0.01° faded them with every pixel read green (the
 * critic's PQOT; KQT on the kit's road). So it is read on a frame with every
 * transform above it held off (`__codeTurnsHeldOff`), by both reads and their
 * fresh pair as on any job.
 *
 * `zones` are the job's zones, in the page's order; `upright()` makes the
 * frame held upright and answers `{ img, zones, at }` (its zones carrying
 * their matrices, `withMatrices`) or `{ why: string[] }`; `uprightAgain()`
 * makes the fresh pair on such a frame and answers as `readQuietZones`'
 * `again` does (`before` among it). Each is called once at most, and neither
 * unless a zone is turned. Answers a map from each turned zone's index to `{
 * quiet, modules }`, each one answer as `readQuietZones` and
 * `readCodeModules` give it, read off the upright frame — or, where the
 * frame could not be had, painted other codes, or the code's frame is still
 * turned on it, both a fault: a turned code is read upright or it fails
 * closed. Each answer carries `upright`: `true` where it was read off the
 * upright frame, `false` where it failed closed before (the runner says
 * which). **Only a frame that does nothing but turn is read upright** (the
 * fourteenth review's M2, the owner's D-2026-10-30-01): a zone whose
 * `turnOnly` is not `true` — its frame also scales, skews, mirrors or leaves
 * the plane, and holding that off with the turn makes a code the page does
 * not paint (the critic's PSCT, a fifth of the size and 0.01°, and PMIR, a
 * half turn and a mirror, passed the whole runner read upright) — fails
 * closed for both reads with what its frame does, and no frame is made where
 * no turned zone is turn-only. **And only where the code stands where the
 * page paints it** (the fifteenth review's B1, the owner's D-2026-10-31-01):
 * the frame held upright holds off a `translate` with the turn, and a turn
 * about a far origin carries the code too, so it put the code back where it
 * would stand unmoved, and a mask or a clip that did not move with it was
 * read in the wrong place (the critic's PTO2, a turn of 0.02° about an
 * origin 400,000px away, carried every Modern pay code 140px down into a
 * masked band and passed the whole runner; P45, a turn of 45° about the
 * code's own centre, put its corners past a mask while the centre stayed).
 * A code that holding the turn off moves any corner of more than
 * `UPRIGHT_TRAVEL_MODULES` modules (`uprightCornerTravel`), or whose zone
 * does not say how far it is turned, fails closed for both reads; each
 * answer read upright carries that travel (`travel`: `px`, `modules`). Pure
 * but for the two calls.
 */
export async function readTurnedUpright(zones, upright, uprightAgain) {
    const out = new Map();
    const fail = (i, why) => {
        const r = { px: 0, bad: 0, fault: `its frame is turned, and ${why}` };
        out.set(i, { quiet: { z: zones[i], r }, modules: { z: zones[i], r }, upright: false });
    };
    const turned = [];
    for (const [i, z] of zones.entries()) {
        if (!z.turned) continue;
        if (z.turnOnly === true) turned.push(i);
        else
            fail(
                i,
                `what turns it does more than turn it (${typeof z.turnOnly === 'string' ? z.turnOnly : 'the page did not say that it only turns it'}): held upright it would not be the code the page paints, so it is not read`,
            );
    }
    if (turned.length === 0) return out;
    const frame = await upright();
    const names = (zs) => zs.map((z) => z.name).join(', ');
    if ((frame.why ?? []).length > 0) {
        for (const i of turned) fail(i, `no frame with every transform above it held off could be had (${frame.why.join('; ')})`);
        return out;
    }
    if (names(frame.zones) !== names(zones)) {
        for (const i of turned) fail(i, `the frame with every transform above it held off painted the codes ${names(frame.zones) || 'none'} where the job had ${names(zones)}`);
        return out;
    }
    const readable = [];
    const travel = new Map();
    for (const i of turned) {
        if (frame.zones[i].turned) {
            fail(i, 'it is still turned with every transform above it held off');
            continue;
        }
        const moved = uprightCornerTravel(zones[i], frame.zones[i]);
        const module = frame.zones[i].module;
        if (moved === undefined) {
            fail(i, 'the page did not say how far it is turned, so how far holding the turn off moves it cannot be read');
        } else if (!(moved.corner <= UPRIGHT_TRAVEL_MODULES * module)) {
            fail(
                i,
                `holding its turn off moves a corner of it ${moved.corner.toFixed(1)}px (its centre ${moved.centre.toFixed(1)}px), ` +
                    `more than ${UPRIGHT_TRAVEL_MODULES} modules (${(UPRIGHT_TRAVEL_MODULES * module).toFixed(2)}px): held upright it is not where the page paints it, so it is not read`,
            );
        } else {
            readable.push(i);
            travel.set(i, { px: moved.corner, modules: moved.corner / module });
        }
    }
    if (readable.length === 0) return out;
    const pick = (zs) => readable.map((i) => zs[i]);
    let pair;
    const again = () =>
        (pair ??= (async () => {
            const p = await uprightAgain();
            if ((p.why ?? []).length > 0) return p;
            if (names(p.zones) !== names(frame.zones)) return { why: [`the fresh pair held upright painted the codes ${names(p.zones) || 'none'} where the first had ${names(frame.zones)}`] };
            return { ...p, zones: pick(p.zones), ...(p.before === undefined || names(p.before) !== names(frame.zones) ? { before: undefined } : { before: pick(p.before) }) };
        })());
    const first = { img: frame.img, zones: pick(frame.zones), at: frame.at };
    const quiet = await readQuietZones(first, again);
    const modules = await readCodeModules(first, again);
    readable.forEach((i, k) => out.set(i, { quiet: quiet[k], modules: modules[k], upright: true, travel: travel.get(i) }));
    return out;
}

/**
 * One reading of one code's modules, said for a person finding why it read
 * wrong: the wrong centres, the first with its module and colour, the span,
 * then where the code stood (`readingContext`). Pure.
 */
export function moduleReadingLine({ z, r, at }, before) {
    const said =
        r.bad === 0
            ? `0 of ${r.px} module centres wrong`
            : `${r.bad} of ${r.px} module centres wrong (${r.wrongDark} dark read light, ${r.wrongLight} light read dark; ` +
              `the first, ${r.first.dark ? 'dark' : 'light'}, at row ${r.first.r} column ${r.first.c}, ${r.first.x},${r.first.y} ` +
              `rgb(${r.first.rgb.join(',')}), spanning ${r.span.join(',')})`;
    return [said, ...readingContext(z, at, before)].join(' — ');
}

/** The extremes of two `stats` (`readModules`) folded into one. */
export function foldStats(into, from) {
    for (const kind of ['dark', 'light']) {
        const a = (into[kind] ??= { n: 0, lo: 255, hi: 0 });
        const b = from[kind];
        if (b === undefined || b.n === 0) continue;
        a.n += b.n;
        a.lo = Math.min(a.lo, b.lo);
        a.hi = Math.max(a.hi, b.hi);
    }
    return into;
}

/**
 * The zones `__quietZones` answered, each with the matrix `__codeMatrices`
 * answered for it, paired by place and held to the same name: a list that
 * does not line up gives every code a `matrixFault` (the read fails closed
 * for it, and says so), a code whose matrix the page could not read carries
 * the page's reason, and a page that threw answering (`{ thrown }`, the
 * runner's guard) gives every code that throw as its fault. **And one code a
 * pair**: a zone's module is its side over the viewBox it was read against,
 * and its matrix is that viewBox's less both quiet zones, so a zone and a
 * matrix of one code agree by construction; they disagree only when the two
 * answers were taken of different codes — the page changed between them, or
 * two codes of one name traded places — and the code then fails closed. (That
 * agreement was a check in `moduleCentres` that could not fail once the two
 * were paired: the tenth critic's item 7.) Pure.
 */
export function withMatrices(zones, matrices) {
    if (typeof matrices?.thrown === 'string') return zones.map((z) => ({ ...z, matrixFault: `the page threw answering for its matrix (${matrices.thrown})` }));
    const lined = Array.isArray(matrices) && matrices.length === zones.length && zones.every((z, i) => matrices[i]?.name === z.name);
    return zones.map((z, i) => {
        if (!lined) {
            return {
                ...z,
                matrixFault: `the page's matrices did not line up with its codes (${Array.isArray(matrices) ? matrices.length : 'no'} matrices for ${zones.length} codes)`,
            };
        }
        const m = matrices[i];
        if (typeof m.fault === 'string') return { ...z, matrixFault: m.fault };
        const drawn = z.side / z.module;
        if (Math.abs(drawn - (m.n + 2 * QUIET_MODULES)) > 1e-6) {
            return {
                ...z,
                matrixFault: `its zone was read off a code ${drawn.toFixed(2)} modules a side and its matrix off one of ${m.n + 2 * QUIET_MODULES} (${m.n} and a quiet zone of ${QUIET_MODULES} each side): the page's two answers are not of one code`,
            };
        }
        return { ...z, matrix: { n: m.n, bits: m.bits }, ...(m.payload === 'checked' ? { payload: 'checked' } : {}) };
    });
}

/**
 * **`the-module-read-agrees-with-this-chrome`**: the cut held to the Chrome
 * the probe runs (the tenth critic's item 1, decided by the window). The
 * probe page draws a sheet of codes with `qrSvg` at fractional module sizes,
 * under the cut and over it, each at several sub-pixel offsets
 * (`__moduleSnap`, `MODULE_SNAP_SIZES` and `MODULE_SNAP_OFFSETS` in
 * `layout/codeMatrix.ts`); the runner captures it as it captures a job and
 * hands the capture and the sheet's zones, with their matrices, here. Every
 * code under `MODULE_MIN_PX` must be refused (the read fails closed there),
 * and every code from it up must have every one of its centres on screen and
 * read right. Anything else is a fault and fails the run: it says the cut
 * does not hold in this Chrome, which is 1d's own ground and not a look's.
 * Under the cut the codes are read anyway, at no floor, and counted (`below`),
 * the measurement the cut rests on — printed, never judged. Pure.
 */
export function moduleSnapVerdict(img, zones) {
    const faults = [];
    let under = 0;
    let over = 0;
    let centres = 0;
    const below = { codes: 0, centres: 0, wrong: 0 };
    const at = (z) => `the ${z.module.toFixed(3)}px code at ${z.x.toFixed(2)},${z.y.toFixed(2)}`;
    for (const z of zones) {
        if (z.turned) {
            faults.push(`${at(z)} is in a turned frame`);
            continue;
        }
        const r = readModules(img, z);
        if (z.module < MODULE_MIN_PX) {
            under += 1;
            if (!/^a module is .* under the /.test(r.fault ?? '')) {
                faults.push(`${at(z)} is under the ${MODULE_MIN_PX}px cut and was not refused (${r.fault ?? `read, ${r.bad} of ${r.px} centres wrong`})`);
                continue;
            }
            const anyway = readModules(img, z, 0);
            if (anyway.fault === undefined) {
                below.codes += 1;
                below.centres += anyway.px;
                below.wrong += anyway.bad;
            }
            continue;
        }
        over += 1;
        if (r.fault !== undefined) {
            faults.push(`${at(z)} could not be read: ${r.fault}`);
            continue;
        }
        const whole = z.matrix.n * z.matrix.n;
        if (r.px !== whole) faults.push(`${at(z)} had ${r.px} of its ${whole} centres on screen`);
        else if (r.bad > 0) {
            faults.push(
                `${at(z)} read ${r.bad} of ${r.px} centres wrong (${r.wrongDark} dark read light, ${r.wrongLight} light read dark; the first, ` +
                    `${r.first.dark ? 'dark' : 'light'}, at row ${r.first.r} column ${r.first.c}, ${r.first.x},${r.first.y} rgb(${r.first.rgb.join(',')}))`,
            );
        }
        centres += r.px;
    }
    if (under === 0) faults.push(`the sheet drew no code under the ${MODULE_MIN_PX}px cut, so nothing showed the read refuses one`);
    if (over === 0) faults.push(`the sheet drew no code from the ${MODULE_MIN_PX}px cut up, so nothing was read`);
    return { codes: zones.length, under, over, centres, below, faults };
}

/**
 * What `the-module-read-agrees-with-this-chrome` says under the contrast pass:
 * the sheet, the codes refused under the cut and what they would have read,
 * the codes read from it, and a reading taken again. `read` is `{ first,
 * again? }`, each a `moduleSnapVerdict`. Pure.
 */
export function moduleSnapLines({ first, again }) {
    const said = (v) =>
        `${v.codes} code(s) drawn by qrSvg; the ${v.under} under the ${MODULE_MIN_PX}px cut refused` +
        ` (read anyway, at no floor: ${v.below.wrong} of ${v.below.centres} centres wrong on ${v.below.codes} code(s)), ` +
        `the ${v.over} from it read on ${v.centres} centres`;
    const decided = again ?? first;
    const lines = [
        `1d's cut held to this Chrome (the-module-read-agrees-with-this-chrome; MODULE_MIN_PX ${MODULE_MIN_PX}, DPR 1): ${said(decided)}: ` +
            (decided.faults.length === 0 ? 'agreed' : `${decided.faults.length} disagreement(s)`),
    ];
    for (const fault of decided.faults.slice(0, 12)) lines.push(`  ${fault}`);
    if (decided.faults.length > 12) lines.push(`  … and ${decided.faults.length - 12} more`);
    if (again !== undefined) {
        lines.push(`  read again on a fresh capture after the first disagreed (${first.faults.length}): ${said(first)}`);
        for (const fault of first.faults.slice(0, 6)) lines.push(`    first capture: ${fault}`);
    }
    return lines;
}

/** How many failures `moduleReport` says in full; the rest are counted by code. */
export const MODULE_WOULD_PRINTED = 30;

/** `lo–hi` of one kind of centre, or that none was read. */
const range = (s) => (s === undefined || s.n === 0 ? 'none read' : `${s.lo}–${s.hi} (${s.n})`);

/**
 * What 1d says under the contrast pass, line by line, whatever the verdict
 * (bound since 7c: its failures — `run.would`, the codes read wrong, beside
 * the codes it failed closed on and its throws — fail the pass, and are said
 * there too). `run` is the walk's fold of every job's `modules` (the
 * runner's `modulesRun`), `canary` the canary's reads again (`{ would,
 * readAgain }`: said, not failed — the walk's read of each job decides), and
 * `painted` every code a geometry pass painted (`pass/screen:name`). Pure.
 */
export function moduleReport(run, canary, painted) {
    const lines = [];
    const byVp = Object.entries(run.byVpClass).sort(([a], [b]) => a.localeCompare(b));
    lines.push(
        `1d, a code's modules (${MODULE_CHECK}, bound; code-modules.mjs; a centre wrong past ${MODULE_DARK_MAX} on a dark module or under ${MODULE_LIGHT_MIN} on a light one, on any channel), ` +
            `by viewport and look: ` +
            (byVp.length === 0
                ? 'no job painted a code'
                : byVp
                      .map(
                          ([key, t]) =>
                              `${key} ${t.jobs} job(s), ${t.codes} code read(s), ${t.modules} centres, ${t.wrong} wrong on ${t.wouldCodes} code read(s)` +
                              (t.unread === 0 ? '' : `, ${t.unread} not read`),
                      )
                      .join('; ')),
    );
    // The extremes, by look and variant, and by screen: the measurement the cuts rest on.
    const fold = (keyOf) => {
        const out = new Map();
        for (const [key, st] of Object.entries(run.stats)) {
            const [cls, ...rest] = key.split(' ');
            const k = keyOf(cls, rest);
            foldStats(out.get(k) ?? out.set(k, {}).get(k), st);
        }
        return [...out].sort(([a], [b]) => a.localeCompare(b));
    };
    // key: `${cls} ${variant} ${screen} @${vp}`, variant `bare`, `worn` or `flags N`.
    const variantOf = (rest) => (rest[0] === 'flags' ? `flags ${rest[1]}` : rest[0]);
    const screenOf = (rest) => rest.slice(rest[0] === 'flags' ? 2 : 1).join(' ');
    lines.push(
        `1d, centres as read, every channel, by look and variant (dark lo–hi, light lo–hi, (centres)): ` +
            (fold((cls, rest) => `${cls} ${variantOf(rest)}`).map(([k, st]) => `${k} dark ${range(st.dark)} light ${range(st.light)}`).join('; ') || 'none'),
    );
    lines.push(
        `1d, centres as read, by screen: ` +
            (fold((_cls, rest) => screenOf(rest)).map(([k, st]) => `${k} dark ${range(st.dark)} light ${range(st.light)}`).join('; ') || 'none'),
    );
    if (run.would.length === 0) {
        lines.push('1d, codes read wrong: none');
    } else {
        const byCode = new Map();
        for (const line of run.would) {
            const m = /^(\S+) @(\S+) \/ theme (\S+)[^:]*: the code (\S+)/.exec(line);
            const code = m === null ? 'unparsed' : `${m[2]}/${m[1]}:${m[4]}`;
            byCode.set(code, (byCode.get(code) ?? 0) + 1);
        }
        lines.push(
            `1d, codes read wrong (failures): ${run.would.length} code read(s); by code (reads): ` +
                [...byCode]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([code, n]) => `${code} ${n}`)
                    .join(', '),
        );
        for (const line of run.would.slice(0, MODULE_WOULD_PRINTED)) lines.push(`  ${line}`);
        if (run.would.length > MODULE_WOULD_PRINTED) lines.push(`  … and ${run.would.length - MODULE_WOULD_PRINTED} more`);
    }
    // By tab, and at the run's tab count (the tenth critic's item 4): the read-again is for a capture's flake.
    const byTab = (counts) =>
        Object.entries(counts ?? {})
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([tab, n]) => `tab ${tab} ${n}`)
            .join(', ') || 'none';
    lines.push(
        `1d, read again on a fresh pair and right there${run.tabs === undefined ? '' : `, at ${run.tabs} tab(s)`}: ` +
            (run.readAgain.length === 0 ? 'none' : `${run.readAgain.length} (by tab: ${byTab(run.readAgainByTab)})${run.readAgain.map((line) => `\n    ${line}`).join('')}`) +
            `; on the canary's reads again: ` +
            (canary.readAgain.length === 0 ? 'none' : `${canary.readAgain.length} (by tab: ${byTab(canary.readAgainByTab)})${canary.readAgain.map((line) => `\n    ${line}`).join('')}`) +
            (canary.would.length === 0 ? '' : `; read wrong on the canary's reads again (said, not failed: the walk's read decides): ${canary.would.length}${canary.would.map((line) => `\n    ${line}`).join('')}`),
    );
    const faults = run.faults ?? [];
    lines.push(`1d, failed closed (failures: a module under ${MODULE_MIN_PX}px, a matrix it cannot read or pair, a code not read whole, a turned code not read upright): ${faults.length === 0 ? 'none' : `${faults.length}${faults.slice(0, 12).map((line) => `\n    ${line}`).join('')}${faults.length > 12 ? `\n    … and ${faults.length - 12} more` : ''}`}`);
    const thrown = [...(run.thrown ?? []), ...(canary.thrown ?? [])];
    lines.push(`1d, threw (in its own read, a failure of the job; answering for the matrices, each code read off that answer fails closed, and on a fresh pair the first reading stands; on the canary's reads, said): ${thrown.length === 0 ? 'none' : `${thrown.length}${thrown.slice(0, 12).map((line) => `\n    ${line}`).join('')}${thrown.length > 12 ? `\n    … and ${thrown.length - 12} more` : ''}`}`);
    // A turned frame's codes, read upright by both reads (B1, the thirteenth review): said by look and code.
    const upright = Object.entries(run.uprightByClass ?? {})
        .filter(([, codes]) => codes.size > 0)
        .sort(([a], [b]) => a.localeCompare(b));
    lines.push(
        `1d and the quiet zone, codes in a turned frame read upright (every transform above them held off): ` +
            (upright.length === 0 ? 'none' : upright.map(([cls, codes]) => `${cls} ${[...codes].sort().join(', ')}`).join('; ')),
    );
    // How far holding the turn off moved each code read upright, at most a corner's `UPRIGHT_TRAVEL_MODULES` modules (B1, the fifteenth review).
    const travel = [...(run.uprightTravel ?? new Map())].sort(([a], [b]) => a.localeCompare(b));
    lines.push(
        `1d and the quiet zone, the most a corner of each code read upright moved between its frame and the upright one (more than ${UPRIGHT_TRAVEL_MODULES} modules fails closed): ` +
            (travel.length === 0 ? 'none' : travel.map(([code, t]) => `${t.cls} ${code} ${t.modules.toFixed(2)} modules (${t.px.toFixed(2)}px)`).join('; ')),
    );
    const unread = [...run.unread].sort(([a], [b]) => a.localeCompare(b));
    lines.push(`1d, codes a contrast job painted and could not read: ${unread.length === 0 ? 'none' : unread.map(([code, why]) => `${code} (${why})`).join(', ')}`);
    const notRead = [...painted].filter((code) => !run.read.has(code) && !run.unread.has(code)).sort();
    lines.push(`1d, codes a geometry pass painted and no contrast job read: ${notRead.length === 0 ? 'none' : `${notRead.length}: ${notRead.join(', ')}`}`);
    lines.push(
        `1d, matrices also held to the text their plate carries (data-pay-uri): ${run.payloadChecked} code read(s); ` +
            `the least module read: ${run.leastModule === undefined || run.leastModule === Infinity ? 'none' : `${run.leastModule.toFixed(2)}px`}`,
    );
    return lines;
}
