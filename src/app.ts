import { Agora } from 'ecash-agora';
import { encodeCashAddress } from 'ecashaddrjs';
import { fromHex, shaRmd160, toHex } from 'ecash-lib';
import { isHomePath, parseSellerParam, sellerFromPath, stallPath } from './domain/route';
import { clearSavedStall, isSavedStall, readSavedStall, saveStall } from './saved';
import type {
    FetchStatus,
    Overlay,
    Outpoint,
    SessionTokenCache,
    StallOffer,
    StallView,
    TokenMeta,
} from './domain/state';
import type { DecodedTheme } from './domain/theme';
import { createChronik, loadManifest, loadOffers, loadTokenMeta, resolveSeller } from './net';
import { isDefiniteResult, watchStall, type LiveHandle } from './net/live';
import { CHRONIK_HOSTS } from './net/hosts';
import { identityOf, renderStall } from './ui';

const sessionTokens = new Map<string, TokenMeta>();
const sessionNames = new Map<string, string>();
const sessionThemes = new Map<string, DecodedTheme>();

export type AppState = {
    view: StallView;
    offers: StallOffer[];
    pubkeyHex?: string;
};

export function boot(
    root: HTMLElement,
    load: () => Promise<AppState> = loadCurrent,
): void {
    /**
     * Every refresh claims a generation. A response that resolves after a newer
     * refresh started belongs to a page the visitor already left, so it is
     * dropped rather than painted. Comparing the seller instead would not catch
     * A -> B -> A.
     */
    let generation = 0;
    /** One socket per painted stall. Closed before the next one opens. */
    let live: LiveHandle | undefined;
    let state: AppState = {
        view: {
            route: { kind: 'invalid', raw: '' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        },
        offers: [],
    };

    const paint = (): void => {
        // Read at paint time, not at load: the toggle changes it without a
        // refetch, and a stale flag would leave the control lying about itself.
        const view: StallView = {
            ...state.view,
            isDefaultStall: isSavedStall(identityOf(state.view)),
        };
        renderStall(root, view, {
            onBuy: (outpoint) => {
                void onBuy(outpoint);
            },
            onRetry: () => {
                void refresh();
            },
            onCloseSheet: () => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'idle' } } };
                paint();
            },
            onOpenStall: (raw) => {
                onOpenStall(raw);
            },
            onGoHome: () => {
                onGoHome();
            },
            onOpenPublish: () => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'publish' } } };
                paint();
            },
            onClosePublish: () => {
                state = { ...state, view: { ...state.view, overlay: { kind: 'idle' } } };
                paint();
            },
            onToggleDefault: (raw) => {
                if (isSavedStall(raw)) {
                    clearSavedStall();
                } else {
                    saveStall(raw);
                }
                paint();
            },
        });
    };

    const onBuy = async (outpoint: Outpoint): Promise<void> => {
        const overlay: Overlay = { kind: 'buy', outpoint };
        state = { ...state, view: { ...state.view, overlay } };
        paint();
    };

    const onOpenStall = (raw: string): void => {
        if (parseSellerParam(raw).kind === 'invalid') {
            return;
        }
        history.pushState(null, '', stallPath(raw));
        void refresh();
    };

    const onGoHome = (): void => {
        // Mark this door as chosen. `history.state` survives a reload of the
        // same entry, so a visitor who clicked "open another stall" and then
        // reloaded stays on the door instead of being snapped back to their
        // default stall. A freshly typed bare domain has null state and still
        // opens the default. See the cold-start block below.
        history.pushState({ door: true }, '', '/');
        void refresh();
    };

    const refresh = async (): Promise<void> => {
        const claimed = ++generation;
        live?.close();
        live = undefined;
        // Paint the parsed route before the index is asked, so a paste is not
        // a no-op while Chronik is in flight. Home is local; still cheap.
        state = openingFromLocation();
        paint();
        const next = await load();
        if (claimed !== generation) {
            return;
        }
        state = next;
        paint();
        watch(claimed);
    };

    /**
     * Keep the painted book current. Only a fact about the seller is applied:
     * a refetch that fails leaves the last good list on screen rather than
     * turning a working stall into an error, and the offers are replaced
     * without disturbing an open expander.
     */
    const watch = (claimed: number): void => {
        const pubkeyHex = state.pubkeyHex;
        // An empty stall is watched too. It is the one screen that promises
        // "anything they list will appear here on its own", and it was the one
        // screen with nothing listening: a seller's first offer never arrived
        // until the visitor reloaded.
        const kind = state.view.fetch?.kind;
        if (pubkeyHex === undefined || (kind !== 'offers' && kind !== 'empty')) {
            return;
        }
        live = watchStall(createChronik() as never, pubkeyHex, () => {
            void (async () => {
                const status = await loadOffers(new Agora(createChronik()), pubkeyHex);
                if (claimed !== generation || !isDefiniteResult(status)) {
                    return;
                }
                state = {
                    ...state,
                    offers: status.kind === 'offers' ? status.offers : [],
                    view: { ...state.view, fetch: status },
                };
                paint();
            })();
        });
    };

    window.addEventListener('popstate', () => {
        void refresh();
    });
    // Cold start only. Someone who typed the bare domain gets the stall they
    // chose; `replaceState` rather than `pushState` so Back leaves the site
    // instead of bouncing between the door and the stall. In-app navigation to
    // `/` still paints the door, which is what the Open-another-stall control
    // is for.
    const saved = readSavedStall();
    const choseTheDoor = (history.state as { door?: boolean } | null)?.door === true;
    if (saved !== undefined && isHomePath(location.pathname) && !choseTheDoor) {
        history.replaceState(null, '', stallPath(saved));
    }
    void refresh();
}

async function loadCurrent(): Promise<AppState> {
    if (isHomePath(location.pathname)) {
        return {
            view: { route: { kind: 'home' }, overlay: { kind: 'idle' }, tokens: new Map() },
            offers: [],
        };
    }

    const raw = sellerFromPath(location.pathname);
    if (raw === undefined) {
        return {
            view: {
                route: { kind: 'invalid', raw: location.pathname },
                overlay: { kind: 'idle' },
                tokens: new Map(),
            },
            offers: [],
        };
    }

    const parsed = parseSellerParam(raw);
    const hint = new URLSearchParams(location.search).get('m') ?? undefined;
    const chronik = createChronik();

    let route;
    try {
        route = await resolveSeller(parsed, chronik);
    } catch {
        if (parsed.kind === 'invalid') {
            return {
                view: {
                    route: { kind: 'invalid', raw: parsed.raw },
                    overlay: { kind: 'idle' },
                    tokens: new Map(),
                },
                offers: [],
            };
        }
        if (parsed.kind === 'pubkey') {
            return {
                view: {
                    route: {
                        kind: 'pubkey',
                        pubkeyHex: parsed.pubkeyHex,
                        address: p2pkhAddress(parsed.pubkeyHex),
                    },
                    fetch: unreachableNow(),
                    overlay: { kind: 'idle' },
                    address: p2pkhAddress(parsed.pubkeyHex),
                    tokens: new Map(),
                },
                offers: [],
            };
        }
        return {
            view: {
                route: { kind: 'unresolved', address: parsed.address },
                fetch: unreachableNow(),
                overlay: { kind: 'idle' },
                address: parsed.address,
                tokens: new Map(),
            },
            offers: [],
        };
    }

    if (route.kind !== 'pubkey') {
        return {
            view: { route, overlay: { kind: 'idle' }, tokens: new Map(), address: addressOf(route) },
            offers: [],
        };
    }

    const agora = new Agora(chronik);
    const address = route.address ?? p2pkhAddress(route.pubkeyHex);
    const hash = toHex(shaRmd160(fromHex(route.pubkeyHex)));
    const cachedName = sessionNames.get(route.pubkeyHex);
    const cachedTheme = sessionThemes.get(route.pubkeyHex);
    const cachedTokens = tokensFor(route.pubkeyHex);

    let fetch: FetchStatus;
    try {
        fetch = await loadOffers(agora, route.pubkeyHex);
    } catch {
        fetch = unreachableNow();
    }

    if (
        fetch.kind === 'unreachable' ||
        fetch.kind === 'plugin-missing' ||
        fetch.kind === 'unreadable'
    ) {
        const later = Boolean(cachedName) || cachedTokens.size > 0;
        return {
            view: {
                route,
                fetch,
                overlay: { kind: 'idle' },
                stallName: later ? cachedName : undefined,
                address,
                tokens: later ? cachedTokens : new Map(),
                theme: later ? cachedTheme : undefined,
            },
            offers: [],
            pubkeyHex: route.pubkeyHex,
        };
    }

    const offers = fetch.kind === 'offers' ? fetch.offers : [];
    const metas = await loadTokenMeta(
        chronik,
        offers.map((o) => o.tokenId),
    );
    for (const meta of metas) {
        sessionTokens.set(cacheKey(route.pubkeyHex, meta.tokenId), meta);
    }

    let stallName = cachedName;
    let theme = cachedTheme;
    let settingsTruncated = false;
    let settingsUnreadable = false;
    try {
        const lookup = await loadManifest(chronik, { address, hash }, hint);
        settingsTruncated = lookup.truncated;
        settingsUnreadable = lookup.unreadable;
        const manifest = lookup.manifest;
        if (manifest) {
            stallName = manifest.name;
            theme = manifest.theme;
            sessionNames.set(route.pubkeyHex, manifest.name);
            sessionThemes.set(route.pubkeyHex, manifest.theme);
        }
    } catch {
        // Keep session name if the manifest walk failed.
    }

    const tokens: SessionTokenCache = new Map();
    for (const offer of offers) {
        const meta = sessionTokens.get(cacheKey(route.pubkeyHex, offer.tokenId));
        if (meta) {
            tokens.set(offer.tokenId, meta);
        }
    }

    return {
        view: {
            route,
            fetch,
            overlay: { kind: 'idle' },
            stallName,
            address,
            tokens,
            theme,
            settingsTruncated,
            settingsUnreadable,
        },
        offers,
        pubkeyHex: route.pubkeyHex,
    };
}

function openingFromLocation(): AppState {
    const idle = { kind: 'idle' as const };
    const emptyTokens = new Map();
    if (isHomePath(location.pathname)) {
        return {
            view: { route: { kind: 'home' }, overlay: idle, tokens: emptyTokens },
            offers: [],
        };
    }
    const raw = sellerFromPath(location.pathname);
    if (raw === undefined) {
        return {
            view: {
                route: { kind: 'invalid', raw: location.pathname },
                overlay: idle,
                tokens: emptyTokens,
            },
            offers: [],
        };
    }
    const parsed = parseSellerParam(raw);
    if (parsed.kind === 'invalid') {
        return {
            view: {
                route: { kind: 'invalid', raw: parsed.raw },
                overlay: idle,
                tokens: emptyTokens,
            },
            offers: [],
        };
    }
    if (parsed.kind === 'pubkey') {
        const address = p2pkhAddress(parsed.pubkeyHex);
        const cachedName = sessionNames.get(parsed.pubkeyHex);
        return {
            view: {
                route: {
                    kind: 'pubkey',
                    pubkeyHex: parsed.pubkeyHex,
                    address,
                },
                fetch: { kind: 'opening' },
                overlay: idle,
                stallName: cachedName,
                address,
                tokens: emptyTokens,
            },
            offers: [],
            pubkeyHex: parsed.pubkeyHex,
        };
    }
    return {
        view: {
            route: { kind: 'unresolved', address: parsed.address },
            fetch: { kind: 'opening' },
            overlay: idle,
            address: parsed.address,
            tokens: emptyTokens,
        },
        offers: [],
    };
}

function unreachableNow(): FetchStatus {
    return {
        kind: 'unreachable',
        triedAtMs: Date.now(),
        hosts: CHRONIK_HOSTS.map((host) => ({ host, result: 'timeout' as const })),
    };
}

function p2pkhAddress(pubkeyHex: string): string {
    return encodeCashAddress('ecash', 'p2pkh', toHex(shaRmd160(fromHex(pubkeyHex))));
}

function addressOf(route: StallView['route']): string | undefined {
    if (route.kind === 'unresolvable' || route.kind === 'unresolved') {
        return route.address;
    }
    if (route.kind === 'pubkey') {
        return route.address;
    }
    return undefined;
}

function cacheKey(pubkeyHex: string, tokenId: string): string {
    return `${pubkeyHex}:${tokenId}`;
}

function tokensFor(pubkeyHex: string): SessionTokenCache {
    const out: SessionTokenCache = new Map();
    const prefix = `${pubkeyHex}:`;
    for (const [key, meta] of sessionTokens) {
        if (key.startsWith(prefix)) {
            out.set(meta.tokenId, meta);
        }
    }
    return out;
}
