// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { recordAge } from './age';

const S = 1_000;
const MIN = 60 * S;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** A fixed instant to measure from, so nothing here depends on the clock. */
const NOW = 1_756_400_000_000;

/** A record written `ms` before `NOW`, in the seconds the chain reports. */
const wrote = (ms: number) => Math.floor((NOW - ms) / 1000);

describe('an-age-counts-whole-units-and-never-rounds-up', () => {
    /**
     * The figure is how many whole units have passed, which is a fact. Rounding
     * to the nearest would print an age that has not elapsed — "2 hours" over a
     * record ninety minutes old — and on a rail whose whole purpose is letting a
     * buyer price staleness, an invented unit is a number nobody can check.
     */
    it('floors at every step of the ladder', () => {
        expect(recordAge(wrote(30 * S), NOW)).toEqual({ unit: 'under-a-minute' });
        expect(recordAge(wrote(59 * S), NOW)).toEqual({ unit: 'under-a-minute' });
        expect(recordAge(wrote(MIN), NOW)).toEqual({ unit: 'minute', count: 1 });
        expect(recordAge(wrote(59 * MIN + 59 * S), NOW)).toEqual({
            unit: 'minute',
            count: 59,
        });
        expect(recordAge(wrote(HOUR), NOW)).toEqual({ unit: 'hour', count: 1 });
        expect(recordAge(wrote(90 * MIN), NOW)).toEqual({ unit: 'hour', count: 1 });
        expect(recordAge(wrote(DAY), NOW)).toEqual({ unit: 'day', count: 1 });
        expect(recordAge(wrote(29 * DAY), NOW)).toEqual({ unit: 'day', count: 29 });
        expect(recordAge(wrote(30 * DAY), NOW)).toEqual({ unit: 'month', count: 1 });
        expect(recordAge(wrote(95 * DAY), NOW)).toEqual({ unit: 'month', count: 3 });
        expect(recordAge(wrote(365 * DAY), NOW)).toEqual({ unit: 'year', count: 1 });
        expect(recordAge(wrote(800 * DAY), NOW)).toEqual({ unit: 'year', count: 2 });
    });

    /**
     * Four ways to answer nothing, and every one of them is a duration this
     * page cannot measure. A time later than ours is the two clocks
     * disagreeing — the chain's stamp is not wrong, ours may be, and an age
     * computed across that gap is a guess wearing a figure.
     */
    it('answers nothing rather than guessing', () => {
        expect(recordAge(undefined, NOW)).toBeUndefined();
        expect(recordAge(0, NOW)).toBeUndefined();
        expect(recordAge(Number.NaN, NOW)).toBeUndefined();
        expect(recordAge(wrote(-5 * MIN), NOW)).toBeUndefined();
    });
});
