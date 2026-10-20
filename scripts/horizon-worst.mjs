/**
 * **Grid horizon at its worst: the owner's numbers** (step 5a″, the owner's
 * C, 2026-09-27). The contrast pass reads the sign's lines a second time on
 * a frame with the horizon's skyline and stars flattened to their brightest
 * paint over the sky band (`__horizonAtItsWorst` in the probe) — a known
 * limit the owner accepted: another seller's words can put a glyph beside a
 * lit window or a star, where the ring reads as low as these. Each part
 * carries the least read and the job it was read on.
 *
 * `horizonWorstVerdict` holds a run to them (the critic, step 5a″ item 1):
 * the job each number was read on is owed and must read that number again
 * (within `SAME`) — lower is a regression, higher means the constant is
 * stale and must be updated, never merely printed.
 *
 * **Those three jobs are the only ones read** (D-2026-10-20-13, the owner's
 * D2(a)): the runner reads the sign at the horizon's worst on them alone
 * (`readsHorizonWorst` in `layout-check.mjs`), where until then it read
 * every job that wore the horizon (94 on the default plan) and held that no
 * other job read lower. That guard is what is lost: a regression at the
 * horizon's worst on any other job — another screen, width or variant —
 * passes the run. A read on any other job is now a failure here, so the
 * prune is held rather than assumed. Pure; pinned by
 * `horizon-worst.test.mjs`.
 */
export const HORIZON_WORST = {
    // Read 2026-09-27 with the flat layer clipped to the sky band: 2.7589,
    // 1.9153 and 9.2974. Clipping moved the state line (7.25 over the
    // whole sign), which stands below the line, and not the other two.
    name: { least: 2.76, job: 'desktop/unreachable/2/65535' },
    tagline: { least: 1.92, job: 'desktop/shop-window-cycle/2/65535' },
    sub: { least: 9.3, job: 'mobile/item-listing/2/65535' },
};

/** How close a re-read of the pinned job must come to its number. */
export const SAME = 0.01;

/**
 * The verdict over `reads` — part → job key → least read — as failures (and
 * nothing else: a run that matches the numbers says nothing). A read on a
 * job no number was read on fails: the runner reads the pinned jobs alone.
 */
export function horizonWorstVerdict(reads, pinned = HORIZON_WORST) {
    const fail = [];
    for (const [part, { least, job }] of Object.entries(pinned)) {
        const byJob = reads.get(part) ?? new Map();
        const at = byJob.get(job);
        if (at === undefined) {
            fail.push(`the sign's ${part} at Grid horizon's worst was not read on ${job}, the job its number ${least.toFixed(2)} was read on`);
            continue;
        }
        if (at < least - SAME) {
            fail.push(`the sign's ${part} at Grid horizon's worst reads ${at.toFixed(2)}:1 on ${job}, under its ${least.toFixed(2)} — a regression`);
        } else if (at > least + SAME) {
            fail.push(`the sign's ${part} at Grid horizon's worst reads ${at.toFixed(2)}:1 on ${job}, over its ${least.toFixed(2)} — update HORIZON_WORST`);
        }
    }
    const pinnedJobs = new Set(Object.values(pinned).map((at) => at.job));
    for (const [part, byJob] of reads) {
        for (const [other, read] of byJob) {
            if (!pinnedJobs.has(other)) {
                fail.push(`the sign's ${part} at Grid horizon's worst was read on ${other} (${read.toFixed(2)}:1), a job no pinned number was read on — the runner reads the pinned jobs alone (D2(a))`);
            }
        }
    }
    return fail;
}
