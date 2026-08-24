# CLAUDE.md — Stall

Technical manual. Process is `AGENTS.md` — **read that first.**

This file is current truth, not history. Overwrite it in place; never append a
ledger. **Cap: 300 lines.** If you need a line number, you are in the wrong
file — grep the symbol or open the test named here.

---

## 1. What Stall is

A per-seller storefront over eCash Agora, at `/s/<seller>`. Stall **reads the
chain and holds no key.** A buyer who wants to complete a purchase is handed to
Cashtab, which signs.

The wallet that would have made Stall self-contained is shelved indefinitely
(kept in `internal/`, outside this repo). What replaces it is a link, and a link cannot
be aimed: Cashtab's token page preselects the cheapest offer and never labels
which maker a row belongs to. **So Stall promises a shop window, not a
checkout,** and every control has to be named for what it does.

Not a dashboard. Not a Cashtab clone. Not ecashlive.net.

---

## 2. Current stage

**Read-only stall. No keys, here or coming.**

Legal: reading offers, rendering a themed stall, resolving an address to a
pubkey, all display maths, painting the sheet that discloses the handoff, and
linking out to Cashtab's token page.

Forbidden even though it is easy: generating or importing a mnemonic, signing
anything, writing to `localStorage`, adding a logger, adding an image host,
wiring any `cashtab-connect` `send` verb, and `action=BUY` on a Cashtab link.
The last looks like the feature and is the trap: that deep link takes the
cheapest affordable offer and never names the maker, so on a per-seller stall
it can quietly sell a competitor's tokens. Link to the token page with no
action, where every offer is listed and the buyer picks a row.

Stall cannot tell a purchase happened and must not claim it can.

---

## 3. Identity and routing

**Canonical identity is the seller's compressed pubkey hex** (66 chars, `02`/`03`),
because that is what the Agora plugin indexes: offers are grouped under
`P + maker_pk`.

But a seller cannot read their pubkey out of Cashtab — it is displayed nowhere.
So the route **accepts either** and canonicalises to pubkey:

- `/s/<66 hex>` → use directly
- `/s/<ecash address>` → recover the pubkey from the address's history: any
  ordinary P2PKH spend reveals it in the input script. Verify by hashing back to
  the same address. An address that has never spent cannot be resolved — say so,
  do not guess.

A seller who has listed on Agora has always spent, so anyone with a stall is
resolvable.

**Offer identity is an outpoint, not a seller.** A partial fill re-creates the
remainder as a *new* UTXO. A seller-pinned link survives that; an outpoint-pinned
link does not. Links are seller-pinned; the outpoint is the handle used at
accept time.

---

## 4. Reading a stall

Order at load:

1. Parse the route; recover the pubkey if given an address.
2. `agora.activeOffersByPubKey(pubkeyHex)` — one call, the whole shop.
3. `chronik.token(tokenId)` per distinct token, deduped, for name and decimals.
4. The manifest (§5).

**Three layers, not one enum.** Mixing them is how empty and unreachable collapse.

- **Route.** Valid pubkey → use it. Valid address that has spent → recover the
  key and hash it back. Valid address that has never spent → unresolvable; say
  so, do not guess. Invalid input → the route is unreadable, not an empty shop.
- **Fetch** (only once a pubkey exists). Offers → paint. Empty → the seller has
  nothing listed; identity and theme stay. Unreachable → no index answered.
  Plugin-missing → the node answered without `agora`. The last two are **our**
  failure, never an empty shop. Test: `plugin-missing-is-not-empty`.
- **Overlay.** Idle, or the sheet. The sheet no longer precedes a signature on
  this origin, so it is disclosure, not checkout: the encoded amounts, that
  Cashtab preselects the cheapest offer and may pick another seller, and the
  price to look for so this seller's row can be found. No network fee row —
  this origin builds nothing and has no fee to quote. Test:
  `handoff-does-not-claim-this-maker-is-selected`.

Token names, tickers and icons come from genesis and cannot go stale — session
memory of those is honest. Stage 1 does not write `localStorage`. **First-load
unreachable has only the route:** no stall name, no item names. A later visit
may show cached names with dashed prices and a dead buy control.

**Endpoints.** Only chronik nodes running `agora.py`. At time of writing the
three `chronik-native*.fabien.cash` hosts have it; most public nodes, including
`chronik.e.cash`, return `404: Plugin "agora" not loaded`. Use constructor
order, not closest-first. **Do not add a node that lacks the plugin** — the
failover proxy does not skip a protocol-level 404, so it breaks the app rather
than slowing it.

---

## 5. The stall manifest (LOKAD `STL1`)

One transaction carries everything: theme, stall name, attachment flags. Never
several — a multi-tx document has no way to know it has been read completely.

**Authorship is the input script.** The manifest is authoritative only when the
transaction was signed by the stall address. Read it from that address's
history, or verify the input when you find it any other way. A global lokad walk
that skips this lets anyone publish a manifest *for* a seller.

**Finding it cheaply** — a busy seller has thousands of transactions and the
manifest may be old. Three paths, in order:

1. **URL hint.** `?m=<txid>` is a candidate, never an authority — `loadManifest`
   verifies its authorship and then still walks, so the winner is the same with
   or without it. **It is not currently O(1)**: the hint is awaited alongside
   the walk, so it buys no speed. Paint-then-confirm was designed and not
   built. Optional, so a printed link without it still works.
2. **Pick the smaller index.** `address(seller).history()` holds everything at
   that address; `lokadId(STL1).history()` holds only stall settings, across all
   sellers. Both return `numTxs` without walking. Ask both, walk the shorter.
3. **Re-publish when it sinks.** Costs a fraction of a cent and keeps path 1
   fast.

Known ceiling: at tens of thousands of stalls *and* a busy seller, both walks
get long. That is when this needs a chronik plugin indexing `STL1` by address.
Not a surprise — a known limit.

Winner among records: **highest block, then txid**, and **an unconfirmed record
never wins**. Chronik exposes no index-within-block, so position is not a term.
Two nodes hold two different mempools, so an unconfirmed winner is exactly how
one link renders two stalls — the cost is that a new manifest is invisible until
mined. Tests: `prefers-higher-block-then-txid`,
`unconfirmed-manifest-is-not-a-winner`.

**Every history walk is capped** at `MAX_HISTORY_PAGES`, and a truncated walk
says so rather than answering. A capped address walk returns `unresolved`, never
`unresolvable` — "this address has never sent" is a claim about the seller, and
we would be guessing. A capped manifest walk paints the shipped default *and*
says the lookup stopped early, because a default theme otherwise reads as a
choice. Tests: `truncated-history-is-not-never-spent`,
`truncated-manifest-is-not-silent-default`.

---

## 6. Themes are data, never code

A theme is **28 bytes**. Stall selects among values it already ships; it never
interprets a string.

```
0–17   6 × RGB   bg · surface · text · muted · accent · danger
18–20  RGB       accent two
21     u8        font index
22     u8        softness
23     u8        layout index
24     u8        ornament index
25     u8        stamp index
26–27  u16       attachment flags, meaning is per theme
```

**Every field is a number because every string here is a language.** A colour
string reaches `url()` and `color-mix()`; a font family name reaches a remote
face; a layout template is a program. Store `r,g,b` in 0–255, index into
shipped font stacks and a bounds-checked layout table, and build the CSS in our
own code.

**The price, the address, and the buy control live in the themed stall** and
take its colours and font. **A theme may not set** `position`, `z-index`,
`transform`, `opacity`, `filter`, or `pointer-events` — that is how a layout
covers the asked amount. Test: `asked-amount-not-covered`.

**The theme module must contain no `innerHTML`, no `insertAdjacentHTML`, no
`cssText`, and no `url(`.** Freeze that now, while there are no keys. "Just add
a banner image" later is how the seed leaves.

Unknown index → shipped default. Never throw; a bad byte must not brick a stall.

---

## 7. Licences are transactions, not tokens

A theme or attachment is unlocked by **a transaction in the stall address's
history**, not by holding a token.

A token can be spent as a fee, locked in a covenant, or moved — each silently
switching a paid theme off. A transaction cannot move, so the licence is
permanent, non-transferable, and bound to the address that is the stall.

One transaction pays every party, via BIP21 multi-output. **The reader verifies
every required output**; a licence missing the designer's share is not a
licence. That is the revenue split, enforced without custody, covenant or
trust. Say on the purchase screen that losing the key loses the stall and
everything bought for it.

---

## 8. Money, and what is shelved

The wallet is in reserve. This origin holds no key, signs nothing, and asks no
wallet to send. A buyer is handed to Cashtab, which signs.

Two rules survive the shelving because they govern what is on screen now:

- **Show the number the covenant encodes, not one we computed.** `askedSats()`
  for oneshot, `askedSats(atoms)` for partial. Never divide with `Number()` on
  satoshis or atoms. A list row must say what quantity its price buys. Test:
  `list-price-says-what-it-buys`.
- **Chronik is a trusted indexer.** A lying node can hide UTXOs or show a dead
  offer. Chain-derived strings never reach `innerHTML`.

The rest — derivation, entropy, the backup ceremony, change to self, fuel
UTXOs, re-fetch before signing, never re-sign after a failed broadcast, a fresh
covenant keypair per accept — is shelved with the wallet and kept verbatim in
`internal/`, which is outside this repository and needs its own backup. Do
not re-derive those from memory if keys return.

---

## 9. Stack

Vite + TypeScript, plain DOM, no framework. Static SPA with a history fallback
for `/s/*`.

The wasm rides as base64 inside `ecash-lib`'s bundle and initialises at import —
there is no separate `.wasm` file and no bundler plugin needed. The cost is that
`script-src` requires **`'wasm-unsafe-eval'`**. That is a deliberate, unavoidable
relaxation, not an oversight.

**CSP is an HTTP response header, not a `<meta>` tag** — `<meta>` silently
ignores `frame-ancestors`.

Direct dependencies: `chronik-client`, `ecash-agora`, `ecash-lib`, `ecashaddrjs`.
`ecash-wallet` is vendored but unused, and `walls.test.ts` fails on importing it.

**The origin is a product decision, not a deploy detail.**

Stage 2 creates wallets in browser storage scoped to this origin. Whatever
origin serves stage 1 is where the first wallets come into existence, and
nothing migrates them. **The domain must be final before the first wallet is
created.** Changing hosting provider under the same domain is safe; changing the
domain is not.

Only one of the two requirements below was ever about a seed. The origin must
**send response headers** (a `<meta>` CSP silently drops `frame-ancestors`) and
**serve `/s/*` as `index.html` with HTTP 200** (a 404 fallback is a shop that
crawlers and unfurlers read as gone). The second matters *more* without a
wallet, because the shared link is then the whole product. GitHub Pages does
neither, and hash routing does not rescue it — a fragment never reaches the
server. The requirement is the test, not a vendor.

Host is **Cloudflare Pages** (`public/_headers`, `public/_redirects`);
`deploy/nginx.conf` is the spec for leaving. `AGENTS.md` §7 holds the condition:
it turns on who can rewrite the document, and the buy control is a payload byte
even with no seed in reach.

**Directory walls:** `src/domain/` is pure — no network, no DOM. `src/net/`
never touches `document`. `src/ui/` never imports chronik. `src/keys/` stays
empty, and is **not** gitignored — hiding the directory would hide the source
if a key ever lands there.

---

## 10. Live footguns

Only traps that are currently true and have no test yet. When a test exists,
the entry leaves.

- **Cashtab hides offers Stall can paint.** `prepareBuyableOffers` shows FIRMA
  only from the official minter and XECX only at 1:1. Those are that wallet's
  policy, not chain facts, and they change without us — so a stall can list an
  offer that is missing from the page its own link opens. Not copied here on
  purpose; the sheet already says Cashtab's book is not this stall.
- **`?m=` is not O(1).** The hint is awaited alongside the walk, so it buys no
  speed. Paint-then-confirm was designed and not built.

---

## 11. Verify

```
pnpm test
```

That is `vitest run` with the default reporter. **No pipe.** Green means the
Vitest process exit code is 0 **and** the summary line is in view (`Test Files`
N passed). Named Stage 1 tests include `plugin-missing-is-not-empty`,
`asked-amount-not-covered`, `wasm-boots`, `directory-walls`.

Do not import a verify ritual from eCash-Live. See `AGENTS.md` §4.
