// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { boot, type AppState } from './app';
import { sellerFromPath, stallPath } from './domain/route';
import { EMPTY_TITLE, HOME_LEDE, HOME_TITLE, OPEN_ANOTHER_STALL, OPENING_BODY } from './ui/copy';

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

function homeState(): AppState {
    return {
        view: { route: { kind: 'home' }, overlay: { kind: 'idle' }, tokens: new Map() },
        offers: [],
    };
}

function stallUnnamedEmpty(): AppState {
    return {
        view: {
            route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
            fetch: { kind: 'empty' },
            overlay: { kind: 'idle' },
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

beforeEach(() => {
    window.history.replaceState(null, '', '/');
});

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

    it('a late home load cannot paint over a stall opened from the apex', async () => {
        const root = document.createElement('div');
        const pending: Array<(state: AppState) => void> = [];
        boot(
            root,
            () =>
                new Promise<AppState>((resolve) => {
                    pending.push(resolve);
                }),
        );
        expect(pending).toHaveLength(1);

        const input = root.querySelector('.paste-in') as HTMLInputElement;
        const form = root.querySelector('form.paste') as HTMLFormElement;
        input.value = ADDR;
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        expect(pending).toHaveLength(2);

        pending[1]!(stallNamed('Opened Stall'));
        await flush();
        expect(root.textContent).toContain('Opened Stall');

        pending[0]!(homeState());
        await flush();
        expect(root.textContent).toContain('Opened Stall');
        expect(root.textContent).not.toContain(HOME_LEDE);
    });
});

describe('open-stall-from-apex', () => {
    it('pushState then load sees /s/… and paints opening immediately', async () => {
        const root = document.createElement('div');
        const pending: Array<(state: AppState) => void> = [];
        boot(
            root,
            () =>
                new Promise<AppState>((resolve) => {
                    pending.push(resolve);
                }),
        );
        expect(root.textContent).toContain(HOME_LEDE);

        const input = root.querySelector('.paste-in') as HTMLInputElement;
        const form = root.querySelector('form.paste') as HTMLFormElement;
        input.value = ADDR;
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        expect(sellerFromPath(location.pathname)).toBe(ADDR);
        expect(location.pathname).toBe(stallPath(ADDR));
        expect(pending).toHaveLength(2);
        expect(root.textContent).toContain(OPENING_BODY);
        expect(root.textContent).not.toContain(HOME_LEDE);

        pending[1]!(stallNamed('Opened Stall'));
        await flush();
        expect(root.textContent).toContain('Opened Stall');
        expect(root.textContent).not.toContain(OPENING_BODY);
    });

    it('invalid open does not push and does not load', () => {
        const root = document.createElement('div');
        const pending: Array<(state: AppState) => void> = [];
        boot(
            root,
            () =>
                new Promise<AppState>((resolve) => {
                    pending.push(resolve);
                }),
        );
        expect(pending).toHaveLength(1);

        const input = root.querySelector('.paste-in') as HTMLInputElement;
        const form = root.querySelector('form.paste') as HTMLFormElement;
        input.value = 'not-a-seller';
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        expect(pending).toHaveLength(1);
        expect(location.pathname).toBe('/');
        expect(sellerFromPath(location.pathname)).toBeUndefined();
    });

    it('a cold /s/<seller> paints opening before the load resolves', () => {
        window.history.replaceState(null, '', stallPath(PK));
        const root = document.createElement('div');
        boot(
            root,
            () =>
                new Promise<AppState>(() => {
                    /* never resolves */
                }),
        );
        expect(root.textContent).toContain(OPENING_BODY);
        expect(root.textContent).not.toContain(HOME_LEDE);
        expect(document.title).not.toBe(HOME_TITLE);
    });

    it('paste that loads an unnamed stall keeps the address, not the site name', async () => {
        const root = document.createElement('div');
        const pending: Array<(state: AppState) => void> = [];
        boot(
            root,
            () =>
                new Promise<AppState>((resolve) => {
                    pending.push(resolve);
                }),
        );

        const input = root.querySelector('.paste-in') as HTMLInputElement;
        const form = root.querySelector('form.paste') as HTMLFormElement;
        input.value = ADDR;
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

        pending[1]!(stallUnnamedEmpty());
        await flush();
        expect(root.textContent).toContain(EMPTY_TITLE);
        expect(root.querySelector('.stall-name')?.textContent).toBe(ADDR);
        expect(document.title).toBe(ADDR);
        expect(document.title).not.toBe(HOME_TITLE);
        expect(root.textContent).not.toContain(HOME_LEDE);
    });
});

describe('open-another-stall', () => {
    it('pushState to / then load paints the apex paste', async () => {
        const root = document.createElement('div');
        const pending: Array<(state: AppState) => void> = [];
        boot(
            root,
            () =>
                new Promise<AppState>((resolve) => {
                    pending.push(resolve);
                }),
        );

        const input = root.querySelector('.paste-in') as HTMLInputElement;
        const form = root.querySelector('form.paste') as HTMLFormElement;
        input.value = ADDR;
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        pending[1]!(stallUnnamedEmpty());
        await flush();

        const back = root.querySelector('[data-role="open-another"]') as HTMLButtonElement;
        expect(back.textContent).toBe(OPEN_ANOTHER_STALL);
        back.click();
        expect(location.pathname).toBe('/');
        expect(pending).toHaveLength(3);
        expect(root.textContent).toContain(HOME_LEDE);

        pending[2]!(homeState());
        await flush();
        expect(root.textContent).toContain(HOME_LEDE);
        expect(root.querySelector('.paste-in')).not.toBeNull();
        expect(document.title).toBe(HOME_TITLE);
    });
});
