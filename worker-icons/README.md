# icons.stall.cash

A sibling of stall.cash, not a dependency. It proxies token icons from
`https://icons.etokens.cash` so the shop page never talks to that host. If this
Worker is unreachable the shop still paints: every row falls back to initials.

The shop already points here: `img-src` names this host in all three policy
copies and `iconUrl` builds this route. **The Worker itself has not been
deployed**, so the hostname does not resolve and every row is initials — the
designed fallback, not a fault. `cd worker-icons && npx wrangler deploy` is what
closes that gap; the `custom_domain` route below creates the DNS record.

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

## Deploy, step by step

The zone is already on Cloudflare — `stall.cash` answers from
`ray.ns.cloudflare.com` — which is what `custom_domain = true` needs. Nothing
below touches the apex: Pages keeps serving `stall.cash`, and this adds one
proxied hostname beside it.

**Rolling back needs no code change.** The app treats a missing icon as
initials, so deleting this Worker returns the shop to letters. Do not remove the
host from `img-src` to roll back — that only breaks the policy tests.

### 1. Sign in

```
npx wrangler login
```

Opens a browser. Pick the account that holds the `stall.cash` zone; picking
another one is how the custom domain fails at step 3 with a zone error rather
than a login error.

### 2. Build it without shipping it

```
cd worker-icons && npx wrangler deploy --dry-run
```

This bundles and typechecks without publishing. Read the reported size. A
failure here is a code problem and costs nothing; a failure at step 3 is a
half-configured hostname.

### 3. Ship it

```
npx wrangler deploy
```

You are already inside `worker-icons/` from the previous step.

The `[[routes]]` entry is a **bare hostname with `custom_domain = true`**, so
wrangler creates the DNS record itself — there is no separate DNS step. It also
rejects a wildcard or a path in that pattern, which is why the route is
`icons.stall.cash` and the path lives in the code.

### 4. Confirm the hostname exists

```
dig +short icons.stall.cash
```

Empty means the route did not take. Certificates are issued automatically and
can take a few minutes; until then expect TLS errors rather than 404s.

### 5. Confirm it answers only what it should

Each of these is a rule the Worker's own tests already pin. Running them against
the deployed edge is the part no test in this repo can do.

```
curl -s -o /dev/null -w '%{http_code}\n' https://icons.stall.cash/icon/64/0000000000000000000000000000000000000000000000000000000000000000.png
```

**Never `curl -I` against this Worker.** That sends `HEAD`, which the contract
refuses with 405, so every header check would report a routing failure that is
not there. Use `-D-` when you need the headers.

```
curl -so /dev/null -w '%{http_code}\n' https://icons.stall.cash/icon/512/0000000000000000000000000000000000000000000000000000000000000000.png
```

```
curl -so /dev/null -w '%{http_code}\n' https://icons.stall.cash/icon/64/not-hex.png
```

```
curl -sX POST -o /dev/null -w '%{http_code}\n' https://icons.stall.cash/icon/64/0000000000000000000000000000000000000000000000000000000000000000.png
```

The first is a real id and answers 200 or 404 depending on whether the upstream
has that icon. The second and third must be **404** — a size that is not 64 and
an id that is not 64 hex characters are refused before an upstream request is
built. The fourth must be **405**.

### 6. Confirm the response is cacheable but not immutable

```
curl -s -D- -o /dev/null https://icons.stall.cash/icon/64/<a real token id>.png | grep -i '^HTTP\|^cache-control\|^x-icon-reason'
```

Must **not** contain `immutable`, and `s-maxage` must read `604800`.

**`max-age` will not match the source.** The Worker sends `3600`; the edge
answered `14400`, because the zone's Browser Cache TTL rewrites it. Measured on
the first live request, not documented anywhere. The Worker's own tests assert
the constant it sends, which is the thing this repo controls; what a browser is
told is a zone setting. Check the shape and the absence of `immutable`, not the
number. This URL carries no content hash, so an immutable answer would
strand a bad icon in every visitor's browser — the same mistake
`unhashed-path-is-not-cacheable` exists for on the app.

### 6a. What the first live deploy actually did

`redirect: 'error'` on the subrequest made every real request answer 502 with
`threw:TypeError`, while the same URL answered 200 from a laptop. The suspicion
was that Cloudflare egress could not reach the upstream — the failure that keeps
a rate proxy from working next door. **That was wrong.** Switching to
`redirect: 'manual'`, which refuses a redirect just as firmly but hands back a
status instead of throwing, made it answer 200 immediately. The upstream is
reachable from the edge; the request configuration was not.

### 6b. If it answers 502, read the reason

`x-icon-reason` names the failure: `threw:<name>:<detail>` when the subrequest
could not be made, `upstream-redirect-<status>` when the upstream tried to send
us elsewhere, `upstream-<status>` for any other answer, `not-png` when a 200
carried something else, `too-big-or-truncated` past the byte cap.

`npx wrangler tail` will **not** show these. It reports a handled failure as
`Ok`, because the Worker catches and answers rather than crashing.

### 7. Confirm the shop actually uses it

Open a stall with a token whose icon the upstream carries. The row should paint
letters and then swap to the image. If it stays on letters, look at the browser
console for a CSP violation naming `img-src` before suspecting the Worker: the
policy allows exactly this host and nothing else.
