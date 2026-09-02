import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { boot, type AppState } from './app';

/*
 * The price feed answers instantly and never touches the network: every
 * `boot` here keeps living after its test, and a real coingecko round
 * (observed rate-limited mid-suite) resolved late, repainted with a stale
 * view and rewrote the global document.title after the next test's
 * assertion — a cross-test flake that only showed under load.
 */
vi.mock('./net/price', () => ({
    fetchXecPrice: async () => undefined,
}));
import { sellerFromPath, stallPath } from './domain/route';
import type { StallOffer } from './domain/state';
import { HOME_LEDE, HOME_TITLE, OPEN_ANOTHER_STALL, OPENING_BODY } from './ui/copy';
import { DEFAULT_THEME } from './domain/theme';

const EMPTY_TITLE = DEFAULT_THEME.sparse.emptyTitle;

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

describe('a-full-load-wears-nothing-it-cannot-prove', () => {
    /**
     * §7: the flag is not the entitlement. `wornAttachments` skips the
     * holdings check when handed `undefined` — the picker's preview
     * affordance — and `loadCurrent`'s `heldTokens` is `undefined` on
     * exactly the two paths that must fail closed on a visitor's screen: a
     * holdings read that did not answer, and a record whose bits name only
     * unminted rows. The live path (`refreshHoldings`) already guards this;
     * the full load shipped without the guard while its own comment claimed
     * "fails closed".
     *
     * Source-read, like the ordering test above: `loadCurrent` is wiring, and
     * the fail-closed behaviour itself is pinned in `attachments.test.ts` —
     * what has to stay true here is that the wiring never hands the preview
     * affordance to a visitor.
     */
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'app.ts'), 'utf8');
    const body = (() => {
        const from = source.indexOf('async function loadCurrent');
        return source.slice(from, source.indexOf('\n}\n', from));
    })();

    it('the view\'s worn list is computed against a definite holdings set', () => {
        const worn = body.slice(body.indexOf('worn: wornAttachments('));
        expect(worn.length, 'loadCurrent no longer computes worn').toBeGreaterThan(0);
        expect(worn.slice(0, 200)).toMatch(/heldTokens \?\? NOTHING_HELD/);
    });
});

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);
const BROADCAST_CORNER_FIXED = {
    preset: 'corner' as const,
    mode: 'fixed' as const,
    transparent: false,
};
const BROADCAST_RAIL = {
    preset: 'rail' as const,
    mode: 'rail' as const,
    transparent: false,
};
const BROADCAST_RETRY_MS = 30_000;
const BROADCAST_FIXED_MS = 8_000;
const BROADCAST_RAIL_REST_MS = 3_000;
const BROADCAST_RAIL_LIVE_MS = 5_000;

function offerAt(tokenId: string, askedSats: bigint, outIdx: number): StallOffer {
    return {
        outpoint: { txid: 'de'.repeat(32), outIdx },
        tokenId,
        atoms: 12n,
        variant: 'PARTIAL',
        askedSats,
        askedAtoms: 1n,
    };
}

const TWO_OFFERS = [offerAt(TOKEN_A, 120_000n, 1), offerAt(TOKEN_B, 200_000n, 2)];

function overlayState(
    over: Partial<AppState['view']> = {},
    offers: StallOffer[] = TWO_OFFERS,
): AppState {
    return {
        view: {
            route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
            fetch: offers.length > 0 ? { kind: 'offers', offers } : { kind: 'empty' },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map(),
            broadcast: BROADCAST_CORNER_FIXED,
            ...over,
        },
        offers,
        pubkeyHex: PK,
    };
}

describe('a-broadcast-url-never-paints-the-shop-chrome', () => {
    /**
     * `refresh` paints `openingFromLocation` first. If that helper ignores
     * `location.search`, the first frame OBS captures is the shop — tabs,
     * footer, opening copy — which is the C1 failure arriving through the
     * route layer. C3 reads the params in both that helper and `loadCurrent`.
     */
    it('the opening frame of a broadcast url is the overlay, not the shop', () => {
        window.history.replaceState(null, '', `${stallPath(PK)}?view=broadcast`);
        const root = document.createElement('div');
        boot(
            root,
            () =>
                new Promise<AppState>(() => {
                    /* never resolves — this is the first frame */
                }),
        );
        expect(root.querySelector('.stall')?.classList.contains('broadcast')).toBe(true);
        expect(root.querySelector('[data-role="broadcast"]')).not.toBeNull();
        expect(root.querySelector('.tabs'), 'no tab bar on the first frame').toBeNull();
        expect(root.querySelector('.stall-foot'), 'no footer on the first frame').toBeNull();
        expect(root.textContent).not.toContain(OPENING_BODY);
        expect(root.textContent).not.toContain(HOME_LEDE);
    });
});

describe('a-broadcast-retries-our-failure-on-its-own', () => {
    /**
     * `watch()` does not open a socket on unreachable / plugin-missing /
     * unreadable, and the overlay has no retry control. An index that is
     * down at source-start must heal without the streamer restarting the
     * Browser Source.
     */
    afterEach(() => {
        vi.useRealTimers();
    });

    const hosts = [{ host: 'chronik-native1.fabien.cash', result: 'timeout' as const }];

    it.each(['unreachable', 'plugin-missing', 'unreadable'] as const)(
        'retries on its own when the overlay loaded %s',
        async (kind) => {
            vi.useFakeTimers();
            window.history.replaceState(null, '', `${stallPath(PK)}?view=broadcast`);
            let loads = 0;
            const root = document.createElement('div');
            const fetch =
                kind === 'unreadable'
                    ? { kind, triedAtMs: 0, returned: 1 }
                    : { kind, triedAtMs: 0, hosts };
            boot(root, async () => {
                loads += 1;
                return overlayState({ fetch, broadcast: { preset: 'corner', mode: 'rail', transparent: false } }, []);
            });
            await vi.advanceTimersByTimeAsync(0);
            expect(loads).toBe(1);
            expect(root.querySelector('[data-role="broadcast"]')).not.toBeNull();
            await vi.advanceTimersByTimeAsync(BROADCAST_RETRY_MS - 1);
            expect(loads, 'does not retry early').toBe(1);
            await vi.advanceTimersByTimeAsync(1);
            expect(loads, 'retries refresh after BROADCAST_RETRY_MS').toBe(2);
        },
    );

    it('an ordinary stall does not retry our failure on a timer', async () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', stallPath(PK));
        let loads = 0;
        boot(document.createElement('div'), async () => {
            loads += 1;
            return {
                view: {
                    route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
                    fetch: { kind: 'unreachable', triedAtMs: 0, hosts },
                    overlay: { kind: 'idle' },
                    address: ADDR,
                    tokens: new Map(),
                },
                offers: [],
                pubkeyHex: PK,
            };
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(loads).toBe(1);
        await vi.advanceTimersByTimeAsync(BROADCAST_RETRY_MS);
        expect(loads, 'the shop has a retry control; it does not poll').toBe(1);
    });
});

describe('the-rail-preset-starts-no-timer', () => {
    /**
     * `preset=rail` never opens (C1: mode is ignored). The carousel timer
     * is for `preset=corner` with at least two listings. This describe
     * also pins that the corner timer actually advances — otherwise the
     * rail assertion is true of a tree that starts no timer at all.
     */
    afterEach(() => {
        vi.useRealTimers();
    });

    it('preset=rail with two listings never leaves rest', async () => {
        vi.useFakeTimers();
        window.history.replaceState(
            null,
            '',
            `${stallPath(PK)}?view=broadcast&preset=rail`,
        );
        const root = document.createElement('div');
        boot(root, async () => overlayState({ broadcast: BROADCAST_RAIL }));
        await vi.advanceTimersByTimeAsync(0);
        const overlay = root.querySelector('[data-role="broadcast"]');
        expect(overlay).not.toBeNull();
        expect(overlay!.getAttribute('data-preset')).toBe('rail');
        expect(overlay!.getAttribute('data-state')).toBe('rest');
        await vi.advanceTimersByTimeAsync(
            BROADCAST_FIXED_MS + BROADCAST_RAIL_REST_MS + BROADCAST_RAIL_LIVE_MS,
        );
        expect(
            root.querySelector('[data-role="broadcast"]')?.getAttribute('data-state'),
            'the rail preset does not run the rest/live cycle',
        ).toBe('rest');
        expect(root.querySelector('.bc-ext')).toBeNull();
    });

    it('preset=corner mode=fixed advances the cursor and fades the card, not the price', async () => {
        vi.useFakeTimers();
        window.history.replaceState(
            null,
            '',
            `${stallPath(PK)}?view=broadcast&preset=corner&mode=fixed`,
        );
        const root = document.createElement('div');
        boot(root, async () => overlayState());
        await vi.advanceTimersByTimeAsync(0);
        expect(root.querySelector('[data-role="broadcast"]')).not.toBeNull();
        await vi.advanceTimersByTimeAsync(BROADCAST_FIXED_MS - 1);
        expect(root.querySelector('.bc-ext')?.classList.contains('in')).toBe(false);
        await vi.advanceTimersByTimeAsync(1);
        expect(root.querySelector('.bc-ext')?.classList.contains('in')).toBe(true);
        expect(root.querySelector('[data-role="price"]')?.classList.contains('pulse')).toBe(
            false,
        );
    });
});
