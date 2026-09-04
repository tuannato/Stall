# PROBE-RULES — every rule, with the incident that earned it

The layout guard (`layout/probe.ts` + `scripts/layout-check.mjs`, run as
`pnpm test:layout`) is the only thing in this repository that can see a
layout. Its rules accumulated one measured incident at a time; this file is
the ledger, so the next amendment starts from what is already known instead
of rediscovering it. Overwrite entries when a rule changes — this is current
truth with citations, not history.

## Why a browser at all

`asked-amount-not-covered` inspects what `themeVars()` returns and never
opens a stylesheet; happy-dom does not lay out. Three defects shipped in one
session under that regime: a grid row stretched to an image's height and
opened a 130px hole, `hidden` lost to a class that set `display`, and a hex
record ran off the side of the sheet. A missing browser **fails the run** —
a guard that quietly does not run is counted as coverage while protecting
nothing.

## Geometry rules

- **Boxes, not hit testing.** A decoration worth the name carries
  `pointer-events: none`, and `elementFromPoint` skips exactly that.
  Measured: a red box laid over a price returned *the price* as the hit.
  Every decoration's box is compared against every protected box.
- **An ancestor counts as covering.** `elementFromPoint` attributes a
  pseudo-element's paint to the element that owns it, so treating ancestors
  as innocent made the first version blind to a shipped decoration over the
  amount.
- **A positioned pseudo-element is refused outright.** It is not in the DOM:
  no `getBoundingClientRect`, no hit — measured: an `::after` with
  `inset: 0` and `pointer-events: none` over the price passed both checks.
  Decorations are real nodes. (This is why the rural tag's punched hole is a
  background radial and the sunburst spins via a registered `@property`
  angle — a rotating wheel's box sweeps the protected address.)
- **The price column is one composed figure.** Its own unit/rate/fiat lines
  sit flush against the amount and the swaying rural tag rotates them
  together; a sibling inside the same `.item-p` is typography, not cover.
- **Seek and measurement share one tree.** `renderStall` throws the tree
  away on every paint; the first over-time loop seeked `getAnimations()`
  then repainted, measuring fresh nodes at t=0 six times. Proved by planting
  a sprite empty at t=0 that covers the screen mid-cycle.
- **A label never wraps** — measured on the *text* via Range rects, because
  a flex label's box stretches to its neighbour ("Token ID" broke across
  two lines beside a wrapped token id at 540px).
- **The theme reaches all four edges.** Measured at 375x812: an 8px border
  and 42% of the screen unthemed, invisible for two months because the
  default is white on a white canvas.
- **Nothing scrolls sideways** — the page and the shell's scroll region,
  which hides its own overflow from the page.
- **The modal is the one scoped exception, stated rather than waived.**
  While a sheet is open, the figures inside *it* must be uncovered and the
  sheet bounded and scrollable; covering the stall behind is what the seller
  opened it to do. The first run reported the scrim covering the price
  behind it — the boundary that had never been written down.
- **The viewport comes from CDP, not `--window-size`.** New headless clamps
  below ~500px: asking for 390 measured 500 while the runner printed 390.
  The runner fails when the page's own measurement disagrees with the ask.
- **The door only wears the default look.** The apex paints
  `view.theme ?? DEFAULT_THEME` and never fetches, so door-under-Neo is a
  screen no visitor can reach — its red was a false alarm (Neo's mini ink
  over the door's light ground) and its green was budget spent on nothing.
- **The name column never collapses under the price** (`.item-b` ≥ 64px).
  The price column is an `auto` track, the name `minmax(0, 1fr)`, and the
  asked figure may not wrap (§8) — measured live at 375px, a `1,000.01`
  price held 189px and every name wore 40px; `100,000,000` left one letter
  per line. No rule watched the name, so `pnpm test:layout` stayed green —
  the absent rule, not an absent fixture, was the hole. `priceTier`'s type
  steps, the tier-3 own-row grid and the glance-line `max-width` are the
  fix this floor keeps honest. Measured on `.item-b`, the grid item: the
  first draft measured `.item-n`, which shrinks to its text
  (`align-items: flex-start`) and reads 26px on "Tea" with 140px of room —
  a false red on short names. Cut points are tuned at this runner's 390px
  mobile viewport; 375 is ~15px tighter and extrapolated, not measured.
- **The Activity fold's amount is a protected box and a contrast target**
  (`[data-role="receipt-amount"]`). It is the one money figure on that panel
  a reader can check against a wallet, and it sits on the fold's own ground,
  which no other screen puts a figure on. The `activity` fixture therefore
  carries one event **with** `sats` and one without: a selector matching
  nothing in a fixture is a guard that measures nothing, which is how
  `receipt-amount` would otherwise have been added and stayed vacuous. The
  same fixture carries a walked row so the 64-character txid is measured
  where it actually lives — inside an open `<details>` at 390px, wrapping on
  `overflow-wrap: anywhere` in a grid area of its own. That is the same
  incident as the "Token ID" label wrap, one string longer, and the fix is
  the same shape: the value takes both tracks so no label shares a row with
  it.

- **The seller's quote is a protected box** (`[data-role="seller-price"]`).
  It is a money figure a buyer reads before pressing Pay, on the quote rail and
  inside the pay sheet, and a covered one reads as nothing — the same rule the
  covenant's price has. Two screens, `pay` and `pay-xec`, put the sheet's own
  figures over the scrim; `pay-xec` is in `STATE_SCREENS` because its decoration
  variants would be `pay`'s painted twice. Both keep `prices` for the sheet they
  open, one quote on a listed token and one on a token the stall does not list,
  because the pay set is not gated on listings.

- **The rail is a side of the Shop panel, so a fixture names the side.** Since
  the panel became Listings | Quotes, `renderStall` paints one of them and
  `view.shopTab` is what picks — so `offers` and `empty` keep their `prices`
  (the tab labels count them, and a listed quoted token still earns its Shop row
  the pointer) while the rows themselves are on the screens that ask for them.
  `plugin-missing-quotes` is that screen: `shopTab: 'quotes'` over a node that
  answered without `agora.py` while its address history carried everything —
  both naming shapes, a `$` figure and an XEC one, and **the only quote screen
  the contrast pass samples**. It cost 173 of the 2,831 boxes when it was added
  under the old shape and it keeps that seat rather than a new one.

- **A failure screen's own fixture may not carry metadata the real path could
  not get.** The offer book and the seller's own records are two reads of two
  indexes, so `unreachable`, `unreadable` and `plugin-missing` carry a name this
  load read and the seller's `prices` — and **no `tokens` entries for the tokens
  those quotes name**, because that genesis read goes to the index that just
  failed and usually fails with it. They paint the listings side, which is where
  such a stall opens: the message, the hosts box and the retry, with the count
  of what we could not read on the rail it is about rather than under a hosts
  box, where it would say one failure twice.

- **The three quote outcomes that are not rows are geometry only.**
  `nothing-quoted` (the quiet sentence), `quotes-failed` (rows, a line and the
  retry) and `quotes-truncated` (rows and a line) are in
  `GEOMETRY_ONLY_SCREENS`, which `probe.ts` subtracts from `__contrastScreens`:
  each is `plugin-missing-quotes`' ink with one sentence changed, on the same
  ground, and the contrast pass is most of this guard's runtime. `nothing-quoted`
  carries no `quotes` in its name on purpose — the runner fails a screen whose
  name promises a seller's figure and mounts none, and that screen has none to
  mount.

- **The panel's segmented control is measured wherever a shop is.** It is
  `.seg`/`.seg-b`, already in `CONTRAST_TEXT` from the record sheets, so a
  pressed segment's ink on `--s-accent` and an unpressed one's `--s-muted` are
  sampled on every page screen rather than only inside a sheet. Its labels carry
  a count that grows with the shop, so `.shop-seg .seg-b` clips and ellipsises:
  the grid's `minmax(0, 1fr)` columns cannot widen, and an unclipped label would
  overflow its own segment instead.

- **The rail's buyer note moved inside the amount card**, under the figure —
  which re-measures `.pay-amt`, a certified box. It is a `.note` on the card's
  own `--s-surface` ground, adding a block between the figure and the quantity
  row on `pay` and `pay-xec` at every width and every look, and nothing above
  it may be covered by it. Re-measured with this change: no rule moved.

- **Both quote-naming shapes are on the fixtures, and so is a borrowed
  token.** `offers`, `pay` and `pay-xec` carry `genesis` and `descriptions`:
  `T1` is this stall's own mint with the seller's words (an item title with the
  token's name on a small line under it), and `QUOTED` is another wallet's mint
  with no words (the token's name as the title, the line saying the seller
  wrote nothing, and `QUOTE_NOT_MINTED_HERE` under it). The second is the
  taller row and the one that paints initials where an icon would go, so a
  fixture carrying only the first would measure the shorter shape and call the
  section certified. `describe` carries `genesis` for the same reason on the
  editor's side: one warning line visible, over a picker that now also mounts
  the paste field. **None of these lines joins `CONTRAST_TEXT`** — they are
  `.pay-sub` and `.fine` muted ink on grounds that list already samples, and
  the contrast pass is most of this guard's runtime, which is at its ceiling.

- **The positive mint state and the quote's age ride those same fixtures.**
  `T1` being `attributed` now puts a **second** `.chip` in the row's name
  column beside the quote chip, and `QUOTE_TIMES` dates `T1` and not `QUOTED`
  — so `plugin-missing-quotes`, `pay` and `pay-xec` measure the dated row and
  card against the undated ones, and a two-chip name column against a track
  `minmax(0, 1fr)` is free to shrink. That is why the row's chip is the short
  `QUOTE_MINTED_CHIP` and the sentence stays in the sheet: a `.chip` is
  uppercase and `white-space: nowrap`, and the whole sentence at that size is
  wider than the name column is on a phone. No screen was added and no selector
  joined `CONTRAST_TEXT` — `.chip` was already in it for the quote chip, so the
  second one is sampled wherever the first is, and the age line is `.pay-sub`
  and `.fine` like the two lines above it.

- **Every screen named for the pay rail must mount a figure, or the run
  fails.** A screen whose name starts with `pay` or contains `quotes` and that
  mounted no `[data-role="seller-price"]` while it was measured fails the pass
  it ran in. The failure mode this guards is not a red rule but a green one: a
  fixture that loses its `prices` map, or a section that stops painting, leaves
  every rule about the seller's figure passing over a screen that no longer has
  one — the same vacuous green the viewport split and the reduced-motion pass
  each grew an audit for. The page reports only what it saw
  (`screensWithQuote`); the rule lives in the runner
  (`scripts/pay-screens.mjs`, tested by `every-pay-screen-mounts-a-quote-or-the-run-fails`
  under `node --test`), because a page must not be the judge of whether the
  page painted.

- **The `activity` fixture carries a payment with a payer address.** The fold's
  two hand-over controls — the txid and, on a payment row, the address it was
  spent from — are `.mini` on the fold's own ground, and the address takes both
  grid tracks the way the txid does: 42 characters beside a label at 390px is
  the wrap the label rule was written for, one string shorter than the txid
  that earned it. Both are copies and neither is a link, which is the point: the
  panel is public, so a control that composed a payment would be one a stranger
  could press. Measured with the row added: **2,600 boxes and 143.8s**, +48 on
  2,552 and no screen added.

## Rendered-pixel contrast (pass 4)

`legibleOn` proves text against the two flat palette roles; only pixels
prove it against what is actually painted behind a figure. The page turns
every target's glyphs transparent, the runner screenshots and samples the
boxes against the declared ink. Floor: `PIXEL_CONTRAST_FLOOR = 3`.

**`CONTRAST_TEXT` grows with every sheet that declares its own ink.** The
list is money figures, the controls on the publish path, the dock, the
overlay's name plate — and `.obs-h`, the studio's step headings. That last
one is there because `obsGuide.css` is a screen-owned sheet rather than a
theme file, so `a-theme-rule-never-pairs-a-literal-ink-with-a-token-ground`
never reads it and the pixels are the only judge its ink has. The studio is
also the one screen a seller reads instructions on rather than a figure.

Joined 2026-09-04 with the two record sheets: `publish-summary` and
`describe-summary` (the "Publishes:" line — the only sentence that says what
a permanent record carries and how big it is), and `.seg-b` and `.dec-chip`,
the pressed-state controls the sheets are made of. A pressed segment inks
itself on `--s-accent` and a pressed chip on a wash of it; no other screen
puts a label on either ground.

**A control that draws its own edge has no contrast margin to spend.**
`legibleOn` corrects `--s-accent` against `--s-bg` to `MIN_CONTRAST = 3` —
which is exactly this pass's floor — so anything anti-aliased between an
accent-inked control and what is behind it lands *under* the floor, and an
outline in the ink's own colour is worse still: sampled, it is the ink on
itself. Four measurements from the pay rail, all on Rural (theme 3), all with
the sampler's vertical inset of `border-width + 1`:

- **A 1px accent-wash rule around the "Seller's quote" chip: 2.99:1**
  (`empty @desktop`, worst pixel `211,171,148` — the border blend exactly, at
  the third row of a 21px pill whose 999px radius leaves almost no flat top).
  Fixed by removing the rule: accent ink on a `--s-bg` ground, nothing drawn.
- **The Pay pill's own anti-aliased top row: 1.96:1** (`offers @desktop`,
  worst pixel `208,167,144` at `y = box.y`, the fill blending into the card).
  Fixed with a 1px rim in a deepened accent — the inset steps past it, and the
  row it does sample is darker than the fill rather than lighter.
- **The Shop-row pointer's box ending on the card's own border: 2.86:1
  unworn, 2.03:1 worn** (worst pixel `185,174,155`). A full-width control
  whose last row *is* the card edge is read against that edge. Fixed with
  margins instead of padding, so the box ends clear of it.
- **Then 2.79:1 worn** from the pointer's own `--s-bg` ground anti-aliasing
  into the card surface, and **1.00:1** when it was given `.mini`'s accent
  border (that border sampled as ground). Final shape: **no ground and no
  rule**, ink `--s-text`, which `legibleOn` corrects against the surface as
  well as the page — the flat card behind it is the only thing sampled, so the
  measured ratio is the guaranteed one.

`.chip` and `.pay-pointer` join `CONTRAST_TEXT` with `seller-price`; the pay
sheet's `price` was already covered. Runtime after all of it: **140–143s of the
150s ceiling** across four runs, contrast sampling **2,658 boxes**.

Sampling amendments, each measured:

- **Descendants are blanked too.** A child with its own ink does not
  inherit the blanking: `.tab-name` (the seller's name, muted channel)
  stayed painted and was sampled as "ground" — the shop tab reported at
  1.17:1 against its own sibling text.
- **Borders are chrome, never ground — all four sides.** A dashed pill edge
  blended to 2.2:1 against its ink; later the rural dock's divider, drawn as
  a `border-left` the top-width-only inset never saw, reported 2.3–2.9 on
  tabs whose real ground cleared 5.8.
- **Corner radius narrows the horizontal range** — outside the radius the
  pixels are the page behind the control (Modern's white page behind a white
  pill sampled 1.00:1). **The radius the sampler can see is the element's
  own**, so a control rounded by an `overflow: hidden` parent is measured
  square and its clipped corners are sampled as ground: the name sheet's
  pressed look segment, white ink on accent to every reader, reported 1.12:1
  on Modern at both widths (2026-09-04). The segments carry their own radius
  now — a shape written so the guard can measure it, not a waiver.
- **The radius is clamped against the element's own box, never the clipped
  one.** A pill's arc belongs to the control; halving it to fit a box the
  scroll clamp cut down understates the inset by exactly the amount the clip
  moved the sample band into the arc. Measured 2026-09-04: the describe
  sheet's 51px `border-radius: 999px` sign control, clipped to its top 20px
  by the sheet's own bottom edge, took r=10 where its arc is 25 and sampled
  ten pixels of the sheet's cream ground inside the curve — 1.00:1 against
  its own cream ink, on a control every reader sees at 4:1. A vertical inset
  by `r` was tried first and reverted: it dropped 400 of 2,267 boxes, and
  inside `[x+r, x+w−r]` every y of a rounded rect is box paint anyway. The
  fix costs three boxes.
- **A neighbour's fill inside your box is your ground.** With the divider
  gone and `--s-radius: 0`, Neo's segments had neither a border nor an arc
  for the sampler to inset by, and an unpressed segment's muted ink was read
  against the pressed one's cyan at 1.65:1 at desktop width (2026-09-04).
  `.seg` keeps a gap wide enough that no segment's box holds a neighbour's
  paint. Two adjacent fills with nothing between them is the general shape;
  a border or a radius is what has always hidden it.
- **Text inside a transformed ancestor gets an 8px pad** — an axis-aligned
  box around rotated content smears border and ground pixels past every
  edge (the swinging wood sign).
- **The scroll clip bounds every sample box.** Content scrolled out of the
  shell's clip keeps its full rect; a studio control's box sampled where
  the dock actually paints reported 1.00:1 against the selected tab's blue.
  Same boundary `coveredBy` already held.
- **The clamp is the nearest scrollable ancestor, whoever that is.** The
  first clamp knew only `.stall-scroll`; the publish sheet scrolls too,
  and its hex past the sheet's own edge sampled at 1.00:1 against
  whatever painted at those coordinates. The shell's region and the
  sheet are one boundary wearing two class names.
- **A clipped sliver is skipped, not sampled.** A control cut to under
  16px at the region's edge holds no line of text — it is all border and
  corner arc, and sampling one reported a pill's terracotta ink against
  its own terracotta top border at 1.04:1. The control is measured in
  full wherever it stands clear of the edge.
- **Every `<details>` is opened before targets are collected**, exactly as
  the geometry pass already does and for the mirror image of its reason. A
  closed fold still hands back boxes for its contents, so its controls WERE
  sampled — against whatever the panel paints at those coordinates, which is
  not their ground and is often their own ink. Measured 2026-09-03 when the
  Activity rows became disclosures: 54 figures reported between 1.00:1 and
  2.9:1 across all three looks and both widths, every one of them a control
  nobody could see. A false red costs as much as a false green.
- **Boxes are re-read at the last moment before every shot**, after
  `document.fonts.ready`: the self-hosted face swaps metrics when it lands
  and the fit-content dock re-centres with it.
- **The viewport grows to the page height and the paint is redone** —
  `captureBeyondViewport` does not reliably paint backgrounds below the
  fold (a below-fold buy control sampled near-white).
- **A failing box is re-shot once before it is believed** — capture right
  after an emulated resize can raster a stale frame; a real defect is
  steady state.
- **Two glyph-settle frames after blanking** — a shot before a composited
  frame still shows the text (1.00:1 wherever a point landed on a glyph).
- **`color(srgb r g b)` is parsed alongside `rgb()`** — browsers serialize
  `color-mix()` results as srgb floats.
- **The QR is excluded**: black-on-white with a quiet zone by its own rule
  and test, never themed.
- **Both widths.** The desktop chrome is its own set of grounds (fd desktop
  head panels, the 860px column); the first two-width run found the
  translucent Modern dock at 2.48:1 over Drifting light's orbs under After
  hours — mobile-only had certified pixels nobody paints at 1280.

## Reduced motion (pass 3)

- The page's own `matchMedia` answer is required — emulation that silently
  did not apply is the 500px lesson again.
- The pass must measure a non-zero screen list, or it is vacuous green.
- **Stillness is asserted, not assumed** (`reduced motion left something
  running`): every `document.getAnimations()` entry still running under
  emulated reduce is a failure, once per painted combination. Incident: the
  round-3 motion consumers were appended *below* stall.css's reduce block
  and re-won by order — Neo flickered (neo-flick, neo-pulse, neo-sheen) for
  every reduced-motion visitor while the geometry-only pass stayed green.
  The reduce block now sits last in stall.css and says why; theme files
  carry their own reduce blocks, which out-specify it.
- **A waiting transition is a leak too** (`reduced motion left a
  transition armed`): under emulated reduce, any element whose computed
  `transition-duration` is non-zero (with a `transition-property` that is
  not `none`) fails, per painted combination. A transition never appears
  in `getAnimations()` at rest — it only runs while a property is
  mid-change — so the stillness scan above is structurally blind to it.
  Incident 2026-08-31: `.t-modern .item-caret` kept its 0.2s slide under
  reduce because the theme selector (0-2-0) out-specifies stall.css's
  reduce block (0-1-0), and thirteen theme-file transition rules had no
  kill at all. Every theme file's reduce block now sits LAST in its own
  file (stall.css's rule, same measured reason) and names its
  transitions alongside its animations.
- **The pass runs `offers,publish-name,describe,pay` and `broadcast`, and
  never the studio —
  so the studio's own sheet declares no motion at all.** `obsGuide.css`
  carries no transition, no animation and no `@keyframes`, and a vitest
  grep (`the-diagram-has-no-transition`) is what holds it, because nothing
  in this runner would ever see one. The design's card diagram transitioned
  its `translate` between presets; `renderBody` calls `replaceChildren()`
  and rebuilds that subtree on every picker change, so the nodes are always
  new at their final position and the transition could only ever sit armed
  — a reduced-motion leak with no animation to pay for it. Adding the
  studio to `REDUCED` instead would buy a fourth prepare against a budget
  already at its ceiling.

## The stream overlay: the canvas pass, and pass 5

`?view=broadcast` is a second render path sized for an OBS Browser Source,
and it broke three of this guard's assumptions at once: it is measured at a
width no pass had, it paints nothing on purpose, and it is composited over
somebody else's video.

- **1920x1080, and nowhere else.** The overlay's chrome is a 252px plate, a
  204px QR and a 39px price. Certifying that at 390px measures pixels nobody
  paints, and the page widths skip it for the same reason in reverse.
  `NO_DECOR_SCREENS` (`layout/fixtures.ts`) is the list, `screensForViewport`
  splits on it, and `?viewport=canvas` is the handshake.
- **The split is audited, not trusted.** Every geometry pass compares the
  screens the page says it measured against `window.__noDecorScreens`: the
  canvas pass must measure all of them and nothing else, the page widths none
  of them, and neither may measure zero. Proved by pointing the canvas pass at
  an empty screen list — `measured 0 screen(s)` instead of a tick over a pass
  that ran nothing.
- **The overlay wears nothing, so it buys one variant.** `renderStall`'s
  broadcast branch keeps only `slot: 'mood'` rows and mounts no ornament, so
  every worn variant is the same tree. `variantsFor` returns the bare list and
  the contrast driver **skips the `wornAll` loop** rather than painting to
  return zero targets — the prepare (a full paint, `document.fonts.ready`, two
  frames) is nearly the whole cost, which is the door-under-Neo lesson again.
- **Two rules are scoped away, stated rather than waived.** "The theme reaches
  all four edges" is the opposite of what `bg=transparent` is for, and the
  `.item-b` name floor is a grid the overlay does not have. The modal remains
  the one scoped exception.
- **A rested card mounts no price.** `mode=rail` shows the name alone for
  three seconds of every eight, and `renderBroadcastView` does not mount
  `.bc-ext` at `data-state='rest'` — same as the rail preset. A hidden
  `[data-role="price"]` is what the covered-amount rule exists to refuse, so
  rest does not leave one in the tree. **The quote card is the same slot**, so
  the rule reads the same way for `[data-role="seller-price"]`: rest mounts no
  money of either kind.
- **`[data-role="stall-name"]` is a contrast target.** It is the only line on
  the head plate that is not a money figure, and on a transparent wire it sits
  on the stream with one plate between them.
- **The quote card's own three screens.** `broadcast-quotes`,
  `broadcast-quotes-clear` (`cards=quotes`, cursor on the USD quote) and the
  stress `broadcast-quotes-long-name` are in `NO_DECOR_SCREENS` with the rest. Its figure is `[data-role="seller-price"]`
  — already in `PROTECTED` and `CONTRAST_TEXT` by selector, so the fixture is
  what makes those rules see it at all. It stays out of `__contrastScreens`
  for the budget reason the other overlay screens do, and **pass 5 is its
  contrast reader instead**: that pass now runs on both clear screens, over
  black and white, which is the harder question for a card composited onto
  somebody's video.

### The sticker source holds the card

`src/ui/obsSizes.ts` exports the numbers the studio's recipe tells a streamer
to type into OBS's Width and Height boxes, and nothing else in this guard can
see one go wrong. A Browser Source cut too short **clips** the card — from the
top on the bottom-anchored corner, from both ends on the centred rail — and
the first thing to go is the QR plate at the bottom of the stack, which is the
only way anybody watching reaches the stall. A clipped source scrolls nowhere,
covers nothing and stays inside the page it was cut to, so every other rule
here calls it healthy.

- **`the-sticker-height-fits-the-tallest-card`.** On every `NO_DECOR_SCREENS`
  screen and every look, `.bc`'s box height plus both insets must be
  ≤ `OBS_STICKER_HEIGHT` for a corner preset and ≤ `OBS_RAIL_STICKER_HEIGHT`
  for the rail. The height is ceiled: a Browser Source is typed in whole
  pixels, and the plates stack on a 1.15 line-height that lands on fractions.
- **`the-sticker-width-is-the-plate-plus-both-insets`.** The same box's width
  plus both insets must **equal** `OBS_STICKER_WIDTH`. 252 + 60 + 60 = 372 is
  the one number the stylesheet implies; an inequality would let the plate
  shrink under a recipe nobody re-derived.
- **Both insets count on both presets.** The corner is anchored
  `bottom: 60px` and keeps the same clearance above it; the rail is `top: 50%`
  with a `translateY(-50%)`, so a source's spare height is split above and
  below and half of it is not enough. The inset is **read**, not retyped:
  computed `right` is the one edge that is a length on both presets, `bottom`
  being `auto` on the centred rail.
- **The worst card is a fixture, not an argument.** `broadcast-long-name`,
  `broadcast-rail-long-name` and `broadcast-quotes-long-name` carry a 32-byte
  name (§5's ceiling) with no break opportunity. Neo clamps `.bc-name` at
  three lines where Modern and Rural stop at two, so Neo is where every preset
  peaks. All three are geometry-only and stay out of `__contrastScreens` —
  measured, the contrast pass sampled the same 1978 boxes before and after the
  first two, and 2658 before and after the third.
- **Two stresses stack, and a fixture that carries one carries neither.** The
  quote card (`cards=quotes`) is a line taller than a listing card — the chip
  above the figure, the line under its rule — and a long name is three lines
  on Neo. Each alone fits the shipped corner sticker; **together they measured
  810 against a ceiling of 800**, which clips the QR plate off the bottom of a
  source built to the studio's own recipe. Caught 2026-09-04 by adding
  `broadcast-quotes-long-name`, and it is the whole argument for keeping a
  fixture per combination rather than per feature.

Measured at the 1920 canvas, `.bc` box in px with the height ceiled. Add 120
for the source the recipe asks for. The listings rows are 2026-09-02; the
quote rows and the re-reads beside them are 2026-09-04, read on this box by
planting `OBS_STICKER_HEIGHT = 1` and reading the failure lines — the whole
table moved by 1px that day (605 where it said 604), which is a browser or a
font, not a layout, and is left as measured rather than smoothed.

| screen | Modern | Neo city | Rural |
|---|---|---|---|
| `broadcast`, `broadcast-clear` | 252x605 | 252x605 | 252x572 |
| `broadcast-rest` | 252x424 | 252x424 | 252x391 |
| `broadcast-empty` | 252x457 | 252x485 | 252x424 |
| `broadcast-long-name` | 252x604 | **252x638** | 252x604 |
| `broadcast-rail` | 252x424 | 252x424 | 252x391 |
| `broadcast-rail-long-name` | 252x424 | **252x457** | 252x424 |
| `broadcast-quotes`, `-clear` | 252x656 | 252x656 | 252x623 |
| `broadcast-quotes-long-name` | — | **252x690** | — |

Rail peak 457 + 120 = **577**, and `OBS_RAIL_STICKER_HEIGHT` shipped at 560:
the first incident. That number was arithmetic off the corner's card; the
review had already said in words that a three-line Neo name on the rail was
the one that could clip, and the measurement proved it. Raised to **580**, the
smallest multiple of 20 that holds 577.

Corner peak was 638 + 120 = **758** while the only card was a listing, inside
the shipped 800. The quote card is a line taller, and under a 32-byte Neo name
it measures 690 + 120 = **810**: ten over, and the ten that go are the bottom
of the QR plate. `OBS_STICKER_HEIGHT` raised to **820**, the smallest multiple
of 20 that holds it, and `public/stream.html` restates the pair by hand
(`the-stream-guide-figures-are-the-apps-own` reads them from `obsSizes.ts`, so
the page cannot drift from the constant in silence).

Both raises leave single-digit headroom, which is the point of a rule measured
to the pixel: the next line of chrome goes red instead of shipping a recipe
that cuts the QR in half.

Proved red by planting `OBS_STICKER_HEIGHT = 600`: 31 failures across the
canvas and reduced-motion passes, each naming its look and its own measured
height (`.bc is 252x638 … needs 372x758 — OBS_STICKER_HEIGHT is 600`), and no
other rule moved.

### The QR's density, per link and per route form

Measured 2026-09-04 through the app's own `qrMatrix` (ECC `M`, version chosen
by the library) at the shipped 204px box, with `qrSvg`'s four-module quiet zone
on each side — px/module is `204 / (data + 8)`, which is where "4.53 today"
came from. The links are built by `stallPath` / `payLandingUrl` over a dummy
identity nobody holds, at the production origin.

| link | route form | chars | data modules | px/module |
|---|---|---|---|---|
| share (`/s/<seller>`) | pubkey | 87 | 41 | 4.16 |
| share | address (`%3A`) | 71 | 37 | 4.53 |
| share | address (bare `:`) | 69 | 37 | 4.53 |
| landing (`?pay=<12 hex>`) | pubkey | 104 | 41 | 4.16 |
| landing | address (`%3A`) | 88 | 41 | 4.16 |
| landing | address (bare `:`) | 86 | 41 | 4.16 |

**The landing link is 41 modules in every form, which is parity with the
pubkey share link and one version above the address one.** The proposal
expected 37 for the address form; the measurement says otherwise, because
byte-mode capacity at ECC `M` version 5 is 84 characters and the address
landing link is 86–88 — the `%3A` a path encoder writes for the `:` costs two
of those. So an address-route stall's overlay code is denser than its share
code, at a density this app already ships on every pubkey-route stall. It is
nowhere near the BIP21-plus-memo shape this rail refused (156 chars, 53
modules, 3.34 px/module).

Not enforced by a test: it is a property of the vendored encoder and the link
shapes, and both are pinned elsewhere. Re-measure when either moves.

### `bg=transparent`, in declarations and in pixels

Two halves, because either alone is a lie a reader would believe.

- **Every clear screen, not one.** The pixel half runs over
  `CLEAR_SCREENS` — `broadcast-clear` and `broadcast-quotes-clear` — because
  each carries a different figure over the stream, and a card this pass never
  shot is a card nobody proved legible over video. The line prints the least
  clear frame of the set; an average would let one screen that painted a
  ground hide behind one that did not.
- **The declarations.** On a screen whose `broadcast.transparent` is set,
  `html`, `body`, `#app`, `.frame`, `.stall` and `.bc` must have a
  `background-color` with zero alpha and `background-image: none` —
  `::before` and `::after` **included**. The `html.bc-clear` longhands clear
  element grounds only; a theme pseudo-element painting a backdrop (Neo's
  scanlines are the shape to expect) would survive them unseen. Proved by
  deleting the `html.bc-clear` block from `broadcast.css`: six lines, naming
  `.stall`'s colour and each look's backdrop image.
- **The pixels.** `Emulation.setDefaultBackgroundColorOverride` with `a: 0`
  before the shot, then the frame is flattened in Node onto black **and**
  white and every contrast target is re-sampled against both. This is the only
  reader plate-ink-over-video has: the contrast pass shoots the overlay
  against a themed ground, and
  `a-theme-rule-never-pairs-a-literal-ink-with-a-token-ground` skips a ground
  whose value is `transparent` outright.
- **The alpha is asserted, or the composite is theatre.** Measured 2026-09-02:
  `Page.captureScreenshot { format: 'png', fromSurface: true }` with **no**
  override returns **colour type 2**, flattened onto white — every "over
  black" line would have been a white page wearing a black label. With the
  override, the same call returns **colour type 6** with alpha 0 outside the
  plates; `fromSurface: true` does not flatten it, the override may be set
  before or after navigation, and `captureBeyondViewport` and
  `fromSurface: false` make no difference. PNG alpha is **unpremultiplied** (a
  92% white plate comes back `255,255,255,235`), so the flatten is the
  ordinary `c*a + ground*(1-a)`. The pass therefore fails loudly when the
  capture is not RGBA, when nothing outside the plates is under alpha 255, and
  when the plates cover the whole frame.
- **Moods are measured here even though the contrast pass skips them.** A mood
  is the one worn row that reaches the overlay, and After hours moves the
  plate and its ink together — exactly what the theme pairing test cannot
  see, since it skips a ground whose value is `transparent`. Six
  combinations: three looks, worn and bare.
- Proved red by a plate at `opacity: 0.35`: twelve lines over black and white,
  including the name plate, while the ordinary contrast pass stayed green at
  1978 boxes. A plate too translucent for a stream is invisible to every other
  rule in this repository.

### Reduced motion, on the fifth sheet

`broadcast.css` ships two keyframes (`bc-in`, `bc-pulse`) and its own reduce
block, and the reduced-motion pass was hard-coded to the page screens — so
nothing had ever executed it. `broadcast` now runs as a second reduced-motion
read at the canvas width, and the fixture carries `broadcastStepped` and
`broadcastPulse` so both classes are on the tree: a runtime-only class is an
animation this guard can never see. Proved by deleting the reduce block — 27
failures naming `bc-in on div.bc-ext.in` and `bc-pulse on span.pulse`.

`broadcast-quotes` runs beside it, because the pulse sits on
`[data-role="seller-price"]` there — a second selector in the same reduce
block, and one that stilled only the other role would print this pass's tick
while a stream kept moving.

## Clip-path text containment

A clip-path is invisible to both the box check and the hit test: the
clipped-away region has no paint but the text keeps its rect. Every text
line inside a `polygon(...)`-clipped element must sit inside the polygon
(corners + centre, ray casting, half-pixel edge tolerance). The parser
handles `px`, `%`, bare `0` and single-operation `calc(A% ± Bpx)` — any
other grammar **fails loudly** instead of being measured wrong. Closed
preemptively by the 2026-08-30 review (`.item-p` and `.notice-chip` ship
clips today); no incident yet.

## Billboard (a decoration nobody can see is not a product)

- A **node** row: a real box of sellable size (≥100px²) inside the first
  fold — the first run found the beetle below the fold on every screen.
- A **root** row must change the painted style signature
  (`styleSignature()` — eight properties on three elements; the review
  marked this the guard's weakest joint, to be generalised into a full
  computed-style diff by the catalogue plan).
- A **mood** must move the canvas ≥60 channel-points — the first Sun-faded
  moved it four and a buyer could not tell they were wearing it.

## Budget

`RUNTIME_CEILING_S = 150` (raised from 60 on 2026-08-30 when contrast took
on the desktop width; measured 107–120s). The ceiling is enforcement: the
CLAUDE.md §11 second command has to stay something everyone actually runs.
If the runtime grows again, prune the matrix, do not raise the number
first. The reduced-motion pass re-measures only the animating screens;
state screens buy only the bare and fully-worn variants.

**The ceiling is a property of the matrix AND of the box, and only one of
those is in this repository.** Measured 2026-09-02 on the machine that
ported the studio section, back to back, all rules green in both:

| tree | contrast boxes | contrast | total |
|---|---|---|---|
| that day's `main`, 19:00, box idle (the window's own runs) | 1978 | 98.0s | **123.6s / 124.7s** |
| that day's `main`, 22:00, box busy (the desktop app rendering) | 1978 | 124.1s | **165.0s** |
| + the studio section, 22:00, same busy box | 2026 | 123.9s | **164.7s** |
| + the studio section, 22:10, window's run, same busy box | 2026 | 127.7s | **169.2s** |

So `pnpm test:layout` was **already over the ceiling on that hardware before
the change** — and three hours earlier, on the same hardware with nothing
else drawing, the same matrix ran at 124s: every pass, the build included,
was 1.8× slower at 22:00 (mobile 8.9s against 4.9s), which is the box, not
the matrix. Adding `.obs-h` — 48 boxes, 2.4% of the pass — cost nothing
a run can distinguish from noise. The lesson is a measuring one: a red
`runtime:` line is not by itself evidence that the diff in front of you grew
the matrix. Diff the **box count** first (it is printed on the contrast line
and is deterministic), and only then compare seconds — and compare them
back-to-back on one machine, because an earlier reading of 207.5s for the same
tree came from a box still hot from the vitest suite's five vite builds, and
two concurrent probe runs on one host also share `--remote-debugging-port=9339`
and each other's CPU. Whether to prune, raise the number, or call this box
slow is the owner's call and needs a reading from the machine that sets the
budget.

**Every pass now prints what it cost**, because the first session to meet the
ceiling had to guess which pass to prune and the guess would have been wrong:
measured 2026-09-02, the contrast pass is 95–113s of a ~120s run and
everything else together is under 25s, build included. Prune there or nowhere.

**Two prunes paid for the canvas, and neither costs coverage.** The tree
measured 141.0s before this work and 119.7s after, on the same box within an
hour.

- **The second prepare only when the viewport actually grows.** The contrast
  pass paints, learns the page height, grows the viewport and paints again —
  and for every screen that already fits, the second paint, font wait and two
  frames were identical to the first. Nothing repaints between them, so the
  first prepare's tree is the tree that gets shot.
- **The contrast driver has its own screen list** (`__contrastScreens`), not
  `screensToRun()`. The overlay's screens share one head plate and one card:
  `broadcast` carries every figure the others do, an ordinary shot of
  `broadcast-clear` is a shot flattened onto white — which pass 5 measures
  properly, over black and white, instead of paying for it twice — and the two
  long-name screens are geometry for the sticker rule, on grounds this list
  already holds. Measured: 1978 boxes before them and 1978 after.

**The number moves ±15% between runs on the same tree** (98.9s and 113.2s for
the same contrast pass, an hour apart). A run near the ceiling is not by
itself a matrix that grew.

Measured again 2026-09-04, with the quote card's three canvas screens, a
second reduced-motion screen and a second transparency screen added: **142.7s
settled**, against 136.6s for the tree before them — the contrast pass is
unmoved at 2658 boxes, because none of the new screens is in
`__contrastScreens`. The same tree, run **immediately after `pnpm test`**,
measured **185.5s** with every rule green and the same 2658 boxes: the vitest
suite's vite builds leave the box hot, which is the reading to throw away, not
the ceiling to raise.

And again with `plugin-missing-quotes`, the one screen that measures the pay
rail under a failure message: **147.3s and 146.3s** on two runs, contrast
116.7s / 115.7s over **2831 boxes** (+173, all of them that screen's — the
other three failure fixtures paint no section, because their quotes have no
metadata; 69 of the 173 are the section itself, measured by removing its
`prices` and watching the boxes fall to 2762). That is under 4s of headroom on
a number that moves ±15% between runs, so the next screen added to
`__contrastScreens` has to be paid for by pruning one, not by the ceiling.

And again 2026-09-04 with the quote rules — `genesis` and `descriptions` on
`offers`, `pay`, `pay-xec` and `describe`, the paste field on the describe
sheet, and the buyer note moved inside `.pay-amt`: **145.6s and 148.2s** on two
runs, contrast 114.8s / 116.9s over **2829 boxes** — two *fewer* than before.
The spread between those two runs is the same box measured twice, which is what
"±15% between runs" means and why the second reading is not a matrix that grew.
No screen was added: the new
lines are muted ink on grounds `CONTRAST_TEXT` already samples, and the two
boxes went when a quote row's name stopped being the token's name on the
`QUOTED` row. The ceiling is untouched and the debt stands.

**And again 2026-09-04 with the Shop panel's two rails, where the debt above
came due.** The segmented control is `.seg-b`, which `CONTRAST_TEXT` already
held for the record sheets — so splitting the panel put two sampled boxes on
**every page screen at once**, and the quote rows leaving `offers`, `empty`,
`pay` and `pay-xec` for their own side did not pay for them: **2,954 boxes and
150.8s**, every rule green and the runtime line red. Pruned rather than raised,
in the order this file already names: `crowded` and `sparse` left
`__contrastScreens` (`GEOMETRY_ONLY_SCREENS` in `fixtures.ts`, which `probe.ts`
subtracts) and the run settled at **2,541 boxes and 140.9s / 141.8s** on two
runs of the same tree, both alone on an idle box. Neither prune
loses a ground — every figure on those two is an offer card's, already sampled
on `offers`, and what makes each of them its own screen is geometry the
contrast pass never reads. Three screens were added and none of them is in that
pass. The lesson to carry: a **selector** already in `CONTRAST_TEXT` can grow
the matrix as much as a screen can, and it does it without anybody adding a
screen.

**On a second box the same tree read 152.7s and failed, then 144.7s and passed
minutes later** — the hot-box effect again, this time from the run that
followed `pnpm test` in §11's own order. Owner's ruling, 2026-09-04: **that box
is the slow one and the reading is its own, not the matrix's.** So nothing was
pruned and nothing was redesigned, and the settled figure to compare against
stays the 144–148s band this tree measures across boxes. Two things to carry
anyway: run this guard **alone** when a reading matters, and know what the
options are if a cold run ever crosses 150 — prune a screen out of the contrast
pass (coverage, so a decision rather than a cleanup) or measure something
steadier than wall clock (a redesign of what the ceiling means, which is not
the same as raising it). Raising it is still not one of them.

**And again 2026-09-04 with the quote's age, the positive mint chip and the
plugin-missing sentence: 134.3s and 130.7s** on two runs of the same tree,
contrast 104.5s / 102.1s over **2,552 boxes** (+11 on 2,541), every rule green,
each run started alone and cold. No screen was
added: the chip is a second `.chip` on rows that already had one, and the age
is muted ink on the same grounds. The eleven boxes are the whole cost of the
change, which is what "pay for a screen by pruning one" was protecting — and
the reading being a full ten seconds under the band above is the box, not the
matrix, exactly as the paragraph before this one says.

## What this guard still cannot see

- Whether a `t-*`-scoped theme override applies on every screen a base var
  consumer paints — `scripts/audit-shadowing.mjs` is static; its SHADOWED
  list stays a candidate list until a DOM pass proves screen coverage.
- Anything in the vitest suite's happy-dom, which does not lay out — the
  two runners cover different failure classes and neither substitutes for
  the other.
- **Worn decorations on the overlay screens, in the ordinary contrast pass.**
  Moods reach the overlay and nothing else does, and they are measured over
  black and white in pass 5 — but never against the themed ground a browser
  visit paints.
- **A stream that is neither black nor white.** Black and white are the
  extremes, not the general case: a plate that clears 3:1 on both can still
  lose against a mid-tone at the wrong hue. Nothing here reads a video.
- **Whether the QR scans.** The guard measures that it is not covered and not
  themed; scanning it from a monitor at 1080p and at 720p is a person with a
  phone, and has not been done.
