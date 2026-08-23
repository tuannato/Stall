import { Agora } from 'ecash-agora';
import { encodeCashAddress } from 'ecashaddrjs';
import { fromHex, shaRmd160, toHex } from 'ecash-lib';
import { cheaperOfferCount } from './domain/money';
import { parseSellerParam, sellerFromPath } from './domain/route';
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
import { CHRONIK_HOSTS } from './net/hosts';
import { renderStall } from './ui';

const sessionTokens = new Map<string, TokenMeta>();
const sessionNames = new Map<string, string>();
const sessionThemes = new Map<string, DecodedTheme>();

type AppState = {
    view: StallView;
    offers: StallOffer[];
    pubkeyHex?: string;
};

export function boot(root: HTMLElement): void {
    let state: AppState = {
        view: {
            route: { kind: 'invalid', raw: '' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
        },
        offers: [],
    };

    const paint = (): void => {
        renderStall(root, state.view, {
            onBuy: (outpoint) => {
                void onBuy(outpoint);
            },
            onRetry: () => {
                void refresh();
            },
            onCloseSheet: () => {
                state = {
                    ...state,
                    view: { ...state.view, overlay: { kind: 'idle' }, cheaperCount: undefined },
                };
                paint();
            },
        });
    };

    const onBuy = async (outpoint: Outpoint): Promise<void> => {
        const overlay: Overlay = { kind: 'buy', outpoint };
        const selected = state.offers.find(
            (o) => o.outpoint.txid === outpoint.txid && o.outpoint.outIdx === outpoint.outIdx,
        );
        const cheaperCount = selected
            ? cheaperOfferCount(selected, state.offers.filter((o) => o !== selected))
            : undefined;
        state = { ...state, view: { ...state.view, overlay, cheaperCount } };
        paint();
    };

    const refresh = async (): Promise<void> => {
        state = await loadCurrent();
        paint();
    };

    window.addEventListener('popstate', () => {
        void refresh();
    });
    void refresh();
}

async function loadCurrent(): Promise<AppState> {
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

    if (fetch.kind === 'unreachable' || fetch.kind === 'plugin-missing') {
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
    try {
        const manifest = await loadManifest(chronik, { address, hash }, hint);
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
        },
        offers,
        pubkeyHex: route.pubkeyHex,
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
