/**
 * A plan walked on several tabs at once and said in plan order — the
 * geometry passes of `layout-check.mjs` (D-2026-10-19-02 (3); `PROBE-RULES.md`,
 * "The geometry passes walk on two tabs"). It imports nothing: the runner
 * hands it the tabs and the passes, and it hands back what each pass
 * answered (`plan-walk.test.mjs`).
 *
 * - The passes are handed out one at a time, in plan order, to whichever tab
 *   is free. A pass that reads earlier passes' answers (`afterOf`) waits for
 *   them on the tab it was handed to.
 * - Each answer is committed (`commit`) as soon as it and every answer
 *   before it in the plan are in — in plan order, whatever order the tabs
 *   finished in — so a run says the same lines in the same order at any tab
 *   count. An answer that is not its own pass's record (`keyOf`) is never
 *   committed, and the pass is named in `unanswered`.
 * - A pass that throws stops the hand-out. The other tabs finish what they
 *   hold; the earliest pass in the plan that threw is the `fault`, and only
 *   the passes before it are committed — the same passes at any tab count.
 * - Once a tab's hand-out runs out, it reads again each pick (`picks`, by
 *   key) that another tab ran, and keeps what it read apart (`readAgain`),
 *   never committed; then runs `tail` (the runner's page print). Neither runs
 *   after a fault.
 */

/**
 * @template T, P, R
 * @param {{
 *   tabs: T[],
 *   plan: P[],
 *   keyOf: (pass: P) => string,
 *   afterOf?: (pass: P) => string[],
 *   run: (tab: T, pass: P, deps: (R | undefined)[]) => Promise<R>,
 *   commit: (answer: R, n: number) => void,
 *   picks?: string[],
 *   tail?: (tab: T) => Promise<void>,
 *   onStart?: (tab: T, pass: P, n: number, again: boolean) => void,
 *   onEnd?: (tab: T, pass: P, n: number, ms: number, again: boolean) => void,
 *   tabIndex: (tab: T) => number,
 *   now?: () => number,
 * }} walk
 */
export async function walkPlan({
    tabs,
    plan,
    keyOf,
    afterOf = () => [],
    run,
    commit,
    picks = [],
    tail,
    onStart = () => {},
    onEnd = () => {},
    tabIndex,
    now = () => performance.now(),
}) {
    const index = new Map(plan.map((pass, n) => [keyOf(pass), n]));
    const answers = new Array(plan.length);
    const ranOn = new Array(plan.length);
    const done = new Array(plan.length).fill(false);
    const settled = plan.map(() => {
        /** @type {(answer: R | undefined) => void} */
        let settle = () => {};
        /** @type {Promise<R | undefined>} */
        const promise = new Promise((resolve) => {
            settle = resolve;
        });
        return { promise, settle };
    });
    const ownAnswer = (n) => answers[n] !== undefined && answers[n] !== null && keyOf(plan[n]) === answers[n].key;
    let handedOut = 0;
    let committed = 0;
    /** @type {{ n: number, key: string, tab: number, err: unknown } | undefined} */
    let fault;
    const commitReady = () => {
        while (committed < plan.length && done[committed] && (fault === undefined || committed < fault.n)) {
            if (ownAnswer(committed)) commit(answers[committed], committed);
            committed += 1;
        }
    };
    const depsOf = async (pass) => {
        const deps = [];
        for (const key of afterOf(pass)) {
            const n = index.get(key);
            if (n === undefined) throw new Error(`${keyOf(pass)} reads ${key}, which is not in the plan`);
            if (n >= index.get(keyOf(pass))) throw new Error(`${keyOf(pass)} reads ${key}, which comes after it in the plan`);
            deps.push(await settled[n].promise);
        }
        return deps;
    };
    const pickIndexes = picks.map((key) => index.get(key)).filter((n) => n !== undefined);
    const taken = new Set();
    /** @type {Map<number, { tab: number, answer: R, ms: number }>} */
    const readAgain = new Map();
    let readFault;
    const walkTab = async (tab) => {
        while (fault === undefined && handedOut < plan.length) {
            const n = handedOut;
            handedOut += 1;
            const pass = plan[n];
            ranOn[n] = tabIndex(tab);
            const started = now();
            try {
                const deps = await depsOf(pass);
                onStart(tab, pass, n, false);
                answers[n] = await run(tab, pass, deps);
            } catch (err) {
                if (fault === undefined || n < fault.n) fault = { n, key: keyOf(pass), tab: tabIndex(tab), err };
            } finally {
                onEnd(tab, pass, n, now() - started, false);
                done[n] = true;
                settled[n].settle(ownAnswer(n) ? answers[n] : undefined);
                commitReady();
            }
        }
        while (fault === undefined && readFault === undefined) {
            const n = pickIndexes.find((pick) => !taken.has(pick) && ranOn[pick] !== tabIndex(tab));
            if (n === undefined) break;
            taken.add(n);
            const pass = plan[n];
            const started = now();
            try {
                const deps = await depsOf(pass);
                onStart(tab, pass, n, true);
                readAgain.set(n, { tab: tabIndex(tab), answer: await run(tab, pass, deps), ms: now() - started });
            } catch (err) {
                readFault ??= err;
            } finally {
                onEnd(tab, pass, n, now() - started, true);
            }
        }
        if (tail !== undefined && fault === undefined && readFault === undefined) {
            try {
                await tail(tab);
            } catch (err) {
                readFault ??= err;
            }
        }
    };
    await Promise.all(tabs.map(walkTab));
    const unanswered = fault === undefined ? plan.filter((pass, n) => !ownAnswer(n)).map(keyOf) : [];
    // How many passes after the fault in the plan ran on other tabs before
    // the hand-out stopped, and are not committed.
    const lostAfterFault = fault === undefined ? 0 : answers.filter((answer, n) => n > fault.n && answer !== undefined).length;
    return { answers, ranOn, fault, unanswered, lostAfterFault, readAgain, readFault, picks: pickIndexes };
}
