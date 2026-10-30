/**
 * **1c(c): every digit, where a mover is near** (before 8g2, the plan's item
 * 1c, the owner's D-2026-10-20-06 D1 (c); bound since step 7d, the owner's
 * D-2026-10-30-02: its failures fail the contrast pass; `PROBE-RULES.md`,
 * "Before 8g2, 1c(c): every digit, where a mover is near" and "Before 8g2,
 * 7d: 1c binds"). The pure half of the per-character read: how many of a
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

/** The check 1c's failures carry (bound since 7d): every money character on a job whose trigger fired keeps its glyph. */
export const CHAR_CHECK = 'every-money-character-reads-where-a-mover-is-near';

/** A pixel is the glyph's when the shown frame moved it at least this far from the blank toward the ink: the ring read's `RING_MASK_ALPHA`. */
export const CHAR_MASK_ALPHA = 0.5;

/**
 * A character keeps at least this share of its reference count, or it is a
 * failure (bound since 7d): the plan's half. Measured first (`PROBE-RULES.md`,
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

/**
 * A character on a turned frame (Rural's swaying tag and tilted rows: the
 * compositor resamples the frame's upright raster into the turn) is held
 * only where the least of the sixteen phases of the turn leaves its glyph at
 * least this many pixels: where some phase leaves it fewer, the turn alone
 * can erase it, and a character read at that phase would read as covered
 * with nothing over it. Measured (`PROBE-RULES.md`, "Before 8g2, 1c(c): the
 * eleventh review's fixes"), with every job holding money read: the "=" on
 * Rural's Pay several strip is erased whole at four to eight of its sixteen
 * phases, and on the page its four reads kept 0, 4, 5 and 10 pixels where
 * its other phases draw 8 to 11 — held, it would fail with nothing over it;
 * every turned character a floor of 1, 2 or 3 holds is held by all three, and
 * at 4 ten letters drop out. Its glyph drawn upright says whether it is too
 * small (`CHAR_REF_MIN`; the critic's P1: the least of the sixteen fell to 3–5
 * for digits that keep 12–18 on the page, Rural's "+5% surcharge" "5" and its
 * selection line's "7", which are held now).
 */
export const CHAR_TURN_FLOOR = 3;

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
 * the image, which the caller holds as unread. `mask` (where asked for) is
 * which of the box's pixels were counted, row by row.
 */
export function charKept(blank, shown, ch, withMask = false) {
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
    const mask = withMask ? new Uint8Array((x1 - x0 + 1) * (y1 - y0 + 1)) : undefined;
    let kept = 0;
    let k = 0;
    for (let y = y0; y <= y1; y += 1) {
        for (let x = x0; x <= x1; x += 1, k += 1) {
            const i = (y * W + x) * bpp;
            const dr = ir - blank.data[i];
            const dg = ig - blank.data[i + 1];
            const db = ib - blank.data[i + 2];
            const den = dr * dr + dg * dg + db * db;
            if (den < 1) continue;
            const a = ((shown.data[i] - blank.data[i]) * dr + (shown.data[i + 1] - blank.data[i + 1]) * dg + (shown.data[i + 2] - blank.data[i + 2]) * db) / den;
            if (a >= CHAR_MASK_ALPHA) {
                kept += 1;
                if (mask !== undefined) mask[k] = 1;
            }
        }
    }
    return mask === undefined ? { kept, inside: true } : { kept, inside: true, mask };
}

/** A mask as the probe hands it (hex, four pixels a digit, the first the high bit), as one byte a pixel over `n` pixels. */
export function maskBits(hex, n) {
    const out = new Uint8Array(n);
    for (let k = 0; k < n; k += 1) out[k] = (Number.parseInt(hex[k >> 2] ?? '0', 16) >> (3 - (k & 3))) & 1;
    return out;
}

/**
 * How far below the best match a phase may match the shown pixels and still
 * stand for the character (`turnRef`): a share of the masks' union, 0 to 1.
 * The twelfth critic's J5, measured in mask space over the builder's 2,350
 * turned characters (`critic12/tools/turnref-estimators.py`): 0 clean false
 * reds, and 238 covers that leave under half of a glyph's own pixels passing
 * against 558 with no margin; fitted on those characters, so measured again
 * with every money job read before it was bound (`PROBE-RULES.md`, "Before
 * 8g2: 1c's two holes").
 */
export const TURN_MATCH_MARGIN = 0.2;

/**
 * The reference a character on a turned frame is held to: the largest count
 * among the phases of the turn (`turn`, the probe's sixteen) whose masks its
 * shown pixels (`shown`, `charKept`'s mask) match within `TURN_MATCH_MARGIN`
 * of the best match, a match being the share of the two masks' union they
 * share. A glyph covered whole matches none and is held to the largest.
 *
 * **A cover cannot choose its own phase** (the twelfth critic's item 1, J5;
 * the owner's D-2026-10-30-02): held to the one phase its shown pixels match
 * best, as until then, a partial cover left a glyph that matched a thinner,
 * lower-count phase, so the reference shrank with the glyph — TRN's box over
 * the top 62% of Rural's surcharge and selection lines left a "7" 3 of 12
 * pixels and passed it at 0.60 against a phase that counts 5; in mask space
 * 175 under-half covers passed only because their leftovers chose their
 * phase. Every phase near the best stands for it now, and the largest of
 * them is held, so a leftover that matches a thin phase best is still held
 * to the full phases it nearly matches. Held to the least of the sixteen,
 * before the eleventh review, a partial cover passed outright; held to the
 * largest of all sixteen, two clean characters read under the cut in mask
 * space. Answers the chosen phase, its count and its match.
 */
export function turnRef(shown, turn) {
    const matches = turn.counts.map((count, phase) => {
        const mask = maskBits(turn.masks[phase], shown.length);
        let both = 0;
        let either = 0;
        for (let k = 0; k < shown.length; k += 1) {
            both += shown[k] & mask[k];
            either += shown[k] | mask[k];
        }
        return { phase, ref: count, match: either === 0 ? 0 : both / either };
    });
    const best = Math.max(...matches.map((m) => m.match));
    let chosen = { phase: 0, ref: -1, match: -1 };
    for (const m of matches) {
        if (m.match < best - TURN_MATCH_MARGIN - 1e-12) continue;
        if (m.ref > chosen.ref || (m.ref === chosen.ref && m.match > chosen.match)) chosen = m;
    }
    return chosen;
}

/** A character's kind, for the distribution: a digit, a letter, or anything else. */
export const charKind = (c) => (/\p{N}/u.test(c) ? 'digit' : /\p{L}/u.test(c) ? 'letter' : 'other');

/**
 * Every money node's characters read on one pair (`blank`, the job's own
 * capture; `shown`, its shown frame): for each target of `moneyChars`
 * (`__moneyChars`), each character's count against its reference. Answers
 * the reads, the failures (`would`: kept under `CHAR_KEEP_CUT` of a
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
            const turned = ch.turn !== undefined;
            const { kept, inside, mask } = charKept(blank, shown, ch, turned);
            if (!inside) {
                const w = { sel: t.sel, c: ch.c, x: ch.x, y: ch.y, kept: 0, ref: ch.ref, why: 'its box runs past the capture' };
                read.would.push(w);
                out.would.push(w);
                continue;
            }
            // Too small: its reference under CHAR_REF_MIN (on a turned frame, its glyph drawn upright), or a phase of the turn that leaves it under CHAR_TURN_FLOOR.
            const erased = turned && Math.min(...ch.turn.counts) < CHAR_TURN_FLOOR;
            if (ch.ref < CHAR_REF_MIN || erased) {
                out.small += 1;
                const kind = ch.ref >= CHAR_REF_MIN ? `${charKind(ch.c)} on a turn` : charKind(ch.c);
                out.smallKinds[kind] = (out.smallKinds[kind] ?? 0) + 1;
                continue;
            }
            const ref = turned ? turnRef(mask, ch.turn).ref : ch.ref;
            out.held += 1;
            const share = kept / ref;
            out.shares.push({ share, kind: charKind(ch.c), ref, c: ch.c, sel: t.sel, turned });
            if (share < CHAR_KEEP_CUT) {
                const w = { sel: t.sel, c: ch.c, x: ch.x, y: ch.y, kept, ref, why: `it keeps ${kept} of its ${ref} reference pixel(s)${turned ? ' (the largest phase of its turn its shown pixels match within the margin of the best)' : ''}, ${share.toFixed(2)} of them, under ${CHAR_KEEP_CUT}` };
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
            if (p.c !== q.c || p.x !== q.x || p.y !== q.y || p.w !== q.w || p.h !== q.h || p.ref !== q.ref || p.turn?.counts.join() !== q.turn?.counts.join()) {
                return `${a.sel}'s "${p.c}" at ${p.x.toFixed(2)},${p.y.toFixed(2)} stands at ${q.x.toFixed(2)},${q.y.toFixed(2)} as "${q.c}" on the fresh pair`;
            }
        }
    }
    return undefined;
}

/**
 * The read-again: a job whose first read has a failure is read again on a
 * fresh pair (`again()`: a fresh blank, a fresh shown frame, the characters
 * answered again). Where the fresh pair is believed, a failure stands if the
 * pair fails it too, and one the pair reads whole is
 * said as read again; a pair that cannot be believed (`charsMoved`, or a
 * capture refused) leaves the first read standing, with the reason.
 * Answers the read that stands, and what was read again.
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
    // What stands: the failures both pairs read, as the fresh pair read them.
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

/**
 * **A node the trigger met that read no character** (the fifteenth review's
 * item 2, the owner's D-2026-10-31-01): of the money nodes `moneyChars`
 * answered (`__moneyChars`), each whose index is in `met` (the nodes a mover
 * met, `digitTrigger`'s `met`) that answered no character to read, with at
 * least one left out turned past 2° (`turned`) or too big for the reference
 * canvas (`too big`). Judged per job, a cover over a node turned past 2°
 * passed wherever the screen's other money was read (the critic's TS3, TS
 * with the price's tag tilted 3°: 165 characters left out, 0 failing). A
 * node whose characters all stand behind a scroller (`clipped`) is a stated
 * limit and answers nothing here. Answers one sentence a node. Pure.
 */
export function metNodesUnread(moneyChars, met) {
    const out = [];
    const wanted = new Set(met);
    for (const t of moneyChars?.targets ?? []) {
        if (!wanted.has(t.i) || t.chars.length > 0) continue;
        const turned = t.skipped?.turned ?? 0;
        const big = t.skipped?.['too big'] ?? 0;
        if (turned + big === 0) continue;
        const left = [turned > 0 ? `${turned} turned past 2°` : '', big > 0 ? `${big} too big` : '', (t.skipped?.clipped ?? 0) > 0 ? `${t.skipped.clipped} behind a scroller` : '']
            .filter((said) => said !== '')
            .join(', ');
        out.push(`its trigger met ${t.sel} and no character of it was read (left out: ${left})`);
    }
    return out;
}

/**
 * **The read owed per look** (7d): on each viewport, a look whose contrast
 * jobs the trigger fired on must have had characters read there — a trigger
 * that fired and read nothing is a read that did not happen. **And the
 * trigger is owed its own walk** (the fifteenth review's item 1): on each
 * viewport, every job of the look holding money (`money`) must have had the
 * trigger walk it (`walked`: a prepare that answered a trigger, which held
 * movers to money over the elements it walked), or a trigger that stopped
 * answering reads as one that found nothing. `byVpClass` is the run's fold
 * (`vp cls` → `money`, `walked`, `triggered`, `chars`, …), `classes` the
 * looks held here (the public looks in the runner, each carried look on its
 * own in `look-tallies.mjs`). Answers one sentence a viewport and look that
 * owes, none where every job holding money was walked and the trigger fired
 * on none. Pure.
 */
export function charsOwedFaults(byVpClass, classes) {
    const out = [];
    for (const [key, t] of Object.entries(byVpClass ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
        const at = key.indexOf(' ');
        const vp = key.slice(0, at);
        const cls = key.slice(at + 1);
        if (!classes.includes(cls)) continue;
        if ((t.money ?? 0) > (t.walked ?? 0)) out.push(`${CHAR_CHECK}: its trigger walked ${t.walked ?? 0} of the ${t.money} ${cls} job(s) holding money at ${vp}`);
        if (t.triggered > 0 && t.chars === 0) out.push(`${CHAR_CHECK}: its trigger fired on ${t.triggered} ${cls} job(s) at ${vp} and read no character on them`);
    }
    return out;
}

/** How many failures and triggered jobs the report says in full. */
export const CHAR_SAID = 30;

/**
 * What 1c(c) says under the contrast pass, whatever the verdict (bound since
 * 7d: its failures are the contrast pass's, and are said with its own lines
 * there too). `run` is the fold of every job's `digits`: `byVpClass`
 * (`vp cls` → jobs, triggered, by1a, chars, held, small, skipped, would,
 * readAgain, ms), `triggers`, `would` (the characters that failed),
 * `readAgain`, `faults` (what could not be read), `thrown` and `empty` (a
 * job its trigger fired on that read no character), each sentences, and
 * `shares` (`foldShares` by `vp cls`). Pure.
 */
export function charReport(run) {
    const lines = [];
    const byVp = Object.entries(run.byVpClass).sort(([a], [b]) => a.localeCompare(b));
    lines.push(
        `1c(c), every digit where a mover is near (${CHAR_CHECK}, bound; char-read.mjs; a character under ${CHAR_KEEP_CUT} of its reference count, ` +
            `a reference of ${CHAR_REF_MIN} pixels or more), by viewport and look: ` +
            (byVp.length === 0
                ? 'no contrast job'
                : byVp
                      .map(
                          ([key, t]) =>
                              `${key} ${t.triggered} of ${t.jobs} job(s) triggered` +
                              (t.by1a === 0 ? '' : ` (${t.by1a} by 1a's failures)`) +
                              (t.triggered === 0 ? '' : `, ${t.chars} character(s), ${t.held} held, ${t.small} too small, ${t.skipped} left out, ${t.would} failing, ${t.readAgain} read again`),
                      )
                      .join('; ')),
    );
    const small = Object.entries(run.smallKinds ?? {}).sort(([a], [b]) => a.localeCompare(b));
    lines.push(
        `1c(c), too small to hold (a reference under ${CHAR_REF_MIN} pixels — on a turned frame, its glyph drawn upright — or, "on a turn", a phase of the turn leaving it under ${CHAR_TURN_FLOOR}), by kind: ` +
            (small.length === 0 ? 'none' : small.map(([kind, n]) => `${kind} ${n}`).join(', ')),
    );
    lines.push(
        `1c(c), the trigger read on every job: ${run.movers} mover(s) over ${run.elements} element(s), ${(run.triggerMs / 1000).toFixed(2)}s of tab time; ` +
            `the read on triggered jobs ${(run.readMs / 1000).toFixed(2)}s of tab time (${run.frames} shown frame(s) of its own, ${run.shared} shared)`,
    );
    lines.push(
        `1c(c), the trigger's walk, owed on every job holding money, by viewport and look: ` +
            (byVp.length === 0
                ? 'no contrast job'
                : byVp.map(([key, t]) => `${key} ${t.walked ?? 0} of ${t.money ?? 0} walked, ${t.movers ?? 0} mover(s) over ${t.elements ?? 0} element(s)`).join('; ')),
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
        lines.push('1c(c), failures: none');
    } else {
        const byNode = new Map();
        for (const line of run.would) {
            const m = /^(\S+) @(\S+) \/ theme (\S+)[^:]*: (\S+) "/.exec(line);
            const node = m === null ? 'unparsed' : `${m[2]}/${m[1]}:${m[4]}`;
            byNode.set(node, (byNode.get(node) ?? 0) + 1);
        }
        lines.push(
            `1c(c), failures: ${run.would.length} character(s); by node (characters): ` +
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
    const said = (list) => (list.length === 0 ? 'none' : `${list.length}${list.slice(0, CHAR_SAID).map((line) => `\n    ${line}`).join('')}${list.length > CHAR_SAID ? `\n    … and ${list.length - CHAR_SAID} more` : ''}`);
    lines.push(`1c(c), could not be read (each a failure): ${said(run.faults)}`);
    lines.push(`1c(c), triggered and read no character, on the job or on a node it met (each a failure): ${said(run.empty ?? [])}`);
    lines.push(`1c(c), a prepare that answered no trigger (each a failure): ${said(run.unwalked ?? [])}`);
    lines.push(`1c(c), threw and was caught (each a failure): ${said(run.thrown ?? [])}`);
    return lines;
}
