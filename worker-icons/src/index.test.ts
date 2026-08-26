import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    CANONICAL_ORIGIN,
    HIT_CACHE_CONTROL,
    ICON_SIZE,
    MAX_ICON_BYTES,
    MISS_CACHE_CONTROL,
    NO_STORE,
    PNG_MAGIC,
    UPSTREAM_ORIGIN,
    UPSTREAM_TIMEOUT_MS,
    canonicalCacheKey,
    handleRequest,
    isPng,
    parseIconRoute,
    upstreamRequestInit,
    upstreamUrl,
    type IconCache,
    type WaitCtx,
} from './index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const ID = 'a'.repeat(64);
const ID_UPPER = 'A'.repeat(64);
const PATH = `/icon/64/${ID}.png`;

/** 1×1 PNG. Fixture only — not a token icon. */
const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
);

const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
const HTML = Buffer.from('<!doctype html><title>not found</title>');

type FetchCall = { url: string; init: RequestInit | undefined };

function fakeCache(): IconCache & { keys: () => string[] } {
    const store = new Map<string, Response>();
    return {
        keys: () => [...store.keys()],
        async match(key) {
            const hit = store.get(new URL(key.url).href);
            return hit !== undefined ? hit.clone() : undefined;
        },
        async put(key, response) {
            store.set(new URL(key.url).href, response);
        },
    };
}

function fakeCtx(): WaitCtx & { flush: () => Promise<void> } {
    const pending: Promise<unknown>[] = [];
    return {
        waitUntil(promise) {
            pending.push(promise);
        },
        async flush() {
            await Promise.all(pending);
            pending.length = 0;
        },
    };
}

function pngResponse(extra: HeadersInit = {}): Response {
    return new Response(PNG, {
        status: 200,
        headers: { 'content-type': 'image/svg+xml', ...extra },
    });
}

async function run(
    request: Request,
    fetchImpl: (url: string, init?: RequestInit) => Promise<Response>,
    cache = fakeCache(),
): Promise<{
    res: Response;
    calls: FetchCall[];
    cache: ReturnType<typeof fakeCache>;
}> {
    const calls: FetchCall[] = [];
    const ctx = fakeCtx();
    const res = await handleRequest(request, ctx, {
        cache,
        fetch: async (input, init) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
            calls.push({ url, init });
            return fetchImpl(url, init);
        },
    });
    await ctx.flush();
    return { res, calls, cache };
}

function get(path: string, host = CANONICAL_ORIGIN, headers?: HeadersInit): Request {
    return new Request(`${host}${path}`, { method: 'GET', headers });
}

describe('parseIconRoute', () => {
    it('mixed-case-hex-is-canonicalised', () => {
        const route = parseIconRoute(new URL(`${CANONICAL_ORIGIN}/icon/64/${ID_UPPER}.png`));
        assert.deepEqual(route, { id: ID });
    });

    it('query-is-404-before-upstream', () => {
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}${PATH}?x=1`)), null);
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}${PATH}?`)), null);
    });

    it('other-size-is-404-before-upstream', () => {
        for (const size of ['32', '128', '256', '512', '0', '064']) {
            assert.equal(
                parseIconRoute(new URL(`${CANONICAL_ORIGIN}/icon/${size}/${ID}.png`)),
                null,
                size,
            );
        }
    });

    it('extra-segment-is-404-before-upstream', () => {
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}${PATH}/extra`)), null);
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}/icon/64/x/${ID}.png`)), null);
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}${PATH}/`)), null);
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}/ICON/64/${ID}.png`)), null);
    });

    it('non-hex-is-404-before-upstream', () => {
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}/icon/64/${'g'.repeat(64)}.png`)), null);
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}/icon/64/${'a'.repeat(63)}.png`)), null);
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}/icon/64/${'a'.repeat(65)}.png`)), null);
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}/icon/64/${ID}.png.png`)), null);
    });

    it('dot-PNG-is-404', () => {
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}/icon/64/${ID}.PNG`)), null);
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}/icon/64/${ID}.Png`)), null);
    });

    it('missing-extension-is-404', () => {
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}/icon/64/${ID}`)), null);
    });

    it('double-slash-is-404', () => {
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}/icon//64/${ID}.png`)), null);
        assert.equal(parseIconRoute(new URL(`${CANONICAL_ORIGIN}//icon/64/${ID}.png`)), null);
    });
});

describe('handleRequest routing', () => {
    const refuse: typeof fetch = async () => {
        throw new Error('upstream must not be called');
    };

    it('query-is-404-before-upstream', async () => {
        const { res, calls, cache } = await run(get(`${PATH}?x=1`), refuse);
        assert.equal(res.status, 404);
        assert.equal(calls.length, 0);
        assert.equal(cache.keys().length, 0);
        assert.equal(res.headers.get('cache-control'), NO_STORE);
    });

    it('other-size-is-404-before-upstream', async () => {
        const { res, calls } = await run(get(`/icon/32/${ID}.png`), refuse);
        assert.equal(res.status, 404);
        assert.equal(calls.length, 0);
    });

    it('post-valid-path-is-405', async () => {
        const { res, calls, cache } = await run(
            new Request(`${CANONICAL_ORIGIN}${PATH}`, { method: 'POST' }),
            refuse,
        );
        assert.equal(res.status, 405);
        assert.equal(res.headers.get('allow'), 'GET');
        assert.equal(res.headers.get('cache-control'), NO_STORE);
        assert.equal(calls.length, 0);
        assert.equal(cache.keys().length, 0);
    });

    it('head-is-not-get', async () => {
        const { res, calls } = await run(
            new Request(`${CANONICAL_ORIGIN}${PATH}`, { method: 'HEAD' }),
            refuse,
        );
        assert.equal(res.status, 405);
        assert.equal(res.headers.get('allow'), 'GET');
        assert.equal(calls.length, 0);
    });

    it('options-is-not-cors', async () => {
        const { res, calls } = await run(
            new Request(`${CANONICAL_ORIGIN}${PATH}`, {
                method: 'OPTIONS',
                headers: { origin: 'https://stall.cash', 'access-control-request-method': 'GET' },
            }),
            refuse,
        );
        assert.equal(res.status, 405);
        assert.equal(res.headers.get('access-control-allow-origin'), null);
        assert.equal(res.headers.get('access-control-allow-methods'), null);
        assert.equal(calls.length, 0);
    });

    it('invalid-get-is-404-not-405', async () => {
        const { res } = await run(get('/nope'), refuse);
        assert.equal(res.status, 404);
        assert.equal(res.headers.get('allow'), null);
    });

    it('junk-404-is-not-cached', async () => {
        const { res, cache } = await run(get('/icon/64/not-hex.png'), refuse);
        assert.equal(res.status, 404);
        assert.equal(res.headers.get('cache-control'), NO_STORE);
        assert.equal(cache.keys().length, 0);
    });
});

describe('handleRequest upstream', () => {
    it('png-magic-required', async () => {
        const { res, cache } = await run(get(PATH), async () => pngResponse());
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('content-type'), 'image/png');
        const body = Buffer.from(await res.arrayBuffer());
        assert.deepEqual(body, PNG);
        assert.deepEqual(cache.keys(), [canonicalCacheKey(ID)]);
    });

    it('upstream-content-type-is-ignored', async () => {
        const { res } = await run(get(PATH), async () =>
            new Response(PNG, { status: 200, headers: { 'content-type': 'image/svg+xml' } }),
        );
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('content-type'), 'image/png');
    });

    it('garbage-200-is-not-a-token-miss', async () => {
        for (const body of [SVG, HTML, PNG.subarray(0, 4), Buffer.alloc(0)]) {
            const { res, cache } = await run(
                get(PATH),
                async () => new Response(body, { status: 200, headers: { 'content-type': 'image/png' } }),
            );
            assert.equal(res.status, 502, String(body));
            assert.equal(res.headers.get('cache-control'), NO_STORE);
            assert.equal(res.headers.get('content-type'), null);
            assert.equal(cache.keys().length, 0);
        }
    });

    it('oversize-is-aborted', async () => {
        let bytes = 0;
        const { res, cache } = await run(get(PATH), async () => {
            const body = new ReadableStream({
                pull(controller) {
                    // cancel() on some runtimes starts the stream once. A
                    // ceiling that actually reads would enqueue past 64 KiB.
                    bytes += 1024;
                    controller.enqueue(new Uint8Array(1024));
                },
            });
            return new Response(body, {
                status: 200,
                headers: { 'content-length': String(MAX_ICON_BYTES + 1) },
            });
        });
        assert.equal(res.status, 502);
        assert.equal(cache.keys().length, 0);
        assert.ok(bytes <= 1024, `buffered ${bytes}`);
    });

    it('oversize-stream-without-length-is-aborted', async () => {
        const { res, cache } = await run(get(PATH), async () => {
            const bytes = new Uint8Array(MAX_ICON_BYTES + 1);
            bytes.set(PNG_MAGIC, 0);
            return new Response(bytes, { status: 200 });
        });
        assert.equal(res.status, 502);
        assert.equal(cache.keys().length, 0);
    });

    it('token-miss-from-404-or-410', async () => {
        for (const status of [404, 410]) {
            const { res, cache } = await run(
                get(PATH),
                async () => new Response(null, { status }),
            );
            assert.equal(res.status, 404, String(status));
            assert.equal(res.headers.get('cache-control'), MISS_CACHE_CONTROL);
            assert.equal(res.headers.get('content-type'), null);
            assert.deepEqual(cache.keys(), [canonicalCacheKey(ID)]);
        }
    });

    it('upstream-errors-are-502', async () => {
        for (const status of [301, 302, 403, 429, 500, 503]) {
            const { res, cache, calls } = await run(
                get(PATH),
                async () => new Response(null, { status }),
            );
            assert.equal(res.status, 502, String(status));
            assert.equal(res.headers.get('cache-control'), NO_STORE);
            assert.equal(cache.keys().length, 0);
            // The redirect is refused, not followed - and the reason says which
            // kind of refusal it was, because a bare 502 could not be acted on.
            assert.equal(calls[0]?.init?.redirect, 'manual');
            const reason = res.headers.get('x-icon-reason');
            assert.equal(
                reason,
                status >= 300 && status < 400
                    ? `upstream-redirect-${status}`
                    : `upstream-${status}`,
                String(status),
            );
        }
    });

    it('upstream-throw-is-502', async () => {
        const { res, cache } = await run(get(PATH), async () => {
            throw new TypeError('Failed to fetch');
        });
        assert.equal(res.status, 502);
        assert.equal(cache.keys().length, 0);
    });

    it('mixed-case-hex-is-canonicalised', async () => {
        const { res, calls, cache } = await run(get(`/icon/64/${ID_UPPER}.png`), async (url) => {
            assert.equal(url, upstreamUrl(ID));
            return pngResponse();
        });
        assert.equal(res.status, 200);
        assert.deepEqual(calls.map((c) => c.url), [upstreamUrl(ID)]);
        assert.deepEqual(cache.keys(), [canonicalCacheKey(ID)]);
    });

    it('upstream-path-is-not-our-route', async () => {
        const { calls } = await run(get(PATH), async () => pngResponse());
        assert.equal(calls[0]?.url, `${UPSTREAM_ORIGIN}/64/${ID}.png`);
        assert.equal(calls[0]?.url.includes('/icon/'), false);
    });

    it('cache-key-is-canonical-not-inbound', async () => {
        const { cache } = await run(
            get(PATH, 'https://stall-icons.example.workers.dev'),
            async () => pngResponse(),
        );
        assert.deepEqual(cache.keys(), [`${CANONICAL_ORIGIN}/icon/64/${ID}.png`]);
    });

    it('200-and-404-are-cached-502-is-not', async () => {
        const cache = fakeCache();
        const first = await run(get(PATH), async () => pngResponse(), cache);
        assert.equal(first.res.status, 200);
        const second = await run(
            get(PATH),
            async () => {
                throw new Error('must be a cache hit');
            },
            cache,
        );
        assert.equal(second.res.status, 200);
        assert.equal(second.calls.length, 0);

        const missCache = fakeCache();
        await run(get(PATH), async () => new Response(null, { status: 404 }), missCache);
        assert.equal(missCache.keys().length, 1);

        const failCache = fakeCache();
        await run(get(PATH), async () => new Response(null, { status: 500 }), failCache);
        assert.equal(failCache.keys().length, 0);
    });
});

describe('headers', () => {
    it('hit-is-not-immutable', async () => {
        const { res } = await run(get(PATH), async () => pngResponse());
        const cc = res.headers.get('cache-control');
        assert.equal(cc, HIT_CACHE_CONTROL);
        assert.equal(cc?.includes('immutable'), false);
        assert.match(cc ?? '', /max-age=3600/);
        assert.match(cc ?? '', /s-maxage=604800/);
    });

    it('token-miss-ttl-is-shorter-than-hit', () => {
        const hitMax = Number(/max-age=(\d+)/.exec(HIT_CACHE_CONTROL)?.[1]);
        const missMax = Number(/max-age=(\d+)/.exec(MISS_CACHE_CONTROL)?.[1]);
        const hitS = Number(/s-maxage=(\d+)/.exec(HIT_CACHE_CONTROL)?.[1]);
        const missS = Number(/s-maxage=(\d+)/.exec(MISS_CACHE_CONTROL)?.[1]);
        assert.ok(missMax < hitMax);
        assert.ok(missS < hitS);
        assert.ok(hitMax < hitS);
    });

    it('502-is-no-store', async () => {
        const { res } = await run(get(PATH), async () => {
            throw new Error('down');
        });
        assert.equal(res.headers.get('cache-control'), NO_STORE);
        assert.equal(res.status, 502);
    });

    it('nosniff-and-no-referrer', async () => {
        const { res } = await run(get(PATH), async () => pngResponse());
        assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
        assert.equal(res.headers.get('access-control-allow-origin'), null);
    });

    it('404-is-not-image-png', async () => {
        const { res } = await run(get(PATH), async () => new Response(null, { status: 404 }));
        assert.equal(res.headers.get('content-type'), null);
        assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    });

    it('subrequest-does-not-forward-visitor-headers', async () => {
        const { calls } = await run(
            get(PATH, CANONICAL_ORIGIN, {
                Referer: 'https://evil.example/',
                Cookie: 'session=1',
                'User-Agent': 'Mozilla/5.0',
                Authorization: 'Bearer secret',
            }),
            async () => pngResponse(),
        );
        const headers = new Headers(calls[0]?.init?.headers);
        assert.deepEqual([...headers.keys()], ['accept']);
        assert.equal(headers.get('accept'), 'image/png');
        assert.equal(headers.get('referer'), null);
        assert.equal(headers.get('cookie'), null);
        assert.equal(headers.get('user-agent'), null);
        assert.equal(headers.get('authorization'), null);
        const init = calls[0]?.init ?? {};
        assert.equal(Object.hasOwn(init, 'cf'), false);
        assert.equal(init.redirect, 'manual');
        assert.equal(init.method, 'GET');
    });

    it('subrequest-does-not-follow-a-redirect', () => {
        // `manual` rather than `error`: both refuse to follow, but `error`
        // throws a bare TypeError that cannot be told apart from the connection
        // never being made. The refusal is asserted by behaviour above.
        const init = upstreamRequestInit();
        assert.equal(init.redirect, 'manual');
        assert.equal(UPSTREAM_TIMEOUT_MS, 4000);
        assert.ok(init.signal instanceof AbortSignal);
    });
});

describe('isPng', () => {
    it('accepts a PNG and rejects SVG', () => {
        assert.equal(isPng(Uint8Array.from(PNG)), true);
        assert.equal(isPng(Uint8Array.from(SVG)), false);
        assert.equal(isPng(new Uint8Array(0)), false);
        assert.equal(isPng(PNG_MAGIC.slice(0, 7)), false);
    });
});

describe('wiring contracts', () => {
    it('client-path-matches-worker-route', () => {
        const icons = readFileSync(join(REPO, 'src/domain/icons.ts'), 'utf8');
        assert.match(icons, /ICON_HOST = 'https:\/\/icons\.stall\.cash'/);
        assert.match(icons, /ICON_SIZE = 64/);
        assert.match(icons, /\/icon\/\$\{ICON_SIZE\}\/\$\{id\}\.png/);
        assert.equal(ICON_SIZE, 64);
        assert.equal(canonicalCacheKey(ID), `${CANONICAL_ORIGIN}/icon/64/${ID}.png`);
        assert.equal(upstreamUrl(ID), `${UPSTREAM_ORIGIN}/64/${ID}.png`);
    });

    it('source-does-not-import-ecash-live', () => {
        const src = readFileSync(join(HERE, 'index.ts'), 'utf8');
        assert.equal(/eCash-Live|ecashlive/i.test(src), false);
        assert.match(src, /AbortSignal\.timeout\(UPSTREAM_TIMEOUT_MS\)/);
        assert.equal(HIT_CACHE_CONTROL.includes('immutable'), false);
        assert.equal(src.includes('innerHTML'), false);
    });

    it('timeout-is-four-seconds', () => {
        const src = readFileSync(join(HERE, 'index.ts'), 'utf8');
        assert.equal(UPSTREAM_TIMEOUT_MS, 4000);
        assert.match(src, /export const UPSTREAM_TIMEOUT_MS = 4000/);
    });
});
