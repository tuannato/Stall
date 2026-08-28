import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

describe('default-stall-does-not-trap-the-door', () => {
    afterEach(() => {
        localStorage.clear();
    });

    it('a freshly typed bare domain opens the saved stall', () => {
        localStorage.setItem('stall.default', ADDR);
        // A fresh navigation has null history state.
        window.history.replaceState(null, '', '/');
        boot(document.createElement('div'), async () => homeState());
        expect(location.pathname).toContain('/s/');
    });

    it('reloading a door reached via open-another stays on the door', () => {
        localStorage.setItem('stall.default', ADDR);
        // onGoHome stamps the entry; the stamp survives a reload of it, which a
        // fresh type does not carry.
        window.history.replaceState({ door: true }, '', '/');
        boot(document.createElement('div'), async () => homeState());
        expect(location.pathname).toBe('/');
    });
});

describe('decoration-does-not-queue-behind-the-price', () => {
    /**
     * `loadDescriptions` and `loadManifest` need only an address and a hash,
     * both computed before the offers are asked for. They were sequential purely
     * by the order they were written in, and it cost the visitor up to 34 round
     * trips before a price could be painted — 22 of them decoration.
     *
     * This reads the source rather than timing anything, because a timing test
     * on a stub proves whatever the stub was built to prove. What must stay
     * true is structural: both are *started* before the offers await, and only
     * awaited after.
     */
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'app.ts'), 'utf8');
    const body = (() => {
        const from = source.indexOf('async function loadCurrent');
        return source.slice(from, source.indexOf('\n}\n', from));
    })();

    it('starts both settings reads before it waits on the offers', () => {
        const startDesc = body.indexOf('loadDescriptions(');
        const startManifest = body.indexOf('loadManifest(');
        const awaitOffers = body.indexOf('await loadOffers(');
        expect(startDesc, 'descriptions are never read').toBeGreaterThan(-1);
        expect(startManifest, 'settings are never read').toBeGreaterThan(-1);
        expect(awaitOffers, 'offers are never read').toBeGreaterThan(-1);
        expect(startDesc, 'descriptions queue behind the offers').toBeLessThan(awaitOffers);
        expect(startManifest, 'settings queue behind the offers').toBeLessThan(awaitOffers);
    });

    it('still waits for both before returning, so nothing is dropped', () => {
        // Reordering, not skipping: every field the view carried before is
        // still filled from a read that was awaited.
        expect(body).toMatch(/await descriptionsSoon/);
        expect(body).toMatch(/await manifestSoon/);
    });

    it('cannot leave a rejection with nobody listening', () => {
        // The offers branch can return before either is awaited, so the guard
        // has to sit at creation rather than at use.
        const desc = body.slice(body.indexOf('loadDescriptions('));
        const manifest = body.slice(body.indexOf('loadManifest('));
        expect(desc.slice(0, 200)).toMatch(/\.catch\(/);
        expect(manifest.slice(0, 200)).toMatch(/\.catch\(/);
    });
});
