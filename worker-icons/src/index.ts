/**
 * icons.stall.cash — token-icon proxy.
 *
 * Sibling of stall.cash, not a dependency. If this Worker is unreachable the
 * shop still paints: every row falls back to initials. This origin holds no
 * key and signs nothing.
 *
 * The path is the twin of `iconUrl` in the stall app. Upstream is
 * icons.etokens.cash, which must never see a visitor.
 */

/** Public hostname. Cache keys pin here so a workers.dev hit shares the entry. */
export const CANONICAL_ORIGIN = 'https://icons.stall.cash';

export const UPSTREAM_ORIGIN = 'https://icons.etokens.cash';

/** The one size the stall asks for. A wider allowlist is proxy surface it does not use. */
export const ICON_SIZE = 64;

/**
 * 4× a 64×64 RGBA bitmap (16384 bytes). A PNG larger than its uncompressed
 * pixels is extra chunks or not a 64px icon. Chosen by construction, not by
 * measuring etokens — that needs a network call.
 */
export const MAX_ICON_BYTES = 65536;

export const UPSTREAM_TIMEOUT_MS = 4000;

/**
 * Browser 1h vs edge 7d: this URL has no content hash, so `immutable` is
 * forbidden (the stall already burned that once — `unhashed-path-is-not-cacheable`).
 * The browser must be allowed to see a replaced icon without a hard refresh;
 * the edge must not hammer upstream on every stall view.
 */
export const HIT_CACHE_CONTROL = 'public, max-age=3600, s-maxage=604800';

/**
 * A miss is not a hit. Shorter than HIT so a later-added icon can appear.
 * Owner asked to cache 404; the split is ours.
 */
export const MISS_CACHE_CONTROL = 'public, max-age=60, s-maxage=300';

export const NO_STORE = 'no-store';

export const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const PATH = /^\/icon\/64\/([0-9a-fA-F]{64})\.png$/;

const SECURITY_HEADERS = {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
} as const;

export type IconRoute = { id: string };

export type IconCache = {
    match(key: Request): Promise<Response | undefined>;
    put(key: Request, response: Response): Promise<void>;
};

export type WaitCtx = {
    waitUntil(promise: Promise<unknown>): void;
};

export type HandleDeps = {
    fetch: typeof fetch;
    cache: IconCache;
};

/** Valid GET path with no query, or null. Null means 404 before upstream. */
export function parseIconRoute(url: URL): IconRoute | null {
    // `search` drops a bare `?`; `href` still carries it. Either is a query.
    if (url.search !== '' || url.href.includes('?')) {
        return null;
    }
    const match = PATH.exec(url.pathname);
    if (match === null) {
        return null;
    }
    return { id: match[1]!.toLowerCase() };
}

export function canonicalCacheKey(id: string): string {
    return `${CANONICAL_ORIGIN}/icon/${ICON_SIZE}/${id}.png`;
}

/** etokens serves `/<size>/<id>.png`, not our `/icon/<size>/…` route. */
export function upstreamUrl(id: string): string {
    return `${UPSTREAM_ORIGIN}/${ICON_SIZE}/${id}.png`;
}

export function upstreamRequestInit(): RequestInit {
    return {
        method: 'GET',
        // `manual`, not `error`. We still refuse to follow a redirect — a 3xx
        // is handled below as its own answer — but `error` makes fetch throw a
        // bare TypeError, which is indistinguishable from the connection never
        // being made. That ambiguity cost a deploy: the upstream answered 200
        // from a laptop and the edge reported only `threw:TypeError`.
        redirect: 'manual',
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        headers: { Accept: 'image/png' },
    };
}

export function isPng(bytes: Uint8Array): boolean {
    if (bytes.byteLength < PNG_MAGIC.byteLength) {
        return false;
    }
    for (let i = 0; i < PNG_MAGIC.byteLength; i++) {
        if (bytes[i] !== PNG_MAGIC[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Buffer with a hard ceiling. Trust Content-Length only as an early reject;
 * a missing or lying length still streams until MAX_ICON_BYTES.
 */
export async function readLimited(
    response: Response,
    maxBytes: number,
): Promise<Uint8Array | null> {
    const declared = response.headers.get('content-length');
    if (declared !== null) {
        const n = Number(declared);
        if (!Number.isFinite(n) || n < 0 || n > maxBytes) {
            if (response.body !== null) {
                await response.body.cancel();
            }
            return null;
        }
    }
    if (response.body === null) {
        return new Uint8Array(0);
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        total += value.byteLength;
        if (total > maxBytes) {
            await reader.cancel();
            return null;
        }
        chunks.push(value);
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return out;
}

function empty(status: number, cacheControl: string): Response {
    return new Response(null, {
        status,
        headers: {
            'cache-control': cacheControl,
            ...SECURITY_HEADERS,
        },
    });
}

function methodNotAllowed(): Response {
    return new Response('Method Not Allowed', {
        status: 405,
        headers: {
            allow: 'GET',
            'cache-control': NO_STORE,
            ...SECURITY_HEADERS,
        },
    });
}

/** Wrong path or query: not a token miss, not cacheable. */
function junkNotFound(): Response {
    return empty(404, NO_STORE);
}

function tokenMiss(): Response {
    return empty(404, MISS_CACHE_CONTROL);
}

/**
 * Our failure, with the reason attached.
 *
 * A bare 502 told us nothing the first time this Worker met a real upstream:
 * the answer was identical whether the fetch threw, the status was unexpected,
 * or the bytes were not a PNG, and `wrangler tail` reports a handled failure as
 * "Ok". A sibling proxy against the same chain hit this before us and recorded
 * the same conclusion — an error that explains itself is worth far more than
 * one that does not. The reason rides in a header, so the body stays empty and
 * the contract is unchanged, and it is a short fixed token rather than an
 * upstream string echoed back.
 */
function badGateway(reason: string): Response {
    const res = empty(502, NO_STORE);
    res.headers.set('x-icon-reason', reason.slice(0, 48));
    return res;
}

function pngHit(bytes: Uint8Array): Response {
    return new Response(bytes, {
        status: 200,
        headers: {
            'content-type': 'image/png',
            'cache-control': HIT_CACHE_CONTROL,
            ...SECURITY_HEADERS,
        },
    });
}

async function fetchIcon(id: string, fetchFn: typeof fetch): Promise<Response> {
    let upstream: Response;
    try {
        upstream = await fetchFn(upstreamUrl(id), upstreamRequestInit());
    } catch (err) {
        const e = err as { name?: string; message?: string } | null;
        const name = e?.name ?? 'unknown';
        // The message is generated by the runtime, not echoed from upstream,
        // so it is safe to surface and is usually the whole diagnosis.
        const detail = (e?.message ?? '').replace(/[^\x20-\x7e]/g, '').slice(0, 32);
        return badGateway(detail === '' ? `threw:${name}` : `threw:${name}:${detail}`);
    }

    if (upstream.status === 404 || upstream.status === 410) {
        return tokenMiss();
    }
    if (upstream.status >= 300 && upstream.status < 400) {
        // Not followed on purpose: a redirect can leave the origin we vouched
        // for. Reported rather than swallowed so the reason is legible.
        return badGateway(`upstream-redirect-${upstream.status}`);
    }
    if (upstream.status !== 200) {
        return badGateway(`upstream-${upstream.status}`);
    }

    const bytes = await readLimited(upstream, MAX_ICON_BYTES);
    if (bytes === null || !isPng(bytes)) {
        // Upstream answered, but not with a PNG we can vouch for. That is our
        // failure, not "this token has no icon" — a 200 HTML challenge page
        // must not be remembered as a miss.
        return badGateway(bytes === null ? 'too-big-or-truncated' : 'not-png');
    }
    return pngHit(bytes);
}

export async function handleRequest(
    request: Request,
    ctx: WaitCtx,
    deps: HandleDeps,
): Promise<Response> {
    if (request.method !== 'GET') {
        return methodNotAllowed();
    }

    const route = parseIconRoute(new URL(request.url));
    if (route === null) {
        return junkNotFound();
    }

    const key = new Request(canonicalCacheKey(route.id), { method: 'GET' });
    const hit = await deps.cache.match(key);
    if (hit !== undefined) {
        return hit;
    }

    const response = await fetchIcon(route.id, deps.fetch);
    if (response.status === 200 || response.status === 404) {
        ctx.waitUntil(deps.cache.put(key, response.clone()));
    }
    return response;
}

type CachesGlobal = { caches: { default: IconCache } };

export default {
    async fetch(request: Request, _env: unknown, ctx: WaitCtx): Promise<Response> {
        const { caches } = globalThis as unknown as CachesGlobal;
        return handleRequest(request, ctx, {
            fetch: globalThis.fetch.bind(globalThis),
            cache: caches.default,
        });
    },
};
