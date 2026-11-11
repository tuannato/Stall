/**
 * **Where the probe's time goes, by look** (O1 of the probe-prune plan,
 * D-2026-11-11-04). The runner timed passes and phases and never looks, so
 * every per-look figure the plan priced was a subtraction or a share of
 * paints. These are the pure halves of the two splits it prints now:
 *
 * - each geometry pass's measuring, split by the look the page was
 *   measuring (`lookMs` and `measureMs` in the probe's verdict, page
 *   seconds), with what no look accounts for (the faces, the cross-look
 *   reads after the loop) as its own row;
 * - each contrast phase, split by the look of the job it ran inside (an
 *   `AsyncLocalStorage` around each job in the runner): a phase called
 *   outside any job (a page load, the plan reads) is `(shared)`. Every
 *   phase's per-look parts sum to its total by construction, and the table
 *   says so in a row that must read 0 (`(unattributed)`).
 *
 * Clocks only: nothing here is a verdict, and the contrast dump does not
 * move (`node scripts/contrast-dump.mjs`). Test: `look-timing.test.mjs`.
 */

/** The bucket for time no look's job accounts for. */
export const SHARED = '(shared)';

/** Sum a list of `{ cls: ms }` maps. */
export function lookTotals(maps) {
    const out = {};
    for (const map of maps) {
        for (const [cls, ms] of Object.entries(map ?? {})) out[cls] = (out[cls] ?? 0) + ms;
    }
    return out;
}

const s = (ms) => `${(ms / 1000).toFixed(1)}s`;

/** The geometry split as lines: the run's totals, then each pass's. */
export function geometryLookLines(passes) {
    if (passes.length === 0) return [];
    const totals = lookTotals(passes.map((at) => at.lookMs));
    const measuring = passes.reduce((sum, at) => sum + at.measureMs, 0);
    const attributed = Object.values(totals).reduce((a, b) => a + b, 0);
    const order = Object.keys(totals).sort();
    const lines = [
        `  geometry by look (page seconds, each pass's measuring split by the look being measured; O1): ` +
            order.map((cls) => `${cls} ${s(totals[cls])}`).join(', ') +
            ` · not a look's (faces, the cross-look reads) ${s(Math.max(0, measuring - attributed))} · of ${s(measuring)} measuring`,
    ];
    for (const { pass, lookMs, measureMs } of passes) {
        const mine = Object.keys(lookMs ?? {}).sort();
        if (mine.length === 0) continue;
        lines.push(`    ${pass}: ${mine.map((cls) => `${cls} ${s(lookMs[cls])}`).join(', ')} of ${s(measureMs)}`);
    }
    return lines;
}

/**
 * The contrast phases split by look as a table: one row per phase, one
 * column per look and `(shared)`, then each look's total, the jobs' own
 * tab time per look (`jobMs`), and the row that must read 0 — a phase
 * whose parts do not sum to its total (`phaseTotals`).
 */
export function contrastLookLines(byLook, phaseTotals, jobMs = {}) {
    const classes = [...new Set([...byLook.values()].flatMap((m) => [...m.keys()]))].sort((a, b) =>
        a === SHARED ? 1 : b === SHARED ? -1 : a.localeCompare(b),
    );
    if (classes.length === 0) return [];
    const width = Math.max(10, ...classes.map((cls) => cls.length + 1));
    const lines = [`    by look (tab seconds; a phase outside any job is ${SHARED}; some phases run inside others, so a look's total can pass its jobs' own time; O1)`, `    ${'phase'.padEnd(16)} ${classes.map((cls) => cls.padStart(width)).join('')}`];
    const sums = Object.fromEntries(classes.map((cls) => [cls, 0]));
    let unattributed = 0;
    for (const [phase, map] of byLook) {
        let parts = 0;
        const cells = classes.map((cls) => {
            const ms = map.get(cls) ?? 0;
            parts += ms;
            sums[cls] += ms;
            return (ms === 0 ? '' : s(ms)).padStart(width);
        });
        unattributed += Math.abs((phaseTotals.get(phase) ?? 0) - parts);
        lines.push(`    ${phase.padEnd(16)} ${cells.join('')}`);
    }
    lines.push(`    ${'total'.padEnd(16)} ${classes.map((cls) => s(sums[cls]).padStart(width)).join('')}`);
    lines.push(`    ${'jobs (tab time)'.padEnd(16)} ${classes.map((cls) => (jobMs[cls] === undefined ? '' : s(jobMs[cls])).padStart(width)).join('')}`);
    lines.push(`    ${'(unattributed)'.padEnd(16)} ${s(unattributed)} — every phase's per-look parts sum to its total`);
    return lines;
}

/** Every phase's per-look parts against its total: the phases whose parts do not sum to it (to a microsecond), or none. */
export function unattributedPhases(byLook, phaseTotals) {
    const out = [];
    for (const [phase, total] of phaseTotals) {
        const parts = [...(byLook.get(phase)?.values() ?? [])].reduce((a, b) => a + b, 0);
        if (Math.abs(parts - total) > 0.001) out.push(phase);
    }
    return out;
}
