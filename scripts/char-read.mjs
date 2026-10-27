/**
 * **1c(c): every digit, where a mover is near** (before 8g2, the plan's item
 * 1c, the owner's D-2026-10-20-06 D1 (c); report-only until step 7d binds
 * it; `PROBE-RULES.md`, "Before 8g2, 1c(c): every digit, where a mover is
 * near"). The pure half of the per-character read: how many of a
 * character's pixels its shown glyph moved at least halfway from the blanked
 * capture toward its ink, held to the count the same glyph covers on its own
 * (its reference, drawn by the probe's `charReference` on a canvas), the
 * read-again on a fresh pair, and what the run says.
 *
 * The broken-figure read (`digitRead` in the runner) counts a line's pixels,
 * so one digit wholly covered leaves the others to make up the line's count
 * (the critic's C-2). Here each character is held to its own reference: a
 * `1` in Stall Serif at 11px covers about nine pixels and a `0` about
 * twenty-five, and the count moves with the subpixel offset (the critic's
 * P2-3), so no one number of pixels a character serves both.
 */

/** A pixel is the glyph's when the shown frame moved it at least this far from the blank toward the ink: the ring read's `RING_MASK_ALPHA`. */
export const CHAR_MASK_ALPHA = 0.5;

/**
 * A character keeps at least this share of its reference count, or it is a
 * would-be failure: the plan's half. Measured first (`PROBE-RULES.md`,
 * "Before 8g2, 1c(c)"), on the clean tree with every money node of every
 * contrast job read (a scratch run that triggers every job holding money,
 * 697 of the 796 jobs, the tracked fixture carried): 60,106 characters held,
 * none under the cut. The least share a digit kept was 0.784 (Rural, a "1"
 * in Pay several's lines), 0.84 on the upright looks and 1.00 on Neo; a
 * letter 0.979; anything else 0.667 (an "=" on the wall's rate line at
 * 1920). So the margin is 0.167 at the least, 0.284 for a digit. A
 * character wholly covered keeps next to nothing: the plants' covered
 * characters read 0.00 to 0.30.
 */
export const CHAR_KEEP_CUT = 0.5;

/**
 * A character whose reference covers fewer pixels than this is too small to
 * hold to a share — a full stop, a colon or a comma at the smallest sizes,
 * where one pixel either way is a sixth of it. It is counted, by kind, never
 * held. Measured: at 4, a full stop of four reference pixels kept two on
 * Rural's pay sheet, 0.50, on the cut itself.
 */
export const CHAR_REF_MIN = 6;

/** An ink as the probe hands it (`rgb()`, `rgba()` or `color(srgb …)`), as three channels. */
export function inkOf(value) {
    const m = /rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/.exec(value);
    if (m !== null) return [Number(m[1]), Number(m[2]), Number(m[3])];
    const f = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/.exec(value);
    if (f !== null) return [f[1], f[2], f[3]].map((v) => Math.round(Number(v) * 255));
    throw new Error(`unreadable ink "${value}"`);
}

/**
 * One character's count: the pixels of its box (`floor(x)` to
 * `ceil(x + w)`, as the probe's reference counts them) whose shown pixel
 * moved at least `CHAR_MASK_ALPHA` of the way from the blank toward the ink.
 * A pixel where the ink is the blank's own colour (under one level squared)
 * cannot move and is not counted. `inside` is false where the box runs past
 * the image, which the caller holds as unread.
 */
export function charKept(blank, shown, ch) {
    const W = blank.width;
    const H = blank.height;
    const bpp = blank.bpp;
    const x0 = Math.floor(ch.x);
    const y0 = Math.floor(ch.y);
    const x1 = Math.ceil(ch.x + ch.w) - 1;
    const y1 = Math.ceil(ch.y + ch.h) - 1;
    const inside = ch.w > 0 && ch.h > 0 && x0 >= 0 && y0 >= 0 && x1 < W && y1 < H;
    if (!inside) return { kept: 0, inside: false };
    const [ir, ig, ib] = inkOf(ch.ink);
    let kept = 0;
    for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1) {
            const i = (y * W + x) * bpp;
            const dr = ir - blank.data[i];
            const dg = ig - blank.data[i + 1];
            const db = ib - blank.data[i + 2];
            const den = dr * dr + dg * dg + db * db;
            if (den < 1) continue;
            const a = ((shown.data[i] - blank.data[i]) * dr + (shown.data[i + 1] - blank.data[i + 1]) * dg + (shown.data[i + 2] - blank.data[i + 2]) * db) / den;
            if (a >= CHAR_MASK_ALPHA) kept += 1;
        }
    }
    return { kept, inside: true };
}

/** A character's kind, for the distribution: a digit, a letter, or anything else. */
export const charKind = (c) => (/\p{N}/u.test(c) ? 'digit' : /\p{L}/u.test(c) ? 'letter' : 'other');

/**
 * Every money node's characters read on one pair (`blank`, the job's own
 * capture; `shown`, its shown frame): for each target of `moneyChars`
 * (`__moneyChars`), each character's count against its reference. Answers
 * the reads, the would-be failures (kept under `CHAR_KEEP_CUT` of a
 * reference of at least `CHAR_REF_MIN`, or no box at all, or a box past the
 * image), the characters too small to hold, and the shares read.
 */
export function readMoneyChars(blank, shown, moneyChars) {
    const out = { targets: [], chars: 0, held: 0, small: 0, smallKinds: {}, would: [], shares: [] };
    for (const t of moneyChars.targets) {
        const read = { i: t.i, sel: t.sel, chars: t.chars.length, would: [] };
        out.targets.push(read);
        for (const ch of t.chars) {
            out.chars += 1;
            if (ch.w <= 0 || ch.h <= 0) {
                const w = { sel: t.sel, c: ch.c, x: ch.x, y: ch.y, kept: 0, ref: ch.ref, why: 'it has no box' };
                read.would.push(w);
                out.would.push(w);
                continue;
            }
            const { kept, inside } = charKept(blank, shown, ch);
            if (!inside) {
                const w = { sel: t.sel, c: ch.c, x: ch.x, y: ch.y, kept: 0, ref: ch.ref, why: 'its box runs past the capture' };
                read.would.push(w);
                out.would.push(w);
                continue;
            }
            if (ch.ref < CHAR_REF_MIN) {
                out.small += 1;
                const kind = charKind(ch.c);
                out.smallKinds[kind] = (out.smallKinds[kind] ?? 0) + 1;
                continue;
            }
            out.held += 1;
            const share = kept / ch.ref;
            out.shares.push({ share, kind: charKind(ch.c), ref: ch.ref, c: ch.c, sel: t.sel });
            if (share < CHAR_KEEP_CUT) {
                const w = { sel: t.sel, c: ch.c, x: ch.x, y: ch.y, kept, ref: ch.ref, why: `it keeps ${kept} of its ${ch.ref} reference pixel(s), ${share.toFixed(2)} of them, under ${CHAR_KEEP_CUT}` };
                read.would.push(w);
                out.would.push(w);
            }
        }
    }
    return out;
}

/**
 * Why the characters the page answered cannot be read as the job's, or
 * none: a capture of another size than the job's (`size`, said by the
 * caller), a live money target the page answered no character of
 * (`a money target has no rects`), and a page whose characters do not add up
 * to the ones it prepared (`prepared`: every non-space character it walked,
 * read or left out by reason).
 */
export function charsFault(moneyChars, moneyTargets) {
    const why = [];
    let counted = 0;
    for (const t of moneyChars.targets) counted += t.chars.length + Object.values(t.skipped).reduce((n, k) => n + k, 0);
    if (counted !== moneyChars.prepared) why.push(`the page prepared ${moneyChars.prepared} money character(s) and answered ${counted}`);
    const byIndex = new Map(moneyChars.targets.map((t) => [t.i, t]));
    for (const target of moneyTargets) {
        const t = byIndex.get(target.i);
        const any = t === undefined ? 0 : t.chars.length + Object.values(t.skipped).reduce((n, k) => n + k, 0);
        if (any === 0) why.push(`the money target ${target.sel} has no rects: no character of it was answered`);
    }
    return why;
}

/**
 * Whether a fresh pair's characters are the first pair's: the same nodes,
 * the same characters in the same boxes, with the same references. A pair
 * that moved anything cannot be believed (the quiet zone's own rule,
 * `readAgainOnFreshPair`: a box that moved between the captures read
 * another stretch of its ground).
 */
export function charsMoved(first, again) {
    if (first.targets.length !== again.targets.length) return `the fresh pair answered ${again.targets.length} money node(s) where the first answered ${first.targets.length}`;
    for (let k = 0; k < first.targets.length; k += 1) {
        const a = first.targets[k];
        const b = again.targets[k];
        if (a.i !== b.i || a.chars.length !== b.chars.length) return `${a.sel} answered ${b.chars.length} character(s) on the fresh pair where it answered ${a.chars.length}`;
        for (let j = 0; j < a.chars.length; j += 1) {
            const p = a.chars[j];
            const q = b.chars[j];
            if (p.c !== q.c || p.x !== q.x || p.y !== q.y || p.w !== q.w || p.h !== q.h || p.ref !== q.ref) {
                return `${a.sel}'s "${p.c}" at ${p.x.toFixed(2)},${p.y.toFixed(2)} stands at ${q.x.toFixed(2)},${q.y.toFixed(2)} as "${q.c}" on the fresh pair`;
            }
        }
    }
    return undefined;
}

/**
 * The read-again: a job whose first read has a would-be failure is read
 * again on a fresh pair (`again()`: a fresh blank, a fresh shown frame, the
 * characters answered again), and a would-be failure stands only where the
 * fresh pair, believed, fails it too. A pair that cannot be believed
 * (`charsMoved`, or a capture refused) leaves the first read standing, with
 * the reason. Answers the read that stands, and what was read again.
 */
export async function readCharsAgain(first, again) {
    if (first.read.would.length === 0) return { read: first.read, readAgain: [], unbelieved: undefined };
    const pair = await again();
    if (pair.why.length > 0) return { read: first.read, readAgain: [], unbelieved: pair.why.join('; ') };
    const moved = charsMoved(first.chars, pair.chars);
    if (moved !== undefined) return { read: first.read, readAgain: [], unbelieved: moved };
    const fresh = readMoneyChars(pair.blank, pair.shown, pair.chars);
    const still = new Set(fresh.would.map((w) => `${w.sel}|${w.c}|${w.x}|${w.y}`));
    const readAgain = first.read.would.filter((w) => !still.has(`${w.sel}|${w.c}|${w.x}|${w.y}`));
    // What stands: the would-be failures both pairs read, as the fresh pair read them.
    const firstKeys = new Set(first.read.would.map((w) => `${w.sel}|${w.c}|${w.x}|${w.y}`));
    const would = fresh.would.filter((w) => firstKeys.has(`${w.sel}|${w.c}|${w.x}|${w.y}`));
    return { read: { ...fresh, would }, readAgain, unbelieved: undefined };
}

/** The shares' histogram bins: 0.05 wide, from 0 to 1.5, and one past it. */
export const SHARE_BINS = 31;
const binOf = (share) => Math.min(SHARE_BINS - 1, Math.floor(share / 0.05));

/** A fold of shares: per kind, the count, the least (with what it was), the histogram, and the references' least and most. */
export function foldShares(into, shares, where) {
    for (const s of shares) {
        const k = (into[s.kind] ??= { n: 0, least: Infinity, leastAt: '', bins: new Array(SHARE_BINS).fill(0), refLo: Infinity, refHi: 0 });
        k.n += 1;
        k.bins[binOf(s.share)] += 1;
        if (s.share < k.least) {
            k.least = s.share;
            k.leastAt = `${where}: ${s.sel} "${s.c}" ${s.share.toFixed(3)} of ${s.ref}`;
        }
        k.refLo = Math.min(k.refLo, s.ref);
        k.refHi = Math.max(k.refHi, s.ref);
    }
    return into;
}

/** A fold of folds (`foldShares`' shape). */
export function mergeShares(into, from) {
    for (const [kind, f] of Object.entries(from)) {
        const k = (into[kind] ??= { n: 0, least: Infinity, leastAt: '', bins: new Array(SHARE_BINS).fill(0), refLo: Infinity, refHi: 0 });
        k.n += f.n;
        for (let b = 0; b < SHARE_BINS; b += 1) k.bins[b] += f.bins[b];
        if (f.least < k.least) {
            k.least = f.least;
            k.leastAt = f.leastAt;
        }
        k.refLo = Math.min(k.refLo, f.refLo);
        k.refHi = Math.max(k.refHi, f.refHi);
    }
    return into;
}

/** The share under which a given fraction of a fold's characters stand, read off its bins (the bin's upper edge). */
export function shareQuantile(f, q) {
    const want = Math.max(1, Math.ceil(f.n * q));
    let seen = 0;
    for (let b = 0; b < SHARE_BINS; b += 1) {
        seen += f.bins[b];
        if (seen >= want) return b === SHARE_BINS - 1 ? Infinity : (b + 1) * 0.05;
    }
    return Infinity;
}

/** How many would-be failures and triggered jobs the report says in full. */
export const CHAR_SAID = 30;

/**
 * What 1c(c) says under the contrast pass, whatever the verdict
 * (report-only: it fails nothing until step 7d). `run` is the fold of every
 * job's `digits`: `byVpClass` (`vp cls` → jobs, triggered, by1a, chars,
 * held, small, skipped, would, readAgain, ms), `triggers` and `would` and
 * `readAgain` and `faults` (sentences), `shares` (`foldShares` by
 * `vp cls`). Pure.
 */
export function charReport(run) {
    const lines = [];
    const byVp = Object.entries(run.byVpClass).sort(([a], [b]) => a.localeCompare(b));
    lines.push(
        `1c(c), every digit where a mover is near (report-only; char-read.mjs; a character under ${CHAR_KEEP_CUT} of its reference count, ` +
            `a reference of ${CHAR_REF_MIN} pixels or more), by viewport and look: ` +
            (byVp.length === 0
                ? 'no contrast job'
                : byVp
                      .map(
                          ([key, t]) =>
                              `${key} ${t.triggered} of ${t.jobs} job(s) triggered` +
                              (t.by1a === 0 ? '' : ` (${t.by1a} by 1a's failures)`) +
                              (t.triggered === 0 ? '' : `, ${t.chars} character(s), ${t.held} held, ${t.small} too small, ${t.skipped} left out, ${t.would} would-be, ${t.readAgain} read again`),
                      )
                      .join('; ')),
    );
    const small = Object.entries(run.smallKinds ?? {}).sort(([a], [b]) => a.localeCompare(b));
    lines.push(`1c(c), too small to hold (a reference under ${CHAR_REF_MIN} pixels), by kind: ${small.length === 0 ? 'none' : small.map(([kind, n]) => `${kind} ${n}`).join(', ')}`);
    lines.push(
        `1c(c), the trigger read on every job: ${run.movers} mover(s) over ${run.elements} element(s), ${(run.triggerMs / 1000).toFixed(2)}s of tab time; ` +
            `the read on triggered jobs ${(run.readMs / 1000).toFixed(2)}s of tab time (${run.frames} shown frame(s) of its own, ${run.shared} shared)`,
    );
    lines.push(
        `1c(c), triggered jobs: ${run.triggers.length === 0 ? 'none' : `${run.triggers.length}${run.triggers.slice(0, CHAR_SAID).map((line) => `\n    ${line}`).join('')}`}` +
            (run.triggers.length > CHAR_SAID ? `\n    … and ${run.triggers.length - CHAR_SAID} more` : ''),
    );
    const shares = Object.entries(run.shares).sort(([a], [b]) => a.localeCompare(b));
    lines.push(
        `1c(c), shares kept of the reference (kind n least p0.1% p1% median, refs lo–hi): ` +
            (shares.length === 0
                ? 'none read'
                : shares
                      .map(([key, byKind]) =>
                          `${key}: ` +
                          Object.entries(byKind)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(
                                  ([kind, f]) =>
                                      `${kind} ${f.n} ${f.least.toFixed(2)} ${shareQuantile(f, 0.001).toFixed(2)} ${shareQuantile(f, 0.01).toFixed(2)} ${shareQuantile(f, 0.5).toFixed(2)}, refs ${f.refLo}–${f.refHi}`,
                              )
                              .join(', '),
                      )
                      .join('; ')),
    );
    if (shares.length > 0) {
        lines.push(
            `1c(c), the least share read, by viewport and look: ` +
                shares
                    .map(([key, byKind]) => {
                        const least = Object.values(byKind).sort((a, b) => a.least - b.least)[0];
                        return least === undefined ? `${key} none` : `${key} ${least.leastAt}`;
                    })
                    .join('; '),
        );
        const byKind = new Map();
        for (const [, kinds] of shares) for (const [kind, f] of Object.entries(kinds)) if (f.least < (byKind.get(kind)?.least ?? Infinity)) byKind.set(kind, f);
        lines.push(`1c(c), the least share read, by kind: ${[...byKind].sort(([a], [b]) => a.localeCompare(b)).map(([kind, f]) => `${kind} ${f.leastAt}`).join('; ')}`);
    }
    if (run.would.length === 0) {
        lines.push('1c(c), would-be failures: none');
    } else {
        const byNode = new Map();
        for (const line of run.would) {
            const m = /^(\S+) @(\S+) \/ theme (\S+)[^:]*: (\S+) "/.exec(line);
            const node = m === null ? 'unparsed' : `${m[2]}/${m[1]}:${m[4]}`;
            byNode.set(node, (byNode.get(node) ?? 0) + 1);
        }
        lines.push(
            `1c(c), would-be failures: ${run.would.length} character(s); by node (characters): ` +
                [...byNode]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([node, n]) => `${node} ${n}`)
                    .join(', '),
        );
        for (const line of run.would.slice(0, CHAR_SAID)) lines.push(`  ${line}`);
        if (run.would.length > CHAR_SAID) lines.push(`  … and ${run.would.length - CHAR_SAID} more`);
    }
    lines.push(
        `1c(c), read again on a fresh pair and kept there: ${run.readAgain.length === 0 ? 'none' : `${run.readAgain.length}${run.readAgain.slice(0, CHAR_SAID).map((line) => `\n    ${line}`).join('')}`}`,
    );
    lines.push(`1c(c), could not be read (it fails nothing): ${run.faults.length === 0 ? 'none' : `${run.faults.length}${run.faults.slice(0, CHAR_SAID).map((line) => `\n    ${line}`).join('')}`}`);
    return lines;
}
