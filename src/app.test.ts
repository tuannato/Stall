// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { boot, type AppState } from './app';

const PK = '03aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const ADDR = 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09';

function stallNamed(name: string): AppState {
    return {
        view: {
            route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
            fetch: { kind: 'empty' },
            overlay: { kind: 'idle' },
            stallName: name,
            address: ADDR,
            tokens: new Map(),
        },
        offers: [],
        pubkeyHex: PK,
    };
}

/** Let queued promise callbacks run. */
async function flush(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('stale-refresh-does-not-paint', () => {
    it('drops a load that resolves after a newer navigation started', async () => {
        const root = document.createElement('div');
        const pending: Array<(state: AppState) => void> = [];
        const load = (): Promise<AppState> =>
            new Promise<AppState>((resolve) => {
                pending.push(resolve);
            });

        boot(root, load);
        expect(pending).toHaveLength(1);

        // The visitor navigates before the first stall answered.
        window.dispatchEvent(new PopStateEvent('popstate'));
        expect(pending).toHaveLength(2);

        pending[1]!(stallNamed('Second Stall'));
        await flush();
        expect(root.textContent).toContain('Second Stall');

        // The abandoned page answers late. It must not paint over the new one.
        pending[0]!(stallNamed('First Stall'));
        await flush();
        expect(root.textContent).toContain('Second Stall');
        expect(root.textContent).not.toContain('First Stall');
    });
});
