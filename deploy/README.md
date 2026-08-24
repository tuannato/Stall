# Deploying Stall

Host is **Cloudflare Pages**. `PLAN.md` records why, and `AGENTS.md` §7 records
the condition to leave. This is the procedure, from a domain with nothing on it
to a stall link that works.

Cloudflare's dashboard wording changes. Where a step depends on a label, the
thing to look for is described rather than quoted, and every step that can be
verified from a terminal has the command to verify it.

---

## 0. Decide two things first, because both are hard to undo

**Is the GitHub repo public or private?** Everything tracked goes with it.
`internal/` and `private/` are deliberately untracked, so the design specimens
and the working notes stay off GitHub either way — but check `git status` before
the first push rather than trusting that sentence.

**Which identity do you want in the history?** Check what the commits carry
with `git log --format='%an <%ae>'`. A real mailbox in a public repo is
permanent and scrapeable, and the three commits here do not all use the same
one. GitHub gives you a `@users.noreply.github.com` address for this. If you
want it, change it **now** — after the push, fixing it means rewriting
history:

```bash
git config user.email "<id>+<user>@users.noreply.github.com"
```

```bash
git rebase -r --root --exec 'git commit --amend --no-edit --reset-author'
```

---

## 1. Push to GitHub

There is no remote yet. Create an empty repo on GitHub — no README, no
`.gitignore`, no licence, or the first push conflicts — then:

```bash
git remote add origin git@github.com:<user>/stall.git
```

```bash
git push -u origin cashtab-handoff
```

Merge into `main` when you are ready for it to be the deployed branch. Pages
builds one branch as production and gives every other branch a preview URL, so
you can point Pages at `cashtab-handoff` first and merge later.

---

## 2. Create the Pages project

Cloudflare dashboard → **Workers & Pages** → create → **Pages** → connect to
Git, and pick the repo.

Build configuration:

| Field | Value |
|---|---|
| Framework preset | None |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | *(leave empty)* |

Then add environment variables **for both Production and Preview**:

| Variable | Value | Why |
|---|---|---|
| `NODE_VERSION` | `22.22.0` | Matches `.nvmrc`. Do not rely on Pages reading that file. |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | `package.json` pins `packageManager: pnpm@10.24.0`; without corepack Pages uses its own pnpm and the pin is decoration. |

`pnpm build` runs `tsc --noEmit` before `vite build`, so a type error fails the
deploy instead of shipping. That is deliberate — leave it.

**Expect the first build to be the one that fails.** Read its log rather than
guessing: the two things that go wrong here are the Node version and the package
manager, and both say so plainly in the log.

---

## 3. Check the preview before touching the domain

Pages gives the project a `*.pages.dev` URL. Everything that matters can be
verified there, with no DNS involved and nothing at stake:

```bash
curl -sI https://<project>.pages.dev/ | grep -i '^content-security-policy'
```

```bash
curl -so /dev/null -w '%{http_code}\n' https://<project>.pages.dev/s/ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09
```

The first must print the policy — `_headers` is being applied. The second must
print **200** — `_redirects` is being applied. The address there is a fixture
nobody owns; the check is the status code, not what the stall contains. If either is wrong, fix it here,
where the only URL that exists is one nobody has.

Also confirm Pages is consuming those two files rather than serving them:

```bash
curl -so /dev/null -w '%{http_code}\n' https://<project>.pages.dev/_headers
```

That should **not** be 200.

Then open the preview and click a stall. `/s/<seller>` should paint offers, and
the sheet's button should open Cashtab's token page.

---

## 4. Attach stall.cash

The domain is already in your Cloudflare account, so this is one step rather
than a DNS exercise: in the Pages project → **Custom domains** → add
`stall.cash`. Cloudflare creates the record itself, and the apex works because
of CNAME flattening — you do not need an A record or an IP.

Add `www.stall.cash` as a custom domain too. Then make it redirect rather than
serve: **Rules → Redirect Rules** on the `stall.cash` zone, matching hostname
`www.stall.cash`, redirecting to `https://stall.cash/${uri.path}`, 301.

The `_redirects` file has a www rule as well, but a Redirect Rule is the one
that reliably fires for a hostname on Cloudflare. Belt and braces is fine here;
what is not fine is neither of them firing.

**This is not cosmetic.** `PLAN.md` and `CLAUDE.md` both turn on there being
exactly one origin. Two hostnames that both serve the app are two separate
browser storage scopes, and the whole reason the domain had to be settled early
is that nothing migrates between them.

Certificates are issued automatically. It can take a few minutes, and until it
does you will see TLS errors rather than a broken site.

---

## 5. Verify on the real origin

Nothing in this repository can prove any of this. `pnpm test` proves the three
copies of the policy agree with each other; it cannot prove a server sends them.

```bash
curl -sI https://stall.cash/ | grep -i '^content-security-policy'
```

```bash
curl -so /dev/null -w '%{http_code}\n' https://stall.cash/s/ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09
```

The header must arrive on the document — a `<meta>` tag silently drops
`frame-ancestors`, which is why it has to be a header. The stall path must
answer **200**, not 404: a 404 fallback still renders for a human, but crawlers
and link unfurlers read the status, and a shared stall link that unfurls as
"gone" is the product failing at its only job.

```bash
curl -sI https://stall.cash/ | grep -i '^cache-control'
```

Must be `no-store`. If the document is cached, someone running a build with a
bug keeps running it and a fix cannot reach them.

```bash
curl -sI https://www.stall.cash/ | grep -i '^location'
```

Must redirect to the apex.

---

## 6. After it is live

Nothing about the buy path can be tested from a terminal. Open a stall on a
phone, tap an item, and follow the link out: it must land on Cashtab's token
page for that token with **no** action parameter. Cashtab preselects the
cheapest offer and never names the maker, so the sheet says so — check the
wording is on screen, because that disclosure is the reason the link is shaped
this way.

If you later add your own chronik node, `deploy/chronik-agora.md` is the
procedure, and `src/net/hosts.ts` is the only place the list lives.

---

## When to leave Pages

`AGENTS.md` §7 holds the condition, so it is not re-argued here. In short: a CDN
terminates TLS and can rewrite the document, and the buy control is a payload
byte — a rewritten origin retargets it without touching a key. That is accepted
**only** while this origin holds no key and asks no wallet to send.

Leave the day any of these is true: keys on this origin, any `cashtab-connect`
`send` verb wired, or any control this origin composes that moves money.

`nginx.conf` and `stall-headers.conf` here are the spec for that day. They are a
specification, not evidence — no test proves a server ever loaded them.
