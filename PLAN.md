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

- **Look files that are not MIT live in a private repository, joined at
  build (owner, 2026-09-28, "option 4"; reaffirmed 2026-10-06).** The public
  repository never tracks them (`src/looks/` and `looks/` are guarded in the
  tree and in unpushed history); a build carries one only when it names a
  private selection explicitly. Whether a look is paid and whether it is
  released are public literals in `src/domain/theme.ts` (`PAID_LOOK_IDS`,
  `RELEASED_LOOK_IDS`), so a release is a reviewable public diff, never a
  private pin bump. `0x04` is reserved, paid and unreleased until the look
  rail ships; until then a record naming it paints the default look. Each
  look file opens with `/*! © 2026 tuannato (stall.cash) */` and nothing
  more; AI use is recorded in the private design log. **The served sheet
  carries the line too** (owner, 2026-10-07): Vite drops `/*!` comments when
  it minifies, so a build puts that line at the head of each carried look's
  emitted sheet and its dist check holds it there; SVG and JSON files carry
  no comment either way. Payees stay pinned
  hash160s (§ Rejected: a payee named by an NFT).
- **Deploys through GitHub Actions run by hand, production behind the owner
  (owner, 2026-10-06).** The private repository is read by its own job in
  its own Environment, never by the job that builds and tests; production
  deploys through an Environment with the owner as required reviewer; the
  first production run is by hand, and Pages' automatic builds are turned
  off only after it.
- **Until a look is sold, production reads nothing private and the look
  travels nowhere (owner, 2026-10-06, by recommendation; STEP-8C-PLAN v2).**
  Production builds without the private repository until step 9 — a build
  that reads no private file is the public build by construction, and an
  expired read token stops previews, never production. Before its release a
  private look is reviewed on the owner's machine only (shots, local runs);
  only a canary of public bytes travels to previews — held by a hash, not
  by a name (owner, 2026-10-07 and 2026-10-08, on the 8c2 critics): until
  step 9's release the deploy road packs one tree, the canary's, a public
  literal that a public test rebuilds from this repository's own bytes, and
  the pack and the pin refuse every other; step 9's release commit rewrites
  that road. Pages' automatic
  production build goes off only after a dashboard rollback has been proved;
  after that each push is a production run waiting for the owner's Approve;
  the unattended screens' idle reload waits for step 9.
- **Weight is held per bucket (owner, 2026-10-06).** Every-visitor bytes and
  on-demand bytes each have their own ceiling (no summed ceiling that counts
  one twice); a worn-only look has a soft target of 256,000 gzip bytes and a
  hard cap of 512,000, and between the two it ships only when its id is on
  the public `OVER_TARGET_LOOK_IDS` list (the owner's OK, a public diff) and
  its own index states a reason (kept private; printed locally, never in a
  public log).
- **Glyphs a page prints are drawn by Stall's own faces (owner,
  2026-10-06; carried out 2026-10-10 as far as the faces' own fonts go).**
  The four Latin subsets are cut again from the fonts Google Fonts cut them
  from, with every glyph the app prints that those fonts draw: `≈` and `₽`
  on every look, and `→ ◆` and every quote unit's sign but `元` on Modern.
  **What Rural's and Neo's fonts lack is borrowed from Inter (owner,
  2026-10-12, "ok các khuyến nghị", on a picture of the money figures with
  those signs; carried out the same day):** one `@font-face` segment per
  face, Inter's Latin file under the family's own name and descriptors,
  whose `unicode-range` names exactly what the family's own files lack —
  `→ ◆ ₹ ₪ ₩ ₦ ₱` on Stall Serif, roman and italic, and `₹ ₪ ₩ ₦ ₱ ₺` on
  JetBrains Mono — so those signs draw alike on every OS. Costs, stated:
  an italic Rural line sets the borrowed signs upright and `◆` about twice
  the size a machine font drew it, and the Rural ticker's `◆` grows with it
  (shown to the owner after the decision, the same day); while a family's
  own file is still loading and Inter's has landed, the family's metrics
  (`ch`, line height) are Inter's — the failure state is unchanged; the
  change costs every visitor 795 bytes, which leaves a deploy build carrying
  the tracked fixture 10,392 of its room. `元` stays the reader's machine's: a CJK face
  for one sign is a new licence, not decided. **RUB prints `₽` after the figure ("100 ₽"; owner,
  2026-10-10)**, not `р.`: a Cyrillic `р` in a Latin range drew one letter
  of every Cyrillic word a seller writes in Stall's face and the rest in the
  reader's, so no face's range takes a letter of another script.

- **Money figures stand whole on a 360px phone (owner, 2026-10-13, "Theo
  khuyến nghị" and "Ok cứ theo các khuyến nghị hợp lý").** The item face's
  figure, its "You pay" row, the pay sheet's figure (what the wallet signs)
  and Pay several's lines and total step down a size ladder by length, the
  same table for every look (≤14 characters unchanged; 15–17, 18–21, then a
  break after a comma only, the unit kept with the last group); a row's
  figure re-flows onto its own row from 17 characters (a listing) or 18 (a
  quote) and breaks after commas from 21, so a figure loses its tail, never
  its head, and a broken figure is one name to a screen reader. **The pay
  code's gate stays 308px**: below 390px the code's ticket gives the code
  more of the sheet (318/320/310px at 360 on Modern/Neo/Rural), in place of
  the first plan to lower the gate to the painted width — which would have
  drawn Pay several's code for exactly two items and none for one. Rural's
  rows below 390px take their tag onto a row of their own (option (b): 0
  failures at 360 and 375, nothing moves at 390; 55–57 rows move below
  390), keyed on Rural's own row, not a media condition every look gets.
  The probe measures money screens at 360px (geometry), and a broken
  figure's pieces on the contrast pass. Decisions D-2026-10-13-02 and -04.
- **The wall's Cycle figure is fitted to its column, on three rules of the
  owner's (owner, 2026-10-19, D-2026-10-19-03, all three as recommended).**
  (1) **No transition or animation moves a money figure's size**: the fit
  holds every transition on the card off while it measures and puts them back
  once its size is settled (`holdStill`), and the look lint refuses a
  transition of a size on a box that may be a money node and a size in any
  keyframe (`a-look-never-animates-a-money-nodes-size`; the kit lint is
  unchanged, a kit rule being a README line). (2) **The Awning's caption
  shrinks under 790px of frame**: at 1280x900 and 1280x800 Modern under the
  Awning takes the short-frame rules — the code's caption beside it 28 → 22px
  (the one sentence that tells a customer what the code does), the Cycle
  card's padding 40 → 12px, the sign's 22/18 → 12/8px and the status line's
  19/15 → 16/8px — where it passed on main without them; accepted. (3) **A
  figure broken after its commas takes the largest size at which it stands at
  any number of lines, capped by its design size**, where it was 32px and no
  larger; its card is then held clear of the status line at the largest size
  from 32px up that clears. The shape order is unchanged: one line, then a
  listing's `from` stacked, at 32px or more, before a break.
- **A touch quote row's figure stands clear of its stepper (owner,
  2026-10-20 and 2026-10-26, D-2026-10-20-09, D-2026-10-20-12 and
  D-2026-10-26-02, all as recommended).** On main, the touch wall's stepper
  and a quote's figure stood on each other at 768x1024, 1024x768 and
  800x1280, on every look. Under 1280 wide in landscape the stepper now
  stands under the name and the figure takes the line under both. Under
  1080 wide in portrait the figure takes its own line and the picture is
  104px, not 160. From 1280 to 1919 the row is main's, unchanged. **Accepted
  cost: rows 42–51px taller, and 25 cells where main's first price stood
  whole and clear and the taller row now cuts it at rest** (payment screens
  1080–1200 tall or 1501–1600 tall, the yard or the Awning at about
  1000x1112). Against that, about 1,280 cells gain a first price that is
  clear of the controls. Landscape walls under about 870 wide and
  near-square portrait walls are not supported yet (§ Open).
- **A first-party look's state rules set only what a state may (owner,
  2026-10-20 and 2026-10-26: D-2026-10-20-08, -10, -11 and -13 (3), all as
  recommended).** The probe measures every screen at rest. It paints no
  hover, focus, press or turned wall, and no closed fold. So a first-party
  look sheet's rule under any of these states sets only an allow-list:
  - the ink, as a literal or an opaque palette role;
  - a ground or gradient;
  - an edge colour (colour only; no border or outline style or width);
  - a shadow (each layer coloured, at most two outer layers, blur at most
    16px, no spread, offset at most 8px);
  - a cursor keyword;
  - an identity transform, a transition, or a transparent tap highlight.

  The states are every pseudo-class but the structural ones, plus `[open]`,
  `[hidden]`, `[data-turn]`, `[data-state]`, `[aria-disabled]`,
  `[data-over]`, and the `data-format` and `data-code` values no screen
  paints. A pseudo-element under a state sets less still. Beside the belt,
  at rest:
  - a pseudo-element's paint is its own;
  - a paint that reaches past its box names its own colour;
  - outlines, underlines, strokes and blurs are capped per declaration;
  - no custom property holds the ink;
  - a rule runs only its own sheet's top-level keyframes;
  - no keyframe sets `display`, `content-visibility`, `visibility` or
    `all`;
  - no `light-dark()` and no dark colour scheme.

  **Cost:** a first-party look cannot change type, spacing, padding or an
  underline on hover. The kit lint is unchanged; a pointer's hover is checked
  at intake. Probe and lint cannot be a complete fence against a look written
  to cheat; what they leave is stated and checked at intake.
- **Nothing covers money, with or without a hit area (1a and 1b; owner,
  2026-10-20 to 2026-10-29: D-2026-10-20-13 (1) and (2), D-2026-10-26-01,
  D-2026-10-27-03 and D-2026-10-29-01, all as recommended).** The probe asks
  every money node and every protected box, on every geometry pass, with
  `pointer-events` forced on (1a), and reads every paint that has no hit
  area (a shadow, an outline, a neighbour's underline, a blur) for how far
  it reaches past its box (1b). Both fail the run. The points over a glyph's
  ink are at most 3px apart down its centre and along its middle row
  (`INK_LINE_PITCH`): a thin band over half a digit of a price at a phone's
  width had passed until then (the critic's PB). A finite animation filled
  forwards is asked again at its end. A blurred layer counts where the
  composite reaches 0.2 (`BLUR_OPACITY`), and a reach that meets a protected
  box by more than 1px fails. One reach is accepted by name: Rural's sign
  board over the address plate at the desk (a real overlap, 142 would-be
  failures at 1280, a plate that stays legible), keyed on the kind, the
  tags, the classes, the computed shadow and the target, with a composite
  ceiling of **0.25** (D-2026-10-29-01: at 0.23 half a pixel of drift turned
  142 passes into failures). Raising the general threshold to 0.25 was
  refused, since it would take a 4.5:1 figure to about 2.9:1. **Costs,
  stated:** the denser points added about 6.5 to 7 seconds (2.17 million
  probes to 4.66 million), paid back by cutting the horizon's worst-case
  read to its three pinned jobs (about 15 to 17 seconds; its guard against
  a lower reading is gone on about 92 jobs). 1a does not hit-test a point
  behind a scroller's clip (it is counted, and `CLIP_SKIP_CEILING`, 0.3,
  fails a pass over it; D3 (a) of D-2026-10-20-06, the owner's), so a pay
  code below the first screen is hit-tested only on a contrast job, whose
  shot is grown to hold the page; at 360 and on a geometry-only screen it is
  hit-tested by nothing (the eighteenth review's correction).
- **A code's modules are read in pixels, and a turned code is read upright
  or fails closed (1d; owner, 2026-10-26, 2026-10-29 and 2026-11-09:
  D-2026-10-26-04, D-2026-10-29-01 and D-2026-11-09-01, all as recommended;
  by recommendation under the owner's standing instruction of 2026-10-30:
  D-2026-10-30-01 and D-2026-10-31-01).** On every contrast job each
  module's centre pixel of every code is held to the matrix `qrSvg` drew: a
  dark centre above 10 or a light one under 245 on any channel fails, and a
  module under 3 device pixels fails closed. A rule on every geometry pass
  holds every code to black on white with its modules where `qrSvg` put
  them, and the quiet zone is read white. The kit's probe owes every
  `CODES_REQUIRED` code to both reads, as the public looks do (a turn of
  0.01° had taken a pay code out of both). A code in a turned frame is read
  on a frame with every transform held off, and only where its frame does
  nothing but turn (2D, orthonormal, positive determinant), no corner of
  the code moves more than 1.5 modules when the turn is held off
  (`UPRIGHT_TRAVEL_MODULES`) and no mask, mask border or clip stands on its
  chain; otherwise it fails closed and says why. **Cost, stated:** a look
  that wants a mask over a turned code is red until a read on the painted
  frame at rotated sample points exists (D-2026-11-09-01 (a); its option
  (c) was not built). A code on a geometry-only screen, at the wall sizes
  the contrast pass does not paint and at 360 is not read in pixels.
  Builder choices cited here: D-2026-10-30-03, D-2026-10-31-02 and
  D-2026-11-09-03.
- **Every money character is read where a mover is near, and not on every
  money job (1c; owner, 2026-10-20: D-2026-10-20-06 D1; by recommendation
  from 2026-10-30: D-2026-10-30-02 and D-2026-10-31-01; owner, 2026-11-09:
  D-2026-11-09-02).** On a contrast job whose paint holds a moved,
  sticky or absolute box, a motion path or an animation that sets more
  than an ink, a ground or an opacity near a money node, each character of
  the node is read on its own against a reference drawn in the page: under
  half of it (`CHAR_KEEP_CUT`, 0.5) fails, and a reference under 6 pixels
  (`CHAR_REF_MIN`) is counted and not held, **so a decimal point or a comma
  at a small size is not held: stated, and kept.** On a turned frame the
  reference is the largest count among the phases whose masks match within
  0.2 (`TURN_MATCH_MARGIN`). A job the trigger fired on that read no
  character, a touched node with every character dropped and a job whose
  prepare answered no trigger all fail, and the trigger is owed per look
  and per viewport. Each run plants a mover and the trigger must find it
  (`the-trigger-fires-on-a-planted-mover`). Each character's share is
  divided by its node's median where that is over 1 (D-2026-11-09-02):
  measured on the clean tree with every money job read, 0 characters under
  the cut and the least normalised share 0.545. The critic's figure of
  three quarters of a stroke passing was not what the measurement found;
  the true gap was a band of 0.375 to 0.5, and it is closed. **The owner's
  D1 (a), reading every money job, is measured and not built** (+27 to +37
  seconds on a run of about 222 to 241 against a ceiling of 300); the
  trigger costs about 0.4 seconds of wall time at three tabs. **Not read,
  stated:** a cover placed by stacking alone, an unmoved box's reach and a
  cover of under half a glyph.
- **The ground under a money figure is read to the stall, where its stops
  and tiles fall (3a; owner, 2026-10-28: D-2026-10-28-01 J1, J3 and J4; by
  recommendation, 2026-11-09: D-2026-11-09-04, D-2026-11-09-05 and
  D-2026-11-09-07).** The dress rule reads every paint under the figure up
  to and including its stall, and a ground under 3:1 against the ink (a
  cell of half opacity or more, `DRESS_GROUND_ALPHA`) fails. A tile stands
  where its size and position put it, a stop bears on a cell only where its
  gradient line falls, and a value the read cannot parse is read the strict
  way. One model serves the dress rule and the older ground read
  (`groundStackFault` is replaced); on the clean tree 3,339 false failures,
  3,324 of them Rural's punch-hole ring, went to 0. A box that stands in
  more than one fragment is read strictly and none of its tiles counts as
  covering (D-2026-11-09-05 and D-2026-11-09-06). **Each paint is read by what separates it from
  the figure** (D-2026-11-09-07, the eighteenth review): every box is held
  upright in one flat frame, each box's transform read first, and a paint on
  a box is placed in the ink's frame through the transforms strictly below
  that box, per piece of ink (a transform at the painting box or above moves
  paint and figure both and cancels; a shift or a scale is exact, a turn is
  cut into pieces it moves by about a pixel). It replaced holding each box
  at one place (D-2026-11-09-06), which went wrong three times for one
  reason, a figure needs two places, one for a paint inside a transformed box
  and one for a paint above it (UP2d, SCL3, CASE-E, CASE-F). Each run plants
  grounds and the read must fail and pass them
  (`the-ground-read-fails-a-planted-ground`). **Costs, stated:** about 4.5
  seconds of wall time at the bind (the per-pair read's own is in
  PROBE-RULES); a clip on a box above a transform is read in the flat frame,
  and a gradient's stops under a scale between it and the figure are read
  strictly; and **a background that moves on a box
  above a figure (its position or size, between two reads) is not read**
  (D-2026-11-09-04: reading it would add about 7.5 seconds, 225.2 to 234.8,
  and doing it after the port, when time allows, was the recommendation;
  § Open has it).
- **Money is read at every keyframe and at the end of a lasting animation
  (owner, 2026-10-26: D-2026-10-26-03 (1), as recommended).** Every
  animation on a money node, on an element under it with text or on a box
  above it is seeked alone to each keyframe offset and to 0 and 1, and the
  figure's held dress, its ground and its cut text are read there. This
  closes PT2 (a keyframe that made the ink transparent for part of a cycle)
  and PF2 (a cover that slides in at the end of a run and stays). The end
  read is pruned where nothing asked can be covered. **Cost, stated:** the
  end read cost about 7 to 8 seconds of page time over the geometry passes
  before the prune and about 1 second after, and the keyframe offsets 4.2;
  what lies between two offsets, and two animations at once, are not read.
- **First-party look sheets are fenced where no pass paints (owner,
  2026-10-20 to 2026-10-27: D-2026-10-20-07, D-2026-10-20-13 (3),
  D-2026-10-26-03 (2), D-2026-10-26-04, D-2026-10-27-01 and
  D-2026-10-27-02, all as recommended).** In a first-party look sheet no
  transition or keyframe changes the size, spacing, zoom or scale of a
  money node (D-2026-10-20-07, widened from `font-size`); no keyframe sets
  `display`, `content-visibility`, `visibility` or `all`
  (D-2026-10-20-13 (3) added `visibility`), an inherited ink or a custom
  property (D-2026-10-26-03 (2)), a background or a shadow; SVG paint
  stands only on a drawn icon (D-2026-10-26-04); and there is no anchor
  positioning at all (D-2026-10-27-01), because a box placed by `anchor()`
  follows its anchor's transform and carried the pay figure out of its clip
  (the critic's PAN). The probe reads that road too, and the kit's
  `workshop:probe` refuses every paint whose sheet declares `anchor-name`
  (D-2026-10-27-02), which closes the family on the kit's side and drops
  about 28 seconds of extra measuring. **Costs, stated:** no first-party
  look uses any of these, and the private look at 0x04 passes them; a
  creator's look cannot use anchor positioning, and the kit's lint admits
  the rest and leaves it to the probe and to intake. D-2026-10-20-07 also
  kept, on the owner's word, six Cycle figures at 26 to 31.6px at 1024x768
  and 11 cards whose wrapped figure stands under half a pixel from the
  status line.
- **The probe runs three tabs by default on six cores (owner, 2026-10-27:
  D-2026-10-27-04; CI's two tabs, 2026-10-20: D-2026-10-20-06 D6).** A
  machine with at least 6 cores and 8 GiB runs three tabs, 4 or 5 cores two,
  and anything smaller one (`LAYOUT_CONTRAST_TABS` overrides, and the reason
  is printed). CI's manual job stays on two. The two further trials the
  owner asked for passed: 231.0 to 231.6 seconds against 253.4 to 255.5 on
  two tabs, every verdict identical byte for byte, and memory pressure never
  reached critical. **Cost, stated:** on 8 GiB the margin is memory (up to
  about 480 MiB swapped at three tabs), and the run's ceiling stays 300
  seconds.
- **The kit README's labels, and what stays "most" (owner, 2026-10-20:
  D-2026-10-20-06 D1 (c), D2, D3 (a) and D4 (b), as recommended; the money
  label's wording by recommendation, 2026-11-09: D-2026-11-09-07; done at
  step 10 of the before-8g2 chapter and scoped at the eighteenth review).**
  "Most" was kept until the reads above bound. "Money is never covered, cut
  or faded" now says the kit's probe reads whether anything cuts or fades
  the prices and text on every screen and state it paints, and whether
  anything covers them on the first screen there; and, at 390, 1280 and 1920
  wide on the screens it samples, what stands below the first screen, the
  codes, the contrast, and the digits where a box is moved near a figure or
  a figure is broken. That is weaker than the wording it replaced ("covers,
  cuts or fades this on every screen and state it paints"), which promised
  more than the kit reads: a cover below the first screen on a geometry-only
  screen passes the kit's probe (`kit-BF1`) and so does a fade on a box
  above a code on one (`kit-KQF1`). 1c reads where its trigger finds a
  mover, and the contrast pass skips the geometry-only screens. **The QR
  paragraph keeps "most" for covering** (D4 (b)): 1a hit-tests nothing
  behind a scroller's clip, so below the first screen a pay code is
  hit-tested only on a contrast job and at 360 and on a geometry-only
  screen not at all, and reading it at scroll stops (D3 (b)) was not chosen.
  **Whose wording:** D4 (b) is the split of the README's label and "most"
  on the QR paragraph. The QR paragraph's clause on what the probe reads of
  a code ("reads a code's colours, and on the screens it samples its margin
  and modules") and "The whole price is never dressed to misread" taking
  the label of "A price is dressed as one piece" are the window's, under
  the owner's standing instruction of 2026-10-30. D5 (a) of D-2026-10-20-06
  was the block list for a state rule, which D-2026-10-20-08 replaced with
  the allow-list (the state belt, above).
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
- **The listings strip is one row, and the labels shrank to fit it — BUILT
  2026-09-22.** The basket board's item 3 (`private/design/basket-2026-09-21/`,
  C11): the find field and the sort select on one row at every width, a drawn
  lens in the field, the orphan label line gone. Ported with one measured
  deviation. The board folded the word "Sort" into each option ("Sort · Price,
  low first"); its mock was Modern at 390px, and Neo's mono runs ~9.6px a
  character, so that option is a 264px select on a 366px strip and the find
  box is left 92px. So the word is the select's `aria-label` instead, and the
  options each name an ordering on their own ("By shelf", "Low price first",
  "High price first", "By name"). The same measurement took the placeholder to
  one word: with the lens in the field, Neo has 115px of text room and "Find
  an item" is 116. What this bought, measured at 390px on the three looks: the
  strip is 44px tall against 123, the field 159–204px and the select 140–197px,
  with nothing cut. What it cost: "Price on card" is gone from the sort, so
  the words no longer say which figure on a row they order by — this rail
  paints no other, and C11 said nothing rests on the old wording.
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
  (`DeepLinkBuy`, `OrderBook`). **Kept as it is (owner, 2026-10-08)**, after
  a re-read of Cashtab at b558b928e: a BIP21 cannot take an Agora offer (the
  take's covenant signature covers the whole transaction, so only the
  buyer's wallet can build it at the moment of buying), and the Agora
  deep-link standard still has no parameter naming a maker or an offer —
  unknown parameters are ignored, so one added to `BUY` would fall back to
  the cheapest offer of anyone on an older wallet. A one-press buy of this
  seller's offer needs a new action upstream (one an older wallet refuses);
  not proposed for now.
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
- **A payee named by an NFT** (owner, 2026-10-05) — the look rail paying
  whoever holds a role's NFT instead of a pinned address, so a wallet
  changes by moving the NFT. No payment this app composes takes its
  destination from the index today; this would, and the three hosts are one
  operator, so one lying answer sends the whole price to the wrong party,
  and the licence then fails on every honest node. It also stands against
  "Licences are transactions, not tokens" and "not by an NFT" above, adds a
  holder-at-height read to every licence check, and lets one burn or one
  Agora listing stop a look selling. The rotation it wanted is met by pinned
  addresses (a primary and a cold standby per role is the recommended shape,
  not yet decided).

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
- **A multi-item payment memo is a second shape of `STLP`** — BUILT
  2026-09-22, never a new LOKAD: push 1 is a marker byte `0x00` **on its own
  push**, then a list of 4-byte token-id prefixes with quantities, which an
  un-updated reader refuses (it files the payment as `other`, with no claim)
  — the § Firma rail's "bad trade" is overridden here on the owner's reason:
  an amount with no items is nothing to reconcile against. Three things moved
  at the port, each measured and each recorded in
  `private/design/basket-2026-09-21/PORT-STLP-SHAPE-2.md`. **The marker is
  its own push**: inline, an ordinary five-item selection with one count past
  255 lands the list on exactly 32 bytes, which an old reader would read as a
  single-item claim; its own push makes the refusal structural and deletes
  the pad rule. **The prefix floor and the link's own width are two numbers**
  (owner, over the measurement): the parse accepts from 8 hex so a memo's
  prefix pastes back, and the link keeps 12, because 8 buys no QR modules on
  any route form — 37 / 41 / 41 either way — while 32 bits is grindable and a
  printed tag whose quote is later removed would resolve to somebody else's
  item. **The scan code is gated by the composed string, not by an item
  count**: a memo grows with the counts too, so the sheet asks whether the
  code still reaches the one density this project has proved (4.94px a
  module) at the narrowest box it paints in (318px on a phone), which is
  about seven items; above that it says so, and the payment is unaffected.
  The memo holds 35 items at counts under 256 and the byte budget is the
  authority above that. **The touch wall composes no memo**: its code is read
  across a room at 280–360px, where three items are already under the proved
  density. The gate this entry carried — ships after the UI has been used
  once — was put to the owner on 2026-09-22 with nothing pushed yet, and they
  chose to build the wire now.

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

- **P1, narrowed: off every pass, the wall still runs past its status line
  at 1280x720 and on tall narrow portraits, cuts an eight-byte figure's unit
  and the figures of the 35-item payment's rows (from below) at 864x1536, and
  cuts a code inside its quiet zone at 1280x720.** Since
  2026-10-14 the Cycle card's figure is fitted to its column after the paint
  (`src/ui/wallFit.ts`), where a table of sizes by length had been right only
  at the five probed sizes and printed `$999.99` as "$999.9" on Neo at
  1024x768. Each figure takes the largest size, up to its layout's own, at
  which it stands in the price's grid column with its text inside its own
  box and clear of its `from` and its unit: on one line, or with a listing's
  `from` stacked above it where that buys it 15% more; where neither stands
  at 32px, a figure of 12 characters or more as counted (`WALL_BREAK_TIER`)
  breaks after its commas at the largest size that stands at any number of
  lines (D-2026-10-19-03 (3), § Decided), and a shorter one is made smaller,
  to 16px. The digits stay in one node under one `role="img"` name, and the
  fit runs again when the faces land and when the frame changes size. Four
  passes hold it at 1024x768, 1366x768, 800x1280 and 680x1000, every wall
  screen on every look (main's code fails 955, 79, 2,241 and 697 checks
  there). Through the probe at 13 more sizes on 2026-10-19, nothing failed
  that did not fail on main, and ten were green (the three red ones read
  again on 2026-10-20, below; the other ten not). **What the rebase round
  of 2026-10-20 closed**: the stacked shape
  printed ` XEC` over a figure's last digits at six of the nine sizes (Neo's
  `from 1,234,567 XEC` at 1280x900, "XEC" over the last "7"; 14, 12, 23, 57,
  20 and 29 of 381 Cycle figures at 1280x900, 1280x800, 768x1024, 1024x768,
  800x1280 and 680x1000), inside the column the fit and the probe read, so
  until then "1024x768 is measured and green" was false; now 0 at all nine
  sizes, held by `a-cycle-figure-never-runs-under-its-own-unit` and by the
  fit's own reading. **Sizes against main**, every Cycle figure on the
  three shipped looks bare and worn at the nine sizes (2,106 cells, measured
  in Chrome over the showroom): larger in 1,237, the same in 569, smaller in
  300 — 235 of them on cards main's code failed (the fix), and 65 on cards
  that passed on main. **For the owner, the 65**: each a figure main's
  table broke after a comma at 38px over two lines and the fit keeps on one
  line or stacked at 32.3–37.5px (22 at 1280x900, 23 at 1280x800, 16 at
  1366x768, 3 at 1024x768), and one at 800x1280 that main printed at 52px on
  one line in its tall column and the fit prints at 35.4px stacked in the
  counter tablet's card. Letting the break compete with one line would give
  them their size back with more lines and, unbounded, would break figures
  the 1920 and tall walls keep on one line. **Under 32px**, six cells, all
  at 1024x768: Neo's and Rural's `from 1,234,567 XEC` stacked at 29.3 and
  26.4px (11 characters as counted, so built with no break) and Rural's
  `$123,456.78` on one line at 31.6px, bare and worn each. Cost: see the
  rebase round's figures in `layout/PROBE-RULES.md`, "Rebase round
  (2026-10-20)".
  **Still red, off the passes, and this entry's next step** (branch ⊂ main by
  failure, 73 / 25 / 195 against main's 84 / 46 / 327): 1280x720 under the
  Awning and with Rural's yard — the Cycle card and Browse's list up to 30.5px
  past the status line, the touch wall's shop code cut 2–8px from below
  inside its quiet zone with the code already at its floor, and the
  borrowed-token sentence cut 1–6px from below (wholly hidden on main); and
  portrait screens over 1500 tall and narrower than 1080 — at 900x1600
  Rural's card with the yard runs up to 36px past the line, and at 864x1536
  up to 79px, the eight-byte Browse figures on Neo and Rural lose their unit
  ("EC", "XEC") to their card's clip, and **the figures in the 35-item
  payment's rows are cut from below, digits among them**: on Rural with the
  yard the payment's scroller shows 28px of each 48–51px row. That one is
  older than the branch (the same screen fails on main, and no pass paints
  864x1536). What is cut at the three sizes, exactly: at 864x1536 the unit of
  the Browse figures and the payment rows' figures from below; at 1280x720
  and 900x1600 the failures are the ones named above (a card past the status
  line, a code inside its quiet zone, a sentence cut 1–6px from below), none
  recorded as a cut digit. Neither shape has a pass, and the fit's own work
  does not close either.
  **For the owner, behaviour changes this fix made:** a portrait screen up
  to 1500 tall (800x1280, 1024x1366, 768x1366) takes the counter tablet's
  side-by-side card rather than the stacked column; under 790px of frame
  (768-tall walls, and the Awning's 1280x900 and 1280x800, accepted in
  D-2026-10-19-03 (2)) the sign, the status line and the Cycle card's air are
  smaller; below 1280 wide in landscape and 768 in portrait every Browse row
  stands its price across the row; and a money figure's size now depends on
  layout. The two touch-wall changes of the round before were kept by the
  owner on 2026-10-14. The `/guide` question was whether to qualify a tablet
  on its side until this lands: 1024x768 passes every rule since the rebase
  round, so it falls away when this merges.
  Sources: `private/design/workshop-2026-09-23/CRITIC-WALL-CYCLE.md`,
  `CRITIC-WALL-OFFSIZE.md`; `layout/PROBE-RULES.md`, "The Cycle card's figure,
  fitted to its column", "The off-size walls" and "Rebase round
  (2026-10-20)".

- **Before 8g2, the money guards' open list** (the money-guards critic's
  merged list, round 8, `private/design/workshop-2026-09-23/CRITIC-MONEY-GUARDS.md`;
  money-guards merged 2026-10-20 at `0b73b9a`). In order:
  1. **A box moved over money.** A box moved over a money node by a
     relative offset, a transform or a negative margin, or a target's glyph
     scaled over one, is read by no geometry rule except over the price and
     "You pay" (`coveredBy`'s hit test), and there only with
     `pointer-events` left on. The contrast pass reads it as the figure's
     ground, so a cover with its own contrasting ground passes (the
     critic's PC2, PC3′, SVs, PW; PQ over a pay code). The fix to measure
     first: a hit test with `pointer-events` forced on over every money
     node and every protected box, on every pass, false reds counted
     before it binds (1a, bound since 7a); and the digit read on every
     money node on the sampled screens (1c(c), bound since 7d, on the jobs
     where a mover is near: "Before 8g2, 1c(c)'s open list" below). The
     README's "most" went at step 10 where the reads bound, and stays on
     the QR paragraph's covering clause (D4(b) of D-2026-10-20-06, § Decided).
  2. **A run under the private look at 0x04's selection** (`pnpm test` and
     the whole runner), with its sheet grepped first for a `fixed` or
     `local` background attachment near money (now read as possibly
     absent, so a false red at the port), relative offsets and transforms
     near money, animated pseudos, and a look pseudo on a sheet's scrim.
  3. **Round 4's P2s:** a box above's background image off the sampled
     screens and the walk's stop at an invisible or `display: contents`
     box (bound since 3a's binding, D-2026-10-28-01: "Before 8g2, 3a's open list" below);
     a static belt in the look lint for clips scoped to hover, focus, the
     tap highlight or a turned wall; a neighbour's far shadow (failed by
     1b since 7b: N6, "Before 8g2, 1b's open list" below).
  4. **Smaller, stated:** a look pseudo animated invisible at the frozen
     instant (PSa2); a gradient between its stops off the sampled screens
     and at a device pixel ratio over 1 (G2); `markLookPseudos` never
     marks a pseudo of the job's scope element itself (one line); a
     fragmented box's positioning area; the RTL false red in
     `dl.pay-lines`; dashed, dotted, double and 3D borders read as their
     colour.
  The quiet-zone flake's read-again and the coverage table's text match
  landed with probe-shard (merged 2026-10-20 at `2f1d639`): every pass is a
  value in `scripts/probe-passes.mjs`, and wall-offsize's four passes are one
  entry each (`OFF_SIZE_WALLS`), named in `WALL_PASS_NAMES`, from which
  `GEOMETRY_PASSES` and both money surface tables are derived, and shot at
  their sizes. The flake's cause is still unknown.

- **Before 8g2, the fourth review's open list** (the critic's "For PLAN §
  Open", `private/design/workshop-2026-09-23/before-8g2/CRITIC-4.md`; the
  rest of that review is built, `layout/PROBE-RULES.md`, "Before 8g2: the
  fourth review's fixes"). Not built:
  1. **Points below the screen skip the clip and reach checks.** They need
     no hit test, so the cut and the reach can be read for them where they
     stand (this closes D3's cut half).
  2. **A point past a box on an axis whose `overflow` is `visible` is counted
     "behind a clip" and never hit-tested.** The unit test pins this as
     intended; nothing has asked whether it should be.
  3. **The running ribbon's exception excuses every sideways clip of a
     ribbon figure, a look's own clip included**, and a look can dress
     `.tk-run:not(.still)` alone, which no pass reads with its figures in
     view.
  4. **A keyframe on `left`, `top`, `inset` or a margin of a box above money
     moves it between instants.** `keyframeHeld` refuses a moving `translate`
     for that reason, and not these. Since the fifth review the offset read
     seeks them and the self-clip read reads at each offset whether the
     figure's text is cut; what the moved box covers there is not read (1a
     reads at rest and at the end of a lasting animation, and over time only
     the price and "You pay" are hit-tested).
  5. **A size keyframe on the money node itself is held by nothing** but,
     since the fifth review, the self-clip read at each offset (it is
     seeked there, `SEEK_ON_OWN`): a size that cuts the figure is read, one
     that spills it or lays it under something is not.
  6. **`keepsItsEnd` ignores CSS transitions, whose end state lasts.** The
     critic's PTR went red through other reads, and why it was caught at
     rest is not known.
  7. **An outline in a keyframe on a box above is unread between instants.**
     (Its `line-through` half is read since `4264938`: the offset read holds
     `-webkit-text-decorations-in-effect`; the fifth review's PLT is red at
     390, 28.)
  8. **A cover keyed to a class only a press adds (`.sel-enter`) is never
     painted.** And the day a fixture paints a press, the app's own one-shot
     entrance (`sel-unfold`, `sel-fade`, `sel-line-in`) goes red on
     `keyframeHeld` and on 1a at rest: such a fixture lands with a read of
     the entrance at its end.

- **Before 8g2, the fifth review's open list** (the critic's "For PLAN §
  Open", `private/design/workshop-2026-09-23/before-8g2/CRITIC-5.md`; the
  rest of that review is built, `layout/PROBE-RULES.md`, "Before 8g2: the
  fifth review's fixes"). Not built:
  1. **The end read's prune ignores stacking** (the critic's item 11): it
     compares a clip box with 1a's asked boxes and points in viewport
     coordinates, so a marquee's cell behind an open sheet or poster that
     overlaps the sheet's Pay, Close, code or tag figure on screen is read at
     its end though the sheet stands over it. Conservative (it reads more),
     and the clean tree's 161 end reads are such paints; a prune that knew
     which surface stands over which would leave them out.
  2. **`outerShadowOnly` reads the figure's box, not its ink, and reads the
     animated box's corners square** (the critic's item 12): a rounded box
     whose shadow pulses outside a corner the figure's box stands near is
     taken as outside every glyph. Kit-only: the first-party belt refuses a
     shadow in a keyframe. Not planted.
  3. **The kit's twin rule accepts a twin nothing reads** (`mask-box-image`
     beside `-webkit-mask-box-image`, `tap-highlight-color` beside
     `-webkit-tap-highlight-color`): the first-party lint holds the twin to a
     property since the fifth review (`PREFIXED_TWINS`), and the kit keeps
     the rule its README states. A README line for the owner. Beside it, in
     both: a prefixed property Chrome does not list (a `-moz-` one) keeps the
     name less its prefix as its twin, not held to exist.
  4. **A code's size is held by nothing but its squareness and the pay
     code's width gate** (the critic's PQZ, read on page passes only): a
     look that shrinks a share, studio or record code to a few pixels, with
     a box kept, passes the code hold and the per-screen owe.
  5. **What the self-clip read at an offset does not read**: a figure a
     keyframe spills (the spill rules read the instants alone) or lays
     under another box (1a); a `.fig-say` parent that is no money node (the
     self-clip rule's own subjects); a value between two offsets; two
     animations at once. And the end read's prune rests on Chrome's clipping
     as measured per display (`CLIPPING_DISPLAYS`, Chrome 156 only). Its
     positioned-descendant condition bears no load there: the sixth review
     measured that a transform animation filled forwards keeps its box the
     containing block at a computed `none`, and its PPD read the same with
     and without it; it stands as a belt for another engine.

- **Before 8g2, the sixth review's open list** (the critic's "For PLAN §
  Open", `private/design/workshop-2026-09-23/before-8g2/CRITIC-6.md`; the
  rest of that review is built, `layout/PROBE-RULES.md`, "Before 8g2: the
  sixth review's fixes"). Not built:
  1. **`mask-position-x` as a twin** (the critic's P3): `PREFIXED_TWINS`
     maps `-webkit-mask-position-x` and `-y` to no twin, measured in Chrome
     156 alone; Firefox may read `mask-position-x` and `-y` (not checked:
     no network). The refusal now says the name less the prefix "names no
     property Chrome reads", true either way; whether a first-party sheet
     should instead be held to write `mask-position-x` beside it is open. No
     served sheet writes either.
  2. **The `offsetHeld` pins hold text, not choice**: they pin the blocks
     that make the offset reads, guards and style reads included,
     `movesOtherBoxes`, and since the seventh review the lines that take an
     animation in (a pseudo-element's among them), the off-walk gate, the
     moves cache, `inkSignature` and the gather and report of the figures
     the dress rule does not read; not which animations on a figure's walk
     reach the reads by `seekNeedless`, `outerShadowOnly`, `groundOnly` or
     the timing set for the seek, nor the helpers the reads call. A
     mutation there is caught only where a red proof exercises the branch
     it breaks.
  3. **What a keyframe off a figure's walk does to it, but cut its text**:
     such an animation is seeked for the self-clip read alone, so one that
     spills the figure over another box, lays a box over it or changes its
     ground between the instants is read by nothing.
  4. **A ground box above that moves while the glyphs stand still**: its
     offsets or a margin over a figure positioned against a box above it
     (a size there is refused at its written value) changes no
     `GROUND_SIGNATURE` longhand and no text rect, and the ground is not
     read again.
  5. **`MOVES_NO_OTHER_BOX` rests on one engine's measurement**: the
     seventh review found it false twice (a table row's `visibility`, PVC;
     an anchor's transform carrying a box placed by `anchor()`, PAN), and
     since then every longhand on it was measured one at a time in Chrome
     156 on a page of its own (with an anchor, and on a flex, block and grid
     item with no anchor), not in the probe and not in another engine; a
     figure not rendered at the pass's last instant is not read at an
     offset (a keyframe that renders it is refused in a first-party sheet;
     the kit's road is unread).
  6. **A code's modules between instants**: the code hold, its place read
     included, reads a code at the pass's last instant; a keyframe that
     carries the modules off the matrix between the instants is read by
     nothing (not planted).

- **Before 8g2, the seventh review's open list** (the critic's "For PLAN §
  Open", `private/design/workshop-2026-09-23/before-8g2/CRITIC-7.md`; its
  B1 and its pins are built, `layout/PROBE-RULES.md`, "Before 8g2: the
  seventh review's fixes"). Not built:
  1. **The older reads that assume a transform or an offset moves only its
     own subtree**: `endMoot`'s prune (a lasting transform inside a clip
     that meets nothing 1a asked is left out of the end read), the
     transforms `SEEK_NEEDLESS` leaves unseeked on a box above (where the
     dress reads are not made at an offset; the self-clip read is, where an
     anchor can follow them), the turns `BOX_HELD` lets a box above keep,
     and the end read itself. A box placed by `anchor()` elsewhere on the
     page follows them. **Closed for first-party looks by the lint** (they
     write no anchor positioning, `a-look-never-positions-against-an-anchor`)
     **and on the kit's road by its probe** since D-2026-10-27-02: the
     kit's probe fails every paint of the kit's look while its sheet
     declares `anchor-name` (`the-kit-takes-no-anchor-positioning`), so no
     named anchor reaches a kit look the probe passes. Not planted beyond
     that refusal's own red proof (`layout/PROBE-RULES.md`, "The kit's
     probe refuses a sheet that names an anchor").
  2. **The probe's hidden scrollbars**: the probe's Chrome runs with
     scrollbars hidden, so a scrollbar a transform's or a keyframe's
     overflow adds where scrollbars take room (a classic scrollbar) — which
     narrows the box it scrolls and can squeeze a figure in it — is
     measured by no pass. An older assumption of the environment, not of a
     read.
  3. **What an anchored box does that the self-clip read does not read**: a
     figure an anchor carries over another box or off screen with no clip
     to cut it, and **a figure `position-visibility` hides**. Chrome 156
     stops painting an anchored box when its anchor is carried out of a
     clip that does not cut the box itself, and when its anchor is
     `visibility: hidden`; the anchor's `opacity: 0`, `clip-path` and
     `scale: 0` do not (the eighth critic,
     `private/design/workshop-2026-09-23/before-8g2/critic8/pages/`). No
     read the probe makes sees it: the hidden box still computes `visible`,
     `checkVisibility()` answers true, and hit testing skips it, so 1a
     reads the box under it. Plant PAV (PAN's anchor with the move taken
     out, a keyframe `visibility: hidden` on `.item-u` from 30% to 40%):
     the six pay screens at 1280 read 0 failures on `8bdd315` (a quick
     read) while the shot at 35% shows the line "Your wallet signs" over
     nothing. The kit's road only: first-party looks write no
     `anchor-name`, `position-anchor` or `position-visibility`. **Closed for
     a named anchor** by D-2026-10-27-02: `workshop:probe` refuses every
     paint of the kit's look while the kit's sheet declares `anchor-name`,
     and the workshop README says so in one line.
  4. **`sheetFacts` can go stale**: an `@import` still loading
     (`styleSheet === null`) is skipped rather than counted as unreadable,
     and the cache is keyed by the sheet counts alone, so a sheet whose
     rules change without the count changing is not read again. Neither is
     reachable today (both lints refuse `@import`, and the probe's own
     `replaceSync` sheets set no `anchor-name`); not planted.

- **Before 8g2, 1b's open list** (paints with no hit area; bound since step
  7b, `layout/PROBE-RULES.md`, "Before 8g2, 1b", "Before 8g2, 7b: 1b binds"
  and "Before 8g2: the thirteenth review's fixes"). Built at 7b and off this
  list: Rural's board over the address plate accepted by name
  (D-2026-10-27-03, `REACH_ACCEPTED`), UL2 failed by the bind (the lint's
  underline cap is left as it is), and the keyframe seek widened (the ninth
  critic's L1 and K1). Built at the thirteenth review's fixes and off it: a
  look pseudo an animated box holds is seeked (B2, KTSK2), a box under an
  open sheet's scrim is not read from its keyframes' values (B3, BKV's 30
  false failures), `reachersOn`'s look-pseudo hosts under `only` held to the
  open surface, the accepted meet's own key held by a test
  (`an-accepted-meet-does-not-stand-for-its-pair`), a keyframe's text-shadow
  read on the owners that inherit it (`textShadowHeirs`), the accepted list
  judging the most over all the target's boxes, the board's ceiling raised
  to 0.25 (D-2026-10-29-01), and the run under the private look at 0x04's
  selection (the thirteenth critic's: 1b 0 failures and 0 wide seeks on
  every pass). Built at the fourteenth review's fixes and off it: an heir
  with a transition on its text-shadow is an heir (M1, KTSH;
  `textShadowHeirs` holds the transitions of every element under the box).
  Open:
  1. **Pseudo text past its width is under-read** (the ninth critic's P2,
     not planted): a pseudo's region is its own resolved width (an inline
     one's, a font size a character), grown by one font size; text that
     runs past that width (`white-space: nowrap`, a `letter-spacing`)
     stands outside the region.
  2. **The region model is proved by structure alone** (the ninth critic's
     P3): PW is a pseudo of a box whose region holds the figure's ancestor;
     a plant of a pseudo that is not an ancestor of the figure's row, moved
     onto it by its offsets alone, is still to be made.
  3. **Not read by 1b, stated:** paint order (a meet is a meet whichever
     paints last); several reachers' blurs together (each reacher's layers
     are composited alone); a pseudo-element's exact box, and a decoration
     line on a pseudo's text; a reach between two keyframe offsets, and two
     animations at once; a box inside a scroller held to one the scroller
     does not carry, or to a sticky box, at any scroll but the one the paint
     stands at; a column rule; an SVG element's own overflow; a glyph's
     shape and text over several lines (its line boxes, an ink box an upper
     bound); the contrast pass's paints (1b runs on the geometry passes
     alone); and a box behind an open sheet's scrim, raised over it by a
     `z-index`, whose paint with no hit area lies over the sheet's money
     (every road holds its reachers to the open surface; the fourteenth
     critic's item 3, not planted).
  4. **The accepted reach is keyed on exact strings** (`REACH_ACCEPTED`):
     a Chrome that serialises a computed shadow or colour another way, or a
     change to Rural's board, plate or mood, takes the 142 back to
     failures. That fails closed (red, never silent), and is the cost of a
     key no look's class is in.
  5. **The board's ceiling is still a tripwire, with a margin now**: at
     0.25 (it was 0.23) the board composites 0.2285 at rest; with the
     address plate moved up by a relative offset, 0.2389 at 2px, 0.2438 at
     3px and 0.2486 at 4px stand accepted, and 0.2532 at 5px fails (7 on
     the desk's `offers`, a quick read; `critic13-fixes/runs/q-BUP*.log`).
     So between 4 and 5px of drift toward the board turns the 142 red,
     where half a pixel did at 0.23. It fails closed. The pinned shadow caps the
     composite at its own alpha, 0.322 as the probe reads it.
  6. **A move of a box that holds nothing 1b reads is left out** (`unmoved`:
     no reacher, no target, no look pseudo at rest): sound by mechanism, a
     transform, an offset or a motion path carrying only the box and what it
     holds where no anchor can follow; no plant proves the gate itself.
  7. **`an-accepted-meet-does-not-stand-for-its-pair` pins `judgeReacher` by
     its text** (the fourteenth critic's item 4): `sayReach` is held by
     behaviour, but `judgeReacher` only by what its body says, so a key
     added to the pair in the accepted branch some way the pin does not
     name (`Set.prototype.add.call(said, key)`, the critic's mutation)
     restores `87ee812`'s bug with the three files' 34 tests green. A
     behavioural test would drive `judgeReacher` itself, which lives in
     `layout/probe.ts`, whose module runs the probe page's own top-level
     code when it is imported; not built.

- **Before 8g2, 1d's open list** (a code's modules read in pixels; bound
  since step 7c, `layout/PROBE-RULES.md`, "Before 8g2, 1d: the code's
  modules", "Before 8g2, 7c: 1d binds" and "Before 8g2: the thirteenth
  review's fixes"). Built at 7c and off this list: the bind, its codes owed
  by name (the quiet zone's `CODES_REQUIRED`, every look's own quiet-zone
  reads, each carried look on its own), and the flake count read first —
  seventeen sightings in the kept logs, eleven at two tabs and six at three
  (7c counted fifteen and four at three; the thirteenth critic found the two
  this step's own plant runs held), every one since the read-again existed
  white on its fresh pair. 1d read again five times in those logs, each
  right on the pair and each on a quiet-zone sighting's own code: 1d is hit
  exactly when the quiet zone is. Three tabs stay the default, and go back
  to two if a sighting ever fails a run (now a failure of 1d and the quiet
  zone together). Built at the thirteenth review's fixes and off it: a code
  in a turned frame read upright by both reads, every transform above it
  held off, or failed closed (B1, the owner's D-2026-10-29-01); a code read
  whole or failed closed (item 8); the kit's look owing `CODES_REQUIRED` on
  its probe (D-2026-10-29-01); and the run under the private look at 0x04's
  selection (the thirteenth critic's: 1d read no code wrong). Open:
  1. **The canary's reads again of 1d are said, not failed**: 1d is not in
     the job's record the canary compares, so a 1d reading that differs on
     the canary's tab fails nothing; the walk's read of the job decides.
  2. **A contrast target's glyphs laid over a code are not read** (PQG: the
     code's own lede moved up over the modules, 44px black glyphs and no
     ground, reads 0; 1a fails it, both lints admit it): the prepare blanks a
     target's glyphs on the capture 1d and the quiet zone read. Reading the
     code on a capture with no glyph blanked would close it; its cost is not
     measured.
  3. **Codes not read in pixels**: every code on a geometry-only screen, at
     the wall sizes the contrast pass does not paint, and at 360 — the
     quiet zone's own list, 507 painted codes on the clean tree. So the QR
     paragraph keeps "most" for covering (D4(b), the critic's P2-7) unless a
     pay code below the first screen is read at scroll stops too (D3(b)).
  4. **The payload is held only on the wall's plate.** 1d reads the matrix
     off the path's `d`, the one `qrSvg` drew from `qrMatrix(text)`; the app
     carries a code's text in the DOM only on the touch wall's plate
     (`data-pay-uri`). A `data-*` attribute on every code would let 1d hold
     each to its payload: an app change (every visitor's bundle, and a link in
     the DOM the pay sheets keep out of it on purpose). **Not added**
     (CRITIC-10's judgement 2, decided by the window): it would catch only
     an app bug that hands `qrSvg` the wrong text, which the composers'
     tests hold, and a look cannot change the `d` attribute; the owner's
     to reopen.
  5. **A paint that misses every centre** (a line thinner than half a module
     along the seams, a cover smaller than a module between centres) is not
     read; whether a camera reads through it is not measured.
  6. **A turned code is read upright, not as it stands, and only where its
     frame only turns and holding the turn off moves it at most 1.5
     modules.** The frame the two reads take holds off every
     transform on the code and the boxes above it, and nothing else: a box
     whose place a transform there decides (an absolute or fixed box whose
     containing block the transform made) can stand elsewhere on that frame
     than it does on the job's, and a cover laid that way over a turned code
     is read where it moved to (1a reads the job's own frame). **The code
     itself stands where the held frame puts it** (the fifteenth review's
     B1, the owner's D-2026-10-31-01): holding off a `translate`, or a turn
     about a far origin, moves it, and a mask or a clip that did not move
     with it was read in the wrong place — PTO2 (every Modern pay code
     carried 140px down into a masked band) passed the whole runner, and
     P45 (a 45° turn about the code's own centre, its corners past a mask)
     passed a check of the centre alone. Since then a code that holding the
     turn off moves at any corner more than 1.5 modules fails closed for
     both reads (`uprightCornerTravel`). **A mask, a mask border, a clip-path
     or a clip on the chain fails the code closed** (the sixteenth review's
     B1, D-2026-11-09-01): the held frame puts the masking box back with
     everything else, so it moves the mask against the code while the code
     stands still (PRM2: 45px of every Modern pay code masked off at travel
     0.00 modules; PCT: the matrix's first two rows at 1.45), and the 1.5
     module bound said nothing of it. What the bound still covers is a box
     whose place the held frame changes with no mask on the chain; on the clean tree a corner of Rural's
     Cycle codes moves 0.99 modules, of its wall code 0.55. A transition
     already running on one of those boxes is cancelled by the hold and does
     not resume (observed in Chrome by the fifteenth critic on the heirs
     `textShadowHeirs` holds through the same `holdOff`, not on a code's
     box). The box placed by a transform and the transition are not
     planted. Since the fourteenth review's M2 (the owner's
     D-2026-10-30-01) a code whose frame also scales, skews, mirrors or
     leaves the plane (`turnOnly`: every box from the code up with `scale`
     none or 1, a `translate` with no z, a `rotate` with no axis, a
     `transform` 2D and orthonormal with a determinant above 0) fails
     closed for both reads unread, where the held frame read it as a code
     the page does not paint (PSCT and PMIR passed the whole runner). A
     turn `angleOf` does not read adds no turn: a code turned only by a
     `transform` about another axis, a `rotate` about the x or y axis or a
     motion path is read as it stands on the job's frame (P3X and PMP read
     red there; PMP20, a motion path's 20°, reads dark there, a false red on
     a code that would scan), and one turned edge-on (P3Y,
     `rotateY(89deg)`) leaves `codeZones` and is read by no pixel read and
     said by no line (the geometry fails it, 40 at 390; item 7).
  7. **A code can leave `codeZones` with nothing said** (the fourteenth
     critic's PZ and P3Y): `quietZoneOf` subtracts the svg's padding, read
     unscaled, from its box, read scaled, so a padded code shrunk uniformly
     or squashed edge-on has no content side and is no zone — read by
     neither pixel read and owed by neither (the critic's PZ: the share code
     at 5% read on 7 jobs, not 9). Latent: no wrapper holds a padded code
     alone, and the pay codes are gated. A line, or a failure, for a painted
     code with a box and no zone would close it; not built.

- **Before 8g2, the fourteenth review's open list** (the critic's "For PLAN §
  Open", `private/design/workshop-2026-09-23/before-8g2/CRITIC-14.md`; the
  rest of that review is built, `layout/PROBE-RULES.md`, "Before 8g2: the
  fourteenth review's fixes"). Built and off it: M1 (1b's list above), M2
  (1d's list above, item 6), and the kit probe's geometry canary flake,
  traced and fixed — the pay sheet printed its rate to the real second on
  the geometry passes, so two tabs' pages asked 1a different point counts of
  that line (960 against 956 on the kit's skeleton at the critic's two
  pinned times); every tab now runs on the fixed clock from before the
  walk. Open:
  1. **PZ and P3Y**: 1d's list above, item 7.
  2. **The worn-only sheet's "the look's own art was never fetched"** (the
     fourteenth critic's item 6): printed once in two runs under the private
     look at 0x04's selection, and seen once before in the 8g1f critic's log
     under load; seen again in the fifteenth critic's run under the
     selection (`critic15/runs/w-selected.log`), its third sighting there.
     Its cause is not known.
  3. **`judgeReacher`'s pin pins text**: 1b's list above, item 7.

- **Before 8g2, the sixteenth review's open list** (`private/design/workshop-2026-09-23/before-8g2/CRITIC-16.md`
  §6; built at its fixes round, `layout/PROBE-RULES.md`, "Before 8g2: the
  sixteenth review's fixes", D-2026-11-09-01 and -02). Closed: B1 (a mask, a
  mask border, a clip-path or a clip on a turned code's chain fails the code
  closed), the dead-trigger self-check, the asymmetric-padding centre and the
  canvas undercount (1c(c)'s item 4). Open:
  1. **A mask over a turned code is red** until option (c) of the critic's J1
     exists: read a turned code on the painted frame at rotated sample points,
     dropping the held frame for it. A round's work; wanted only if a look
     ever needs a mask above a turned code.
  2. **Not verified**: Linux and CI, a device pixel ratio over 1, WebKit and
     Firefox, a real phone scanning a masked code, PRM2 and PCT on the kit's
     probe.

- **Before 8g2, the fifteenth review's open list** (the critic's "For PLAN §
  Open", `private/design/workshop-2026-09-23/before-8g2/CRITIC-15.md`; the
  rest of that review is built, `layout/PROBE-RULES.md`, "Before 8g2: the
  fifteenth review's fixes"). Built and off it: B1 (1d's list above, item
  6), the trigger's walk owed and the per-node empty read (1c(c)'s list
  below), and the closing of that list's PL and selection items. Open:
  1. **The canvas reference's undercount, for the owner**: 1c(c)'s list
     below, item 4.
  2. **J5's remainder and its thin clean margin**: 1c(c)'s list below, item
     3 (99 of 923, the 3-of-11 "l"; 0.588, 0.088 above the cut).
  3. **The worn-only sheet's flake**: the fourteenth review's list above,
     item 2 (its third sighting under the selection).

- **Before 8g2, 1c(c)'s open list** (every money character read on its own,
  only on a contrast job where a mover is near money; bound since step 7d,
  the owner's D-2026-10-20-06 D1 (c) and D-2026-10-30-02;
  `layout/PROBE-RULES.md`, "Before 8g2, 1c(c): every digit, where a mover is
  near", "…: the eleventh review's fixes" and "Before 8g2, 7d: 1c binds").
  Built at 7d and off this list: the bind — a character under the cut after
  the fresh pair, a read that cannot be had, a triggered job that read no
  character and a throw each fail the contrast pass — with each look owing
  characters read where its jobs triggered (each carried look on its own),
  and red proofs on the bound read through the whole runner. Built at the
  fourteenth review's fixes round and off this list (`layout/PROBE-RULES.md`,
  "Before 8g2: 1c's two holes"): the twelfth critic's two blocking holes — a
  turned character is held to the largest phase within 0.2 of its best match
  (J5), measured with every money job read (0 under the cut; the least
  turned letter 0.588), and the trigger reads the look pseudos of every box
  a mover holds (HRP2). Built at the fifteenth review's fixes and off this
  list (`layout/PROBE-RULES.md`, "Before 8g2: the fifteenth review's
  fixes"): a prepare that answers no trigger fails its job, and each look
  owes the trigger's walk over every job of it holding money (its item 1);
  a node the trigger met none of whose characters was read, some left out
  turned past 2° or too big, fails (its item 2); and two items closed by the
  fifteenth critic's runs — PL, 1c's alone among the contrast reads (a box
  over one digit of the strip's total), through the whole runner bound,
  exits 1 with 4 1c failures, on the bare jobs 1c the only contrast read
  that fails it (`critic15/runs/p-PL.log`), and the run under the private
  look at 0x04's selection triggers 46 jobs and fails none
  (`critic15/runs/w-selected.log`). Open:
  1. **D1 (a), every money job, is measured and not built** (the owner's
     D-2026-10-30-02 keeps it open as an option). From 1c's own clock in
     scratch runs that read every one of the 697 jobs holding money:
     80.4–111.8s of tab time over four such runs at the eleventh review, and
     117.8s on the forced run before 7d, so about +27 to +39s of wall time
     at three tabs (a third of the tab time), against the runs' 222–242s and
     the 300s ceiling. It
     would also read the covers the trigger does not see (2, below).
  2. **What the trigger does not see** (stated, not fixed): a box placed
     over money by stacking alone — `position: relative` and a `z-index` with
     no offset, its content overflowing a zero-height box — unless 1a fails
     it (P1A, read by 1a's failures). MISS, a spread shadow with no hit area,
     triggers nothing, so 1c never reads it, but it is not unread: 1b, bound
     since 7b, reads it on the geometry passes (131 would-be failures at 390
     and 137 at 1280 when 1b was report-only) and the contrast pass fails it (92 figures under 3:1, the broken-figure
     read 16, `a-halo-never-reaches-a-neighbours-text` 29 a page pass;
     `private/design/workshop-2026-09-23/before-8g2/1c/runs/w-MISS-shadow-modern.log`). Also unseen: an unmoved
     box's paint that reaches past it (1b's); an app sheet's pseudo-element
     (only a look's are read); a contrast target's own glyphs moved over money
     (blanked in both captures, SVs, 1a's); a held box's text overflowing its
     box (each held box is read by its border box and, since the eleventh
     review, its sharp reach, not by its text's own lines); a blurred layer
     past its core.
  3. **What the read does not read**: the geometry-only screens, the wall
     sizes the contrast pass does not paint, 360 and a turned wall; a frame
     turned past 2° (a node the trigger met that it leaves out whole fails,
     since the fifteenth review's item 2); a character behind a scroller or
     past the shot (a node the trigger met whose every character stands
     behind a scroller fails only where the job reads no character at all,
     stated); a cover
     of less than half a glyph (it keeps half its reference); a character with
     a reference under six pixels (counted by kind, never held; on the clean
     measurement run after the eleventh review 2,081 of 62,318 characters,
     every one punctuation or a symbol, 12 of them on a turn, below).
     **Decimal points and thousands commas are among them, by decision** (the
     window, on the eleventh critic's recommendation): a full stop or a comma
     at up to about 16px in its face covers fewer than six reference pixels (a
     full stop of 4 at 15px and 5 at 16px in Inter, the critic's tally), so a
     cover over a decimal point, which moves the figure a hundredfold, is not
     held by 1c; at a floor of 4 a full stop read 0.50, on the cut itself.
     **A turned frame** (Rural's swaying tag and tilted rows) is held to the
     largest phase of its turn within 0.2 of the one its shown pixels match
     best (J5, since the fourteenth review's fixes round), a model of
     Chrome's resample (an upright glyph drawn on a canvas and resampled
     bilinearly into the frame's turn) measured on Rural alone; the 0.2 was
     fitted in mask space on Rural's 2,350 turned characters and measured
     again in Chrome with every money job read, on this Mac alone. **J5's
     margin is thin on clean glyphs and still lets some covers choose**
     (the fifteenth critic): on clean turned glyphs J5's reference is never
     below the best match's, and the least share kept, 0.588 (an "e" on
     Rural's surcharge line), is 0.088 above the cut; where no full phase
     comes within 0.2 the cover still chooses its phase — of TRN's 923
     turned characters that keep under half the page's own clean count,
     paired by place with their clean read, 99 pass (307 under the best
     match alone), the worst an "l" keeping 3 of its 11 pixels, held to a
     phase of 4 against a clean reference of 10. A floor at 0.7 of the
     upright reference would drop that one (97 pass) with 0 clean under the
     cut; the window kept 0.2 and no floor (D-2026-10-31-01). A character some phase
     leaves under `CHAR_TURN_FLOOR` (3) pixels is too small "on a turn" (12
     on the clean run: the "=" on Rural's Pay several strip and its like).
     The five digits the least of sixteen phases called too small (Rural's
     "+5% surcharge" "5" and its selection line's "7") were artefacts of that
     least: they keep 12–18 pixels on the page and are held now. Chrome
     only, DPR 1.
  4. **The canvas reference undercounts the page — built, narrowed**
     (the eleventh critic's P2; the owner's D-2026-11-09-02): each held
     character's share is divided by `max(1, its node's median share)`
     (`nodeScale` in `scripts/char-read.mjs`), and a failure says both the
     raw and the normalised share. Measured on the clean tree with every
     money job read (697 jobs): no character stands under the cut, the least
     normalised share upright digit 0.75, letter 0.75, other 0.67, turned
     digit 0.72, letter 0.55 (0.545, Rural, the quote surcharge's "e": 0.045
     over the cut), other 0.67. What is left, stated: node medians are
     1.15–1.33 at most (118 of 2,299 nodes over 1.3), so the blind band
     narrows from a true share of 0.375–0.5 to nothing above 0.5 at the
     worst node, and **the brief's "three quarters of a glyph" was the
     99th-percentile share of single thin glyphs, not a node's median**: a
     whole glyph is not undercounted by two. A node mostly covered pulls
     its own median under 1 and is lifted not at all (it reads as before,
     no weaker). TRN's 99 passes (of 923 under-half turned covers) stay 99
     under the normalisation (Rural, scales to 1.25, thin turned glyphs), so
     **the fifteenth critic's reading that most of them came from the
     undercount is not borne out**; they are J5's residue (item 3).
  5. **The self-checks on Linux** (the eleventh critic): 1d's cut held to
     this Chrome (`the-module-read-agrees-with-this-chrome`) and
     `holds-out-of-flow-agrees-with-this-chrome` have run on this Mac alone;
     CI's layout job on `ubuntu-latest` has not run them.

- **Before 8g2, 3a's open list** (the ground under a money figure's glyphs
  walked to the stall; the plan's item 3a; bound since D-2026-10-28-01, which
  took J1(a), J3 and J4 by recommendation; `layout/PROBE-RULES.md`, "Before 8g2:
  3a binds"). Open:
  1. **A box above's moving background at a keyframe offset, the owner's call.**
     A keyframe that moves only `background-position` or `background-size` on a
     box above stays `SEEK_NEEDLESS`: a look can slide a tile under a figure there
     between the instants, and no rule reads it. Seeking them too was built and
     measured: 1,227 animations at 390 against 177, the geometry passes summed
     336.9s of tab time against 314.5s, about +7.5s of wall on a whole run at
     three tabs, on top of the bind's own +4.5s. The plan's item was the whole
     signature on a box above alone (the aurora's tide and the sunburst's angle,
     built, about +2.4s). Option (a), seek them: the gap closes for +7.5s (a first
     whole run with them read 234.8s against the bind's 225.2s, of 300). Option
     (b), leave it stated, as it is: free, the gap stands, and a first-party
     keyframe moving a background on a box above is admitted by the lint. A cheaper
     seek (one upright hold per seek where one per figure is made, skipping a move
     that cannot reach an ink) was not tried. Recommendation: (a) when the margin
     under 300 allows, after the port.
  2. **A box above's pictures stay the contrast pass's** (named where one shows,
     composited as absent: the rain, the confetti, the sunburst and the fixture's
     pictures under the activity amount on the bare ground, printed under the
     pass and owed to nothing).
  3. **Not read, stated:** a part of a figure out of its scroller's view at any
     scroll but the one to the view's nearest edge; a clip above a scroller; an
     in-flow pseudo-element of a box above; rounded corners; a gradient between
     its stops; a conic or repeating gradient's stops, one with an interpolation
     written out, and the other values `placeTile` and `placeGradient` refuse,
     which are read strictly.
  4. **Read under the private look at 0x04's selection at the bind:** 0 failures
     of this read, 0 of too many choices, every pass read; the run's known
     failures are unchanged (PROBE-RULES names them by rule).
  5. **A keyframe that turns a box above stays unread.** `transform`, `rotate`,
     `scale`, `translate` and the offset longhands are `SEEK_NEEDLESS` on a box
     above. A written shift in a keyframe is refused at its value (`keyframeHeld`;
     KF2, `transform: translateY(34px)` between two instants: 14 failures, "a
     transform that moves it"), but a turn about a far origin has no shift in its
     matrix and carries the figure with nothing reading it (KF3, `rotate: 0.5deg`
     about an origin 3,850px off, between two instants, over a band of its ink: 0
     failures, lint clean). A `scale` is in the same list and was not planted.
     The per-pair read (D-2026-11-09-07) reads a transform at the frozen instant
     and at an offset seeked for another reason (KF1), not this.
  6. **The geometry check against Chrome lives only in scratch files**
     (`placeTile`, `tileBand`, `placeGradient`, `stopsOver` against Chrome's
     paint: the bind's 24 cases, the seventeenth critic's 34 more, 0 wrong). Not
     in `test:layout`; worth a place there as a self-check.
  7. **A split inline's borders and shadows stand on its bounding box.** IN3 (a
     bottom border on the quote face's inline figure): Chrome draws it per
     fragment, line 1's band lies under line 2's glyphs, 0 failures at `82bfd46`,
     `5330e91` and now, the second line ink on ink. The seventeenth review's B2
     fix is about tiles. Option (a), read each side's band per client rect; (b),
     state it. Recommendation: (a).
  8. **A clip above a transform is read in the flat frame.** The per-pair read
     (D-2026-11-09-07) places paints, and the clips that cut the ink and each
     paint are still read with every box upright: a figure a scale or a tilt
     carries past an `overflow` on a box above the transform is read as if it
     stood where layout puts it. A figure cut there on the page is read as
     ink the page does not paint, and one the flat clip cuts and the page
     does not is left unread. Reading each clip through the transforms below
     its box, as the paints are, is the fix; not built.
  **Closed by the seventeenth review's fixes** (D-2026-11-09-05): a tile on a box
  in more than one fragment, placed on the bounding box (B2, IN1b); a dead
  ground read that exited 0 (`the-ground-read-fails-a-planted-ground`).
  **Closed by the eighteenth review's fix** (D-2026-11-09-07, the per-pair
  read): a shift, a scale or a tilt between a paint and the figure. This list
  said CASE-E "reads 0 failures at `82bfd46`", and CLAUDE.md §6 "the same at
  `82bfd46`", as if the tilt were never read: true only of CASE-E's gradient
  tile band. CASE-F, the same 10-degree tilt with a band the old read did place
  (an inset box shadow on the row), was 14 failures at `82bfd46` and 0 through
  the whole runner at `6d49b6e`, so it was a regression like UP2d (B1 of the
  seventeenth review) and SCL3 (a `scale`, B1 of the eighteenth), all three the
  one hold giving a box one place. All of them fail now.

- **Before 8g2, after the eighteenth review: what the money reads still do not
  say** (`private/design/workshop-2026-09-23/before-8g2/CRITIC-18.md`). Open:
  1. **Liveness for 1a, 1b, the keyframe offsets, the end read and the ground
     read's call site.** The critic's `tools/mut-dead-reads-1a-1b-keyframes-end.py`
     drops 1a's verdict in `coverScan`, 1b's failure in `judgeReacher`, makes
     `offsetDressFaults` and `coverAtEnd` answer nothing and drops the ground
     verdict at its call site in the dress rule: the whole runner exits 0.
     `groundSelfCheck` calls `groundWalkRead` directly, so it cannot see that
     call site, and `dressSeek` and `coverEnd` are printed and owed by nothing.
     A one-page liveness check for each, about 80 lines; a code regression and
     not a look, so it did not block (D-2026-11-09-07: after the merge).
  2. **A cover below the first screen on a geometry-only screen, at 360 and at
     the wall sizes the contrast pass does not paint** (`kit-BF1`: the last
     row's picture slid over its own price on `crowded`, the kit's probe exits
     0; the same plant on the first row exits 1). 1a hit-tests nothing behind a
     scroller's clip (`clipVerdict`, `layout/coverPoints.ts`), and the contrast
     pass, which grows its shot to hold the page, does not sample those.
  3. **A fade on a box above a code on a geometry-only screen** (`kit-KQF1`: a
     stream code's plate at opacity 0.3 under one `[data-tier]`, the kit's probe
     exits 0; on a sampled screen 1d fails it). The dress rule's box read
     (`BOX_HELD`) holds a box above a money figure; `a-code-is-drawn-black-on-white`
     reads the code's own boxes and no box above them.
  4. **CI's two-tab dispatch** (D6 of D-2026-10-20-06): 263.6s of 300 on this
     Mac at load 2.32 (the eighteenth review), unmeasured on `ubuntu-latest`.
  5. **The strict read's false red under a scale** (the nineteenth review,
     `before-8g2/CRITIC-19.md`; `critic19/plants/kit-STRIPE2-scale.css`). A
     gradient with a stop under 3:1 against the figure's ink, on a box above a
     `scale`, is tried at every stop over the tile's own band, so a look with a
     6px accent rule in its own tokens and `scale: 1.02` on `.item-head` fails
     the Modern starter with 1,581 lines of "the ground under its glyphs", where
     the figure stands on the card (the control with no scale exits 0). It takes
     both a stop under 3:1 and a scale between it and the figure; no shipped look
     or starter has that. Fix: read the stops through the pair's map instead of
     strictly. Not built.

- **A landscape touch wall under about 900 wide is not supported yet, and
  its stepper runs past its row** (D-2026-10-20-12; the touch-wall critic,
  `private/design/workshop-2026-09-23/touch-wall/CRITIC.md`, item 3). The
  wall's floor is 680 on the screen's short side, not on its width
  (`WINDOW_MIN_PX`; `wallWidth` in `src/app.ts` asks
  `Math.min(innerWidth, innerHeight) >= WINDOW_MIN_PX`). A tall portrait wall
  holds from 680 wide, but a landscape touch wall is held only from 870: its
  quote row is 264–266px wide at 800 and 306px at 840, beside the code's
  400px column, and a stepper of two 72px buttons and a count (218px at the
  least) does not fit it. Measured on every touch screen, every look bare
  and worn (the showroom, Chrome, `shop-window-touch-quotes`, `-16`,
  `-long-figures`, `-pay`, `-pay-3`, `-pay-35`): the "+" button runs past
  the row by 58.4px at 800, 41.1 at 820, 23.9 at 840 and 6.6 at 860 with a
  one-digit count, and
  with a three-digit count by 76.6px at 800, 42.1 at 840, 24.8 at 860, 16.2
  at 870 and 7.6 at 880 (clear from 890); a figure runs past its row by
  8–30.9px on Neo and Rural at 800, by up to 17.1px at 820 and by 3.2px on
  Rural at 840 (clear from 860). From 870 wide, with the fixtures' counts,
  nothing overlaps. **Main is worse there**: the stepper runs 90.4px past its
  row at 800, 57.5 at 840, 41 at 860, 24.6 at 880 and 9 at 900, and the
  controls stand on the figure and the name up to 1,200 wide (the same
  sweep over 150 landscape sizes from 880 up: 1,573 of 12,888 rows red on 66
  of them, 0 after; the critic counts 24 of those 150 sizes at 600 tall,
  below the floor, which the showroom paints and the app does not, and the
  counts were not redone for wall sizes only, the size list being gone).
  **A near-square portrait wall under about 880 wide is not held either.**
  Its list is almost nothing, 0–37px at 700x701 and 760x761 (0–124px at
  880x881), since the list is what the sign and the code leave; and under the
  Awning the frame reads as landscape (the canopy takes its height) and takes
  the landscape limit: the stepper runs 154px past its row at 700x701 and 96px
  at 760x761 (the critic's second review, `touch-wall/critic2/`). Main behaves
  the same (182 and 127px past). So nothing got worse, and nothing below 870
  is claimed.
  The owner's decision was to leave it, and the window.css block that holds
  the touch row says so. To hold it, options (not built, not priced): a floor
  of about 900 for a landscape wall with `touch=on` (below it the wall falls
  back to the ordinary stall, as a phone does), a narrower code column there,
  or the code above the list and not beside it.

- **The first price of a touch wall is cut at rest where the list is shorter
  than a row: on main at 768x1024 and 680x1000, and in 25 cells of this
  branch's own** (D-2026-10-20-12; the touch-wall critic, item 2, and its
  second review, item A). At 768x1024 the list a touch wall leaves
  is 261, 238 and 223px on Modern, Neo and Rural, and **129px under the
  Awning and 123px under Rural's yard** (the canopy and the yard's row take
  their height from it); at 680x1000 it is 276, 252 and 238px, and 144 and
  138px under the Awning and the yard. A quote row is 200–218px tall since the picture is
  104px (the first price ends 185–195px down it), so the first price stands
  whole at rest on 4 of 6 look variants at 768x1024 (Modern, Neo bare and
  worn, Rural) and 4 of 6 at 680x1000, and on 6 of 6 at 834x1112 and
  800x1280. The two that do not are the Awning's and the yard's, and they
  were the two that did not on main (main, for an ordinary figure: 4 of 6 at
  768x1024 with the same two, and 3 of 6 at 680x1000, where Rural bare was
  cut by a 274px row as well; a re-flowed figure was 1 of 6 on main at
  768x1024).
  Before the 104px picture, the branch made it worse: 1 of 6 at 768x1024 and
  4 of 6 at 834x1112. **No rule was built for "the first price stands whole at
  rest"**: it would be red on main at 768x1024 and 680x1000, which both
  passes paint, and the only fixes are a taller list, not a shorter row. Ways
  to one (not built): the shop's code beside the strip rather than under it
  at these widths (about 200px more list, by the critic's estimate and
  unmeasured), or the list scrolled to its first figure at rest (not
  recommended: it fights the wall's self-scroll and the heartbeat).
  The Awning's 129px and the yard's 123px lists at 768x1024 (144px and 138px
  at 680x1000) are the older cuts: main had them, and this branch leaves
  them as they were. **This branch adds cuts of its own**, counted below.
  Counted **whole and clear** (the first price inside the list at rest, and
  none of the stepper's controls on it; the critic's recount, second review)
  over every touch screen with a list on screen. "Whole" alone flatters main,
  whose price stood under the controls in most cells under 1280:
  - landscape 880–1279 wide, 1,404 cells: 1,364 here, 536 on main; 841 gain
    and 13 lose;
  - portrait under 1080 wide, 2,379 cells: 2,216 here, 1,791 on main; 437
    gain and 12 lose.

  (By "whole" alone, the builder's count: 1,364 here against main's 1,377 in
  landscape, and 2,216 against 2,186 in portrait. The cell lists behind these
  counts are gone, so they were not recounted; they agree with each other:
  gain less lose is here less main in both rows.)

  **The 25 that lose are new cuts, not older ones.** On main each had a first
  price that was whole and clear of the controls ("$5.00" in 22 of them).
  They are: payment screens 1,080–1,200 tall and 1,100–1,279 wide in
  landscape; payment screens 1,501–1,600 tall in portrait; the yard or the
  Awning at 1,000–1,079x1,112; and 1000x1001 Rural bare. **Six are at 1279
  wide, which is the cost of moving the cut to 1280** (the owner's call: the
  1280–1919 band is main's row). The cause is the one above, a taller row in
  a short list: under 1280 a row with a stepper is 42–51px taller, and a
  payment's band leaves a list of 155–223px; in portrait under 1080 a figure
  under the picture ends 185–209px down its row, and main's, beside it, ended
  152–162px down. These ranges are those of the sweep's sizes, not edges: the
  critic's own spot sizes lose the same way at payment screens of 960x950,
  1000x999, 1024x1000 and 1240x1230 (lists of 155–219px). A rerun on
  2026-10-26 over seventeen sizes picked inside the named ranges (Chrome 156)
  lost 26 cells and gained 65: it confirms where the cuts fall, not how many.
  For the owner, the critic's judgement: accept the 25 for the 1,278 cells
  (841 + 437) that gain a first price clear of the controls.
  Browse scrolls itself one step every `WINDOW_SCROLL_MS` once
  `WINDOW_IDLE_MS` (45 s) has passed with no touch, so a customer who waits
  sees the price and one who stops at the screen at rest does not.

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
- **Three gaps in the first-party look lint and the probe, stated and not
  closed** (the lint-belts critic's sixth review, 2026-10-26; the window asked
  for the entry, not the fixes). (1) A longhand that names no keyframe
  (`animation-delay`, `animation-duration`) re-times what the cascade already
  runs on its element, a base sheet's keyframe included: `.bc-ext { animation-delay:
  120s }` re-times `bc-in`. The lint reads names, not timings. (2) The poster's
  print, square, story and stream formats are painted by no fixture, so a rule
  that reaches one is read by no pass (the `data-format` values `square`, `story`
  and `stream` are belt states for that reason; the print page is measured by
  hand, `scripts/print-measure.mjs`). (3)
  `stroke-miterlimit` is uncapped: a miter join with a large limit reaches that
  many stroke widths from a vertex, and `stroke-width` is capped at 3. Detail
  and the plants: `layout/PROBE-RULES.md`, "The state belt".
- **The probe's stop lines for the private look's slices, decided**
  (D-2026-11-11-05, the window's, after D-2026-11-11-04 built O1 and O2):
  `pnpm test:layout:look` under the selection is at most 120s, read as the
  median of a back-to-back pair, and adds at most 15s per slice; past either,
  prune by the by-look table (`by look` under the contrast phases; the private
  look at 0x04's art-off frames and look pseudos are its largest costs) before
  raising the line. The selected full `pnpm test:layout` is run at the end of
  8g and whenever the private look gains a row shape (a row, a mood, a token),
  under the 300s ceiling, which stays; D-2026-11-10-12's per-slice lines (the
  look adds at most 25s to a pair, the selected run at most 270s) no longer
  apply per slice. A slice that changes any tracked file the probe build or
  runner reads runs `pnpm test:layout` as well; a fixture-only change needs
  the look run alone. Measured when it was set (this Mac, three tabs, one
  sample each but the pair): `pnpm test:layout` 225.0s and 231.7s with no
  selection and 251.1s selected; the look run 41.7s and 46.1s with the
  tracked fixture, and 66.9s and 67.6s back to back with the private look at
  0x04, median 67.3s (`layout/PROBE-RULES.md`, "The look run").
- **No fixture paints the quote face's borrowed-token warning** (the private
  look at 0x04's 8g4 critic, 2026-11-11; D-2026-11-11-07). Every quote-face
  fixture uses a token the stall minted, so `div.pay-sub.warn` (the "token
  minted by another wallet" line a buyer reads on the face) is measured by
  no pass on any look, before or after a look dresses `.warn`. A public
  fixture with another wallet's token would close it, sampled for contrast
  like the pay sheets; not built.
- **The wall's container conditions cut sizes no pass paints**
  (STEP-WALL-CONTAINER, D-2026-11-11-08: no new wall pass in that step). The
  twelve conditions window.css composes the wall over that a pass enters
  (`LOOK_CONTAINER`, `scripts/workshop-css.mjs`) cut the wall's sizes (short
  side at least 680) into 21 combinations, and the nine wall passes paint 8
  of them (`scripts/wall-conditions.mjs`, `cellsOf`). window.css's own rules
  already meet in the other 13, measured by no pass: landscape 901–1200
  tall from 1280 to 1919 wide (1280x1024, 1600x1000) and under 1280 wide
  (1024x960); landscape over 1200 tall under 1280, from 1280 to 1919, and
  1920 wide and over (2560x1440); landscape 791–870 and 871–900 tall under
  1280 wide (1024x830); landscape under 901 tall 1920 wide and over, in its
  three height bands (1920x720); portrait up to 1500 tall 1080 wide and over
  (1080x1080, 1200x1400); and portrait over 1500 tall under 768 wide and
  from 768 to 1079 wide (900x1600 and 864x1536, two of the sizes already
  known red). A first-party look may not use a set of
  conditions that separates any of them
  (`a-look-uses-no-combination-of-wall-conditions-no-pass-paints`): a height
  step and a width step together are refused today. **Two passes would open
  most of it**: 1280x1024 and 2560x1440, every wall screen on every look, at
  about 16s each (the four off-size walls took 15.7–16.7s each on their tabs
  at two tabs, 2026-10-20); whether main is green there is not known (the
  scratch runs of 2026-10-19 read 0 failures at both by that day's rules,
  since superseded). Each added pass is a new size every wall money rule
  then holds, and a red one cannot be added alone. The owner's call.
- **Text enlargement cuts row figures on every look, accepted for now**
  (D-2026-11-11-03, the owner's "Ok", 2026-11-11). With a phone's text
  enlarged (measured as macOS WebKit text zoom, a stand-in for iOS and
  Android text scaling, over 56 shop rows at 360, 390 and 430), rows whose
  figure or unit crosses the row's clip: at 1.5x 12 on each of Modern, Neo
  and Rural (5 / 9 / 9 at 1.25x, 26 / 29 / 27 at 2x); the private look at
  0x04 is in the same range. No pass paints an enlarged text size. A fix is
  app-wide (a row that re-flows by the figure's own width, as the wall's
  Cycle card fits its figure), not a look's.
- **Five public gaps the private look at 0x04's shelves found, stated and not
  closed** (its 8g2b critics, 2026-11-10; general, true of every look).
  (1) **A control keeps its points** (D-2026-11-10-07): no pass asks whether
  a look's stacking takes the pointer from a control or a protected box that
  stands beside it, before or after it in paint order; the look's own private
  gate does, and a public rule would need a hit test that counts every element
  that takes a point, not only covers. (2) **The genesis-link confirm
  ("Leave Stall?") is mounted inside the item face's card** (`confirmLeaving`
  through `tokenLink`), so a look that makes that card a stacking context holds
  the confirm's fixed scrim under the sign and the dock; no fixture stages the
  confirm (it needs two presses), so 1a never reads its controls. Either a
  staged fixture (`stageScreen`) or mounting it at the stall root, as the zoom
  sheet is. (3) **The Activity tile cuts a wide pair of initials** (`WW`:
  23.5px of letters in a 22px box) on every look, the skeleton included.
  (4) **`initials()` splits a surrogate pair** in its two-word branch
  (`slice(0, 1)`), so a name opening with an emoji paints a replacement
  character in the tile. (5) **The mark-host guard refuses an honest
  selector**: `layout/lookMarks.test.ts` keys on the text `.items` beside an
  `:nth-child`, so `:nth-child(3n + 1 of .items)` counting a body's shelves
  (not a mark host's children) is a false red; a look writes it as
  `of :has(> .item)` today.
- **A money figure's price tier can be read through `:has()`** (the 8g3-pre
  critic, 2026-11-10; general, true of every look). `data-price-tier` is a
  value a look may match (G3), and the look lint takes it anywhere in a
  selector, so a first-party rule such as
  `.t-x .sheet:has(.pay-x[data-price-tier='1']) [data-role='pay-final'] { display: none }`
  hides a pay sheet's honest sentence whenever the XEC the wallet signs is 15
  characters or longer, on screens whose honest sentences the contrast pass
  reads only at shorter figures. The figure's length step
  (`data-figure-step`) closed this road for itself with a belt of its own (a
  step only on the subject or an ancestor of it, outside every functional
  pseudo-class, and a rule under it that sets `font-size` and `line-height`
  alone: `a-figure-step-only-sizes-a-figure`); the same belt over
  `data-price-tier`, and over the stream card's `data-tier`, is not built. The
  shipped looks read `data-price-tier` on their own rows only, so the belt
  would cost them nothing; a private look's rules under it are unread here.
- **Closed 2026-11-10 (step 8g3-honest, D-2026-11-10-17 and -18): the honest
  sentences on the pay sheets are read at every figure step a look can dress**
  (the 8g3 build critic's P2-1). Steps 1 and 6 are read for every look, as
  before (`pay-longest-figure` and `pay-several-longest-figure` now owe their
  lines). Steps 2 to 5 (`pay-inr`, `pay-figure-14`, `pay-figure-17`,
  `pay-long-figure` and four new own-mint Pay several twins,
  `pay-several-figure-2` to `-5`) are sampled for contrast only for a look
  whose sheet names `data-figure-step`, derived like `[data-copied]` and held
  by the runner (`STEP_JOBS`, `NAMES_STEP`). `HONEST_STEPS_OWED` owes
  `pay-final` read per look and step. Cost: none on a default run (796 jobs,
  634 public, as on main); 32 jobs a stepping look at the shipped rows' count.
  Existing fixtures unchanged. Not run: a full probe carrying a stepping look
  (none exists; unit tests prove the plan and the owe). Still open, from the
  critic: a first-party rule under `data-figure-step` can grow or move a box at
  one step only, and the belt's "font-size and line-height alone" does not say
  otherwise; the strip is no sheet and owes no honest sentence; the borrowed-id
  warning inside Pay several's `pay-lines` is read by no sampled screen. Also
  stated: the belt accepts `font-size: 0` on non-money words under a step row
  (as at rest on main).

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
