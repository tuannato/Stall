# Deploying Stall

Host is **Cloudflare Pages**. `PLAN.md` records why, and `AGENTS.md` §7 records
the condition to leave. This file is the procedure.

---

## 0. Commit first — the commit *is* the deploy

Pages builds from a fresh clone of the repository, not from a working tree.
Anything uncommitted does not exist as far as the build is concerned, and
`public/_headers` and `public/_redirects` are the two files whose absence is
silent: the site comes up, looks fine, sends no CSP, and answers every
`/s/<seller>` with 404.

Check what a clean clone would actually contain before connecting anything:

```bash
git status --short
```

Untracked files listed there will not ship.

---

## 1. Project settings

The repo is already pinned for a reproducible build — `.nvmrc` holds the Node
version and `package.json` holds `packageManager`. Every dependency that is not
a dev tool is a committed tarball in `vendor/`, so the build does not resolve
those from a registry.

| Setting | Value |
|---|---|
| Build command | `pnpm build` |
| Output directory | `dist` |
| Node version | from `.nvmrc` — set `NODE_VERSION` if Pages ignores it |

`pnpm build` runs `tsc --noEmit` before `vite build`, so a type error fails the
deploy rather than shipping.

---

## 2. Domain

Point **stall.cash** at the Pages project, and redirect **www** to the apex.

The www redirect is not tidiness. Browser storage is scoped to an origin, so
`www.stall.cash` and `stall.cash` are two different stores. `_redirects` carries
a rule for it; confirm Cloudflare honours it for the custom domain, and add a
dashboard redirect rule if it does not.

---

## 3. The two checks no test in this repo can do

`pnpm test` proves the three copies of the policy agree with each other. It
cannot prove any server sends them. Run these against the live origin:

```bash
curl -sI https://stall.cash/ | grep -i '^content-security-policy'
```

```bash
curl -so /dev/null -w '%{http_code}\n' https://stall.cash/s/ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09
```

The first must print the policy. A `<meta>` tag would silently drop
`frame-ancestors`, which is why it has to arrive as a header.

The second must print **200**, not 404. A 404 fallback still renders the app for
a human, but crawlers and link unfurlers read the status, and a shared stall
link that unfurls as "gone" is the product failing at the only thing it does.

---

## 4. Worth checking once

```bash
curl -sI https://stall.cash/ | grep -i '^cache-control'
```

The document must be `no-store`. If it is cached, someone running a build with a
bug keeps running it, and a fix cannot reach them.

```bash
curl -sI https://stall.cash/assets/ | head -1
```

Assets are hashed, so they should be `immutable` — and a *missing* asset must be
404, never `index.html`. HTML served as JavaScript is a broken page that looks
like a mystery.

Also confirm the `.wasm` asset is served as `application/wasm`. Getting this
wrong is not fatal — the loader falls back to a slower non-streaming path and
warns in the console — but the fallback re-downloads 1.2 MB of reasoning about
why the page feels slow.

---

## 5. When to leave Pages

Written in `AGENTS.md` §7 so it is not re-argued. In short: a CDN terminates TLS
and can rewrite the document, and the buy control is a payload byte — a
rewritten origin retargets it without touching a key. That is accepted **only**
while this origin holds no key and asks no wallet to send.

Leave the day any of these is true: keys on this origin, any `cashtab-connect`
`send` verb wired, or any control this origin composes that moves money.

`nginx.conf` and `stall-headers.conf` in this directory are the spec for that
day. They are a specification, not evidence — no test here proves a server ever
loaded them.
