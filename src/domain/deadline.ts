/**
 * The promise's value, or `undefined` at the deadline — never a rejection.
 *
 * For a request that is allowed to be slow but not allowed to hold anything
 * up: the second price feed rides beside the first under a budget strictly
 * shorter than the first's, so the figure a buyer waits for is bounded by
 * the primary's own ceiling and a hung check answers "unchecked". A
 * rejection is the same answer, so a caller inside a `void (async …)` never
 * sees a throw it did not handle.
 */
export function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(undefined), ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            () => {
                clearTimeout(timer);
                resolve(undefined);
            },
        );
    });
}
