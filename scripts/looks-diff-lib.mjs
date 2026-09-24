/**
 * The judgement half of `pnpm looks:diff` (`looks-diff.mjs`), kept pure so
 * it can be tested on synthetic images (`looks-diff-lib.test.mjs`): which
 * pixels two captures differ in, whether a difference is the change or the
 * browser, and what the run as a whole says.
 *
 * An image is `{ width, height, bpp, data }` as `decodePng` returns it (RGB
 * or RGBA, 8-bit). A mask is a rectangle `{ x, y, w, h }` in image pixels
 * whose pixels are never compared — the ticker's moving ribbon, which no
 * pause makes the same twice.
 */

/**
 * A difference seen in ONE before/after pair and not in the other is excused
 * as the browser's when it is at most this many pixels — a single pixel of a
 * glow read in one of two states. It excuses nothing that reproduces: a
 * difference seen in both pairs is the change's, whatever its size.
 */
export const NOISE_PX = 4;

/**
 * How many showroom loads one page takes before it is closed and a fresh one
 * opened in a fresh browser context. Measured 2026-09-24 on the 4-core box,
 * one page reloading the showroom and painting one screen per load: every
 * load left about two documents alive in the renderer (Chrome's own
 * `Documents` metric, 4 → 272 over 125 loads; the JS heap 1.9 → 102.7 MB),
 * and the renderer crashed (`Target.targetCrashed`, error 133) or stopped
 * answering at load 131, 251 and 251 in three runs — what the recheck phase,
 * which reloads before every shot, met after ~400 differing shots. Renewed
 * every 50 loads, 500 loads ran through and the heap never passed 41 MB.
 */
export const LOADS_PER_PAGE = 50;

/** Whether a page that has taken `loads` showroom loads must be replaced before the next one. */
export function pageIsSpent(loads) {
    return loads >= LOADS_PER_PAGE;
}

function masked(masks, x, y) {
    return masks.some((m) => x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h);
}

/**
 * Where `a` and `b` differ: a bitmap over the larger of the two frames (a
 * pixel outside either frame differs), with the masked pixels skipped, and
 * how many differ.
 */
export function diffMap(a, b, masks = []) {
    const width = Math.max(a.width, b.width);
    const height = Math.max(a.height, b.height);
    const bits = new Uint8Array(width * height);
    let count = 0;
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            if (masks.length > 0 && masked(masks, x, y)) continue;
            let same = x < a.width && y < a.height && x < b.width && y < b.height;
            if (same) {
                const i = (y * a.width + x) * a.bpp;
                const j = (y * b.width + x) * b.bpp;
                for (let c = 0; c < 3; c += 1) {
                    if (a.data[i + c] !== b.data[j + c]) same = false;
                }
                const alphaA = a.bpp === 4 ? a.data[i + 3] : 255;
                const alphaB = b.bpp === 4 ? b.data[j + 3] : 255;
                if (alphaA !== alphaB) same = false;
            }
            if (!same) {
                bits[y * width + x] = 1;
                count += 1;
            }
        }
    }
    return { width, height, bits, count };
}

/** How many pixels are set in every map given (maps of one frame size). */
function bothSet(first, second, excluded) {
    if (first.width !== second.width || first.height !== second.height) return 0;
    let n = 0;
    for (let p = 0; p < first.bits.length; p += 1) {
        if (first.bits[p] === 1 && second.bits[p] === 1 && !excluded.some((map) => map.bits[p] === 1)) n += 1;
    }
    return n;
}

/**
 * One shot's verdict.
 *
 * `before1`/`after1` is the first pair (the ref, the working tree). When they
 * differ, the caller takes both again on freshly loaded pages —
 * `before2`/`after2` — and:
 *
 * - **identical**: the first pair agrees (masked pixels aside).
 * - **real**: some pixel differs in BOTH pairs while each side agrees with
 *   itself there — the difference reproduced, and it is the change's,
 *   whatever its size. `count` is those pixels.
 * - **noise**: only one pair differs, by at most `NOISE_PX`.
 * - **inconclusive**: anything else — one pair differs by more than
 *   `NOISE_PX`, or both differ but only where a side does not agree with
 *   itself (both sides flickering). Never counted either way.
 */
export function classify({ before1, after1, before2, after2, masks = [] }) {
    const d1 = diffMap(before1, after1, masks);
    if (d1.count === 0) {
        return { verdict: 'identical', count: 0, d1: 0, d2: 0, selfRef: 0, selfWork: 0 };
    }
    if (before2 === undefined || after2 === undefined) {
        throw new Error('a first pair that differs needs a second pair to be judged');
    }
    const d2 = diffMap(before2, after2, masks);
    const selfRef = diffMap(before1, before2, masks);
    const selfWork = diffMap(after1, after2, masks);
    const facts = { d1: d1.count, d2: d2.count, selfRef: selfRef.count, selfWork: selfWork.count };
    if (d2.count === 0) {
        return d1.count <= NOISE_PX
            ? { verdict: 'noise', count: d1.count, ...facts }
            : { verdict: 'inconclusive', count: d1.count, ...facts };
    }
    const stable = bothSet(d1, d2, [selfRef, selfWork]);
    if (stable > 0) {
        return { verdict: 'real', count: stable, ...facts };
    }
    return { verdict: 'inconclusive', count: Math.max(d1.count, d2.count), ...facts };
}

/**
 * One `--expect` token, read: a screen, or a screen qualified by a look and a
 * variant — `offers`, `offers:neo-city/worn`, `offers:neo-city` (either
 * variant), and `*` for every screen (`*:neo-city/worn`: every Neo worn
 * shot). The look is its label's slug (`Neo city` → `neo-city`), the
 * variant `bare` or `worn`, and `*` stands for any. A plain screen is every
 * look and variant on it, as before.
 */
export function parseExpect(token) {
    const m = /^([a-z0-9*-]+)(?::([a-z0-9*-]+)(?:\/(bare|worn|\*))?)?$/.exec(token);
    if (m === null) throw new Error(`--expect: "${token}" is not screen[:look[/variant]]`);
    return { token, screen: m[1], look: m[2] ?? '*', variant: m[3] ?? '*' };
}

/** A label's slug, as the diff plan writes it (`layout/shotPlan.ts`). */
export function lookSlug(label) {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Whether a parsed token covers a shot: its screen, its look's slug and its variant. */
export function expectCovers(want, entry) {
    const is = (pattern, value) => pattern === '*' || pattern === value;
    return is(want.screen, entry.screen) && is(want.look, entry.look ?? '') && is(want.variant, entry.variant ?? '');
}

/**
 * What a run's verdicts prove against its `--expect` tokens (`parseExpect`):
 *
 * - `code` 1 when a real difference is on a shot no token covers, or a token
 *   was not compared or covered no real difference — the proof does not say
 *   what it was asked to. A token is compared when its screen was (a `*`
 *   screen always is); it is met when some real difference is one it covers;
 * - else `code` 2 when anything is inconclusive — no ✓;
 * - else `code` 0.
 */
export function summarize(entries, { expected = [], compared = new Set() } = {}) {
    const wants = expected.map(parseExpect);
    const covered = (entry) => wants.some((want) => expectCovers(want, entry));
    const real = entries.filter((e) => e.verdict === 'real');
    const unexpected = real.filter((e) => !covered(e));
    const notCompared = wants.filter((want) => want.screen !== '*' && !compared.has(want.screen)).map((want) => want.token);
    const unmet = wants
        .filter((want) => want.screen === '*' || compared.has(want.screen))
        .filter((want) => !real.some((e) => expectCovers(want, e)))
        .map((want) => want.token);
    const inconclusive = entries.filter((e) => e.verdict === 'inconclusive');
    const noise = entries.filter((e) => e.verdict === 'noise');
    const code = unexpected.length > 0 || notCompared.length > 0 || unmet.length > 0 ? 1 : inconclusive.length > 0 ? 2 : 0;
    return {
        code,
        unexpected,
        expectedReal: real.filter(covered),
        notCompared,
        unmet,
        inconclusive,
        noise,
    };
}
