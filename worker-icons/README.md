# icons.stall.cash

A sibling of stall.cash, not a dependency. It proxies token icons from
`https://icons.etokens.cash` so the shop page never talks to that host. If this
Worker is unreachable the shop still paints: every row falls back to initials.

The stall app does not load a single icon from here yet. Its CSP `img-src` is
`'self'`. Naming this host there is a shop change, not this one.

## Route

`GET /icon/64/<64-lowercase-hex>.png`

Anything else is 404 or 405 before an upstream request is built. Only size 64:
a wider allowlist is proxy surface the shop does not use.

## Cache

A 200 is cached. A 404 for a real token id (upstream 404 or 410) is cached with
a shorter TTL, because a miss is not a hit. A 502 is `no-store`. The 200 has no
`immutable`: this URL carries no content hash.

Browser `max-age` is one hour; edge `s-maxage` is seven days. They differ
because a replaced icon should reach visitors without a hard refresh, while the
edge should not hammer the upstream on every stall view.

## Tests

From this directory. Root `pnpm test` does not run this suite.

```
node --experimental-strip-types --test src/index.test.ts
```

No network. The upstream and the Cache API are fakes.

## Deploy

```
npx wrangler deploy
```

Needs `icons.stall.cash` on the same Cloudflare account as stall.cash.

## What these tests do not prove

- Whether `caches.default` on a real colo honours `s-maxage`, stores a 404, or
  accepts a cache key whose origin is not the incoming Host.
- Whether `icons.etokens.cash/64/<id>.png` 3xxs (`redirect: 'error'` would then
  502 every icon). Measuring that is a network call.
- The real 4-second timeout against a hanging origin.
- Orange-cloud CDN behaviour in front of the Worker (HEAD rewrite, cache of a
  `no-store` 404).
- Byte sizes of real `/64/` icons. `MAX_ICON_BYTES` is 64 KiB by construction
  (4× a 64×64 RGBA bitmap), not by measuring etokens.
