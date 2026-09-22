# PLAN.md — Stall

The roadmap and the open questions. `CLAUDE.md` says what the code *is*;
`AGENTS.md` says how we work; this file says what is *next* and what has
already been settled so it is not re-argued. Those two manuals are working
documents kept outside this repository; this file is the public one, tracked
since 2026-09-07.

Overwrite in place as stages complete. History is `git log`.

---

## Where things stand

**Live at stall.cash since 2026-08-24**, on Cloudflare Pages. Verified on the
real origin, not inferred: the CSP arrives as a response header, `/s/<seller>`
answers 200, a missing hashed asset answers 404, the document is `no-store`
while hashed assets are `immutable`, and `www` and `http` both land on the
apex keeping path and query.

**What ships today.**
- The read-only stall: a seller's live Agora listings under one link, three
  looks, a name, a tagline, an announcement and decoration flags from one
  on-chain settings record (`STL1`) the seller signs in their own wallet.
- The direct-payment rail: a seller's own quote for an item they deliver
  themselves, written on a token they minted (`STLD`), paid by a buyer's own
  wallet straight to the seller's address with a memo naming the item
  (`STLP`). No escrow, no token changes hands, and the page never claims a
  delivery it cannot see.
- A stream overlay for OBS, posters and share images, two static guides
  (`/guide`, `/stream`), a public activity feed of what the page saw arrive,
  a per-stall social card composed at the edge, and a token-icon proxy.
- A whole-product evaluation (2026-09-06, five critics, two meta-critics)
  the first fix round after it and the owner's D round, both 2026-09-07.
  What is still open is under **Open** below.

**The pivot, in one line:** Stall stopped trying to become the wallet and
became a shop window that links out. What that costs is recorded honestly
below — the Agora buy link cannot be aimed at the seller whose stall you are
standing in.

**The wallet is shelved indefinitely.** Its mechanism and its key ceremony
are kept, verbatim, outside this repository, so that if keys ever return they
are not redesigned from memory. The design specimens (themes, the three-layer
stall UI, the key ceremony, seller setup) are kept there too; each carries its
own reasoning beside the screens, and several decisions are not recoverable
from a picture alone.

Settled and not to be redone:

- **The theme is an id, not a blob.** Decided by the owner 2026-08-26. The
  chain supplies a one-byte row into a table Stall ships; colours, fonts and
  layout never travel on chain.
- **Attachments (decorations) are tokens**, identified by the token's own
  genesis id and held by the stall address; **wearing one is opt-in in the
  settings record** (owner, 2026-08-26). Anyone can send a token to any
  address, so holding cannot be consent; a flag set over a token the address
  does not hold paints nothing.
- Stall UI is three layers — route, fetch, overlay — and empty must never look
  like unreachable (`CLAUDE.md` §4).
- Price, address and the buy control live **in** the themed stall; a theme
  may not cover or move them (`CLAUDE.md` §6).
- The seller lists, mints and signs in Cashtab, and so does the buyer.
- Seller setup is a guide that reads the chain rather than remembering flags;
  the first-stall checklist is that guide's first screen.
- Licences as transactions rather than tokens (`CLAUDE.md` §7).
- The manifest lookup strategy and its cost ceiling (`CLAUDE.md` §5).
- Stack, directory walls, the CSP consequence of wasm (`CLAUDE.md` §9).

---

## Environment

Stall depends on packages from a Bitcoin ABC checkout. That checkout is
**not** part of this repo and Stall must never import from it by path; it
lives beside the repo on the build machine and is read as reference.

Versions in use: `chronik-client` 4.3.1, `ecash-lib` 4.13.0, `ecash-agora`
4.2.5, `ecash-wallet` 6.1.0, `ecashaddrjs` 2.0.0, plus `b58-ts`. Node
**22.22.0** (ABC's CI pin) and pnpm **10.24.0** via corepack.

Getting there from nothing, in order — every step needs the network:

1. Node and pnpm as pinned in `.nvmrc` and `package.json`.
2. `pnpm install --frozen-lockfile` at the ABC workspace root (links, does not
   build).
3. **Build the wasm first.** `modules/ecash-lib-wasm/dockerbuild.sh` needs
   Docker; without it `ecash-lib` cannot compile and every dependent module
   fails after it.
4. Build the workspace modules in `cashtab/install-deps.sh` order.

**How Stall consumes them:** `pnpm pack` each needed module into
`vendor/*.tgz` and depend on the tarballs, pinned. Not a `file:` path into
the other repo — that couples Stall's build to a tree it does not own.

---

## Build order

**Shipped.** `/s/<seller>`; live offers over one socket; the three looks;
the settings record and its editor; the descriptions record with words, a
shelf, a quote and a tolerance; the pay sheet with a press-time rate valve;
the `?pay=` landing link; the Shop as two rails (Listings | Quotes) with
honest counts; the item face; the first-stall checklist; the stream overlay
with a quote-card switch; posters in four formats; `/guide` and `/stream`;
the Activity panel on two clocks with three finality states; the withheld
token backstop; the per-stall unfurl; the icon Worker; a layout probe that
measures every screen in headless Chrome; CI on push.

**Next — measure before building.** The evaluation of 2026-09-06 found the
product complete at craft and unmeasured at use. Before any new surface:
read the three record counts on chain (`STL1`, `STLD`, `STLP` — 9 / 13 / 3 on
2026-09-14, 9 / 11 / 2 on 2026-09-08, 8 / 2 / 0 on 2026-09-04) and the distinct signers among them; read the CDN's own
request counts for the unfurl function and the icon Worker. Then the owner's
decisions under **Open**
(the honesty one-liners the evaluation left open landed on 2026-09-07).

**Recommended, not yet decided:** no new LOKAD and no new tag for 90 days —
every tag is permanent, and one has already been burned after a day — and
no new visual round until the measurements exist.

**Shelved indefinitely — the wallet.** Keys, receive, watch, XEC send, accept
an outpoint, cancel, create a listing. The un-shelve forces the hosting
condition below, and forces the origin to be final first — browser storage
is scoped to it and nothing migrates.

**Not in scope, and each for a reason that is written down.**
- A whole-market Agora feed — **not** for want of an API (`allOfferedTokenIds()`
  plus `activeOffersByTokenId()` per token is how Cashtab reads the book) but
  for the shape of it: an untrimmed groups page, one UTXO fetch per token and
  one more for each name, every load, across three hostnames belonging to one
  operator; on an apex feed half a book reads as a small market — our failure
  painted as a fact about the market. A cost judgement, not a law: a second
  operator or a plugin answering the whole book in one call would change it.
- Watching for "purchase completed" (unknowable).
- Wiring `cashtab-connect` send verbs (money composed by a document a CDN
  serves).
- The `makerPk` deep-link patch upstream — **on hold** (owner, 2026-09-03):
  for issuer-sold tokens the token is a price tag on an off-chain contract
  and the direct-pay rail prices it, so there is no Agora row to undercut.
  It stays a possible RFC for token-as-commodity stalls; not filed.

Theme sales and attachments are not next either. They were always after a
working accept, and there is no accept.

---

## Decided — do not re-argue

- **The ticker preset carries the quotes rail, and rule 5 of § D is amended
  for it (owner, 2026-09-21, "theo toàn bộ đề xuất").** On the stream's
  one-line ticker (`preset=ticker`, design `private/design/ticker-2026-09-21/`)
  a quote item carries the "Seller's quote" chip beside its own figure, the
  fixed label plate at the ribbon's exit carries "Pays the seller · no
  escrow" for the whole quotes pass, and the code at the bar's end is the
  SHOP's landing link ("Scan to browse this shop on your phone"), never one
  item's — a moving line cannot carry a code per item, and a code that
  moved would not scan. Rule 5's three purposes each keep a home; what the
  ticker cannot do (open one item) it does not claim. `cards=all` takes
  turns per pass — one rail per pass, the turn at the wrap, never a merged
  ribbon — on the ticker and the corner card alike, and never on the side
  rail, which mounts no card. Item order on the ribbon is name · figure;
  the 2–3 s in which a figure outlives its name at the exit edge is
  accepted and stated. The QR is a 204px plate at the bar's end, side and
  edge the streamer's (`side=left|right`, `edge=bottom|top`); a bar-height
  code (1.4–1.8 px/module) was measured unscannable and is not offered.
- **"Pay several" on a touch-screen shop window — BUILT 2026-09-22.**
  `touch=on` on the window's Browse mode, the quotes rail only; the wall
  gains exactly five controls — plus and minus on each quote, Clear all,
  Pay, Back — and nothing else, so § 4's "no controls, ever" becomes "no
  controls unless `touch=on`, and then only these". The owner's rulings:
  Clear all is ONE press with no question, and so is "−" at one; the
  selection is NEVER cleared on idle — it stands until someone presses
  Clear all (an abandoned choice stays on the wall; under `show=all` it pins
  the screen to the quotes side); Pay is a press, and the press is where
  the rate is asked in the seller's own unit; the plate is a snapshot taken
  at that press and any change closes it; after two minutes the plate
  closes and the shop's code returns, the strip keeping the selection;
  the rail turn is held while something is chosen. Build order: after the
  ticker port and BEFORE the multi-item memo (step 5) — the wall's only
  road is its code, and ~100 bytes of memo pushes a 360px code below every
  density this project has read; when the memo lands the wall gets its own
  cap. This is a new surface built on the owner's direct ask, over PLAN's
  "measure before building" gate, and says so. Design
  `private/design/touch-2026-09-21/`.
- **Three LOKADs, never a fourth (owner, 2026-09-21).** `STL1`, `STLD` and
  `STLP` are the whole registry. A new kind of record is a new **shape**
  under one of them (the multi-item memo is a second shape of `STLP`, told
  apart by a push an old reader refuses). Why they were three and stay three:
  the payment memo's index is written by strangers and grows with every sale,
  so it must never dilute the seller's own records — "walk the smaller index"
  depends on it; the two record LOKADs are permanent now that records exist
  on chain (9 / 13 / 3 on 2026-09-04); and each has its own tag registry,
  which cannot be renumbered.
- **Tokens this page does not carry (2026-09-05).** A stall never paints a
  listing or a quote in FIRMA, fCHF, fEUR or XECX, nor in any token on eCash's
  impersonation blacklist, nor in one whose genesis name or ticker is a string
  Cashtab refuses to mint — a backstop for a wallet built to skip that check.
  This puts Stall in the name-adjudication seat it declined for stall names;
  accepted, for tokens only, because the list is Cashtab's own and hiding an
  honest `firma` is the safe direction. Detail in `CLAUDE.md` §4.
- **Own domain, host settled: Cloudflare Pages**, serving `stall.cash` with
  `www` and `http` redirecting to the apex; `public/_headers` and
  `public/_redirects` are in source. Whoever can rewrite the code can rewrite
  the payee address in it, on any host; moving host changes who holds that
  power, not whether it exists. What a host must do is send response headers
  and serve `/s/*` at HTTP 200; `deploy/nginx.conf` is the spec for a host
  that does both, should Pages ever stop. A retarget stays visible to the
  payer in their wallet, unlike a silent seed exfiltration — that distinction
  is the one that was always load-bearing.
- **Buyers complete the purchase in Cashtab.** Stall paints the sheet as
  disclosure and links out to Cashtab's token page.
- **The link is `#/token/<tokenId>` with no `action`.** Never `action=BUY`:
  Cashtab's deep-link confirm screen selects the cheapest affordable offer and
  never names the maker, so on a per-seller stall it can sell a competitor's
  tokens. With no action the buyer lands on the order book, where every offer
  is listed and a row can be picked. Verified in Cashtab's own source
  (`DeepLinkBuy`, `OrderBook`).
- **Stall does not claim a purchase happened.** It cannot know. Cashtab
  closes its own tab after a successful buy; that is its behaviour, not a
  signal to us.
- **XEC only.** Agora prices in satoshis; there is no token-denominated path.
- **Stall never mints, never lists, never signs, and never holds a key.**
- **Themes ship in the app.** The owner is the editor; third-party designers
  make contact and get added; there is no permissionless theme upload,
  because loading third-party assets into an origin that composes payments is
  an XSS path.
- **Licences are transactions, not tokens** (`CLAUDE.md` §7).
- **Revenue split is enforced by the reader**, through required BIP21
  outputs — not by a covenant, and not by an NFT. `AgoraPartial` pays exactly
  one address; only `AgoraOneshot` carries multiple enforced outputs, and the
  NFT path is far less exercised.
- **No file inherited from eCash-Live** (`AGENTS.md` §6).
- **Fiat conversion is in — one currency on screen.** Fetching a rate is in;
  the privacy objection is dead because the origin is served by a CDN that
  already sees every visitor. The picker is gone and the glance is USD for
  everybody, decided when the seller's own price landed on chain: the
  converted figure beside a covenant and a figure the seller wrote are two
  different kinds of number. **The seller's figure is never converted**
  (`CLAUDE.md` §8). Two facts still bind: the measured median purchase is
  near $0.006, so a two-decimal format renders it `$0.00` — pick a format that
  does not lie about a small number; and the page calls CoinGecko directly,
  which is an acceptable shape.
- **The glance is asked for when it is on screen** (owner, 2026-09-12). The
  fiat line under a listing face's fold is the only node in the app that reads
  the glance rate, so nothing else asks the feed: not the door, not a painted
  shop, not a broadcast, not the quotes rail. It is the pay rail's own rule
  (2026-09-07, "two requests to two third parties for a number nobody uses")
  applied to the one place it had not been. While the line is on screen and
  the tab is showing, the rate is re-read past five minutes and on the way
  back from a hidden tab or a sleeping device. Found by an outside review;
  the archaeology is in `CLAUDE.md` §8 — `14295e1` (2026-09-03) retired the
  currency picker and the seller's currency hint, which were the only two
  reads that refreshed it, so for nine days the rate was read once per
  document load under a docblock promising "never a last-known value".
- **The door is the owner's own** (2026-09-05). A two-beat door shipped for a
  day and was reverted the same day on the owner's call; the first-stall
  checklist and the `pasted` stamp stayed. The door is not a screen a design
  round redraws without them.
- **Three surfaces left as they are on 2026-09-07**, after a plain-language
  explanation: no onboarding sentence on the pay sheet about needing a
  wallet that holds XEC; the "stopped reading" screen keeps its share link;
  the empty shop's "List your first item" stays for every visitor. Reopen
  with new evidence — a stranger who fell out on one of them.
- **The tolerance has no default, and the presets stay under "More"**
  (2026-09-07). A permanent record carries only what the seller chose: 2 %
  pressed by default from under a closed fold was a byte nobody chose, met
  for the first time in a dispute. A quote with no byte prints "no
  tolerance stated", and the page's own 2 % valve (`PAY_VALVE_DEFAULT_PCT`)
  is this page's comparison, never the seller's promise.
- **No wider chronik host list and no two-tier client now** (D5,
  2026-09-07). Every chronik host added is a party that sees which stall a
  visitor opens and that can lie to them — chronik is a trusted indexer —
  and nobody has yet met the failure this would answer. The one
  `connect-src` widening the same day is the second price feed below: a
  host that learns a payment is being composed, not which stall. The long path is the owner's own node
  with the plugin (`deploy/chronik-agora.md`); a second operator worth
  trusting would reopen two tiers.
- **A non-minimal push is not this app's record** (D6, 2026-09-07). The
  reader takes direct pushes and `OP_PUSHDATA1` only, the edge mirrors it,
  and nothing this app writes emits anything else; no record on chain needs
  more. Loosening later is backward-compatible — records that were
  unreadable become readable — while tightening later is not, so strictness
  keeps the option. The known cost: a wallet that emits a non-minimal push
  reads as never published, with no sentence saying why.
- **The first-open check is a second price feed, not a comparison with
  ourselves** (D9(b), decided 2026-09-07, owner: "Ok sử dụng coinpaprika",
  "Chốt cách dùng luôn"). The movement check D9(b) first asked for —
  CoinGecko against a boot glance, or against itself twice — is **declined**:
  the glance has no clock, and one feed's answer is cached for a minute or
  two, so asking it twice reads the same number. What ships instead asks
  CoinPaprika beside CoinGecko wherever `readPayRate` runs, under a shorter
  budget, and lets it **speak and never price**: the figure is always
  CoinGecko's (`judgeRates`, the check's rate is not in its return type), the
  rate line names the feeds consulted, and past `RATE_DISAGREE_PCT` (5 %,
  one sample at rest measured 0.08 %; `scripts/rate-gap.mjs` is how the
  line gets a number) the valve says the two disagree and restates the
  figure — the moved-rate shape, never a refusal, because a refusal on an
  unmeasured line is an outage generator during the moves people transact
  in. A check that does not answer leaves today's behaviour, said as "one
  feed" on the rate line. What it catches: a unit bug, a stale cache during
  a move, one hijacked host. What it does not: a bad print on the dominant
  venue both feeds draw from, or a network-position attacker who can lie
  through one feed and suppress the other. USD only — for any other unit a
  second source still does not exist (§ Rejected).
  **The Free plan.** CoinPaprika's pricing page calls its keyless tier
  "personal and non-commercial"; Stall takes no cut, holds no funds and
  has no account, and the owner chose to use it as is (2026-09-07). If it is
  ever refused the check goes absent and the pay rail does not notice.
  Privacy: one more host sees a visitor's IP at those moments — no referrer,
  no cookie, and a URL that names the asset, never the stall.
- **Listings leads, and the door's sentence covers both rails** (owner,
  2026-09-20, replacing the 2026-09-07 "provisionally" entry). The door
  says a stall carries listings from Agora and prices the seller sets
  themselves; Listings stays first on the door, in the first-stall
  checklist, in the guide's chapter order and as the stream picker's
  default, with the quotes rail one press away. **No condition is attached
  to this** — the owner removed the one that used to stand here on
  2026-09-20 and does not want it raised again. Reopen only on a new reason
  of the owner's; a swap is copy only, one commit, reversible.
- **The item tag is a landing link on paper, never a BIP21** (2026-09-08,
  the owner's three answers): the poster sheet's fifth format, offered only
  where there is a quoted item, prints one item per A4 sheet with the real
  icon and saves a 1080×1350 PNG with the initials on a disc — the canvas
  draws no image and the Worker grants no CORS. It carries rule 5's chip
  and line, the borrowed-id line, the stall's name, the whole link, and a
  snapshot sentence said about the paper; **no age** (a relative time
  printed once is wrong for ever) and no promise that this page is
  current. Its one shortcut is the describe sheet's foot, over a published
  quote the form restates verbatim, and closing the poster returns to the
  sheet. Not on the quote face (one overlay at a time: it would lose the
  face and hold the live paint on a buyer's decision surface), not on the
  items row (one control per row) — both rejected, do not re-argue.
- **Settled records rank by the node's first sighting, then by the old
  ladder** (2026-09-07, widened 2026-09-08). The rule was txid alone within
  a block; a seller who edited a quote four times in one block interval saw
  the edit with the highest txid win over their removal. chronik's
  `timeFirstSeen` now orders any two settled records when both stamps are
  known and differ — across blocks too, which closes the one case height
  gets backwards, a newer edit mined a block before an older one. Without
  stamps: finalized-and-unmined, then height, then txid. One node's clock,
  never alone, and no extra request: the stamp rides every transaction the
  page already reads. Not a wire change; mirrored at the edge.
- **A record is the stall's only if it pays the stall itself** (D14,
  2026-09-07, the owner's own proposal). An `STL1`/`STLD` record counts when
  the stall's key signed it **and** the transaction pays the stall's own
  script exactly `DUST_SATS` — what the stall's publish link writes, so
  nobody's publish link can be signed into somebody else's stall by
  accident. Measured before it shipped: every legitimate record on chain
  self-pays 546; the only two that did not were foreign-signed replays of
  the owner's link, one of which had become a copycat stall. A mistake
  filter, not an attacker filter: deliberate copying from one's own Studio
  is untouched, and names stay unadjudicated (§ Rejected). The cost: a
  record composed outside this app's links with any other self-output is
  nobody's — said on the sign (settings) and on the Activity row (both
  records); **not yet counted on the rail** for a quote (STLD): the walk
  collects the refused tokens but nothing lifts them to the view, so the
  quotes rail prints "nothing quoted" and a zero over a refused quote
  (corrected 2026-09-09; the sentence read "counted on the rail" for a day
  and a fix was built on it). A foreign-signed record is refused before the
  count on both records and is said on Activity alone. Reader rule,
  mirrored at the edge; no wire change.
- **Market size is a closed topic.** This is groundwork built to try
  something. Do not reopen it.

**Rejected — do not re-propose without new evidence.** Each died for a reason
that is still true:

- **Gifting as the product.** A gift is consumed, an asset is held; making the
  gift a token purchase leaves the giver holding something that trends to zero.
- **Any token as the payment unit**, FIRMA included. Agora is XEC-denominated;
  `AgoraPartial` enforces one output of satoshis to one maker address. Accepting
  a token means manual fulfilment — an invoice, not a vending machine.
- **Every form of a stall name in the URL.** Re-opened and closed again by the
  owner on 2026-08-27. The whole option space, so nobody rebuilds one:
  - *A namespace (`/name`), first-come.* No backend means no takedown, so it
    is a squatting and impersonation factory. The identity is the seller's own
    key, which is why there is no name to fight over.
  - *On-chain registry in `STL1`, with a lease.* The lease bound and the
    oldest-unbroken-chain rule cannot both hold; the lokad index is not the
    set of Stall records (first output only, plus eMPP and input-script
    prefixes) and is floodable for a few dollars with standard transactions;
    its ordering is not chain order; a reorg can hand one name to two stalls.
    Only a chronik plugin grouped by label is a real reader, and that is a
    dependency on one operator. None of it adds a takedown.
  - *Name and key in one URL.* Mechanically sound and it buys nothing: people
    taught to say the name paste the name and are told it is not an address.
  - *A name table Stall ships, or a name Worker.* Both make Stall an authority
    that adjudicates names. The owner declined the role.
  **What stall.cash provides instead is the share surface**, and a widget. A
  stall is named by whoever owns it, wherever they already have an audience.
- **eCash Alias as that namespace.** Right data shape, nothing else: no alias
  server exists, Cashtab's own vectors pin `chicken.xec` as invalid, and the
  spec documents a front-running attack.
- **Themes as code, CSS, or fetched assets** (`CLAUDE.md` §6).
- **Revenue share enforced by covenant.** Only oneshot carries multiple
  enforced outputs, and its payout is an arbitrary output list the covenant
  does not tie to any key — so a covenant cannot enforce a split. (The group
  key is signed for by a ONESHOT alone: the plugin checks `cancel_pk`'s
  signature there and nothing for a PARTIAL, so a PARTIAL can be placed under
  any key as a gift listing — corrected 2026-09-08 and again 2026-09-09,
  `CLAUDE.md` §10.)
- **Any painted unit beyond `usd` and `xec`.** A *display* rule, never a wire
  one: the decoder keeps every code a record carries and the editor restates
  an unwritable one untouched on republish. Reopen on **both** of two
  conditions: a second rate source, and a seller asking. (Since
  2026-09-07 a second source exists **for USD only** — `fetchXecPriceCheck`
  answers nothing for any other code, and `RATE_WINDOWS` judges none — so
  the first condition is not met for any other unit.)
- **Browsing every quote on chain.** A cross-stall index against the
  per-seller identity: Stall has no directory, no ranking and no takedown; the
  lokad index is floodable and its order is not chain order. A quote is found
  through the seller's own link, exactly as their stall is.
- **Turning a quote into an Agora listing, or a listing into a quote, as one
  item.** They share a token id and nothing else: a listing hands the buyer
  that token inside the transaction they signed; a quote hands them nothing on
  chain. A control that "upgrades" a quote would tell a seller their off-chain
  item is now escrowed — the one claim this rail exists never to make. A
  seller may do both for one token, painted on two rows, and the describe
  sheet warns them buyers will see two prices.
- **A refund road and a lifecycle status record** (2026-09-04). Stall has no
  login and the Activity panel is public, so a "refund this payment" control
  is a self-funding phish (pay the stall once; every visitor who presses
  refund pays the attacker), and a status mark re-opens "never a status bit"
  and is one-sided toward whoever gains by lying. Stall stays at three
  LOKADs.
- **A rate sanity band around a shipped constant** (2026-09-07). A ×100 band
  lets a 99× lie through, the constant goes stale, and applied to every
  currency it would refuse non-USD rates the day a picker returns. The
  cheaper honest step is to run the "price moved" comparison on the first
  open of the pay sheet, not only on the aged refetch — see **Open**. What shipped instead on 2026-09-07 is a wide window in the feed's own
  unit (`isPlausibleRate`, two orders of magnitude outside anything XEC has
  traded at) that refuses only a unit-scale error, said in its own
  sentence (`CLAUDE.md` §8); the glance is not judged. The same evening a
  second feed took the first-open check (D9(b), § Decided).

---

## D — the direct-payment rail: the words, and the two prices

Settled 2026-09-03/04 with the owner and shipped with the pay rail. This is the
vocabulary and the display law for a stall that has **two** money surfaces;
`CLAUDE.md` §2, §5 and §8 carry the mechanism.

**The words are fixed.** The seller's on-chain figure is a **quote** — never a
"price" beside an Agora figure. The token in that role is an **item**. The
surface is **Pay the seller**. The control is **Pay**, never Buy. The
transaction is a **direct payment** (`STLP`). The Activity row is a **payment**
and its state is **paid** — never bought, never sold, and never a verdict. A
quote never wears "≈": that mark belongs to computed glances.

**Rules for two prices on one page.**

1. **Never on one row.** A Shop row is the covenant's asked price (`price`, in
   XEC, with "from" and the Cashtab hand-off). A quote row is the quote
   (`seller-price`, "$5.00" or "5,000 XEC", the chip "Seller's quote", no
   stock, no "from", a Pay control). A token with both gets a one-line pointer
   on the Shop row and never the other number — and the seller is warned, in
   the describe sheet, that buyers will see two prices. A warning, never a
   refusal: neither Agora group is under the seller's sole control.
2. **A quote is never converted.** A USD quote shows USD. XEC appears only on
   the pay sheet at pay time, as `price` — the figure the wallet signs — with
   the rate line beneath it saying where it came from.
3. **The buyer note sits under the figure, inside the amount card.** One
   sentence per surface: the section's lede says what the rail is and that the
   trust is in the seller; the sheet's note sits where a buyer is looking when
   they decide — "You pay the seller directly. No escrow. No token is sent to
   you — the seller delivers off-chain."
4. **Activity says "Payment · N XEC · to the seller"**, as its own label. The
   memo beside it is the payer's claim, labelled as one. Never "sold".
5. **A card carries one rail, never both.** On the overlay and the poster the
   streamer chooses which rail a card shows; a quote card carries the quote,
   the chip, the seller's words when they wrote any (since 2026-09-09, under
   the chip), one line about what paying it does, and a code that opens **this
   page at that item** — no rate, no derived XEC, nothing a viewer could scan
   into a wallet holding a figure nobody explained. Quote in XEC for a stream
   nobody is watching. **On the ticker preset (owner, 2026-09-21)** the
   chip rides beside each quote figure, the "pays the seller" line rides
   the fixed label plate for the pass, and the code is the shop's — the
   amendment is recorded in § Decided.
6. **The seller is told the two are not linked**, in the describe sheet, in
   one line.
7. **A quote is written on a token this stall minted.** The editor refuses to
   write a **new** one on somebody else's token, warns when it cannot tell,
   and carries an existing one forward untouched. The reader never refuses a
   quote the seller signed — it paints initials instead of the borrowed icon
   and says where the token came from. Wire unchanged.
8. **The token's name titles every quote surface and the seller's words
   follow** (owner, 2026-09-05; the reverse shipped for two days). The words
   are shown whole where there is room and on one line where there is not —
   and since 2026-09-09 a cut line **runs once** rather than being cut with
   an ellipsis (`src/ui/marquee.ts`: the shop rows' name and words, the
   stream card's name and words); nothing is cut mid-word. The stream card
   keeps the genesis name as its title, and the **quote** card carries the
   seller's words under the chip (owner, 2026-09-09, reversing the clause
   that kept them off the plate while the plate could only cut them); the
   listing card carries none, because there the words would sit beside the
   covenant's figure with no label between. Agora rows are untouched —
   there the token *is* the thing.

**What this rail is not.** Not an escrow, not a checkout, not a receipt: Stall
composes a BIP21 and a wallet signs it. No fiat or rate in the memo, no
conversion of a quote outside the pay sheet, and no automatic verdict about
whether a payment covered one — the seller's stated tolerance informs, and
the seller decides.

**Since 2026-09-21 the quotes rail composes one payment for several quotes**
("Pay several" — the owner's ask, the clause "there is no cart" above
retired by them the same day). Rules 1, 2, 4 and 5 bind every new surface:
never two prices on one row, a quote is never converted outside the pay
sheet, a payment is never "sold", a card carries one rail. The design and
its three critic passes are `private/design/basket-2026-09-21/`
(`MEMO-DESIGN.md` v7 is the spec). Two more decisions ride with it:

- **A quote may carry a surcharge** — `STLD` tag `0x04`, one byte, 1–100,
  riding the price entry like the tolerance; on the QUOTE record, never on
  the stall's, because paper, a stream card and a shop-window card print the
  quote beside a code and have no way to say "the stall's settings were not
  read". It is a display convention on the figure this page composes, said
  as the seller's record on every surface that prints the quote, and never
  the word "tax". The describe sheet prefills the last **published** value
  for that stall from `localStorage` (a named §2 exception: validated on
  read, pin-capped, never a key, a published byte always wins).
- **A multi-item payment memo is a second shape of `STLP`**, never a new
  LOKAD: push 1 is a marker byte `0x00` and a list of 4-byte token-id
  prefixes with quantities, which an un-updated reader refuses (it files the
  payment as `other`, with no claim) — the § Firma rail's "bad trade" is
  overridden here on the owner's reason: an amount with no items is nothing
  to reconcile against. The app's prefix floor drops to 8 hex for the
  `?pay=` link and the memo alike (0.001% odds that two of 300 quotes share
  one). The memo holds 35 items; the pay sheet's scan code is drawn to 26 and
  says "use the link" above that. Ships after the "Pay several" UI has been
  used once.

---

## Attachments — the shape, and what is not pinned

Designed 2026-08-28: **design only, no build.** Attachments come after a
working accept and there is no accept. What an attachment *is* was settled
above: a token the stall address holds, worn only when the settings record
says so.

**What an attachment says:** evidence of habitation, never a claim. A lit
sign, a beetle, a shop gone dark — never checkmarks, shields, padlocks,
status dots or counters: a green dot beside a seller's name reads as "online
now", a statement about the world this origin cannot make.

Four rules — two mechanical with a test, two editorial with the owner:
- No digits, no words (test: `an-attachment-carries-no-text`).
- Never interactive (test: `an-attachment-is-never-interactive`).
- Never between two facts, and never inside the item list. Editorial.
- Information never moves; decoration may — under reduced motion, things
  stand still and events disappear (test: `reduced-motion-does-not-move-the-price`).

**Every attachment node carries an `att-` class**, because the layout probe
admits a node on that prefix or on `position: absolute | fixed`; a decoration
in normal flow with neither gets zero guard coverage.

**Four slots** — `crest` (in flow beside the name), `fringe` (contained in
the ornament strip), `yard` (ambient sprites pinned to a reserved spacer,
never a viewport offset or a border), `mood` (a palette delta merged before
the theme vars). One occupant per slot; the picker makes two bits in one slot
unrepresentable.

**The wire is deliberately not pinned:** one tagged push inside the grammar
`STL1` already has, skipped by an old reader, no flag day; bit N means row N
of *this theme's* table. The tag byte, the bit order, a payload that is not
two bytes, a bit with no row, and what a theme change does to the flags are
undecided on purpose and must not be guessed by whoever builds it. The
catalogue's full cost was measured (+3 KB gzipped for 48 rows); what to watch
is the probe's runtime and that every visitor downloads all of it.

**Entitlement** reads the holdings only when the settings record carries a
flag; a flag that cannot be verified paints nothing, silently to a visitor
and never to the seller (the picker says "this stall does not hold that
token" and, separately, "the lookup did not answer").

---

## The licence wire, settled and unbuilt

Designed 2026-08-26 so the format is decided before the first record exists.
**Do not build the check yet**: every shipped theme is free, so a gate with
nothing to gate is dead code. It arrives in the same increment as the first
paid row.

**A separate LOKAD, `LIC1`, never inside `STL1`.** Same grammar as `STL1`:
push the LOKAD, push a one-byte theme id, then tagged extras ignored when
unknown. Authorship reuses `txSignedByStall` — one checker, not two.

**Payment is verified against a shipped table** of `{ hash160, minSats }`:
sum the outputs by hash160 and require each row to reach its minimum.
Overpaying is fine; a missing payee is not a licence. **Search for any
match, not for a winner.** Unconfirmed is never paid. A truncated walk is
**neither paid nor unpaid** — a third state.

The first paid id is `0x04`, not reserved in the table until a look exists.
**A licence lookup that fails must never take the offers down**: the stall
falls back to the default look and says so — it does not stop selling.

**The payee address** for paid looks is held outside this repository until
the first paid row ships; it goes into source then, verified by a test
against its hash160 rather than read by eye — the first draft of that
address arrived with one character outside the cashaddr charset, which would
have sent revenue to an output nobody can spend.

---

## The Firma rail, specified and deferred

Researched 2026-09-19 against Firma's own sources and Cashtab's own parser,
**deferred by the owner the same day**. The reason for the deferral is not a
technical doubt — it is reach: a quote in a Firma unit only helps a seller
whose BUYERS already hold that token, and on eCash most wallets hold XEC. A
shop with walk-in customers has nobody to pay it. Build this when there are
buyers holding Firma, and not before. Nothing below expires; re-read it
instead of re-deriving it.

### Why it is worth building at all

Not "one more currency". It **deletes the riskiest machinery in the pay
rail.** A quote denominated in something the chain does not carry drags in
two price feeds, a plausibility window, `RATE_DISAGREE_PCT`, a frozen rate
with a stamp, the press-time valve, a code that expires at
`PAY_RATE_MAX_AGE_MS`, and the second-press dance WebKit forces. Quote 10
Firma, pay 10 Firma: **none of it applies.** No rate, no feed, no expiry, no
valve, and no way for two visitors to see two figures. It is the most honest
money path this app can have, because nothing on it is derived.

### Measured, with sources — do not re-derive

- **One link, two wallets.** `pay.firma.cash/docs/pay-with-firma`: the
  `currency` prop *"sets BIP21 `token_id`. USD is FIRMA"*, and *"Firma Wallet
  opens with a **BIP21 payload**"*. `receiverUsername` takes *"any valid
  `ecash:` address"*. So Firma Wallet opens the same URI Cashtab parses.
  There is no second payment road to build — there is one link, and which
  wallet opens it is the buyer's.
- **Cashtab parses a token BIP21 natively** (`cashtab/src/validation/index.ts`,
  `parseAddressInput`). With `token_id` present the allowed params are
  exactly `token_id`, `token_decimalized_qty`, `firma`, `empp_raw`,
  `input_data_raw`, `addr`. The XEC shape's are `amount`, `op_return_raw`,
  `empp_raw`, `input_data_raw`, `addr`.
- **`amount` is NOT allowed on a token tx** — which is the good news stated
  as a constraint: no XEC figure, therefore no conversion.
- **`op_return_raw` is NOT allowed on a token tx either.** `STLP` rides in
  that param, so the memo has no slot. The two that exist are `firma` (an
  ALP-only push, `opreturnParamByteLimit − 58` = **165 bytes**, *"firma will
  only work for ALP sends"*) and `empp_raw` (**100 bytes**, allowed on both
  shapes). Both are eMPP pushes; `STLP` is a bare-OP_RETURN LOKAD.
- **FIRMA is ALP.** Two independent sources: Cashtab ties the `firma` param
  to ALP sends, and Firma matches orders by an *"FPAY EMPP push"* — eMPP is
  ALP's container.
- **Holding is permissionless; redeeming is not.** firma.cash: *"Swiss
  residents only"*, apply, approved in a business day. That governs opening a
  Firma ACCOUNT and cashing out to francs. The token itself is an ordinary
  ALP token any Cashtab holds. So a buyer anywhere can pay in Firma; only a
  Swiss resident can turn it back into bank francs. State that wherever this
  is ever explained.
- **The withheld list does not collide.** `quotedItems` calls
  `isWithheldToken(tokenId, …)` on the token being QUOTED, never on
  `price.code`. Pricing in FIRMA is untouched by FIRMA being withheld as an
  item. (Flagged as a decision on 2026-09-19 and withdrawn the same day —
  it was never one.)

### NOT measured — both block the first line of code

1. **The genesis decimals of FIRMA, fCHF and fEUR.** `token_decimalized_qty`
   must agree with them or the figure is wrong by a power of ten. A chronik
   read; it was blocked in the session that wrote this.
2. **One real link opened in Cashtab**, end to end. The docs being right does
   not mean our composition is. Measure before trusting, per §5's four
   silent failures.

### The design, in order

1. **Firma is three more `QUOTE_UNITS`**, grouped in the picker — not a
   second system. The unit already decides the road (`xec` asks no feed,
   `usd` does), so a stablecoin unit deciding a third road is the mechanism
   already shipped. **This is also the fiat/stablecoin toggle the owner
   asked for**: it needs no new concept.
2. **A Firma-unit quote composes a token BIP21** (`token_id` +
   `token_decimalized_qty`) rather than the XEC one, through a composer
   beside `payBip21` — never by widening it, because the two shapes have
   disjoint params and one function honouring both is one function that will
   eventually emit both.
3. **No `STLP` memo, and the sheet says so.** `STLP` is frozen and the only
   slots are eMPP pushes. The trade is: change a permanent wire format to
   gain a line this app already labels *the payer's claim* and already
   captions with "this page cannot tell a payment was for this item". That
   is a bad trade. Ship memo-less; the memo is additive later, in FPAY's
   format or STLP's, once somebody has read FPAY's bytes properly.
4. **Activity learns to read an incoming Firma transfer to the stall as a
   payment**, not a `token-move`. App-side only, no wire change.
5. **The default does not move.** The existing rail stays the default.

### Rejected, with the reason

- **Firma as the default rail** — most eCash wallets hold XEC, not Firma.
- **`@firma/pay`** — a React checkout widget; this app is plain DOM with
  vendored pinned tarballs (§9). Everything it does with a component, Stall
  does with a link and the socket it already holds.
- **Two payment roads** ("free via the Firma app, paid via Cashtab") — the
  premise is wrong. Firma's "0%" is *"zero per-transaction **platform**
  fees"*, stated against card networks' 2–3%. Both roads are the same eCash
  transaction paying the same miner fee; Cashtab takes no cut either.
- **Extending `STLP` into an eMPP push** — see 3 above.
- **Denominating in Firma while paying in XEC** — the seller would receive
  XEC, not the stable asset they chose the unit for, and the figure would
  rest on an unverifiable peg assumption on the one screen that prints a
  number a wallet signs. If the payment is XEC, quote in CHF or EUR instead:
  identical for the buyer, with a real rate and a real fence.

---

## Open — ask before assuming

- **A screen shorter than the wall's floor stopped being a wall, and that
  is a behaviour change.** The floor asks the short painted axis now
  (2026-09-20), which is what makes "a phone is not a wall" true turned or
  not. The cost lands on a class that is not a phone: a 1024x600 panel was
  a wall and is not one now. The evidence says that is right — the code's
  floor was measured off the bottom of a 768-tall screen, per
  `layout/PROBE-RULES.md` — but nobody has held one, and if a seller has a
  short landscape panel this is the line to move. Stated here rather than
  buried in a fix, because it is what a seller would notice.

- **A turned screen's floor is measured, its geometry still is not.** The
  wall's width floor now reads the axis the FRAME paints on — `window.css`
  sizes a turned frame `100vh × 100vw`, so a landscape phone opening a
  `turn=cw` link measures 844 across while painting 390 — which closes a
  hole the 2026-09-18 gate had and this session's first fix inherited
  (critic, 2026-09-20). What is still true is CLAUDE §4's own note: the
  probe measures a turned screen's LAYOUT and not its rotation GEOMETRY,
  because `getBoundingClientRect` is axis-aligned. So the floor is right by
  construction and unmeasured in a browser. **The acceptance criterion in the first
  version of this entry WAS the defect.** It said to open a `turn=cw` link
  in portrait and confirm it is the wall — which is an 844x390 painted
  frame, where the code's own floor (`clamp(280px, 33cqh, 360px)` = 280)
  takes 72% of the height and the tile another 51%, clipped in silence by
  `overflow: hidden`. A person checking would have confirmed the bug and
  ticked it off. The floor asks the SHORT painted axis now, so the rule has
  no direction to get backwards: a phone is not a wall, turned or not, and
  `a phone is not a wall on either axis, turned or not` pins it. What is
  left for a person: open a `turn=cw` link on a phone both ways up and
  confirm the ordinary stall both times, then on a screen over the floor in
  both axes and confirm the wall paints the right way round. Nothing in the
  repo can do that last half.

- **A shop screen that boots below the floor is never a wall, and nothing
  heals it.** `boot` reads the width once (on the frame's own axis) and
  writes the answer onto every view; a page that starts narrow paints the
  ordinary stall for the life of the document. `refresh()` does not
  re-enter `boot`, the beat is never armed on such a page, and
  `visibilitychange` reads no width — so there is no self-heal path, on
  exactly the machine nobody is standing next to (`WINDOW_BEAT_MS`'s own
  docblock: "`visibilitychange` never fires on a kiosk that is visible
  around the clock"). The reachable case is a panel whose browser reports a
  small viewport at startup, or a window restored small before going
  fullscreen. **Reading it once is deliberate** — a predicate that re-reads
  flips under a rotation and the next socket tick throws away a
  half-written record, which is the defect this replaced, reproduced and
  now pinned. Options: leave (a reload fixes it, and the screen shows a
  working stall meanwhile, just not the wall); re-read on `pageshow` or
  `resize` **only while no overlay holds the paint**, which keeps the
  rotation fix and heals the kiosk for one listener and one condition; or
  say so on screen, which needs copy on a surface whose whole contract is
  that it has none. Recommended: the second, but it is a decision about
  what an unattended screen does, which is yours.

- **The shop window sheet's reveal switch, worded by an agent and not by
  you.** "Lock the listings to a block · **On**" turned nothing on: the
  switch reveals the row, and the control inside it sets the lock. The false
  sentence was a bug and is fixed; the REPLACEMENT is taste and was taken
  without you, which AGENTS §1 says is yours. It now reads "Show the
  block-lock setting", and the critic's objection is fair: it names our
  machinery where the sheet's other switch ("Show a code that pays each
  quote") names a thing in the world, and "block-lock" appears nowhere else
  in the product. Three ways out, all cheap: keep it; reword it (their
  suggestion, "Choose a block to lock to"); or drop the switch's On/Off
  pill and make the disclosure an `aria-expanded` control, which is the
  honest shape for something that only reveals — and a design change, which
  is why it is here rather than done.

- **A quote's own rate is fenced by the USD pair, not by its own value —
  the cost of the unit feature, written down so it is not re-derived.**
  `judgeQuoteRates` runs the window and the second feed over the USD pair,
  then prices the figure from the quote's unit rate, which no window bounds
  (`RATE_WINDOWS` holds a `usd` row alone, and `isPlausibleRate` answers
  `true` for a code with no window). That is the decided design — CLAUDE §8,
  `451e5ea`, and the test `prices the figure in the quote's unit and keeps
  the usd verdict`. What was not written down until 2026-09-20 is what it
  costs: `readPayRate` issues **two** `fetchXecPrice` calls, so a per-currency
  data error at CoinGecko — a correct `usd` field and a wrong `vnd` one in
  the same minute — composes a figure nothing refuses, while the same error
  in USD is refused twice over. Measured: `judgeQuoteRates('eur', rate(500),
  usd_ok, usd_ok)` answers `{kind:'rate'}` where the USD path answers
  `{kind:'refused', why:'implausible'}`. Exposure is one seller's choice of
  unit. **Measured 2026-09-14** over the lokad index (§ Open's own recount):
  13 `STLD` records by 3 keys, every one written before the unit feature
  shipped on 2026-09-19 — a fact with a date and a shelf life of days, not
  a standing property. **The trigger is checkable**: re-walk the `STLD`
  lokad index for a `0x02` field whose three code bytes are neither `usd`
  nor `xec`. The first one that appears is when this is due — not "when a
  second feed prices a second currency", which is a condition nobody is
  watching. Options: leave and keep this
  paragraph; widen `RATE_WINDOWS` per currency (PLAN § Rejected killed the
  ×100 band shape twice, and a per-currency table is a second market
  opinion to maintain); derive the unit's fence from the USD rate through
  the quote's own cross-rate (one more assumption, no new third party).
  Recommended: leave, and revisit when a second feed prices a second
  currency — which is the same condition the `check` field already waits on.

- **A widget is answered for streaming; embedding on a seller's own page is
  still open.** The broadcast view answers half: an OBS Browser Source
  navigates straight to the URL, so `frame-ancestors 'none'` is untouched. A
  widget on a seller's *own website* frames Stall or scripts into it, and
  relaxing that directive is a real decision with a real cost (clickjacking
  on whatever page hosts the frame). A script that renders into the host
  page, or a server-rendered card, should be priced before an iframe is
  assumed. **The still is shipped and dogfooded**: `embedSnippet`
  (2026-09-07) is one line, a picture that opens the stall, and since
  2026-09-20 the door's "See a real stall" card is that exact widget for the
  Fittings stall — `the-real-stall-card-is-the-embed-widget` parses the
  line and holds the card to it. What stays open is a widget that shows
  live prices on somebody else's page.
- **A chronik node of our own with the `agora` plugin.** (Decided 2026-09-07 that
  nothing is widened now — see **Decided**; this stays the long path.) Until then Stall
  depends on three community nodes run by one operator — one point of failure
  wearing three hostnames — and the CSP pins the whole app to them, so the
  quotes rail dies with the book even though it needs no plugin. The plugin
  is off by default in the node build and a plugin added to a synced node
  forces a full reindex. A two-tier client (plugin-free reads through a wider
  host list, offers through the plugin hosts) is the alternative; both are
  trust-boundary changes for the owner.
- **The three record counts on chain**, measured 2026-09-14 over the lokad
  index (all pages walked, deduped by txid; 9 / 11 / 2 on 2026-09-08, 8 / 2 / 0
  on 2026-09-04): `STL1` 9 by 4 keys, `STLD` 13 by 3 keys, `STLP` 3 by 2
  keys. Read as a product number, honestly: of the four `STL1` keys, one is
  the owner's Fittings stall, one the owner's "1st" test stall, one a
  stranger's replay of the owner's link (the copycat), and one a stall nobody
  here knows (two records on 08-31); of the `STLD` keys, one is the owner
  (the two records added since 09-08 are theirs), one the owner's second
  wallet signing by mistake, one that same stranger's stall; all three `STLP`
  payments are the owner paying their own quotes — two from their second
  wallet, one from their test stall's wallet. **Adoption outside the owner:
  one stall, no payment.** A fact with a date, not a standing property —
  re-measure before claiming.
- **The owner's decisions left by the 2026-09-06 evaluation** were taken on
  2026-09-07 and built the same day (D1 tolerance default, D2 the sign
  condition, D7 the door chip, D8 the provenance chip, D9(a) the rate
  window, D10 the genesis link's floor — `git log`; D5 and D6 are under
  **Decided**). Still open: the working manuals into version control (the
  owner's remote), D9(b) below, and the edge unfurl's page cap (3) against
  the app's (10).
- **The audit of 2026-09-08** (`internal/AUDIT-2026-09-08.html`, two critics
  in `private/agent-output/audit-0908/`): done the same day — F3 the pay
  sheet's asking state, F2 one fact read at a time, the two D14 holes (a
  refused record newer than the winner is said; the `?m=` hint reports what
  it refused), the copy corrections (F4, F5, F11), the disclosure's vector
  paragraph. **F1 declined**: a stranger cannot put a ONESHOT into another
  key's group for dust (the ad script signs for `cancel_pk` under P2SH
  consensus), so a payout-script filter would only hide a seller's own
  listing paying a cold wallet, silently — and a PARTIAL *can* be placed
  under any key on either road (2026-09-09), which the reader cannot tell
  from a genuine row and which pays the seller: a gift, recorded, not
  filtered. Recorded, not fixed: F6
  (`loadTokenMeta` fans out one request per token, the seller's own count),
  F7 (the unfurl walks two head requests per fabricated address, bounded by
  Cloudflare), F10 (four session caches grow per stall opened in a tab,
  bytes).
- **Deferred by the owner on 2026-09-09, after the audit's two critics
  (`private/agent-output/audit-0909/CRITIC-1.md`, `CRITIC-2.md`)** — four
  behaviour decisions, each with its cost written so it is not re-derived:
  1. *N7, the refused quote on the rail.* **Deferred again 2026-09-14, on
     the recount and a critic round.** The walk collects tokens whose record
     was signed by the stall but not self-paid 546, or could not be decoded;
     nothing lifts them to the view, so the rail prints "nothing quoted" and
     `Quotes · 0` over them (a false zero under §4's floor rule). Measured
     2026-09-14: the set is empty on every stall anyone visits — all 22
     self-paying records are accepted, and the two that do not self-pay are
     foreign-signed on the stalls they name, refused before the set. The
     shape to build when it stops being empty, so it is not re-derived (the
     critic's corrections of the first plan, `private` audit-0914): two
     maps beside `unreadable` in the descriptions walk (`unaddressedBest`,
     `brokenBest`, the ambiguous-in-one-tx case riding `brokenBest` and
     said so), a per-token rank compare against the winner like STL1's
     `noteRefused` — never a count alone, which prints "1 could not read"
     beside a good row for ever — two sentences worded as **records** and
     never "quoted items" (an STLD carries words, shelf and price in one, so
     a record we refused may not have been a quote), withheld subtracted,
     the label withholding its number while either set is non-empty,
     `QUOTES_NONE` not said, and a seventh `?pay=` outcome without the
     word "latest" (a truncated walk cannot claim it). Where it paints is
     still open: a refused record costs the Listings side its words and
     shelf too. A foreign-signed record is not in the set on either record
     and is said on Activity alone.
  2. *N3-B, the withheld token's picture on Activity.* The gate shipped
     (picture only for the stall's own record) does not cover a seller's own
     record about a withheld token: its logo paints. §4's "Activity is not
     filtered" is about printing a *name*; the payment row already draws the
     picture/name line ("a logo is louder than the word claim"). Options:
     leave; add `!isWithheldToken` to the picture (one predicate, one line
     in CLAUDE §4 saying the picture is not the name). Recommended: add.
  3. *B8, the first-sighting rule across blocks.* chronik stores 0 for a
     transaction the node never saw in its mempool (never the block time),
     so in the one case the rule fixes a reader that missed one sighting
     crowns the older record by height while another crowns the newer:
     two hosts, two winners, until a republish. Options: keep and carry the
     cost (status quo, written in CLAUDE §5); retreat to same-height (the
     09-07 rule already has the gap at the txid level, so it shrinks and
     does not close it); drop `firstSeen` (re-opens the measured 09-07
     incident: four edits in one block, the removal lost to the highest
     txid). Recommended: keep.
  4. *F6, `loadTokenMeta` fanned out one request per listed token, uncapped
     and unwindowed.* **Decided 2026-09-14: the window.** `TOKEN_META_WINDOW`
     (8) reads in flight at once, inside `loadTokenMeta` so every call site
     inherits it — the cold load, the live path's `fillNewTokens`, the
     quoted-but-unlisted read, the group names. Nothing visible changes; a
     stall a stranger inflated through gift listings opens in waves instead
     of one burst. The option first recommended — cap what the first paint
     waits on and read the rest after it — was holed three ways by the
     critic and measured true in the source: the sign's `N items for sale`
     and `Listings · N` print from a state where the name fence has not run
     for the tail (a floor printed as a count, §4's rule on the surface it
     was written for); "shop order" needs meta and shelves the load does not
     have yet, so tail rows land in `unsorted` at the bottom and jump up
     window by window; and the live path is the same fan-out one socket
     message away, racing the tail fill into duplicate reads. Building it
     properly is a pending-meta set that withholds every count, one paint at
     the end, one group lookup after the whole tail, a shared in-flight set,
     and the window underneath anyway — the next step if a busy stall is ever
     measured slow, not before.
- **The tag's follow-ups**: a real icon on the PNG needs the icon Worker
  to allow this origin (header set after the cache read, so cached entries
  gain it at deploy) and a separate cache key for the CORS load, never the
  display path — a week of cached header-less 200s otherwise turns every
  icon into letters; a sheet of several tags per A4; a "print every tag"
  road; the quote row's wider press (the old Part A). Print media is
  measured by hand (`scripts/print-measure.mjs`), not by the probe, and
  the owner's printer has not seen a tag yet.
- **Decided by the owner on 2026-09-08 from the open list**: no
  same-name alert in the eCash-Live bot (cancelled); the bot's payment
  alert and the ecash-herald LOKAD registration are deferred; a third rate
  feed (Binance) waits for a day of `scripts/rate-gap.mjs` — it is the same
  venue the two aggregators draw on, quotes USDT, and blocks whole regions,
  so it buys a tiebreak between the two feeds and little else.
- **A Cashtab patch** that preselects a maker on the token market is not on
  Stall's buy path. It remains optional help for people who buy in Cashtab
  from somewhere else, never a blocker.

---

## Design runs one stage ahead

Design precedes code, for every screen. But it runs **one stage ahead, not to
the end** — designing the listing flow before stage 1 exists means drawing it
before the thing that teaches you how it should work. Done and kept outside
the repo: themes and schema, the three-layer stall UI, the key ceremony,
seller setup. Deferred until there is a real accept: the native accept,
cancel, and create-listing screens.

The working loop since 2026-08-30: a design round on a canvas → the owner
picks → the port under the guards → the cards regenerated from production so
the canvas equals the code. The guards outrank the design where they measure
(QR size, type floors, no positioned pseudo-elements); the design outranks
the shared skeleton everywhere else.

---

## Next action

1. **Port the 2026-09-20 redesign** of the door, the Studio panel, `/guide`
   and `/stream` from the approved board (owner's answers Q1–Q8 and five
   additions, 2026-09-20; the board and its critic report live in
   `private/design/redesign-2026-09-20/`), in the order door → Studio and
   its four tool sheets → the two guides, each commit under the suite and
   the layout probe.
2. **Measure.** The three record counts and their distinct signers; the CDN's
   request counts for the unfurl function and the icon Worker.

Deploying needs nothing: a push to `main` builds and ships, and CI runs the
build and the suite on the same push. What that does **not** cover are the
origin checks no test can make — the response headers and the `/s/*` status
on the live host after any change to `public/`.

Before trusting any claim in this file, re-read the source — including this
one.
