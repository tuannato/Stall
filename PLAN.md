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
read the three record counts on chain (`STL1`, `STLD`, `STLP` — 8 / 2 / 0
on 2026-09-04) and the distinct signers among them; read the CDN's own
request counts for the unfurl function and the icon Worker; walk five real
sellers through a stall by hand. Then the owner's decisions under **Open**
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
- **Listings is the product sentence, provisionally** (owner, 2026-09-07).
  The door, the first-stall checklist, the guide's chapter order and the
  stream picker's default stay as they are: a shop page for one seller's
  Agora listings, with the quotes rail one press away. Quotes was the
  window's recommendation — the one rail Stall owns the money path of —
  and the owner chose to keep Listings first until the five-seller walk
  (§ Next action) says where a seller of real goods actually stops. Reopen
  with that evidence; a swap is copy only, one commit, reversible.
- **A block's records rank by the node's first sighting, then txid**
  (2026-09-07). The rule was txid alone within a block; a seller who edited
  a quote four times in one block interval saw the edit with the highest
  txid win over their removal. chronik's `timeFirstSeen` decides when both
  stamps are known and differ — one node's clock, never alone. Not a wire
  change; a reader rule, mirrored at the edge.
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
  nobody's — said on the sign and counted on the rail, never swallowed.
  Reader rule, mirrored at the edge; no wire change.
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
  enforced outputs, and a oneshot is grouped under `cancel_pk` while its
  payout is an arbitrary output list — an offer grouped under your key can pay
  someone else.
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
   the chip, one line about what paying it does, and a code that opens **this
   page at that item** — no rate, no derived XEC, nothing a viewer could scan
   into a wallet holding a figure nobody explained. Quote in XEC for a stream
   nobody is watching.
6. **The seller is told the two are not linked**, in the describe sheet, in
   one line.
7. **A quote is written on a token this stall minted.** The editor refuses to
   write a **new** one on somebody else's token, warns when it cannot tell,
   and carries an existing one forward untouched. The reader never refuses a
   quote the seller signed — it paints initials instead of the borrowed icon
   and says where the token came from. Wire unchanged.
8. **The token's name titles every quote surface and the seller's words
   follow** (owner, 2026-09-05; the reverse shipped for two days). The words
   are shown whole where there is room and on one line with an ellipsis where
   there is not; nothing is cut mid-word. The stream card keeps the genesis
   name. Agora rows are untouched — there the token *is* the thing.

**What this rail is not.** Not an escrow, not a checkout, not a receipt: Stall
composes a BIP21 and a wallet signs it. There is no cart, no fiat or rate in
the memo, no conversion of a quote, and no automatic verdict about whether a
payment covered one — the seller's stated tolerance informs, and the seller
decides.

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

## Open — ask before assuming

- **A widget is answered for streaming; embedding on a seller's own page is
  still open.** The broadcast view answers half: an OBS Browser Source
  navigates straight to the URL, so `frame-ancestors 'none'` is untouched. A
  widget on a seller's *own website* frames Stall or scripts into it, and
  relaxing that directive is a real decision with a real cost (clickjacking
  on whatever page hosts the frame). A script that renders into the host
  page, or a server-rendered card, should be priced before an iframe is
  assumed.
- **A chronik node of our own with the `agora` plugin.** (Decided 2026-09-07 that
  nothing is widened now — see **Decided**; this stays the long path.) Until then Stall
  depends on three community nodes run by one operator — one point of failure
  wearing three hostnames — and the CSP pins the whole app to them, so the
  quotes rail dies with the book even though it needs no plugin. The plugin
  is off by default in the node build and a plugin added to a synced node
  forces a full reindex. A two-tier client (plugin-free reads through a wider
  host list, offers through the plugin hosts) is the alternative; both are
  trust-boundary changes for the owner.
- **The three record counts on chain**: `STL1` 8, `STLD` 2, `STLP` 0 on
  2026-09-04. A fact with a date, not a standing property — re-measure before
  claiming, and read them as a product number from now on.
- **The owner's decisions left by the 2026-09-06 evaluation** were taken on
  2026-09-07 and built the same day (D1 tolerance default, D2 the sign
  condition, D7 the door chip, D8 the provenance chip, D9(a) the rate
  window, D10 the genesis link's floor — `git log`; D5 and D6 are under
  **Decided**). Still open: the working manuals into version control (the
  owner's remote), D9(b) below, and the edge unfurl's page cap (3) against
  the app's (10).
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

1. **Measure.** The three record counts and their distinct signers; the CDN's
   request counts for the unfurl function and the icon Worker; then five real
   sellers walked through a stall by hand, with the token minted for them, so
   the question "is the mint requirement the constraint or is demand" gets an
   answer instead of an argument.
2. **Walk the five sellers with the sentence as it stands** (Listings,
   provisional — § Decided) and let them answer whether the mint step or the
   listing step is where a seller of real goods stops.

Deploying needs nothing: a push to `main` builds and ships, and CI runs the
build and the suite on the same push. What that does **not** cover are the
origin checks no test can make — the response headers and the `/s/*` status
on the live host after any change to `public/`.

Before trusting any claim in this file, re-read the source — including this
one.
