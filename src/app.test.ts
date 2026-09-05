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
import {
    HOME_LEDE,
    HOME_TITLE,
    OPEN_ANOTHER_STALL,
    OPENING_BODY,
    PAY_HINT_UNKNOWN,
    PAY_HINT_UNREAD,
    PAY_HINT_WITHHELD,
    SHOP_TAB_LISTINGS,
    PLUGIN_MISSING_BODY,
    UNREACHABLE_BODY,
} from './ui/copy';
import { DEFAULT_THEME } from './domain/theme';
import type { DescriptionLookup } from './net/descriptions';
import type { ManifestLookup } from './net/manifest';

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
    // The carousel's list: the shop's own listings unless the link asks
    // for the seller's quotes.
    cards: 'listings' as const,
};
const BROADCAST_RAIL = {
    preset: 'rail' as const,
    mode: 'rail' as const,
    transparent: false,
    cards: 'listings' as const,
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
     * A resolved stall whose fetch failed has no socket to heal the
     * screen, and the overlay has no retry control. An index that is
     * down at source-start must heal without the streamer restarting
     * the Browser Source. Waiting screens keep their script socket
     * and must not be polled.
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
                return overlayState(
                    {
                        fetch,
                        broadcast: {
                            preset: 'corner',
                            mode: 'rail',
                            transparent: false,
                            cards: 'listings',
                        },
                    },
                    [],
                );
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

    it('unresolved+unreachable does not retry, because the waiting socket is the heal', async () => {
        vi.useFakeTimers();
        window.history.replaceState(null, '', `${stallPath(ADDR)}?view=broadcast`);
        let loads = 0;
        boot(document.createElement('div'), async () => {
            loads += 1;
            return {
                view: {
                    route: { kind: 'unresolved' as const, address: ADDR },
                    fetch: { kind: 'unreachable' as const, triedAtMs: 0, hosts },
                    overlay: { kind: 'idle' as const },
                    address: ADDR,
                    tokens: new Map(),
                    broadcast: {
                        preset: 'corner' as const,
                        mode: 'rail' as const,
                        transparent: false,
                        cards: 'listings' as const,
                    },
                },
                offers: [],
            };
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(loads).toBe(1);
        await vi.advanceTimersByTimeAsync(BROADCAST_RETRY_MS);
        expect(loads, 'must not reload after 30 s').toBe(1);
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

/* The `?pay=` landing: what a scanned code opens, and what it says when it cannot. */

const QUOTED = 'cd'.repeat(32);
const QUOTED_TWIN = `${QUOTED.slice(0, 20)}${'ef'.repeat(22)}`;

/**
 * A quoted token as a seller's own wallet mints one today: ALP, with the
 * minter's key in genesis. Two things follow, and both are the point — the
 * stall's attribution is decided from metadata this page already holds, and
 * these tests make no genesis request at all.
 */
function quotedMeta(tokenId: string, name: string) {
    return {
        tokenId,
        name,
        ticker: name.slice(0, 4).toUpperCase(),
        decimals: 0,
        tokenType: { protocol: 'ALP', type: 'ALP_TOKEN_TYPE_STANDARD' },
        authPubkey: PK,
    };
}

function quotedStall(over: Partial<AppState['view']> = {}): AppState {
    return {
        view: {
            route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
            fetch: { kind: 'empty' },
            overlay: { kind: 'idle' },
            address: ADDR,
            stallName: 'Riverside Goods',
            tokens: new Map([[QUOTED, quotedMeta(QUOTED, 'Roasted Beans')]]),
            prices: new Map([[QUOTED, { code: 'usd', exponent: 2, amount: 500n }]]),
            ...over,
        },
        offers: [],
        pubkeyHex: PK,
    };
}

describe('a-pay-hint-opens-the-sheet-for-exactly-one-item', () => {
    /**
     * The parameter names an item by a prefix of its token id, resolved
     * against this stall's own records — never a chain lookup. Exactly one
     * match opens the sheet; anything else opens nothing.
     */
    it('opens the pay sheet for the one item the prefix names', async () => {
        const root = document.createElement('div');
        boot(root, async () => quotedStall({ payHint: QUOTED.slice(0, 12) }));
        await flush();
        expect(root.querySelector('[data-role="pay"]')).not.toBeNull();
        expect(root.querySelector('[data-role="pay-hint-note"]')).toBeNull();
    });
});

describe('an-ambiguous-or-unknown-pay-hint-is-the-ordinary-stall', () => {
    it('opens nothing when two items share the prefix', async () => {
        const root = document.createElement('div');
        boot(root, async () =>
            quotedStall({
                payHint: QUOTED.slice(0, 12),
                tokens: new Map([
                    [QUOTED, quotedMeta(QUOTED, 'Roasted Beans')],
                    [QUOTED_TWIN, quotedMeta(QUOTED_TWIN, 'Green Tea')],
                ]),
                prices: new Map([
                    [QUOTED, { code: 'usd', exponent: 2, amount: 500n }],
                    [QUOTED_TWIN, { code: 'usd', exponent: 2, amount: 900n }],
                ]),
            }),
        );
        await flush();
        expect(root.querySelector('[data-role="pay"]')).toBeNull();
        expect(root.querySelector('[data-role="pay-hint-note"]')?.textContent).toBe(
            PAY_HINT_UNKNOWN,
        );
    });

    it('says so when the stall quotes nothing of that name', async () => {
        const root = document.createElement('div');
        boot(root, async () => quotedStall({ payHint: 'ab'.repeat(6) }));
        await flush();
        expect(root.querySelector('[data-role="pay"]')).toBeNull();
        expect(root.querySelector('[data-role="pay-hint-note"]')?.textContent).toBe(
            PAY_HINT_UNKNOWN,
        );
    });
});

describe('a-pay-hint-is-consumed-once-per-load', () => {
    /**
     * The URL is not rewritten, so a reload of a scanned link reopens the
     * sheet — which is what a scanned link should do. But the seller's "check
     * now" is a refresh of the same page load, and it must not reopen a sheet
     * the buyer closed.
     */
    it('does not reopen the sheet on a refresh of the same load', async () => {
        const root = document.createElement('div');
        boot(root, async () => quotedStall({ payHint: QUOTED.slice(0, 12) }));
        await flush();
        expect(root.querySelector('[data-role="pay"]')).not.toBeNull();
        (root.querySelector('[data-role="pay-close"]') as HTMLButtonElement).click();
        expect(root.querySelector('[data-role="pay"]')).toBeNull();

        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(root.querySelector('[data-role="pay"]')).toBeNull();
        expect(root.querySelector('[data-role="pay-hint-note"]')).toBeNull();
    });
});

describe('a-pay-hint-is-applied-from-the-loaded-state-not-a-live-read', () => {
    /**
     * `loadCurrent` answers one state with the prices already in it, so there
     * is no race to wait for and no second apply to hook. The hint resolves
     * against the state the load returned, and against nothing that arrives
     * afterwards.
     */
    it('resolves against the state the load answered with', async () => {
        const root = document.createElement('div');
        // A stall whose load carried no prices at all: the hint is judged on
        // that answer, not deferred until something else lands.
        boot(root, async () =>
            quotedStall({ payHint: QUOTED.slice(0, 12), prices: new Map() }),
        );
        await flush();
        expect(root.querySelector('[data-role="pay"]')).toBeNull();
        expect(root.querySelector('[data-role="pay-hint-note"]')?.textContent).toBe(
            PAY_HINT_UNKNOWN,
        );
    });
});

describe('a-pay-hint-on-an-unreachable-stall-says-so', () => {
    /**
     * "No such item" and "this page could not read the records" are two
     * different claims, and only the first one is about the seller. Collapsing
     * them is §4's empty-versus-unreachable mistake on a new surface.
     *
     * The three fetch kinds used to be the whole of it — the offer book
     * failing was taken as the records failing, because the load threw the
     * records away on those screens. They are read now, so the sentence
     * belongs to the walk that actually failed and the screens below carry it
     * alongside a failed book rather than because of one.
     */
    it('says it could not read, on every screen whose walk failed', async () => {
        for (const view of [
            { fetch: { kind: 'unreachable' as const, triedAtMs: 1, hosts: [] }, prices: new Map() },
            { fetch: { kind: 'unreadable' as const, triedAtMs: 1, returned: 2 }, prices: new Map() },
            {
                fetch: {
                    kind: 'plugin-missing' as const,
                    triedAtMs: 1,
                    hosts: [],
                },
                prices: new Map(),
            },
        ]) {
            const root = document.createElement('div');
            boot(root, async () =>
                quotedStall({
                    payHint: QUOTED.slice(0, 12),
                    descriptionsFailed: true,
                    ...view,
                }),
            );
            await flush();
            expect(root.querySelector('[data-role="pay-hint-note"]')?.textContent).toBe(
                PAY_HINT_UNREAD,
            );
        }
    });

    it('says the same on a route that never resolved', async () => {
        const root = document.createElement('div');
        boot(root, async () => ({
            view: {
                route: { kind: 'unresolvable' as const, address: ADDR },
                overlay: { kind: 'idle' as const },
                address: ADDR,
                tokens: new Map(),
                payHint: QUOTED.slice(0, 12),
            },
            offers: [],
        }));
        await flush();
        expect(root.querySelector('[data-role="pay-hint-note"]')?.textContent).toBe(
            PAY_HINT_UNREAD,
        );
    });
});

describe('a-pay-hint-on-a-truncated-walk-says-so', () => {
    /**
     * A descriptions walk that hit its cap says nothing about whether the
     * quote exists — our own ceiling reported as the seller's inventory is the
     * claim §5 refuses everywhere else. A walk that threw is the same claim
     * with a different cause, and the reader is owed the same sentence: the
     * two are the only ways this page can hold less than the seller wrote.
     */
    it('never calls a quote unknown after a walk that stopped early', async () => {
        for (const walk of [{ descriptionsTruncated: true }, { descriptionsFailed: true }]) {
            const root = document.createElement('div');
            boot(root, async () => quotedStall({ payHint: 'ab'.repeat(6), ...walk }));
            await flush();
            expect(root.querySelector('[data-role="pay-hint-note"]')?.textContent).toBe(
                PAY_HINT_UNREAD,
            );
        }
    });
});

describe('unread-means-the-walk-failed-not-the-book', () => {
    /**
     * The offer index and the seller's own records are two different reads of
     * two different indexes: the quotes need only the address history, which
     * every chronik node carries, and the agora plugin refusing to answer says
     * nothing about them. A book that failed over a walk that succeeded is a
     * complete read of the records, so the link named an item this stall does
     * not quote — which is a sentence about the stall, and true.
     */
    it('calls a hint unknown when only the book failed', async () => {
        const root = document.createElement('div');
        boot(root, async () =>
            quotedStall({
                payHint: 'ab'.repeat(6),
                fetch: { kind: 'plugin-missing', triedAtMs: 1, hosts: [] },
            }),
        );
        await flush();
        expect(root.querySelector('[data-role="pay-hint-note"]')?.textContent).toBe(
            PAY_HINT_UNKNOWN,
        );
    });
});

describe('a-hint-whose-genesis-we-could-not-read-is-not-unknown', () => {
    /**
     * The record is there and the prefix names it; what is missing is the
     * token's genesis, so `quotedItems` refuses the row (it could be an NFT,
     * and a quote per whole token means nothing about one). "This stall does
     * not quote that item" would be a claim about the seller made out of our
     * own missing read.
     */
    it('says it could not read when the quote is on the view but not paintable', async () => {
        const root = document.createElement('div');
        boot(root, async () =>
            quotedStall({ payHint: QUOTED.slice(0, 12), tokens: new Map() }),
        );
        await flush();
        expect(root.querySelector('[data-role="pay"]')).toBeNull();
        expect(root.querySelector('[data-role="pay-hint-note"]')?.textContent).toBe(
            PAY_HINT_UNREAD,
        );
    });
});

/*
 * The failure screens, which are now waiting for two walks the book's own
 * failure says nothing about.
 */

const FAILED_HOSTS = [
    { host: 'chronik-native1.fabien.cash', result: 'plugin-missing' as const },
];

function noRecords(over: Partial<DescriptionLookup> = {}): DescriptionLookup {
    return {
        descriptions: new Map(),
        shelves: new Map(),
        prices: new Map(),
        quoteTimes: new Map(),
        unreadable: new Set(),
        genesis: new Map(),
        truncated: false,
        failed: false,
        ...over,
    };
}

function settingsNaming(name: string): ManifestLookup {
    return {
        manifest: {
            name,
            theme: DEFAULT_THEME,
            extras: new Map(),
            height: 800_000,
            isFinal: true,
            txid: 'ab'.repeat(32),
        },
        truncated: false,
        unreadable: false,
    };
}

/** What `loadCurrent` answers with when the book failed: the two walks, unawaited. */
function bookFailed(
    facts: {
        manifest: Promise<ManifestLookup | undefined>;
        descriptions: Promise<DescriptionLookup | undefined>;
    },
    over: Partial<AppState['view']> = {},
): AppState {
    return {
        view: {
            route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
            fetch: { kind: 'plugin-missing', triedAtMs: 0, hosts: FAILED_HOSTS },
            overlay: { kind: 'idle' },
            address: ADDR,
            tokens: new Map(),
            ...over,
        },
        offers: [],
        pubkeyHex: PK,
        pendingFacts: {
            stall: { address: ADDR, hash: 'aa'.repeat(20) },
            pubkeyHex: PK,
            ...facts,
        },
    };
}

describe('a-pay-hint-resolves-when-only-the-book-failed', () => {
    /**
     * A scanned code lands on whatever screen the stall is in, and the quote
     * it names was never the offer index's to give. The records arrive after
     * this screen paints, so the link is answered from them and not from the
     * empty state the failure returned — judging it early is how a stall's own
     * item gets called unknown.
     */
    it('opens the sheet once the walk that carries the quote has answered', async () => {
        const root = document.createElement('div');
        // The genesis facts are already on the view here: what this pins is
        // the moment the hint is judged, and `a-plugin-failure-still-paints-
        // the-quotes` covers the read that fetches them.
        boot(root, async () =>
            bookFailed(
                {
                    manifest: Promise.resolve(undefined),
                    descriptions: Promise.resolve(
                        noRecords({
                            prices: new Map([
                                [QUOTED, { code: 'usd', exponent: 2, amount: 500n }],
                            ]),
                        }),
                    ),
                },
                {
                    payHint: QUOTED.slice(0, 12),
                    tokens: new Map([[QUOTED, quotedMeta(QUOTED, 'Roasted Beans')]]),
                },
            ),
        );
        await flush();
        expect(root.querySelector('[data-role="pay"]')).not.toBeNull();
        expect(root.querySelector('[data-role="pay-hint-note"]')).toBeNull();
    });
});

describe('the-failure-screen-paints-before-the-facts-land', () => {
    /**
     * Awaiting the two walks here would put ten timeouts across three hosts in
     * front of a screen whose whole job is to say quickly that we failed. So
     * the screen paints from the route alone and the answers are applied when
     * they arrive — the same shape a live re-read has.
     */
    it('paints the failure first and the name the walk read afterwards', async () => {
        let answer: (lookup: ManifestLookup) => void = () => {};
        const manifest = new Promise<ManifestLookup>((resolve) => {
            answer = resolve;
        });
        const root = document.createElement('div');
        boot(root, async () =>
            bookFailed({ manifest, descriptions: Promise.resolve(noRecords()) }),
        );
        await flush();
        // `bookFailed` is a `plugin-missing` fetch — a node that answered
        // without the offer plugin — which now says so in its own words rather
        // than borrowing the unreachable screen's. What this test is about is
        // unchanged: the failure paints before the walks land.
        expect(root.textContent).toContain(PLUGIN_MISSING_BODY);
        expect(root.textContent).not.toContain('Riverside Goods');

        answer(settingsNaming('Riverside Goods'));
        await flush();
        expect(root.textContent).toContain('Riverside Goods');
        expect(root.textContent, 'the failure is still what happened').toContain(
            PLUGIN_MISSING_BODY,
        );
    });
});

describe('a-superseded-facts-answer-is-dropped', () => {
    /**
     * The walks outlive the page that started them. An answer for a stall the
     * visitor has already left is the same stale paint `stale-refresh-does-not-paint`
     * refuses, arriving down a slower road.
     */
    it('never paints a walk that answered for a page already left', async () => {
        let answer: (lookup: ManifestLookup) => void = () => {};
        const manifest = new Promise<ManifestLookup>((resolve) => {
            answer = resolve;
        });
        let loads = 0;
        const root = document.createElement('div');
        boot(root, async () => {
            loads += 1;
            return loads === 1
                ? bookFailed({ manifest, descriptions: Promise.resolve(noRecords()) })
                : stallNamed('Second Stall');
        });
        await flush();
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(root.textContent).toContain('Second Stall');

        answer(settingsNaming('First Stall'));
        await flush();
        expect(root.textContent).toContain('Second Stall');
        expect(root.textContent).not.toContain('First Stall');
    });
});

/*
 * The Shop panel's two rails: which side a stall opens on, and what keeps a
 * reader there.
 *
 * The choice is `boot`'s own closure state, applied at every paint the way the
 * currency is. It is not on the view the load answers with: `refresh()`
 * rebuilds that object from `loadCurrent()`, so a reader who pressed Retry
 * while reading the quotes would land back on the listings.
 */

const railPressed = (root: HTMLElement): string | undefined =>
    root
        .querySelector('[data-role="shop-tabs"] [aria-pressed="true"]')
        ?.getAttribute('data-role') ?? undefined;

const railTab = (root: HTMLElement, side: 'listings' | 'quotes') =>
    root.querySelector<HTMLButtonElement>(`[data-role="shop-tab-${side}"]`);

const QUOTED_OFFER: StallOffer = {
    outpoint: { txid: 'ab'.repeat(32), outIdx: 0 },
    tokenId: QUOTED,
    atoms: 12n,
    variant: 'PARTIAL',
    askedSats: 120_000n,
    askedAtoms: 1n,
};

const listedQuotedStall = (over: Partial<AppState['view']> = {}): AppState =>
    quotedStall({ fetch: { kind: 'offers', offers: [QUOTED_OFFER] }, ...over });

describe('the-shop-opens-on-the-tab-that-has-content', () => {
    it('opens the quotes when nothing is listed and something is quoted', async () => {
        const root = document.createElement('div');
        boot(root, async () => quotedStall());
        await flush();
        expect(railPressed(root)).toBe('shop-tab-quotes');
        expect(root.querySelector('[data-role="pay-row"]')).not.toBeNull();
    });

    it('opens the listings when the shop has any', async () => {
        const root = document.createElement('div');
        boot(root, async () => listedQuotedStall());
        await flush();
        expect(railPressed(root)).toBe('shop-tab-listings');
    });

    it('opens the listings on an empty stall that quotes nothing', async () => {
        const root = document.createElement('div');
        boot(root, async () => quotedStall({ prices: new Map() }));
        await flush();
        expect(railPressed(root)).toBe('shop-tab-listings');
    });

    it('opens the listings when the book failed, whatever the records hold', async () => {
        // "Lists nothing" is a fact about the seller and this screen has none:
        // the book failed, so the shop is unknown rather than empty.
        const root = document.createElement('div');
        boot(root, async () =>
            quotedStall({ fetch: { kind: 'unreachable', triedAtMs: 1, hosts: [] } }),
        );
        await flush();
        expect(railPressed(root)).toBe('shop-tab-listings');
        expect(root.textContent).toContain(UNREACHABLE_BODY);
    });
});

describe('the-opening-tab-is-decided-once-and-sticks', () => {
    /**
     * `refresh()` paints the opening screen before the index is asked, and a
     * live book lands after it. A default computed at paint time would say
     * listings, flip to quotes when the load landed, and flip back on the next
     * message — three screens under one reader.
     */
    it('does not decide again for a stall already open', async () => {
        let listed = false;
        const root = document.createElement('div');
        boot(root, async () => (listed ? listedQuotedStall() : quotedStall()));
        await flush();
        expect(railPressed(root)).toBe('shop-tab-quotes');

        // The same stall, read again, now with a listing on it. The rule would
        // say listings; the decision was already made.
        listed = true;
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(railPressed(root)).toBe('shop-tab-quotes');
    });

    it('decides again for a different stall', async () => {
        const other = '02'.padEnd(66, 'b');
        let first = true;
        const root = document.createElement('div');
        boot(root, async () => {
            if (first) {
                first = false;
                return quotedStall();
            }
            return {
                ...listedQuotedStall(),
                pubkeyHex: other,
                view: {
                    ...listedQuotedStall().view,
                    route: { kind: 'pubkey' as const, pubkeyHex: other, address: ADDR },
                },
            };
        });
        await flush();
        expect(railPressed(root)).toBe('shop-tab-quotes');
        window.dispatchEvent(new PopStateEvent('popstate'));
        await flush();
        expect(railPressed(root)).toBe('shop-tab-listings');
    });
});

describe('a-retry-on-the-quotes-tab-comes-back-to-the-quotes-tab', () => {
    /**
     * A walk that threw is the one quotes outcome with a way forward, so it
     * carries the same Retry the book's failures do — and that control runs the
     * whole load again. The side the reader is on is not part of what is
     * rebuilt.
     */
    it('re-reads the stall and leaves the reader where they were', async () => {
        let loads = 0;
        const root = document.createElement('div');
        boot(root, async () => {
            loads += 1;
            return listedQuotedStall({ descriptionsFailed: true });
        });
        await flush();
        railTab(root, 'quotes')!.click();
        expect(railPressed(root)).toBe('shop-tab-quotes');

        (root.querySelector('[data-role="retry"]') as HTMLButtonElement).click();
        await flush();
        expect(loads, 'the retry re-read the stall').toBe(2);
        expect(railPressed(root)).toBe('shop-tab-quotes');
        expect(root.querySelector('[data-role="pay-row"]')).not.toBeNull();
    });
});

describe('a-pay-hint-opens-the-quotes-tab', () => {
    /**
     * A scanned code names an item on the quote rail, so it lands on that rail
     * — including when it opened nothing, because the note about it is a note
     * about that side.
     */
    it('lands behind the sheet the link opened', async () => {
        const root = document.createElement('div');
        boot(root, async () => listedQuotedStall({ payHint: QUOTED.slice(0, 12) }));
        await flush();
        expect(root.querySelector('[data-role="pay"]')).not.toBeNull();
        (root.querySelector('[data-role="pay-close"]') as HTMLButtonElement).click();
        expect(railPressed(root)).toBe('shop-tab-quotes');
    });

    it('lands there even when the link named nothing this stall quotes', async () => {
        const root = document.createElement('div');
        boot(root, async () => listedQuotedStall({ payHint: 'ab'.repeat(6) }));
        await flush();
        expect(railPressed(root)).toBe('shop-tab-quotes');
        expect(root.querySelector('[data-role="pay-hint-note"]')?.textContent).toBe(
            PAY_HINT_UNKNOWN,
        );
    });
});

describe('a-pay-hint-does-not-replace-an-open-sheet', () => {
    /**
     * On a failure screen the records land after the paint, and the `?pay=`
     * link is answered when they do. A seller who opened the describe sheet
     * in that window has a half-written record in the DOM and nowhere else,
     * and CLAUDE §4's rule is that every paint nobody asked for waits while a
     * sheet is open. This road went straight to `paint()` and swapped the
     * overlay underneath, which is exactly the erasure that rule names.
     */
    it('leaves a describe sheet standing when the facts land with a match', async () => {
        let answer: (lookup: DescriptionLookup) => void = () => {};
        const descriptions = new Promise<DescriptionLookup>((resolve) => {
            answer = resolve;
        });
        const root = document.createElement('div');
        boot(root, async () =>
            bookFailed(
                { manifest: Promise.resolve(undefined), descriptions },
                {
                    overlay: { kind: 'describe' },
                    tokens: new Map([[QUOTED, quotedMeta(QUOTED, 'Roasted Beans')]]),
                    payHint: QUOTED.slice(0, 12),
                },
            ),
        );
        await flush();
        expect(root.querySelector('[data-role="publish-close"]')).not.toBeNull();
        expect(root.querySelector('[data-role="pay"]')).toBeNull();

        answer(
            noRecords({
                prices: new Map([[QUOTED, { code: 'usd', exponent: 2, amount: 500n }]]),
            }),
        );
        await flush();
        expect(root.querySelector('[data-role="pay"]'), 'the sheet was swapped').toBeNull();
        expect(root.querySelector('[data-role="publish-close"]')).not.toBeNull();
    });
});

const FIRMA_ID = '0387947fd575db4fb19a3e322f635dec37fd192b5941625b66bc4b2c3008cbf0';

describe('a-pay-hint-naming-a-withheld-token-says-so', () => {
    /**
     * A link naming a token this page does not carry is neither "no such
     * quote" nor "could not read the records": the record is there, read,
     * and withheld by this page's own rule. Said as such, and no sheet opens.
     */
    it('answers withheld, and opens nothing', async () => {
        const root = document.createElement('div');
        boot(root, async () =>
            quotedStall({
                payHint: FIRMA_ID.slice(0, 12),
                tokens: new Map([[FIRMA_ID, quotedMeta(FIRMA_ID, 'Firma')]]),
                prices: new Map([[FIRMA_ID, { code: 'usd', exponent: 2, amount: 500n }]]),
            }),
        );
        await flush();
        expect(root.querySelector('[data-role="pay-hint-note"]')?.textContent).toBe(
            PAY_HINT_WITHHELD,
        );
        expect(root.querySelector('[data-role="pay"]')).toBeNull();
    });
});

describe('a-withheld-quote-does-not-open-the-quotes-rail', () => {
    /**
     * The opening side is decided from what will be painted. A stall whose
     * only quote is withheld has nothing on that rail to open on.
     */
    it('opens the listings side', async () => {
        const root = document.createElement('div');
        boot(root, async () =>
            quotedStall({
                fetch: { kind: 'empty' },
                tokens: new Map([[FIRMA_ID, quotedMeta(FIRMA_ID, 'Firma')]]),
                prices: new Map([[FIRMA_ID, { code: 'usd', exponent: 2, amount: 500n }]]),
            }),
        );
        await flush();
        const pressed = root.querySelector('[data-role="shop-tabs"] [aria-pressed="true"]');
        // The book is empty, so the label's zero is honest — it is the side
        // that is open which this test is about.
        expect(pressed?.textContent).toContain(SHOP_TAB_LISTINGS);
    });
});
