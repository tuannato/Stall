import { afterEach, describe, expect, it, vi } from 'vitest';
import { withDeadline } from './deadline';

afterEach(() => {
    vi.useRealTimers();
});

describe('a-slow-answer-is-no-answer-at-the-deadline', () => {
    /**
     * The second feed's budget is strictly shorter than the first's, so a
     * hung check can never hold the figure past the primary's own ceiling;
     * at the deadline it is simply "unchecked", and a rejection is the same.
     */
    it('passes a fast value through, unchanged', async () => {
        vi.useFakeTimers();
        const p = withDeadline(Promise.resolve(42n), 1000);
        await vi.advanceTimersByTimeAsync(0);
        await expect(p).resolves.toBe(42n);
    });

    it('answers undefined at the deadline and never later', async () => {
        vi.useFakeTimers();
        let settled: bigint | undefined = 7n;
        const slow = new Promise<bigint>((resolve) => setTimeout(() => resolve(1n), 5000));
        const p = withDeadline(slow, 1000).then((v) => {
            settled = v;
            return v;
        });
        await vi.advanceTimersByTimeAsync(999);
        expect(settled, 'still waiting under the deadline').toBe(7n);
        await vi.advanceTimersByTimeAsync(1);
        await expect(p).resolves.toBeUndefined();
        await vi.advanceTimersByTimeAsync(5000);
        expect(settled, 'the late value does not overwrite the answer').toBeUndefined();
    });

    it('turns a rejection into undefined rather than a throw', async () => {
        vi.useFakeTimers();
        const p = withDeadline(Promise.reject(new Error('offline')), 1000);
        await vi.advanceTimersByTimeAsync(0);
        await expect(p).resolves.toBeUndefined();
    });
});
