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
import { QUIET_MODULES, readAgainOnFreshPair, readingContext } from './quiet-zone.mjs';

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
 * Every code of one job's modules read, and a code read wrong read again on
 * a fresh pair under the quiet zone's own rule (`readAgainOnFreshPair`;
 * `first` and `again` as `readQuietZones` takes them, the zones carrying
 * their matrices). One answer per zone, in order, as that read answers.
 */
export function readCodeModules(first, again) {
    return readAgainOnFreshPair(first, again, readModules, {
        unit: 'module centres',
        nothing: 'no module centre of it is on screen',
        same: sameMatrix,
    });
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
    lines.push(`1d, failed closed (failures: a module under ${MODULE_MIN_PX}px, a matrix it cannot read or pair): ${faults.length === 0 ? 'none' : `${faults.length}${faults.slice(0, 12).map((line) => `\n    ${line}`).join('')}${faults.length > 12 ? `\n    … and ${faults.length - 12} more` : ''}`}`);
    const thrown = [...(run.thrown ?? []), ...(canary.thrown ?? [])];
    lines.push(`1d, threw (each a failure on the walk; on the canary's reads, said): ${thrown.length === 0 ? 'none' : `${thrown.length}${thrown.slice(0, 12).map((line) => `\n    ${line}`).join('')}${thrown.length > 12 ? `\n    … and ${thrown.length - 12} more` : ''}`}`);
    // A turned frame's codes are read by neither 1d nor the quiet zone: said by look and code, never passed in silence.
    const turned = Object.entries(run.turnedByClass ?? {})
        .filter(([, codes]) => codes.size > 0)
        .sort(([a], [b]) => a.localeCompare(b));
    lines.push(
        `1d, codes not read because their frame is turned (not held by 1d or by the quiet zone; stated): ` +
            (turned.length === 0 ? 'none' : turned.map(([cls, codes]) => `${cls} ${[...codes].sort().join(', ')}`).join('; ')),
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
