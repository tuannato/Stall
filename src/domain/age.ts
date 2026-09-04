/**
 * How long ago a record was written, from the chain's own clock.
 *
 * **A duration, not a calendar difference.** A month here is thirty days and a
 * year is three hundred and sixty-five, because the alternative is calendar
 * arithmetic in a timezone this page has no business choosing — the same figure
 * would then read differently depending on which month somebody opened the
 * stall in. What a reader is pricing is how long the seller's quote has been
 * sitting there, and that is a length of time.
 *
 * **Whole units, floored, always.** The figure is how many units have actually
 * elapsed. Rounding to the nearest would print an age nothing has reached — "2
 * hours" over a record ninety minutes old — and an invented unit on the one
 * line a buyer uses to judge staleness is a number nobody can check.
 *
 * The seam at 360–364 days prints "12 months", which is true and one step from
 * a year. A calendar month would remove it and put the drift somewhere worse.
 */
export type RecordAge =
    | { readonly unit: 'under-a-minute' }
    | {
          readonly unit: 'minute' | 'hour' | 'day' | 'month' | 'year';
          /** Whole units elapsed, `>= 1`. */
          readonly count: number;
      };

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

/**
 * The age of a record whose chain time is `timeS`, measured at `nowMs`.
 *
 * **Nothing, rather than a guess**, in four cases. No time at all is a record
 * this page cannot date. chronik's `0` means "unknown — make sure to check",
 * and a row dated 1970 is worse than an undated one. And a stamp later than
 * `nowMs` is the two clocks disagreeing: the chain's is not the one to doubt,
 * ours may be minutes out, and an age measured across that gap is a guess
 * wearing a figure.
 */
export function recordAge(timeS: number | undefined, nowMs: number): RecordAge | undefined {
    if (typeof timeS !== 'number' || !Number.isFinite(timeS) || timeS <= 0) {
        return undefined;
    }
    const elapsed = nowMs - timeS * 1000;
    if (!Number.isFinite(elapsed) || elapsed < 0) {
        return undefined;
    }
    if (elapsed < MINUTE_MS) {
        return { unit: 'under-a-minute' };
    }
    if (elapsed < HOUR_MS) {
        return { unit: 'minute', count: Math.floor(elapsed / MINUTE_MS) };
    }
    if (elapsed < DAY_MS) {
        return { unit: 'hour', count: Math.floor(elapsed / HOUR_MS) };
    }
    if (elapsed < MONTH_MS) {
        return { unit: 'day', count: Math.floor(elapsed / DAY_MS) };
    }
    if (elapsed < YEAR_MS) {
        return { unit: 'month', count: Math.floor(elapsed / MONTH_MS) };
    }
    return { unit: 'year', count: Math.floor(elapsed / YEAR_MS) };
}
