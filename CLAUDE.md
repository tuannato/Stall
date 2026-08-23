# CLAUDE.md — Stall

Technical manual. Process is `AGENTS.md` — **read that first.**

This file is current truth, not history. Overwrite it in place; never append a
ledger. **Cap: 300 lines.** If you need a line number, you are in the wrong
file — grep the symbol or open the test named here.

---

## 1. What Stall is

A per-seller storefront over eCash Agora, at `/s/<seller>`, which grows into a
minimal non-custodial wallet that can accept an offer, cancel one, and create a
listing. The buyer pays in **this origin's wallet**, not Cashtab.

Not a dashboard. Not a Cashtab clone. Not ecashlive.net.

---

## 2. Current stage

**Stage 1 — read-only stall. No keys exist in this repo yet.**

Legal this stage: reading offers, rendering a themed stall, resolving an address
to a pubkey, all display maths, painting the buy sheet (encoded price, cheaper
offers). Completing a purchase is stages 2–4 in this origin's wallet.

Forbidden this stage even though it is easy: generating or importing a
mnemonic, signing anything, writing to `localStorage`, adding a logger, adding a
CDN, adding an image host, handing the buyer to Cashtab.

Stage order, each independently useful:
`1 stall → 2 keys + receive + watch → 3 XEC send → 4 accept an outpoint →
5 cancel own offer → 6 create listing`

Do not start at 6. Do not skip 3 — an accept is a send plus a covenant, and if
send is wrong, accept will be wrong more creatively. The seller still lists,
mints, and signs in Cashtab until stage 6.

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
- **Overlay.** Idle, or the buy sheet. The sheet stays on this origin; the
  wallet that will sign is Stall's, not Cashtab.

Token names, tickers and icons come from genesis and cannot go stale — session
memory of those is honest. Stage 1 does not write `localStorage`. **First-load
unreachable has only the route:** no stall name, no item names. A later visit
may show cached names with dashed prices and a dead buy control.

**Endpoints.** Only chronik nodes running `agora.py`. At time of writing the
three `chronik-native*.fabien.cash` hosts have it; `chronik.e.cash` and
`a node that also serves something else` return `404: Plugin "agora" not loaded`. Use
constructor order, not closest-first. **Do not add a node that lacks the plugin**
— the failover proxy does not skip a protocol-level 404, so it breaks the app
rather than slowing it.

Show the asked amount as the covenant encodes it. `askedSats()` for oneshot,
`askedSats(atoms)` for partial. Never divide with `Number()` on satoshis or
atoms.

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

1. **URL hint.** `?m=<txid>` fetches the record directly, O(1). Treat it as a
   cache, not an authority: paint from it, then confirm in the background and
   repaint if a newer record exists. Optional, so a printed link without it
   still works.
2. **Pick the smaller index.** `address(seller).history()` holds everything at
   that address; `lokadId(STL1).history()` holds only stall settings, across all
   sellers. Both return `numTxs` without walking. Ask both, walk the shorter.
3. **Re-publish when it sinks.** Costs a fraction of a cent and keeps path 1
   fast.

Known ceiling: at tens of thousands of stalls *and* a busy seller, both walks
get long. That is when this needs a chronik plugin indexing `STL1` by address.
Not a surprise — a known limit.

Winner among records: highest block, then position in block, then txid. Deterministic
or two browsers render two different stalls from one link.

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

**Why each field is a number and not a string:**

- A CSS colour *string* is a language — `url()`, `var()`, `color-mix()`, and an
  eight-digit hex that paints an invisible layer over the price. Store `r,g,b`
  in 0–255 and build the string in our code.
- A font *family name* can reach a remote face. The byte is an index into
  shipped stacks. Amounts use that stack. No remote faces.
- A layout *template* is a language. The byte is a bounds-checked index mapped
  through a table to a class name.

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

A token can be spent as a fee, locked in an Agora covenant, or moved to another
wallet — each of which would silently switch a paid theme off. A transaction
cannot move. The licence is permanent, non-transferable, and bound to the
address, which is also the stall.

The purchase pays every party in one transaction; BIP21 supports multiple
outputs. **The reader verifies every required output.** A licence missing the
designer's share is not a licence — that is how a revenue split is enforced
without custody, a covenant, or trust.

Tell the buyer plainly, on the purchase screen: the licence is bound to this
address, and losing the key loses the stall and everything bought for it.

---

## 8. Money mechanism (before the functions exist)

- **Derivation path is a product decision.** It must match the incumbent wallet
  exactly — BIP44 coin type **1899**, same account and change indices — or users
  have no rescue path. Do not invent a path "for now". Test:
  `derivation-matches-incumbent`.
- **Entropy:** CSPRNG only, collected on an explicit gesture. Never on page load.
- **Backup is two confirms, not a re-entry.** Show the words once; press-and-hold
  to read. First confirm: they wrote them down. Second confirm: they say it
  again, and the screen states that Stall is not responsible if the words are
  lost or forgotten. No skip, no "Later", no typing the words back.
- **Do not persist until the second confirm.** Closing the tab discards the new
  wallet. After persist, never show the words again. **Receive is blocked until
  then** — no address, no QR, no watch. Static hosting has no reset.
- **Change always to self.** An Agora accept pays the seller a fixed output;
  change is ours. Test: `change-pays-self`.
- **Fuel is sats-only UTXOs.** Spend a token UTXO as a fee and you burn
  inventory — including the licence that lights the stall.
- **Re-fetch the offer UTXO immediately before signing.** Between paint and
  broadcast the covenant may be taken. "Offer gone" is someone else's success,
  not a reason to retry.
- **Never re-sign after a failed broadcast** until chronik confirms the previous
  txid is absent. Re-query, do not nonce-bump.
- **Each accept needs a fresh random covenant keypair.** `take()` and
  `acceptTx()` require `covenantSk`/`covenantPk` and the library does **not**
  generate them. Reuse or zeros is a silent footgun.
- **Show the encoded number, not the typed one.** The listing helpers adjust
  inputs to fit Script, so the form value and the on-chain value differ.
  Publishing the typed value is a lie. Test: `published-price-is-encoded`.
- **Chronik is a trusted indexer.** A lying node can hide UTXOs or show a dead
  offer. Display the raw offer parameters before signing.
- **XSS here is key exfiltration, not a bad ticker.** Chain-derived strings never
  reach `innerHTML`.

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
Add `ecash-wallet` at stage 2, not before.

**Directory walls:** `src/domain/` is pure — no network, no DOM. `src/net/`
never touches `document`. `src/ui/` never imports chronik. `src/keys/` stays
empty until stage 2, and is **not** gitignored — secrets live in the user's
browser, not in `src/`, and hiding the directory would hide the source.

---

## 10. Live footguns

Only traps that are currently true and have no test yet. When a test exists,
the entry leaves.

- **Chronik lokad history is newest-first**, so a new record pushes read ranks
  down. A cached walk goes stale silently while still claiming coverage.

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
