import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { walkPlan } from './plan-walk.mjs';

/**
 * The geometry passes walk on the contrast pass's tabs (D-2026-10-19-02 (3);
 * `PROBE-RULES.md`, "The geometry passes walk on two tabs"), and the run says
 * the same thing at any tab count because the walk commits in plan order
 * (`walkPlan`). These hold the walk over passes that take as long as each
 * test says, so the order the tabs finish in is the test's to choose; the
 * real passes' hermeticity is the runner's own canary
 * (`the-geometry-passes-read-the-same-on-every-tab`).
 *
 * `node --test`: a TypeScript test importing an `.mjs` breaks `tsc` (TS7016).
 */
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tabsOf = (count) => Array.from({ length: count }, (_, index) => ({ index }));

/** A plan of passes, each `[key, ms]` or `[key, ms, after]`, answering its own record after `ms`. */
function planOf(spec) {
    return spec.map(([key, ms, after]) => ({ key, ms, after }));
}

/** The walk over `plan` on `count` tabs, with every commit and every read again recorded. */
async function walked(plan, count, extra = {}) {
    const committed = [];
    const started = [];
    const result = await walkPlan({
        tabs: tabsOf(count),
        plan,
        keyOf: (pass) => pass.key,
        afterOf: (pass) => pass.after ?? [],
        tabIndex: (tab) => tab.index,
        run: async (tab, pass, deps) => {
            started.push(`${pass.key}@${tab.index}`);
            await pause(pass.ms);
            if (pass.throws) throw new Error(`${pass.key} threw`);
            return { key: pass.answersAs ?? pass.key, tab: tab.index, deps: deps.map((dep) => dep?.key) };
        },
        commit: (answer, n) => committed.push([n, answer.key]),
        ...extra,
    });
    return { result, committed, started };
}

describe('the-geometry-passes-walk-in-plan-order-on-every-tab', () => {
    it('commits every answer in plan order, whatever order the tabs finish in', async () => {
        // On two tabs the first pass finishes last: every other pass is in before it.
        const plan = planOf([
            ['a', 60],
            ['b', 5],
            ['c', 40],
            ['d', 5],
            ['e', 5],
        ]);
        const { result, committed } = await walked(plan, 2);
        assert.deepEqual(committed, [
            [0, 'a'],
            [1, 'b'],
            [2, 'c'],
            [3, 'd'],
            [4, 'e'],
        ]);
        assert.deepEqual(new Set(result.ranOn), new Set([0, 1]));
        assert.equal(result.fault, undefined);
        assert.deepEqual(result.unanswered, []);
    });

    it('walks the same plan on one tab, one pass after another, and reads nothing again', async () => {
        const plan = planOf([
            ['a', 5],
            ['b', 5],
            ['c', 5],
        ]);
        const { result, committed, started } = await walked(plan, 1, { picks: ['a', 'c'] });
        assert.deepEqual(started, ['a@0', 'b@0', 'c@0']);
        assert.deepEqual(committed.map(([, key]) => key), ['a', 'b', 'c']);
        assert.equal(result.readAgain.size, 0);
    });

    it('hands a pass the answers of the passes it reads, waiting for them on its own tab', async () => {
        // `c` reads `a`, which is still running on the other tab when `c` is handed out.
        const plan = planOf([
            ['a', 60],
            ['b', 5],
            ['c', 5, ['a']],
        ]);
        const { result } = await walked(plan, 2);
        assert.deepEqual(result.answers[2].deps, ['a']);
        assert.notEqual(result.ranOn[2], result.ranOn[0]);
    });

    it('stops the hand-out at the first pass that throws, and commits only the passes before it', async () => {
        // `c` throws on one tab while `a` is still running on the other.
        const plan = planOf([
            ['a', 40],
            ['b', 5],
            ['c', 5],
            ['d', 5],
            ['e', 5],
        ]);
        plan[2].throws = true;
        const { result, committed, started } = await walked(plan, 2);
        assert.equal(result.fault.key, 'c');
        assert.equal(result.fault.n, 2);
        assert.deepEqual(committed.map(([, key]) => key), ['a', 'b']);
        assert.ok(!started.some((at) => at.startsWith('e@')), `e was handed out after c threw: ${started.join(', ')}`);
        assert.deepEqual(result.unanswered, []);
        assert.equal(result.readAgain.size, 0);
    });

    it('names a pass that came back with another pass’s record, and commits nothing for it', async () => {
        const plan = planOf([
            ['a', 5],
            ['b', 5],
            ['c', 5],
        ]);
        plan[1].answersAs = 'a';
        const { result, committed } = await walked(plan, 2);
        assert.deepEqual(result.unanswered, ['b']);
        assert.deepEqual(committed.map(([, key]) => key), ['a', 'c']);
    });

    it('reads each pick again on a tab other than the one that ran it, once its hand-out has run out', async () => {
        const plan = planOf([
            ['a', 30],
            ['b', 5],
            ['c', 5],
            ['d', 5],
        ]);
        const printed = [];
        const { result, committed } = await walked(plan, 2, {
            picks: ['b', 'd', 'not-in-the-plan'],
            tail: async (tab) => {
                printed.push(tab.index);
            },
        });
        assert.deepEqual(result.picks, [1, 3]);
        for (const n of result.picks) {
            const read = result.readAgain.get(n);
            assert.ok(read !== undefined, `${plan[n].key} was not read again`);
            assert.notEqual(read.tab, result.ranOn[n]);
            assert.equal(read.answer.key, plan[n].key);
        }
        // Read again, never committed: each pass is committed once.
        assert.deepEqual(committed.map(([, key]) => key), ['a', 'b', 'c', 'd']);
        assert.deepEqual(printed.sort(), [0, 1]);
    });

    it('refuses a pass that reads one after it in the plan', async () => {
        const plan = planOf([
            ['a', 5, ['b']],
            ['b', 5],
        ]);
        const { result } = await walked(plan, 1);
        assert.equal(result.fault.key, 'a');
        assert.match(String(result.fault.err), /a reads b, which comes after it in the plan/);
    });
});
