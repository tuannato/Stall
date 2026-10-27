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
- **A marquee never paints outside its cell** (2026-09-09). A cut name or
  words line runs inside a cell that clips (`[data-mq]`, `overflow:
  hidden`) — three passes on a shop row and one on a stream card since
  2026-09-12, `--mq-runs` written per surface, each pass ending with a 1.5 s
  hold at the tail (`--mq-ease`), which changes how long it moves and nothing
  about where; the moving part is a `transform` on the inner `.mq-run` span,
  never a positioned node — the decoration sweep reads every positioned
  node and would refuse it over the asked amount, and `text-spills` skips
  clipped overflow, which is what this rule relies on. Every
  `[data-marquee]` cell must have `overflow-x` other than `visible` and an
  inner `.mq-run`. The reduce pass gained `plugin-missing-quotes` the same
  day, so the kill for the quote row's name and words is proved on a screen
  that has them; the 1.5 s start hold keeps the contrast sampler's 400 ms
  freeze on whole glyphs. **The name path has its own screen since
  2026-09-14**: `long-item-name` carries a token name wider than a 390px
  row on its own. Measured while adding it: `offers` already armed two
  name cells at 390px on Modern (`Roasted Beans` on T1's grouped card,
  `Harvest Ledger` beside its ten-billion figure) — names past about
  twelve characters run on a phone row — so the name path had been under
  Chrome since 09-09 without anyone knowing. The rule refuses
  `long-item-name` at the phone width when **T1's own** name cell arms
  no run; "any cell" was the first version, and it stayed green with the
  name shortened because the crushed rows run on their own. Proved red
  with a short name (28 failures), then green.
- **A row tile covers its own line.** An Activity row's token tile sits in
  its own 24px grid column, and the kind and time start in the next. On the
  live origin at 1280px (owner, 2026-09-08) the desktop block's `.item-ic {
  width: var(--s-icon-d) }` and the looks' `.t-* .item-ic` out-ranked the
  tile's bare `.event-ic`, and a 56px tile sat over the first letters of
  every line — an in-flow overlap no protected box names, and the mobile
  pass could not see because the base `.item-ic` is 44px only past 680px.
  Every `.event-sum .event-ic` must end before the `.event-kind` beside it
  begins; the `activity` fixture carries a description row and a payment
  claim so both tile shapes are measured.
- **The poster's scrim is a modal surface too.** It carries the class
  `sheet-scrim` and the role `poster`, not the sheets' role, so the first
  poster screen (`pay-tag`, 2026-09-08) measured the shop behind it and
  reported the scrim covering every price there, while nothing inside the
  sheet was measured. Both scrim selectors name it now.
- **Print media is not measured by anything.** The probe emulates a device
  width under screen media; the `@media print` block — A4 at 794×1123 CSS
  px, `position: fixed`, no pagination — is read only by
  `the-print-poster-stays-black-on-white` and its siblings, which read
  declarations, never a layout. The tag's fifteen nodes were sized by
  arithmetic and then checked once under `Emulation.setEmulatedMedia`
  (`scripts/print-measure.mjs`, 2026-09-08); the measurement is recorded
  in `private/MANUAL-CHECKS.md`, and a change to the print block owes a
  rerun, not a test.
- **The viewport comes from CDP, not `--window-size`.** New headless clamps
  below ~500px: asking for 390 measured 500 while the runner printed 390.
  The runner fails when the page's own measurement disagrees with the ask.
- **The door only wears the default look.** The apex paints the default
  look (it has no record) and never fetches, so door-under-Neo is a
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
  variants would be `pay`'s painted twice, and since 2026-09-05 it is geometry
  only — its figure is `pay`'s in another unit, on the same ground. Both keep `prices` for the sheet they
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
  row on `pay` and `pay-xec` at every width and every look (the contrast half
  on `pay` alone since 2026-09-05), and nothing above it may be covered by it. Re-measured with this change: no rule moved.

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
  card against the undated ones (`pay-xec` by geometry alone from 2026-09-05, sampled again since 2026-10-06 for its borrowed-id warning — "The honest-display sentences are read"), and a two-chip name column against a track
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

The quote row's chip became "Genesis names this stall" (longer than "Minted
here") and the quotes rail gained a `QUOTES_READING` line for the window
before the walk answers (2026-09-05). Measured alone:
**2,602 boxes and 141.2s**; the name-floor rule did not move on any look.

The two Pay controls became `<button>`s (an anchor's destination can be
copied past the press-time valve), one `fine` line joined the pay sheet
(a payment is final) and the tolerance line is not mounted for an xec quote
(2026-09-05). Measured alone: **2,602 boxes and 144.3s**. `CONTRAST_TEXT`
matches `.buy`/`.mini` by class, so the buttons are sampled where the
anchors were.

Round 5, part 2 (2026-09-05): the pay sheet's provenance line became one
node painted in place, the tolerance line left the xec sheet, nothing else
on a measured screen moved. Measured **alone, cold: 2,602 boxes and
148.0s** — and **160.5s straight after three `pnpm test` runs**, which is
the hot-box reading the ledger already warns about, not a change in the
matrix. The contrast pass has drifted from 108s to 115s across the day on
the same box; the next screen added to the matrix pays for itself in prunes
first.

Round 6 (2026-09-05): the `offers` fixture carries a withheld FIRMA listing,
so the shop paints the withheld line and `WITHHELD_WHY` under the tabs; the
quotes rail can carry the same pair. No figure box moved — **2,602 boxes**
still — and the run measured **150.5s ninety seconds after three suite runs,
144.2s five minutes after**: the same box, the same matrix, the difference
is heat. The owner's ruling stands — read the cold number, do not prune for
a warm one.

Round 7, step 1 (2026-09-05): the pay sheet's fine print folded under
`pay-how` (a closed `<details>` the probe opens before measuring, so every
folded line is still sampled — folding buys the probe nothing, by design),
the positive provenance line and the quote's age moved into it, and the
moved state rides the view (`payRateOutcome`) so a fixture can stage it.
Measured alone, cold: **2,601 boxes and 141.7s**.

## A zoomed picture fills its frame, and wears none of the shelf's framing

Two rules in one sweep over `.zoom-frame`, added 2026-09-22 after the owner
photographed the defect on the live origin.

`zoomSheet` exists to show the seller's artwork **square and uncropped,
whatever the look does to that token's tile on a row** — its own docblock
says so, and had said so since it shipped. It did neither, for one reason
with four faces: `.zoom-ic` **is** `.item-ic`, the reset was written
`.zoom-frame .zoom-ic` at (0,2,0), and every look re-states
`.t-* .item-ic` at the same (0,2,0) in a file `render.ts` imports **after**
`stall.css`. Equal specificity, later file: the look won every property it
happened to name, and `stall.css` won only the ones no look mentions.

Measured in Chrome at 390×844 with a 900×620 picture and the real
`themeVars` output:

| | shipped | after |
|---|---|---|
| frame | 320×320 | 320×320 |
| icon | **320×270, bottom-aligned** | 320×320, `dy=0` |
| Rural radius | **50% — an ellipse** | 0 |
| Neo border | **1px cyan** | 0 |
| Neo clip | **the shelf's chamfer** | none |
| close ink / ground (Modern) | **`rgb(37,99,235)` on solid white** | `#fff` on `rgba(255,255,255,.12)` |

The 270 is the one a reader sees, and its cause is `grid-area: ic` riding
in from the row: `.zoom-frame` names no areas, so `ic` is a line that does
not exist, the icon is placed in an implicit track, and its `height: 100%`
resolves against that instead of the frame's square. **`place-items:
stretch`, `align-self: stretch` and `min-height: 100%` were each measured
and each still gave 270** — only `grid-area: auto` fills the frame. What
showed in the 50px gap was the frame's own `--s-surface`, which on Modern
is `rgb(255, 255, 255)`: a white band above the picture, which is what the
photograph shows.

**Nothing could have caught it.** No box covers another, so the decoration
sweep and the five-point hit test are both silent; `item-zoom` is in
`GEOMETRY_ONLY_SCREENS` so the contrast pass never ran there — and would
not have spoken anyway, since Modern's close was blue on white and
perfectly readable, merely the wrong control. happy-dom lays nothing out,
so no unit test could see a box. The rule that fits the incident is the one
that compares the two boxes and reads the computed framing off the icon,
and it is cheap: one `querySelectorAll` on a screen already rendered.

**Proved red** by returning the selector to its shipped one-class form:
**217 failures**, reporting `div.item-ic.zoom-ic is 203x208 in a 320x320
frame` — the probe's fixture paints initials rather than a picture, so the
defect was there to be measured with no network at all, on every look and
every mood, from the day the surface shipped.

**The shelf's mask and mark, and resets that win** (step 8f2; STEP-8-PLAN
§4.3 item 9, the 8f1 critic's item 4, the window after 8f1). A look may cut
its tiles to a shape with a mask (8f1 put the tile's initials in their own
span and a mark beside them for exactly that), and `.zoom-ic` is still
`.item-ic`: the zoom would cut the seller's picture to the shelf's shape. So
the same sweep reads the computed `mask-image`, `-webkit-mask-image` and the
two mask border sources off the icon ("the zoomed picture wears the shelf's
mask") and every mark inside it ("… the shelf's mark": a tile mark that
computes anything but `display: none`). And the reset wins whatever weight a
look's rule has: a worn-only look's sheet lands after stall.css, so
`.t-x .items .item-ic` — (0,3,0), the natural way to scope a tile's shape to
the rows — beat a (0,3,0) reset on source order. Since 8f2 every property
the reset takes off is `!important` — border, radius, clip, both masks, and
the mark's `display` — the base sheet's only uses beside `[hidden]`, and G4
refuses `!important` in a look sheet, so nothing a look writes can beat
them (`the-base-sheet-says-important-only-where-a-look-must-never-win`
pins the list). **Proved red with a (0,3,0) plant**, never (0,2,0), which
loses to the reset at any weight: the tracked fixture planted
`.t-fixture-private .zoom-frame .item-ic { mask-image: linear-gradient(#000,
transparent); border-radius: 50% }` (with its `-webkit-` twin), which lands
after stall.css. With the reset's `!important` taken off the mask and the
radius, `item-zoom` failed on the fixture at the phone and the desk —
"the zoomed picture wears the shelf's mask" 10 times and "… framing" 10;
with the `!important` back, the same plant moved nothing (0 of either).

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

**`.notice-chip` joined on 2026-09-22 with no incident behind it — and
produced two of its own within the hour.** The announcement's "From the seller" label is
`<span class="notice-chip">` and not `.chip`, so the line that had been in
this list since the quote chip never matched it: the seller's own label, on
the shop, the empty screen and the wall, was measured by nothing. Measured
before adding it, all three looks pass comfortably — white on `#2563eb` is
5.17:1, `#1a070e` on `#ff4d7a` is 6.10:1, `#fff3ea` on `#9e4620` is 5.75:1 —
because each look declares BOTH halves as literals in one block, and a pair
of literals cannot come apart under a mood. That is also why
`a-theme-rule-never-pairs-a-literal-ink-with-a-token-ground` is silent here:
it fires on a literal ink over a token ground. The selector is on the list so
the first look to reach for a token on one half is measured rather than
trusted. That was the whole of the intent; what it actually bought is
below.

**Adding it found two defects in the SAMPLER, not in any look.** Both were
pre-existing and general; the chip only exposed them, because it is the
first target that paints its own saturated ground against a near-black page
while carrying a clip.

1. **A `clip-path` was invisible to the sampler.** Neo's chip is a
   parallelogram, `polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)`,
   so its top-left and bottom-right corners keep their pixels in the
   bounding rect while painting nothing — and what the camera finds there
   is the look's near-black page. Fourteen figures at **1.12–1.26:1**
   against a declared pair of 6.10:1, with the glyphs wholly inside the
   polygon (the containment rule above already proves that). `clipBand` in
   the probe now narrows the sample to the widest band that is paint at
   every height of the box — for this chip, exactly 6px off each side. It
   reuses `parsePolygon`, so it inherits that function's "refuse a grammar
   you cannot read" rule, and it is **convex only**: across a notch the two
   crossings bracket a gap that is not paint, and a band quietly laid over
   one is the false green this pass exists to prevent. A non-convex target
   is refused instead.

2. **The two far edges rounded outward.** `x1`/`y1` were
   `ceil(edge) - 1`, so a box ending at `y + h = 340.5` sampled row 340 —
   the row Chrome paints half element, half page. The near edges never had
   it, since `floor(edge) + 1` steps past their partial row by
   construction; the far ones had been asymmetric with them for as long as
   this sampler existed. Four figures survived the clip fix at
   **1.20–2.84:1**, every one at its box's own bottom row, on grounds
   `rgb(42,28,42)` and `rgb(147,53,83)` — the pink blended into the page.
   Both far edges `floor` now. An antialiased edge is the element's own
   boundary and not a reading surface, which is the reason `bw` already
   steps around a border; most targets never showed it because they sit on
   the same ground as the page behind them, or carry a border whose
   `bw + 1` was covering for it.

**Proved red**, after both fixes, by moving Neo's chip ink from `#1a070e`
to `#a33f5c` — 1.93:1 against its own pink: **14 figures, every one
reporting exactly 1.93**. Reading the declared pair back to two decimals on
all fourteen is the evidence that neither fix made the pass blind; a
sampler still reading a blended edge could not produce that number.

**`LAYOUT_WHY=1` is what found both.** It prints, beside each failing
figure, the worst pixel's position, the ground rgb actually there, the ink
compared against, and the band that was walked. A contrast figure with no
pixel behind it cannot be told from a sampler bug — and both of these were
sampler bugs that read, at hex level, as a look shipping unreadable text.

**What the same walk found and did NOT close**: the chip's SIZE is measured
by nothing. `small-text-is-one-scale` and `muted-text-is-not-microscopic`
both read `stall.css` alone, so the base rule's 11px — whose own comment
calls 11 the floor — is overridden to 10.5 (Modern), 10 (Neo) and 10.5
(Rural) invisibly. The second test is correctly out of scope, since the
chip's ink is not `--s-muted`. The first simply cannot see a theme file, and
widening it there is a change with its own blast radius: §6 says a look may
set any metric, so a size table that reached into the theme sheets would be
the cage §6 exists to refuse. Recorded, not fixed; the call is the owner's.

**The shop tile's letters joined on 2026-09-20, and the incident is the
reason the list is never "done".** `stall.css` paints `.item-ic`'s initials
in `color: var(--s-bg)` over a gradient of both accents, with a comment
saying why that is legible — `legibleOn` corrected both accents against bg.
Rural and Neo then replace that gradient with a flat literal (`#f3e7ce`,
`#131b30`) and re-state no colour, so the letters kept an ink chosen for a
ground that is no longer there: **1.10:1 on Rural and 1.18:1 on Neo**,
computed from the shipped palettes, beside every product whose token has no
picture.

Two guards were blind for two different structural reasons, which is what
makes it worth writing down. `.event-sum .event-ic` joined this list on
2026-09-15 for exactly this class of defect and stopped at the Activity
tile — the same class, one class name away. And
`a-theme-rule-never-pairs-a-literal-ink-with-a-token-ground` fires only
when ONE rule declares both ink and ground; here the ground is in the theme
file and the ink is inherited from the base sheet, two rules in two files,
which its own docblock names ("a token over a literal is the same failure
upside down") and cannot see. **A ground restated without its ink is
invisible to the static guard by construction, so the pixels are the only
judge** — which is the argument for adding a selector here whenever a theme
sheet overrides a background the base sheet chose an ink against.

`targetFor` already skips a tile wearing an `<img>`, so what this samples is
letters and never a picture. Found by a human reading a screenshot, after
six read-only agents and this pass had all walked past it.

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
  fold (a below-fold buy control sampled near-white). The page height is
  the document's, and the viewport it takes for the shell's region and an
  open sheet to hide nothing; a page that fits is shot at its own size
  ("Shot at the real height", 2026-09-24).
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

## The money set is every protected contrast target (step 5b, 2026-09-26)

Step 5b reads every contrast target over its own text's line rects except
the money boxes, which keep the whole-box read (below, "The sampler reads
text"). So which targets are money has to be one closed list, and it is:
`MONEY_SET` in `layout/moneySet.ts`, selector literals pinned by value —
the price, the You-pay row (`.row.big dd`), every `.buy`, the address's
two spans, both record hexes, the fiat glance and the rate, the receipt
amount, the seller's price, both surcharge lines, the selection's total,
the pay sheet's lines and total, and the two Pay controls by role
(`pay-cashtab`, a `.buy`; `pay-wallet`, a `.mini`). PROPOSAL §12 named the
set in words ("the Pay pills"), which is not a selector; CRITIC-STEP-5
item 2 found five members the words missed.

`the-money-set-is-every-protected-contrast-target` holds it from both
sides:

- **statically** (`moneySet.test.ts`): every selector that is in
  `PROTECTED` and in `CONTRAST_TEXT` is in the set, every member is a
  contrast target (the two Pay roles through the class each wears), and the
  probe takes the set from that module;
- **in the browser**, on every screen, look and variant of every geometry
  pass: every painted node that is a contrast target and a protected box
  matches the set, and every node the set matches is a contrast target
  standing in a protected box — `pay-wallet` aside, money by what it hands
  a wallet and in no protected box by its dress. The deck is not asked.
  `moneyChecks` counts the nodes asked; it runs on every geometry pass,
  and the phone and desk passes owe some (`probe-coverage.mjs`): 4,804 and
  5,212 on the day it landed.

**Money outside `PROTECTED`, and text inside a money box** (the critic,
2026-09-27). The set began as `PROTECTED ∩ CONTRAST_TEXT`, so money text
outside a protected box fell to the line read with D7: a chosen row's line
("2 × $5.00 = $10.00") wears its own role now, `selection-figure`, which is
protected, a contrast target and money; the touch wall's Pay
(`window-pay`) matched no contrast target at all and is all three now. And
the browser half fails a contrast target whose nearest protected ancestor
is money unless it is money too: the wall payment's `.sw-pay-v` and
`.sw-pay-s`, inside `pay-lines`, read by the line read until then (2,223
and 57 failures before they joined the set). Proved red by taking
`selection-figure` and `window-pay` out of the set (below, in the step's
last commit).

**Proved red** by taking `receipt-amount` out of the set: 35 failures on
the phone and 35 on the desk, every one the Activity fold's amount ("is a
protected box and a contrast target, and is not in the money set"), the
static test red on both halves, and the rule below vacuous.

### An outlined money figure is ring-read at its worst

PROPOSAL §12 said "money boxes keep the whole-box sampler", and round 8 had
already made that false: the Activity receipt amount is outlined on Neo's
rain and read in the ring around its glyphs, because a whole-box read over
the flattened drop fails it with nothing but a ground or a moved row to
fix it (CRITIC-STEP-5 item 1). The amendment, the window's by
recommendation: **a money box is never read by a weaker verdict** — the
whole box, or, for a figure outlined on a decoration's bare ground, every
solid ring pixel, no percentile, with the decoration at its worst.
`an-outlined-money-figure-is-ring-read-at-its-worst` is the runner's: an
outlined target that is money must have been ring-read on a job whose rain
was flattened (the outline is scoped to the rain, and a job whose worn and
flattened counts differ is refused by its echo — this names the money half
of that), and a shipped run that ring-read no money figure fails as
vacuous. It read 10 on the day it landed (the receipt amounts on
`activity`, Neo worn, at the phone and the desk). Proved red by the same
plant: "read no outlined money figure — vacuous green".

## The shop window hung the tall way (pass 2b, 2026-09-19)

`window.css` carries **three** layouts for the cycle card, and the probe
reached two of them.

- Landscape — the desk widths and the 1920x1080 canvas.
- `(orientation: portrait) and (max-height: 1200px)` — the counter tablet,
  which the 768x1024 `TABLET` pass matches. Picture beside the text.
  **It was the 390x844 pass until 2026-09-20**, and only because the wall
  fixtures ran there; the day they stopped — correctly, the app cannot
  paint a wall at 390 — this block lost its only reader and this sentence
  became false. Measured in Chrome against the real `window.css`: of the
  five viewports in the matrix, 390x844 was the ONLY one entering it. A
  pass removed is a pass that has to be replaced, not a line of prose that
  can stay.
- `(orientation: portrait)` with that max-height **not** matching — the
  stacked column a wall-mounted portrait screen paints. **No viewport
  reached it.**

So half the layout of the thing the feature was asked for (owner,
2026-09-18: "Cũng thiết kế để hỗ trợ màn hình dọc") sat behind a media query
this guard could not enter, and every run printed a tick over CSS nothing had
executed. Note the trap: asking only for `orientation: portrait` would NOT
have closed it — 390x844 is portrait, and it takes the short variant.

The pass is 1080x1920 over the four shop-window screens through `?screens=`,
the way pass 3 runs the animating ones; the rest of the app has no
portrait-only rule and re-measuring it would double the run for nothing.

- The page echoes the media condition back as `portraitTall`
  (`(orientation: portrait) and (min-height: 1201px)`), and the runner
  **refuses the pass when it is false** — the `reducedMotion` guard, for the
  same reason: emulation that applied a size while the query stayed unmatched
  would certify the landscape layout under a portrait label. Proved by
  setting the pass to 1080x900 and watching it refuse.
- The pass must measure all four screens or it is vacuous green.
- **Proved it has eyes**: `width: 3000px` planted on `.sw-strip` inside the
  tall-portrait block produced **602 failures** in this pass — sideways
  scroll and text-spills, on every look and every seek instant — while
  mobile, desktop and canvas all stayed green. That the other three passes
  missed it is the measurement of the gap, not just of the plant.
- Cost: +2.8s (181.7s → 184.5s against the 200s ceiling).

### What the portrait pass does NOT cover: a turned screen's geometry

`turn=cw|ccw` (2026-09-19) rotates the whole frame a quarter so a television
hung sideways reads right. Its **layout** is already covered: a turn at the
canvas viewport produces the same 1080x1920 container this pass runs, and
since `window.css` asks `@container` rather than `@media`, the same rules
fire. Its **rotation geometry** is not, and the reason is structural:
`getBoundingClientRect` is axis-aligned, so over rotated content every cover
rule would read a box's bounding rect as overlapping its neighbours and the
pass would be a field of false failures. Adding it needs rules that work in
the rotated frame's own coordinates, which none of these do.

Measured by hand instead, 2026-09-19 at 1920x1080, both directions: frame
1080x1920, covering exactly (0,0)–(1920,1080), `document.scrollWidth` 1920
with no sideways scroll, and the cycle card taking the stacked
`"ic" "name" "price" "qr"` areas. That is a reading, not a guard.

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
  broadcast branch keeps only `slot: 'mood'` rows, strips every `att-` class
  from its root (a mood may carry one since D11), and mounts no ornament, so
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
| share | address (`%3A`, before 2026-09-06) | 71 | 37 | 4.53 |
| share | address (no prefix, shipped) | 63 | 37 | 4.53 |
| landing (`?pay=<12 hex>`, the width a link still carries) | pubkey | 104 | 41 | 4.16 |
| landing | address (`%3A`, before 2026-09-06) | 88 | 41 | 4.16 |
| landing | address (no prefix, shipped) | 80 | 37 | 4.53 |

**Re-measured 2026-09-22, when the parse floor dropped to eight hex.** The
WRITER stays at twelve and this table is unchanged: measured over the same
three route forms, an eight-hex parameter produces the same 37 / 41 / 41
modules — no form changes version, so the shorter link buys nothing and the
owner kept the twelve it costs nothing to write (`MIN_PAY_PARAM_CHARS` is
the floor a memo's own eight-hex prefix is pasted back through).

**Re-measured 2026-09-06, when `stallPath` dropped the `ecash:` prefix from
the address form.** Before it, the landing link was 41 modules in every
form — byte-mode capacity at ECC `M` version 5 is 84 characters and the
prefixed address landing link was 86–88, the `%3A` costing two of those. The
bare form is 80, inside version 5, so an address-route stall's overlay code
is now the same 37 modules as its share code; the pubkey forms are unchanged
at 41, a density this app ships on every pubkey-route stall. Nowhere near
the BIP21-plus-memo shape this rail refused (156 chars, 53 modules, 3.34
px/module).

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
- A **mood** must move the canvas by at least ΔE00 5 — the first Sun-faded
  moved it four channel-points and a buyer could not tell they were wearing
  it. Measured in CIEDE2000 since step 5a′; the heading below has why and
  the numbers.
- Worn **together**, no root row may erase another: each single row's
  signature is compared against the all-root dress, and equality means the
  cascade ate the rest (aurora once erased the rain's image and animation
  both).
- Worn with a **mood**, every other row must still apply (round 10,
  2026-09-16, from the owner's ask that After hours stop flattening what is
  worn beside it). The row-against-bare rule above compares against the
  unworn look, so nothing checked a row against the palette it is actually
  wearing. Each non-mood row is painted twice — the mood alone, then the
  mood wearing the row — and identical signatures fail. Five pairs across
  the shipped catalogue, since only Modern and Rural ship a mood; the run
  measured 142.5s against the 150s ceiling with it in.
  **What it does not prove:** that the row can be *seen* under that mood.
  Signatures are computed style strings, so a hairline lost against a
  near-black ground still reads as a difference — the old Pinstripe's exact
  failure. A pixel rule was designed and refused: every area-and-magnitude
  threshold that would have failed the old page frame (1.2% of the frame,
  changed hard) also failed the paper confetti (0.16%, sparse on purpose),
  so the threshold would have been tuned to one case and would reject
  legitimate designs. That judgement belongs to the eye, and the workshop
  framework's checklist now carries it: look at every row under every mood
  it can be worn with, at 390 and 1280.

### A mood is measured in CIEDE2000 (step 5a′, D10, 2026-09-26)

The mood rule was an RGB channel sum ≥ 60 over `bg` + `surface`. It refused
青墨 (28 points), the mood the design board approved, while being a proxy
for nothing a buyer sees. It is now `moodDistance(base, palette)`
(`layout/moodVisible.ts`, pure): the larger CIEDE2000 difference of the two
grounds a mood swaps, sRGB companded as `relLum` does, CIELAB against a D65
white (0.95047, 1, 1.08883) — pinned, because CSS `lab()` is D50 and there
the fixtures read 7.89 / 4.18 / 6.97. `MOOD_VISIBLE_MIN = 5`. The probe
fails a mood row on either of two readings:

- **The row**: the mood's `bg`/`surface` against the look's.
- **The painted page**: the computed `background-color` of `.stall` and of
  the first `.item` on `offers`, bare against worn (`paintedDistance`). Each
  is resolved to sRGB by the browser itself — filled into a 1x1 canvas and
  read back — so `color-mix()` (serialised `color(srgb …)`), `oklch()`,
  `lab()` and fractional channels read like `rgb()`. A ground not opaque
  both ways (alpha under 255, or transparent) is skipped; only when neither
  is opaque both ways does the check fail, saying so. This half is what
  catches a look sheet painting both grounds from literals.

**Known limits, stated:** a literal root beside a token card passes on the
card's move alone; an opaque `background-image` over a token
`background-color` is not seen (only the colour is read).

Why 5: the two moods it separates move differently, and CIEDE2000 counts
the two moves differently near white. 青墨 is mostly a loss of chroma — b*
9.13 → 1.25, ΔC* −6.14, ΔL* only −1.37 — and at chroma this low CIEDE2000
counts a chroma move close to one for one: the a*b* part alone is 7.29 of
its 7.34. Sun-faded v2 over today's paper is half a lightening, ΔL* +2.95
at L* ≈ 97, where the lightness weight S_L ≈ 1.7 cuts it to 1.73, beside a
chroma loss of 4.98 that counts 3.73: 4.11 in all. OKLab weights the
lightening more and reads them the other way (青墨 2.57 below v2's 2.85).
Only the first Sun-faded was ever judged by eye; the gap is narrow, and a
mood landing in it is a call to make with the pictures.

The fixtures (`a-mood-is-measured-in-ciede2000`, RGB literals, never names):

| mood | against | ΔE00 | verdict |
|---|---|---|---|
| 青墨 #ece5d4 → #dde3df, bg only | its paper | 7.34 | visible |
| Sun-faded v1 (`2dc16aa`) | Rural's paper of its day | 1.28 | refused |
| Sun-faded v2 (`a450bc2`) | today's Rural paper | 4.11 | refused |
| Sun-faded as shipped ((c) inks) | today's Rural paper | 6.86 | visible |
| After hours | Modern | 88.6 | visible |

Recorded, not pinned as a verdict: v2 against its own day's paper reads
6.96 — it was refused on 2026-08-30 only because Rural's paper moved to meet
it. The formula is held to all 34 of Sharma's published pairs to 4 decimals,
in both orders (`ciede2000-matches-the-published-pairs`,
`layout/ciede2000-sharma.ts`).

**Proved**, on the shipped Rural look, every plant reverted:
- Sun-faded's `bg` set back to v2's `rgb(255, 251, 241)`: red in all seven
  passes, "Sun-faded moves its grounds by ΔE00 4.11" and "Sun-faded moves
  the painted page by ΔE00 4.11".
- `.stall.t-rural` and `.t-rural .item` given their bare grounds as
  `!important` literals, the row untouched: "Sun-faded moves the painted
  page by ΔE00 0.00" alone, all seven passes.
- `.stall.t-rural` `transparent` and `.t-rural .item` at alpha 0.9: "neither
  .stall nor the first .item paints an opaque background-color both bare
  and worn, so the painted page could not be measured", all seven passes.
- `.stall.t-rural` as `color-mix(in srgb, var(--s-bg) 99%, black)` and
  `.t-rural .item` as `color-mix(in oklch, var(--s-surface) 99%, black)`:
  **no billboard failure** (the transparent overlays fail for the plant's
  opaque ground, as they should). The first build's regex read the same
  plant as "`.stall` paints no opaque ground (color(srgb 0.99 0.986118
  0.970588))" — the refusal of a safe design this fixed.

## Budget

`RUNTIME_CEILING_S = 300` (raised from 60 on 2026-08-30 when contrast took
on the desktop width, measured 107–120s; to 200 on 2026-09-19 and to 300 on
2026-09-22, the owner's calls, `layout-check.mjs` says why; a watchdog since
step 3a). The ceiling is enforcement: the
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

**Measured 2026-09-20 on a 4-core, 3 GB box, three runs on one machine, and
the ceiling is red on all three** — the rule above is why this is reported
as three readings rather than one verdict:

| run | tree | contrast boxes | contrast | total |
|---|---|---|---|---|
| 1 | `a4194a6`, six read-only agents on the box | 2504 | 143.4s | **206.7s** |
| 2 | `a4194a6`, two agents | 2504 | 149.7s | **215.4s** |
| 3 | fixes + `.item-ic` on the list, box quiet | 2525 | 142.2s | **202.4s** |

Every geometry, reduced-motion, contrast and transparency rule is green in
all three; the only red line is `runtime:`. Run 3 adds a selector and is the
FASTEST of the three, which is the ledger's own point made again: the box
moved the number, the matrix did not. `.item-ic` cost **21 boxes** (2504 →
2525, 0.8%) because `targetFor` skips a tile wearing an `<img>` and most
fixture rows carry one.

Later the same day, after the QA/critic round, with `shop-window-sheet`
added and the switch targets settled — and with nothing else on the box,
which the two contaminated readings between these taught:

| run | matrix | contrast boxes | contrast | total |
|---|---|---|---|---|
| 4 | + the sheet fixture, suite running beside it | 2504 | — | 295.2s (void) |
| 5 | + `.sw-switch-label`, box quiet | 2696 | 142.2s | **203.7s** |

Run 5 is the current tree: every geometry, reduced-motion, contrast and
transparency rule green, 39 screens at both page widths, and the sheet that
had never been measured at all reporting zero. It carries **one more screen
and 171 more contrast boxes than the 2,525-box run above** and is still
faster than either of that day's earlier readings — the box, again.

And the round after that, with the wall screens declared out of the narrow
pass rather than stripped inside `paint()`:

| run | matrix | contrast boxes | contrast | total |
|---|---|---|---|---|
| 6 | mobile 36 screens, desktop 39 | 2471 | 136.4s | **194.3s ✓** |

**Green, ceiling included** — the first clean exit of the day. It came from
correctness, not from pruning for speed: the three page-level wall screens
cannot exist below `WINDOW_MIN_PX`, so the narrow pass stopped painting
them, and with them went 225 contrast boxes and about nine seconds of
measuring a layout the app cannot produce. A pass that measures an
impossible state is paying for a wrong answer.

**Two readings in this table are void and say so**, which is the point of
writing them down: a `pnpm test` running beside the probe patches
`vite.config.ts` for its own build and adds a competing vite build, so the
seconds mean nothing and `served-weight-has-a-ceiling` fails on a bundle
that includes `layout/probe.html`. Do not run the suite and the probe at
once; this session did it twice.

Whether to prune, raise the number, or call this box slow stays the owner's
call and needs a reading from the machine that sets the budget — which is
what this table is for, not a licence to raise it.

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

**2026-09-05, the item face: 132.4s, contrast 100.4s over 2,035 boxes** (−566
on 2,601), every rule green, run alone and cold. The expander became a face —
one token on one rail, painted in flow where the rows were, with no scrim —
and the rows lost their glance lines (rate, fiat, "lowest of N", ticker and
stock) to it, which is where most of the boxes went: a glance line was a
`CONTRAST_TEXT` target on every row of every offers screen, and now it is
one box on one face. The `expanded` screen is `item-listing` (same payload:
`.row.big dd`, the withheld FIRMA row, the unbroken description, the
listings block), so the rule that measures a long asked figure against the
name column still has a screen to read. Three sheet states joined,
**geometry only**: `pay-moved` (the valve's outcome staged on the view,
`payRateOutcome`), `pay-dust` (a one-satoshi XEC quote, no link composed),
and `item-quote` (the quote rail's face). Two screens left the contrast
pass to pay for the face being sampled: `pay-xec` is `pay`'s sheet with a
figure in another unit, `emoji-name` is the sign's ground under a different
string. Both keep their geometry rules. The face's back control is a
`<button>` with no chrome of its own at a 44px hit target, which the
no-controls rule on the broadcast never sees because the broadcast mounts no
overlay at all.

**2026-09-05, the door and the first stall: 131.6s, contrast 98.0s over 2,032
boxes** (−3 on 2,035), every rule green, run alone. (The door half was reverted
the same day on the owner's call; the first-stall half stands.) The door became two beats
— the seller's three steps, then the paste box — with the illustration
upright and small on every width instead of the tilted desktop-only card,
and the never-spent screen became a checklist with the stuck step marked. No
new protected box: the door still mounts no price, no QR and no copy-link,
and the first-stall screen's two controls are the shipped `list-in-cashtab`
anchor and the retry. The checklist numbers are `<i>` nodes, like the OBS
recipe's, so `positionedPseudos` has nothing to refuse. The two door screens
and `unresolvable` are still in the contrast pass; three fewer boxes is the
old door's chips and seller paragraph leaving the sampled set.

**2026-09-05, the studio's three cards, the sheets' "More" folds and the
activity strip, one reading for both: 130.9s, contrast 96.1s over 2,025
boxes** (−7 on 2,032), every rule green — and this one was started straight
after three suite runs on the weak box, so it is a warm reading that still sat
under the band. The studio's sections became three cards and a preference
(`.scard`, `.trow`, `.kv`), the OBS recipe folded under Share, both record
sheets moved everything past their headline fields under a closed `More`
after the sign controls, and the activity panel lost both section headings.
No protected box moved: the probe opens every fold before it measures, so
the hex, the QR and the meter are guarded under `More` exactly as they were
under their own folds, and the seven fewer boxes are the studio's retired
hint lines and the two activity headings leaving the sampled set. Nothing
new to prune; nothing new to skip.

**2026-09-05, after the door revert and the QA batch:** the door's chips and
seller paragraph are back in the sampled set, so the count the two entries
above subtract is back too — 2,029 boxes on the reverted tree, measured by
the independent QA run. The studio's desktop two-column block had been lost
with the door revert's region replace (it sat between the door's phone rules
and the door's own media block) and is rebuilt as `.stall-body.studio`; the
Rural tag lost 4px of chrome at every width so a six-letter name at 375px no
longer breaks mid-word; `.item-detail`, `.detail-rows`, `.desc-section` and
`--s-detail-x` are gone (a var with one reader that no element carried —
the `--s-accent-2` shape, which `every-theme-var-reaches-the-stylesheet`
cannot see). **And the first run of this batch went red**: `item-listing` on
Rural with both root rows worn, `span.item-fiat` at 2.64:1 — the face's fold
sat straight on the sunburst's rays, because `card` was a design word with
no rule of its own and the face had no ground; the bigger face figure had
moved the line onto a darker ray, which is how a layout shift found a
missing ground. `.face` and `.scard` now carry the item card's own ground
tokens. Read alone after that fix: **131.7s, contrast 99.7s over
2,017 boxes**, every rule green.

**2026-09-05, the quote surfaces re-titled and a thirty-second screen:
136.9s, contrast 101.9s over 2,023 boxes**, every rule green, run alone. The
token name titles the pay row, the quote face and the pay sheet head now,
with the seller's words following (one line with an ellipsis on the row,
whole on the face) — the same ink on the same grounds, so no box moved.
`first-stall` joined the screens, geometry only: the seller's checklist had
been on no screen since the never-spent address gained its visitor variant
the same day — the numbered `<i>` steps, `aria-current="step"` and the two
controls are measured for overlap and edges now, and their muted status
lines are not contrast targets.

**2026-09-05, `text-spills`: words that paint past their box, under a control
or cut off.** Measured live on the owner's phone: the quote row's one-line
words (nowrap, ellipsis) ran under the Pay control on Neo — the flex column
that holds the name aligns its children to the start, so a one-line sentence
was sized to its content and never clipped, and no rule saw it: the coverage
rules read what `elementFromPoint` returns, and a control painted over
spilled text returns the control. The rule walks every block with words
(`aria-hidden` decorations and empty boxes skipped, inline boxes skipped)
whose `overflow-x` is `visible` and whose `scrollWidth` exceeds its
`clientWidth`, and calls the spill a defect in two cases only: the spilled
strip **overlaps another element** that is neither ancestor nor descendant
(a control, a price node, a name, a line of fine print), or it **crosses the
nearest clipping ancestor's right edge** (a sheet, the scroller). A box that
merely pokes into its parent's padding is tolerated — the door's paste unit
runs 16px into the door's own padding by design, and the activity summary
grid is 4–6px wider than its row on every look, past the card edge and under
nothing (worth a look in the polish round, not a defect by this rule).

A first, wider form (any spill at all) fired 1,498 times on the first run,
almost all of it the Neo sign's `aria-hidden` chevron strip, seven times per
variant across the animation instants — which is what taught the rule to
skip decorations and to say *where* the words land. Proved red on the live
defect (the `.pay-b` column, 10–115px under the Pay control across the three
looks) and on a second one nobody had reported: the pay sheet's words `dd`
in Neo's mono face, 39px past the sheet's edge. Both fixed in the same
commit: the name column caps every child at its width, the sheet's words
wrap anywhere. Green after: 133.3s, 2,023 boxes, every rule.

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

## A contrast target nested in a contrast target (2026-09-15)

The sign's address became a row with a copy control in it — a `.mini` inside
`.addr`, both on `CONTRAST_TEXT`. `__contrastPrepare` read each target's ink
and blanked the node **and its descendants** in one loop, so by the time the
inner control was reached its colour was already transparent and the backup
the read falls back to had never been written; the runner threw
`unreadable computed colour "undefined"` and the whole pass was lost, green
rules and all. The prepare step now reads every ink first and blanks second.
Nothing else changed: a nested target is still sampled in its own box, and
the outer box still counts the inner control's ground as ground.

The same row moved the contrast target off `.addr` and onto its two text nodes,
`.addr-toggle` and `.addr-full`: the row's box now holds the copy control, and
sampling the row counted the control's ground as the address ink's background
(2.84:1 on Modern, 1.55:1 on Rural worn, for grey mono that sits on its own
ground at well over 3:1). The control is a `.mini` and is sampled in its own
box; the protected-box list still names `.addr`, the row.

Two more contrast targets the same day: `.event-sum .event-ic` (the Activity
tile's letters, restyled in round 8 to ink on an accent tint after the look
review found them unreadable at 9px on Neo and Rural — and the empty tile a
row without a token wears, which has no letters and samples its ink token
against the row's ground) and `.door-chips li` (the door's fact chips, ahead of
the pill rule that unborders them). Both were contrast claims on the design
board; the pass measures them.

**The same shape again on 2026-09-20, the day the shop window's sheet first
got a fixture.** `switchControl` builds `button.mini.sw-switch` holding a
state pill, and `.sheet .sw-switch[aria-pressed='true'] .sw-switch-state`
paints that pill on `var(--s-accent)` — while `.t-modern .mini` and
`.t-rural .mini` both declare `color: var(--s-accent)` and Neo's declares a
neighbouring cyan. So the button sampled its own label's ink against the
pill's ground: **1.00:1 on Modern and Rural, 1.09:1 on Neo, at both widths,
on the very first run that could see this screen.** Neither text was
unreadable — the label sits on `--s-surface` and the pill's ink is
`--s-surface` on the accent.

The remedy is the address row's: the container stops being the target and
its text becomes one. `.mini` on the list is `.mini:not(.sw-switch)` now,
the label moved into its own `.sw-switch-label` span, and that span and
`.sw-switch-state` are targets in their own boxes. **The lesson to carry:
adding a contrast target that CONTAINS a coloured control is how a pass
reports a false red, and this project has now done it twice — check for an
inner ground before adding a container to the list.**

The pill itself was tried as a target on the same day and **withdrawn —
with the reason corrected the same evening, which is the part worth
reading.** `.sw-switch-state` reported 1.00:1 on four of six
look-and-decoration combinations. **1.00:1 is not a colour this component
can produce**: pressed it is `--s-surface` ink on an opaque `--s-accent`,
unpressed it inherits `--s-accent` over the button's own `--s-surface`, and
the worst of those pairs measured across every shipped look and mood is
**4.05:1** (Rural under Sun-faded) against this pass's floor of 3 — 5.17:1
(Modern) since Sun-faded's inks went darker on 2026-09-25 (5.65 there now). So the
pass was not measuring the pill, and no real contrast problem is hidden by
taking it off the list — the label beside it stays measured here.

**Two reasons written into the first version of this entry were false, and
both were caught by review.** It said the sampler's insets could not land
inside the pill: they narrow **horizontally only**, by `r` clamped to half
the box, which for a ~40px pill leaves a band of about 18px in the middle —
the insets land inside. And it said the pair is "arbitrated by `legibleOn`
per palette": `themeVars` runs `legibleOn(theme.accent, bg)`, accent
against **`--s-bg`**, never against `--s-surface`, which is emitted raw and
arbitrated as an ink nowhere. The pair passes on today's palette numbers,
not by construction.

So **what produced the 1.00 is unexplained**, and this entry says so rather
than offering a theory. A false red is as useless as a false green; a wrong
reason for withdrawing a target is worse than either, because it is what
stops the next person looking. If the pill goes back on the list, dump the
box and the shot for one failing combination first.

A target that wears a picture is skipped (`targetFor`, the same day): the
Activity tile whose token image had landed sampled the image's own pixels
against the letters' ink — 2.20:1 bare and 1.18:1 under Sun-faded on Rural,
2.64:1 on Neo — while every letters tile beside it read 5.7–12:1 and every
empty tile 7–17:1 (pixels measured with the scratch script). There are no
letters under a picture; nothing was unreadable.

## The door's deck looks away from one rule, and says so

Round 16 (2026-09-20) put three real `.stall` subtrees on the door at
~0.6 scale (`doorDeck` in `render.ts`): the shop's own row anatomy over
fixture words, `aria-hidden`, no control, no price role. The name-column
floor (`.item-b` ≥ 64px) is measured against those rows too, and a column
that is 90px on the phone screen is 57px in the picture — arithmetic, not
collapse. The check skips `[data-role="door-deck"]` and nothing else: every
row a buyer reads is still measured on every stall screen. Every other rule
— cover, clip, sideways scroll, spills, contrast — runs over the deck as
over anything else.

## Nothing in the body reaches the status line (step 5b, 2026-09-26, the owner's (a))

The wall's grid gives the body a `minmax(0, 1fr)` row and the status line
the row under it, and the body does not clip. A Cycle card taller than its
row painted straight over the status line, and no geometry rule saw it:
the status line is no protected box, the card is no decoration, and
`nothing-on-the-wall-is-cut-from-below` reads clips, of which there were
none. The line-rect contrast read (D7) found it first, reading "Showing
listings" at 1.96:1 against the card's own dashed edge.

`nothing-in-the-body-reaches-the-status-line`: on every wall screen, every
element in `.stall-body` that no ancestor inside the body clips must end
above the status line's top (a device pixel's tolerance) wherever the two
share columns. It counts the elements it asks (`statusLineChecks`), and the
canvas, portrait and tablet passes owe some (`probe-coverage.mjs`).

**Red on `main`, as it stood** (every look, bare, one row at a time and all
worn): at 1920×1080 the card ended 110.2px over the line on Rural with the
Yard beetle, 10.2px on Rural bare and under every other Rural row, 9.4 /
7.4px on Modern under the Awning; at the counter tablet (768×1024) 47.9px
on Rural with the beetle and 2.5px on Modern all worn — 9 failures on the
canvas pass and 6 on the tablet.

**The fix** (`window.css`, the owner's (a): the card's own air steps down,
the code does not, every decoration stays as worn): a landscape block for
the 901–1200px-tall container (the 1080 wall) takes the body's block
padding to 10px, the card's to 16px, its row gap to 8px, the name to
`min(4.8cqh, 4cqw)` (52px at most) and the figure to `min(7.4cqh, 6.4cqw)`
(80px at most); the tablet's own block takes the same padding and gap and
no type — its code is at its 280px floor already. **The tablet is the
owner's (a) carried one size over**: the decision named the 1080 wall, and
the rule found the same overflow at 768×1024 the day it landed.

Card bottom against the status line's top, before → after (px; negative
is clear):

| Size | Look, worn | Before | After |
|---|---|---|---|
| 1920×1080 | Modern bare / Pinstripe | −41 / −40 | −104 / −103 |
| 1920×1080 | Modern all worn (Awning) | **+9.4** | −67.6 |
| 1920×1080 | Neo, any | −43 | −106 |
| 1920×1080 | Rural bare, and each row but the beetle | **+10.2** | −65.9 |
| 1920×1080 | Rural + Yard beetle, alone or all worn | **+110.2** | −15.9 |
| 1920×1080 | skeleton | −41 | −104 |
| 768×1024 | Modern all worn | **+2.5** | −40.2 |
| 768×1024 | Rural + Yard beetle | **+47.9** | −23.7 |
| 768×1024 | the rest | −36 to −70 | −74 to −107 |
| 1080×1920, 1280×900 | every look and row | unchanged | unchanged |

(At 1280×900 Rural with the beetle stands 1.8px clear, unchanged.)
Pictures: `private/design/workshop-2026-09-23/step5b-shots/wall-*`.

## No look pseudo paints inside a protected box (step 5b, D6(i), 2026-09-26)

A pseudo-element has no box the DOM hands back. The geometry passes refuse
a positioned one outright (`positionedPseudos`), and an in-flow one is
invisible to them: `position: relative` with offsets, or a negative
margin, moves its paint while every box the probe reads stands where it
stood. So a look pseudo is measured by its paint. A **look pseudo** is a
`::before` or `::after` a look sheet or a decoration rule generates — a
rule whose selector names a `t-…` or `att-…` class (`markLookPseudos`,
which walks every rule of every sheet, `@media` groups opened, and marks
each element in the job's scope that generates one with content). The base
sheet's own pseudos are the app's chrome and are held like any node.

On every contrast job whose scope holds one, the runner captures a fresh
frame, hides every marked pseudo (`visibility: hidden`, through an adopted
sheet toggled on the root), captures again and shows them, and compares the
two frames inside every protected box (`__protectedBoxes`), a device pixel
in from each edge; a channel moving more than `LOOK_PSEUDO_LEVELS` (2) is a
look pseudo painting there, and the job fails
(`no-look-pseudo-paints-inside-a-protected-box`). No capture where no look
pseudo exists, so today it runs on Neo's jobs alone: 64 jobs, 1,744,542
protected pixels, 12.4 s (phase `look pseudos`) on the day it landed, with
nothing changed. A shipped run that compared no frame fails as vacuous.

**Proved red** by the critic's plant (CRITIC-STEP-5 item 11): `.t-neo
.item-a::after { content: ''; display: inline-block; width: 24px; height:
12px; background: #f0f; position: relative; left: -30px }` → 40 protected
boxes "changes 276 px … when the look's pseudo-elements are hidden", beside
the box reads that also caught the pink inside a price box.

**D6(ii), the blank sheet removed** (step 5b, after D7). The adopted sheet
that turned every target's `::before`/`::after` ink transparent is gone: a
pseudo beside the text lies outside every line rect, and one over the text
is ground and is read — which the sheet used to hide. Removing it moved no
box (the dump before and after: 7,342 identical). A whole-box money read
stays safe from a look pseudo's glyph only because of the rule above.
**Proved red** by the critic's plant, `.t-neo .wearing::before { position:
relative; left: 40px }`: 42 Wearing lines at 1.03:1, the pseudo's cyan
"//" now read as the ground under the words.

**The rain scoping came off** (SAMPLER-STEP-PLAN §2, the same commit):
`.orn`, `.wearing`, `.wearing-link`, `.section-title`, `.collection-name`,
`.collection-count` and `.item-back` are contrast targets on every look,
bare and worn, read over their line rects (and in the ring where the rain
is worn). The three reds that scoped them are gone: Modern's section and
shelf heads read 15.54:1 at the least (2.56 by the box, its underline),
Neo's 9.93 (1.24, its wedge), Rural's ornament strip 4.20 (1.01, its
bunting row), Neo's Wearing line 6.74 (1.08, its "//"); Rural's Wearing
links 3.12 under Sun-faded since its inks went darker. The Activity rows,
the first-stall numbers, the footer's lines and the invite's chip stay
scoped to the rain: elsewhere they stand on a card or a ground every look
was proved on, which is their own reason, not the sampler's.

## Every moving decoration has a reader or a reason (step 5b, 2026-09-26)

The pass freezes every animation at one instant, so a green under a moving
decoration is luck. `layout/movingDecor.ts` lists every catalogue row with
`motion: true`, keyed by its class, each with a **reader** — the rule or
test that holds the lines it can reach at its worst — or a written
**reason** it needs none; `every-moving-decoration-has-a-reader-or-a-reason`
holds the keys to exactly the moving rows and each reader to a name some
test or rule in the repository carries.

| Class | Reader, or reason |
|---|---|
| `att-rainfall` | `a-line-on-the-ground-reads-wherever-a-drop-falls` (the flattening, the ring read) |
| `att-confetti` | `every-confetti-scrap-clears-three-to-one-under-every-ground-ink` (pure) |
| `att-sunburst` | `every-sunburst-ray-clears-three-to-one-under-every-ground-ink` (pure) |
| `att-aurora` | `the-aurora-is-read-at-both-ends-of-its-tide` (below) |
| `att-bunting` | `the-bunting-never-swings-into-the-ornament-label` (below) |
| `att-pinstripe` | reason: runs in the cards' 2px border alone, under no line |
| `att-hum` | reason: moves an ink, not a ground (staged with G7) |
| `att-beetle` | reason: roams its own yard strip, where no line stands |

Moving inks (Neo's ticker flicker, the hum's dimmed lamp, the pin demo,
Rural's swaying tag and swinging board) are not grounds and stay open,
staged with G7.

**The aurora is read at both ends of its tide** — on two conditions its
pure half pins (`layout/auroraTide.test.ts`): each wash's colour is at
least the ground's on every channel, every ink Neo sets on bare ground is
lighter than the ground, and, the washes' alphas read from the sheet, the
least contrast across the tide at every falloff strength is at an end
(`TIDE_SCREENS`,
`contrastPlan.ts`). Worn alone no line wears the outline, and the all-worn
job wears the rain with it. So each screen whose lines stand on Neo's bare
ground — the rain's own list, the offers screen, the wall's Cycle — is
painted with the aurora alone, its `--au-tide` held (important) at 0 and
again at 1; each channel of the wash is convex in the tide, so the ends
are the worst. 46 jobs; each job's echo holds every aurora-wearing stall to
a held tide, and a shipped plan with none fails as vacuous. The first run
read Neo's vacant-box line at 2.69–2.95:1 over both ends; the owner's lift
(the colour, `.sparse-empty-s` to the muted under the aurora as under the
rain) reads 4.92–5.52. Proved red by taking the lift off: three figures at
2.69–2.90:1.

**The bunting never swings into the ornament label**: Rural's bunting row
sways ±0.6° about its origin inside `.orn`, beside the strip's own label.
The probe reads the widest turn from the row's own keyframes, the row's
box before its turn from its art's topmost paint down (`buntingArt.ts`,
an allow-list reader of `bunting.svg`: every control point bounds a path;
the box is taller than the drawing, and the first version, which swept the
whole box, failed on the empty space above the string), and turns it to
each end: it must not reach any line of the strip's own text, a device
pixel in. Phone and desk passes owe a row swept where Rural is measured.
Proved red by `.t-rural .att-bunting { margin-top: -34px }`: 123 failures.

## The sampler reads text (step 5b, D7, 2026-09-26)

The pass read the worst pixel inside a target's border box, so anything the
look painted in the box that the glyphs never cross counted as ground —
Modern's accent underline under a heading, Rural's bunting row in `.orn`,
a card's dashed edge — and two workarounds grew for the same mistake (the
heading's in-flow-marker step-past, the rain scoping). Now **every contrast
target outside the money set (`layout/moneySet.ts`) that wears no outline is
read over its own text's line rects** (`lineRectsOf` in the probe,
`lineRead` in the runner):

- the rects `Range.getClientRects()` gives for every non-blank text node
  whose nearest contrast target is this one (a nested target is read as
  itself), **each against its own element's ink** — a muted name inside an
  ink control is read against the muted;
- clipped like the text: by the target's own overflow and every clipping
  ancestor's, per axis, and by its own convex `clip-path` band;
- **every pixel wholly inside a rect** — no lattice, no radius or border
  inset (a line rect holds neither);
- where the frame is turned (Rural's swaying tag, the swinging board), the
  line box before its turn, from the actual angle (`angleOf`), and only the
  pixels inside it — the fixed 8px pad is gone. A money box inside a turned
  frame is read at the lattice points inside its own turned box, and a
  Rural price figure the old pad erased is read now (11.37 bare, 5.31 worn);
- a control whose only mark is a drawn glyph (`.step`, the sheet close) is
  read over its `svg.ic`'s box;
- **no silent drop**: a line target that yields a rect and no pixel fails
  the job ("a target with text and no sample"), a whole-box read that finds
  no pixel fails too, and every node that gave no box is counted by reason
  on the pass's line (`nodes that gave no box: clipped-away, draws-nothing,
  not-rendered, sliver`) and per job in the dump (`skips`).

The heading step-past is deleted: a marker the text does not cross lies
outside every rect. Money boxes keep the whole-box read (and outlined lines
the ring), "a money box is never read by a weaker verdict".

**What moved, on the same capture.** The comparison is not part of an
ordinary run, stated plainly: only `LAYOUT_LEGACY=1 pnpm test:layout` reads
each line target the old way too and writes `legacy`, `at` and `bucket`
into the dump (`.layout-dump/shipped-latest.json`, untracked); an ordinary
run reads the new way alone, so nothing guards the falls between two
commits but the 3:1 floor. To ask again: run with `LAYOUT_LEGACY=1` and
tally the dump's line boxes whose `worst` is under `legacy`, by `bucket`.
The last full list of falls past 0.1 is untracked, in the owner's working
tree (`private/design/workshop-2026-09-23/step5b-shots/d7-falls.txt`); the
figures below are that run's: 4,744 targets read over line rects; 288 rose, 3,818 stayed,
476 fell, **none across 3:1** once the wall's card fit and the vacant line
was lifted (before those two fixes this read is what found them, at 1.96
and 2.73–2.95:1). The falls, bucketed by where the new worst pixel lies:

| Bucket | Falls | Past 0.1 | What it is |
|---|---|---|---|
| lattice | 418 | 238 | inside the old band: a pixel the old 12×8 lattice stepped over |
| ink | 28 | 28 | a nested line read against its own ink (the Shop tab's muted name, 13.09 → 5.48) |
| inset | 27 | 16 | inside the box, in the old radius, border or 8px pad |
| content area | 3 | 3 | past the box's top or bottom: a font's content area over a tight line box |
| spill / clipped / dropped | 0 | 0 | — |

162 line targets the old read dropped in silence are read now (the letter
tiles' initials 132, the sheet close 20, Rural's unbuyable label 4, two
more). Against the previous commit's dump: 6,411 identical, 929 moved; the
money boxes that moved are the five inside a turned frame (the Rural figure
above, 11.37 / 5.31 from none; Rural's surcharge on the wall 12.90 → 13.52
and 12.20 → 13.52; the ticker's Rural figure 6.06 → 6.04); one old box is
gone (a Browse tile whose letters are scrolled out of the strip, which the
old clamp sampled as a 16px sliver of the tile's ground) and one appears
(a chip on the 35-item plate the old sliver rule skipped).

## What the line read retired and let in (step 5b, 2026-09-26)

- **`studio-items` is sampled** (off `GEOMETRY_ONLY_SCREENS`). It was held
  out for its wrapped guide link, which the box read put at 1.00–1.08:1
  over its union (the hint's grey words inside it). Per line fragment it
  reads 5.17:1 at the least on every look, bare and worn; the `.tid`
  glance 5.58, Rural worn's `.tool-lede` 5.58. The plan grows by 7 jobs on
  the phone and 7 on the desk, as the token-glance note measured:
  `the-contrast-plan-is-every-job-the-pass-owes` is pinned at mobile 228,
  desktop 258, canvas 29, total 515.
- **`CHROME_ON_TEXT` is retired.** The face's expand cue was stepped
  around because the box read took every pixel in the hero tile as the
  letters' ground; the letters' own rects never reach the cue's corner, and
  with the mechanism switched off every tile read the same (4.61:1 at the
  least). The holes, the cap and `chromeOver` are gone.
- **`.sw-switch-state` is a target.** The box read put the 17px pill at an
  unexplained 1.00:1; its line reads 5.17:1 on every shipped look and
  decoration and 4.61 on the skeleton.
- **The insets stay for money only.** The radius, border and far-edge rules
  of the whole-box read (above, "Rendered-pixel contrast") now apply to the
  money set alone; a line rect holds no border and no arc.

## A line clipped out of view is held to a ceiling (step 5b, the critic, 2026-09-27)

A line target whose every fragment is clipped away, or that is not
rendered at the pass's width, gives no box and is counted, never failed —
it is not on screen. So a change that clipped a whole line out of view read
green. `LINE_SKIP_CEILING` in the runner holds those counts per viewport at
what they were when step 5b landed (mobile: clipped-away 63, not-rendered
35; desktop: 23 and 28; canvas: 726 and 0 — 964 until the wall payment's lines joined the money set and left the line read; `clipped-away` also counts a
target whose own `clip-path` leaves under 2px). A pass that finds more
fails and names the count; one that finds fewer says so, and the ceiling
should come down with the change that lowered it. **The ceiling is the
public looks' own** (8e2): it counts the shipped looks' and the skeleton's
jobs alone, exactly as measured, and every private look a run carries is
held to a ceiling of its own (`CARRIED_LINE_SKIP_CEILING`,
`scripts/look-tallies.mjs`; "A carried look is held to its own tallies"
below).

## A halo never reaches a neighbour's text, and what no target reads is said (step 5b, 2026-09-26)

**`a-halo-never-reaches-a-neighbours-text`** (probe, every screen, look and
variant of the geometry passes; SAMPLER-STEP-PLAN v2 item 10). A halo is a
ground laid outside a box: a non-inset `box-shadow` with no blur, at half
opacity or more, with a spread or an offset — the rain's old halos, the
sticky sheet head's `0 -26px` slab. Its painted extent (the box moved and
grown) must not meet a line rect of any text outside the shadowing element
on the same surface (behind an open sheet's scrim is another layer), a
device pixel in. The colour's alpha is resolved by the browser, so an
`oklab()` or `color-mix()` shadow reads. It runs on every geometry pass,
and the phone and desk passes owe **A soft shadow is not a halo** — soft meaning its blur is at least twice
its spread and its offset (the critic, 2026-09-27: a 1px blur on a 30px
spread is a slab, and was exempt when any blur was), and a hard one's
extent grows by half its blur — stated:, stated: measured literally, every card's drop and every glow met
the next line on every look — 1,700 failures a pass over designs that read
— and a guard refusing a safe design is a guard defect. Proved red by
`.t-neo .notice { box-shadow: 0 0 0 30px var(--s-bg) }`: 54 failures, the
notice's halo over the sign's tagline.

**Text no target reads** is printed on the contrast pass's line, whatever
the verdict (`uncoveredText`): every element kind whose visible,
non-aria-hidden text stands in no contrast target, and on how many jobs.
A report, never a failure — most of it is text on a card every look was
proved on; it is the list the next target is chosen from.

## A code keeps its quiet zone white (step 5a″, D4, 2026-09-27)

`qrSvg` draws every code on a white rect of its own with four modules of
white around the matrix — the quiet zone a camera needs to find the code.
The geometry rules hold every box off a code; nothing held its paint. A
look that clips the code or strokes an outline over it takes the quiet
zone away while every box stands where it stood. So on every contrast job
the runner reads, for every code in the job's scope (`__quietZones`, the
deck aside), **the ring inside the square the SVG draws into** — the
content box less its own letterboxing, module = that side over the
viewBox — from one device pixel in to one device pixel short of the matrix
(`4 × module − 1`), and every channel of every pixel there must be at least
245 (`scripts/quiet-zone.mjs`, `QUIET_ZONE_FLOOR`;
`a-code-keeps-its-quiet-zone-white`, pure half in `quiet-zone.test.mjs`).
The code's own rounded corner is stepped past where the radius reaches past
its padding and border, and only up to one module: a radius cutting deeper
is a fault (CRITIC-STEP-5 item 3 — the square read of v1 failed Modern's 6px,
Rural's 8px and the wall's and overlay's 4px corners on the sheet's
ground). The ring is read inside every clipping ancestor and the shot; a
code whose frame is turned is not read and is listed. The read is on the
blanked capture, which blanks text alone. A shipped run that read no code
fails as vacuous.

**Read on the day it landed**: 21 codes, 3,231,032 ring pixels, all white —
the overlay's (`broadcast`, `broadcast-ticker`), the wall's shop code
(`shop-window-wall`, and Browse, Cycle, quotes and unbuyable at the desk)
and its payment plate (`shop-window-touch-quotes-pay`, `-35`), the pay
sheets' (`pay`, `pay-several`, phone and desk), the record sheets'
(`publish-name`, `describe`, desk — the phone folds them away) and the
share code (`studio`, `studio-items`, `unresolved`, both widths). The
runner prints both lists on every run. **Painted and not read**, because
their screens are geometry only: every other overlay screen (the same
plate), `pay-moved`, `pay-xec`, the tag's poster (`pay-tag`, and print is
not measured at all), `shop-window-cycle-unbuyable`,
`shop-window-touch-quotes` and `-pay-3` on the canvas, and every wall code
at 1080×1920 and 768×1024.

**Proved red**, one run, three plants: `.t-neo .qr { clip-path: inset(12px) }`
→ 42 codes; `.t-modern .qr { outline: 6px solid #e6f0ff; outline-offset:
-14px }` → 40. The plan's own plant, a tint on the plate's inner edge
(`.t-rural .qr { box-shadow: inset 0 0 0 12px #f3ddbe }`), reads green, as
the critic said it would: an inset shadow paints under the SVG's own white
and reaches only the padding, which is outside the zone `qrSvg` draws.
**A bug the first run found in the rule itself**: the clip crossed to the
runner as JSON, where an infinity is `null` and `Math.ceil(null)` is 0, so
every code under no clipping ancestor (the overlay's, the unresolved
screen's) read as wholly clipped away — painted, listed as not read, green.
The page sends finite bounds now and the reader refuses a clip that did
not arrive as numbers.

**The codes owed by name** (the critic, step 5a″ item 7): a run reads the
quiet zone of every code that pays — `pay` and `pay-several` at 390 and
1280, the wall's payment plate on the 1920 canvas — and one of each other
kind (both record sheets at the desk, the share code at both widths, the
overlay's, the wall's shop code), and fails naming any it did not
(`CODES_REQUIRED` in the runner). **Not read, stated**: the wall's plate at
1080×1920 and 768×1024 — the portrait and tablet passes are geometry only,
and reading them would add two viewports to the contrast plan; not done
this step. **A code cut by an ancestor's clip reads green on the part still
showing**: the ring is read only inside every clipping ancestor, so what
the clip hides is not read. That cut is a geometry rule's, not this one's:
`.qr` is a protected box, so `cutSideways` fails one cut at a side, and on
the wall `nothing-on-the-wall-is-cut-from-below` fails one cut on either
axis; elsewhere a code behind a scroller's edge is on screen once scrolled,
and the contrast shot grows the page until it is.

## The seller's name on the sign reads (step 5a″, D14, 2026-09-27)

`.stall-name` is a contrast target on every look (`.stall-name:not(.deck-stall *)`:
the door's deck minis keep the class and are pictures), read over its line
rects (D7) — it is not money — and so is the tagline under it
(`.stall-tagline:not(.deck-stall *)`, the window's side note: it was on the
"text no target reads" list on 293 jobs). The static half is
`layout/signName.test.ts`, `the-sellers-name-on-the-sign-reads`; the runner
prints the least per look, bare and worn, and fails a shipped run that read
no name on a shipped look bare or worn.

**Blanked past any animation** (CRITIC-STEP-5 item 4): the prepare blanks a
target's ink and shadow with `!important` inline declarations, because an
animation outranks an ordinary inline one — the hum's failing lamp sets its
colour and its glow by animation and stayed painted, read as its own ground.
**The name's own glow is not its ground; the lamp's dip is G7**: Neo's cyan
halo and a worn crest's hum are the glyph's own paint and are blanked with
it — where the name wears the outline, the outline stays and every other
shadow goes (`outlineOnly`). The name is read at the pass's frozen instant,
which the run prints: `neo-flick` at 400 ms (opacity 1) and the lamp at
400 ms of its cycle, lit.

**What it read first, and the owner's (a).** On every look but Neo worn the
name read 5.53:1 (Rural) and more. Over Grid horizon — Neo with the horizon
alone, and every all-worn Neo job — it read 1.79:1 at 390, 2.25:1 at 1280 and
1.51:1 on the wall, over a lit window or a star of the skyline the horizon
draws on the sign (`step5a2-shots/`). The owner chose (a), 2026-09-27: where
the horizon is worn, the name wears the rain's outline — the one-pixel set
(it is 27px and more), zero blur, alpha 1, in the colour of the ground it
stands on — and nothing else changes: no ground under the words, the art
untouched, Neo's glow restated after the outline (and the crest's, with the
lamp's flicker run as `att-hum-gutter-outlined`, the outline in every
frame). The tagline wears it wherever the horizon is worn (the owner, via
the window): on the wall it stands in the sky beside the name and read
1.08:1 bare. Its set is its size's — two pixels at 12px on a phone, one at
14px at the desk and 21px on the wall — and its colour its own: it stands
lower than the name, where the horizon's floor sink darkens the panel, so
its outline is the panel's top two stops taken half way to the page ground
(`OUTLINE_GROUNDS`' `.stall-tagline` row, a `stops` read with `sunk: 0.5`;
the panel's own colour fell outside its ground at the desk and on the
wall). **`sunk: 0.5` is fitted, not derived**: below the line at a phone
and a desk the floor sink lies over the panel; on the wall the tagline
stands in the sky just above the line, where the sink (from 44% of the sign)
has already begun; the half-way mix is the one colour measured inside every
one of those grounds. The sign's third line, `.stall-sub`, is a target too, and needs no
outline: its own bordered chip stands below the line, 9.30:1 at the
horizon's worst.

**Every outline guard takes it for its own reason:**
- **The surface a decoration paints on** (`OUTLINE_SURFACES`): the rain's
  is the stall root; the horizon's is the sign (`.stall-sign`), and only a
  line on the sign may be outlined for it. `an-outline-where-the-text-has-its-own-ground`
  walks from the line up to that surface and no further: the sign's panel
  (`.stall-head`, an opaque gradient) lies under the horizon's art, so it is
  not the name's own ground — and anything between the name and the sign
  that paints one is. Proved red: `.t-neo .stall-headings
  { background-color: #0a1120 }` → the name and the lamp fail it on every
  horizon screen.
- **An outline that shows at rest**: the horizon's skyline, moon and stars
  are the decoration's art on its own surface, set aside by name, form,
  element and class (`SURFACE_ART_SET_ASIDE`), as the rain is on the root.
  **Not every other layer is read** (the critic, item 3): a layer sized
  smaller than its box is set aside and counted ("a gradient smaller than
  its box") — on the sign that is the horizon's line, its glow, the floor's
  lines and verticals, the haze and the second accent's sky wash, which
  stands behind the name at 390 — and a radial or repeating layer is held
  to its stops (the head's cyan glow and scanlines), which widens the band.
  Only the full-size floor sink and the panel's own gradient are evaluated
  under the line. The outline's colour is the sign panel's top two
  stops mixed evenly, `color-mix(in srgb, #101a2c, #0a1120)`, listed in
  `OUTLINE_GROUNDS` under the horizon's scope with a `stops` read that holds
  it to the layer as `theme-neo.css` writes it. Proved red:
  `--rain-outline-ground: var(--s-bg)` on the sign → rgb(5, 6, 13) over a
  ground painted rgb(10, 17, 32), on every horizon screen.
- **The ring read, on the horizon as painted — the failing guard**: the
  outlined name reads 4.51:1 at 390 (`opening`), 7.56:1 at 1280 and 10.79:1
  on the 1920 wall, and 8.92 / 8.60 with the horizon alone; the tagline
  3.63:1 at the least (the wall).
- **At the horizon's worst — a report held to a baseline, a known limit
  accepted by the owner on 2026-09-27 (the owner's C).** After the as-painted
  read, the art is flattened (`__horizonAtItsWorst`: the skyline and star
  sheets as one layer of their brightest paint, read from the SVGs through
  `layout/horizonArt.ts`'s allow-list — today the stars' `#e8fbff` at 0.79;
  the moon kept, stated; a sign carrying any other picture is refused,
  `signLayersRead`), over the **sky band** only — from the sign's top to
  the line at 52% (or the stars' foot, if lower), where the art is drawn;
  it covered the whole sign until the critic's item 5 — captured blanked
  and with the glyphs shown, the sign's lines read, the art put back. The
  least today: the name 2.76:1 (`desktop/unreachable`), the tagline 1.92:1
  (`desktop/shop-window-cycle`), the state line 9.30:1
  (`mobile/item-listing`; 7.25 when the flat layer covered the whole sign —
  it stands below the line). `HORIZON_WORST` (`scripts/horizon-worst.mjs`,
  pinned by value in `horizon-worst-baselines-are-the-owners-numbers`)
  holds each number with the job it was read on: that job is owed, must
  read it again within 0.01 — lower is a regression, higher fails until the
  constant is updated. Until 2026-10-20 no other job could read lower
  either; since D-2026-10-20-13 (the owner's D2(a)) a shipped run reads the
  horizon's worst on those three jobs alone, so that guard is gone. A line
  read at the worst with no sample fails, named. The limit, stated: another seller's
  words can put a glyph beside a lit window or a star, where the ring reads
  as low as those numbers — and the flat layer is the brightest paint over
  the whole sky band, so it is a bound over every placement of a light. The rain
  stays flattened as a fail because its drops cross every glyph within one
  drift; the horizon's lights are static and sparse. The critic's pure test
  ("every art paint half covered by the one-pixel ring clears 3:1") is not
  added: it fails by design — 2.71:1 for the tagline's pink over half the
  white star — which is the limit accepted. 77 jobs, 20.6 s (phase `horizon
  worst`). The runner owes five jobs by name (`HORIZON_REQUIRED`); since
  D-2026-10-20-13 a shipped run owes, and reads, the three pinned jobs alone
  (`HORIZON_PINNED_JOBS`), and a kit run every job the page names. Before the lamp carried the outline its bare letter read
  2.09–2.24:1 on the ring, and before the probe read `oklab()` — the colour
  an animation's interpolated shadow computes to — the lamp's outline was
  taken for none and blanked, 1.88:1: both fixed, both red proofs.
- **Static** (`decor-gate.test.ts`): a keyframe's frame is judged by the
  rules that run it (a frame run by a look, or by nothing, is refused); the
  four glows are listed in `DECORATION_GLOW`; the sets are declared once, on
  the rain and each listed surface and the sign.

Proved red for the target itself by the critic's plant, `.t-rural
.stall-name { color: #7a4c28 }`: 110 jobs at 1.00:1.

**It shows at rest, stated** (the critic, step 5a″ item 2). The outline is
the panel's colour, and between the white glyph and Neo's cyan halo it
reads as a dark one-pixel ring round every letter — visible in
`step5a2-shots/after/neo-horizon-390-name-3x.png`, which the owner has seen.
The halo is the name's own shadow, painted under the outline, so no colour
the outline could take matches both the panel and the halo. **And the
at-rest read passes it partly on a band, stated and not tightened** (the
owner's C): the ground under the sign's lines darkens down the sign — the
panel's gradient and the floor sink — so a single outline colour cannot
match it everywhere, and the read passes it partly on the head's cyan glow
(a radial gradient) and scanlines, held to their stops, which widen
[lo, hi]. Read without them (the critic's tightening, measured and not
committed, re-measured 2026-09-27 under the current colours): the tagline's
outline, rgb(9, 14, 26), sits up to 10 levels off the ground at a phone
and a desk and up to 6 on the wall (69 lines); the lamp's on `invalid` at
390, rgb(13, 21, 38), 7 levels. (The 5–18 first measured was the tagline
under the panel's own colour, before it had its own.)

**The lamp's dip is G7's, and over the skyline it is expected to fail.** The
dim frames paint the letter in `color-mix(in srgb, var(--s-text) 74%,
var(--s-bg))`, rgb(166, 184, 192) on Neo. On the panel that reads 8.83:1;
with a one-pixel ring half covering the art's brightest paints it reads
2.95:1 over the amber window (`#ffd27a` at 0.8), 2.65:1 over the cyan one
(`#2ce9e0` at 0.9) and 2.46:1 over the white star (`#e8fbff` at 0.79) — so the
dip is expected to fail on the skyline, not on the panel, when G7 reads it.

## A mood may carry a class, and the overlay never gets it (step 5c, D11, 2026-09-27)

A mood moved the palette and nothing else, and that was a rule held by
data: the catalogue pinned `cls` undefined for every mood, because the
broadcast branch wears the moods and a class there is a look's rule on a
stream nobody can close. Ink wash's 拓本 moods need line angles no token
carries, and the owner's Q7 (2026-09-23) was to fix the crude guard rather
than cut the design. So a mood may now name one class, and what held the
old rule is now three guards, none of them in the browser:

- **The class reaches the stall root first** — the positive control the
  step-5 critic asked for (item 7). `attachmentClasses` emitted the `root`
  rows alone, so a mood's class reached nothing and an overlay test would
  have passed over a class that reached nowhere. It emits a mood's class
  now, and `a-mood-class-reaches-the-stall-root` holds it on the stall and
  on the wall, beside the look's class, with the palette moved.
- **The overlay strips it**: the broadcast branch removes every `att-`
  class from its root after `applyTheme` dresses it, so a mood reaches the
  overlay as a palette alone (`a-mood-class-never-reaches-the-overlay`,
  every shipped mood dressed in a harness class, on the offers, empty and
  opening screens). The door takes it off with every `att-*` class and is
  handed no worn rows anyway.
- **It is look-scoped**: one `att-` class with no `paint`, owned by no other
  row in either direction of the child-class rule (`moodClassProblems`,
  `src/domain/moodClass.ts` since step 8b1, read by the catalogue's pin and
  the look data validator), and every served rule naming it names its look's class in
  the same compound — a kit sheet's own `t-workshop` counts, since
  `workshop:start` copies a shipped mood's rules re-scoped — through no
  functional pseudo-class (`:is(.t-neo, .t-rural).att-x` names the look as
  text and matches another), and beside no other row's `att-` class, so a
  mood never re-dresses a decoration (`a-mood-class-is-look-scoped`, the
  decor gate; the look lint's `a-mood-class-rule-is-read-under-its-look`). Its rules are
  decoration-scoped by their `.att-` selector, so the ground and mark rules
  read them as they read a decoration's.

**What the probe measures, and why nothing moved.** No shipped mood carries
a class, so every rule of this ledger measures the same pixels it did
(`looks:diff main`: 0 real differences). The overlay screens are painted
bare in every geometry pass (`paintsBareOnly`), and the strip keeps that
honest: a mood's class, stripped, cannot change their geometry. **One
all-worn variant per mood** (`wornAllFlags`, `layout/looks.ts`): `0xffff`
wears one row per slot, and a look's moods share a slot, so it wore the
lowest-bit mood alone and a look's second mood had an all-worn state no
pass painted. Each further mood is one more set of flags — `0xffff` with
every other mood's bit cleared — in the contrast plan, every geometry pass
(`variantsFor`: card screens and state screens) and the transparency pass
(the page's `__themes` publishes `wornAll`, and the runner refuses a look
whose list does not start with `0xffff`). Every shipped look has one mood
at most, so this is `[0xffff]` for each and the pinned plan
(`the-contrast-plan-is-every-job-the-pass-owes`) did not move; a harness
look with two moods is held to twice the worn jobs in
`paints one all-worn variant per mood`.

**Proved red**: without the overlay strip, `a-mood-class-never-reaches-the-
overlay` fails (`After hours / offers: expected [ 'att-harness-0-1' ] to
deeply equal []`); with `attachmentClasses` put back to `root` rows alone,
the positive control and the domain case fail and the overlay test stays
GREEN — the vacuous pass the critic named, which is why the control comes
first. The door: dropping `paintHome`'s strip alone fails on `t-modern`,
dropping the home route's empty worn list alone fails on the palette, and
only both together put the mood's class on the door (four classes, the
mood's among them): it reaches the door only when both layers are gone.
`wornAllFlags` returning `[0xffff]` alone fails the two-mood case. A
shipped mood given a class and a rule `.stall.att-…` in stall.css fails
`a-mood-class-is-look-scoped`; the same class written `.t-modern.att-…`
passes it; a mood class `att-pinstripe-night` fails the catalogue's pin
(owned by Pinstripe).

**The critic's read of a60e4eb, closed the next commit.** With After hours
given a class, each plant red on the new gate and green on a60e4eb's:
`.t-modern.att-harness-after.att-pinstripe .item` (a mood re-dressing a
decoration), `:is(.t-neo, .t-modern).att-harness-after .item` and
`:not(.t-modern).att-harness-after .item` in theme-modern.css. And
`.t-workshop.att-harness-after .item-n` is green in the kit's sheet on the
new gate and red on the old (the kit allowed the class, the gate refused
the starter's re-scoped copy), and red in stall.css on both. The kit's
shots and `looks:diff` gained the same all-worn state per mood
(`worn-<mood>`; `looks:diff` keeps `worn` for `0xffff`, so its plan for the
shipped looks is the 850 shots it was).

**Measured on the day it landed**: `pnpm test:layout` 137.9 s, the contrast
plan 515 jobs, unchanged. **The capability, end to end, by hand**: the Rural
starter (`pnpm workshop:start rural`) with Sun-faded given `att-harness-fade`,
a second mood `att-harness-dusk` at bit 9 (a dark palette over Rural's
paper) and one rule each under `.t-workshop.att-…` — the lint passed, and
`pnpm workshop:probe` painted a third contrast job per cell, the second
mood's all-worn state (flags 65533), and failed 71 figures, **every one of
them on that job** and none on the others: the dark mood's light ink over
the confetti and the sunburst, which `0xffff` alone would never have
painted. The kit was put back to the skeleton afterwards.

## The door's deck is not a contrast target (step 5b, 2026-09-26)

The contrast prepare collects `CONTRAST_TEXT` and drops every node inside a
`.deck-stall` before anything is read: the door's three minis are pictures
(`aria-hidden`, zoomed, no control), and a line in one is read by nobody.
It changed no reading on the day it landed — the nine deck nodes the door
matched produced no target (the dump before and after: 6,618 boxes
identical, the door's 26 renumbered, none moved) — and that is why it
comes first: the line-rect sampler and the rain scoping coming off would
otherwise start reading a mini's `.orn` over its look's unflattened rain,
the critic's case (CRITIC-SAMPLER-STEP item 9). The other rules already
skip the deck by name (the rain flattening, the outline rules, the class
audit).

The same commit gives the probe's Chrome `--disable-partial-raster`, which
`looks-diff.mjs` already carried: the look-pseudo check (D6(i), below)
compares two frames pixel for pixel. It moved no box either (6,650
identical against two runs of `main`, which were themselves identical).

## A door mini paints as its own look (2026-09-24)

The step-2 critic's item 8: the door root was `stall t-modern door`, and a
look's sheet selects by descent (`.t-modern .stall-name`) with no nearest
ancestor, so every deck mini also matched Modern's rules wherever its own
sheet is silent. Measured at 390px against each look's own `offers`: the Neo
mini's sign 27px (Modern's) where Neo paints 25, its letter-spacing 1.35px
against 1.25; the Neo mini's figure `rgb(223, 246, 255)` (Neo's ink through
Modern's `color: var(--s-text)`) against the accent `rgb(44, 233, 224)`, at
both widths; the Rural mini's sign at Modern's weight 800 and -0.58px
tracking where Rural's shop paints 600 and normal (-0.88px at 1280). Nothing
saw it: the door is measured under Modern alone, and the only rule reading
the deck's rows looks away from them.

**The fix: the door wears no look class and no decoration class**
(`paintHome` strips `t-*` and `att-*` after `applyTheme`), keeping the
default look's `--s-*` values inline. Measured first with every computed
property of the door's 182 non-mini nodes and their pseudo-elements, with
and without the class: the door's own chrome took two things from Modern's
sheet — the root's `font-size: 14.5px` (inherited by every node that sizes
nothing) and the glyph line `stroke-width: 2` on the four tiles' icons — and
stall.css now states both on `.stall.door` (`.stall.door .ic:not(.deck-stall
.ic)`, so a mini's glyphs stay its look's). `@scope (.t-x) to (.stall)` was
the other road and was not taken: it wraps three whole sheets, moves every
rule's specificity, and drops the look entirely where it is unsupported.
**Nor does the door wear a decoration or a mood**: in the probe's worn
variants it used to wear Modern's decoration classes on its root and — the
critic's item 7 — After hours merged into its inline vars, a night-palette
door production never paints, which the class strip could not take back.
`renderStall` hands the home route no worn rows now, and the door is
painted bare only (`paintsBareOnly` in `fixtures.ts`: the probe's variants,
the contrast plan's), so its four worn contrast jobs and six worn probe
variants went with it. Test: `dresses the door in no look of its own, even
over a worn look` compares the worn door's `--s-*` with the bare door's —
proved red with the home route's rows put back (`--s-bg` rgb(18, 21, 26)
against rgb(242, 242, 239)).

**`a-door-mini-paints-as-its-own-look`** compares, at the same width, every
text part a mini shares with its look's own shop — the sign's name and
tagline, a row's name and rail label, a tier-0 figure and its unit
(`MINI_PARTS`) — on the seven properties a look dresses text with
(`MINI_PROPS`: size, colour, family, weight, tracking, case, shadow). The
shop side is `offers`, bare, per shipped look; the mini side is every
`.deck-stall` on `door`, in every variant painted. Two properties would have
caught today's leak and missed the next on another part; boxes and grounds
would compare a 390px row with a zoomed `<div>` and fail on what a mini is
for. A mini missing a part, a mini with no look class and a door with no
mini fail. The looks compared are counted (`doorMiniClasses`) and the runner
requires all three shipped ones on the phone and desk passes
(`probe-coverage.mjs`). The contrast pass's echo holds the door to wearing
**no** look class (`paintEcho`; it held `includes(t-modern)` before).

**Measured green:** 70 part comparisons equal at 390 and 1280. **Proved
red** (before the door went bare-only) by leaving the classes on the root:
25 rule failures — the Neo sign's 27px and 1.35px at 390, the Neo figure's
ink at both widths, the Rural sign's 800 and tracking at both widths, on
each of the door's five variants —
and the contrast echo refused all four door jobs ("the door wore t-modern");
the unit test `dresses the door in no look of its own, even over a worn look`
failed too.

## The probe's browser is off the network

Since 2026-09-20 the runner starts Chrome with
`--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost`: nothing but the
preview resolves. The incident: `item-listing`'s hero tile read between
1.16:1 and 1.65:1 in four of nine runs that day and 3:1+ in the rest, on
code that had not touched it. With the network on, the tile's `<img>` asked
the icon host and, when the answer landed before the capture, the picture
covered the letters the pass was sampling; when it did not, the pass read
the face-icon cue — a disc of `--s-bg` on the tile's corner, the letters'
own colour — against them. The guard reads the same pixels every run now,
and the cue is the next entry. A guard that depends on the network is not a
guard; a green that depends on a Worker answering in time is the false
signal AGENTS §4 names.

## A cue on a text box is chrome, and the sampler steps around it

**Retired in step 5b** ("What the line read retired and let in", above):
the line read reads the letters' own rects and never reaches the cue. The
incident is kept for its reason.

The contrast pass blanks a target and its descendants and reads every pixel
left in the box as the ground under the letters. The face's expand cue is a
22px badge on the hero tile's corner and a SIBLING of the tile, so nothing
blanked it. Measured 2026-09-20 with the network off, in one run: the cue's
white stroke read as the ground under Neo's cyan letters at 1.01:1, and its
near-black disc as the ground under Modern's letters at 2.72:1 under After
hours, where those letters are the night ground. The two cannot both be
painted away — a pixel that clears 3:1 against a light ink and a dark one
does not exist, the badge is one badge on every look, and a badge in tokens
was the earlier defect (a disc of `--s-bg`, the letters' own colour). The
letters never reach the badge: two initials centred in a 56px tile end more
than ten pixels short of its corner. So the rule the border already has
applies — chrome is not the text's ground — and `CHROME_ON_TEXT` in
`probe.ts` names the cue, `targetFor` hands the runner its box as a hole,
and `worstContrastInBox` skips the sample points inside it. Bounded: holes
over a quarter of the target's box are dropped and the pass reads the paint
as it is, so this can never excuse a cover. Extend the list only with an
incident written here; the cue's own glyph is white on a 90% near-black disc
and needs no sampler to prove it.

## Sideways is not like down

A box below the fold is reached by scrolling. A box past the viewport's side
edge, or past an ancestor whose `overflow-x` is `hidden` or `clip`, is
reached by nothing — unless some ancestor actually scrolls sideways (the
door's deck row), or the page does, which "page scrolls sideways" already
refuses. The incident, 2026-09-20, round 16's door: `.door-wrap` is a flex
item of a column flex with auto side margins, so it is not stretched and its
width is its own max-content capped at 430px — and the round gave it a nowrap
site bar and a deck row whose max-content is past that. On a 390px phone the
body came out 430 wide, flush left: the paste button's box ran 30–400, the
counter's 16–414, the right 40px of every line cut by the shell's
`overflow-x: clip`. Three rules were silent: the page did not scroll
(`scrollWidth` 390); `text-spills` measures a block against its own box,
and every box was intact; and `coveredBy` skipped the points past the edge
as "off screen, the viewport check's failure" — which was no check. It
shipped in `0c581e0` and was found by eye on a phone-width screenshot.
`cutSideways` (`probe.ts`) now asks, for EVERY protected box in the geometry
sweep and again inside `coveredBy`: does the box cross the viewport's side
edge, or a `hidden`/`clip` ancestor's, with nothing that scrolls sideways
above it? Proved red on the old sheet — 35 failures, all of them
`button.buy.door-open runs past the viewport's side edge (30–400 of 390)` —
and green once `.door-wrap` took `width: 100%`. Down stays tolerant: a
`hidden` shell still reaches its content through `.stall-scroll`.

## The surcharge lines

A quote may carry a surcharge (`STLD` tag `0x04`, 2026-09-21). Two nodes say
it: `pay-surcharge` on the pay sheet — "+ 5% surcharge, the seller's record =
$5.25", the composed figure's other half — and `quote-surcharge` beside
every quote the app prints (the row's foot, the face, the printed tag, the
stream card, the wall's row, the studio row, the editor's read-back). Both
are protected boxes and contrast targets: a buyer who reads "$5.00" with the
"+5%" under a control pays a figure the page never showed them, which is the
covered-price incident with one line moved. The `pay` fixture's `T1` quote
carries `surchargePct: 5` so the sheet, the row, the tag and the stream card
all paint the lines; `quote-surcharge` on the wall wears the words' own scale
(`.sw-sur`), never the phone foot's 11.5px, because it is read across a room.

## "Pay several": the strip's total, the sheet's lines, the stepper

One payment for several quotes (2026-09-21). Three new money boxes:
`selection-total` — the strip's glance in the seller's unit, surcharges
included, painted inside a `.seg` that carries `overflow: hidden` for the
contrast sampler's sake, so a tray wider than the strip would clip the one
figure a buyer reads before Pay — `pay-lines` and `pay-total` on the
several-items sheet. All three are protected boxes and contrast targets;
`.step` (the stepper's own class, 44px both ways) and `.sel-sub` (the
row's "count × quote = line") are contrast targets. The fixtures:
`pay-several-strip` (open, two of the USD quote chosen, the XEC quote
painted as an "apart" row with its own Pay), `pay-several-ask` (the remove
question in place of a stepper, geometry only) and `pay-several` (the sheet
with the frozen rate). The strip is in flow and never sticky, so the
decoration sweep never meets it; its entrance animates only on the paint
after the press (`selectionEntered`), which the reduced-motion pass never
sees armed — the kills sit in `stall.css`'s last block regardless.
The strip between the phone and the desk (680–1280) is measured by hand,
not by the probe: `pay-several-strip-xec` carries a `15,750.00 XEC` total,
and the reading (no look clips the total or Pay at 680, 720, 800, 960 or
1280; the names cell absorbs the squeeze) is in `private/MANUAL-CHECKS.md`.
That fixture is also the one that stages an `apart` USD row — the pill
reads "Pay on its own", 121–152px at 390 against Pay's 57–59, and with
the ladder counting it as the narrow pill the name-floor rule measured
40–53px of name beside `$5.00` on every look; `PAY_APART_PILL_CHARS` (8)
puts that figure on the phone's own row — and, on Rural, the tier-3 row in
selection mode (`.item-head-q.sel-in[data-price-tier='3']`: `5,000.00 XEC`
is twelve characters against Rural's ceiling of eleven); on Modern and Neo
the same row in selection mode is tier 2 with 143–145px of name.

## The ticker: a money figure on a moving node (2026-09-21)

The third stream preset (`preset=ticker`, `private/design/ticker-2026-09-21/`)
runs the shop's figures right-to-left inside a clipping cell, which is the
first protected money on a node this guard has ever measured while it moves.
Four things changed, each stated:

- **A protected box inside a `moving` or `pinned` `[data-ribbon]` cell is
  exempt from `cutSideways`.** The ribbon is clipped BY DESIGN: every
  figure spends most of a pass outside the cell, and "sideways is
  unreachable by definition" would refuse the whole surface. The
  replacement proof is the fixture: `broadcast-ticker` and `-quotes` pin
  the ribbon still (`broadcastTickerAt`) at an offset where **the protected
  figure of one item stands wholly inside the cell** — not a whole item:
  at `-120` the quotes fixture cuts the first item's name and the second's
  words on every look, and what is enforced is the figure — so it is
  measured where a viewer sees it; the sampler clamps to the cell and
  skips a sliver under 16px, so a figure only partly in view is not
  measured at all. The attribute's value is the exemption's scope: a
  **`still`** page (reduced motion) is a layout, not a pass, and every
  sideways rule applies to it (`broadcast-ticker-quotes-still`). The
  attribute is written in one place, pinned by
  `only-the-ticker-cell-carries-data-ribbon`.
- **The contrast sampler clamps to the ribbon cell** (`targetFor`): a frozen
  figure half outside it would otherwise be sampled over the code plate's
  white or the transparent ground. `broadcast-ticker` is on the contrast
  set; the quotes, still, live and clear screens are geometry (the same
  ink). `.tk-rail`, `.tk-n` and `.tk-chip` are contrast targets — the chip
  is `SELLER_QUOTE_CHIP` under a class of its own, and a semantic under a
  class no list names is how `.item-ic`'s letters reached 1.10:1.
- **The flag holds its own lines** (`the-tickers-flag-fits-its-lines`,
  2026-09-22): the rail line is nowrap with no clip of its own, and a flag
  capped at 420px painted "Seller's quotes · Pays the seller · no escrow"
  27–50px across the divider into the ribbon's lane on all three looks —
  read off the port's own shots — while `text-spills` stayed green: its
  clipper is the bar (far right) and its overlap list names none of the
  ribbon's classes. The flag sizes to its widest line now and the NAME is
  what is capped (one line, an ellipsis at 376px — the design's two lines
  do not fit an 80px bar; stated, and `broadcast-ticker-live` stages the
  cut); the rule reads the flag's `scrollWidth` against its `clientWidth`.
- **A still page shows one item, and its words may be cut at the cell**
  (`TICKER_STILL_ITEMS`, 2026-09-22): the first port paged three, a count
  and not a fit, and on the quotes rail one item's words already filled
  the cell — two of every three items were clipped away unseen. One item
  stands its name, figure, chip and surcharge line inside the cell on every
  look; the words line is not a protected box and its cut is the accepted
  cost, stated here rather than measured.
- **Cost, measured 2026-09-22**: the five ticker screens took the run from
  188.6s to 193.2s (canvas +0.2, contrast +3.0, transparency +1.6), leaving
  6.8s under the 200s ceiling. Nothing was pruned: the contrast pass (139s)
  is the whale and every ticker screen but one is already geometry-only;
  the next screen added to the matrix prunes a page screen first. The
  canvas clip-skip ratio is 102 of 1,130 (9%) now, from 0 — the ribbon's
  figures outside the pinned cell, by design.
- **The reduced-motion pass runs `broadcast-ticker-live`**, the one ticker
  fixture whose ribbon is not pinned: `tk-run` is a keyframe in
  `broadcast.css` and its kill sits in the sheet's last block; the pinned
  screens animate nothing and would prove nothing. Under reduced motion
  the app paints the ribbon still and pages it on `BROADCAST_FIXED_MS`.
- **The sticker rule reads a per-preset table**: the ticker's box is the
  canvas's full width at the 60px insets — 1800 × 311 (the design said 268;
  the shop's caption is three lines on the 204px plate, and the probe is
  what said so), the strip `OBS_TICKER_STICKER_WIDTH` ×
  `OBS_TICKER_STICKER_HEIGHT` (1920 × 431) — and
  the recipe says never to scale it down, because at 0.75× the 204px code
  is 3.4 px a module, the unreadable end of the only bracket measured.
- **Pass 5 shoots `broadcast-ticker-clear`** too: the bar and the code plate
  are the only opaque pixels, and a figure this pass never shot is a figure
  nobody proved legible over video.

What this does not measure: the ribbon in motion. The pace (90 px/s, one
number) and the pass length are computed from measured widths by
`armTicker`, and the phase across a repaint is a unit test
(`the-ribbons-pass-is-measured-and-continued-across-a-repaint`); no pixel of
a moving frame is sampled. Nor the `animationiteration` boundary itself:
the app's wrap is driven synthetically in `app.test.ts`, and the hold it
releases has a ceiling of two passes (`tickerGuard`) precisely because a
cancelled animation fires no iteration.

## The touch wall: money on a screen with controls (2026-09-21)

`?view=window&mode=browse&touch=on` (the owner's ask; the design is
`private/design/touch-2026-09-21/`) is the first wall with controls on it,
and the first with a payment composed on the screen rather than on a phone.
Two fixtures, both on `WINDOW_SCREENS`, so the portrait pass (1080×1920) and
the tablet pass (768×1024) each measure them, and both on `CANVAS_SCREENS`:

- `shop-window-touch-quotes-pay` — the payment the press froze, in the
  wall's one code slot. **Sampled**, because it is the only screen that
  paints `.sw-pay-v` (each item's figure) and `.sw-pay-s` (the surcharge
  line and the borrowed-token warning): those two sat on `CONTRAST_TEXT`
  while the screen that mounts them sat in `GEOMETRY_ONLY_SCREENS`, so the
  plate's own money text was sampled by nothing and this ledger said it was
  "already sampled" (the critic, 2026-09-22).
- `shop-window-touch-quotes` — the strip and its steppers over a chosen
  item, with one row standing apart in another unit. **Geometry**, and it
  is the prune that pays for the screen above: it is `shop-window-quotes`
  with a chosen row and a strip, the same ink on the same ground, and
  `.sw-sel-n`, `.sw-sel-s` and `.sw-step-n` are painted on the paying screen
  beside it. What both window passes are here for is its geometry.

The protected boxes it adds are the strip's `selection-total` and the
plate's `price`, `pay-lines`, `pay-total` and `.qr` — every one of them
already on the list for the phone, which is why the wall needed no new
entry. The stepper and the two strip controls declare their own floor in
`window.css` and are pinned in `window.test.ts` against that file, because
`every-tappable-control-keeps-a-44px-floor` reads `stall.css` alone.

**The payment code's density, measured 2026-09-22** on the vendored
encoder at the level `qrMatrix` uses (`M`), over `payBip21`'s real shape
(`ecash:` + a 42-char payload + `?amount=…`, 63–67 characters whatever the
figure): 37 data modules, a 45 span painted. At the wall's 360px box that
is **8.0 px a module**, at the 280px floor a counter tablet paints
(`WINDOW_QR_MIN_PX`) **6.2** — both above the only density this project has
read from a phone (4.94; 3.37 was refused). **Step 5 landed and the wall
composes no memo** (2026-09-22), so this code does not grow with the items
at all: measured at the 280px floor, a two-item memo is 5.28px a module and
a three-item one 4.91, under the density above — a memo that existed at two
items and vanished at three is worse than none. If the wall is ever given
one, its cap comes from this box and never from `MAX_SELECTION_ENTRIES`.

**A pay code is as wide as the gate was told** (2026-09-22). The pay sheets
decide whether to draw a code by asking whether it still reaches the one
density a phone has read here, in a box width written down as
`PAY_QR_NARROWEST_PX` — and that constant was read off the wrong node on the
day it shipped, saying 318 where the truth was 300: `.pay-qr` had no rule at
all, so it shrink-wrapped to the SVG's own intrinsic 300px while the record
sheets' plate painted 440. Five-to-seven-item codes were drawn at 4.92px a
module under a gate that computed 5.21. No unit test could see it (happy-dom
lays nothing out) and the probe could not either, because every pay fixture
carried a rate stamped in 2025 and painted `PAY_QR_STALE` where its code
belongs. So the fixture's stamp is `Date.now()` now, and this rule measures
the painted box — width minus the element's own padding — and fails under the
constant. Proved red by raising the constant to 500: 252 failures on the
mobile pass, naming the 316px Modern paints.

**At 360 too** (2026-10-13, the 8g1 critic's P2-4). The rule reads every
pay sheet the narrow pass paints ("The narrow phone", below), and the plate
moves one for one with the screen: at 360 Modern painted 286, Neo 288,
**Rural 278**, the skeleton and the tracked fixture 286 (at 375: 301, 303,
293). Proved red then: at 308 the narrow screens failed 483 times, every one
this rule. Lowering the gate to 278 was built and measured first, and its
cost was too high to merge as it stood — Pay several drew a code for two
items at counts under 256 and none past 255, and one item read "Too many
items" — so below 390 the pay sheets give the code more of the sheet instead
("A wider code box below 390", below): at 360 it paints 310 on Rural, 318 on
Modern, the skeleton and the fixture, 320 on Neo, and `PAY_QR_NARROWEST_PX`
stays 308, pinned by value with those numbers. Pay several draws for one to
six items at counts under 256 and one to five past 255, as before, and the
single pay sheet's 61-module code is 5.05px a module or more from 360 up.

What this does not measure: a touch. The presses are driven in
`app.window.test.ts` (the freeze, the close on a change, the expiry at
`PAY_RATE_MAX_AGE_MS`) and in `window.test.ts` (the handlers, the allow-list
of five roles); nothing here observes a finger, and the sizes are the
argument that one will land.

## The fiat glance says whose figure it is, on its own line (2026-09-23)

The owner's rule: CoinGecko is named beside every CoinGecko figure, and no
line is pushed down for it. The rate lines already carried the name; the
listing face's fiat glance gained `span[data-role="fiat-source"]` (" ·
CoinGecko"), a sibling of `[data-role="fiat"]` inside one inline row. Two
things only a browser can see, so two entries here:

- **`[data-role="fiat-source"]` is on `CONTRAST_TEXT`.** It is not `fiat`:
  the figure wears each look's accent and the source is muted (the rate
  line's ink — `--s-muted`, and Neo's `#8aa6c9` literal at 10.5px), so the
  figure's measurement says nothing about it. `item-listing` stages a fiat
  rate and the fold is opened before sampling, so it is measured on every
  look at both widths.
- **"the fiat source pushed a line"** (geometry, every screen): each span is
  exactly one line box, the source starts where the figure ends, and the
  two overlap vertically. happy-dom lays nothing out, so the unit test
  (`the-coingecko-figure-names-coingecko-on-its-own-line`) can pin only the
  structure; a `display: block` on either span, or a row too narrow for
  both, is this rule's to catch.

**Proved red** by planting `display: block` and `color: var(--s-surface)`
on `.item-fiat-src`: 504 geometry failures (`item-listing`, and `item-zoom`,
whose face stands behind the zoom scrim — every look and decoration at 390
and 1280) and 12 contrast figures at 1.00:1 (`item-listing`, three looks,
bare and worn, both widths). Green again with the plant reverted.

## The workshop probe measures the kit's look, and says which look it painted (2026-09-23)

`pnpm workshop:probe` runs every rule here over the look a creator is
designing in `workshop/` — the same passes, the same ceiling, through
`layout-check.mjs --config vite.workshop.config.ts --looks workshop`. Its page
is `layout/probe-workshop.html`, whose entry registers the kit's look with
`layout/looks.ts` before `probe.ts` evaluates; `measuredLooks()` then answers
the kit's look **alone**, and `looksFor('door')` answers nothing (the door's
deck is three shipped looks), so the door is not in the workshop passes. The
ordinary `pnpm test:layout` never loads the kit's look or sheet
(`the-ordinary-probe-loads-no-kit`).

- **Every verdict echoes `sheetClasses`** — every `t-*` class on every
  painted `.stall`, over every paint the page made — as it echoes
  `reducedMotion` and `portraitTall`; `__contrastPrepare` returns the classes
  of the one paint it made. The runner refuses any pass whose set is not
  exactly what it measures — `{t-workshop}` for the kit, `{t-modern, t-neo,
  t-rural, t-skeleton}` otherwise (the skeleton since step 2, below; a
  fourth shipped look adds its class to `EXPECTED_SHEET_CLASSES`) — and the
  contrast and transparency passes by the union of their prepares. **Why** (the step-1 critic's P1): `decodeTheme(0xff)`
  answers with MODERN's row and `attachmentsForTheme(0xff)` with `[]`, so any
  site left choosing a look by id paints Modern bare under the kit's name —
  and Modern is green, so the one failure that shows is *fewer failures*, a
  skeleton that passed. Only the class the tree actually wore tells the two
  apart. The static half is `the-harness-chooses-looks-in-one-place`.
- **Proved red by a real run**: `paint()` reverted to
  `decodeTheme(look.id)` on the kit page, and every pass — the three widths,
  both portraits, both reduced-motion passes, contrast and transparency —
  printed `painted t-modern where this run measures t-workshop
  (the-workshop-probe-measures-the-workshop-look)` and the run failed. The
  ordinary run with the check in place: unchanged (197.1s; clip counts
  886/9608, 1641/11699, 102/1760, identical to before). **One number moved,
  and it is not coverage lost:** the contrast pass reads 3628 figure boxes
  where it read 3576. The verdict `<pre>` under `#app` grew by the class
  echo, so the probe page is 75px taller at 390px (1022 → 1097), each shot
  the pass grows to the page's height is taller, and more of each stall is
  in frame. The targets every prepare returns are identical in both builds
  (counted per screen, look and worn state). That the shot's height follows
  the length of the verdict text is an old quirk, noted and not changed.
- **The kit's sheet lands after `stall.css`**, as a shipped look's does: a
  build links an entry's stylesheets in the order it imports their chunks,
  and the kit's sheet shares a chunk with the kit's loaders, so the probe
  entry imports the renderer first. Measured: with the loader imported first,
  the workshop probe linked the kit's sheet AHEAD of the app's sheets (the
  showroom did not). Pinned by `links the kit’s sheet after the app’s sheets
  on both kit pages`, proved red by swapping the two imports back.
- **The skeleton, measured once before step 2** (the committed kit, Modern's
  row with no rule; 32.8s): 15 failures, every one "the name column collapsed
  under the price" on `offers` and `long-item-name` at 390px (seven seeks
  each; one more under reduced motion). Nothing subtracts a failure — a
  known-failures filter would hide a creator's own failure on the same
  screen and check. Step 2 turned it green and the ordinary probe now
  measures a fixed skeleton on every run (below). The three starters
  (`pnpm workshop:start <look>`) each probed green on 2026-09-23 before
  step 2: Modern 75.0s, Neo 62.7s, Rural 71.7s; after step 2, Modern 76.9s
  and the untouched skeleton 22.7s (green, its worn half no longer painted).
  The Neo starter went red at step 5b (`9693473`) and green again on
  2026-10-06: "Every starter is measured as its shipped look", below.

## The skeleton is measured on every run (2026-09-23, the owner's D3)

`layout/looks.ts` carries a harness look beside the shipped three: the
default row under `t-skeleton`, a class no stylesheet names, so the app's
base sheets paint it and no look's sheet does — what a look is before its
sheet has a rule (the committed kit), and what a stall WOULD paint before
its look's sheet arrived if looks' sheets ever load apart from the app (Q17;
today `render.ts` imports every sheet with the app). Addressed by the
harness alone as `0xfe` (`lookById`, the contrast driver's `__themes`); the
row keeps the default's own id, so the renderer paints exactly the default
row. It is measured on every screen the shipped looks are measured on except
the door (`canWear`), in every pass, the contrast and transparency passes
included; it wears no decoration, so a screen buys one variant of it — and
since `__themes` carries each look's decoration-row count, the contrast and
transparency passes no longer paint its "worn" half, which was the bare paint
again. `EXPECTED_SHEET_CLASSES` gains `t-skeleton`, so a pass that never
painted it fails the class audit. Static half:
`the-skeleton-is-the-default-row-under-a-class-no-sheet-styles` (the row is
the default's but for the class; the class is in no stylesheet under
`src/ui/`, `layout/` or `workshop/`; the runner expects it).

**What it cost, measured 2026-09-23 on the 4-core box:** HEAD 192.4s
(contrast 3628 boxes, 139.1s; transparency 136 boxes). With the skeleton
sampled twice per screen: 219.6s and 218.8s (contrast 4866 boxes, 160.8s;
transparency 180). With its worn half skipped: **210.0–216.0s** over three
runs (contrast 4285 boxes, 153–154s; transparency 158 boxes, 8.3s) — about
7s back. The phone and desk passes now print what the step-2 rules compared
(`compared:` under the pass's line): 7 dash comparisons per place — three
looks bare and worn, and the skeleton — and all three rows read (the dash
comparisons are unbuyable labels read since 2026-09-24, below); on the
phone, the skeleton's ladder read 3 tier-1, 12 tier-2 and 17 tier-3 figures. Clip points: mobile
886/9608 → 915/10167, desktop 1641/11699 → 1688/12589, canvas 102/1760 →
132/1915 — the skeleton's own screens plus the dash fixtures below; the
ratios held (9%, 13%, 7%).

**What turned it green was the row, not the ladder.** Step 2 gave stall.css a
floor ladder derived from `--s-price-size` (tiers 1 and 3 × 0.81, tier 2 ×
0.65, under `:where()` at (0,1,0), phones only) for a look whose sheet sizes
nothing. With the ladder disabled and the rows at step 2's values, no
geometry rule failed: at Modern's 26px (the row now states what its sheet
paints) the skeleton's tier-2 row keeps a name column over the 64px floor at
full size; the 15 failures of the untouched kit (below) were at 30px.

**So the ladder has its own pin, `the-skeletons-ladder-steps-the-rows-size`**:
at a phone, every tiered figure the skeleton paints must be `--s-price-size`
times its tier's factor (26 → 21.06 / 16.9 / 21.06px), and the runner
requires a tier-1, a tier-2 and a tier-3 figure read on the mobile pass
(`ladderTiers` in the verdict, `probe-coverage.mjs`) — tier 1 is the quote
rows' "$5.00" beside its Pay pill (`plugin-missing-quotes`, `quotes-failed`,
`quotes-truncated`), tiers 2 and 3 the long figures on `offers`. **Proved
red** by aiming the ladder's media query at `max-width: 1px`: every tiered
skeleton figure on every phone screen read 26px against 21.06 or 16.9.

**A gap no rule fails, noted and not fixed:** the sparse shop's closing motif
is styled only in each look's own sheet, so on the skeleton it is bare
markup that nothing measures as wrong.

## An unbuyable offer paints no figure and says so (2026-09-24, the owner)

An offer whose covenant refuses every take this page could ask for
(`isUnbuyable`) painted a dash where its figure would be, and for one day the
dash was the size of the figure (the owner's D1 of 2026-09-23: 112px on the
wall's Cycle card). Seen in pictures, the owner removed it everywhere: a dash
in a price cell reads as a price, and on the stream overlay it wore
`data-role="price"`, the covenant's asked amount, over a take the covenant
refuses. Three places carry the label "Not buyable" alone in their price
cell, under one role, `data-role="unbuyable"` (`unbuyableLabel`): the shop
row (`offerRow`), the listing face's figure and its fold's listing line
(`itemFace`, `listingsBlock`), and a wall row in Browse (`listingRow`).
**The three unattended surfaces that step through one card at a time skip
such a listing** (the owner, the same day): the wall's Cycle
(`cycleListings`, read through `wallListings` by the painter, the driver's
step and the status line) and the stream's corner card and ticker
(`streamListings`, read by `broadcastCards`, `broadcastRail` and
`broadcastTurns`). A rail of only unbuyable listings is an empty rail on
both: under `all` the rail with something on it wins and the wrap does not
turn back (`windowRail` / `windowTurns` mirror `broadcastRail` /
`broadcastTurns`), and the composing sheet composes no Cycle wall that would
show nothing (`wallCyclesNothing`, `WINDOW_CYCLE_NOTHING`). Tests:
`the-wall-cycle-skips-an-unbuyable-listing` (render, driver, the empty rail,
the sheet, the freeze), `the-stream-skips-an-unbuyable-listing`. The
`.stall .dash.*` rule left stall.css; `DASHED_PRICE` stays as the face's
rate line when the genesis decimals never arrived, and the face's sentence
about the minimum take says it without counts then
(`UNBUYABLE_LINE_UNCOUNTED`).

**The freeze meets the skip, stated.** A lock keeps a token by the offers it
had at `upto` (`offersWithinLock`). When the only one it had was an
unbuyable remainder, a buyable relist mined after the lock is not let in —
it is what a stranger's plant looks like — so that token stays off the
Cycle, and Browse lists it as "Not buyable", until the seller re-locks.
Fewer of the seller's goods, never a stranger's. Test: `keeps a token whose
only pre-lock offer is unbuyable off the Cycle, relisted or not`.

**`an-unbuyable-offer-paints-no-figure-and-says-so`**, for every "Not buyable"
label the page paints, in the cell it sits in (`.item-p`, `.face-x`,
`.listing-line`, and on the overlay `.bc-p` and `.tk-it`): **no figure** —
the cell holds none of a figure's parts (`FIGURE_PARTS`: the price role,
`.item-a`, `.item-x`, `.item-from`, `.x`, `.listing-x`, `.bc-from`, `.bc-u`,
`.tk-x`, `.tk-u`, `.tk-from`, `.dash`) and says nothing but the label;
**says so** — it shows and nothing covers it (`coveredBy`); **by its role**
— it carries `data-role="unbuyable"`. A label in no cell this rule reads
fails, **a label on a Cycle card, a stream card or a ticker item fails**
(those surfaces skip), and a screen built for a label that painted none
fails. The three skipping fixtures — `shop-window-cycle-unbuyable`,
`broadcast-unbuyable`, `broadcast-ticker-unbuyable`, each a buyable listing
beside the unbuyable one with the cursor where the shop's order puts the
unbuyable one — must paint a card (or a ribbon item) and no label
(`SKIP_SCREENS`, counted as `skipChecks`). The runner requires labels read
on `row` and `face` at the phone, those and `wall-browse` at the desk, a
`wall-cycle` skip on the desk pass and a `stream-card` and a `stream-ticker`
skip on the canvas pass (`probe-coverage.mjs`). The `wall-cycle`,
`overlay-card` and `overlay-ticker` label places the first version owed are
gone with the labels there: the skips replaced them.

**Its ink is measured.** `[data-role="unbuyable"]` is in `CONTRAST_TEXT`,
sampled on `unbuyable`, `item-unbuyable`, `item-unbuyable-fold` and
`shop-window-unbuyable`. Worst measured, 2026-09-24: Modern 5.58:1, Neo
7.39:1, Rural 3.22:1 (the wall's Browse, worn), the skeleton 5.58:1. **Rural's
row label is read under reduced motion** (`REDUCED_JOBS` in
`contrastPlan.ts`, the runner switching the emulated media per job): the tag
sways, and the sampler pads a box inside a transform by 8px a side, which
left nothing of the 14px label, so it was dropped on every ordinary job.
Stilled, it read 5.17:1 bare and 3.19:1 worn at both widths.

**Proved red.** The first version, with four plants: the row's dash back,
the overlay card's dash back under the price role, the face's label hidden,
the Cycle fixture made buyable — each failed on every look it paints. This
version: the skip taken out of `cycleListings` read "wall-cycle: an
unbuyable listing is on a surface that skips them" on all seven variants on
the desk, portrait and tablet passes and "saw no wall-cycle skip"; taken out
of `streamListings`, the same on all four looks for `overlay-card` and
`overlay-ticker` and "saw no stream-card / stream-ticker skip"; the overlay
label painted without its role read "carries no data-role"; a pale ink
planted on Rural's label (`#efe2c8`) read 1.06–1.07:1 on the reduced jobs,
where the ordinary jobs had dropped the box. Not planted on its own: a
covered label (`coveredBy`'s own plants are in "Geometry, not hit testing").

## A shipped row states the sizes its sheet paints (2026-09-23)

Each look's sheet sizes the tier-0 figure and the sign's name itself; the
row carried other numbers, harmless only while nothing read them. The
emitted var is what paints wherever the sheet does not reach — the skeleton,
the floor ladder, Neo's phone sign (its sheet sizes no `.stall-name` below
680px, so the row's 25px IS what paints). **`a-shipped-row-states-the-sizes-its-sheet-paints`**:
on `offers`, bare, for each shipped look, at 390 and 1280, the computed size
of a tier-0 figure and of `.stall-name` must equal the var the stall carries
for that width (`--s-price-size` / `-d`, `--s-sign-size` / `-d`). The cascade
answers; no stylesheet is parsed. A number that does not read fails rather
than comparing as NaN, and the looks whose rows were read are reported
(`rowSizeClasses`) for the runner to require every shipped one.

**Proved red** by HEAD's rows: Modern's figure 26 against 30 and name 27
against 25, Rural's 25 against 31 and 29 against 27, at 390, in the mobile
and reduced-motion passes; Neo and every desk value already agreed. By one
row edit alone reverted (Rural's `signSize` back to 27): that one line,
twice. And by the probe reading `--s-price-sizz` on the phone: "a number that
does not read compares nothing" on all three looks, and "read no row for
t-modern / t-neo / t-rural" on the mobile pass. Rural states `priceSizeD:
'31px'` since this rule, or `priceSizeD ?? priceSize` would have carried its
phone 25 to the desk.

## The class audit reads the stall, not the door's deck (2026-09-23)

`sheetClassesOn` collected every `.stall` in the tree, the door's three deck
minis included — so on the phone and desk passes the union always held
`t-neo` and `t-rural` from the door, and a shipped look painted under the
wrong class could not fail there; only a missing skeleton would have. It
skips `.deck-stall` now. **Proved red** by painting Neo's row with
`t-modern`: every pass, contrast and transparency included, printed "painted
t-modern, t-rural, t-skeleton where this run measures t-modern, t-neo,
t-rural, t-skeleton".

## The contrast passes say where their time goes, box by box (2026-09-23, step 3a)

Step 3 was going to shard the contrast pass; its critic's first ask was to
measure before making anything cheaper or parallel, and to give the proof
something finer than a tally. Two instruments, both on every run:

- **A phase table under the contrast line** — navigate, prepare, grow,
  re-prepare, capture (the CDP call, transfer and parse), decode, boxes (the
  live re-read), sample, shrink, and what no phase accounts for.
- **A per-box dump**, `.layout-dump/<looks>-<time>-<rev>.json` and
  `<looks>-latest.json` (gitignored): every job each contrast pass ran (pass 4
  and pass 5) and every box it sampled — keyed by pass, viewport, screen, look
  id, decoration flags, the node's index among the prepared nodes and its
  description (and, on the transparent wire, the ground) — with the box, the
  ink and the worst contrast found, or `null` for a box the sampler dropped.
  The newest 20 timestamped dumps of each kind of run are kept (~1.5 MB
  each), the latest under its own name.
  `node scripts/contrast-dump.mjs <before> <after>` compares two box by box:
  identical means the same double (`a-contrast-change-is-lossless-only-box-for-box`),
  and a move across 3:1 is named as such.

**What the first two dumps said, 2026-09-23 on the 4-core box, load 0.3,
two runs of one tree (4285 boxes and 158 over the wire, both green, 213.0s
and 213.7s):**

| phase | calls | total | mean |
|---|---|---|---|
| navigate | 3 | 8.7–9.5s | ~3 s |
| prepare | 393 | 11.0s | 28 ms |
| grow | 383 | 5.8s | 15 ms |
| re-prepare | 383 | 11.9s | 31 ms |
| capture | 472–476 | 74.2s (48%) | 157 ms |
| decode | 472–476 | 18.1s (12%) | 38 ms |
| boxes, sample, shrink | 383 each | 2.3s | — |
| unaccounted | — | 22.5–23.5s (15%) | — |

- **Every one of the 383 real jobs grows** at 390×844, 1280×900 and 1920×1080,
  so the one-prepare shortcut for a page that fits never fires; the ten other
  prepares are the door under a look that cannot wear it (a no-op).
- **89 of the 383 first shots read a box below 3:1 and were retried** — the
  "unaccounted" line is their 250 ms sleeps. It is not a stale frame. Every
  one is a `.mini` control on Modern or Rural, the two looks whose `.mini`
  transitions `color` over 0.2 s — and the prepare blanks the ink with
  `color: transparent` *after* pausing the page's animations, so the glyphs
  are still fading when the shot is taken two frames later. Modern read
  2.75:1 there and 5.17:1 once the fade was done.
- **So the pass is not reproducible run to run.** The two dumps differ on 38
  boxes, every one a `.mini` read mid-fade on one run and at rest on the
  other — `pay-several-strip` under Rural at 3.15:1 against 6.15:1, the
  shop-window sheet's close at 5.63 against 3.44. None crossed 3:1 between
  those two runs; one sat 0.15 above it. A change to the pass's machinery
  cannot be shown lossless over a baseline that moves by itself, so the
  hermetic changes come before the levers in this step, not after them.

**The jobs are hermetic now, and the pass is reproducible.** Each job's first
paint comes after the neutral screen (`invalid`, as `looks-diff.mjs` does),
so no job is measured after whichever job ran before it; every animation is
frozen 400 ms into its active phase with its delay zeroed (a marquee's
negative delay is wall-clock time), again after `document.fonts.ready`; the
blanking sets `transition: none` before `color: transparent`, so it starts
no fade; the page's clock is fixed (`FIXED_CLOCK` in `browser.mjs`, shared
with `looks-diff.mjs`: `Date` reads one instant until the document has
loaded and runs from it after, so a stamp taken at module evaluation is the
same however long the load took); no page lives longer than 60 s (the pay
code's rate ages out at 120 s and its timer repaints the sheet then); and
the page is focused whatever its window is
(`Emulation.setFocusEmulationEnabled` — measured to move nothing at one
window, where `document.hasFocus()` is already true). Against the previous
tree's dump, 86 boxes moved (97 against its other run), **every one a `.mini`
on Modern or Rural, every one up, none with a different box, none across
3:1**: the mid-fade readings replaced by the control at rest (Rural 3.15 →
6.15, Modern 3.90 → 5.17; the shop-window sheet's close had read 3.02).
Retries went from 89 to 0 and the pass from 155 s to 114 s. Two runs of the
hermetic tree: **4575 boxes of 4575 identical**.


**The pass walks a plan, and holds its walk to it.** `layout/contrastPlan.ts`
lists every job — viewport, screen, look, decoration flags as a bitmask (`0`
or `WORN_ALL`, so a variant per mood is a new value, not a new schema) — and
the probe page publishes it (`__contrastPlan()`; Node cannot import the
fixtures). The runner walks that list and nothing else, checks at each
viewport that the plan's screens are the ones the page itself samples there
(`__contrastScreens`, built by the same `contrastScreens`), and at the end
requires every planned job done exactly once: **proved red** by dropping one
canvas job and running another twice — "the walk did not do every planned
job exactly once (383 planned, 382 done) — never done:
canvas/shop-window-touch-quotes-pay/2/65535; done more than once:
canvas/shop-window-wall/1/0 (2x)", and no tick on the contrast line. The
plan's size is pinned by value — 170 phone, 191 desk, 22 canvas jobs
(`the-contrast-plan-is-every-job-the-pass-owes`). The ten door-under-a-look-
that-cannot-wear-it prepares are no longer made (`canWear` keeps them out of
the plan); the dump's 4575 boxes are identical.

**Every contrast job is held to itself before it is sampled.** Each prepare
carries a nonce of the runner's and echoes it back with what it painted
(screen, look id, flags), the viewport it measured and the `t-*` classes
that one paint wore; every box re-read echoes the nonce of the prepare it
read from and the viewport then. A job is refused — the run fails, one line
per job, and nothing of it is sampled — when the prepare answers for another
nonce or another combination, when the page measured a viewport that is not
the job's (the grown height on the re-prepare), when the paint wore a class
that is not the job's look (exactly that one class; on the door, among
them), when the shot is not the job's width by its grown height, when the
re-read answers for another prepare, when a planned job collected no
targets, and when a job with targets sampled none. Pass 5 throws on the
same checks. **Proved red** by one run with five planted defects, each
named on its own line: the grow skipped ("the page measured 390x844 where
the job is 390x1157"), a second prepare between the shot and the re-read
("the boxes were re-read from prepare an-intruding-prepare where the job's
last was mobile/offers/3/0#10"), the boxes moved off the shot ("13 boxes and
none sampled — every one fell outside the 390x1596 shot"), the viewport
shrunk before the capture ("the shot is 390x844 where the job is
390x1611"), and the page painting Neo's row where Modern was asked ("the
paint wore t-neo where the job's look is t-modern").

**Nothing the runner waits on is unbounded.** Every CDP command carries a
30 s bound (`devtools`' `timeoutMs`; a command still waiting when the socket
closes rejects at once), and the build a 300 s one. **Proved red** by a
page-side promise that never settles: "CDP Runtime.evaluate did not answer
within 30s (on contrast job desktop/offers/1/0)". And the ceiling is a
watchdog: past 300 s of wall clock the run stops, kills every process group
it started and names the step — **proved** at a planted 75 s: "past the 75s
ceiling while on contrast job mobile/unresolved/2/0 — the watchdog stops the
run", exit 1, no Chrome, no preview and neither port left behind.

**Where a contrast page's load goes:** 2.8–3.8 s of each is the probe module's
own billboard check (every look painted on `offers` once per decoration row,
each paint's whole computed style read), which runs on every load, the
contrast pass's included, where its result is never read. The page is loaded
per viewport and once more at the 60 s mark: about 11 s a run.

**Three levers, each shown to move nothing** — the dump before and after
each one, 4575 boxes of 4575 identical every time:

- **`optimizeForSpeed` on every capture** (both contrast passes): Chrome
  encodes the PNG with its fastest settings — the same pixels, a bigger
  file — and pass 5 still gets its alpha channel (it refuses to run
  without). Capture 155 → 117 ms a shot.
- **The PNG reader unfilters row by row**, one loop per filter type, where
  it switched per byte (`browser.mjs`, shared with `looks:diff` and the
  kit): decode 40 → 21 ms. It also refuses image data shorter than its
  header, which the old loop read as zeros. Held to an encoder written from
  the specification, every filter type at three and four bytes a pixel
  (`decode-png-undoes-every-filter`; the old reader passes the same
  roundtrips).
- **A job's first paint is asked for its height alone**: no boxes, no
  blanking, no font wait, no frames — every job grows, so that paint is
  thrown away by the repaint at the grown size. 29 → 14 ms. A page that fits
  is prepared afresh from the neutral screen — no page fits today (below),
  so that branch was measured with the verdict hidden: 181 jobs fit, and the
  previous runner and this one read the same 4346 boxes.

Not pulled: decoding off the main thread. At one window nothing runs while a
shot decodes — the next job cannot start before the verdict on this one,
because a red box is re-shot on the same tree — so a worker buys the 3 ms
box re-read at most; it belongs with the sharding, where several windows
share one Node thread. Also not pulled, and a candidate: the probe module's
billboard check runs on every contrast page load (2.8–3.8 s each, three or
four loads a run) and its result is never read there.

Contrast pass after the three: **88 s** (155 s at the start of this step,
114 s once hermetic); `pnpm test:layout` 146 s.

**What the "fits" measurement found, and did not fix.** Every contrast job
grows because the probe page's own verdict `<pre>` is appended under the app
— `document.documentElement.scrollHeight` is the viewport plus that
element's height (313 px on 286 of the 383 jobs; the rest are pages taller
than their viewport anyway) — so the one-prepare shortcut for a page that
fits has never fired, and every page that fits is shot at its viewport plus
313 px: a phone at 390×1157, the shop window at **1920×1393** where the wall
is a 1920×1080 screen whose layout is chosen by container queries on its
shape. With that element hidden, 181 jobs fit and are shot at their own
size, and one figure falls under the floor that the ordinary run reads at
14.48:1: **`shop-window-touch-quotes-pay` at 1920×1080, Neo worn, the
payment plate's `dd.sw-pay-v` at 2.89:1** — a teal rain drop, `rgb(48,158,156)`,
behind the value's ink `rgb(223,246,255)`. Measured under a diagnostic plant
only (both the previous runner and this one read it); nothing in this step
changes what height a job is shot at, so it is recorded here and left to the
owner: shooting pages at their own height is a change to what the guard
measures, and it goes red on its first run. (Done the next day, with the
plate's ground first: "Shot at the real height" below.)

## Shot at the real height (2026-09-24)

**The verdict takes no room.** `#layout-result` is `hidden` — the runner
reads its `textContent`, and nothing else on either side reads the element —
and the page holds it to that: a verdict that lays out adds "the verdict
takes no room" to every pass's failures. **Proved red** by putting it back
(`hidden = false`): every geometry pass failed on that line ("lays out at
390x1365"), and all 383 contrast jobs were refused by the grow check below.

**The incident it exposed.** At its own 1920×1080 the touch wall's payment
band (`.sw-paying`) painted its text straight on the look's ground: it had
none of its own. Neo worn put a rain drop behind a line's figure at 2.89:1,
and even at the padded 1920×1393 its rate line read 3.99:1 and its total
6.24:1. The band now wears the list's own card — the class `item`, which
every look dresses (`.t-* .item`) and every card decoration reaches — with
the frame drawn in the slack around it by a negative margin, so the list
keeps its room (`window.css`; test
`the-wall-payment-plate-stands-on-the-lists-card`). Neo worn reads 16.56:1
on every text box of the band. **Proved red** by taking `item` off the
band: `shop-window-touch-quotes-pay @canvas / theme 2 + worn: dd.sw-pay-v
at 1062,669 sits on paint at 2.92:1` (the frame's margin still in place,
so a pixel lower than the 2.89 reading).

**Hiding the verdict alone lost 229 boxes**, measured against the previous
dump: every shot had been 313px taller than its page, and that padding —
not the grow — was what put three things in frame.

- **The shell's foot.** `pageHeight` asked for the region's `scrollHeight`
  as a page height, and the region is the viewport less the dock: grown to
  that, the dock's own height of the region is still behind its clip. The
  footer's controls on `empty`, `offers-changed`, `hostile-name`,
  `plugin-missing-quotes` and both `pay-several-strip`s, and on every long
  page the last ~60px, were sampled only because of the padding (a studio
  control at 390 was sampled clipped to 30 of its 44px, on the kit's look).
- **A sheet's lower half.** Nothing asked the open sheet at all; its
  controls under the fold (the name sheet's decoration chips, the describe
  sheet's segments and sign control, the shop-window sheet's switches)
  were in frame when the 313px reached them and not when it did not — and
  the record hex on both record sheets, at both widths and on every look,
  never was, nor any sheet's foot close: the hex of a record a seller is
  about to sign is a protected box, and no contrast shot had reached it.
- **The wall's rows below its list's edge**, at a height the wall is never
  hung at.

**So the grow asks what a reader scrolls.** `pageHeight(scope)` is the
document's height, and the viewport plus what the shell's region hides and
what an open sheet hides — the sheet's scaled by its share of the viewport
(`max-height: 92vh`, 86vh at desk width), since a pixel of viewport buys it
less than a pixel. A surface that is not the reader's to scroll is not
asked: the wall's region is `overflow: hidden` (its list scrolls itself,
and a wall is shot at its screen's size because its layout reads the
frame's shape), and so is the shell behind an open sheet. The runner holds
the grow to the prepared paint: when the prepared page says it is still
taller than the shot, it grows again, twice at most, and refuses the job
after that ("mobile/offers/1/0: the page is 2516px tall at a 2098px shot
after two more grows" — the verdict back in the flow, which grows with the
viewport, is what proved it, on all 383 jobs).

**Against the previous dump** (4575 boxes): 4284 identical, 238 moved, 337
added, 53 removed, **none across 3:1**. Moved: the band's six text boxes
on every look (its card); the controls anchored to the foot — the dock's
tabs, the footer's `.mini.another` — at their place in a shot of another
height; boxes the old shot cut at the region's edge, read whole now (a
studio lede 22 → 53px tall, Rural worn 4.80 → 4.36; a stepper 41 → 44px);
Neo worn's Activity rows over rain laid out for another height (±0.3);
and the wall's cycle card at its own shape (`shop-window-cycle` at
1280×900, `shop-window-wall` at 1920×1080: the tile 465 → 437px). Added:
the sheet halves and shell feet above, every one at 4.05:1 or more. Removed: the wall's second row and
below at its own height (`shop-window-browse` at 1280×900,
`shop-window-quotes`, `shop-window-touch-quotes-pay` at 1920×1080) — the
same card class as the row above them, which is sampled. The kit's look
(`pnpm workshop:probe`, 625 boxes): 618 identical, 7 moved, 43 added, 7
removed, the same three kinds. 147 of the 383 jobs now fit and are shot at
their own viewport (none did); no job needed a second grow. Contrast pass
86.7 s, `pnpm test:layout` 144.9 s, against 88.6 s and 147.1 s on the tree
before.

**What this still cannot see.**

- **The wall's list below its edge.** It scrolls itself on an idle timer;
  a row that is not on screen at the instant shot is sampled only through
  the rows that are, which wear the same card over whatever the look paints
  at a different offset.
- ~~A control the wall's body cuts from below.~~ Measured since
  2026-09-24 by `nothing-on-the-wall-is-cut-from-below`, below.
- **`looks:diff` and `workshop:shots` grow the old way**
  (`max(document, region.scrollHeight)`). They shoot the showroom, which
  carries no verdict, so a page that fits was always shot at its own size
  there; a long page's last dock-height and a sheet's lower half are outside
  their shots.

## Nothing on the wall is cut from below (2026-09-24, the owner's B)

A wall is a screen nobody scrolls: `.stall-scroll` and, in Browse,
`.stall-body` are `overflow: hidden`, so a control past a clip's foot is not
below the fold, it is gone. Found while measuring the payment band ("Shot
at the real height", above): at 768×1024 the band ran past the body and
Back was cut from below. No rule could see it — the protected boxes are
money figures and codes, `cutSideways` is sideways only, and `coveredBy`
skips a point outside its clips as reachable by scrolling.

**`nothing-on-the-wall-is-cut-from-below`**: every control on a wall screen
(`button`, `a[href]`, `input`, `select` under `.stall.shop-window` — the
touch wall's steppers, Clear all, Pay and Back) and every protected box on
it (`PROTECTED`: the figures, the codes, the payment's lines and total) must
stand whole — top, bottom and both sides — inside every clip above it up to
the wall's frame, and inside the viewport. One allowance: inside a box that
really scrolls on that axis (`overflow: auto | scroll` with something to
scroll — the touch wall's list, the payment's lines) a node is reachable by
scrolling it, so from there up it is the part of the scroller the outer
clips leave showing that is measured. Where that part is shorter than the
node, the case fails — unless the node is one of the list's two steppers,
which is **printed, not failed** (`wallSlivers`, summarised by role on the
pass's `compared:` line; narrowed from every role on 2026-09-24, below,
when the list's figures shown in part at 768×1024 were found among them).
It runs wherever a wall paints; the canvas (1920×1080), portrait
(1080×1920) and tablet (768×1024) passes each owe every one of the touch
wall's five controls and its two held lines read WHOLE
(`wallControlRoles`, `probe-coverage.mjs`), and their verdicts print
failures and coverage gaps together (a gap printed in place of the
failures hid them — the critic's item 13).

**Proved red first, on the layout as it stood** (main's `window.css`): 10
failures, all Back on `shop-window-touch-quotes-pay` at 768×1024 — 8 of
72px on Modern + Awning, 7 on Modern worn, 36 on Neo in all six variants,
45 on Rural + Yard beetle and Rural worn — and nothing at 1920×1080 or
1080×1920.

**The fix, and a dead block found on the way.** The band's short-portrait
rules sat in a container block before the band's base rules, at the same
specificity, so every one of them but the caption's lost on source order:
the step-down it described (lines 18px, total 19, rate and truths 15,
figure 34, Back 64) never painted — measured 21 / 23 / 18 / 36 / 72. The
block moved after the base rules, and the band there stops stacking
everything beside the code: the rate under the amount beside the code, the
two truths the full width under both, Back beside them (`.sw-pay-b` hands
its children to the band with `display: contents` at that size alone).
`a-container-rule-is-not-out-ranked-by-a-later-base-rule` now reads every
served sheet for that shape — a conditional declaration taken back by a
later unconditional rule of the same selector — and failed four times on
main's `window.css`; it cannot see a different selector of equal
specificity (Back's 72 came from `.sw-sel-btn` that way).

**Several items (the critic's P1, the same day).** The fix held for one
chosen item, and both touch fixtures chose one; a selection holds up to 35,
one line each, and at 35 the band ran ~2,400px on every wall — Back, the
rate, the total and the lines cut off at all three sizes. `.sw-pay-lines`
now scrolls inside the plate (`overflow-y: auto`, `overscroll-behavior:
contain`) under a cap measured in lines — two at 1920×1080 (120px, the
code's height), five on the tall wall (309px), two on the tablet (111px) —
and the total, the truths and Back stay put. Fixtures
`shop-window-touch-quotes-pay-3` and `-35` (geometry only) ride the canvas,
portrait and tablet passes. Measured after, Back whole on every look at
every size with 3 and 35 items; at the tablet the list keeps 12–146px with
3 and 0–123px with 35. **Proved red** by taking the caps out: 533 + 526 +
281 cut surcharge lines and 19 each of the lines box, the total, the rate
and Back across the three sizes on the 35-item screen; a Clear all planted
700px to the right read "cut sideways by div.stall-scroll.sw" on every
touch screen at 768×1024 and 1920×1080.

**A sliver is the steppers' alone, and only a whole read counts (the
critic's second pass, 2026-09-24).** The allowance above forgave a sliver
of ANY role and counted it as read, so a Back, a Pay code or a money figure
inside a scroller cut shorter than itself was printed and passed — a
customer could never bring it whole into view. Now a sliver is printed only
for `window-step-*` (`SLIVER_ROLES`); any other control or protected box
cut so fails ("can never be brought whole into view"), and
`wallControlRoles` counts a node only when it was read whole. **Proved
red** with the wall's body planted `overflow-y: auto; max-height: 50px`:
6,057 failures across the canvas, portrait and tablet passes — Back, the
pay code's `svg`, the figure, the total, the lines, the list's figures and
surcharge lines — plus a coverage gap on each. The same plant under the
round-2 rule passed all three wall passes, printing `window-back`, `svg`,
`price` and `pay-total` as "shown only in part" (only the canvas's
clip-skip ceiling, a different guard, went red).

**What the narrower rule found, and the fix (round 3).** At 768×1024 a
wall row is 321–364px and the body 485–617px, so beside a 408–546px
payment band the list kept 0–167px: never one whole row, and on the worn
looks less than one figure — 33 of Modern + Awning's 48px with ONE item
chosen, 49 of Rural worn's 51, 0 with three. 974 failures on the tablet
pass, every one a quote figure or surcharge line in the list. The list now
yields its row to the band there while a payment stands (`display: none`
on `.sw-strip` under the short-portrait container; the chosen names stay on
screen in the selection strip), and the payment's lines cap at ONE line at
that size (56px), with the "+N more" line saying the rest — two lines, the
count and a borrowed-token sentence ran the 35-item band to 528px in
Modern worn's 485px body and cut Back by 10px. Measured after at
768×1024: the band 408–491px in a 485–617px body on every look, bare and
worn, with 1, 3 and 35 items. The owner's "the list keeps what it can"
stands at 1920×1080 and 1080×1920 and is reversed at the tablet — the
owner confirmed it ("Ok", 2026-09-24).

**Two lines outside the payment's scroller are held whole (`WALL_HELD`).**
The "+N more" line (`pay-lines-more`) and the borrowed-token sentence
(`pay-borrowed`, owner's decision 4) are read like controls — whole inside
every clip — and get no scroller allowance at all: inside a box that
scrolls is itself a failure, since standing outside the payment's scroller
is what they are for. The canvas, portrait and tablet passes each owe both
read whole (`probe-coverage.mjs`); `shop-window-touch-quotes-pay-35`
carries a borrowed item (the twenty-first, deep in the scroller) and is
contrast-sampled for the two lines (`.sw-pay-more`, `.sw-pay-borrowed` in
`CONTRAST_TEXT`; 6.73:1 at the least, Rural worn). **Proved red** by
appending the borrowed sentence inside the lines: "div.sw-pay-borrowed is
inside dl.sw-pay-lines, which scrolls" on every look at all three sizes,
and "read no pay-borrowed on a wall" on each pass.

## A payment list that scrolls says how many lines it hides (2026-09-24, the owner's decision 4)

The payment's lines scroll inside the wall's plate under a cap in pixels —
two lines at 1920×1080, five at 1080×1920, one at 768×1024 — and nothing
said so: two lines of thirty-five showed over a total for all of them. The
page now says `windowPayMore(n)` ("+33 more items: swipe the list") under
the scroller, set after layout by `sayHiddenPayLines` (on the paint, when
the fonts land, after a kept offset is put back, and on every scroll): a
line counts when any part of it is outside the scroller's client box.
happy-dom lays nothing out, so the unit tests stub the boxes; the real
geometry is this rule's.

**`a-payment-list-that-scrolls-says-how-many-lines-it-hides`**: on every
wall screen with a payment standing, the probe counts for itself the lines
not wholly inside `[data-role="pay-lines"]`'s client box and holds
`[data-role="pay-lines-more"]` to it — hidden and silent at 0, shown and
saying exactly `windowPayMore(n)` otherwise, never inside the scroller.
Its coverage is the wall rule's: `pay-lines-more` read whole on each wall
pass is a nonzero count compared (the 35-item plate at every size, the
three-item one at 1920×1080 and 768×1024; three items fit the tall wall's
five lines, and the line stays silent there). **Proved red** by taking the
two calls out of `renderStall` (in one run with the borrowed-sentence
plant above, whose failures are a different rule's): 95 failures — 30 of
the 35 lines hidden at 1080×1920 and the line under them saying nothing
where it owes "+30 more items: swipe the list", 33 at 1920×1080, 34 at
768×1024, and on the three-item plate 1 at 1920×1080 and 2 at 768×1024 —
and a coverage gap on each wall pass.

## A line on the ground reads wherever a drop falls (2026-09-24, the critic's P1 on the visible batch)

Neo's rain (`att-rainfall`) is three tiled sheets of drops drifting down the
stall's own background every 2.6 s, so every line with no card under it is
crossed by a drop within one drift. The contrast pass freezes every
animation at 400 ms, so what it read depended on where the drops happened
to be then: one more row on the `activity` fixture moved a receipt amount
(`dd.event-dd`, money) onto a drop and read 2.76:1 at 390 and 2.71:1 at
1280 — and the builder answered by moving the widest initials onto an
existing row instead of adding one, which taught the guard to look away.
That was wrong, and it is recorded here so it is not done again: a fixture
change that makes a real defect visible is the finding.

**`a-line-on-the-ground-reads-wherever-a-drop-falls`**: in every contrast
job, each `.stall.att-rainfall` has its three drop sheets replaced by ONE
flat layer of the brightest drop the art draws — every pixel of the ground
as a drop is at its worst — in the first sheet's place in the stack, with
every other layer kept where it was (the backdrop behind; with the aurora,
its glows behind and its tint in front). The colour and opacity are read
from the art: every `stroke="#…" stroke-opacity="…"` in `rain-near.svg`,
`rain-mid.svg` and `rain-far.svg` is composited over the stall's computed
`background-color`, and the lightest composite wins (Neo's ink is light, so
the lightest paint is the worst ground) — today the near sheet's `#2ce9e0`
at 0.68. The four background longhands are set `!important`, so the drift's
animated `background-position` cannot slide the flat layer off the top of
the box, and the aurora's own layers keep the positions the freeze read
them at. Two drops crossing are brighter still and are not modelled: the
strokes are 1.6px wide, and a crossing is a point. The prepare reports how
many stalls wore the rain and how many were flattened; the runner refuses a
job where the two differ and fails a shipped run that flattened none (63
jobs: every Neo worn job, at 390, 1280 and the canvas).

**Proved red**, with the fixture as it stood: 15 figures on Neo worn under
3:1 — `dd.event-dd` 2.58–2.94:1 and the Activity rows' empty tiles
2.64–2.92:1 at 390 and 1280 — green before the flattening, so the old green
was the drops' luck. With the flattening skipped: 63 jobs refused ("1
stall(s) wore the rain and 0 had it at its brightest") and the no-job
line.

**The fix (owner, 2026-09-24): the Activity sections stand on `--s-bg`
where the rain is worn** (`.stall.att-rainfall .activity-sec`, a longhand
`background-color`; the 12px between the two sections painted by a shadow
the second casts upward). `--s-bg` and not the card surface, because it is
the ground every ink and muted token was validated on. Green after, and
with item 4's extra row restored. **Superseded**: round 6 replaced the
ground with veils, round 7 took every ground out (the owner: no ground of
any kind under text over a decoration), and round 8 answers the drop with
an outline in the look's own ground, read in the ring around the glyphs
("Round 8", below). The extra row stays.

**What it cannot see**: only the nodes `CONTRAST_TEXT` names are sampled,
and much of Neo's groundless text is not among them — at the brightest drop
Neo's ink reads 2.84:1 and its muted 1.27:1 over bare ground. The list is
in CLAUDE §10, handed to the owner as more than a small ground.

## Small text is at least 11px (2026-09-24, the owner's Q16)

Re-derived before anything moved, declared and computed. Declared under 11px
in the served sheets: stall.css `.orn` 10 and `.event-sum .item-ic.event-ic`
9; Modern `.ghost-chip`, `.notice-chip`, `.item-from` 10.5; Neo `.item-from`,
`.item-lots`, `.sm-cap` 9.5, `.notice-chip`, `.item-rate`, `.ghost-chip` 10,
`.stall-sub`, `.collection-count`, `.item-q`, `.item-u`, `.item-fiat`,
`.item-fiat-src`, `.wearing` 10.5; Rural `.item-from`, `.item-lots` 10,
`.notice-chip`, `.item-rate`, `.ghost-chip` 10.5 — the critics' list, and
nothing in window.css, broadcast.css or obsGuide.css. Computed, every fixture
screen on the three looks bare and worn at 390 and 1280, and the canvas and
wall screens at 1920×1080, 1080×1920 and 768×1024: all of those paint on
some screen except `.ghost-chip` (the notice invite, a seller prompt no
fixture stages); `.wearing-link` inherits `.wearing`'s 10.5; `.sm-cap` is
the one inside an aria-hidden subtree (the sparse motif); nothing on the
overlay or a wall is under 11; the door's deck minis paint five sub-11
nodes, all in an aria-hidden, zoomed picture. The owner's rule (F1, with F2
for the tile letters and the brand strip) raised every declared one to 11px
in its own sheet except `.sm-cap`.

**`small-text-is-at-least-11px`**: every node with its own text a reader is
given — on every screen, look and variant of every pass, the phone, the
desk, the canvas, the tall wall and the tablet — fails under
`TEXT_FLOOR_PX`. The first version failed only the raised list and printed
the rest (the critic's item 3: a planted 10px `.door-kicker` stayed green);
now the one exception is a node inside an `aria-hidden="true"` subtree,
which the owner's rule excludes — reported on the pass's `compared:` line,
never failed, and today that is Neo's `.sm-cap` alone — unless it is one of
the raised nodes (`FLOOR_NAMED`), which fail anywhere. The door's deck
minis are skipped (zoomed pictures). The raised nodes read are counted
(`floorNamedChecks`: 4625 on the phone pass, 5066 on the desk) and the
runner requires some on both. **The declarations are held too**:
`the-raised-small-text-stays-at-eleven-px` reads every `font-size` and every
size inside a `font` shorthand in every served sheet and refuses a pixel
size under 11, `.t-neo .sm-cap` the one listed exception — which is what
holds the notice invite's `.ghost-chip`, painted by no fixture. It cannot
see a size computed from `em`, `rem` or `calc()`; the probe measures those.

**A tile shows its letters whole** (the critic's item 10). A token tile
paints the name's initials until a picture lands, and it clips — so raising
the Activity tile's letters to 11px could cut them with no rule seeing it
(`text-spills` reads only a box whose overflow is visible). The `activity`
fixture carries a payment row of its own naming `WIDE_INITIALS` ("Wool
Mittens", "WM", the widest pair). For one day it did not: the added row
pushed an open fold's line on Neo worn onto a drop of the rain at 2.7:1,
and the builder moved the initials onto an existing row instead — a guard
taught to look away. The row is added again, and the finding is fixed
where it lives ("A line on the ground reads wherever a drop falls",
above).
**`a-tile-shows-its-letters-whole`**: for every `.item-ic` showing letters,
the letters' extent (a Range over its text) must fit the tile's content box
within a pixel. Measured: "WM" 22.1px of text in a 22px box on Modern,
21.8 on Rural, 13.7 in Neo's mono. **Proved red** with
`letter-spacing: 0.35em` on the tile: "WM" spans 28.7–29.4px in a 22px box
on every look.

**Proved red.** Neo's `.item-from` put back at 9.5px and the Activity tile's
letters at 9 in one run: 281 failures on each of the phone and desk passes
(Neo's "from" on every screen that paints one, in every Neo variant; the tile
letters on `activity` on every look). A 10px `.door-kicker` — outside the
raised list — left the first version green and printed it; the widened rule
fails it ("p.door-kicker … paints at 10px") on the phone and the desk, and
the static test names it. The static test also failed by name on Modern's
`.ghost-chip` put back at 10.5px.

**The price ladder held.** The widened "from" and unit take room from the
name column on a phone, so each look's `tierCeilings` were re-checked at 390
by painting the `offers` row that carries "from" at every tier's ceiling,
with and without "from", on the widest digits ("888,888", "8,888", …): the
name column kept 90–131px on Modern and Neo and 82–119px on Rural, against
the name floor's 64 — the most any case lost was 6px (Neo, tier 0 with
"from"). No ceiling moved. Not measured: a phone narrower than 390px.

**Round 3 (the critic's second pass, 2026-09-24).** The steppers' counts
(`.step-n` — the phone's `selection-count` — and the wall's `.sw-step-n`)
join `FLOOR_NAMED`: they are `aria-hidden` because the count rides the two
buttons' names, and a sighted customer reads them all the same, so the
aria-hidden exception must not reach them. **Proved red** with `.step-n` at
`0.6em` (a size the static test cannot read): 14 failures on each of the
phone and desk passes, "b.step-n "2" paints at 8.1px" to 9px on the
selection screens, where the first version only printed them. The same run
had the Activity ground taken out with the restored row in the fixture: 15
figures on Neo worn at 2.54–2.92:1, the added row's receipt amount among
them — green with the ground. And
`the-raised-small-text-stays-at-eleven-px` reads every served sheet — the
static pages' (`public/*.css`) and the workshop kit's
(`workshop/*.css`) with the app's — found by listing the directories, so a
new sheet is read the day it lands. **Proved red** with a 10px rule planted
in `public/stream.css` and a `font: 700 9px/1` planted in the kit's sheet,
each named by the test.

## Round 4 (the critic's third pass, 2026-09-24): the skip is proved where it can be seen

**A skip fixture must put the unbuyable listing where its surface looks.**
`an-unbuyable-offer-paints-no-figure-and-says-so` counts a skip on
`shop-window-cycle-unbuyable`, `broadcast-unbuyable` and
`broadcast-ticker-unbuyable` when the surface paints a card (or a ribbon
item) with no "Not buyable" on it — which a cursor resting on a BUYABLE
listing does whether or not anything is skipped. So each entry of
`SKIP_SCREENS` now says where its surface looks unskipped (`wouldShow`:
the Cycle card's `windowCursor`, the stream card's `broadcastCursor`, the
ticker's page of `TICKER_ITEMS_PER_PASS` items), and the rule fails the
screen unless an unbuyable listing is there in the shop's own order
(`listingsInShopOrder`, `cheapestOf`, `isUnbuyable`). **Proved red** with
both cursors moved to 1: "shop-window-cycle-unbuyable puts no unbuyable
listing where its surface looks unskipped" on the desk, portrait and
tablet passes (21), "broadcast-unbuyable …" on the canvas (4), and the
desk's and canvas's skip coverage gaps. The fixture comments name the real
counter (`skipChecks`, by surface).

**An overlay with only unbuyable listings says so** (reworded in round 5,
below: about the listings, never the stall).
With `cards=listings` (or `cards=all` and nothing quoted) and every listing
unbuyable, the stream skips them all: the ticker painted an empty ribbon
under "Listings" and the corner card a head with nothing under it — a
source that looked dead. Both said `BROADCAST_NOTHING_TO_BUY` ("nothing
to buy right now") where the ribbon or the card would stand — never
"nothing listed yet", which is false over a book that has listings.
Fixture `broadcast-ticker-none-buyable` (canvas, geometry: the sentence
stands inside its cell); test
`the-stream-skips-an-unbuyable-listing` › "says there is nothing to buy
…", red with the sentence taken out.

## Round 4: every line on the bare ground under Neo's rain (the owner's condition on decision 1)

The owner chose "a ground" for the Activity rows on the promise that ANY
other groundless Neo text the rain exposes gets the same, shown before
merge. At the brightest drop Neo's ink reads 2.84:1 over the bare ground
and its muted 1.27:1. **Found by sampling, not by list**: a scratch pass
painted every fixture screen on Neo worn at 390, 1280 and 1920 with the
rain flattened exactly as the rule does, blanked every text node and read
the pixels under it, and compared with the same screens bare; every line
that fell under 3:1 only with the rain is grounded. What it left, each
looked at: text inside a sheet or a scroller sampled past its clip (the
scratch pass does not clamp; the probe does), the Neo mini on the door
(a picture), the sign's humming letter (the hum, not the rain), and the
sparse motif's "scan to enter" (inside an aria-hidden picture), and the
zoom sheet's text, which its own scrim already carries (read at 10:1+).

**The grounds** (`stall.css`, `window.css`, all scoped to
`.stall.att-rainfall`, longhands only): the brand strip, the footer, the
section and shelf heads, the notice (its wash kept over the ground), the
sparse shop's box and the Activity notes' fold get `var(--s-bg)`; the
Studio's preference and share boxes their 4% tint restated over it; the
first-stall checklist, which reads as a card, `var(--s-surface)`; a line
on its own — `.mid-t`, `.mid-p`, `.pay-sec > .fine`, the quotes rail's
title, `.stall-body > .fine`, the face's back control and its pointer —
the ground with a 6px shadow halo, so nothing moves; and on a wall the
status line and the shop code's plate. **Superseded**, in round 6 by veils
that hug the lines that need them ("A ground where the text reads without
one", below) when the owner found these grounds too heavy, and in round 8
by an outline on each line when the owner refused any ground at all.

**The targets.** The failure and empty sentences and the other ground
lines are contrast targets that match on every look (`.mid-t`, `.mid-p`,
`.pay-sec > .fine` — `quotes-failed`, `-reading`, `-truncated`, the
lede —, `.stall-body > .fine`, the sparse box's lines and button, the
notice, the Activity notes, the face's pointer, the checklist's steps and
note, `.sw-state`, `.sw-fresh`, the plate's caption) — **but a target is
read only where its screen is sampled**, and the screens that carry most
of the failure and empty sentences are geometry-only: `.mid-p` on the
failure screens and the sparse box on `empty` are read on every look, and
the quotes rail's failure lines, the checklist and (round 5) the notice
invite on Neo worn alone. The brand strip, the Wearing line, the headings
and the back control are targets where the rain is worn
(`.stall.att-rainfall:not(.deck-stall) …`): unscoped, three reads fell
under 3:1 on other looks worn. **Corrected in round 5** (the critic's
fourth pass) — this entry first called all three the owner's question,
and two are this sampler's mistakes: Modern's section and shelf heads
(2.56:1) read the heading's own 2px accent underline, inside the box and
never reached by the glyphs, and Rural's strip (1.1:1) reads the bunting
row its box also holds. Rural's Wearing links and back control (2.53:1,
Sun-faded worn) were real. **Their ink half is fixed by 78f057d**, the
owner's (c): Sun-faded's accent and muted went a step darker (accent
#8b5334, muted #6c5f4d), and two pure tests hold every ink Rural paints at
3:1 over the confetti and the sunburst
(`every-confetti-scrap-clears-three-to-one-under-every-ground-ink`,
`every-sunburst-ray-clears-three-to-one-under-every-ground-ink`). **What
remains is step 5b**: taking the rain scoping off these targets. They still
sit behind a rain-scoped selector (`.stall.att-rainfall:not(.deck-stall) …`),
so no pass reads them on Rural today (round 9 note, the critic's eighth
pass, item 11; the critic's final merge, item 7). Four geometry-only
screens are sampled on Neo worn alone (`RAIN_JOBS`: `quotes-failed`,
`nothing-quoted`, `quotes-truncated`, `first-stall`; `sparse-pasted` since
round 5), at the phone and the desk: 449 jobs then, 451 now.

**The sampler, twice more honest.** A heading's in-flow marker (Neo's
wedge, an inline-block `::before` inside the heading's box) is stepped
past, not read as ground — it read every Neo heading at 1.2:1, bare or
worn. And a target's pseudo-element glyphs are blanked with it, through
an adopted stylesheet (the page's policy refuses an injected `<style>`):
the Wearing line's cyan "// " was read as its own ground at 1.20:1.

**The rule, tightened** (the critic's third pass): the door's deck minis
are neither flattened nor counted; the runner requires the rain flattened,
by key, on `activity`, `plugin-missing`, `empty`, `quotes-failed` and
`nothing-quoted`, Neo worn, at the phone and the desk (`RAIN_REQUIRED`);
the aurora is sampled with its tide at 1, its worst for the cyan drop;
and `brightestDrop` refuses a sheet whose `<path>`s it cannot all read
(or with an opacity on a group), which refuses the job — since round 8 by
an allow-list of what a sheet may hold (`layout/rainDrop.ts`).

**Proved red.** With the grounds taken out: 395 figures on Neo worn under
3:1 — the Wearing line and its links 1.12–2.21, the brand strip 1.84,
the headings 2.03–2.23, `.mid-p` 1.09–1.16, the quotes rail's lines
1.12–1.32, the wall's status line 1.23–1.36 and caption 2.70, the sparse
box 1.14–1.86, the notice 2.37, the Activity notes' fold 2.52, the
checklist's steps 2.49 — and nothing on any other look. With the rain
dropped from Neo's worn set: "had the rain at its brightest on 0 job(s)
but not on mobile/activity/2/65535, …" naming all ten required keys. With
a full-opacity `<path>` added to the near sheet: 69 jobs refused ("1
stall(s) wore the rain and 0 had it at its brightest") and the same ten.
Green with the grounds: 449 jobs, 6,072 boxes, the rain at its brightest
on 69.

**The notice invite (round 5, the critic's fourth pass).** The button a
seller's own paste paints where the announcement would stand
(`button.notice-invite`, `pasted` and no announcement) sat on the bare
ground under Neo's rain — its wash is a 4% colour, 9% on hover — and no
fixture painted it, so the scan never saw it: 1.08:1 at the brightest
drop. Fixture `sparse-pasted` (the `sparse` stall reached by a paste) is
in `RAIN_JOBS`, and `.notice-invite .invite-text` is a target. **Proved
red** before the ground: "span.invite-text … sits on paint at 1.00:1" at
390 and 1.01:1 at 1280. The washes are restated over `--s-bg` where the
rain is worn, hover included (Neo restates hover with the `background`
shorthand at (0,3,0); the ground's rule is (0,4,0)); measured in Chrome
with the hover forced: an opaque ground in both states, the words at
6.68:1 and 6.39:1. 451 jobs. (Round 6: a veil at 60% under Neo's own 4%
wash, hover included — below.)

**The overlay's empty line, reworded (round 5, the critic's fourth pass).**
"Nothing to buy right now" claimed the whole stall over a book whose
listings the stream skips — a stall with quotes it does not carry is not a
stall with nothing to buy. The overlay now says why it has no card, about
the listings, whenever a definite book has offers and `broadcastCards` is
empty (`emptyOverlayReason`): `BROADCAST_NO_LISTING_BUYABLE` ("no listing
can be bought right now") when every listing is unbuyable, and
`BROADCAST_NO_LISTING_CARRIED` ("nothing listed here that this page shows")
when every offer is a token this page does not carry — the two empty
ribbons the old sentence left. (Round 6, the critic's fifth pass: a MIXED
book — some offers withheld, the rest unbuyable — takes the withheld
sentence, the only one true of it; and `BROADCAST_EMPTY` is gated on the
card list, not the mounted card, so a `mode=rail` rest no longer prints it
between quote cards. Both in `render.test.ts`, red on round 5's overlay.) A `cards=quotes` stream with no payable
quote falls back to the listings (§4), and its ticker label now names the
listings it shows rather than the quotes line. Tests in
`the-stream-skips-an-unbuyable-listing`, red on the old overlay.

## A ground where the text reads without one (round 6, the owner, 2026-09-24 evening)

**Withdrawn in round 7** (the owner, 2026-09-24 late, over these veils and
a halo mock: "Tôi thấy làm nền rất xấu, còn ảnh hưởng đến theme và các
decor bên dưới nó … giữ như ban đầu"): the veils, their steps,
`a-rain-veil-is-the-least-that-reads` and the bare re-read left with them,
and the static guard became `a-decoration-lays-no-ground-under-text`,
which refuses every ground a decoration lays under a box. What answers the
rain now is round 8's outline, below. This entry stays as the record of
why no ground comes back.

**The incident.** Round 4 and 5 answered Neo's rain with the look's own
ground laid solid under every line on the bare background — full-width
bars under the section heads, the vacant box, the footer band, the whole
Activity section — and the owner, over the pictures: "Phần che đen hơi quá
đà". The rule, in their words: "nếu chữ vẫn đọc được thì không nền
đen/trắng, nếu đọc không được thì nền đen/trắng mờ ôm sát chữ và có độ
trong suốt đủ đạt ngưỡng" — a line that reads gets nothing; one that does
not gets a translucent veil of the look's own ground, hugging it, at the
least opacity that clears the floor. "Áp dụng cho tất cả … cũng như áp cho
bộ đo/test sau này": the guards below enforce it from now on.

**The veils** (`stall.css`, scoped to `.stall.att-rainfall:not(.deck-stall)`):
`color-mix(in srgb, var(--s-bg) var(--rain-veil-…), transparent)` as the
line's own `background-color`, a 2px ring of the same by a shadow; a
one-line box `width: fit-content`, a paragraph's veil its block, a box of
many lines none. Steps per ink: text 25%, the notice's ink 30%, accent 35%
(and Neo's brighter `#3df2ea`), muted 55%, the Activity pill (its own muted
tint kept on top) 60%, the notice invite (Neo's 4% wash kept on top, its
hover included) 60%, and **the vacant box's second line, `#5e7799`, 80% —
over the owner's 60% cap, stopped and put to the owner**.

**Three guards.**

1. **`a-rain-veil-is-the-least-that-reads`** (`decor-gate.test.ts`, pure):
   each stated step recomputed from the rain art (`layout/rainDrop.ts`,
   the derivation this pass flattens with) and Neo's palette against
   every layer at its worst at once — an upper bound no pixel of the stall
   reaches, so the steps were heavier than the least (the critic's fifth
   pass: over the real geometry the worst ground is about rgb(39,184,179),
   where Neo's ink reads 2.18:1 bare, not the 1.95:1 this entry and
   CLAUDE §4 said) — reads 3:1 for every ink it serves, a step 5% lighter
   does not, and a step over 60% names its reason. Proved red: muted at
   60% ("would read at 55%"), at 50% ("expected false to be true"), and
   `dim` unlisted ("--rain-veil-dim is 80%").
2. **A veiled target re-read bare** (this pass): on a job that flattened a
   moving decoration, every target whose own `background-color` is its
   stall's ground made translucent is shot again with its veil and ring
   taken off (`__contrastUnveil`, one more shot a veiled job), and a kind
   of line — the box and its parent, described — whose every line on the
   job reads 3:1 bare fails. **Per kind, measured**: the first run read
   eight `dd.event-dd` at 3.03–3.11:1 bare on a long Activity list, lower
   than the aurora's glow, where the list's first rows need the veil — a
   rule cannot tell a row by where it landed. The same run's other
   findings were real and fixed: the wall's announcement, which sits in the
   sign (11.26:1 bare), and the payment plate's caption, which sits on its
   card (16.56:1). Proved red: a veil planted on `.item-x` (a price on a
   card) — 29 kinds "read 12.21:1 or better with its veil taken off". A
   shipped run that read no veiled box fails as vacuous. Green: 469 veiled
   boxes read bare, none needless.
3. **`a-decoration-lays-no-opaque-ground-under-text`** (`decor-gate.test.ts`,
   static, every served sheet): a decoration-scoped rule names
   `var(--s-bg)`/`var(--s-surface)` in a `background`, `background-color`,
   `box-shadow` or custom property only inside the veil's shape. Proved
   red: round 5's block pasted back, 9 offences.

**The targets it added**, where the rain is worn: the Activity rows' kind,
time, pill, fields and notes, the checklist's step numbers and the
footer's lines — each a line with a veil of its own is a box this pass
reads. **A sampler correction came with it**: a box that draws nothing —
no text, no glyph, no generated content — is not a target. The Activity's
empty tile (`event-ic-empty`, a placeholder naming no token) was sampled as
text against its own transparent ground and read 2.66–2.92:1 the moment
the section's ground came off; the picture tile is the same rule's first
case.

**What waits.** The pass reads a target's border box, so a veil must cover
the box it reads: a wrapped paragraph's veil is its whole block, ragged
right edge included. A veil that follows each line's own extent (an
inline background with `box-decoration-break: clone`) would leave gaps the
pass reads as covered, and waits for the line-rect sampler
(`SAMPLER-STEP-PLAN.md`), which measures behind the text's own lines.


## Round 8: an outline in the look's own ground, read in the ring (2026-09-25)

**The incident.** Round 7 took every ground out from under Neo-with-rain
text (the owner: no ground of any kind under text over a decoration) and
took the rain's flattening out with it; with Neo painted exactly as on
`main`, round 4's line targets read 19 boxes under 3:1 — 17 of them fail on
`main`'s own paint the moment they are measured, and the other two are
`main`'s own target, the Activity receipt amount, which one more row moves
onto a frozen drop (`visible-batch-shots/10-round7-rain-red/`). Real
failures, answered by the owner's own words: "đổi màu chữ hoặc cho lớp nền
tối ngay dưới nét chữ" — the ink lifted, or a dark layer right under the
strokes.

**The outline** (`stall.css`, on `.stall.att-rainfall:not(.deck-stall)`;
the sets are `layout/outline.ts`): every line on Neo's bare ground under
the rain wears `text-shadow` in `var(--s-bg)` at alpha 1 and zero blur —
`--rain-outline-1`, eight one-pixel offsets, at 14px and over;
`--rain-outline-2`, those and twelve at two pixels, under 14px. Leaf lines
only; Neo's heading glow listed after it; an ink darker than the muted
lifted to `var(--s-muted)` first where the outline alone does not read —
the vacant box's `#5e7799` alone since round 9 (the first-stall guide link
wore it for one round and wears the accent now; the invite's `#b08ca3` read
5.77:1 at the phone and 6.28:1 at the desk unlifted, in the solid ring, so
its lift — never measured as needed, the critic's eighth pass, item 6 —
was dropped). A soft glow was
measured first and could not honestly pass: at 2px or less it darkens a
ring pixel by ≈0.55 at best, and muted needs 0.44 at every pixel over the
drop and 0.51 with the aurora (the critic's P1).

**`ringRead`** (runner) — an outlined target is read in the ring around its
glyphs, never over its box:

- the probe detects the outline from the computed `text-shadow` (`outlineOf`,
  never a marker), keeps it and only it through the blanking — the
  target's pseudo-elements keep theirs too, through the adopted sheet —
  and hands the runner the target's lines (each text node's characters on
  one line box, clipped like the box, with the ink its own element paints
  them in) and its drawn icons;
- the job is captured once more with those glyphs shown
  (`__contrastGlyphs`); the **mask** is every pixel of a line's rect the
  glyphs moved at least halfway from the blanked capture toward the ink
  (`RING_MASK_ALPHA` 0.5 — the letter's own painted edge), icons left out;
- the **ring** is where the outline's own offsets carry the mask, and the
  verdict reads **its solid part only**: the one-pixel offsets of the
  two-pixel set, all of the one-pixel set. The worst ring pixel of the
  blanked capture against the line's ink must clear 3:1 — every one, no
  percentile;
- a line whose mask holds fewer than `RING_MASK_PER_CHAR` (10 since round
  9; 3 before) pixels a letter or digit, or none, fails as "no ring to
  read" (punctuation is held to one pixel: a lone middle dot is two), and
  one whose solid ring holds no pixel fails as "no ring around them";
- a failing ring is read again on a fresh pair of captures before it is
  believed, sharing the box read's one re-shot per job;
- every other target keeps the box read.

**Why the solid part, and not the full width** (the window's decision,
2026-09-25, after the builder stopped on it). Read at the outline's full
width, the ring reaches the two-pixel set's own antialiased rim, and a rim
pixel is covered exactly as much as the glyph pixel it copies — at the
mask's edge, half. The first full run read Neo's muted at **2.97:1** there
(`p.mid-p` on `unreadable`, `unresolvable` and `script` at 390, the quotes
lede on `plugin-missing-quotes` at 1280; the worst pixel two pixels from a
mask pixel at α = 0.500, ground `rgb(27,94,97)`) and at **5.88:1 or
better** one pixel in, on every muted kind. That verdict rested on where
the mask's threshold sits, not on the paint, and a threshold moved to pass
it would be the same mistake the other way. **The verdict must rest on
paint**: what an outline promises is a solid dark border at least one
device pixel wide around every glyph at the rain's worst, and that is what
is read. The rim is read too and reported per kind in the pass's summary
(`rim`), never judged. Pictures of the rim pixel, ×10:
`visible-batch-shots/11-glyph-outline/stop-rim/`.

**Two sampler corrections came with it.** A descendant's ink is read before
any node of its target's subtree is blanked: a child inherits its colour,
and read after its parent went transparent it read transparent — the
Activity's wide fields and the face's back control showed "no ring to read"
until then. And a wide Activity field is two lines, its value and a copy
control on its own ground: the target is the value
(`.event-dd.wide > .event-txid-full`), and the control is `.mini`'s.

**The rain at its worst, restored** from round 4, with round 7's
withdrawal undone: the flattening, the aurora at tide 1, round 4's
rain-scoped targets and `RAIN_JOBS`, `drawsNothing`, and `RAIN_REQUIRED`
widened to `quotes-truncated`, `first-stall`, `sparse-pasted` (phone and
desk) and the wall's `shop-window-cycle` at the desk. `brightestDrop` now
reads the art through an allow-list (`the-rain-is-read-from-its-own-art`,
nine plants, each refused).

**What it costs.** One more capture on each job with an outlined target —
61 of 451, 12.6 s of the pass (`ring` in the phase table) — and the pass
prints the least solid-ring read per kind, with the rim beside it.

**Proved red** (one planted run, reverted): `mix-blend-mode: screen` on the
footer's lines — the outline screened into the drops, still detected —
read the Wearing line's ring at 1.21–1.27:1 and its links' at 2.01–2.12:1;
`opacity: 0.3` on the shelf counts — glyphs too faint to be half their
ink — "shows no ring to read", 10–38 glyph pixels for 13 letters;
`first-stall` dropped from `RAIN_JOBS` — both of its keys named. 232
figures in all, and the verdict now names every rule that failed rather
than the first: a missing key used to hide the figures under the floor.

**The quote face's pointer is measured** (round 8, the window's step 2).
`.item-face > .pay-pointer` wears the outline on the quote's face, and no
rain job painted that screen — an outline nobody read. `item-quote`, a
geometry-only screen, joins `RAIN_JOBS` (Neo worn, the phone and the desk:
453 jobs), and both faces join `RAIN_REQUIRED`.

**The outline's own guards** (round 8, the critic's item 5 on the rain
round: a "not needed" rule read on the ground is vacuous and dodgeable, so
the rule is structural).

- **`an-outline-where-the-text-has-its-own-ground`** (probe, the geometry
  passes — every screen, look and variant at the phone, the desk, the
  canvas, the tall wall and the tablet): every element with text of its
  own that wears the outline (`outlineOf`) fails when it wears shadows in
  the ground's colour that are neither set; when its computed size and its
  set disagree (under 14px owes the 2px set, 14px and over the 1px set —
  the computed size is the only honest reading: `clamp()`, container units
  and inheritance put it out of a stylesheet's reach); when anything
  between it and its stall's root paints a ground of its own
  (`paintsOpaqueGround`: a colour, or a full-size gradient, at half
  opacity or more — a card, a chip, a sheet, Neo's 86% filled buttons;
  the txid pill's 12%, the invite's 4% and the call to action's 16% are
  tints the rain shows through); and when it is in no contrast target.
  `outlineChecks` counts what it read, and `probe-coverage.mjs` owes one on
  the phone and desk passes wherever Neo is measured.
- **An outline nobody reads** (runner): every target an outlined line was
  found in by the geometry passes (`outlinedTargets`) must have been read
  in the ring on some contrast job — the quote face's pointer was exactly
  that until `item-quote` joined `RAIN_JOBS`.
- **`an-outline-is-the-only-mark-under-text-on-a-decoration`**
  (`decor-gate.test.ts`, static, every served sheet): a `text-shadow` whose
  shadows, custom properties substituted, include one in the ground's
  colour — `var(--s-bg)`, or a literal any shipped look's `--s-bg` equals —
  stands in a rule every selector of which is scoped to a decoration,
  names the ground as `var(--s-bg)`, blurs nothing, offsets no more than
  two pixels, holds at most twenty such shadows, and is exactly one of the
  two sets; the two sets are stated once, on `.stall.att-rainfall`, as
  `layout/outline.ts` has them. The size a set is owed is the probe's rule
  above, not this one's: a stylesheet cannot know a computed size.

**Proved red.** Static: the test's eight plants (outside a decoration, by a
var defined elsewhere, a glow, a 3px offset, the ground as a literal, a
partial set, two copies of the 2px set, a keyframe) and, in the real
`stall.css`, a blurred shadow in `--rain-outline-2` with a plain
`.stall .fine { text-shadow: 0 0 2px var(--s-bg) }` — three tests red.
Probe, one planted run, reverted: the text inside the
footer's filled buttons outlined — 125 "a ground of its own" (the 86%
fill); the brand strip given two offsets — 121 "neither outline set" (and
the static test's own "neither outline set" on the same sheet); the sparse
motif's caption outlined — 32 "no contrast target"; the 17px failure
heading given the 2px set — 2 "its size owes the 1px one"; and `item-quote`
out of both lists — "an outline nobody reads — … button.pay-pointer".
The verdict named every one.

**The guide links wear a dress and are read** (round 8, the window's step 3;
CRITIC-4 item 5, a bug on `main`). The first-stall checklist's and the
studio's guide links were plain anchors no look coloured: the browser's
`#0000ee`, 2.15:1 on Neo's ground (1.84 visited, 1.95 under After hours),
and the pass could not see it — a target is read against its own ink, and a
nested anchor's ink is not the line's. Both wear `.cashtab-link`'s dress
now (`guide-link`: the accent, weight 600, the underline), and
`[data-role$="-guide-link"]` is a contrast target on every look where a
fixture paints one on one line — today the checklist's, on Neo worn.

**Open, owned by step 5b (the line-rect sampler, D7).** A wrapped inline
target and a box holding a border arc are read per line fragment in step
5b; the studio guide link and Rural's `.tool-lede` wait for it. Measured
with a `studio-items` fixture (the studio over a stall with items, which
paints the hint and its link; kept out of this batch): the box read put the
dressed link at 1.00–1.84:1 on Modern, Neo, Rural, the skeleton and the kit
— wherever it wraps, the union box holds the hint's own grey words — while
per line fragment it reads 4.05–12.21:1 on every look, bare and worn; and
Rural worn's `.tool-lede` at 2.99:1 at the desk, its box reaching the tool
door's rounded border arc the glyphs never touch. Pictures:
`visible-batch-shots/11-glyph-outline/stop-guide-link/`. Not answered here
because 5b has its own critic-reviewed plan with clipping and silent-drop
rules, and a hurried partial version inside this batch would be a weaker
guard.
The `studio-items` fixture landed on 2026-09-26 with the Studio row's
token glance (`.tid`, the ticker and the short id), in
`GEOMETRY_ONLY_SCREENS` for the link alone: sampled in a trial run, only
the guide link went red (1.00–1.08:1 at 1280 on Modern, Rural and the
skeleton, where it wraps), the `.tid` lines read 5.58:1 at the least, and
Rural worn's `.tool-lede` read 5.66:1 after the 2026-09-26 radius cap. 5b
takes the screen off that list.
Under the rain the first-stall link inherits its line's outline and is
read in its ring, and the muted lift it wore for one round is gone.

**A visited link is held by a unit test, since no pass can see it** (step
5b, SAMPLER-STEP-PLAN v2 item 9). A browser never hands script a visited
link's colour, so the probe's pixels read the unvisited one alone.
`every-anchor-the-app-builds-sets-its-own-colour`
(`layout/anchorColour.test.ts`, happy-dom) renders every fixture screen
under every shipped look and holds every `<a>` `renderStall` builds to a
rule in a sheet the app loads that declares `color` and matches the anchor
itself at rest (a state rule or a pseudo-element's does not count) — a
class rule colours a link in both states, so the visited colour is that
colour. Proved red by taking `color` off `.door-nav a`: the door's two
site-bar links on every look.

**Three guards closed** (round 9, the critic's eighth pass, item 7).

- **No other mark under text on a decoration**
  (`an-outline-is-the-only-mark-under-text-on-a-decoration`, static,
  `marksUnderText`): in a rule scoped to a decoration, or a keyframe one
  runs, a `text-shadow` is the outline (every part of it, custom
  properties substituted, in `var(--s-bg)`) or a glow listed with its
  reason in `DECORATION_GLOW` — Neo's heading glow after the outline, the
  crest's glow on the seller's name and its failing lamp's two frames; and
  `-webkit-text-stroke` (a width alone strokes in the text's colour),
  `paint-order` other than `normal`, a decoration line (`underline`,
  `overline`, `line-through`) and `text-decoration-thickness` are refused.
  `0 0 20px #000` twice passed every guard until then: it is in no
  ground's colour, so the outline test never looked, and `text-shadow` is
  not a ground property. Each glow listed must be one a served sheet still
  sets. **Proved red**: the test's eleven plants (a dark cloud, the outline
  with a cloud beside it, the listed glow on a line it was not listed for,
  a cloud through a custom property and through a keyframe, two strokes, a
  paint order, three decoration slabs); and planted in the served sheets —
  `0 0 20px #000` twice on the footer's lines in `stall.css`, a stroke, a
  paint order and a 0.9em underline in `theme-neo.css` — red, where the
  round-8 test passed all four.
- **`RING_MASK_PER_CHAR` is 10** (from 3): the least any outlined target
  read is 13.7 glyph pixels a character, and 3 let a ring round a sliver
  pass. **Proved red**: the footer's `.fine` painted at 62% alpha read
  9.5 and 9.7 glyph pixels a character (362 for 38 letters, 786 for 81) —
  over 3, under 10 — and "shows no ring to read"; at 55% the shelf counts
  read 2.1–2.75 and fail either way.
- **The ring is counted per line** (`ringRead`'s `bare`): a pixel outside
  the target's ring box is dropped, so a line whose whole ring fell outside
  it was carried by its neighbours' ring. A line whose glyphs show and
  whose solid ring holds no pixel fails, "shows N glyph pixel(s) and no
  ring around them". **Proved red**: the ring box cut to 22px tall in the
  probe — every line under the first loses its ring — 83 lines on 11
  kinds in the same planted run (the Wearing line, `p.fine.pay-lede`,
  `p.mid-p`, the Activity fields, the checklist, `span.sw-cap`, …). Not observed, by mechanism: the round-8 runner fails
  only a target with no ring pixel at all, and each of those kept its
  first line's.

Not closed here, stated: `paintsOpaqueGround` still asks whether the rain
shows through a ground, not whether the outline shows on it at rest, and
does not see a `url()` ground, a pseudo-element's or a non-ancestor's (the
critic's item 7, its last clause, which the pictures in
`visible-batch-shots/13-outline-options/` answer for the owner). The first
half and the `url()` ground are closed in round 10, below; a
pseudo-element's and a non-ancestor's ground are still not seen.

**What the pictures show** (round 8, `visible-batch-shots/11-glyph-outline/`,
Neo worn at one frozen instant, `main` beside this round at 390 and 1280,
the walls at 1280 and 1920; `measure.txt` has the numbers). The outline is
not invisible off the drops: over the aurora's washes, the notice's wash,
the Activity pill's, the invite's and the call to action's tints it is a
dark stroke, and it covers the inner part of Neo's heading glow — every
screen had outline pixels away from any drop changed by more than 16
levels, up to about 2,300 a screen. The mock the outline was chosen from
(`review/E-outline-activity.jpg`) was the window's, not the owner's, and it
showed the rain alone, on `--s-bg`; the look with the aurora worn is the
owner's to see. The owner chose option (b) (round 10, below).

## Round 10: the outline in the ground's own colour, and an outline that shows at rest (2026-09-25)

**The owner's choice.** Option (b), from the pictures in
`visible-batch-shots/13-outline-options/`. Wherever a line stands on a
tinted surface, its outline takes that surface's colour. On the plain
ground it stays `var(--s-bg)`. The two sets are written in
`--rain-outline-ground`. A custom property is resolved where it is
declared, so the sets are declared again on each surface, in one rule with
the rain's root (`stall.css`). Each surface declares its own colour: its
own paint over the ground, in the look's tokens.

| Surface | Colour |
|---|---|
| The call to action | the accent at 16% |
| The Activity pill | the muted at 12% |
| The notice invite | the second accent at 4% |
| The Studio's "This browser" box | the accent at 4% |
| The notice's wash | the midpoint of its two stops, each over the ground |

The Studio's box was not on the owner's list. The rule below found it
(its note's outline read 9 levels off the box), and the owner's rule
covers every tinted surface a line stands on. The notice's violet stop
(`#8b7bff`) is a literal of Neo's own sheet that no token carries. It is
the one literal in an outline colour.

**`outlineOf` reads an outline in any one opaque colour.** Its opaque,
unblurred shadows must be one colour and exactly one of the two sets. If
they are some other set, or more than one colour, it answers -1, which
fails as "neither outline set in one colour". A blurred or translucent
shadow is the look's own and is left alone (Neo's heading glow). The ring
read never depended on the colour.

**`an-outline-that-shows-at-rest`** (probe, the geometry passes). An
outlined line's outline colour must be the ground painted under it,
within `AT_REST_LEVELS` (4) on every channel. `groundUnder` builds that
ground in paint order: the stall root's own colour, then every background
colour and full-size gradient between the line and the root (the line's
own box included), composited over it.

- A gradient under the line (the notice's wash) is no single colour. The
  outline is held to the colours the gradient paints **under the line
  itself**: a linear gradient is evaluated across the line's own box (the
  gradient line's share at each corner, the stops between and sixteen
  steps, interpolated in premultiplied sRGB as CSS does), each colour
  composited over what lies under it, 4 levels either side. The midpoint
  passes, and the look's ground fails. (Until step 5b it was held to
  anywhere between the gradient's stops — below.) A gradient this cannot
  evaluate across a box (radial, conic, repeating) is held to its stops
  and counted.
- A `url()` layer of any size under the line is a ground this rule cannot
  read, so it fails.
- The stall root's image layers are read by what they are, never passed by
  where they sit (below). These are the stated exceptions, each matched on
  its own computed form and on what paints it — a decoration's class worn
  on the stall, or the look's own backdrop as its row states it, never a
  look's `t-*` class (`ROOT_LAYERS_SET_ASIDE`; the aurora's washes and tint
  by their exact shape — the stops and their places — and colours that are
  the stall's own two accents at no more than the alpha the sheet paints,
  never by the form alone, the critic's item 7), with the levels they leave
  at rest in the table below:
  - the rain (`att-rainfall`), which is what the outline is for;
  - the look's own backdrop (`LOOK_BACKDROP`: a layer the row's `backdrop`,
    handed to the stall as `--s-backdrop`, computes to — Neo's: the cyan
    glow over the stall's top 480 px, and a 1 px scanline every 4 px; keyed
    to `t-neo` until 2026-10-06, "Every starter is measured as its shipped
    look" below) and the aurora's washes and its tint over the rain
    (`att-aurora`), which are gradients across the whole stall that no
    single colour matches;
  - Neo's heading glow, which is a shadow under the heading's own outline,
    not a ground.
  Any other root layer is read like a layer under the line: a colour or a
  full-size gradient composited in, anything else a failure.
- Set aside and counted by reason (`atRestSetAside`, on the pass's
  `compared:` line): a gradient sized smaller than its box (the vacant
  box's corner brackets, the sign's rules). Not read, stated: a
  pseudo-element's ground, or a non-ancestor's; an ancestor's `opacity` or
  blend.

**Bounded, step 5b** (CRITIC-FINAL-MERGE item 3, the rule's exceptions were
unbounded): every root image layer was passed by its position, so a new
root decoration's layer was exempt the day it shipped; a gradient accepted
any outline between its stops, so a wash from black to white accepted
anything; a `url()` layer smaller than its box was passed silently; and
nothing counted what was set aside. Now the root's layers are named
(`a-new-root-layer-is-not-exempt-by-position`), the gradient is read under
the line, every picture fails, and what is set aside is counted — on the
day it landed, on the phone: the rain 1,653, the aurora's washes 972, its
tint 486, Neo's scanlines and top glow 551 each (one per outlined line and
layer), a gradient smaller than its box 169; the phone and desk passes owe
the rain set aside wherever Neo is measured (`probe-coverage.mjs`). **Proved
red**, and green on `main` with the same plants: a `url()` layer added to
the rain-wearing Neo root → 201 lines "over a root layer this rule does not
know … a-new-root-layer-is-not-exempt-by-position" (0 on `main`); the
notice's outline set to its violet end over the ground, `rgb(18, 18, 37)`,
inside the stops' range and not under the words → the four notice lines
under every decoration fail "over a ground painted rgb(31, 17, 32) to
rgb(40, 18, 34)" (0 on `main`).

**Asked only where the rain is worn** (step 5b, CRITIC-FINAL-MERGE item 4;
since step 5a″ also where Grid horizon is worn, on the sign alone —
`OUTLINE_SURFACES`).
`an-outline-where-the-text-has-its-own-ground` and this rule read an
element only inside a `.stall.att-rainfall`, where the outline is scoped in
`stall.css`. Before, the probe read every opaque, unblurred `text-shadow`
on every look as a would-be outline, so a look's own emboss failed as
"neither outline set in one colour" — proved: `.t-rural .section-title {
text-shadow: 0 1px 0 #fff }` read 206 such failures on `main` and none
now. A look's own hard shadow is the look rules' business, and a
decoration's is `an-outline-is-the-only-mark-under-text-on-a-decoration`'s
(static, every served sheet).

**Measured at rest** (`visible-batch-shots/15-outline-b/`, `levels.json`).
Each figure is the largest level by which the outline changes a pixel with
no drop behind the line, against the same frame with the outline off.
"Before" is every outline in `var(--s-bg)`, as at `0d2a32e`.

| Surface | Rain alone: before | Rain alone: (b) | Every decoration: before | Every decoration: (b) |
|---|---|---|---|---|
| The call to action | 47 | 11 | 68 | 55 |
| The Activity pill | 34 | 13 | 54 | 31 |
| The notice invite | 29 | 25 | 48 | 38 |
| The Studio's box | 23 | 13 | 37 | 35 |
| The notice's wash, phone | 43–45 | 23–24 | 50–56 | 29–30 |
| The notice's wash, desk | 42 | 17 | 58 | 31 |
| The plain ground | 12–36 | same | 37–69 | same |
| The headings, beside their glow | 36–38 | same | 47–48 | same |

With the rain alone, what is left on a tint is mostly the backdrop: the
scanlines, and the glow near the top of the page, where the invite sits.
With the aurora worn, a dark ring still shows on every surface.

**Ring minima at the worst, (b)** (this round's run). The call to action
10.64, the pill 5.48, the invite's words 5.64 and its ghost chip 9.08, the
notice 11.65, and the Studio box's note 5.67 (6.09 in its ground's colour
before). Every other kind is as in round 9.

**The pictures of round 9 had a bug, and the probe never did.** The
scratch script behind `13-outline-options/` read the root's size and
position lists after it had changed the root's image list. A computed
style is live, so the shorter list cycled the rain tiles' sizes onto Neo's
backdrop, and its 480 px glow repeated down the page. That lifted and
banded the ground in every "at rest" and "worst" frame there. The frames
with drops crossing were correct. `flattenRain` reads every list first.
The pictures in `15-outline-b/` come from the fixed script, and the owner
re-confirmed (b) after them (2026-09-25, "Giữ (b)").

**The static side** (`decor-gate.test.ts`, the outline tests):

- An outline's shadows name their colour as `var(--s-bg)` or
  `var(--rain-outline-ground)`, one of them, never a colour written into
  the shadow.
- `--rain-outline-ground` is declared on the rain's root as `var(--s-bg)`,
  and on each surface `OUTLINE_GROUNDS` lists as the colour listed for it.
  Each rule has one selector, and none is in a keyframe.
- Each listed colour is a `color-mix` of the look's `--s-*` tokens. The one
  exception is a literal that the surface's own paint carries and no token
  does.
- Each listed colour equals, on every look that wears the rain, the paint
  of the rule it names: one fill, or a two-stop wash read at its midpoint,
  over that look's ground, within one level
  (`outlineGroundMismatches`).
- The sets are declared once, in one rule: the root and the listed
  surfaces.

**Proved red.** One planted probe run, reverted:

- the call to action back in the ground's colour: 2 at-rest failures
  (`a.cta`, `rgb(5, 6, 13)` over `rgb(11, 42, 47)`);
- the notice back in the ground's colour: 6 (over `rgb(18, 17, 30)` to
  `rgb(45, 18, 37)`);
- a whole outline in `#303030` on the shelf counts: 24 (over
  `rgb(5, 6, 13)`);
- a picture laid under the invite: 4 ("over a picture … this rule cannot
  read");
- a white hard shadow beside the footer's outline: 228 "neither outline set
  in one colour".

Every one of these showed at 390 and at 1280, and each was named. The
static test was proved red on the real sheets, each plant reverted:

- the call to action's colour at 20% in `stall.css`: red on
  "declares every outline colour";
- Neo's call to action painted at 20%: red on "holds each listed colour to
  the paint";
- the notice's violet moved in `stall.css`: red on "declares";
- the Studio box taken off the sets' rule: red on "states the two sets
  once".

The test's own plants cover these as well:

- a literal;
- one surface's colour on another;
- an unlisted surface;
- the plain ground in a literal;
- the parameter off the rain, on two selectors, or in a keyframe;
- a listed colour that is no `color-mix`, that reads a variable no look
  owns, or that carries a literal the paint lacks or a token carries;
- a surface colour written into the shadow;
- a set in two colours.

## Every look's face is shipped (2026-09-26)

The probe had only ever measured Rural and Neo in whatever the machine running
it carried: `FONT_STACKS` named Iowan Old Style and SF Mono first, which a Mac
has and the Linux box did not. Moved to a Mac, the run went red on 448 checks
that main passed on Linux — the same 448 on main. Stall Serif (Lora, renamed) and JetBrains Mono are
self-hosted now, so the pass measures one font on every OS.

What the faces found, and what each fix is:

- **Rural's wall figure left its tag's clip** (`text escapes its clip`, 2–11px
  at 1280, 1920 and the portrait wall). The content area is taller than the
  1.05 line by more than the 8px padding. The polygon reaches 20px past the
  box above and below (the overhang is ~10px at 124px). `parsePolygon` now reads a signed `%` or `px` vertex;
  before, the extended polygon read as `a clip-path this check cannot read`
  and failed every wall screen on Rural. Three taller tags were measured and
  refused: `line-height: normal` (card +27px, the code 7px past the 1080
  edge), 1.2 in 8px (+17px, the card's shadow under "Showing listings" at
  2.99:1), and no padding (a corner of the figure left the clip as the tag
  sways: `asked amount is covered`).
- **The tablet wall's tag spilled its card** (`text-spills`, 12px at
  768x1024): figure 10cqw and words 20px in the short-portrait block.
- **Neo's worn wall status line read 2.61:1 in the ring**: the text ink.
- **Rural's studio doors**: the oval's curve crossed the lede (2.96:1); the
  radius is capped at 22px.

## A look is measured with its sheet (step 6, 2026-09-27)

Every look sheet names itself on its bare class — `.t-neo { --look-sheet:
t-neo; }`, once (`every-look-sheet-names-itself`, the look lint, which also
reads the kit's sheet and the harness's worn-only fixture). The probe reads
that name on every painted `.stall` wearing a `t-*` class after every paint
(`lookSheetFaults`, `layout/wornSheet.ts`) and fails a stall whose sheet did
not name it: **`a-look-is-measured-with-its-sheet`**. The skeleton is the one
look painted without a sheet on purpose (`SHEETLESS_CLASSES`). A name set
inline on the stall fails too, skeleton included — the renderer writes the
theme's vars inline, and a `--look-sheet` among them would read true without
the sheet — and no sheet but a look's may declare the property at all
(`foreignNamingProblems`, the lint's half; the step-6 critic's P3). The classes
read are echoed (`lookSheetsRead`), and the runner refuses a pass that read
no name for a look it measures (`probe-coverage.mjs`, every pass).

Why now: from Ink wash on (step 8) a look's sheet is its own file, fetched
only for a stall that wears it, and a sheet that did not load leaves the
stall painted by the base sheets alone — which every other rule here would
measure green. So the probe page loads every worn-only sheet of
`measuredLooks()` before its first paint, through the app's own loader
(`wornSheetsOf`, `loadLookSheet` in `src/ui/lookSheets.ts`, since 8d1) —
none on the ordinary probe, the kit's on the workshop probe, which loads the
worn-only way since 8d1 — and a worn-only row reaching a measured page with
no sheet URL fails the page rather than being measured bare. `pnpm looks:diff` holds the same line on every shot
(`looks-diff-refuses-a-look-painted-without-its-sheet`; the showroom's
`window.__lookSheets()`, a ref predating the hook exempt). The name paints
nothing: `pnpm looks:diff main` compared every shot of the three looks with
the naming rule against main without it — 850 identical, 0 real, 0 noise,
0 inconclusive (2026-09-27; main predates the hook, so its side was
exempt and the working tree's side read every look's name on every shot).

Proved red by deleting Rural's naming rule: every Rural paint on every
pass failed, and the pass's coverage line refused `t-rural`.

## The probe page meets no policy refusal (step 6, 2026-09-27)

The probe is previewed under the production policy, so a stylesheet, a
picture or a face the policy refuses paints nothing there — as it would for
a visitor — and a layout measured without it certified a page nobody sees.
`layout/cspWatch.ts`, the probe's first import, records every
`securitypolicyviolation` from the page's first module statement; the verdict
carries them and fails **`the-probe-page-meets-no-csp-refusal`**, and the
runner asks `window.__cspRefusals()` again after every verdict it reads —
the phone, desk and canvas passes, the portrait and tablet walls and the
reduced-motion passes (`readVerdict`; a picture's refusal lands as a task,
after the verdict was written) — on every contrast page before it leaves
it, and at the end of the transparency pass (their jobs paint after the
verdict). The workshop's probe page exempts one refusal by
design: the icon host under `img-src`, which the kit's preview policy
drops (`vite.workshop.config.ts`) — its first run met 90 of them on the
contrast pages. Not heard, stated: a refusal before any module ran (the
entry's own tags, which the page could not load at all). Proved red by a planted
`setAttribute('style', …)`, which `style-src 'self'` refuses.

## The worn-only road under the production policy (step 6, 2026-09-27)

**`a-worn-only-sheet-loads-under-the-production-policy`** is one job of the
ordinary run (`window.__wornSheetJob`, judged by `wornSheetJobFaults`): the
harness's fixture look (`FIXTURE_LOOK` in `looks.ts`, `t-fixture-worn`,
`0xfd`, never a row, never served) is painted on the neutral screen, then its
sheet — `layout/fixture-look.css` built by `?url` as its own asset
(`fixtureLook.ts`) — put on the page by the app's own loader,
`src/ui/lookSheets.ts`'s `loadLookSheet` (since 8d1; the harness carried a
copy, `loadWornSheet`, until then). Held: the look named no sheet before
(the sheet is not in the entry CSS), the link loaded, landed last among the
page's sheets and was same-origin, the look then named itself, its own art
was fetched with a 200 (`img-src 'self'`), the loader holds the sheet as
`ready`, answers a second ask with the same link and put one link on the
page for it, a sheet URL that does not exist rejected, is held `failed`,
rejected again when asked again and was linked once (a failure is sticky,
never a second fetch), and the policy refused nothing. Proved red, the judge
(`probe-coverage.test.mjs`): each new field changed alone.

**`load` is not "loaded"** — found by this job's first run, which failed on
"a sheet URL that does not exist did not reject": `vite preview` answers a
missing file with its SPA fallback (`htmlFallbackMiddleware`: a stylesheet
request accepts `*/*`, so it is rewritten to `/index.html`, 200, HTML), and
Chrome fired `load`, not `error`, on the link (whether it then applied
anything was not read; the sheet did not name the look). So
the harness's `loadWornSheet` resolves only when the loaded sheet's own
CSSOM holds `.<class> { --look-sheet: <class>; }` (`sheetNamesItself`), and
the job prints the status the missing URL was answered with. The production
loader keeps that rule (it is the same code since 8d1): a Pages 404 fires
`error`, but a proxy or a stale deploy that answers with HTML would not. Not
held here, stated: Pages itself, OBS's browser, Safari and Firefox; and the
renderer's ask for a private look's sheet (`applyTheme` → `lookSheetOf` →
the loader), which needs a build carrying a private look — the harness
refuses a selection until 8e2 — and is held in happy-dom
(`a-try-on-asks-for-its-sheet-and-a-locked-look-for-none`), measured in
Chrome by hand once (8d1, a scratch page over a preview build of the
fixture under the production policy: the locked record asked nothing; the
try-on painted the class at once, named nothing until its sheet landed,
then `ready`, named itself, landed last, one link across repaints, its art
200, no refusal).

## No word is clipped by a file (step 6, 2026-09-27)

A mask image that has not loaded or failed is transparent black by the
spec, and a mask of transparent black hides what is under it. So no element
holding words of its own — nor, since the step-6 critic's P2, any protected
box, money node, field (`.paste-in`, `.share-url`, `.share-embed`), form
control or control, icon-only ones included (`FILE_CLIP_SUBJECTS`): a code,
a readonly link and a close button carry no text node — nor any ancestor of
it up to `#app`, may compute a
`mask-image`, `-webkit-mask-image`, mask border source or `clip-path` naming
a FILE (`url(#id)` in this document passes; a gradient passes; a `data:`
URL counts as a file, since the policy's `img-src` refuses it):
**`no-word-is-clipped-by-a-file`**, after every paint, every look and
variant, counted (`fileClipChecks`) and owed on the phone and desk passes.
Its cost is Ink wash's: its masked grounds move to a sibling layer with no
text in it, and the colophon mask over the seller's name is refused (the
owner sees that at the port). Proved red by a planted
`mask-image: url(./decor/rain-near.svg)` on Neo's row name, and — for the
subjects with no words — on `.pay-qr` and on `.share-url`. The probe reads
paints at rest and frozen, so a file's mask or clip written in a state rule
(a user-action pseudo-class, or any attribute selector but `data-role`) or
in a keyframe is refused statically by the look lint instead
(`a-file-mask-arrives-at-rest`); a `url()` carried in by `var()` is not
seen there, stated.

## Every face is loaded before the probe measures (2026-10-06)

**`every-face-is-loaded-before-the-probe-measures`.** Before the geometry
loop, the page asks every face in `document.fonts` that is not loaded to
load — every `@font-face` of every sheet on the page, each subset included,
after the worn-only sheets so their faces are declared too — and waits for
each to settle and for `document.fonts.ready`, bounded at 10 s
(`loadEveryFace`, `layout/faces.ts`). Then it echoes each face's status at
that moment (`faces`, and `window.__faces`). The runner
(`scripts/probe-faces.mjs`) refuses a page whose echo is missing, whose
wait ran out, any of whose faces is not `loaded`, or that lacks a face
`src/ui/stall.css` declares — the list is read from that sheet's
`@font-face` rules (eight today: Inter, Stall Serif and its italic,
JetBrains Mono, each Latin and Vietnamese), never written in the runner,
and a list read as empty stops the run before it builds. It is held on
every pass that reads a verdict (mobile, desktop, canvas, portrait,
tablet, both reduced-motion passes) and on every contrast and transparency
page before its first job, and each pass prints what it waited for:
`faces: 8 of 8 loaded before measuring (Inter 2, Stall Serif 4, JetBrains
Mono 2); 8 asked, 13 ms`. **No warm-up paint**: a paint before the loop
would hand the marquee's runs and the renderer's scroll and focus memory to
the first measured screen, which is not the faces, and loading every
declared face already asks for every face a paint would. A subset no
fixture uses is loaded too: its `unicode-range` keeps it off every line
outside its range, so it moves no layout. The echo is read once, when
measuring begins: the loop and the verdict are one task, in which no sheet
becomes active and no loaded face unloads (a second read at the verdict
shipped in 52d7704 and was removed after its critic — it could not fire).

**What it proves: each declared face was loaded. Not that any line was
drawn in one** (the critic's P2-1, 2026-10-06). Every face is asked to load
whether or not a line uses it, so `loaded` is true by construction; on
`main`, a `loaded` face had at least been asked for by layout. The critic
measured two misses on this branch's own build with CDP
`CSS.getPlatformFontsForNode` (`item-listing` at 390, the three looks bare;
the critic's reading, not re-run here): the rate's `≈` drawn from a system
face on every look (`.SF NS`, `Menlo`, `Iowan Old Style`) with all eight
faces `loaded`; and the stall's `--s-font` misspelt `"Intr"` drew every
`price`, `rate` and `fiat` node in `.SF NS` while the pass printed `faces:
8 of 8 loaded`. `document.fonts.check()` is no help (it answered `true` for
both). Those are held statically now, beside this rule:

- **`every-font-family-opens-with-a-served-face`**
  (`scripts/served-faces.test.mjs`): every `FONT_STACKS` entry, every
  `--s-font…` value the theme table emits for every shipped look, and every
  `font-family`, `font` and `--s-font…` declaration of every sheet the app
  paints (base, looks, screens, the kit, the fixture look, every private
  look a run reads) open with a family a served `@font-face` declares,
  `inherit` or `var(--s-font…)` — a worn-only sheet's own face included.
  `SERVED_FAMILIES` (`scripts/workshop-css.mjs`) is held to `stall.css`'s
  families, and no other public sheet declares a face. The documents
  (`/stream`, `/guide`, `/404`) load no app face by design and are not read.
- **`a-look-names-only-a-served-face`** (the look lint, the critic's
  P2-2): the same rule in the walk every look sheet goes through —
  `lintLookSheet` for the shipped looks and a private look's sheet,
  `lintSheet` for the kit (`workshop:lint`).
- **`every-glyph-the-app-prints-is-in-its-face`**: every code point in the
  app's own string and template literals (`src/`, read with the TypeScript
  parser, cooked so `≈` counts; tests, declarations and the withheld
  list's generated data aside), every `content` string of the base, look,
  screen and kit sheets, `GENERATED_TEXT`, and printable ASCII — glyphless
  characters (controls, format characters such as the picker's isolates)
  left out — held to the WOFF2 `cmap` (`woff2CodePoints`,
  `scripts/look-faces.mjs`) of the face whose `unicode-range` covers it, on
  each of Inter, Stall Serif, Stall Serif italic and JetBrains Mono. The
  owner decided the faces draw them (PLAN § Decided, 2026-10-06), and
  `scripts/subset-faces.py` cut the four Latin subsets again from their
  upstream fonts with every one each font draws: `≈` (the unit rate and the
  pay sheets' rate row, `[data-role="rate"]`, a money node) and `₽` (RUB,
  written after the figure, `100 ₽`) are drawn by all four now. What is
  pinned is what an upstream font lacks, each with where it prints and the
  faces that lack it: `→`
  (`DESC_SUB`, the first-stall checklist's "Share your link" step,
  `OBS_RECIPE_SOURCE`) and `◆` (the ticker's separator, `GENERATED_TEXT`)
  in Stall Serif; `₹ ₪ ₩ ₦ ₱` (a quote's `seller-price`, a money node, in
  INR, ILS, KRW, NGN, PHP) in Stall Serif and JetBrains Mono; `₺` (TRY) in
  JetBrains Mono; `元` (CNY) in all four. Wherever such a face is the face,
  the glyph is drawn by a font of the reader's machine, so differently per
  OS, and the probe measures this Mac's. A second
  pinned list holds the code points a face's `unicode-range` names on its
  own that its file lacks — Fontsource's family ranges are wider than the
  subsets: `₫` in Stall Serif's two Vietnamese files, `↑ ↓` in its two
  Latin ones, U+2215 in Inter's Latin, U+0329 in all eight, U+FFFD in the
  four Latin files of Inter, Stall Serif and JetBrains Mono — none printed
  by the app today (VND prints `đ`), which the test holds too. That list
  reads only a code point a range names on its own, and `rangePairs`
  merges neighbours into a span, so the glyphs `subset-faces.py` cuts in
  are held one by one on every face (`names in a face's range only the
  re-subset glyphs its own file holds`; red on U+20B9 planted beside
  Stall Serif's U+20BA, which the list read as one span and passed).
- **`a-face-range-never-takes-one-letter-of-another-script`**: every letter
  (`\p{L}`) a served face's `unicode-range` names has a `Script_Extensions`
  that holds its subset's own script (`SUBSET_SCRIPTS`: Latin for the Latin
  and Vietnamese subsets; a subset it does not name is an error) or is Common
  or Inherited (`µ` U+00B5, `ʻ ˆ`; `ʼ` U+02BC holds Latin). `Script` alone
  would pass `ー` (U+30FC), `ｰ` (U+FF70) and `ـ` (U+0640), Common by script
  and owned by one script in use (the re-review's P3-7). A face with no range,
  which `rangePairs` reads as every code point, is refused by name and not
  walked (`MAX_RANGE_CODE_POINTS`; P3-8: walking it listed 138,568 letters
  and the runner was killed at 1.45 GB with no face named; now 1.4 s and a
  message). The re-subset's first cut put `р` (U+0440,
  for RUB's old `р.`) in all four Latin ranges, so a seller's Cyrillic
  word drew that one letter in the shipped face and the rest in the
  machine's (measured by its critic with `CSS.getPlatformFontsForNode`).
  RUB prints `₽` now. Red on that commit's `stall.css` (the four Latin
  files named), on U+0440 planted back into JetBrains Mono's Latin range, on
  U+30FC planted into Inter's (and, with the check read by `Script`, the
  plant case misses U+30FC, U+FF70 and U+0640), and on JetBrains Mono's Latin
  range removed.

**The incident (8d1's critic, measured with an instrumented probe, never
committed).** The geometry passes are one synchronous task — the module
body paints and measures every screen with no `await` — so a face not
loaded when the body started stayed `loading` for the whole pass. On
`main`, the mobile pass, the first navigation of a run, measured all 455
of its paints with Inter and JetBrains Mono `loading`; the desktop pass, a
later navigation in the same tab, measured all 526 with them `loaded` —
**the phone's geometry, the money pass at 390, was measured in the fallback
faces**, decided by Chrome's cache and not by any rule. The critic read
the workshop probe on 8d1 as measuring every pass in the fallback faces
(the kit's sheet loads worn-only, so the body yields once before its first
paint), reading `document.fonts` per screen and variant on the Rural
starter. Re-read here on the skeleton, which never paints Stall Serif, and
only at each verdict — a weaker instrument on a different look, since a
status can turn `loaded` inside the measuring task, so `loaded` at the
verdict does not show the early paints used the face: with the wait
removed and nothing asked, the three faces the skeleton uses were
`loading` at the 390 pass's verdict and `loaded` at every later one. The
question is moot with the wait in. The Rural starter's names lay out 1–2
px apart between the two faces (`Roasted Beans` 131 / 133 px at 1280),
which moved the marquee's travel (7267 / 7167 ms on `long-item-name`) and
the hit-test points that land behind a clip. The contrast passes were never
exposed: their prepare awaits `document.fonts.ready` and re-reads its boxes
after.

**What loading the faces first moved, 2026-10-06** (this Mac, the same
tree with and without the wait): the mobile pass's hit-test points went
from 926 of 11034 behind a clip to 912 of 10922, and every verdict held —
`pnpm test:layout` green, no stylesheet or threshold touched. The desktop,
canvas, portrait and tablet counts are unchanged (1723/13780, 119/3214, and
the same `compared:` lines): those passes already had the faces from the
cache. The contrast dump is **bitwise identical**, 9737 of 9737 boxes
(`node scripts/contrast-dump.mjs`, main's against this tree's). The
workshop probe on the skeleton is green with the wait. The wait costs 0–13
ms a page (the first navigation fetches the eight files; every later one
reads Chrome's cache).

**Red proofs**, each against the real run (the first three read the
statuses at the start, and at each verdict with the second read since
removed):

- **The wait removed, the loads asked** (`void loadEveryFace(...)`, the
  echo read at once): **red on the 390 pass alone** — all eight faces
  `loading` at the start and still `loading` at the verdict, and the pass's
  points 926/11034, main's to the point — and green on every later pass,
  because a face asked for from Chrome's memory cache is `loaded` within the
  same task. That is the shape `main` had. The workshop probe under the same
  plant: the same, red on its 390 pass alone.
- **The wait removed, nothing asked** (the echo read at once): red on every
  pass, eight faces `unloaded` at the start; at the verdict the 390 pass
  still had seven `loading`, the later passes only the italic Vietnamese
  subset no fixture uses `unloaded`. The contrast and transparency passes
  were refused at their first page. On the workshop probe the same plant
  is red everywhere too, and at the verdict it is the 390 pass alone with
  faces `loading` (above).
- **A face that never loads** (a planted `@font-face` in `stall.css` whose
  file does not exist): `error` on every pass, the eight real faces
  `loaded` beside it, the contrast and transparency pages refused; the wait
  ended at once (an error settles).
- **No face declared** (`stall.css`'s eight `@font-face` renamed away):
  the runner stops before it builds, "declares no @font-face".
- **The static rules**: `FONT_STACKS` renaming Stall Serif to `"Stal
  Serif"` — two red (the stacks, and Rural's `--s-font`); `stall.css`
  renaming its face to `'Lora'` — the served list no longer matches, and
  the glyph test cannot read its face sets; a `★` added to `DESC_SUB` —
  "printed in no served face"; the rate's `≈` taken out of both its lines
  — "no longer printed from src/ui/copy.ts"; Inter's Vietnamese file
  copied over its Latin one — 93 of the 95 printable ASCII characters undrawn in Inter; the lint rule
  switched off — the critic's two plants (`Georgia, "Comic Sans MS"` and
  `"Stal Serif"`, in the Neo sheet and its starter) and the rest go green
  where they must be red.
- The pure halves: `scripts/probe-faces.test.mjs` (a face not loaded, a
  missing echo, a page that declares nothing, a wait that ran out, a face
  stall.css declares missing from the page; the sheet's range spelling and
  the browser's read as one) and `layout/faces.test.ts` (only faces not
  loaded are asked, `ready` is awaited, a failed load is `error`, the
  bound).

**Stated limits.** The echo is each face's status, not which face a given
line was drawn in; the static rules cover the app's own words and names,
not a seller's (their names, words and descriptions can hold any character)
nor what an `Intl` formatter writes at runtime. **The fallback state is
measured by nothing**: what a visitor sees during the `font-display: swap`
period on a slow line, or for good when a face is blocked, is the
machine's fallback stack — on `main` the 390 pass measured this Mac's by
accident, and every verdict held — and no pass paints it now. A
blocked-faces pass (CDP `Network.setBlockedURLs` on `*.woff2` at 390) would
measure only this machine's fallback, at the cost of one more pass; whether
to build it is the owner's call. An optional end-to-end glyph check — CDP
`CSS.getPlatformFontsForNode` on the money nodes refusing any run that is
not a custom font, or in the page the two-fallback width trick (a string
measured in `<first family>, serif` and in `<first family>, monospace` is
the same width exactly when the first family draws every glyph) — is not
built. The runner's list is `stall.css`'s: a worn-only look's own faces are
owed `loaded` by the page's echo but are not named by the runner. The
worn-only sheet job's page measures no text and its echo is not read.
`scripts/print-measure.mjs` loads the same page and so inherits the wait,
but holds no echo of its own (its own `document.fonts.ready` after the
prepare covers it; only an `error` face would go unsaid there).

## Every starter is measured as its shipped look (2026-10-06, the 8d1 critic's item 1)

`pnpm workshop:start <look>` writes a shipped look's row and rows into the
kit under `0xff` and its sheet under `.t-workshop`, and `workshop/README.md`
tells a creator to start there. **The Neo starter failed the kit's own
probe**, on `main` (`6d869ca`) as on the 8d1 branch: `pnpm workshop:start
neo` then `pnpm workshop:probe`, exit 1 — 108 failures at 390, 85 at 1280,
19 under reduced motion, all 212 `an-outline-that-shows-at-rest` (123 on
the ornament strip, the rest on section titles, the notice, the collection
headings and a dozen smaller kinds), and the contrast pass's "an outline
nobody reads" on `a.guide-link`, `button.pay-pointer`, `i`, `span`,
`span.ghost-chip` and `span.invite-text` (91.3s). The shipped Neo, the same
row and the same sheet, was green.

**The cause was keying, not the starter.** Every rule here that a
decoration earns was keyed to a shipped look's name rather than to what the
page wore:
- the at-rest rule's two backdrop exceptions (`ROOT_LAYERS_SET_ASIDE`, the
  scanlines and the top glow) asked for `t-neo` on the root, so on
  `t-workshop` Neo's own backdrop was read as a ground under every line and
  the outline in `var(--s-bg)` showed against it (the 212);
- the contrast plan's decoration jobs were keyed to Neo's id — the rain's
  six ground screens (`RAIN_JOBS`), the horizon worn alone (`SOLO_JOBS`),
  the aurora's tide (`TIDE_SCREENS`) — and the stilled price tag
  (`REDUCED_JOBS`) to Rural's, so the starter's outlined lines on the rain's
  own screens were never ring-read ("an outline nobody reads"), and the
  Rural starter's tag label was read by nothing;
- the runner's `RAIN_REQUIRED` and `HORIZON_REQUIRED` were lists keyed to
  `/2/` and asked of the shipped run alone, and `probe-coverage.mjs` owed the
  outline, at-rest and bunting coverage only where `t-neo` or `t-rural` was
  measured — so a kit run that wore the rain owed none of it.

The reproduction showed the starter itself right: once keyed by what is
worn, it is green with no stylesheet, starter or threshold changed.

**Now keyed on what the page wears.**
- `ROOT_LAYERS_SET_ASIDE` and `SURFACE_ART_SET_ASIDE` live in
  `layout/atRest.ts`, a pure module (`colourOf` moved there with them):
  `rootLayerSetAside(layer, facts)` and `surfaceArtSetAside` decide from what
  the probe read off the root (`RootFacts`: every class it wears, the
  backdrop's layers as computed, its two accent tokens) and nothing else.
  Every entry is a decoration class worn on the stall or `LOOK_BACKDROP` — a
  layer the row's own `backdrop` computes to — and its form as before. The
  backdrop's layers are computed from the stall's `--s-backdrop`, whose
  computed value has every `var()` substituted, on a `display: none` node
  outside `#app` (cached by that value; the follow-up commit moved it out of
  the measured tree, the critic's item 7 — the at-rest counts below did not
  move). For the shipped Neo it is the same rule or stricter: the layer must
  now be the backdrop's own as well as have its shape.
- `contrastPlan.ts`: the rain's ground jobs, the solo horizon and the tide
  are planned on every measured look whose rows carry `att-rainfall`,
  `att-horizon` or `att-aurora` (`carries`); the stilled price on every look
  whose row sets `priceAnim` (`movesItsPrice`). `contrastOwed` names the
  jobs the runner holds to having the rain flattened (`RAIN_OWED`) and the
  horizon read at its worst (`HORIZON_OWED`), for every look that carries
  them; the page publishes it (`window.__contrastOwed()`) and the runner
  holds every run to it, plus the shipped run to owing both somewhere and to
  the owner's horizon jobs (`HORIZON_WORST`, the shipped Neo's numbers —
  pinned for the shipped run alone, printed for a kit). The ring-read and
  money-ring vacuity checks are owed wherever the rain is owed, the tide
  count on every run, and a sign line with no sample at the horizon's worst
  fails on every run.
- `probe-coverage.mjs`: the outline, at-rest and bunting owing follows the
  verdict's `wornClasses` (every decoration class the pass painted worn),
  beside the shipped classes the runner states. And the page's owed answer is
  held against what the geometry passes wore, on every run
  (`owed-follows-what-a-pass-wore`, `owedFaults`): an answer that is not a
  rain list and a horizon list fails, and so does a pass that wore
  `att-rainfall` or `att-horizon` while that list is empty (the critic's
  item 4: outside the shipped run the page alone said what it owed, and a
  malformed `{}` owed nothing).

**The shipped plan is unchanged**: `contrastPlan(measuredLooks())` and
`contrastScreens` at the three viewports, serialised on both trees, are
byte-identical to `main`'s, and the owed keys are the old literal lists,
now pinned by value in `the-contrast-plan-is-every-job-the-pass-owes`.

**Held by three tests in `pnpm test`.**
- `the-at-rest-exceptions-decide-the-same-for-a-starter-and-its-look`
  (`layout/atRest.test.ts`), by behaviour: the same facts decide the same
  under `t-neo`, `t-workshop`, the worn-only fixture's class, `t-rural`,
  `t-modern` and no look class, every entry of the table reached; with no
  backdrop on the row Neo's two shapes are a ground on `t-neo` as anywhere,
  the backdrop's own layers are set aside with nothing worn, a scanline the
  backdrop does not paint is read; the decorations' layers follow what is
  worn and the stall's own tokens, the horizon's art the sign alone.
- `every-starter-is-measured-as-its-shipped-look`
  (`layout/starterParity.test.ts`): each starter's contrast plan, screens
  and owed jobs are its base look's with the id and class taken out, the
  door aside; the three tables (`ROOT_LAYERS_SET_ASIDE`,
  `SURFACE_ART_SET_ASIDE`, and `OUTLINE_SURFACES` read from the probe's
  source) name a shipped decoration's class or `LOOK_BACKDROP`, never a
  `t-*` class; and the code of `probe.ts`, `contrastPlan.ts` and `atRest.ts`
  — comments taken out by the TypeScript printer, so a sentence about a
  class is not code and a string, template or selector still is — names no
  `\bt-(modern|neo|rural)\b`, no `*_THEME_ID`, no `lookById(` with a
  literal, no `.id` compared with a number either way round and no
  `SHIPPED_THEMES[`; the probe calls `lookById` once, on the job's own id
  (`lookById(themeId)` in `__contrastPrepare`), and the other two never.
- `owed-follows-what-a-pass-wore` and the worn-keyed owing, in
  `probe-coverage.test.mjs`.

**Proved red**, each plant restored: the rain's jobs keyed back to
`look.id === 2` (the plan case, the Neo starter's `quotes-failed` jobs
missing); the scanlines' `paints` back to `'t-neo'` (the table case and the
literal case); the stilled price keyed to `look.id === 3` (the plan case).
And the critic's three, planted in the probe's `groundUnder` where the
decision is called — `stall.matches(".t-neo")`,
``stall.classList.contains(`t-neo`)``, and `lookById(2).theme.sheetClass` —
each red in the code case (they were green against the first commit's
quoted-string check); two planted in the pure decision's `paintedBy` —
`facts.classes.includes('t-neo')` (red in the behaviour case and the code
case) and `facts.classes.some((c) => c.endsWith('neo'))`, which names no
class and is red in the behaviour case alone.

**Measured, 2026-10-06, this machine**, every run green:
- `workshop:probe`, each starter written by `workshop:start` and the kit put
  back after: Modern 31.2s (128 contrast jobs), Rural 39.1s (132 — the four
  stilled `unbuyable` jobs it now owes), Neo 129.1s and 142.4s (188 contrast
  jobs, the rain at its brightest on 75, the tide held on 46, 605 outlined
  lines ring-read; at rest the backdrop's scanlines and top glow set aside
  533 times at the phone and 578 at the desk, once per outlined line, as on
  the shipped Neo); the skeleton 20.7s. Those times were taken on a machine
  under load and are not an A/B.
- **The Neo starter is planned as Neo**: in the kit run's dump and a shipped
  run's, the 194 Neo jobs and the 194 kit jobs — 188 contrast and 6
  transparency jobs each, the dump counting both passes — are the same set
  with the id taken out. Their boxes differ where the kit paints
  differently — its rows carry no token, so the Wearing line has no links,
  and the name sheet's look picker — and the horizon's worst reads the
  owner's three numbers exactly (2.7589, 1.9153, 9.2974).
- `pnpm test:layout`, `main` against the first commit, back to back — the
  critic's run, one sample per side: both pass; the whole run 135.8s against
  139.3s, the contrast pass 111.2s against 112.5s, the page passes 4.2 /
  4.8s (390), 4.4 / 4.8s (1280), 2.3 / 2.5s (canvas), 3.5 / 3.8s (portrait),
  2.3 / 2.5s (tablet); every verdict line identical but the renamed
  backdrop labels, whose counts are the same (708 at 390, 753 at 1280); the
  contrast dump 9737 boxes identical, 0 moved, 0 added, 0 removed. One
  sample a side does not separate the 3.5s from noise. The builder's own
  A/B attempts ran while the laptop was at 1% battery and throttled — every
  pass four to five times slower on both trees, and three runs stopped by
  the 300s watchdog on `main` and the branch alike — and are not results.
- After the follow-up (the pure decision, the backdrop computed outside
  `#app`, the owed answer held to what was worn): `pnpm test:layout` passed
  in 142.0s, its contrast dump 9737 boxes identical to the first commit's
  (itself identical to `main`'s), the backdrop's set-aside counts unchanged
  (708 / 753); the Neo starter through `workshop:probe` passed in 89.1s, its
  counts unchanged (533 / 578).

**Not covered, stated.**
- Running the real probe per starter is half a minute to two and a half
  each and in neither command; the tests hold the keying and the decision,
  not the paint.
- What the shipped run owes by its own pinned numbers and names stays the
  shipped run's alone: Grid horizon's worst, `LINE_SKIP_CEILING`, the codes
  and the sign's names owed by name, a shipped row's sizes, the door minis,
  and the look-pseudo vacuity check.
- **The horizon's floor for a kit look** (the critic's item 3, the owner's
  call): a kit run prints the sign's lines at the horizon's worst and holds
  them to nothing, so a creator who keeps the horizon and darkens the name
  can read below the owner's accepted 2.76 / 1.92 / 9.30 and pass. Not a
  regression — `main` did not read the kit's horizon at its worst at all —
  and the ring read over the horizon as painted still fails. The proposal on
  the table: every run may read no job below `HORIZON_WORST[part].least`,
  the equality half staying the shipped run's.
- **A look with two moods owes the rain under its first alone** (item 5):
  `contrastOwed` and the rain's ground jobs key on `WORN_ALL`, and the
  second mood's all-worn variant (`wornAllFlags`) owes nothing about the
  rain. No shipped look or starter has two moods and the rain.
- **A price set moving by a sheet, not a row** (item 6): the stilled job
  follows the row's `priceAnim`, which a kit's `look.json` cannot set, while
  its sheet can animate `.item-p` on a Modern base — then "Not buyable"
  inside the transform is padded away and its ink is read by nothing, the
  2026-09-24 hole. True on `main` too; a lint rule or a probe report would
  close it.
- The rain's class is written in five places (`RAIN_CLASS`, the
  `ROOT_LAYERS_SET_ASIDE` entry, the flattener, the coverage owing and
  `OWED_BY_CLASS`). The table case fails an entry no shipped row carries,
  and `owed-follows-what-a-pass-wore` fails an owed list that misses a
  class the passes wore; a rename that reached every place but
  `OWED_BY_CLASS` is not seen, and owes no less for it.

## The probe measures the private looks a run carries (step 8e2, 2026-10-06)

Until 8e2 every harness command refused a private-look selection (8b2's
stop-gap: the probe had passed green over a look a shell export put in its
bundle, and said nothing). Now `pnpm test:layout` reads one
(`harnessSelection`, `scripts/looks-selection.mjs`) — and **with none it
measures the tracked fixture** (`layout/fixture-private-looks/`, selected
at `preview`; the 8e2 critic's item 2, STEP-8-PLAN v2: tests run on the
fixture always), so every private-look rule has a subject on every default
run, CI's on-demand layout job included; an explicit selection replaces
it, and the kit's probe carries none. The build carries what a build with
that selection carries — the commit read once and pinned into the build
(`scripts/harness-looks.mjs`) — and every pass measures the carried looks
beside the shipped three and the skeleton: the geometry passes, the
portrait wall and the counter tablet, both reduced-motion passes, the
contrast pass (bare, every all-worn variant per mood, D11) and the
transparency pass. Test: `the-default-probe-carries-the-tracked-fixture`.

**A paid look is painted through the try-on; the harness's licence only
asks the gate.** The app's gate paints a record naming a paid look as the
default and step 8 licenses no stall, so a probe that measured such a
look's record would measure the default under its name. `paintView`
(`layout/looks.ts`, the one place a harness page composes a look onto a
view) puts it on screen through `previewLook` — the road the app paints a
paid look on with no licence, since looking is free. `HARNESS_LICENCE`
(every paid look the page carries, derived) is handed to the app's own
gate for one question, what the look paints once licensed
(`harnessGateFaults`, every page); it paints nothing. The view's
`lookSheets` is where the look's sheet stands **as the app's loader holds
it** at paint time (`lookSheetState`), after the page loaded it through the
loader before its first paint: a sheet not ready is held back by the
renderer (8d2) and the class audit refuses the paint.

**The gate is held, in Chrome: `the-record-road-paints-a-locked-look-as-the-default`.**
On every pass that measures `offers`, each paid look is painted once the
way the app would paint a record naming it (`recordView`: the record's look
with every flag set, every token its rows can be entitled by held, its
sheet as the loader holds it, and the worn set **the app writes through the
gate**, `paintableLook(…).worn`, as `app.ts` does) — and must paint the
default's class, none of its own rows' classes, and `THEME_NOT_UNLOCKED`
on the sign. Painted with `renderStall` directly, so the default it paints
is not counted among the measured looks. `recordRoadChecks` is echoed and
the runner owes one per paid carried look on the phone and desk passes.
Until the 8e2 critic's item 3 the rows half read back a hand-made
`worn: []` and could not fail; it now does (below). And no app file hands
the gate a licence before step 9: `no-app-site-passes-a-licence-before-step-9`
(`src/domain/lookTable.test.ts`, parsed with the TypeScript compiler: no
call with a fourth argument or a spread, the gate never held as a value —
red by a planted `new Set([0x04])` in `render.ts`).

**What the runner holds.**
- `EXPECTED_SHEET_CLASSES` is derived: the shipped classes from the role
  table's look rows, the private ones from what the run carries
  (`the-runner-expects-the-classes-it-derives`). The page echoes the
  private classes its build carries (`privateClasses`), and a pass whose
  set is not the run's is refused before its verdict is read.
- Coverage owes a carried look its row read
  (`a-shipped-row-states-the-sizes-its-sheet-paints`), its sheet's name
  (`a-look-is-measured-with-its-sheet`) and its own wall controls, never a
  door mini (the deck is the three shipped looks, Q8).
- The sign's name is owed on a carried look bare, and all worn wherever the
  plan wears it.
- Grid horizon's worst stays the public run's.

**The harness fence is parsed** (the 8e2 critic's item 10): a view's look
is composed in `looks.ts` alone, and the fence finds every write of
`recordTheme` or `previewLook` outside it — a property, a shorthand
(`{ ...base, recordTheme }`), an assignment to a property or a string-keyed
element — through the TypeScript compiler, never a token match
(`the-harness-chooses-looks-in-one-place`; red over each shape and over a
shorthand planted in `gallery.ts`).

**The dist check in a harness build.** The plugin's dist check (8b2, run by
the build itself under a selection) failed the probe's and the kit's builds
on what the harness carries beside the app: the step-6 fixture look's sheet
(`t-fixture-worn`), its art (the bytes the tracked private fixture copies)
and the showroom's own stylesheet. A harness build's config hands the plugin
`HARNESS_LOOK_CLASSES` (`forHarness` in `vite.config.ts`); a sheet naming
one, the files it names and the stylesheets a page under `layout/` links are
read as the harness's, and everything else holds as on a deploy build
(`the-dist-check-knows-a-harness-builds-own-looks`).

**A run that carried private looks files its dump as its own kind** (the
8e2 critic's item 7): `.layout-dump/shipped+t-fixture-private-*.json`,
its `meta` naming the carried classes, the selection and the private
commit, never overwriting the public run's `shipped-latest.json`; and
`node scripts/contrast-dump.mjs` refuses to compare two kinds
(`dumpKindOf`, `dumpKindsDiffer`). Since the default run carries the
fixture, a default run's dump is that kind; a run with an explicit
selection of other looks is another.

**What the probe found in the tracked fixture, the day it first measured
it** (the fixture's to fix, never a rule's to relax): its crest painted the
sign's name in the ink it already wore, so the billboard read three
failures on every pass — "a paid row paints nothing the base look does
not", "a mood erases a row worn with it" and "a worn-together row erases
the others"; and its dark mood swapped the ground and the ink and left every
card and chip light — 399 figures under 3:1 all worn (white on white at
1.00:1, the tagline at 1.69:1, the wall's status line at 1.16:1) and six on
the transparent overlay. A lighter mood still put the accent links at
2.89–2.97:1 over the grid ground. The crest now paints the name in the
accent, and the mood is a light cool ground, ΔE00 9.5 from the look's own.
**Two costs, stated** (the 8e2 critic's item 6): the only private subject
public CI has no longer carries a dark mood, so the dark road is measured by
nothing until a dark mood is back in the fixture; and `lookDataProblems`
(`src/domain/lookData.ts`) accepted that incoherent palette — a mood that
states its ground and ink and leaves the cards' grounds the base look's —
which a planned private look's mood shares in shape. Today the probe's
contrast pass is what catches it, as it did here; a validator rule that a
mood states its grounds and inks together is not built.

**Measured** (this Mac, 2026-10-06): no selection before the default
existed 138.0 s (515 contrast jobs), and back to back against `main`
140.5 s vs 140.6 s; the tracked fixture carried — now the default — 153.9 s,
643 jobs, 10,957 figure boxes, 198 boxes over black and white in the
transparency pass, passed. Under the 240 s the critic set for sharding.

**Proved red**, each with the fixture carried: the gate bypassed in
`lookTable.ts` (the gate check and every half of the record-road rule fail
on every page pass — "wears att-fixture-trim, att-fixture-dusk of its own
rows" since `recordView`); the private look's row-size read dropped
(coverage: "read no row for t-fixture-private"); the private sheet never
loaded before the first paint (every pass paints the default — the class
audit refuses it, 128 contrast jobs are refused as "the paint wore
t-modern", and the sign's name is owed and unread); the harness dropping the
carried look ("the page's build carries no private look where the selection
carries t-fixture-private").

## A carried look is held to its own tallies (step 8e2, 2026-10-06, the 8e2 critic's item 1)

**The incident.** The probe's vacuity guards were one number per pass
across every look it measured — line targets clipped out of view
(`LINE_SKIP_CEILING`), points behind a clip (`CLIP_SKIP_CEILING`), the
codes owed by name (`CODES_REQUIRED`), the wall's controls read whole
(`WALL_ROLES`) — so the shipped looks satisfied each for a carried look
that measured nothing. The critic planted the fixture with
`.fine, .stall-sub { max-height: 0; overflow: hidden }` — every fine-print
line and the sign's state line collapsed — and the run passed, printing
the carried look's 90 and 78 lines clipped away at the phone and the desk
on one line nobody had to read.

**Now every tally is counted per look's class** (the page's `clipByClass`
and `wallControlRolesByClass`; the runner's line skips and quiet-zone reads
by the job's class), and:
- **the public looks keep exactly the effective ceilings they had**, over
  their own jobs and points — `LINE_SKIP_CEILING` by value, the clip ratio
  over their own points, the codes read on their own jobs, the wall's roles
  on their own walls — so a carried look can neither mask nor trip them
  (proved: the default run's public ratios are byte for byte the
  no-selection run's, 912/10922, 1723/13780, 119/3214);
- **every carried look is held to its own** (`carriedTallyFaults`,
  `scripts/look-tallies.mjs`): line skips against its own exact ceiling in
  `CARRIED_LINE_SKIP_CEILING` — **a carried look with no entry fails the
  run**, naming what it measured, so a new look's numbers arrive by a
  reviewed diff that says what is clipped and why; the 30% clip ceiling on
  its own points on every geometry pass, a pass that hit-tested none of them
  failing; every code owed by name read on its own jobs, the record sheet's
  excused under a paid look alone (`PAID_LOOK_UNPAINTED_CODES`: the name
  sheet composes no record naming a paid look in step 8, so under the
  try-on the publish screen shows its refusal and no code); and every wall
  role read on its own walls (`probe-coverage.mjs`).

The fixture's entry, measured: line skips (clipped away / not rendered)
mobile 16/10, desktop 4/8, canvas 205/0 — its sheet clips nothing, and the
counts are the base sheets' on the skeleton's markup; points behind a clip
mobile 73/918 (8%), desktop 226/1606 (14%), canvas 30/255 (12%). Test:
`a-carried-look-is-held-to-its-own-skip-ceilings`
(`scripts/look-tallies.test.mjs`).

**Proved red in the real run**: the critic's plant committed into the
fixture (and reset) — "t-fixture-private: 90 line target(s) clipped-away at
mobile, over its own 16" and "78 … at desktop, over its own 4", with the
public ceiling untouched; and a planted look carried under another class
(`plantLooks`, `t-planted-look`) — "t-planted-look is carried and has no
line-skip ceiling of its own … measured clipped-away/not-rendered: mobile
16/10, desktop 4/8, canvas 205/0".

**The fine print the critic's item 11 named is read by role since the
same day** — the next section.

**Limits, stated** (the 8e2 critic's items 6, 8 and 9).
- **`looks:diff` under a selection pins one private commit into both
  sides**: it proves a public change moved nothing on a carried look, and
  can never show what a private commit changed; for the tracked fixture both
  sides read the checkout's HEAD, so an uncommitted fixture edit is
  invisible to it, as to every harness command (`harnessLooks` reads the
  private repository's commit, never its working tree).
- **`workshop:shots` is the owner's review road for a private look and
  runs the kit's checks first**: a creator's broken kit blocks shooting a
  carried look, and the kit's look is always shot with it. The plan's
  `looks:shots <id>` is not built.
- **The 8d2 checks in Chrome**: a sheet ready before the first paint, and a
  sheet never loaded painting the default, are measured; the pending →
  ready transition, `THEME_SHEET_UNLOADED` after a real 404, the 3 s wait
  and the retries remain happy-dom's.
- **The clip-count drift between a bundled sheet and the loader's**
  (CRITIC-STEP-8D1 item 3) is still unattributed; the per-look clip counts
  above are what can attribute it.
- **A private clone not at the pin** is not refused, by design (8c1): for a
  preview selection the line the probe prints before it builds says whether
  it measures the pinned pair (`pinnedPair`, `scripts/looks-pin.mjs`), and a
  verdict is cited with that line.
- **The kit's probe refuses a selection** (it measures the kit's look
  alone), and so does `print-measure`.
- **The record a licensed stall would compose is not measured**: the try-on
  is not a record, so the Studio reads back the fixture's record (the
  default) under the look, and the name sheet over a paid try-on composes no
  record (`PUBLISH_LOOK_NOT_UNLOCKED`) — `publish-name` under a paid look
  measures the refusal, not the hex and code a step-9 seller would sign.
- A private row that moves has no reader until its `look.json` carries the
  plan's `guard` field (8i); `every-moving-decoration-has-a-reader-or-a-reason`
  refuses one meanwhile. The fixture has none.
- The new probe rules of 8f2 (the sticky scroll pass, the art-off read, the
  mark capture, the vertical name) landed with 8f2 — "Step 8f2" below.

## The honest-display sentences are read (step 8e2, 2026-10-06, the 8e2 critic's item 11)

**The incident.** The sentences on the four money sheets that state a
money or signing fact — "a payment is final" (`PAY_NOTE_FINAL`), "No
escrow" (`PAY_NOTE_DIRECT`), "sign it with this stall's own wallet"
(`PUBLISH_MUST_SIGN`), "Token minted by another wallet", "this quote is no
longer on the stall" — are `p.fine`, `p.note` and `p.ctx` lines, and no
`CONTRAST_TEXT` selector matched one: `p.fine` was first in the pass's
"text no target reads" report. The critic collapsed every `.fine` under
the fixture look and the pay, Pay several and publish screens showed no
skip at all. A look could paint them unreadable, or out of view, on a
green run.

**Measured first, as a class** (the window's options, the same day):
`p.fine` added to the list read **no contrast failure on any look** and
failed the public `LINE_SKIP_CEILING` on its not-rendered count — mobile
133 against 35, desktop 112 against 28 — every new skip a line not on
screen by design: `hidden` state sentences, and the record sheets'
desk-only code caption below 680px; with `[hidden]` excluded, mobile 49
against 35. The window chose **(b): by role, no ceiling moved.**

**Now** (`layout/honestDisplay.ts`; `HONEST_DISPLAY`, 45 roles with the
copy each says and the fact it states): every such sentence carries a
`data-role` — 19 roles on 23 nodes were added in `render.ts`, attributes
only (`roled`), and
`looks:diff main` over the seven sheet screens read 84 shots identical —
and is a contrast target by that role, scoped to `.sheet` (the row's, the
face's and the tag's provenance lines are other surfaces), "Pay several"'s
`dd[data-role="quote-not-minted"]` left out because it stands in
`pay-lines`, a money box read whole. In the probe the list is
`CONTRAST = CONTRAST_TEXT + HONEST_SELECTOR`, every rule that asks "is this
a contrast target" asks it, and a prepare:
- puts the honest lines **after** the list's own nodes, so every box the
  list matched keeps its index and its dump key — **11,952 boxes identical,
  0 moved, 0 removed** against the run before (the added 1,262 are the
  honest boxes and the newly sampled screens' own);
- **drops an honest line with no layout box at the job's width** before it
  is counted (`hidden`, or the record sheets' `.sheet-qr-fold` on a
  phone): a line not on screen is not a target there, and so not a skip —
  390 such lines over the pass, and `LINE_SKIP_CEILING` read exactly its
  old numbers (63/35, 23/28, 726/0; the fixture's 16/10, 4/8, 205/0).

**What a pass owes** (`HONEST_OWED`): per sampled sheet screen and width,
the roles every job there must READ — on every look, bare and worn — or
the job fails naming the role (`the-honest-display-sentences-are-read`,
the runner); and every screen and width that owes lines must be in the
plan and checked, or the pass fails. The table is the fixtures' own state,
held by its static half (`layout/honestDisplay.test.ts`: every role written
by `render.ts`, every owed screen sampled at both widths and painting each
owed role on a sheet, shown, in no money box, on every measured look bare
and worn; proved red by renaming `pay-final`). A collapsed line is caught
twice (clipped away, over its look's skip ceiling, and owed and unread); a
line taken out with `display: none` only here — it is not rendered, so no
ceiling counts it.

**Screens sampled for it**: `pay-xec` and `pay-moved` left the
geometry-only list (the borrowed-id warning and the valve's line are
painted nowhere else), and `pay-gone` is new — the pay sheet over a quote
that left, its title and the `pay-lost` sentence, over the quotes rail so
the pay-screens audit sees a seller's figure. +21 contrast jobs a viewport
(the plan pinned at 249 / 279 / 29, 557 with the skeleton);
`pnpm test:layout` 157.2 s → 162.9 s. **`pay-dust` stays geometry only**:
its line (`pay-why`) stands where no link was composed, so the sheet's two
Pay controls are `hidden`, and a hidden control is a line target not
rendered — sampled, it measured +7 a viewport over the unchanged ceiling.

**Measured**: 126 owed jobs on 7 screens, 32 roles read 902 times, **no
contrast failure on any look**; the least each look's honest lines read:
Modern 4.63:1 (the code caption on Pay several, the skeleton the same),
Neo 5.82:1 (`pay-lost`), Rural 5.36:1, the fixture 4.43:1 (its code
caption on Pay several). The 1,262 added boxes are those 902 reads and the
360 the newly sampled screens' own list targets add.

**Read where painted, owed nowhere, stated**: `pay-why`, `pay-quantity-why`,
`pay-whole-items`, `pay-qr-stale` and Pay several's `pay-several-dropped`,
`pay-qr-why` and its own `pay-lost`; the describe sheet's state lines
(`describe-invalid`, `describe-price-why`, the two other warnings,
`describe-price-cleared`, `describe-clear-lede`, `describe-remove-warn`);
the name sheet's `publish-invalid`, `publish-same-look` and its code
caption (read on the shipped looks; not owed, since the name sheet
composes no record for a paid look under the try-on). Each is a state no
sampled fixture stages; each is a target the day one does.

**Proved red in the real run**: the critic's plant committed into the
fixture (and reset) — `.sheet .fine { max-height: 0; overflow: hidden }`
and `.sheet .note, .sheet .ctx { display: none }` under the fixture look:
**194 owed lines not read**, every owed role on all seven screens at both
widths, bare and worn, beside "t-fixture-private: 102 line target(s)
clipped-away at mobile, over its own 16" (92 at desktop); the `display:
none` half — `pay-direct`, `pay-valve`, `pay-lost` — failed by this rule
alone.

## Step 8f2: the shared hooks a look shows, measured (2026-10-06)

Step 8f1 built the hooks a fourth look needs — marks, a sticky sign, the
name's ladder, `data-script` — and held them inert on the three looks
(`no-shipped-look-shows-a-mark`, `looks:diff`). 8f2 is the half that
measures a look that SHOWS them (STEP-8-PLAN §5, CRITIC-STEP-8 items 10 and
11): four rules, general to any look that uses a hook, each given a subject
in the tracked fixture (`layout/fixture-private-looks/`, carried by every
default run) and each proved red by a plant. Its critic (CRITIC-STEP-8F2)
reproduced two rules green over the failures they exist to catch — a name
cut by a `clip-path`, or by its own box over stacked marks; a name that
vanishes when a file fails in the state the engines actually paint — and
both were rebuilt before the step was handed on. The three looks paint none
of it: their verdicts, every public contrast box and `looks:diff` stay what
they were.

### The seller's name stands whole (`the-sellers-name-stands-whole`)

**The incident it answers** (CRITIC-STEP-8 item 10): DECISIONS D4 measured a
32-byte Latin name in a bounded column running off the bottom of a wall —
its last letters gone — and no rule could fail on it: `text-spills` read a
box whose overflow is visible and a width, `cutSideways` is sideways by
design, the line reads clip their rects to what shows, and the name is no
protected box. A cut name is an absent one.

**Now**, on every screen, look and variant of every geometry pass, every
line of the sign's name and tagline (`.stall-head .stall-name`,
`.stall-head .stall-tagline`) is held to three things — painted, its ink
whole, its own box inside every clip — by **one ink model, shared with the
name's ladder, and one clip model** (`src/ui/signInk.ts`; the ladder asks
the clip its own box gives, below):
- **It is painted** (the critic's re-check of cdedb29, item 4). No
  `content-visibility` but `visible` on the line or above it up to the
  stall, every text of it `visibility: visible`, its opacity to the root at
  least 0.1 (`UNPAINTED_OPACITY`). A `content-visibility: hidden` tagline
  was lint-clean and read "whole" on six screens — skipped content still
  gives rects — and red on six others only because those rects fell below
  the region.
- **A line is its ink, as painted.** Each line of each text node is found
  (a Range per character says which line it stands on) and measured:
  `measureText` of the line's text in its computed face gives the glyphs'
  reach above and below the baseline, and the baseline is the line box's
  top plus the face's ascent. The text is the text PAINTED: its
  `text-transform` applied (upper, lower, and `capitalize` raising the
  letter after any non-letter — more capitals than CSS paints, so the
  measure errs tall), and the canvas handed the line's `font-variant-caps`
  and `font-stretch` (a stretch only a percentage states falls back to
  normal; it moves an advance, not the reach this reads). Not applied,
  stated: `full-width` and `full-size-kana`, and a locale's case mapping
  (the app's documents are `lang="en"`). Along the line, the advance,
  trailing letter-spacing aside. In a vertical writing mode the over side
  of a line is its right, so the ink is turned onto the horizontal axis
  (exact for a sideways line, an approximation for upright glyphs on a
  central baseline).
- **A clip is every paint clip on the walk** (`paintClips`): `overflow` on
  an axis and `contain: paint` (the padding box); a `clip-path` `inset()`
  (and what `xywh()`/`rect()` compute to) as a box, read on both axes like
  an axis clip wherever it stands; `circle()` and `ellipse()` by the line's
  corners, resolved against their reference box, and a `polygon()` through
  `parsePolygon` — both at rest, and above a region that scrolls a clip
  this rule cannot read; and anything else — `path()`, a bare box keyword,
  `url()` — a clip this rule cannot read. A clip it cannot read **fails**
  rather than passes. An `inset()`'s round corners are read square, stated.
- **Scrolling is where it can take the line** (the re-check, item 2). The
  walk carries, per axis, the interval of displacements the line can be
  moved by and still stand inside every clip read so far — `[0, 0]` at
  rest; a clip narrows it, and a scroller widens it, before its own box is
  read, by how far it can still scroll on and how far it has scrolled back.
  A region at rest at its top only carries a line UP, so a cut above the
  scroller that takes the line's at-rest place is a cut at every scroll. A
  sticky box on the walk does not move with its scroll container's scroll
  (conservative: a sticky box that runs out of its containing block does).
  The page scrolls down the same way at the end of the walk, never
  sideways. The first version skipped every shape once a scroller had been
  entered, on the reasoning that past a scroller the reader scrolls the
  line where it shows — which a shape on an ancestor of the scroller does
  not follow: the critic's `inset(150px 0 0 0)` on the stall root read
  "verside Goods" at 1280 on `offers`, the probe green there and red only on
  the eight screens whose walk enters no scroller.
- **Its own padding box stands inside every clip and shape above it** (the
  re-check, item 3; zero app bytes). The ladder keeps the ink inside that
  box, this keeps the box inside every clip, so a name the ladder fits
  stands whole at a length no screen paints — a curved or polygonal shape
  is not monotonic in the name's length, and the stress names paint on two
  variants of a state screen only. Exact for a box the look bounds (the
  ladder's subject: a box it can climb in); a box that shrinks to its text
  is held at the lengths painted, the 32-byte names among them.
- **A mask on the line or above it, up to the stall, is refused outright**
  (any `mask-image` or mask border source but `none`): a gradient can fade a
  name to nothing in any shape, and no model of it is worth the risk.

**Shapes the first versions passed**, each the critic's, each now red
(below): `clip-path: inset(0 0 45% 0)` on the name at the phone (the bottom
half of "Riverside Goods" gone, every rule green); "ẪỮỆ" at 44px in Inter
800, whose stacked marks reach 48.7px above the baseline against a face
ascent of 43 — a box holding the line-height's slot cuts them and Ẫ reads
Â, while the slot read "whole" and the ladder's box scroll size (52 against
51) read "fits"; the same marks under `text-transform: uppercase` on a
lowercase name, measured as written (40.7px) — the ladder never climbed and
the shot read "ÂŨỆ ÂÂÂ"; and the stall root's `inset()` above the scroller.
The line-height slot this rule read first had fixed the opposite error (a
tight line-height's content area past its slot read as a cut: the wall's
1.02 at 54px, `35–56 inside 37–55`); the ink answers both.

**The ladder fits by the same model** (`realFits` in `lookHooks.ts` →
`inkFits`): every line's ink, as painted, inside the name's padding box.
Its earlier answers were both wrong — the box's scroll size climbed a rung
for a name that fit (44px over 50.6px slots, `scrollHeight` 103 against
101), and the slot let stacked marks through. **The ladder does not ask the
`clip-path` shapes**, stated: they cost every visitor ~2.7 KB (measured
1,131,689 served with them, against the 1,130,000 served ceiling of the
time). That ceiling is retired (2026-10-06, split by bucket); against the
every-visitor ceiling the ~2.7 KB is a quarter of the ~11 KB a deploy
build carrying a look has left (883,746 of 895,000), ~28 KB on the public
build — so the shapes stay out until the owner spends that room on them.
The model defines them once, the app's bundle tree-shakes them, and the
probe holds a name and its box to them. A look that clips its name with a shape is
failed here, not climbed past. The transform costs the app 476 bytes
(every-visitor 866,652; served 1,129,498 — 502 left). Inert on the three
looks: no app sheet and no shipped look's vars state `--name-rungs`
(`states no name ladder in any app sheet or shipped look`,
`layout/lookMarks.test.ts`; red by a planted
`.t-modern .stall-name { --name-rungs: 1 }`), so `realFits` never runs
there; `a-transformed-name-is-measured-as-it-is-painted`
(`src/ui/signInk.test.ts`, a stood-in canvas) holds what the model hands
the canvas, red with the transform taken out.

Counted per look: the lines read (`nameLinesByClass`, owed on every page
and wall pass for every look painted), the vertical lines
(`nameVerticalByClass`) and the rungs climbed (`nameTiersByClass`). Not
read: a name inside a turned wall (`[data-turn]`, axis-aligned rects of a
rotated paint) and the door's deck minis.

**The shipped looks**: no failure on any screen, the stress screens
included — Neo's uppercased sign measured in capitals, and every look's
own name and tagline box inside every clip above it.

### A vertical spill is read down its lines (`text-spills`, the 8f2 critic's P2-3)

`text-spills` read `scrollWidth` and a strip past a box's right edge only,
so a vertical name or tagline with visible overflow running down past its
box onto the address or the rows failed no geometry rule. It now reads the
box's inline axis by its writing mode: in a vertical mode the spill is
`scrollHeight` past the box's bottom, cut by the nearest ancestor clipping
vertically. The fixture's name is vertical at the desk, so the rule's and
the ladder's vertical branches run on every default run (the desk owes a
vertical line read).

### A sticky sign covers nothing as the region scrolls (`a-sticky-sign-covers-nothing-as-the-region-scrolls`)

The look rules admit one sticky box in a look sheet, the sign's own
(`STICKY_BOXES`; 8f1), and until this pass a fence
(`a-sticky-sign-waits-for-the-scroll-pass`) refused one in every served
sheet, because a box that follows the scroll stands over whatever the
region scrolls under it — at a position no paint at rest is in, and every
other rule measures the region at its top. **Now**, on every screen, look
and variant of every geometry pass, every subject box `layout/stickyBoxes.ts`
lists (held to the lint's table by
`the-scroll-pass-measures-what-the-lint-admits`) that computes
`position: sticky` has its scrollport found (the nearest ancestor that
clips, or the page) and scrolled through stops: the top, every shelf head,
the end, and every protected box that shares the sticky box's columns
brought to the sticky box's edge, top and bottom. At every stop no
protected box's showing part (the sign's own address aside) may meet the
sticky box by more than a pixel each way. Scrolling is vertical, so a
protected box in none of the sticky box's columns can never pass under it;
the region is put back where it was. Counted per look (`stickyByClass`);
a page pass that found a sticky sign owes it a region that scrolled.
**Off the wall** (the 8f2 critic's P3-9): a turned wall scrolls along the
screen's other axis and no pass measures a sticky sign there, so the pass
skips `[data-turn]` and the look rules admit a sticky sign only in a rule
whose look compound says `:not(.shop-window)` until a wall is measured
(`refuses the sign sticky where it could be on the wall`, in
`a-look-may-make-only-its-sign-sticky`).

### No look mark paints inside a protected box (`no-look-mark-paints-inside-a-protected-box`)

A mark a look shows is an in-flow node: a negative margin or a relative
offset moves its paint over a figure while every box the geometry passes
read stands clear; with `pointer-events: none` the five-point hit test
reads straight through it; and it carries no `att-` class, so the box sweep
never asks it (STEP-8-PLAN §5, dry-run D6). So it is measured the look
pseudos' way (D6(i), "No look pseudo paints inside a protected box"): the
prepare counts the marks the job's scope shows (`lookMarks`), and the
runner compares a frame with them shown against one with every mark at
`visibility: hidden` (which hides a mark's shadow and outline too), inside
every protected box, a device pixel in, at `LOOK_PSEUDO_LEVELS`. One frame
hides the look pseudos and the marks together where a job has both
(`__lookPaintHidden('both')`); only a frame that moved is taken again with
each hidden alone, to say which painted there. **The "shown" frame is the
job's own capture** (the 8f2 critic's P2-4): the same blanked, frozen paint
the targets were read on, every step since having put back what it
changed — and a comparison that moved is shot fresh before it is believed.
On the geometry passes a mark a carried private look shows is still held
to be the renderer's empty, aria-hidden node, and counted
(`marksShownByClass`). Not measured, stated: a mark's paint on a
geometry-only screen (the critic's P3-7 asks for a box fallback there).

### A word reads when the art does not load (`a-word-reads-when-the-art-does-not-load`)

**The incident it answers** (CRITIC-STEP-8 item 11; owner question 2): a
file can always be late or fail — a slow line, a tab older than a deploy —
and a box masked or clipped by a file then paints something else.
`no-word-is-clipped-by-a-file` keeps a file's mask off every box with
words, but a ground under words drawn by a masked layer or box is the
art's, and with it gone the words stand on whatever is left
(`fileClipFaults` reads elements only, the step-8 critic's own note).

**What the engines paint**, not the spec's sentence (the 8f2 critic's
P1-2). Measured on 100×50 boxes served from loopback — by this step in
Chrome 154 headless (a mask file answered slowly, with a 404, and with a
200 HTML body), and by the critic in Chrome and the system WebKit
(WKWebView) — the two engines alike on every mask case, and apart on a
file `clip-path`, which WebKit never applies, even loaded (a valid
external clipPath was ignored; the critic's re-check of cdedb29): it draws
the box unclipped, the state the failed frame's `none` reads, so the two
frames cover it:
- **pending** — while a mask image, a mask border image or (in Chrome) a
  `clip-path` file is loading, the box paints **nothing**, whatever its
  other layers (one layer; a file layer `add`ed to a gradient; one
  `subtract`ed);
- **failed** — once the load failed (a 404, or a 200 HTML answer — a
  preview's or an SPA fallback's), each failed mask layer is **skipped**
  and the others stand: a lone failed layer paints nothing, a failed file
  `add`ed to a gradient leaves the gradient, a failed file `subtract`ed
  from a gradient leaves the gradient; a failed mask border image
  (`-webkit-mask-box-image`) hides the whole box; a failed `clip-path`
  file clips nothing.
The first emulation (each file layer an image of transparent black,
composited as written) matched neither: it hid the box a real failure
shows in the subtract case, kept the gradient a slow load hides in the add
case, and left a failed mask border's box whole.

**Now**, on every contrast job whose scope paints file art, the prepare
marks every element and every `::before`/`::after` whose computed mask
image, mask border source or `clip-path` names a file (`markFileArt`: the
masking rules found in the CSSOM by their longhands and their shorthands —
a shorthand holding a `var()` leaves its longhands empty — their hosts
matched, each read computed) and writes both states: **pending**, each
such box at `opacity: 0`; **failed**, each file layer turned to a
transparent layer composited `add` (skipped; the other layers and their
compositing kept, legacy keywords read as their standard twins), a file
mask border's box at `opacity: 0`, a file `clip-path` `none`. The runner
reads every target — on the boxes the job read, since the art moves no box
(the critic's P2-4): a line by its line rects, money whole, an outlined
line in its ring — on the pending frame, and on the failed frame where it
differs from pending: a stack mixing file and other layers, or a file
clip (`fileArtMixed`). Every target must clear the floor in both; a frame
that failed is taken again once. Asked only where file art is painted (no
shipped look paints any). Stated limits: partial failure (one file of
several) is not modelled; a failed `background-image` or `border-image`
file (which draws nothing, leaving the element's colour) and a look's face
failing (the fallback face's metrics) are not switched off here.

### The stress names, and on a try-on

New screens, geometry only, bare and all worn (`STATE_SCREENS`,
`GEOMETRY_ONLY_SCREENS`): `cjk-name` (ten ideographs, 30 bytes — the
record's binding CJK case — and a CJK tagline); `stacked-name` (Vietnamese
capitals with stacked marks, `STACKED_NAME`); the 32-byte `W`s
(`LONGEST_NAME`, `hostile-name`'s) on the wall's Cycle card and in Browse at
the desk (`shop-window-long-name`, `-browse-long-name`) and at 1920x1080
(`-wall-long-name`, `-wall-browse-long-name`); and the stacked-mark and
CJK names on the Cycle card (`shop-window-stacked-name`,
`-cjk-name`) — every wall one on the portrait and tablet passes too
(`WINDOW_SCREENS`).

**A CJK name is set in a CJK face** (`a-cjk-name-is-set-in-a-cjk-face`, the
8f2 critic's P3-5). No CJK face is served, so a CJK name is set in the
machine's fallback — and a machine with none sets every ideograph as the
same missing-glyph box, which every rule then measures and passes. So on
every sign line marked `data-script="cjk"` two different ideographs are
drawn in the line's own face and compared pixel for pixel (a missing
glyph, or a last-resort face, draws one glyph for both), and an ideograph's
advance must be within 15% of 1em. The advance read is printed per pass
(`CJK advance: 1.005em` here, PingFang); a pass that measured `cjk-name`
owes one. The manual Linux `layout` CI job installs `fonts-noto-cjk`
before it runs the probe (`.github/workflows/ci.yml`), since whether the
runner's image carries a CJK face is not something the workflow can know;
that job has not been run on this branch (no network here). The check is
Han-only: a kana- or Hangul-only name marked `data-script="cjk"` is not
held to a face (the re-check's P3, noted).

**On a try-on** (the 8f1 critic's item 6): a seller who tries a look on
from the name sheet gets `showLook`'s `put`, which patches the look onto
the stall behind the sheet and chooses the name's rung there. So on every
pass that measures `publish-name`, for each carried look and each stress
name (32-byte, CJK, stacked marks), the sheet is painted over the default
look with that name, the look's own picker button pressed, and the stall
behind held to wearing the look and to its name standing whole
(`tryOnNamesByClass`, owed per carried look on the page passes).

### What the tracked fixture carries, and what a run owes

The fixture's sheet gained, each as narrowly as its rule needs: a name
ladder at every width (`--name-rungs: 2`; a bounded box, 72px on a phone
and 110px at the desk; rungs 22/12px on a phone, 30/14px at the desk, so a
32-byte name reaches the **last rung** on a phone; `padding-block: 0.2em`
inside the box, room for stacked marks; a letter-spacing under
`data-script="cjk"`); and at the desk, off the wall: the name set
**vertically** (`vertical-rl`, 300px down by 200px across); the sign
**sticky** in a column of its own (`grid-template-columns: 380px
minmax(0, 1fr)`, rows `max-content` — an auto row in a scroller of
definite height shrank a body whose minimum height is 0 and the footer
painted over the goods, the first run's 58 failures); a **figure mark** (a
dot after every row's figure); and a **ground behind the name drawn by a
mixed mask** — its own file (`art/under-name.svg`) `add`ed to a plain
gradient — lightly tinted, so the name reads loaded, pending (nothing
drawn) and failed (the gradient alone). A run owes each subject:
`probe-coverage.mjs` (`TRACKED_FIXTURE_CLASS`) the sticky region, the mark
shown and the vertical line at the desk, a rung on both page passes and
the last rung on the phone; the runner a failed art-off frame on a fixture
job (the failed state's committed subject). **Any carried look** owes its
own (the 8f2 critic's P3-8): a look whose geometry passes showed a mark
owes a mark-hide frame, and a look whose sheet names a file in a mask or
clip property — read from the sheet itself (`CARRIED_FILE_ART`), so a
computed miss in `markFileArt` fails the run — owes a pending art-off
frame.

**The fixture's own tallies**: line skips mobile 16/10 and desktop 4/8
unchanged; canvas clipped-away 205 → **207** (`CARRIED_LINE_SKIP_CEILING`,
with its reason): the name box's room for stacked marks makes the wall's
sign 22px taller, so the 35-line payment's scroller shows one line fewer
on each of its two jobs.

### Proved red

Plants on the tracked fixture (a commit object of the planted sheet,
selected by `STALL_LOOKS_COMMIT`) and on the code, each reverted; every
failure the fixture's, never a shipped look's.
- **The ladder off** (`applyNameTiers` returning at once), with the sign
  widened across both columns, the zoom plant, and the tile plant (8f2's
  first round): `the-sellers-name-stands-whole` 19 and the rung gaps on
  both page passes; `a-sticky-sign-covers-nothing-as-the-region-scrolls`
  65 at the desk ("header.stall-head stands over a.buy by 583x51px with
  div.stall-scroll scrolled to 439 of 643"); the zoom's mask and framing 10
  each with the reset's `!important` off (0 with it on); the tile rule
  1,365 with the whole tile read again — the red proof 8f1's
  `.ic-initials` change was owed.
- **A `clip-path`, a mask, a vertical spill, a missing CJK face** (one
  run): `clip-path: inset(0 0 45% 0)` on the name at the phone — 159, "a
  line's ink … is cut by its own box (h1.stall-name)'s clip-path
  inset(0px 0px 45%)"; a gradient `mask-image` on `.stall-sign` at the desk
  — 574, "stands under a mask on div.stall-sign.has-pin"; a vertical
  tagline with visible overflow at the desk — 125 `text-spills`, "paints
  288px past its box, down its vertical lines (348 > 60), under
  button.addr"; and the CJK check drawing one ideograph twice — 90.
- **Stacked marks with no room** (`padding-block` taken off the name): 13 —
  `stacked-name` (4), `shop-window-stacked-name` (6), the try-on (3) —
  "a line's ink … is cut from below or above by its own box: 14 of its
  16px show", at the last rung: a cut that scales with the face no rung
  can climb past.
- **The failed state**: the critic's subtracted layer — the ground ink,
  `mask: url(file), linear-gradient(...) center / calc(100% - 48px) 100%;
  mask-composite: subtract, add`, ink strips beside the name when loaded,
  the gradient alone (ink under ink words) when the file failed: the name
  failed 30 times in the failed frame and never in the pending one or the
  ordinary read. **The pending state**: a file `add`ed to a full gradient
  under the name in the ground's colour — 60 in the pending frame alone,
  the ordinary read and the failed frame green. **A mask border**: a ground
  drawn by `-webkit-mask-box-image` under the tagline — failed in both
  frames (42 each).
- **The first art-off model read green twice**: with the failed layer
  `none` (no mask at all), and with the transparent-black layer where the
  engines skip — the subtracted plant painted ink on ink in the browser and
  passed.
- **The re-check's four** (two runs, one plant per worn variant so each
  reads apart; every plant lint-clean). Run RD: `content-visibility:
  hidden` on the tagline in every variant — 399, on every screen with a
  tagline in every geometry pass, "is not painted: content-visibility
  hidden on its own box"; the critic's `inset(150px 0 0 0)` on the stall
  root at the desk (trim) — 59, every `offers`-like screen whose region
  scrolls among them, "can never be brought whole into view (in
  div.stall-scroll, which scrolls): … clip-path inset(150px 0px 0px) shows
  at most 127 of its 170px"; and `text-transform: uppercase;
  padding-block: 0` on the name (dusk) over a lowercase `STACKED_NAME`
  ("ẫữệ ấầẩ ẫữệ", a code plant) — red at rung 2 on the phone's
  `stacked-name` ("11 of its 13px show") and at the desk, where the
  vertical name climbed to rung 2. **Its control** — the same run with the
  transform taken out of `inkLines` — reads the phone's `stacked-name`
  green, and at the desk the ladder never climbs (no `data-name-tier`):
  the critic's finding, reproduced, and the fix is what turns it. Run RE:
  `clip-path: ellipse(50% 50% at 50% 50%)` on the name (crest) — 26 where
  every line's ink stood inside the ellipse and only the box's corners
  did not, "its own box at 50,49 (290x42) is cut by its own box
  (h1.stall-name)'s clip-path ellipse(…) — a longer name the ladder fits
  in that box would be cut"; `visibility: hidden` on the tagline (dusk) —
  172; `opacity: 0.05` on the name (trim) — 201, "its opacity to the root
  is 0.050". `a-transformed-name-is-measured-as-it-is-painted`: 3 of 5 red
  with the transform taken out.

### Measured

This Mac, 2026-10-06, back to back with `main` (1bcdf58, a worktree):
`pnpm test:layout` **170.6s on main, 187.6s here (+17.0s)**; the first 8f2
commit measured +18.4s. The re-check's fixes (the painted test, the
transform, the reach walk, the own box) are geometry-pass reads: unplanted,
186.8s before them and 183.8s after, inside the machine's drift. Where it
goes: the geometry passes +2–3s (the name read with its ink on every
paint, the scroll pass over the fixture's 53 desk paints whose region
scrolls, the stress screens and the try-on job);
the contrast pass +14s — the look-paint frame on 60 more jobs, now ~119 ms
a job against 194 before the "shown" frame reused the job's capture
(look pseudos 20.0s for 168 jobs against main's 21.0s for 108), and the
art-off read on the fixture's 60 desk jobs, two frames each since its
stack is mixed, 239 ms a job (14.3s). The contrast dump: 13,212 boxes
against main's 13,214 — 12,825 identical, 387 moved and 2 removed, every
one the fixture's (the two removed are a payment line's chip on the wall,
the line scrolled out above); every public look's box identical.

**What a look showing every hook on every job costs, measured**: the same
run with the fixture's mark and ground at every width (a plant) read 214
look-paint jobs at 113 ms and 106 art-off jobs at 229 ms, and ran 202.1s.
**The projection for Ink wash**, stated as a method: the contrast base is
~0.116 s a job (the contrast pass less its extra frames, over 697 jobs);
a look carrying every hook adds ~0.34 s a job (one look-paint frame, two
art-off frames for a mixed stack); Ink wash replaces the fixture's ~140
jobs (~43s of this run with its geometry share) with ~220 (the critic's
count: a second mood's all-worn variant and the hills' solo jobs), so
≈ 187.6 − 43 + 220 × 0.456 + ~8s of geometry ≈ **253s, before its movers'
worst-case readers** (the horizon's costs 266 ms on each job that wears it;
on half of Ink wash's jobs that is ~+29s, ~280s). Past the 240s shard
line. The levers left are not the fixture's or the stress screens' scope
(they are not in an Ink wash run, and the stress screens are geometry
only): they are a **two-tab contrast pass** — the job list split across
two targets of the one Chrome, each with its own emulated viewport, its
own page load and its own prepare-capture-read loop, the verdicts merged
by job key — built the same day, and measured: the screenshots do not
serialise ("The contrast pass walks on two tabs", next); and fewer frames
for an unmixed stack, not built.

## The contrast pass walks on two tabs (2026-10-06)

8f2's projection put the run past the 240s shard line once Ink wash is
ported (~253s, ~280s with its movers' readers, above). Measured before
anything was built, on this Mac (on battery, low-power mode off), with
`main`'s own phase table (181.8s; contrast 145.6s, 697 jobs, 1,218
captures):

| phase | calls | total | mean |
|---|---|---|---|
| capture (the CDP call, transfer, base64) | 1218 | 78.3s (54%) | 64 ms |
| prepare (the paint, the font wait, two frames) | 697 | 17.6s | 25 ms |
| decode | 1218 | 9.2s | 8 ms |
| sample, boxes | 697 | 3.5s | — |
| load: ready (4 pages) | 4 | 6.6s | ~1.6 s |

(The look-paint, ring, horizon and art-off phases — 19.8s, 8.6s, 21.8s,
14.3s — are wall time that holds their own captures, so they overlap the
capture row.) **Decoding and sampling are ~12s of the 145** (the ring,
look-paint and art-off reads' own pixel loops sit inside their phases and
were not split out): decoding once, decoding off the main thread or
sampling faster buys at most about that. The time is the browser's —
Chrome rastering, copying and encoding each frame, and the frames a prepare
waits for — so the question was the critic's: do two targets' screenshots
queue, or overlap? A scratch benchmark (not kept in the repository)
answered it before the runner changed: 90 desktop jobs of the plan (each prepared,
grown, captured and decoded as the pass does) on 1, 2, 3 and again 1 tab of
one Chrome — **11.8s, 8.9s, 8.2s, 12.1s**, a capture call 82, 107 and 123 ms.
They overlap: a capture waits a little longer and two run at once, and one
tab's frame waits are time another tab paints in.

**So the walk runs on `CONTRAST_TABS` tabs** (`LAYOUT_CONTRAST_TABS`, 1–4,
default 2). The first tab is the session every other pass uses; the rest
are targets of the same Chrome, each created in a window of its own — by
choice, not need: in Chrome 154 `--headless=new` a background tab in one
window is visible and focused too, runs its animation frames and answers a
capture as quickly (the critic, measured 2026-10-06; the first version of
this paragraph said a background tab was hidden, which is false here) — and
each page load is held to `visible` and focused and asked for one capture
bounded at 5 s (`loadContrastPage`; below, "After its critic"). Every tab gets
the fixed clock and the focus emulation, and has its own page, viewport,
emulated media and page age. The plan is read once, from the first tab's
page; the jobs are handed out one at a time in plan order to whichever tab
is free, and a tab whose next job is at another viewport opens that page
first (its screens held to the plan's, as before), so no tab waits at a
viewport's end for the others. **A job never reads another tab's state**:
the job body (`contrastJob`, the walk's body moved out whole, its six early
`continue`s now `return`s) keeps everything it accumulates in job-local
names and hands them back; the totals are folded from those answers **in
plan order** once every tab has stopped (`commitContrastJob`: a count is a
sum, a least a `Math.min`, a set a union, a list a concatenation, a map's
keys land in the order their first job put them there, and the one map a
later job overwrites, `codesUnread`, is overwritten in that order too). The
job function is declared outside the pass, so a total it named by mistake
would be an undeclared name rather than a silent write: `tsc --checkJs`
over the runner reports none. The first tab to throw stops the hand-out,
the others finish the job they hold, and the earliest job in the plan that
threw is the pass's error. A job handed out must come back with its own
record, or the pass fails naming it (`… came back with no record of their
own`) — a tab that took a job and never ran it would otherwise count it
done, since `done` is counted at the hand-out. The tabs past the first are
closed before the transparency pass, which runs on the first as it did.

**What it changed, and what it did not.** Every run of it was green, and
its per-box dump is **byte for byte `main`'s in its `jobs` and `boxes`
arrays** (the JSON of both arrays compared, order and every field: 724 jobs,
13,212 boxes) at one tab and at two; `contrast-dump.mjs` reads every box
identical at one, two and three tabs. Every verdict line is `main`'s but
one: `faces: every face loaded before the first job on all N contrast
pages` counts the pages the tabs loaded — 4 on `main` (three viewports and
one reload past a minute), 6 at two tabs, 9 at three. (The canvas geometry
pass printed `257/4357` points behind a clip on two of the twelve green
runs — one `main`'s, one at two tabs — and `259/4359` on the rest: it varies
by itself, and the geometry passes run before the contrast pass, untouched.)
The phase table
now sums each phase over the tabs, so it adds up to more than the pass
took; the `contrast tabs:` line above it says each tab's jobs, busy time
and pages.

**Measured, back to back on this Mac** (on battery, low-power mode off;
`main` from a worktree of 1472b99):

| run | total | contrast |
|---|---|---|
| `main` (three runs) | 181.8s, 180.7s, 184.8s | 145.0–145.6s |
| two tabs (five runs, the last on the commit's tree) | 126.9s, 135.4s, 132.0s, 129.5s, 130.5s | 92.0–97.4s |
| three tabs (once) | 119.1s | 83.4s |
| one tab (the refactor alone) | 183.0s | 146.7s |
| `main`, the fixture showing every hook on every job (a plant) | 196.7s | 159.7s |
| two tabs, the same plant | 139.7s | 101.1s |

Two tabs take ~51s (28%) off the run and ~51s (35%) off the contrast pass;
a third took 8s more once. **Two is the default only where the overlap is
there to take** (after its critic, below): this Mac is 6 cores and 8 GiB;
a third tab is a third renderer at a 1920-wide grown page on it, and no
machine smaller than it, nor the Linux box, has run two. (The first
version's reason — "2.6 GB of swap in use just after that run" — was not a
measurement: this Mac sits at 2.3–2.5 GB of swap at idle, so swap after a
run cannot tell the run from the machine; the critic's P3-7.)

**The projection for a look that shows every hook on every job**, as a
method: the plant above moves the fixture's mark and its file-masked ground
out of the desk block, so 106 of its 140 contrast jobs show both (look-paint
jobs 168 → 214, art-off jobs 60 → 106). On two tabs those 46 more hooked
jobs cost 6.6s (101.1 − 94.5, the mean of the first three unplanted runs), **~0.14s a job against
~0.31s on `main`** (14.3s); a plain job is ~0.075s (8f2's 0.116s at the
contrast pass's measured 0.65), so an every-hook job is ~0.22s. Ink wash
replaces the fixture's 140 jobs (~26s of contrast at those rates, and
~6s of geometry, its fifth of those passes — an estimate) with ~220 (~48s,
and 8f2's ~8s more geometry): 139.7 − 32
+ 48 + 14 ≈ **170s before its movers' worst-case readers**; the horizon's
reader costs ~0.15s of wall a job at two tabs (24.8s summed over 83 jobs
and two tabs), ~16s on half of Ink wash's jobs, **≈ 187s with them**.
Cross-checked by the plant's own ratio (139.7 / 196.7 = 0.71) applied to
8f2's 253s and 280s: 180s and 199s. Under the 240s line either way.

**Proved red**, each on the second tab alone, each reverted:
- **A defect on its page**: an adopted sheet on tab 2's pages painting every
  `[data-role="price"]` ink on its own ink, and tab 2's first job painting
  another look — "✗ contrast: 271 figure(s) on paint below 3:1" (every one
  a job tab 2 ran, listed in plan order) and "1 job(s) refused —
  mobile/offers/1/65535: it painted offers/2/65535; the paint wore t-neo
  where the job's look is t-modern", exit 1.
- **A job taken and never run**: "✗ contrast: 1 job(s) handed to a tab came
  back with no record of their own: mobile/offers/1/65535", exit 1.
- **A throw**: tab 2's tenth job asking the page for a hook it does not
  have — "✗ contrast: page threw: … window.__noSuchHook is not a function
  (on contrast job mobile/unbuyable/3/0)", the first tab stopping after
  the job it held, exit 1.

**Not measured, stated**: the Linux box (the manual CI job) at any tab
count; three tabs more than once; the geometry passes, still one page at a
time (~30s of the run), which are the next lever if one is needed; and
whether a tab count above two changes anything on a machine with more
memory.

### After its critic (CRITIC-PROBE-RUNTIME, 2026-10-07)

The critic reproduced the claim — the same dump at one tab, two tabs and
two tabs under four CPU hogs — and found the safety argument resting on
per-job hermeticity that nothing in a run held. What changed:

- **`the-contrast-pass-reads-the-same-on-every-tab`** (P2-1): on every run
  with more than one tab, a handful of jobs are read again on a tab other
  than the one that ran them — the first job of each viewport, the first
  read at Grid horizon's worst, the first that hid a look's marks and read
  its file art away, and the job holding the least box — and each must hand
  back the same record and the same boxes, byte for byte, or the pass fails
  naming the job and both tabs. Read again, compared, never folded. ~6 jobs.
- **The dump says how it was walked** (P2-1): `meta.contrastTabs`,
  `meta.contrastTabsWhy`, `meta.ranOn` (job key → tab) and `meta.canary`,
  never in `jobs` or `boxes`, which stay byte-comparable across tab counts;
  `contrast-dump.mjs` prints both sides' tab counts first.
- **The default is the machine's** (P3-7): 2 where there are at least 4
  cores and 8 GiB, else 1, the reason printed on the `contrast tabs:` line;
  ci.yml's manual `layout` job sets `LAYOUT_CONTRAST_TABS: '1'` until a
  Linux run has compared one tab with two.
- **A page is asked for one capture, bounded at 5 s, before any job**
  (P3-1): the visible-and-focused check is a belt this Chrome never trips;
  the failure that does happen is a minimised window, whose page reads
  visible, focused and running frames and answers no capture.
- **A throw folds only the jobs before it in the plan** (P3-2), and says how
  many later jobs other tabs ran and are not reported; a CSP refusal is said
  once with a count. **The answers are checked by key** (P3-3): each job's
  record must be its own. **The phase table is a share of the tabs' time**
  (P3-4). **The watchdog and a fault name the tab** (P3-5). **The run's dump
  arrays are named apart from the job's** (P3-6), so a job that lost a local
  names an undeclared array.

**Measured, back to back on this Mac** (6 cores, 8 GiB, on battery at
~70%, the tracked fixture carried, 96fe628): two tabs (the machine's
default) **142.9s**, contrast 98.9s, tab 0 309 jobs and tab 1 388, the
canary 6 of 6 identical; one tab (`LAYOUT_CONTRAST_TABS=1`) **183.6s**,
contrast 145.8s. The two dumps: 13,212 boxes identical, 0 moved, and both
identical to `main`'s dump of 1472b99 (`contrast-dump.mjs`). `pnpm test` on
the same tree: vitest 2,321, node 388, green.

**The canary proved red**, reverted: an adopted sheet on the second tab's
pages alone (`.stall { background-color: #f4f4f4 !important }`) — "✗
contrast: the-contrast-pass-reads-the-same-on-every-tab: mobile/offers/1/0
(the first mobile job) ran on tab 0 and read again on tab 1: 9 of 28 box(es)
differ …", one line for each of the six picks, each naming both tabs, exit
1. (The plant also put 54 figures under 3:1 on the dark looks, so the floor
failed beside it; the canary's six lines stand on their own.)

**Not built, stated:** the critic's belt of comparing each dump with the
last dump of the same kind and revision (P2-1, item 3); and P3-8 — the
door's typing placeholder runs on `setTimeout` from module state no
neutral screen resets, so what it shows at a door capture depends on that
tab's history. No contrast target reads the paste box today; the day one
does, the door's contrast jobs must paint with the typing stopped first.

## The sign quotes: `quotes-signs` and `pay-inr` (glyph segment, 2026-10-10)

Two fixture screens, no new rule. `quotes-signs` is the quote rail with one
quote in each currency whose sign a served face may not draw itself — INR
`₹`, ILS `₪`, KRW `₩`, NGN `₦`, PHP `₱`, TRY `₺` — and `pay-inr` the pay
sheet over the rupee quote, with its rate. They exist because the seller's
own figure (`seller-price`, a protected box) carries the sign beside its
digits, and until they stood in the table the probe and `looks:diff` saw that
node only with a `$` in it: a sign drawn by a face of Stall's, or by whatever
font the reader's machine falls back to, changes the figure's width and so
the price tag's, and no screen measured it.

Both are on `STATE_SCREENS` and `GEOMETRY_ONLY_SCREENS`: the rows are
`offers`' quote rows and the sheet is `pay`'s, on grounds the contrast pass
already samples, so what these add is geometry (the name column against a
wider or narrower figure, the tag's width, the sheet's bound). Their names
bind the pay-screens audit (`quotes` / `pay`): each must mount a
`seller-price`. Which face drew a glyph is still held statically, not here
(`every-glyph-the-app-prints-is-in-its-face`); the probe's face check reads
status, never a glyph.

Measured green on 2a6578a: `pnpm test:layout`, 136.9 s (the window's run).

## The tagline at its cap: `longest-tagline` and `longest-cjk-tagline`

Two fixture screens, no new rule. A record's tagline (tag `0x02`) holds up
to 64 bytes, and until these stood in the table the longest any screen
painted was the default's 54 bytes and `CJK_TAGLINE`'s 33. The two scripts
reach the cap at very different lengths: `longest-tagline` is 64 bytes of
the widest Latin letter with no space (`LONGEST_TAGLINE`, breaking only
where the sign lets it), `longest-cjk-tagline` 21 ideographs, 63 bytes
(`LONGEST_CJK_TAGLINE`). Both are on `STATE_SCREENS` and
`GEOMETRY_ONLY_SCREENS`, beside the stress names: the sign's ground with a
longer line on it, which `offers` and `hostile-name` already sample, so
what they add is geometry — `the-sellers-name-stands-whole` reads every
tagline line, and `text-spills` and `cutSideways` the sign around it.

## A state only a press reaches, staged: `addr-shown` (the 8g1 critic's P1-1)

The address box is the copy control (`addressLine`). A tap whose clipboard
is missing or refuses sets `data-copied="shown"` on it, and the sign then
shows the whole 48-character address at every width until the next paint —
on a phone, where `shortAddress`' glance stood. No view field reaches that
state, so no screen had painted it: a look whose sign is sized by what it
holds could widen it there and crowd everything beside it, and every pass
measured the glance instead.

**`STAGED`** (`layout/fixtures.ts`) names the screens whose state only a
press reaches, and `stageScreen` puts it on the tree right after the paint —
in the probe's `paint`, so every geometry pass, the reduced-motion pass and
the contrast pass's prepare stage it, and in the showroom's, so a shot of
the screen is of the state measured. The app repaints nothing when the
press lands, so neither does the stage: the name's ladder and the marquees
stand as the paint measured them. `addr-shown` is the shop's book with
every address box in its shown state; on `STATE_SCREENS` (bare and every
all-worn variant: the decoration interactions are `offers`') and
`GEOMETRY_ONLY_SCREENS` (`.addr-full` is sampled at the desk, where it is
the address's only form).

**Owed, not trusted** (`probe-coverage.mjs`, test
`the-8g1-states-owe-their-subjects`): the probe counts the nodes each
staged screen pressed per look (`stagedByClass`); a staged screen that
pressed nothing on a look fails the pass, and a pass that measured
`addr-shown` owes an address in its shown state on every look it painted.

Red proof: the private look at 0x04 at `b94be54`, selected — 21 failures
on `addr-shown` at 390x844 (`asked amount is covered` ×5, `a protected box
is cut sideways` ×5, `text-spills` ×6, and 5 more on the shop's figures),
0 at 1280x900. Green on the three shipped looks, the skeleton and the
tracked fixture at both widths.

## A third state only a press reaches, staged: `addr-copied` (the lint-belts critic's fourth review, B3)

A tap that copies the address sets `data-copied="true"` on the box for
`ADDR_COPIED_MS` (2.5 s), and the sign says the word "Copied" in place of the
address. `STATE_ATTRIBUTES` lets a look match `[data-copied='true']`, and no
fixture painted it: only `addr-shown` is staged, with `shown`. A rule under the
value was a rule no pass measured, which is the third of the three states the
critic found unpainted (`[data-state='stale']`, `[aria-disabled='true']` and
`[data-over='true']` are the others).

**The decision** (the window's): the three that no fixture paints and no shipped
sheet or fixture names are belt states, so a rule under them sets only what a state
may (`STATE_ATTRIBUTE_NAMES`); `[data-copied='true']` is not, and is **painted**
instead: `addr-copied`, a staged screen (`STAGED`, `stageScreen`) that puts every
address box in `data-copied="true"`, the shop's book otherwise, on
`STATE_SCREENS` and `GEOMETRY_ONLY_SCREENS` like `addr-shown`. A rule under the
value is then measured at rest, and the lint keeps reading `[data-copied='true']`
as a rule at rest. **Owed, not trusted**: a pass that measured `addr-copied` owes an
address in its copied state on every look it painted (`probe-coverage.mjs`, test
`the-8g1-states-owe-their-subjects`, which now owes both address states), and a
staged screen that pressed nothing fails the pass. The screen is geometry only.
**Measured** (2026-10-20, `pnpm test:layout`, four runs on a machine shared with
other probe runs): every page, wall, narrow, short and reduced-motion pass was
green each time, with `addr-copied` on the phone and desk passes (82 and 94
screens); the contrast plan was the same 796 jobs and its pass was green once,
in the run that stopped in the transparency pass at 300.2s; the other three
stopped in the contrast pass at the 300s ceiling, the geometry walk alone having
taken 123s to 186s. Those four runs did not finish. **The window's own quiet run did**
(2026-10-26): `pnpm test:layout` green with this screen at 247.6s, at a load of
about 4. It is one run and not a back-to-back pair against main, so it says the
whole runner finishes with this screen inside the 300s ceiling and does not
measure what the screen costs (the critic puts it at about 1% of the paints).

**The trace** (`layout/stateAttributes.test.ts`, a happy-dom paint of every probe
screen on every look the vitest run measures — Modern, Neo, Rural and the
skeleton, since the fifth review: the stream card's tier differs by look — with
its staged state, held by value): every value of `STATE_ATTRIBUTES` is painted by
a screen, a belt state, or on `UNPAINTED` with its reason. The trace found values
the critic did not list and no look sheet names, and the fifth review closed
them: `[data-format='square']`, `'story'` and `'stream'` and `[data-code='false']`
are belt states since then (`STATE_EXCEPT_PAINTED`: `data-format` but `tag`, which
the poster fixtures paint, and `data-code`), and `[data-tier='2']` is painted
(below, "The stream card's tiers"). **A painted value under `:not()` is a state too**
(the sixth review's P3): `:not([data-format='tag'])` matches the three formats no
screen paints, so a name in `STATE_EXCEPT_PAINTED` inside a `:not(…)` at any depth is
read as a state, `:is()` and `:has()` around it as before. What is left on
`UNPAINTED` is the name ladder's six rungs, which only Chrome paints.
`[data-marquee]` is not on it: it is a presence attribute, armed by a layout measure,
and it is the one exception of the test that reads every presence attribute as painted
(`reads every presence attribute as painted, bar the marquee`).

## The stream card's money tiers: `broadcast-from-123456`, `broadcast-from-1234567` and `broadcast-quote-7` to `-13` (the lint-belts critic's fifth and sixth reviews, ranked item 1)

`[data-tier='2']` is a value a look may match (`STATE_ATTRIBUTES`), and it sizes
the figure the stream shows (24px on the card): a money tier, so it could not be
made a state (a state may not size a figure) and a rule under it had to be
measured. No screen painted it: the older cards painted tiers 1 and 3 (`from 1,200`
and `from 100,000,000`), and Rural, whose overlay ladder is 8, 10, 12 where the
others' is 5, 7, 9, painted no tier 1. Two canvas fixtures paint the lengths
between. The ladder counts the figure and 2 for `from` (`priceTier`):

| fixture | characters | Modern, Neo, skeleton (5, 7, 9) | Rural (8, 10, 12) |
|---|---|---|---|
| `broadcast-from-123456` (`from 123,456`) | 9 | tier 2 | tier 1 |
| `broadcast-from-1234567` (`from 1,234,567`) | 11 | tier 3 | tier 2 |

Together they put **tier 2 on every look and tier 1 on Rural**. (The older cards
paint tier 3 alone on every look, so Rural's tiers 1 and 2 come from these two
fixtures and from nothing else; a note that said the older cards already paint tier 2
on Rural was wrong, and `layout/streamTiers.test.ts` holds it.) Both are canvas
screens that wear no decoration (`CANVAS_SCREENS`, `NO_DECOR_SCREENS`) and geometry
only (`GEOMETRY_ONLY_SCREENS`): every rule of the canvas pass that reads the card
(the dress, the spill, the cover, the self-clip) reads the new figures, and the
contrast plan is unchanged. **Stated: the colour a look gives a figure at a tier is
read by the dress rule's ground read alone** (`moneyDressFaults`, which holds a
figure's ink against every paint under its glyphs), **not by the contrast pass**: the
contrast plan samples `broadcast`, where the figure is tier 3 on every look, and the
plate and ink of these screens are the plate and ink `broadcast` paints, but a rule
under `[data-tier='2']` that gives the figure another ink is sampled for contrast
nowhere.

**The quote card wears the same ladder** (the sixth review). `quoteCard` runs
`priceTier` over the whole figure with its unit and no `from`, and
`[data-tier]` sizes `[data-role='seller-price']` the same way, but every quote
fixture painted tier 0 (`broadcast-quotes` is a USD `$5.00`; the XEC quote is the
second card, which the cursor never lands on), and `streamTierRead` counted listing
cards only, so a rule under `[data-tier='1']`, `'2'` or `'3'` for the seller's figure
was measured by no pass. Four canvas fixtures paint an XEC quote at exponent 0, which
prints as `N XEC`, as the only quote of the stall:

| fixture | figure | characters | Modern, Neo, skeleton (5, 7, 9) | Rural (8, 10, 12) |
|---|---|---|---|---|
| `broadcast-quote-7` | `123 XEC` | 7 | tier 1 | 0 |
| `broadcast-quote-9` | `1,234 XEC` | 9 | tier 2 | tier 1 |
| `broadcast-quote-11` | `123,456 XEC` | 11 | tier 3 | tier 2 |
| `broadcast-quote-13` | `1,234,567 XEC` | 13 | tier 3 | tier 3 |

Four and not two, because no one length gives a look all three tiers and the two
ladders differ: 9 and 13 alone (the critic's suggestion) leave Modern, Neo and the
skeleton with no tier 1 and Rural with no tier 2. Together they put **tiers 1, 2 and 3
on every look**. The same three lists as above (canvas, no decoration, geometry
only); the same colour caveat. **Counted per rail**: `streamTierRead` files a price
row that holds `price` under `listings` and one that holds `seller-price` under
`quotes` (`streamTierByClass[look][rail][tier]`), and `STREAM_TIERS_OWED` is keyed by
look and rail (`listings`: tier 2 on every look and tier 1 on Rural; `quotes`: tiers 1,
2 and 3 on every look), pinned by value, so a count under one rail does not stand in
for the other. The line prints both (`stream card tiers read: t-modern listings 2:1/3:4
quotes 0:1/1:1/2:1/3:2`). So a fixture that stopped painting a tier, or a ceiling that
moved one, fails the run. A look not named in the table (the kit's, a carried private
look's, whose ladder is its own) owes nothing. Tests:
`the-stream-card-is-painted-at-tiers-one-and-two` and
`the-quote-card-is-painted-at-tiers-one-two-and-three`
(`layout/streamTiers.test.ts`, by value, without a browser),
`owes the canvas pass the stream card's money tiers on every look it painted, per rail`
(`scripts/probe-coverage.test.mjs`). **Measured**: the listing fixtures were checked in
happy-dom and, with the rest of the fifth round, by one `pnpm test:layout` on 2026-10-26
(below, "The fifth review's round"); the four quote fixtures in happy-dom, and by the
sixth review's round (below, "The sixth review's round").

## The staged address screens are sampled for the looks that name `[data-copied]` (the lint-belts critic's fifth review, ranked item 4)

`addr-shown` and `addr-copied` are geometry only: they paint the address box in the
two states only a press reaches and measure a rule under `[data-copied]` at rest. A
custom property such a rule sets can feed a paint, and no contrast job read one.
They are sampled now (`COPIED_JOBS`, `layout/contrastPlan.ts`) for each measured look
whose sheet names `[data-copied]` and for no other, **bare and fully worn, at the
phone and the desk** (a page screen paints at neither wall nor canvas). No public
look names the attribute and the tracked private fixture does not, so a default run's
plan is unchanged (796 jobs with the fixture); a private look that does gets, at the
phone and at the desk, the two screens bare and all worn once for each of its moods.
The jobs are planned for any carried look whose sheet names `[data-copied]`.
**Derived, never listed**: the page answers "does this look's sheet name it" from the
stylesheets it loaded (`layout/sheetNaming.ts`, `loadedSheetNames`: a rule whose
selector holds the look's class and the attribute, a media block entered), because the
worn-only sheets are `<link>`s the app's loader put on the page and the bundled
looks' rules are in the entry CSS; `contrastScreens` and `contrastPlan` take that
predicate (`NamesCopied`) and default to none. **And the runner holds the page to the
sheets as served**: it reads the same sheets as text with the look lint's reader
(`sheetNamesAttribute`, `NAMES_COPIED` in `scripts/layout-check.mjs`) and fails a
run whose list, the page's list (`window.__namesCopied()`) and the classes the plan
samples `window.__copiedScreens` for differ
(`the-plan-follows-the-sheets-that-name-data-copied`), so a CSSOM that serialised a
selector another way cannot plan nothing and read green over it. The jobs are the
staged screens' own (`paint` stages them, so a job's capture holds the pressed
state). Tests: `the-staged-address-screens-are-sampled-for-the-looks-that-name-them`
(`layout/contrastPlan.test.ts`), `a-loaded-sheet-names-an-attribute-for-its-look`
(`layout/sheetNaming.test.ts`), `a-sheet-names-an-attribute-for-the-contrast-plan`
(`scripts/look-lint.test.mjs`).

## The sign's words never stand on each other, and `empty-pasted` (the 8g1 critic's P2-4)

**A rule, and the screen it was missing.** Every sign rule read one line at
a time — a line whole in its own box, uncut by every clip, uncovered when it
is protected — so two lines a look placed in one cell, each whole, painted
through each other with every rule green.
`the-signs-words-never-stand-on-each-other` (`signWordsFaults` in
`probe.ts`) reads the sign's words as **lines**: each element in the sign
that owns text and has no text-owning ancestor inside it (`signLines`: the
name with its lamp, a tagline, the state line, an invite, each of the
address's spans), and holds every pair to ink that meets by no more than a
pixel each way. The ink is the name rule's own model (`inkLines`, the
glyphs' reach about the baseline), never a text rect: under a tight
line-height the content area runs past the line's slot, and two stacked
lines would meet there with no glyph near. A line under `display: none`
paints no rect; one under `visibility` other than `visible` is skipped.
Every screen, look and variant of every geometry pass; not the door's deck
minis, not a turned wall.

**`empty-pasted`** is the seller's first screen after naming the stall and
before listing: an empty book reached by their own paste (`pasted`), no
tagline, no announcement — so the sign holds the empty stall's state line
(`EMPTY_SUB`) and the tagline invite together, which no screen painted
(`sparse-pasted` carries the invite with no state line: `paintOffers` gives
the count to the tab). `STATE_SCREENS` and `GEOMETRY_ONLY_SCREENS`: the
notice invite's words are sampled on `sparse-pasted` where a rain falls
behind them, the empty block's ink on `empty`; the tagline invite is no
contrast target anywhere, stated.

Owed (`probe-coverage.mjs`, `the-8g1-states-owe-their-subjects`): every
look a page pass painted owes pairs of sign lines compared, and a pass that
measured `empty-pasted` the tagline invite read in the sign
(`signWordsByClass`).

Red proof: the private look at 0x04 at `b94be54`, selected — `empty-pasted`
fails `the-signs-words-never-stand-on-each-other` at 390x844 and 1280x900.
Green on the three shipped looks, the skeleton and the tracked fixture at
both widths, every screen.

## The item face at long figures: `item-listing-long-figure` and `item-quote-long-figure` (the 8g1 critic's P2-1)

Two fixture screens, no new rule. The rows step their figure down through
`priceTier`; the item face prints its figure at one size, and the rows'
`100,000,000` stress never reached it. `item-listing-long-figure` is the
listing face over `LONGEST_ASK_SATS` (`100,000,000,000` XEC, 15 characters,
`from` beside it); `item-quote-long-figure` the quote face over
`LONGEST_QUOTE` (`SAR999,999,999.99`, 17 characters in the unit whose sign
leaves the figure no break opportunity — `withSymbol` writes a leading sign
with no space). `STATE_SCREENS` and `GEOMETRY_ONLY_SCREENS`: their ink is
`item-listing`'s and `item-quote`'s. What catches a spill is the rules that
were already there — `text-spills`, the sideways scroll, `cutSideways`,
`coveredBy` — once a screen stages it.

**Each figure is the longest every shipped look's face holds at 390, not
the longest a record carries, and that is a finding about the shipped
looks** (measured 2026-10-12, the shipped looks, the skeleton and the
tracked fixture, 390x844 and 1280x900): the listing face holds 15
characters on every look and spills at 17 on Rural and at 18 on Rural and
Neo (`text-spills`, and on Neo the panel scrolls sideways); the quote face
holds 17 and spills at 19 on every look, and the editor writes up to 29
(`SAR184,467,440,737,095,516.15`, eight bytes of amount). The desk holds
all of them. A ladder for the face's figure, or a wrap, is the owner's
call; the fixtures move to the record's longest when it lands. **It landed
on 2026-10-13** ("The narrow phone", below): the two screens carry the
record's longest now — 26 characters of asked amount and a 30-character XEC
quote — and the paragraph above is the measurement that asked for it.

Red proof: the private look at 0x04 at `b94be54`, selected — at 390x844,
8 failures on `item-listing-long-figure` (`asked amount is covered` among
them) and 2 on `item-quote-long-figure` (`text-spills`); 0 at 1280x900.
Green on the three shipped looks, the skeleton and the tracked fixture at
both widths.

## A sticky sign fits the region it sticks in, measured on short screens too (the 8g1 critic's P2-2)

**A rule.** `a-sticky-sign-covers-nothing-as-the-region-scrolls` asked
what passes under a sticky sign, never whether the sign fits where it
sticks. A sticky box stays at its inset while the region scrolls, so a box
taller than the region's showing part keeps its last pixels — on a sign,
the address, and on a short enough screen the name — off screen at every
scroll but the region's end, where its containing block finally carries it
up. Every other rule reads that as fine: the address is reachable, the
name whole at rest. `a-sticky-sign-fits-its-region` (in
`stickyScrollFaults`) holds a sticky subject's height at rest to the
region's showing part (the scroller's box inside the viewport, or the
viewport for the page) less the box's own top and bottom insets, a pixel
allowed — on every geometry pass, wherever the scroll pass finds a sticky
subject.

**A pass.** The page passes measure 844 and 900 tall alone, and a sign
that fits both may not fit a shorter screen. The short pass
(`SHORT_VIEWPORTS` in `layout-check.mjs`: 375x667 from the phone pass,
1280x720 from the desk pass) runs after the tablet pass, for
the look classes the page pass at its width found a sticky sign on
(`stickyByClass`), handed to the page as `?sticky=` (`layout/probe.ts`'s
`STICKY_ONLY`). The page measures those looks alone, every screen and
variant of the page pass's split, and on each paint only where the sign
is sticky there: the scroll pass, the fit and
`the-sellers-name-stands-whole`. The billboard, the try-on's stress names
and the record road are the page passes' and do not run. A run whose page
passes found no sticky sign skips the pass and says so (`·` line); a look
handed to it that it finds no sticky sign on, or reads no sign line of,
fails as a rule that compared nothing. Its line prints its time and its
paints measured and set aside.

**What 375x667 and 1280x720 are, and what the pass does not measure** (the
8g1 re-review's P2-2). They are device screen sizes, not browser viewports.
The probe emulates with `mobile: false`, no browser chrome, so a viewport
with its toolbars up is shorter than either: the critic's figure for an
iPhone SE with Safari's toolbars is about 548px tall (from memory,
unmeasured here), and a laptop window on a 1280x720 screen is shorter than
720 (about 610–650 by the critic's memory). The stall never scrolls the document (`.stall-scroll` scrolls), so a
phone's toolbars stay up. Also not measured:

- **A landscape phone (844x390).** It takes the desk rules and is in no
  pass. The tracked fixture `t-fixture-private` would fail there: the
  critic, reading it through the probe page's `?sticky=` (not through a
  runner pass), found 42 failures over 4 screens
  (`a-sticky-sign-fits-its-region` and `the-sellers-name-stands-whole`),
  where it fits 1280x720, 1366x657 and 1024x600. Adding 844x390 turns the
  default run red on the fixture until the fixture changes, and a look has
  no way to drop sticky on a short screen (`LOOK_MEDIA` has no height
  condition) — only to cap the sign and let it scroll inside itself. The
  owner's call.
- **A look sticky only under a condition the phone and desk passes do not
  enter.** The pass measures only the looks those two passes found sticky
  (`stickySeen`, from their `stickyByClass`), so a look sticky only under
  some condition they do not enter is handed to no short pass. A
  reduced-motion block is one: the look lint admits a sticky sign there,
  and the reduced-motion pass does not hand its findings on.
- A turned wall.

Cost: the shipped looks and the skeleton have no sticky sign, so a run
that carries no sticky look pays nothing. The tracked fixture's sign is
sticky at the desk alone: the default run measures it at 1280x720 (137
paints, about 2 s by the scratch harness) and skips 375x667. The fixture
fits at 1280x720: its sign is green there.

Red proof: the private look at 0x04 at `b94be54`, selected —
`a-sticky-sign-fits-its-region` fails 52 paints at 375x667 and 55 at
1280x720, and `a-sticky-sign-covers-nothing-as-the-region-scrolls` 8 more
at 375x667; `the-sellers-name-stands-whole` holds at both.

## No slack where the line clips itself (the 8g1 critic's P2-3)

`the-sellers-name-stands-whole` gave every clip a pixel of rounding
(`lineCut`'s `clipTo`). A line whose own box clips (`overflow` other than
`visible`, or `contain: paint`, on the line itself) cuts whatever ink runs
past that box, and the pixel let a look's own clip shave a stacked mark
flat with the rule green (the red proof below): on `stacked-name` the
critic's pixels changed in the one device column past the box.

**The rule now reads the line's own clip with no slack across its lines**
(`OWN_CLIP_SLACK`, a hundredth of a pixel of float noise): on the line's
block axis — its height for a horizontal line, its width for a vertical
one, where `inkLines` reads the glyphs' measured reach about the baseline.
Along the line the pixel stays: there the model reads the advance, not the
glyphs, and an advance meets its box at a rounded edge (measured: the
tracked fixture's advance ran 0.23px past its own box on `invalid` at
390). Every other clip keeps its pixel. The message says how far past, to
the hundredth.

**Why the model and not pixels.** The pixel read — lift the clip in a frame
and fail on any changed pixel outside the box — is the stronger one, and
the contrast pass's look-pseudo frames are its machinery; but the sign's
stress screens, where stacked marks are painted, are geometry only, and
shooting every sign that clips itself on every screen is a frame pair a
paint, on every paint of such a look. The model's read costs nothing and
caught the critic's case at both widths.

**What it does NOT catch** (the 8g1 re-review's near-misses A–D). This is a
read of a model, not of pixels, and each of these is a shape any look
could take: the critic ran each through the real probe, which read green,
while lifting the clip changed real pixels of the line.

- **A. A cut by `clip-path: inset(0)` on the line rather than by
  `overflow`.** Only an `overflow` or `contain: paint` clip on the line
  itself is read with no slack. An `inset()` on the line goes through the
  same walk with its pixel (`lineCut`'s shape branch), and a circle or an
  ellipse keeps its own (`shapeOf`'s `rx + 1`).
- **B. The box edge taken from an integer.** The padding box is
  `clientWidth` and `clientHeight` (`paddingBox`, `src/ui/signInk.ts`), so
  the edge the ink is compared with can sit up to half a pixel from the
  painted one, and an ink past the painted edge by less than that reads
  inside.
- **C. Upright CJK in vertical writing.** The painted ink sits 1.3–2.2px off
  the ink model's box (measured on the `cjk-name` screen, 390 at DPR 3 and
  1280 at DPR 2); the model is shifted, not widened, so zero slack on the
  block axis is below the model's own error there.
- **D. The inline axis reads the advance, not the ink.** It keeps its
  pixel, and a glyph that overhangs its advance (an italic last letter) is
  not read at all: a clip on the line can slice it with the rule green.

Beyond them: any glyph the model under-measures. The name ladder (`inkFits`,
`src/ui/signInk.ts`) keeps the same rounded box and its pixel, so a
seller's name no screen paints can stop on a rung that shaves it; only the
fixtures' names are held. Nothing in public CI proves the strict branch
fires at its edge: the tracked fixture now sits well inside its box, and
the red proof below exists only in a private run.

**A pixel read on the sign is the stronger guard, and it is not built**:
for a sign line whose own box clips (`overflow`, `contain: paint` or any
`clip-path`), lift the clip and compare a crop of the sign column, not a
full frame. Its cost against the pass is unmeasured (the critic's guess: a
crop capture is a few milliseconds, so seconds, not a pass). Until it is
built, this rule is the model's.

**The tracked fixture gave its name room** (`padding-block` 0.2em → 0.3em,
its sheet): at the wall's 14px rung its stacked marks ran 0.68 of a pixel
past 0.2em — inside the old pixel, outside no slack — on
`shop-window-stacked-name` at 1280x900, 1080x1920 and 768x1024. The ladder
(`inkFits`, `src/ui/signInk.ts`) keeps its pixel: it is the app's, and a
rung the probe now refuses is the look's to give room to, not the
ladder's to climb past. So a look whose ink lands in that last pixel stops
on a rung the probe fails; CLAUDE.md's "the ladder climbs exactly until the
probe would call the name whole" holds everywhere but that pixel, stated.

Owed: the tracked fixture's name clips itself, so a run that carries it
owes a line read under its own clip on both page passes
(`nameOwnClipByClass`, `probe-coverage.mjs`).

Red proof: the private look at 0x04 at `b94be54`, selected —
`stacked-name` fails at 390x844 and at 1280x900, and the name sheet's
try-on with the stacked-mark name at both; green before this change. The
shipped looks and the skeleton clip no sign line, so the rule changes
nothing for them.

## A carried look's line skips, printed per screen (the 8g1 critic's P3-1)

`CARRIED_LINE_SKIP_CEILING` holds one sum per viewport and kind, so a new
clipped line on one screen and one fewer on another read the same sum and
the run green, and the ceiling's own comment could name the wrong screens
for its count (it did: one carried look's entry named the wrong screens
for its phone skips). Every run that carries a private look now prints, beside
the carried tallies, each carried look's skips per viewport and screen
(`skipsByScreen`, `skipsByScreenLine` in `scripts/look-tallies.mjs`, over
the contrast pass's job records; a job counts for a look when the stall it
painted wore the look's class). Printed on every run, faults or none.
Test: `a-carried-looks-skips-are-printed-per-screen`.

Not changed: the ceiling's shape. Keying it by screen would make each
screen's count exact and fail the case above, at the cost of a table that
moves with every slice of a look being ported — recommended once the
private look at 0x04's port stops moving the screens its counts fall on,
not before.

## The narrow phone (2026-10-13; the 8g1 critic's P2-3 and P2-4, the owner's D-2026-10-13-02)

Every page pass ran at 390 and wider, so whatever held at 390 and not at 360
went unseen. Three things did not hold at 360 on main (measured that day on
the three shipped looks, the skeleton and the tracked fixture): the item
face's figure spilled from 16 characters on Neo (`item-quote-long-figure`,
17 characters, spilled on every look), every pay code painted narrower than
`PAY_QR_NARROWEST_PX` (308), and Rural's row name column fell under its 64px
floor. A pass, a ladder, a rule and a gate.

### The pass

`narrow`, 360x800, `?screens=` over `NARROW_SCREENS` in `layout-check.mjs`:
geometry only, no contrast. The rows (`unbuyable` and the selection strip:
`pay-several-strip`, `pay-several-strip-xec`, `pay-several-ask`), the item
faces (`item-listing`, `item-quote`, `item-unbuyable-fold`,
`item-listing-long-figure`, `item-quote-long-figure`), the pay sheet (`pay`,
`pay-xec`, `pay-moved`, `pay-dust`, `pay-long-figure`), Pay several
(`pay-several`, `pay-several-long-figure`) and the rest of the money set on
a phone (`activity`'s receipt amount, `describe` and `publish-name`'s
record hex, `pay-tag`'s figure on paper). The runner refuses a pass whose
page measured another width (`viewport`), another set of looks, private
looks the selection does not carry, fewer screens than it asked for, or a
pay screen that mounted no seller's figure, and holds it to the coverage it
owes (`probeCoverageGaps('narrow', …)`: a look's sheet read on every look,
a mark read hidden on every public look, and every step of the card
figures below). Measured 4.6s of a 158.5s run (2026-10-13; the target was
30–40s); 5.1s of 150.7s with round 2's eleven screens.

**Round 2 (the critic's P2-2 and P2-6)** adds the card ladder's every step
at its widest — `item-listing-figure-14`, `-17`, `-21` (the listing face,
whose fold carries "You pay" at the same tier), `item-quote-figure-14`,
`-17`, `-21` (`₩9,999,999,999`, `元9,999,999,999.99`,
`元9,999,999,999,999.99`: signs the faces do not draw, painted by the
machine's fallback at about 1em), `pay-figure-14` and `-17`, and
`pay-several-figure-lines` (a 17-character line beside its name and an
18-character one on its own row) — and the rows at the longest figures,
`row-longest-figure` (an eight-byte asked amount) and
`quote-row-longest-figure` (an eight-byte XEC quote). Each is a state
screen, geometry only, so the phone (390) and desk (1280) passes paint
them too.

**Rural's narrow rows (round 3, D-2026-10-13-04, the owner's option
(b)).** In round 2 `offers`, `plugin-missing-quotes`, `quotes-signs` and
`pay-inr` were off this pass on every look: at 360 Rural's row name column
on them fell to 44–60px, under the name-floor rule's 64 (`from 1,200` 58px,
`100,000,000` 55, `$5.00` 60, `₩12,000` 44, `₹499.00` 52, `₪35.00` 57,
`₱250.00` and `₺120.00` 50 — 224 failures), and at 375 the `₩12,000` row
was 59px (14 failures); 384 and 390 were clear. Rural's tag spends about
39px on its notch, padding and border, and the rows' ladder
(`tierCeilings`) was measured at 390. Now Rural's row carries `narrowTag:
'own-row'`, the renderer writes it on the stall's root as
`data-narrow-tag` (`dressLook`; `STATE_ATTRIBUTES`, held to its writer in
`a-look-cannot-target-one-seller`), and stall.css gives a tier-1 or tier-2
tag the tier-3 dress under `max-width: 389.98px` — a row of its own under
the name, the quote head's with Pay, a quote row in selection mode with
none. Never a look sheet's media condition (`LOOK_MEDIA` stops at the
probe's passes, and a fourth would reach every private look). The four
screens are back on this pass for every look, with 0 failures. **The
cost, stated:** 57 Rural rows in the showroom take their tag onto a row of
their own at 360, `from 1,200` among them, 55 of which fit at 375 without
it; nothing moves at 390, and Modern's and Neo's rows never move.

**Round 3 also adds** (the critic's re-review): the rows either side of the
re-flow's cut (`quote-row-1m`, `row-15-16`, `row-17`, `quote-row-18`,
`row-21`, below) and the selection strip at the longest total
(`pay-several-strip-long-figure`). 41 screens. **Round 4 adds** the strip's
total at 18 and 21 characters (`pay-several-strip-18`, `-21`), the pay sheet
over the eight-byte quote (`pay-longest-figure`) and Pay several over it
with both items the stall's own (`pay-several-longest-figure`): 45 screens,
6.8s of a 211.6s run.

### The ladder

`CARD_FIGURE_CEILINGS` (14, 17, 21 characters) and `cardFigureTier` in
`render.ts`: the item face's figure, both pay sheets' figure (the XEC the
wallet signs) step down 34/36 → 26 → 21 → 18px, the floor in stall.css
(`.face-x:where([data-price-tier='N']) .x`, `.pay-x:where(…) .pay-x-n`, at
the base rules' own weight and after them, phones only). Character count,
one table for every look: no look sizes these figures. Measured at 360 on
every unit `QUOTE_UNITS` writes, at each step's longest figure, against the
row's content width (face: Modern 286, Neo 298, Rural 286, the fixture 286;
pay: 302, 304, 294, 302):

| step | face, widest | pay, widest |
|---|---|---|
| ≤14 at 34/36px (unchanged) | Neo `₩9,999,999,999` 311 of 298, Rural 289 of 286 | Neo 313 of 304 |
| ≤17 at 26px | Neo `元9,999,999,999.99` 285 of 298, Rural `HK$999,999,999.99` 267 of 286 | Neo 274 of 304 |
| ≤21 at 21px | Neo `元9,999,999,999,999.99` 282 of 298, Rural 264 | Neo 273 of 304 |

Neo's mono is 0.62em a character; a sign its face does not draw (`元`, `₩`)
comes from the machine's fallback at about 1em, which is why 28 and 22px,
tried first, left `元` 9px past the face's row at 17 characters. Past 21
the figure is 18px and the row re-flows as one line of text, at every
width: the figure may break after a comma and nowhere else (`<wbr>` written
by `moneyFigure`, textContent unchanged), the last group stays whole with a
trailing sign or ` XEC` (`.fig-end`, nowrap), and `from` and the unit ride
the first and last lines because nothing breaks between a letter and a
digit. At a desk the figure keeps its design size and breaks only where the
row is narrower than it (680, and the pay dialog's 484–502px at 1280, which
main cut at 25 characters: 41 desk failures). A Pay several line whose
figure is past 17 takes a row of its own under the name — on a phone only
since round 2 (the critic's P3-2: at a desk the sheet has the room, and an
18-character line had moved to its own row at 1280) — and the total's
figure breaks after a comma past 21.

**"You pay" is on the ladder** (round 2, the critic's P2-1). The face's
fold carries the same figure in "You pay" (`.row.big dd`, its own size
`--s-paid-size`, 21–27px), which round 1 only broke past 21: at 360 an
18-character figure was cut 17px on Rural and a 21-character one 31–61px,
and at 390 31px on Rural. The row now carries the figure's tier
(`sheetRow`, `cardFigureTier`), and on a phone the dd steps to 20, 17 and
15px, each capped at the look's own `--s-paid-size` (`min()`): tier 0 is a
value of the look's row, which `lookData` takes up to 2000px, so the floor
must never grow a smaller one. It shares its line with the words "You
pay", so its steps are smaller than the card figure's. Past 21 it breaks
after a comma. A unit may still wrap under its figure (" XEC" alone on the
dd's second line): whole, and as it was at tier 0 on main.

**Rows keep their leading digits** (round 2, the critic's P2-6;
pre-existing; **the cut moved in round 3**, P1-1). A row's figure is
`nowrap` inside an end-aligned flex cell, so a figure wider than its row
grew to the left and lost its most significant digits: the eight-byte
asked amount read `,467,440,737,095,516.15` with `184` and `from` gone on
Neo at 360, and an eight-byte XEC quote row read `.84,467,…` at 390 on
every look. On the rows' last rung (the row's own `tierCeilings`), a
figure at or past its kind's cut — **17 characters for a listing, 18 for a
quote**, counted as the row prints it (`ROW_REFLOW_LISTING_CHARS`,
`ROW_REFLOW_QUOTE_CHARS`; a listing's figure without `from` or ` XEC`, a
quote's with its sign or unit) — re-flows as one block of text
(`.item-a.fig-wraps`): a block's line that cannot fit overflows at its
end, so whatever is lost is the tail and never the head; and **from 21**
(`ROW_BREAK_CHARS`) it also breaks after a comma like the face's
(`moneyFigure`), with the one `role="img"` name that needs. Its line is
1.3, as on the face's last rung: as a flex item the figure was a block one
line-height tall, inline its glyphs' box (Lora's is 1.28em) stood past a
1.05 line into the tag's clip, and Rural's swaying tag cut its corners at
a desk. **At a desk too**: the rows read no ladder there, and such a figure
at its design size pinned the price column's `auto` track — the XEC quote
row left Neo's name 28px and Rural's 19, and Rural's tag clipped the asked
amount's tail — so a re-flowed row takes the own-row dress at every width,
on the desk grids' four columns (`'ic name name caret' 'price price price
price'`, the quote head's with Pay; a quote row in selection mode keeps
its own tier-3 rule). **Why the cut** (the critic's re-review, P1-1):
round 2 re-flowed from 15 characters counted with the unit, so a
1,000,000.00 XEC quote (16, about $20–30) left its name's line at 680 and
1280 — 98 → 158px on Modern, 94.5 → 154 on Neo, 106 → 184 on Rural — grew
5px at 360 and 390, and read "image" to a screen reader. The cut is where a
row first failed on main: a quote at 18 (`100,000,000.00 XEC`, Rural at
680), a listing at 17 (Rural at 680; at 360 the first listing failure is
at 21, which is where the break starts). Every row under the cut is the
row main paints, at every width (`quote-row-1m`, `row-15-16`, held by
`looks:diff`).

**The selection strip** (round 3, the critic's P2-2, pre-existing): the
strip's total (`selection-total`) and a chosen row's line
(`selection-figure`) break each figure after a comma (`moneyFigure`,
`moneyLine`), and the total's block aligns `safe flex-end` so an overflow
loses its tail. On main an eight-byte total started 4–16px off the left
edge at 360 and was cut by the tray at 390 on Neo and Rural, and its line
ran under the stepper on Neo (`pay-several-strip-long-figure`). **From 18
characters since round 4** (`STRIP_BREAK_CHARS`, the critic's P3-4): round
3 broke past 21 and let the total wrap before its unit, so a total of 18
to 21 characters left ` XEC` alone on its line — read line by line on
round 3's code, `100,000,000.00` / `XEC` on Neo and Rural at 360 and on Neo
at 375, and `10,000,000,000.00` / `XEC` on every look at 360, 375 and 390.
Broken from 18, the last group keeps its unit (`100,000,` / `000.00 XEC`,
`10,000,000,` / `000.00 XEC`), and an 18-character total that fits its
line at 390 is one line as before (`pay-several-strip-18`, `-21`).

**The wall's rows** (round 3, the critic's P2-3, pre-existing):
`window.ts` built its rows' figures as plain `nowrap` text. They take the
shop's rule now (`rowFigure` at the shop's cuts, the break from 21), and
in Browse a re-flowed row's tag moves under the name ('ic name' / 'ic
price'; a touch wall's with its stepper). On the counter tablet the row
fails sooner — a listing spilled at **14** characters on every look, a
`10,000,000.00 XEC` quote (**17**) lost its ` XEC` on Neo and Rural — so
from the wall's own cuts (`WALL_NARROW_LISTING_CHARS`,
`WALL_NARROW_QUOTE_CHARS`, `fig-narrow`) the tag takes the whole row under
the picture there, and a re-flowed figure steps to 30px (an eight-byte
quote at 46px was three lines, taller than the 129px of list a touch wall
leaves). Fixtures `shop-window-browse-long-figures`,
`shop-window-quotes-long-figures` (the desk), `shop-window-wall-browse-long-figures`
and `shop-window-touch-quotes-long-figures` (the 1920 wall), all four on
the tall and tablet passes.

**The Cycle card is not a row** (round 4, the critic's P1-1). Round 3 said
"the Cycle card is not changed", and it was: `wallFigure` gave the Cycle
card's figure `fig-wraps` too, and stall.css's desk own-row block (three
rules at (0,5,0), not scoped to the shop) out-ranked the card's own grid
(0,4,0), so from 17 characters for a listing and 18 for a quote the card
took `'ic name name pay' / 'price price price price'` over its two
columns: at 1920x1080 Neo printed `100,000,000.00 XEC` as
",000,000.00 XEC", and Rural put the code under the screen. Now the card's
figure is the plain text main writes, at every length (`wallFigure` takes
`cycle`), and the desk block is the shop's alone
(`.stall:not(.shop-window)`), which also takes the shop's four-column
areas off the tall Browse wall. Fixtures either side of the cuts —
`shop-window-cycle-listing-16`, `-17`, `-18` and `shop-window-cycle-quote-16`
to `-19` — on the canvas pass (`a-cycle-card-keeps-its-grid-at-the-cut`).
Measured on the probe page with these screens and a 19-character listing:
at 1920x1080 round 3 gave 377 failures on the seven, the fix 0; at
1280x800, 1080x1920 and 768x1024 the fix's counts equal main's (653, 916,
964; round 3 666, 813, 1,588). They are not on the tall and tablet
passes (`CANVAS_ONLY_WALL_SCREENS`, printed on both): the card overruns
there at these lengths on main too, which is the next section.

The cost on the shipped looks: none for a figure of 14 characters or fewer
(`looks:diff`); and at 360 a 14-character figure still runs into its card's
padding where it is widest, cut by nothing — 8.5px of the pay card's 14 on
Neo, 13.3px of the face's 18 on Neo for `₩9,999,999,999`, 2.5px on Rural —
which the rule reads against the card's padding box at tier 0 (below).

The fixtures move to the real maxima: `LONGEST_ASK_SATS` is the largest
eight-byte amount (`184,467,440,737,095,516.15`, 26 characters, `from`
beside it), `LONGEST_QUOTE` an XEC quote at that amount (30 characters, the
longest `quoteFigure` the editor can write), `pay-long-figure` the largest
realistic sum (`LONGEST_PAY_QUOTE`, $447,280,000.00 at $0.0000213 a XEC:
`20,999,061,032,863.85`, under the whole XEC supply), and
`pay-several-long-figure` two XEC quotes at the eight-byte maximum (figure
25 characters, lines 30, total 30 in its sentence).

### The rule: `a-card-figure-stands-inside-its-row`

Every line box of the face's figure, the face's "You pay" figure (place
`paid`), a pay sheet's figure, a Pay several line's figure and the Pay
several total stands inside its row's content box (the total's own).
Stricter than `text-spills`, which tolerates a box poking into its parent's
padding — the first stage of the critic's finding. Run on every pass.

**Tier 0 is read against the card's padding box** (round 2, the critic's
P2-3; the window chose its option (b)). The owner's line keeps every figure
of 14 characters or fewer at its design size, and at 360 the widest of them
runs into its card's padding, cut by nothing: every 14-character pay figure
on Neo (tabular mono, 14 × 0.62 × 36px = 312 in a 304px row) 8.5px into
the pay card's 14 — a $2k–$21k payment — and `₩9,999,999,999` on the face
13.3px into Neo's 18 and 2.5px on Rural. So on the three places that line
governs — the face's figure, "You pay" and a pay figure (`TIER_0_IN_CARD`)
— tier 0 stands inside its card's padding box (`.card`, or the pay card
`.pay-amt`), the way `text-spills` reads a box; tiers 1–3, where the ladder
makes a promise, keep the strict read of the row's content box. A Pay
several line and the total keep the strict read at every length: a line
carries a tier only from 18 characters (a 15–17-character line still sits
beside its name and reads as tier 0), and the total carries none.

**Owed on every step** (round 2, the critic's P2-2). Counted per look and
per place:tier (`cardFigureByClass`), the narrow pass **and the phone pass
at 390** owe, on every look they painted, `face:0`–`face:3`,
`paid:0`–`paid:3`, `pay:0`–`pay:3`, and `line:0`, `line:2` and `line:3`
(`CARD_FIGURES_OWED`, `scripts/probe-coverage.mjs`; a line has no
`line:1`). A step no fixture paints is a gap that fails the run, never a
pass. The pass's line prints what it read (`card figures read: …`).

**And the cover check reads a broken figure line by line.** `coveredBy`
took five points on the node's bounding box; a figure broken over two lines
of unequal length leaves an empty corner in that box, which hit the row and
read as the figure covered by its own row (`asked amount is covered … by
div.face-x`, the first run). It takes five points on each line box when a
node has more than one, and the box itself otherwise, so every single-box
node is read exactly as before.

### A card figure steps down on every look: `a-card-figure-steps-down-on-every-look` (round 2, the critic's P2-4)

The static guard (`every-look-that-sizes-its-figure-sizes-every-price-tier
— the face and the pay sheets`) reads two selector shapes and one property,
and the critic found seven legal look rules it returned `[]` for, each
out-ranking the floor and freezing the figure at every tier:
`.face-x .x { font: 700 40px/1 Inter }`, `.pay-q {…}`, `.x {…}`,
`.face-x > span {…}`, `.pay-amt .pay-x span:first-child {…}`,
`[data-role='price'] {…}` and `.pay-x-n { font: 700 44px Inter }`. So the
painted size is held instead, whatever selector set it: on a phone pass,
per look and per figure the ladder steps (`CARD_LADDER_FIGURES`:
`face:price`, `face:seller-price`, `paid:figure` for "You pay",
`pay:price`), every paint records the smallest and largest computed
`font-size` at each tier (`cardLadderSizes`), **each variant on its own**
(round 3), and at the end of the page no tier may paint larger than the
smallest size the tier before it painted, and the last tier must be
smaller than tier 0 — **unless tier 0 is already at or under the floor's
own last step** (`CARD_LADDER_LAST_STEP` in `layout/cardLadder.ts`, held
to stall.css's floor by `the-ladders-last-step-is-the-sheets-floor` since
round 4, the critic's P3-2: 18px for the face and the pay figure, 15px for
"You pay"), where a figure has no smaller step to take and the fit rule
alone judges it. What it compared is reported per look and
figure as the most tiers one variant read (`cardLadderByClass`, `"0123"`:
the ladder fixtures are state screens, painted bare and fully worn), and
the narrow and phone passes owe all four figures over all four tiers on
every look (`CARD_LADDERS_OWED`, by name — a fifth figure never stands in
for a missing one). Desk widths keep the design size and are not read. The
static guard stays as it was: it names the selectors the floor uses; this
holds any.

**Two misfires, fixed in round 3** (the critic's re-review, P3-1): merged
into one range per tier, a worn variant sizing the face figure 18px at
every tier (`.t-modern.att-awning .face-x .x`) read as "grows from tier 0
to tier 1 (tier 0 18–34px …)", 6 failures with every figure fitting; and a
look row whose `paid` is 14px (`lookData` takes 0–2000), every step
`min(Npx, 14px)`, read as "takes no smaller step", on Modern and the
skeleton. Both give 0 failures now, at 360 and 390, and the seven shapes
above are each still red, on the bare and the worn variant.

### One name to a screen reader (round 2, the critic's P3-1)

Each `<wbr>` splits a broken figure's text, and Chrome's accessibility tree
held it as one StaticText per group of digits (six for an eight-byte
figure) that a reader stepping by element could announce as six numbers.
A broken figure is now one `span.fig-say[role=img]` named by the whole
figure (`aria-label`), its pieces in an `aria-hidden` span under it; the
money node still holds the figure in one element, `textContent` unchanged.
Read with CDP `Accessibility.getPartialAXTree` on the node, on every look
at 360: one `image` node named `184,467,440,737,095,516.15 XEC` (the
quote's face and the quote row), `184,467,440,737,095,516.15` (the asked
amount on the face and on the listing row, whose button's name reads the
whole figure), `368,934,881,474,191,032.3` (Pay several's figure), and the
total's sentence as text around one image — no piece of any figure as
text. The cost: a reader says "image". `role="img"` is the role every
reader honours a name on; a name on a generic span is one some readers
ignore, which with the pieces hidden would read nothing. Not tried with
VoiceOver or TalkBack. Because the pieces are `aria-hidden`, the type
floor names `.fig-say` among its raised nodes (`FLOOR_NAMED`), so a broken
figure is still held to 11px. Test: `names a broken figure once for a
screen reader` in `a-card-figure-steps-down-and-breaks-only-after-a-comma`.

### A broken figure paints every digit: `a-broken-figure-paints-every-digit` (round 3, the critic's P2-1)

Every fixture that painted a broken figure was geometry only, and the
money box's own read cannot see its digits: it compares the node's
computed ink with the blanked ground, so a look that hid a broken figure's
pieces (`.t-modern .fig-say > span { visibility: hidden }`) or made its last
group transparent (`.t-neo .fig-end { color: transparent }`) passed the
whole runner — while a screen reader, which reads the one `role="img"`
name, still heard the figure. Now `quote-row-longest-figure` (an eight-byte
XEC quote on its quote row: broken after its commas at the phone, re-flowed
onto its own row at the desk — `.fig-say`, `.fig-end` and `.fig-wraps` on
one screen) is on the contrast plan at the phone and the desk, every look
bare and worn (`BROKEN_FIGURE_SCREEN`; +7 jobs a viewport on the public
plan, 571; 715 with the tracked fixture carried). On every job, every money
node holding a `.fig-say` carries its lines — every text node in it,
hidden ones included — each with the FIGURE's ink, never the piece's
(`digits`, `targetFor`), and the runner reads them on a capture with those
glyphs shown (`__contrastFigureGlyphs`, `digitRead`): at least
`RING_MASK_PER_CHAR` pixels a letter or digit that moved halfway from the
blanked capture toward the figure's ink, and every letter and digit of the
figure on some line. A failing read is taken again on a fresh pair before
it is believed. Every job of the screen owes the read (a verdict names the
jobs that did not), and the contrast line prints `N broken figure(s) read
digit by digit on M job(s)`: 18 on 18 at the public run with the fixture
carried, 2.7s. The ink of the broken figure is then read twice: the box
read (its computed ink against its ground), and this.

**Every surface, and contrast** (round 4, the critic's P2-2). Round 3's read
ran on the quote row alone; the face's, the pay sheet's, Pay several's and
the strip's broken figures were geometry only, and the critic's three
plants on them (Modern's face `.fig-end` transparent, Neo's `.pay-x` pieces
hidden, Rural's strip total's pieces hidden) passed the runner. Now five
screens are on the contrast plan for it, phone and desk, bare and worn
(`BROKEN_FIGURE_SCREENS`), each owing its figures by role: the quote row
(`seller-price`), the listing face (`item-listing-long-figure`, `price`),
the pay sheet over the eight-byte quote (`pay-longest-figure`, new:
`pay-long-figure`'s 21-character figure does not break; `price`), Pay
several over it with both items the stall's own
(`pay-several-longest-figure`, new: `price`, `pay-lines`, `pay-total`) and
the strip (`selection-total`). Not `pay-several-long-figure`: its second
item is another wallet's mint, the borrowed-id warning stands inside
`pay-lines` on a ground of its own, and the money box read, which reads that
container whole in the container's ink, took it at 2.94:1 on Rural worn —
against no glyph of that ink; that screen stays geometry only, stated.
+28 jobs a page viewport: 627 on the public plan, 787 with the tracked
fixture. Three changes to the read itself:

- **It reads contrast.** A line's glyph pixels (those that moved halfway
  toward the figure's ink) are each read against their own ground pixel,
  and a line passes with at least `RING_MASK_PER_CHAR` of them a digit and
  its strongest pixel a digit (the line's `chars`-th strongest) at
  `PIXEL_CONTRAST_FLOOR`, 3:1, the floor every money figure is held to. A
  piece painted faint enough to read under it fails though its pixels moved
  toward the ink. Measured: Modern's strip total in `#6f6f6f` with its
  pieces at 55% opacity read 2.19:1 (1.87 worn) and fails on contrast
  alone; Rural's pieces at 55% read 3.2:1 bare (over the floor, passing as
  a whole figure painted at 3.2:1 passes the box read) and 2.26–2.48:1 worn,
  which fail. The run prints the faintest piece: 4.01:1 unplanted.
- **Only the figure's own pieces**, each `.fig-say`'s lines in the ink of
  the node the figure is written into: Pay several's lines and the
  selection line hold words beside their figures, which round 3's first cut
  read toward the figure's ink (0.00:1 on a line of names).
- **A broken figure's box read takes its line boxes one by one**
  (`lineBoxes`): the union of an inline figure's lines is a rectangle that
  held the face's unblanked "from" (1.18–2.46:1 on the listing face).

Cost: 180 figures on 90 jobs, 19.0s of the contrast pass (round 3: 18 on
18, 2.7s).

**What it reads, and what it does not** (the critic's round-4 review,
P2-1). It reads each piece, a comma group or the figure's end, as a whole:
enough pixels moved toward the figure's ink, and the strongest of them at
3:1. It does not read each digit, so a piece only partly hidden passes.
Three plants the look lint and the kit lint both accept passed the whole
runner: a gradient mask over the face's last group (the figure read
"…095,51"), an inset clip on the pay sheet's last group (missed at 390),
and negative letter-spacing on the strip's last group. A mask over the
whole group was caught. A pixel floor on the figure's own ink would not
close this; a computed-style check would (every piece computes the money
node's colour, opacity, visibility, font and letter-spacing, with no mask,
clip, filter or transform). Built since, the owner's call taken
(D-2026-10-14-02: a look dresses a figure only as a whole):
`a-broken-figure-wears-the-figures-own-ink`, at the end of this file.

### Two reads corrected (round 3)

- **`coveredBy` reads a turned box in its own frame.** A box inside a
  turned ancestor answers its axis-aligned bounds, and their corners are
  not the box: a 750px Rural tag on the wall swaying 0.77° put the bounds'
  corners of a 21-character figure outside the tag it is drawn in, and the
  corner read as "asked amount is covered by div.item-head" though every
  glyph stood inside the tag. Each box's five points are now taken in its
  frame before the turn (`turnedBox`, the contrast pass's own) and turned
  back, so every point is a point of the box; an unturned box is read
  exactly as before. Red: a Rural name block laid over the turned figure
  (`.t-rural .item-b { position: relative; z-index: 3; padding-bottom:
  400px; margin-bottom: -400px }`) is still "covered … by span.item-b" on
  the wall at 1920 and 1080x1920.
- **`text-spills` reads a spill only where its clipper shows it.** The
  strip a block's words paint into ran the block's whole height, and the
  part a scroller hides (down the list, past the dock that stands outside
  it) was read as lying under the dock's tab: a 300px Rural card tilted
  0.6° bulges 1.6px a side, and `pay-several-strip-long-figure` failed "2px
  past its box, under button.tab" at 360 though the scroller ends 16px
  above the tab. The strip is cut to the clipper's box first. Red: Neo's
  quote labels planted 30px wide and `nowrap` still fail "span.item-b
  paints 19px past its box, under span.item-x" at 390.
  **Corrected in round 4** (the critic's P2-1): cut for every control, the
  strip of a block below the fold (wholly outside the scroller at scroll 0)
  lay under nothing, so words painted over the covenant's asked amount in
  the item face's fold passed every pass. The cut now applies to a control
  outside the clipper alone (`spillReach`, `layout/spillReach.ts`): one
  inside it scrolls with the spill and is read against the whole strip;
  the clipper is cut per axis, only where it clips. Not read, stated: a
  control outside the clipper's subtree standing over the clipper's own box
  is read against the strip as it shows at scroll 0. Test:
  `a-spill-below-the-fold-is-still-read`.
- **A box turned 45° or more** (round 4, the critic's P3-1): `turnedBox`
  solves a turned box from its bounds, and from 45° the system has no
  answer; it threw, and a look turning a figure that far stopped the probe
  page writing any verdict. Under 45° every read is unchanged; past it an
  element is read in its own frame by its layout size (`ownFrame`:
  `offsetWidth` × `offsetHeight`, which no transform touches, about its
  bounds' centre), and a line fragment the sampler cannot solve makes its
  target say `turned-too-far`, which fails the contrast pass by name.

### Red proofs (2026-10-13)

- **Main's render and stall.css under the new fixtures and pass** (a scratch
  clone, `git checkout 7d13c80 -- src/ui/render.ts src/ui/stall.css`, the
  real runner): narrow 1,356 failures (`text-spills` 747, `a pay code is
  narrower than the gate was told` 483, `the panel scrolls sideways` 90,
  `a-card-figure-stands-inside-its-row` 36) and 20 coverage gaps (no long
  card figure read on any look); mobile 801, desktop 41. Green with the
  ladder.
- **The old gate at 360**: `PAY_QR_NARROWEST_PX` at 308 over main's code
  box, the narrow screens through the probe page: 483 failures, every one
  `a pay code is narrower than the gate was told` (Modern 286, Neo 288,
  Rural 278, the skeleton and the fixture 286). The gate is 308, never 278:
  a gate of 278 was built and measured first and replaced by the wider code
  box below, which makes 308 true at 360.
- **The new rule alone**: the pay figure's tier 2 planted at 24px, so a
  21-character figure runs 8.5px into Neo's 14px card padding: 2 failures,
  both `a-card-figure-stands-inside-its-row` on Neo, and no `text-spills`.
- **The floor**: tier 2 taken out of stall.css: `sizes every step of both
  figures in stall.css` red. A look that sizes either figure and forgets a
  step: the planted cases in `theme-sheets.test.ts` (tier 2 missing on the
  face, every tier missing on the pay figure and on the face by role).

### Round 2 red proofs (2026-10-13)

Each through the real probe page (`?screens=`) on a scratch copy of the
branch, one change at a time, shipped looks and the skeleton:

- **"You pay" off the ladder** (the row given no tier, so no step): the
  four listing-face fixtures at 360, **346 failures** (17 characters on
  Modern and Rural, 21 on every look: `text-spills`, `the panel scrolls
  sideways`, the card rule on `paid:0`), at 390 **177**. Green with it.
- **The rows without the comma break** (`rowFigure` out):
  `row-longest-figure` and `quote-row-longest-figure`, **171 failures at
  360, 127 at 390, 70 at 1280** (`a protected box is cut sideways`, `asked
  amount is covered`, `text escapes its clip`, the name floor). With the
  break and no desk dress, 74 at 1280; with the desk dress and a 1.05 line,
  2 at 1280 and 4 at 680, all Rural (the tag's clip over the glyphs'
  corners). Green with all three.
- **Tier 0 read strictly** (the content box at every tier):
  `pay-figure-14` and `item-quote-figure-14` at 360, **6 failures**, every
  one this rule: Neo's pay 8.5px, Neo's face 13.3px, Rural's face 2.5px; 0
  at 390.
- **A tier-1 pay figure at 30px** (into its card's padding, not cut): 2
  failures, both this rule on Neo, 12.2px past the row's content box, and
  no `text-spills` — tiers 1–3 keep the strict read.
- **The painted ladder**, each of the critic's seven shapes planted alone
  in Modern's sheet: every one fails `a-card-figure-steps-down-on-every-look`
  for the figures it froze (`.face-x .x` with `font:`, `.x` and
  `.face-x > span`: `face:price` and `face:seller-price`; `.pay-q`:
  `face:seller-price`; `[data-role='price']`: `face:price` and `pay:price`;
  `.pay-amt .pay-x span:first-child` and `.pay-x-n` with `font:`:
  `pay:price`). Two more that fit their rows, so nothing else fires:
  `.x { font-size: 16px }` ("takes no smaller step", 2 failures and nothing
  else) and tier 1 at 20px under tier 2's 21 ("grows from tier 1 to tier
  2", 2 failures and nothing else). Restored: 0.
- **A step no fixture paints**: the narrow screens without
  `item-listing-figure-17` and `item-quote-figure-17`, read by
  `probeCoverageGaps('narrow', …)`: on every look, `read no face:1`, `read
  no paid:1`, and the three face and "You pay" ladders compared over tiers
  0, 2, 3, not all four.
- **The accessibility tree**: round 1's markup gives one StaticText per
  group of digits on every look; the test fails on it.

### Round 3 red proofs (2026-10-13)

Through the probe page on a scratch copy of the branch, one change at a
time (shipped looks and the skeleton), and the full runner where said:

- **The hidden digits** (the critic's plant, the full runner in a git
  clone of the branch): Modern's pieces `visibility: hidden` and Neo's
  `.fig-end` transparent — **8 failures**, every one
  `a-broken-figure-paints-every-digit`, on `quote-row-longest-figure` at the
  phone and the desk, bare and worn, on Modern ("a piece of 3 digit(s) …
  paints 0 glyph pixel(s) in the figure's ink") and Neo (the 8 letters and
  digits of `516.15 XEC`); `EXIT=1`. The critic's run of the same plant on
  round 2 passed.
- **The rows' cut**: `an-ordinary-quote-row-keeps-its-desk-row` pins 17, 18
  and 21 by value; the 1,000,000.00 XEC quote and the 15- and 16-character
  listings are one text node with no re-flow (`looks:diff` against main
  with the fixtures, below).
- **Rural without its narrow tag** (`dressLook` writing nothing): the four
  shop screens, **224 failures at 360 and 14 at 375**, 0 at 390; with it 0,
  0, 0.
- **The strip as main paints it** (total and line as plain text, the block
  `flex-end`, the total `nowrap`): `pay-several-strip-long-figure`, **57
  failures at 360, 42 at 390**, 0 at 1280; with the break 0.
- **The wall's rows as main paints them** (`wallFigure` out): the four wall
  fixtures, **1,150 failures at 768x1024, 236 at 1080x1920, 51 at
  1280x900, 84 at 1920x1080**; with the re-flow 0 at all four.
- **The painted ladder**: the seven shapes, each still red on the bare and
  the worn variant (366, 218, 436, 436, 92, 422 and 92 failures at 360 with
  the fit rule's own); the two misfires above, 0.
- **The two reads corrected**: above.

### Round 4 red proofs (2026-10-13)

The probe page on a scratch clone of the branch, and the full runner where
said, one change at a time:

- **The Cycle card at the cut** (round 3's code with the round-4 Cycle
  fixtures, 1920x1080): 377 failures on the seven screens (a 17-character
  listing 113, 18: 128, an 18-character quote 64, 19: 72 — cut sideways,
  cut from below, reaching the status line, covered); the fix 0.
  `a-cycle-card-keeps-its-grid-at-the-cut` red with `wallFigure` giving the
  card the re-flow and with the desk block unscoped.
- **Below the fold** (`text-spills` only; round 3's read → this one):
  words over the covenant's asked amount in the face's fold
  (`.listing-line { justify-content: flex-start }`, `.listing-meta {
  order: -1; flex: none; width: 8px; white-space: nowrap }`) at 390x844 0 →
  254 and at 1280x900 0 → 254; the same plant under `max-width: 389.98px`,
  the narrow pass's screens, 0 → 297; Neo's Studio doors (`.tool-t {
  white-space: nowrap; max-width: 30px }`) at 1280x900, 0 → 28. Unplanted,
  0 on every screen at 390x844 and 1280x900 and on the narrow pass: round
  3's false alarm (`pay-several-strip-long-figure`, Rural, 360) stays quiet.
- **The digits** (full runner): the critic's three plants, 16 failures,
  every one `a-broken-figure-paints-every-digit` (Modern's face, Neo's pay
  sheet and Pay several, Rural's strip, phone and desk, bare and worn); the
  faint plants above, 26.
- **The turn** (full runner): `.t-rural .item-p { rotate: 50deg }` runs
  every pass to its verdict — 530 failures at 390, 686 at 1280, all the
  turn's own (decorations over the figure, covered) — and the contrast pass
  says "10 contrast target(s) stand in a frame turned 45° or more"; it
  threw before.
- **The ladder's last step**: the pay floor planted at 17px,
  `the-ladders-last-step-is-the-sheets-floor` red.
- **The narrow tag's writer**: a `setAttribute('data-narrow-tag', …)`
  planted in `window.ts`, `the-narrow-tag-has-one-writer` red.

### Left for its own branch: the Cycle card and the touch wall at ordinary lengths (pre-existing)

**Closed at the five wall sizes the probe paints** (1920x1080, 1280x900,
1280x800, 1080x1920, 768x1024) by the Cycle card's ladder ("The Cycle
card's figure ladder", below). **Not closed off them**: at 1024x768 (the
counter tablet on its side) `$999.99` still shows as "$999.9" on Neo and
`123,456.78 XEC` runs 40px into the code on Neo and Rural; at 800x1280 the
card runs past the status line and Rural's code is cut from below; 680x1000
still fails on Rural ("Not measured, stated", below; PLAN § Open). What
follows is main's as measured on 2026-10-13.

Measured on 2026-10-13 through the probe page with scratch fixtures (one
card per screen, every look; the branch's reads, over the Cycle card that
is byte for byte main's), and on main where said. **The Cycle card has no
ladder**: its figure is `clamp(40px, min(10.4cqh, 6.4cqw), 112px)`, nowrap,
in the card's price column, whatever its length. The first length that
fails, counted as the row counts it (a listing without `from` and ` XEC`, a
quote with its unit):

| size | listing | quote |
|---|---|---|
| 768x1024, the counter tablet | **6** on every look (`123.45`: text-spills on Modern and Neo; on Rural also cut sideways, cut from below, covered) | 8 on Neo and Rural (`9.99 XEC`), 9 on Modern (`99.99 XEC`); `$999.99` (7) whole |
| 1280x900, the desk pass's size | 7 on Neo (covered), 9 on Modern, 14 on Rural | 16 on Neo, 17 on Rural, 18 on Modern; and on Rural the quote card reaches the status line at every shorter length (`$99.99` included) |
| 1280x800 | 8 on Neo, 9 on Modern, 14 on Rural | 17 on Neo and Rural, 19 on Modern; the quote card reaches the status line on Modern (6–18) and Rural (6–16), and so does the shipped `shop-window-cycle` |
| 1080x1920, the tall wall | 12 on Neo and Rural, 13 on Modern | 13 on Neo, 14 on Rural, 15 on Modern |
| 1920x1080 | 19 on Neo (text-spills; measured on main), whole through 18 | whole through 19 |

The failures are `text-spills`, `a protected box is cut sideways`,
`nothing-on-the-wall-is-cut-from-below`, `asked amount is covered` and
`nothing-in-the-body-reaches-the-status-line`. **A touch wall at 1280**
(Browse, `touch=on`, one item chosen, a second quote of each length beside
it): on main a quote fails from 16 characters on Neo, 17 on Rural and 18 on
Modern (cut sideways, cut from below, 456 failures over the lengths); on the
branch 16 and 17 still fail on Neo and Rural (152), and from 18 the row
re-flows and fits. `$100,000,000,000.00` (19, a USD quote) fits on both.

**Why no pass sees it:** the tall and tablet passes measure the Cycle card
only as `shop-window-cycle` paints it (a short listing) and no Cycle quote
at all; the Cycle fixtures at the rows' cuts are on the canvas pass alone
(`CANVAS_ONLY_WALL_SCREENS`); every touch-wall screen is a canvas screen,
measured at 1920 and on the two portrait passes, never at a desk width; and
the desk pass is 1280x900, so 1280x800 is measured by nothing. **What a
pass would need:** Cycle fixtures at ordinary lengths on both rails (a
listing from 6 characters, a quote from 8, and the cut fixtures) on the
tall, tablet and desk passes, `CANVAS_ONLY_WALL_SCREENS` emptied; the
touch-wall screens on the desk pass (or a 1280 wall pass of their own); and
a 1280x800 wall. Every one of them is red on main today, so they land with
the fix (a ladder for the card's figure, as the rows have), not before it.

### A wider code box below 390 (2026-10-13, the third option on P2-4)

Below 390px the pay sheets give their code more of the sheet (stall.css,
`@media (max-width: 389.98px)`, scoped to `.pay-qr-body`): the ticket's sides
go from 12px to 2px and the code's own white from 10px to 4px, while the
ticket's words keep a 10px inset. The four-module quiet zone is drawn inside
the SVG and is untouched; the code's corner radius (6, 0 and 8px) never
reaches it at 4px. Measured on the pay sheet, painted (box minus padding):

| width | Modern | Neo | Rural | fixture |
|---|---|---|---|---|
| 360 | 318 (was 286) | 320 (288) | **310** (278) | 318 (286) |
| 375 | 333 (301) | 335 (303) | 325 (293) | 333 (301) |
| 389 | 347 | 349 | 339 | 347 |
| 390, unchanged | 316 | 318 | **308** | 316 |

So the narrowest code from 360 up is Rural's 308 at 390, where nothing moved
(`looks:diff` shoots 390 and wider), and `PAY_QR_NARROWEST_PX` says 308 —
the gate is 308 with this box, never 278: the owner said yes to the wider
box in place of lowering the gate (D-2026-10-13-04). The cost: the ticket's dashed
edge stands 2px from the code's white below 390, and the code is 32px
wider. Below 360 nothing is measured: at 320 Rural would paint 270.

**The corner is capped below 390** (round 2, the critic's P3-4). The 4px of
white assumes a small corner: the code is clipped to its radius less its
padding, and `lookData` takes a `qrRadius` up to 2000px. The quiet-zone
read (`a-code-keeps-its-quiet-zone-white`) runs on contrast jobs at 390 and
1280 only, and there refuses a corner that cuts more than one module into
the square the code draws in (`quietZonePixels`) — radius minus the 10px of
white past about 5px, so about 15px of `qrRadius`. Below 390 the same
radius would cut 11px with 4px of white: past one module, still inside the
four-module quiet zone, and read by nothing. So below 390 the code's corner
is `min(var(--s-qr-radius), 8px)`: at most a 4px cut, within one module at
the gate's density (4.94px), the rule the read holds at 390. The shipped
looks are 6, 0 and 8px, so nothing of theirs moves. Pinned statically in
`the-selection-figure-is-the-figure-in-the-link`. A correction, stated:
the critic's band (about 62–70px) and round 2's first draft (72–79px) both
compared a finder pattern clipped at 360 with one clipped at 390, and
missed that the read already refuses anything past one module at 390; no
radius passes the 390 read and clips a finder at 360 even without the cap,
which is therefore a belt that keeps the 360 box to the read's own rule.
**What it does not cap, stated**: a look's own sheet restating the code's
`border-radius` at a higher specificity than (0,3,0) wins at every width;
at 390 the read would then judge it, at 360 nothing does.

## The Cycle card's figure ladder (2026-10-13; the critic's P1 on narrow-phone round 4, pre-existing)

*Superseded 2026-10-14: the fit ("The Cycle card's figure, fitted to its
column", below) replaced this table. `data-wall-tier`, `data-wall-break` and
the length bands size nothing now, and no look may read them; what follows is
the record of the table and of the rule that held it.*

The wall's Cycle card printed its figure at one size at every length,
nowrap, in the card's price column (the table under "Left for its own
branch", above, is main's as measured then). On the counter tablet a
6-character listing and an 8-character XEC quote ran out of the card on
every look and `123,456.78 XEC` read "123,45" on Rural — a thousand times
low to a reader who writes the decimal with a comma; at 1280x900 Neo's
`.78 XEC` painted under the code; at 1280x800 the card ran over the status
line. No pass saw it: the tall and tablet passes painted no Cycle figure
longer than three characters, the Cycle fixtures at the rows' cuts were on
the canvas pass alone (`CANVAS_ONLY_WALL_SCREENS`, now gone), and no pass
painted a wall at 1280.

### The ladder

`wallFigureTier` (window.ts) counts the figure as the rows count it — the
figure as printed, a listing's without ` XEC`, two more for a listing's
`from` — against `WALL_FIGURE_CEILINGS` = 5, 7, 9, 11, 13, 16, 19, 22, 26
(step 9 past 26; the widest the chain allows is 28 for a listing and 30 for
an XEC quote), and writes the step on the card's head as `data-wall-tier`
(none at step 0) and, from `WALL_BREAK_TIER` (step 4, 12 characters),
`data-wall-break` with the figure built by `moneyFigure` (a `<wbr>` after
each comma, the pieces `aria-hidden` under one `role="img"` named by the
whole figure, the last group and its unit in `.fig-end`). window.css gives
each wall layout a size for the steps it needs, in a custom property its
own `.item-x` rule reads under a `min()` with its design size, so a step
never paints a figure larger than the card did. Measured in Chrome on the
three shipped looks and the skeleton, bare and worn, against each step's
widest figure in every unit `QUOTE_UNITS` writes (`元`, drawn by the
machine's fallback, is the widest sign; tabular digits make every figure of
one length one width), with 0.7–6% to spare inside the price column (0.7%
for Neo's widest `₩` figure at 1080x1920, the critic's measurement in this
Mac's fallback face; `₩` and `元` are drawn by the machine's fallback font,
so the margin depends on that machine and may be smaller or negative on
another):

| wall (layout) | price column | step 0 (design) | the steps |
|---|---|---|---|
| 1920x1080 (landscape 901–1200 tall) | 1034px | 79.9px (70.2 under the Awning) | 1–6 unchanged; 7–9 ×0.85, ×0.71, ×0.65 (`--sw-k`): 67.9, 56.7, 51.9px |
| 1280x900 and 1280x800 (landscape ≤900) | 392–493px | 81.9px (79.9 / 69.5 under the Awning) | 1: 72, 2: 50, 3: 40px; 4–9: 38px, wrapped after a comma |
| 1080x1920 (portrait >1200) | 918px, the code below | 124px | 1–3 unchanged; 4: 9.6cqw (103.7), 5: 7.85cqw (84.8), 6: 6.5cqw (70.2), 7: 5.5cqw (59.4), 8: 4.58cqw (49.5), 9: 4.2cqw (45.4px) |
| 768x1024 (portrait ≤1200) | 326px | 10cqw (76.8px) | 1: 7.4cqw (56.8), 2: 5.1cqw (39.2), 3: 4.2cqw (32.3); 4–9: 32px, wrapped |
| landscape >1200 tall (2560x1440; no pass) | — | 112px | 5: 97, 6: 82, 7: 69, 8: 57, 9: 53px |

Why the wrap and not a smaller line: on the two narrow walls one line of a
12-character figure is 30px on the tablet and an eight-byte listing 12px,
which a room does not read; wrapped, every figure is at least 32px, at most
three lines (the longest listings, 24 characters and up, on Neo and Rural)
and two for every quote. The wrap is the
stream card's tier-3 shape for a listing: its price cell becomes a grid —
`from` on a line above, the figure's lines, ` XEC` beside the last line
(`last baseline`) — because inline, `from` and the look's mark stood inside
the money node's union box, which the contrast pass reads whole (2.20:1 and
1.19:1 on Rural, measured). A quote's unit is inside its figure and rides
the last group. **Step 0 is the design size at every wall**, so nothing a
step 0 card printed moves, and at 1920x1080 nothing of 19 characters or
fewer moves.

**A short landscape wall gives its own air back** (window.css, the two
compaction blocks): under 740px of frame (the Awning's canopy takes 132px
of a 1280x800 frame) and on a frame of 820px or less carrying Rural's yard
row, the body's padding, the card's padding and gaps, the code's caption
and Browse's code caption step down. Measured on main at 1280x800: the
shipped card with an announcement ran 67px over the status line on Modern
under the Awning and 81px on Rural with the yard, a quote card 84 and 92px,
and Browse's code plate overran its body by 20 and 30px. A Cycle quote's
foot gives 20px at 900 tall and under where Rural's yard is worn — at
1280x900 the yard put a quote card 9.5px over, and no other look reached
the status line there — and on every look under 790px of frame, where a
768-tall screen put a quote card over the status line on Neo and Rural bare
(1366x768, main). 2026-10-14: the first cut gave every look's quote card
the 20px at 900 tall and under, which moved a quote card on every bare look
at 1280x900 and 1280x800 that stood clear on main; scoped to the yard alone
it left Neo's quote cards over the status line at 1366x768 (113 cards past
it there, against 75 now — the off-size table below); and the whole air at
790px, which took Rural bare's cards at 768 too (46), moved Browse's code
plate under the Awning at 1280x900, whose canopy leaves 768px of frame,
until its quiet zone read 1,928 pixels grey. A bare 1280x800 frame is 800px
and keeps its foot; the Awning's quote card at 1280x900 gives its 20px, the
one card on a probed size that moves for this.

**The touch wall below 1920** (window.css, after the touch rules): every
touch quote row puts its figure on a row of its own under the picture and
the name, at 33px at most (30px from the wall's narrow cut and on the rows'
re-flow) — at 1280 the stepper's column took 306–311px of a 690px row, and
a `10,000,000.00 XEC` quote (17 characters) left the name a 0px column and
ran 31px past the row on Neo. And at 900 tall and under, while a payment stands, the list yields
its row to the band and the band takes the counter tablet's text steps
(now custom properties both walls set): at 1280x900 the band left the list
0–106px, and at 1280x800 the band's code, total and "+1 more" were cut
from below under the Awning.

**The touch wall's stepper stands clear of the figure** (2026-10-20,
D-2026-10-20-09 and D-2026-10-20-12; window.css, "A touch wall narrower than
1920" and the three blocks after it). The stepper was a column of 218–317px
that spanned both lines of a touch quote row, so the figure had the row less
the picture, the gaps and that column, and the − and + controls and the figure
stood on each other at 768x1024, 1024x768 and 800x1280 on every look: a
16-character quote is 280–315px at 1024x768 in a 154px area, and 406–456px at
768x1024 in the column beside the picture. **No rule read it.** The hit test
(`coveredBy`) is asked of the `price` role, and a quote's figure is
`seller-price`; the stepper is in flow, so the box sweep over decorations
never meets it. Now:

- **1280 to 1919 wide in landscape is main's row, row for row** (the owner,
  D-2026-10-20-12: it was clear there, leave it): the stepper spans both
  lines. An ordinary figure stands under the picture and the name, left of
  the stepper (`ic name step / price price step`). An eight-byte figure
  (`fig-wraps`) takes the landscape `:has()` rule, (0,8,0) against the
  row's (0,6,0), and becomes `ic name step / ic price step`: beside the
  picture, under the name, left of the stepper. That is main's too, with no
  fault. Compared with main at 1280x900, 1280x800, 1366x768, 1920x1080 and
  1080x1920 (every touch screen, every look bare and worn): the row's areas,
  columns, height, width, name column, figure width and size, and its faults
  are identical on every row.
- **Under 1280 in landscape** the picture takes two lines, the stepper stands
  under the name and the figure takes the line under both: beside the name
  the stepper left the name's column 41–47px at 1024 and 2–6px at 960.
- **Under 1080 in portrait** the figure takes the line under the picture, the
  name and the stepper, and the picture is **104px, not 160** (option (e) of
  the touch-wall critic, the owner's choice). With a 160px picture the row was
  256–274px at 768x1024 against main's 200, in a list of 123–261px, and the
  first price stood cut at rest on five looks of six there.

**The proof is a scratch measurement, not a rule** (the touch-wall critic's
`m.mjs`: kept in the session scratchpad, not in the tree). On every touch
screen (`shop-window-touch-quotes`, `-16`, `-long-figures`, `-pay`, `-pay-3`,
`-pay-35`), every look bare and worn, with transforms and animations held
off, no rect of the stepper's controls or count meets a character of the
figure, of the name (clipped to its cell) or of its label, nor the tag's box,
nor the name's cell or the picture; and the stepper's box and the figure's
characters stay inside the row. **Landscape, 880 to 2560 wide** (150 sizes,
the ones main fails are 880 to 1200 wide): main 1,573 of 12,888 rows red on
66 sizes, here 0 of 12,888, and the rows from 1280 up identical to main's on
all 77 sizes there. **These counts are over every size painted, not over wall
sizes only**: the critic counts 24 of the 150 landscape sizes at 600 tall,
below the wall's floor (680 on the short side), which the showroom paints and
the app would not; they were not recounted without them, the size list being
gone. **Portrait, 680 to 1440 wide up to 2560 tall** (115
sizes): main 746 of 15,567 rows red on 56 sizes, here 0 of 15,567. At the
first set of 16 sizes (the nine wall sizes, 834x1112, 1152x864, 1279x800,
1279x768, 1200x800, 1100x800 and 960x720): main 138 of 1,044 rows red, here
0. Run twice, on Chrome 155 and again on Chrome 156 (2026-10-26, from the
committed tree): the landscape and first-set numbers are the same to the row.

**What is not claimed: a landscape wall under 870 wide** (D-2026-10-20-12,
PLAN § Open). The row is 266px wide at 800 and 306px at 840, and there the
stepper itself runs past its row: its "+" button by 58.4px at 800, 41.1px at
820, 23.9px at 840 and 6.6px at 860 (a one-digit count); with a three-digit
count by 76.6px at 800, 42.1px at 840, 24.8px at 860, 16.2px at 870 and
7.6px at 880, clear from 890. A figure runs past the row too, by 8–30.9px
on Neo and Rural at 800 and 3.2px on Rural at 840. This branch's first
comment said "nothing of the stepper's" and "every one a figure past its
row": both were false, and a sweep that took the stepper's own box against
the row's was what found it (the earlier tool did not read it). Main is
worse at those sizes (90.4px at 800, 24.6px at 880, 9px at 900), so nothing
is made worse; nothing there is held.

**The floor is the short side, and a near-square portrait wall is not held
either** (PLAN § Open). `wallWidth` in `src/app.ts` asks `Math.min(innerWidth,
innerHeight) >= WINDOW_MIN_PX` (680), so a portrait screen is a wall from 680
wide, and a near-square one under about 880 wide shows almost no list: 0–37px
at 700x701 and 760x761, 0–124px at 880x881. Under the Awning the frame reads
as landscape there (the canopy takes its height) and takes the landscape
limit: the stepper runs 154px past its row at 700x701 and 96px at 760x761
(the critic's second review, `touch-wall/critic2/`). Main behaves the same
(182 and 127px past at those two sizes).

**What the probe paints.** No probe pass paints a landscape wall from 1080 to
1279 wide: the landscape wall passes are 1024x768, 1280x900, 1280x800,
1366x768 and 1920x1080. From 1080 to 1279 wide the under-1280 rule is
measured by the scratch sweep alone.

**The cost, measured.** Under 1280 in landscape a row is taller: 169px became
214 at 1024x768, 194 became 242 at 1279x800, 182 became 232 at 1152x864 (a row
with a stepper and a figure of 17 characters or fewer is 42–51px taller
across the sweep, and a row with no stepper, one in another unit, is not; a
re-flowed figure's row is 38px shorter to 28px taller). In portrait under 1080 a row is
200px at 768x1024, 800x1280 and 834x1112 (218 on Rural, whose tag is taller),
as main's was, where a figure beside the picture is now under it; a
re-flowed figure's row, which was 256–274px on main, is 200–218.
**The first price at rest** (`figWholeAtRest`, the figure's characters inside
the strip's visible box with the list at its top): at 768x1024 it is whole
on 4 of 6 look variants, as on main; at 680x1000 on 4 of 6 (main 3 of 6); at
834x1112 on 6 of 6. The two it is not at 768x1024 are the Awning (a list of
129px) and Rural's yard (123px), and a row of any shape is taller than
either: those are the older cuts, main had them. **This branch adds cuts of
its own.** Counted *whole and clear* (the first price inside the list at
rest and none of the stepper's controls on it; the critic's recount, second
review, over every touch screen with a list on screen; "whole" alone flatters
main, whose price stood under the controls in most cells under 1280):
landscape 880–1279 wide, 1,404 cells, 1,364 here against main's 536, 841
gain and 13 lose; portrait under 1080 wide, 2,379 cells, 2,216 here against
main's 1,791, 437 gain and 12 lose. (By "whole" alone, the builder's count:
1,364 against main's 1,377 in landscape, 2,216 against 2,186 in portrait; the
two plain touch screens are whole in every cell under 1280, 876 of 876, as on
main; from 1280 up identical to main, 1,427 of 1,476.) **The 25 that lose
are new cuts**: on main each had a first price whole and clear of the
controls ("$5.00" in 22 of them). They are payment screens 1,080–1,200 tall
and 1,100–1,279 wide in landscape (lists of 155–223px beside rows 42–51px
taller), payment screens 1,501–1,600 tall in portrait, the yard or the Awning
at 1,000–1,079x1,112, and 1000x1001 Rural bare (in portrait a figure under
the picture ends 185–209px down its row, and main's, beside it, ended
152–162px down). Six are at 1279 wide: the cost of moving the cut to 1280,
which the owner chose. The ranges are those of the sweep's sizes, not edges:
the critic's spot sizes lose the same way at payment screens of 960x950,
1000x999, 1024x1000 and 1240x1230. **No rule was built for it** (the owner,
D-2026-10-20-12): it would be red on main at 768x1024 and 680x1000; PLAN §
Open has the numbers and the ways out.

`a-touch-quote-row-stands-its-figure-clear-of-its-stepper` pins the rules'
text; **it pins text, not geometry**, and a planted 150px stepper passes it.
The geometry guard is step 1a on the `before-8g2` branch (a hit test with
`pointer-events` forced on over every money node), which the touch-wall
critic ran on that branch's probe: this wall's touch list went from 35
failures to 0 with the first version of this fix only (the critic's run, not
re-run on this tree). It reads a figure covered by a control. By the
critic's reading it does not see Rural's tag over the controls, the name
squeezed, or the stepper past its row, which only the sweep above reads.

**CLAUDE.md § 4's "Still red" counts at 900x1600 and 864x1536 may be out of
date** (25 and 195 failures there). This branch's portrait rule applies at
both sizes (under 1080 wide), and the critic's second-review sweep reads 17
red touch rows on main at each and 0 on the branch. The probe was
not run at those two sizes with this branch, so the counts were not
re-measured.

### The passes

- **`desk-wall`**, 1280x900: every wall screen the canvas split keeps off
  the desk pass (`deskWallScreens()`, the runner's `DESK_WALL_SCREENS`, 41
  screens): the touch wall, the Cycle ladder's fixtures and the canvas
  twins. The desk pass still measures the page wall screens at that size.
- **`short-wall`**, 1280x800: every wall screen (`WINDOW_SCREENS`, 53).
- Both refuse a page that did not enter the short landscape block
  (`landscapeShort`, echoed by the page) and owe what the other wall passes
  owe (`WALL_PASSES` in probe-coverage.mjs).
- The tall and tablet passes measure every wall screen too (53, from 20),
  and the canvas pass the Cycle fixtures (60 screens, from 35).
  `CANVAS_ONLY_WALL_SCREENS` is gone (`wallScreens()` is every `window`
  fixture).

The fixtures: `shop-window-cycle-listing-{5,6,7,9,11,14,20,24,26}`,
`-quote-{8,9,10,13,22,26,30}` (XEC), `-usd-{5,7,9,11,13,22,27}` and
`-cny-27`, beside round 4's seven at the rows' cuts — every step at its
widest figure on both rails (`cycleLadder.test.ts` holds that, and the
critic's own `123.45`, `1.23 XEC`, `12.34 XEC` and `$5.00`), all canvas
screens and geometry only; and `shop-window-cycle-longest-figure`, the
eight-byte listing as a page screen, which the desk pass paints wrapped
and the contrast pass samples (`BROKEN_FIGURE_SCREENS`: two lines on Modern
and the skeleton, three on Neo and Rural, read digit by digit). And
`shop-window-touch-quotes-16` (2026-10-14): two touch rows at 16 characters
(`1,000,000.00 XEC` chosen, `9,999,999.99 XEC`), under the wall's narrow cut
and the rows' re-flow — the length the critic's round 4 found cut sideways
on Neo at 1280, which no fixture painted (the touch fixtures jumped from the
shop's figures to 17 characters). The shot plan follows the
probe (`shotPlan.ts`: the desk viewport gains the desk wall's screens, and
a `short-wall` viewport, 1280x800, shoots every wall screen).

### The rule: `a-cycle-card-shows-every-digit-at-every-wall-size`

On every pass, for every Cycle card: the figure's lines (the money node with
its `from` and ` XEC`) and its price cell stand inside the price's own grid
column — read from the head's resolved tracks — and so never past the
card's grid, under the code or under the picture; every line stands inside
the card, the viewport and above the status line; no line crosses the
code's box or the picture's (read on the line's middle three fifths: a
content area runs a few pixels past its ink, and Neo's mono figure's runs
2px into the code's row at 1920x1080 with no ink there); and a broken
figure splits no group — each piece, and `.fig-end`, on one line. Read with
the card's turn and the tag's sway taken off (inline `transform`/`rotate:
none !important`, the element's own style put back after): Rural tilts
every third card half a degree and sways its tag 0.8°, and an axis-aligned
box of a 160px tag is 2–4px wider than the tag. Counted per look and per
step (`cycleFigureByClass`); every wall pass (canvas, portrait, tablet,
desk-wall, short-wall) owes every step, 0–9, on every look it painted
(`CYCLE_STEPS_OWED`, pinned to `WALL_FIGURE_CEILINGS` by
`the-wall-passes-owe-the-cycle-cards-every-step`), and prints them
(`Cycle figures read by step: 0:… 9:…`).

**What it sees that the older rules did not**: a figure in its column's gap
or over the next track by a few pixels, which no other element covers and
no clip cuts — on main a 5-character listing ran 6.5px past its column on
the tablet, `1.23 XEC` 18.2px — and a figure whose cell left the grid.
On main's code it alone failed 178 look cells across the passes (below).

**A look owns its ladder**: `every-look-that-sizes-its-figure-sizes-every-price-tier`
gained the wall's Cycle card — a look sheet that sizes the Cycle figure
sizes all nine steps (`data-wall-tier`), proved by planted sheets; the look
lint lists `data-wall-tier` `1`–`9` as state a look may read
(`STATE_ATTRIBUTES`, held to `WALL_FIGURE_CEILINGS`). No shipped look sizes
it. **A guard widened, stated**: `theme-sheets.test.ts`'s rule parser now
descends `@container` as well as `@media`, so `a-var-read-at-rest-resolves-at-rest`
reads the ladder's custom properties (it failed on the first `--sw-fig`
read under an `@container` block, where the parser saw no declaration).

### Red proofs (2026-10-13)

The branch's fixtures, probe, runner and tests over main's `window.ts`,
`window.css` and `render.ts` (a scratch clone, the full runner):

| pass | failures | of them `a-cycle-card-shows-every-digit-at-every-wall-size` |
|---|---|---|
| mobile (390) | 0 | — |
| desktop (1280x900) | 171 (`shop-window-cycle-longest-figure`) | 27 |
| canvas (1920x1080) | 828 | 123 |
| portrait (1080x1920) | 2,339 | 176 |
| tablet (768x1024) | 4,407 | 528 |
| desk-wall (1280x900) | 3,860 (1,414 on the touch wall) | 600 |
| short-wall (1280x800) | 4,293 (1,905 on the touch wall) | 575 |
| narrow (360) | 0 | — |

**Re-run 2026-10-14** (the second builder, a clean scratch clone of main at
`6db735e` with this branch's tests over it, nothing else on the machine):
the same counts to the failure, and the contrast pass this time: red,
`a-broken-figure-paints-every-digit` read no broken figure on the eight
`shop-window-cycle-longest-figure` desk jobs (main writes no break), and 11
figures on paint below 3:1 — that figure painted over the card's code,
1.17:1 on Modern, 1.52:1 on Neo, 1.17:1 on the fixture look and the
skeleton (the fixture look's art pending and failed alike). With
`shop-window-touch-quotes-16` added: desk-wall 3,892 and short-wall 4,325,
the new screen's 32 + 32 all on Neo bare and worn — `span.item-x is cut
sideways by div.item (38–432 inside 44–792)`, 388 of its 394px shown.
Main's failures per Cycle fixture, as the number of looks (of nine: three
shipped bare and worn, the fixture look bare and worn, the skeleton). Each
step a layout shrinks has a look whose figure failed at it on main, and no
step a layout leaves alone has a figure failing; the step-0 and step-1
failures marked "status line" are the card's bottom edge (Rural's yard at
1280x900, the Awning and the yard at 1280x800), which the air and the foot
answer, not the ladder:

| fixture (counted, step) | canvas | desk-wall | short-wall | portrait | tablet |
|---|---|---|---|---|---|
| `usd-5` (5, 0) | · | 1 (status line, Rural worn) | 2 (status line) | · | · |
| `listing-5` (7, 1) | · | 4 | · | · | 6 |
| `usd-7` (7, 1) | · | 1 (status line) | 2 (status line) | · | 4 |
| `listing-6`, `quote-8` (8, 2) | · | 7, 4 | 4, 2 | · | 9, 9 |
| `listing-7`, `quote-9`, `usd-9` (9, 2) | · | 9, 7, 4 | 8, 5, 4 | · | 9 each |
| `quote-10`, `listing-9`, `usd-11` (10–11, 3) | · | 8, 9, 9 | 9 each | · | 9 each |
| `listing-11`, `quote-13`, `usd-13` (13, 4) | · | 9 each | 9 each | 6, 4, 4 | 9 each |
| steps 5–6 (16–19) | · | 9 each | 9 each | 9 each | 9 each |
| `listing-18` (20, 7) | 2 | 9 | 9 | 9 | 9 |
| `listing-20`, `quote-22`, `usd-22` (22, 7) | 4, 4, 2 | 9 each | 9 each | 9 each | 9 each |
| steps 8–9 (23 up) | 8–9 | 9 each | 9 each | 9 each | 9 each |

The rest are `text-spills`, `a protected box is cut sideways`, `asked
amount is covered`, `nothing-on-the-wall-is-cut-from-below` and, at 1280,
`nothing-in-the-body-reaches-the-status-line` (77). Every wall pass also
reported a coverage gap per look and step 1–9 (main writes no step). In
178 look cells the new rule failed alone (canvas 7, portrait 10, tablet 14,
desk-wall 78, short-wall 69). The contrast pass on that run died on a
closed DevTools socket and the runner's 300s watchdog fired, on a machine
at load 5.3, so the red run's contrast verdict is not recorded. The static
half on main's code: `cycleLadder.test.ts` 1 of 2 and `window.test.ts` all
6 new cases red, `the-wall-passes-owe-the-cycle-cards-every-step` red, and
the look lint's `STATE_ATTRIBUTES` inventory red (a listed attribute no
served sheet matches). On the branch every pass is 0.

### Cost

**Back to back on this Mac, 2026-10-14 03:33 and 03:36 (load 2.6–3.1)**:
main 173.8s, the branch 192.1s (+18.3s). Per pass: the tall wall 6.3 → 8.0s
(+1.7s, 20 → 53 screens), the counter tablet 4.2 → 5.9s (+1.7s, 20 → 53),
the canvas 4.3 → 5.5s (35 → 60), the desk pass 9.8 → 10.0s, the two new
passes 4.8s (desk-wall, 41 screens) and 5.8s (short-wall, 53), the contrast
pass 121.5 → 124.0s (787 → 796 jobs). The first builder's own pair, 2026-10-14 (load 3–6):
main 185.6s, the branch 202.2s (+16.6s). The two new passes 4.9s and 5.9s; portrait +0.9s (7.3 →
8.2), tablet +1.2s (4.7 → 5.9), canvas +0.9s; the contrast pass +5.9s (787
→ 796 jobs with the tracked fixture carried, the rest noise). Other runs
of the branch the same night: 239.6s (load 5–8; main 238.5s beside it) and
216.6s.

### What looks:diff shows moved (2026-10-14)

- **Against main** (`pnpm looks:diff main`, 27 screens expected: the seven
  Cycle cut fixtures, the five touch screens, and at 1280x800 every wall
  screen the Awning's or the yard's air moves): 1,539 identical, 283 real
  and expected, 0 not expected, 0 inconclusive. The 774 shots on the new
  fixtures are not compared — main has no such screens.
- **Against main with every fixture** (a scratch commit of main `6db735e`
  plus this branch's fixtures, probe and tests, its app code main's; all 53
  wall screens expected — every one moves at 1280x800): 1,714 identical,
  882 real, 0 not expected, 0 inconclusive. Read against the red run cell by
  cell (screen × shipped look × bare or worn × size), **737 of the 882
  failed on main and 145 passed on main and still moved**:
  - one table for every look — a step shrinks on every look where any look
    overran, so `$999.99` on Modern at the tablet goes 76.8 → 56.8px,
    steps 1–3 on Modern at 1280, `quote-13` and `usd-13` on Modern at the
    tall wall, steps 7–9 on Modern (and Rural where it fitted) at 1920;
  - the break markup at 1920 — from step 4 the figure carries `<wbr>`s and
    the `role="img"` wrapper so the narrow walls can wrap it, and at 1920,
    where nothing wraps, 12–19-character figures raster 55–1,948px
    differently in the same place at the same size (a 1px tag edge on Rural);
  - the short walls' layout-wide answers — the Awning's and the yard's air
    at 1280x800 on screens that fitted, every touch quote row below 1920
    (`$5.00` included), and the payment band at 1280x900 with one item, which
    main fitted;
  - the Awning's quote card at 1280x900, which gives its 20px of foot.

  A ladder that moved none of these would be per look (the shop rows'
  `tierCeilings`) or measured (the sign's name ladder); neither is built.

### Not measured, stated

- **The thinnest margins are signs the machine draws.** The fixtures carry
  XEC, USD and one CNY quote; `₩` and `元` are drawn by the Mac's fallback
  font, and at 1080x1920 their widest figure has 0.7% to spare. On another
  machine's fallback the margin may be negative (the critic, 2026-10-14).
- **A money figure that clips itself was unseen**: the Cycle rule and
  `cutSideways` read the figure's ancestors, so `overflow: hidden` with a
  `max-width` on the figure itself passed with 0 failures (the critic's
  plant: "12, / 345." for `12,345.67 XEC`). Read since by
  `a-money-figure-never-clips-itself` (D-2026-10-14-02's branch, at the end
  of this file).
- **Off the probe's sizes** (the scratch harness, the 35 Cycle screens,
  every look bare and worn, 280 cards a size; main's code with the same
  fixtures beside it). Figure cut or over the code / card over the status
  line:

  | size | main | branch |
  |---|---|---|
  | 2560x1440 | 138 / 0 | 0 / 0 |
  | 1600x900 | 155 / 19 | 0 / 0 |
  | 1366x768 | 171 / 129 | 0 / 44 (≤21px) |
  | 1280x720 | 185 / 196 | 0 / 42 (≤69px) |
  | 1280x1024 | 166 / 0 | 0 / 13 (Rural worn, ≤78px) |
  | 1024x768 | 273 / 129 | 126 / 44 |
  | 800x1280 | 180 / 245 | 4 / 219 |
  | 680x1000 | 254 / 21 | 14 / 19 |

  **Measured again 2026-10-14** with a harness of the second builder's
  (`offsize.mjs` in the session scratchpad: this repository's probe page
  built and served, Chrome off the network, the probe's own verdict read
  at each size; the same 35 screens, nine looks, 315 cards a size). Cards
  with a figure failure (the Cycle rule, `text-spills`, cut sideways,
  covered) / cards past the status line, main's code with these fixtures
  against this branch at its second commit:

  | size | main | branch |
  |---|---|---|
  | 2560x1440 | 122 / 0 | 0 / 0 |
  | 1600x900 | 137 / 19 | 0 / 0 |
  | 1366x768 | 154 / 141 | 0 / 75 |
  | 1280x768 | 176 / 141 | 0 / 75 |
  | 1280x720 | 172 / 200 | 0 / 48 |
  | 1280x1024 | 147 / 19 | 0 / 21 (Rural worn) |
  | 1024x768 | 264 / 142 | 139 / 77 |
  | 800x1280 | 159 / 232 | 4 / 214 |
  | 680x1000 | 233 / 25 | 24 / 23 |

  At 768 and 720 tall what still reaches the status line is the Awning's
  and the yard's worn cards, and at 768 Rural bare's (its card at its
  design size, the shipped three-character one included, as on main).
  **1024x768 — an iPad on its side —
  is the largest gap left**: 139 cards with a digit cut or covered, the
  shipped three-character card among them on every look (main 264); the
  short landscape layout's design size and steps are in px measured at
  1280, and its price column at 1024 is narrower than any step was sized
  for. 680x1000 fails on Rural alone (its tag, steps 0–3), 800x1280 a
  nine-character listing on Neo and Rural. Not built; no pass paints them.

  Seventeen cards are worse in one way: main cut their figure sideways and
  kept the card above the status line; the branch shows every digit and the
  card runs past it — at 1280x1024 on Rural worn (13, up to 78px) and at
  680x1000 (Modern worn's 30-character quote 27px, Rural worn's 24- and
  26-character listings 15px). At 1280x1024 no step of the 1080-tall
  layout seats a 16-character quote in its 566px column, and **Chrome
  breaks the figure at its `<wbr>` under `white-space: nowrap`** (measured:
  the figure 566 by 172px at 75.8px, computed `nowrap`), so the card grows
  a line. A ladder that holds at every landscape width between 1280 and
  1920 at 1024 tall is not built; 1024x768 and 800x1280 were broken on
  main and stay broken.
- The tablet's and the short wall's wrapped figures are geometry only: the
  contrast pass samples the wrapped Cycle figure at 1280x900 alone
  (`shop-window-cycle-longest-figure`).
- The touch wall between 1280 and 1919 wide is measured at 1280 alone.

## A look dresses a money figure only as a whole (D-2026-10-14-02, 2026-10-14)

The owner's decision ("Theo khuyến nghị"): a look may not dress a money
figure's pieces. Every piece of a broken figure wears the figure's own
computed colour, opacity, visibility, font and spacing, with no mask, clip,
`clip-path`, filter or transform of its own; a look dresses the figure only
as a whole. From the narrow-phone critic's round 4 (P2-1 and P2-2) and the
wall-cycle critic's P2-1. Three rules, each geometry only, on every
geometry pass.

### A broken figure wears the figure's own ink (`a-broken-figure-wears-the-figures-own-ink`)

`a-broken-figure-paints-every-digit` (above) reads each piece of a broken
figure whole, on five contrast screens, and cannot see a piece partly
hidden: the critic's three plants — a gradient mask over the face's last
group, an inset `clip-path` on the pay sheet's last group, negative
`letter-spacing` on the strip's last group — passed the whole runner. A
pixel floor on the figure's ink would not have closed it (a partly masked
piece keeps full-ink pixels); computed style does, at every screen and
every width, for milliseconds.

**The rule** (round 1's; an allow-list over every computed property since round 2, below) (`figureInkFaults`, `layout/probe.ts`): on every screen, look
and variant of every geometry pass, every element of every `.fig-say` — the
`.fig-say` itself and everything under it but a `<wbr>` — computes the
money node's own value of every property in `FIGURE_INK_SHARED` (colour,
the text fill and stroke, the text shadow, visibility, the font's family,
size, weight, style, stretch, variants, features and variations, line
height, letter and word spacing, case, text security), the initial value of
every one in `FIGURE_INK_OWN` (opacity 1; no mask image, mask border,
`clip`, `clip-path`, filter, transform, `rotate`, `scale`, `translate`,
blend, overflow, `contain`, `content-visibility`, position, vertical align
or margin of its own), displays as the inline it is (or the block a flex or
grid parent makes of it), generates no `::before` or `::after`, and runs no
animation or transition of its own (the read is one instant). The money
node is the element the figure is written into (`say.parentElement`), the
ink the digit read reads with. A property the engine does not know computes
`''` and is not read. The list is wider than the decision's words in four
places, each the same thing by another property: the text fill and stroke
(colour), the text shadow and blend (ink), the font's sub-properties and
line height (font), word spacing and case (spacing); and margins, position
and `vertical-align`, which move a piece over its neighbour's digits.

**The static belt** (round 1's; narrowed to the two piece classes in round 2, and the README line added, below) (`a-look-may-not-dress-a-figures-pieces`,
`scripts/look-lint.test.mjs`): `lintLookSheet` refuses a selector naming any
class the app spells `fig-` (`.fig-say`, `.fig-end`, `.fig-wraps`,
`.fig-narrow`; `FIGURE_PIECE` in `scripts/workshop-css.mjs`). A belt only: a
look reaches the pieces with `.item-x span`, `:last-child` or an attribute
as easily, which the probe rule reads. **The kit road is unchanged**: the
kit's lint names them freely, because binding a kit designer needs a
workshop README line, which is the owner's to approve. The kit's
`workshop:probe` runs the probe rule regardless — and the README's own rule,
"Money is never covered, cut or faded", does not say a look may not dress
a piece in another weight or face, so the probe rule binds a kit designer
past the README's words until a line is added.

**Owed** (round 1's; per surface since round 2, below) (`probe-coverage.mjs`, `figureInkByClass`): every geometry pass, on
every look it painted, a broken figure read. Measured 2026-10-14 on the
probe page, per look (the skeleton, painted bare only, half): the phone 52,
the desk 60, the narrow phone 52, the canvas 46, the tall wall 54, the
counter tablet 54, `desk-wall` 46, `short-wall` 54 (the full runner's
counts, printed on each pass's `compared:` line).

**Red proofs** (2026-10-14, a scratch clone, each plant appended to
`stall.css` alone, the probe page at the phone, the desk and the narrow
phone):

- the critic's mask, `.t-modern .face-x .fig-end { mask-image:
  linear-gradient(to right, #000 30%, transparent 30%) }` (both prefixes):
  4 failures at each width, every one this rule ("`.fig-end` has mask-image
  … of its own"), on `item-listing-long-figure` and
  `item-quote-long-figure`, bare and worn;
- the critic's clip, `.t-neo .pay-x .fig-end { clip-path: inset(0 60% 0
  0) }`: 4 at each width on `pay-longest-figure` and
  `pay-several-longest-figure` — at 390, where nothing failed before, this
  rule alone; at 1280 and 360 beside the 28 "asked amount is covered" that
  caught it there;
- the critic's spacing, `.t-rural .sel-total .fig-end { letter-spacing:
  -0.5em }`: 4 at each width on `pay-several-strip-long-figure` and `-21`
  ("letter-spacing -8px where the figure has normal");
- a piece reached with no `fig-` class, `.t-modern .face-x .x span > span {
  animation: om-flick 3s infinite }`: 2 at 390 ("runs an animation or
  transition of its own", on the span and on `.fig-end`);
- the static belt: `selectorProblems` without its `FIGURE_PIECE` half,
  `a-look-may-not-dress-a-figures-pieces` red;
- **the whole runner** (the three plants appended at once beside the four
  plants of `a-spill-over-any-money-is-read` and
  `a-money-figure-never-clips-itself`, in scratch clones of the branch and
  of main, run back to back): on main nothing read the mask or the spacing,
  and the clip only as `asked amount is covered` at 1280 and 360 (42
  each), while the contrast pass read none of the three; on the branch this
  rule failed 16 at each page pass — 390, 1280 and 360: Modern 4, Neo 6,
  Rural 6 — and the contrast pass still read none of them.

### A spill over any money is read (`a-spill-over-any-money-is-read`)

`text-spills` held a block's spilled words against controls, two money
roles (`price`, `seller-price`) and a few kinds of words (`.item-n`,
`.face-nm`, `.fine`, `.note`, `.pub`), and nothing else, so words painted
over most of the money set passed every geometry pass, or failed naming a
control behind the sheet (the critic's round 4, P2-2: "under button.seg-b",
"under button.addr" for words over Pay several's "$10.00").

**The rule** (round 1's; held against the spilled words, within the open sheet, since round 2, below) (`measure`, `layout/probe.ts`): the spilled strip is held
against every money node (`MONEY_SET`), Pay several's line figures
(`.pay-line-x`, inside the money box `pay-lines`) and every broken figure
(`.fig-say`) — `SPILL_MONEY` — before the words (`SPILL_WORDS`, the old
list less its two money roles), each by its own line boxes
(`getClientRects`, one for a block, one per line for an inline figure broken
over lines, whose union holds a corner no glyph of it stands in), and a
spill over money fails under this name; a spill under a control or cut by
its clipper is `text-spills` as before. What `text-spills` skipped it still
skips: the spilling node's own ancestors and descendants, anything
`aria-hidden`, and the part of the strip its clipper hides from a node
outside it (`spillReach`). Unplanted, 0 on every look at every geometry
pass: round 3's false alarm (`pay-several-strip-long-figure`, Rural, 360)
and round 4's below-the-fold reads stay as they were.

**Red proofs** (2026-10-14, the scratch clone, each plant alone, the probe
page):

- **Modern, Pay several** (the critic's): `.t-modern .pay-line {
  grid-template-columns: 20px auto } .t-modern .pay-line dt { white-space:
  nowrap } .t-modern .pay-line dd { text-align: left }` — 42 failures at
  each of 390, 1280 and 360 on `pay-several` and
  `pay-several-figure-lines`, every one this rule, "dt paints 113px past its
  box (133 > 20), under span.pay-line-x";
- **Rural, the wall's payment lines** (the same plant at window.css's
  specificity, `.stall.t-rural.shop-window[data-touch='on'] .sw-pay-line`):
  196 at the tall wall, the counter tablet and 1280x900 on
  `shop-window-touch-quotes-pay` and `-3`, 1,911 on the canvas with `-35`,
  "under dd.sw-pay-v";
- **Neo, "You pay"** (the critic's: the label over the figure),
  `.t-neo .row.big { justify-content: flex-start } .t-neo .row.big dt {
  flex: none; width: 8px }` — 70 at each of 390, 1280 and 360 on
  `item-listing`, `item-listing-long-figure` and `item-unbuyable-fold`,
  "dt paints 47px past its box (55 > 8), under dd"; the critic measured 0 on
  every geometry pass before;
- **the whole runner** (the runs above): main named the wrong neighbour or
  nothing — Pay several's words "under button.addr" and "under
  button.seg-b" (the sign's address and the shop's tabs behind the sheet),
  the wall's lines "under span.item-n" or "under
  span.item-foot-words.fine" at the canvas and the tall wall and nothing at
  the tablet and the two desk walls, "You pay" nothing in geometry but on
  `item-zoom` ("under button.mini.another", the zoom's close) and the
  contrast box read's 2.24:1 on the phone and desk jobs; the branch: this
  rule 98 (Modern) and 154 (Neo; 112 at 360) at each page pass and 1,911
  (Rural) at each of the five wall passes, and no `text-spills` left.

### A money figure never clips itself (`a-money-figure-never-clips-itself`)

`a-cycle-card-shows-every-digit-at-every-wall-size` reads layout rects,
which a clip does not shorten, and `cutSideways` walks a money node's
ancestors, never the node itself: Neo's Cycle figure planted
`display: inline-block; max-width: 2.5em; overflow: hidden` read "12, /
345." with the probe page silent (the wall-cycle critic's P2-1, plant f).

**The rule** (round 1's; every clipping box up to the surface since round 2, below) (`moneySelfClipFaults`, `layout/probe.ts`): on every screen,
look and variant of every geometry pass, every money figure painted with a
box (`MONEY_FIGURES`: the money set less the two record hexes — a capped,
scrolling window by the owner's design — and `pay-lines`, a list whose wall
form scrolls by design; plus `.pay-line-x`) is asked two things:

- **it does not clip its own digits**: neither the node nor its figure's own
  boxes (`.item-a`, `.item-p` where it stands in a row or a card) has an
  `overflow` other than `visible` on an axis, or a `contain` that paints,
  with its content more than a pixel larger than its client box on that
  axis — named with its `width`, `max-width`, `height` and `max-height`;
- **its own width does not cut its text**: where the node's own text runs
  past its own box sideways, the text is held to `cutSideways` (a side edge
  or an ancestor clipping sideways, nothing scrolling), which only ever read
  the box. Much of this `text-spills` also reads — a block whose visible
  overflow crosses its nearest clipper — so this half overlaps it; it reads
  every clipping ancestor and the viewport, and names the money.

An inline element neither clips nor sets a width, so only its text is read.
The ticker's moving ribbon is `cutSideways`' own exception. Not read,
stated: a `clip-path` or mask on the money node itself (CLAUDE §6's "a look
hiding money by opacity, clip, mask or transform", still the owner's call),
and a cut from below by an ancestor (the node's and its boxes' own
vertical clip is read; `nothing-on-the-wall-is-cut-from-below` reads the
wall's). **Owed** (`selfClipByClass`): every geometry pass, money figures
asked on every look it painted (593–1,441 a shipped look a pass, the
skeleton 148–469).

**Red proofs** (2026-10-14, the scratch clone, the probe page):

- **plant f** (the critic's), `.t-neo.shop-window[data-mode='cycle']
  .item-head .item-p .item-x { display: inline-block; max-width: 2.5em;
  overflow: hidden }`: 2 failures (bare and worn) on every Neo Cycle screen
  at the counter tablet and the canvas, e.g. "span.item-x
  "123.45 XEC" is clipped by itself (overflow hidden hidden; width
  80.625px, max-width 80.64px …): 119px of its content hidden sideways";
  beside them, at the tablet and the canvas, the plant's own
  `nothing-in-the-body-reaches-the-status-line` (its lines wrap and the card
  grows);
- **the second half**, `.stall.t-neo:not(.shop-window) .item-head .item-x {
  display: inline-block; width: 1px; white-space: nowrap }`: 30 at 390 and
  18 at 1280 on `offers`, "is narrower than its own text (its box 336–337,
  its text 336–385 …), and its text is cut sideways by div.item", one "runs
  past the viewport's side edge" — beside `text-spills`, which reads the
  same block's spill;
- **the whole runner** (the runs above): main failed plant f only by its
  side effects — the contrast pass's digit read on the one wrapped Cycle job
  pair (`shop-window-cycle-longest-figure` at the desk: "2 of its 20 letters
  and digits stand on no line of it"), the status line and the Cycle rule
  where the clipped box wrapped; the branch: this rule on every Neo Cycle
  card, 70 at the canvas, 98 at the tall wall, 86 at the tablet, 70 at
  `desk-wall`, 86 at `short-wall` and 16 at the desk.

### Cost (the three rules)

Back to back on this Mac, 2026-10-14 07:08 and 07:12 (load 2.0 rising to
5.1 — another builder's work beside the runs), the full runner with no
selection: main 203.2s, the branch 208.2s (+5.0s, of 300). The geometry
passes 57.5 → 61.2s (+3.7s): the phone 8.3 → 11.2s, the desk 10.3 → 12.7s,
the canvas 5.7 → 5.8s, the tall wall 7.7 → 8.1s, the tablet 5.7 → 6.1s,
`desk-wall` 4.7 → 4.9s, `short-wall` 6.7 → 5.8s and the narrow phone 8.4 →
6.6s (the last two faster on the branch: the machine, not the rules). The
contrast pass 130.1 → 134.1s, where the rules do not run (a contrast page
asks `?screens=` and measures nothing); that +4.0s is the load. One pair,
not repeated. All three are computed style, layout rects and the tree's
own scroll sizes: no capture, no new screen, no new job.

### Round 2 (CRITIC-MONEY-GUARDS, 2026-10-14)

The critic reproduced every round-1 red proof and found the rules read
less than they say. Each item below replaces the round-1 paragraph it
names; those paragraphs stay above as the record.

**The static belt refuses the pieces alone** (P3-3): `.fig-say` and
`.fig-end` (`FIGURE_PIECE`). `.fig-wraps` and `.fig-narrow` mark the whole
figure's box in its re-flow, which a look may dress
(`a-look-may-not-dress-a-figures-pieces` now takes them). **The workshop
README states the rule** (D-2026-10-14-06, the owner's words, as its own
paragraph after "Money is never covered, cut or faded"), with
`workshop:probe` as its check; the kit's lint is unchanged.
`a-look-may-not-dress-a-figures-pieces` holds the line in the README, and
where it stands. Red: `selectorProblems` without its `FIGURE_PIECE` half,
and the README line taken out.

**The ink rule is an allow-list over every computed property** (P2-1).
Round 1 read 47 named properties, so a piece was still dressed apart from
its figure through any other: a background in the ink's colour (Neo's
face, "516.15" a solid block), an outline drawn inward in the ground's
colour (Neo's pay sheet), a strike in the ground's colour 1.4em thick
(Rural's strip total), `font-size-adjust: 0.06` (Rural's pay sheet, the
last group 8×3 px with `font-size` still 18px), `zoom: 0.15` (Modern's pay
sheet), `word-break: break-all` (a digit group split over two lines on
Neo's face at 360), and `display: contents` or `none` on `.fig-say`, which
round 1 skipped as a figure with no box. Now (`figureInkFaults`): for every
piece — the `.fig-say` and every element under it but a `<wbr>` — every
longhand `getComputedStyle` yields, custom properties aside, equals what an
untouched piece computes in its place (`untouchedStyle`: a `span` with an
inline `all: unset` and `unicode-bidi: normal`, appended to the piece's
parent for the read and taken out). It inherits what an inherited property
inherits, takes the initial value of every other, and is blockified by a
flex, grid or `-webkit-box` parent as the piece is (the critic's P3-3 on
the display regex is gone with the regex). Each piece is read against its
own parent, so a dress anywhere in the chain fails where it is written, and
every piece is read before any reference joins the tree, so a structural
selector reads them as painted. Three named exceptions:

- the geometry `getComputedStyle` answers from a block's own box — `width`,
  `height`, `inline-size`, `block-size`, `transform-origin`,
  `perspective-origin` — on a piece a flex or grid parent blockified, alone
  (an inline piece computes them as the reference does, and is held to
  them);
- `box-sizing`, which the base sheet gives every element of the stall
  (`.stall *`) and `all: unset` takes off the reference;
- on `.fig-end`, `text-wrap-mode: nowrap` (and the `white-space` it rolls up
  to), the base sheet's one rule on it.

Besides: no generated `::before` or `::after`, and no animation or
transition of its own. **A figure is skipped only when the money node
itself is not painted** (display `none` on it or an ancestor, the way a
sheet with no rate hides its figure's row); a `.fig-say` with no box is
read, and fails on `display` by name (the merge condition). **Not read**:
the money node's own dress, every property of it (P2-3, the owner's call:
a look may dress the figure whole); a blockified piece's `width` (a
`width: 1px` on a `.fig-say` under a flex money node passes here); a state
(`:hover`, `:focus`) reaching a piece, which no probe rule paints.

**Owed per surface** (P3-3): `figureInkByClass` counts per look and per
surface (`figureSurface`: `face`, `paid`, `pay`, `line`, `total`, `strip`,
`chosen`, `row`, `wall`, `cycle`), and the runner owes every surface each
pass paints, every look (`FIGURE_SURFACES_OWED`): the phone and the narrow
phone the eight page surfaces, the desk those and `wall` and `cycle`, the
canvas and the four wall passes `wall` and `cycle`. Measured per shipped
look (the skeleton, bare only, half): the phone and the narrow phone
`strip` 6, `row` 10, `chosen` 12, `pay` 6, `line` 8, `total` 4, `face` 4,
`paid` 2; the desk the same and `wall` 6, `cycle` 2; the canvas and
`desk-wall` `wall` 6, `cycle` 40; the tall wall, the tablet and
`short-wall` `wall` 12, `cycle` 42. A plant that hides every figure on one
surface leaves a gap by name, where round 1's one read a look did not notice
(the critic's Neo 52 → 40).

**Red proofs** (2026-10-14, a scratch clone of the branch):

- the critic's plants (`b-inkmiss.css` and `b9.css`, appended to
  `stall.css` at once), on the probe page: 54 failures of this rule at each
  of 390, 1280 and 360, each plant by its property — "`.fig-say` computes
  display none" (Modern's strip total and face, Rural's quote face, Neo's
  chosen line), "display contents" (Rural's face), "`.fig-end` computes
  background-color …" (Neo's and Modern's face), "outline-…" (Neo's pay
  sheet), "text-decoration line-through …" (Rural's strip), "font-size-adjust
  0.06" (Rural's pay sheet), "zoom 0.15" (Modern's pay sheet), "span
  computes word-break break-all" (Neo's face). Round 1's rule read none of
  them;
- the whole runner (every round-2 plant at once, scratch clones of the
  branch and of main run back to back): this rule 54 at each page pass —
  Modern 16, Neo 22, Rural 16 — and 0 on main.

**The self-clip rule holds every clipping box up to the surface** (P2-2).
Round 1 asked the node, `.item-a` and `.item-p` whether they clipped
content larger than themselves, and left out the record hexes and
`pay-lines` whole because they scroll by design — which admitted `hidden`
on them, and every other box: `.face-x` cutting a broken figure's second
line, Pay several's list clipped on the ordinary sheet, a record hex cut to
one line, a row head cut from below. Now (`cutFromItsSurface`): every money
node, the hexes and `pay-lines` included, and `.pay-line-x`, has its own
text — its range's line boxes — held, axis by axis, to the node and every
ancestor up to its surface (`SELF_CLIP_SURFACE`: `.item`, `.card`,
`.sheet`, `.zoom-card`, `.poster-page`, inclusive; else up to the shell's
scroll region, not asked). `auto` or `scroll` on an axis is reachable, and
above it the text is held to that box's edges; `hidden`, `clip` or a
painting `contain` is a cut, and text more than a pixel past that box's
padding box fails, naming it. A cut found inside a turned frame is read
again with the chain's transforms held off. The second half (own width,
`cutSideways` over the text) stands. **Not read**: the money node's own
`clip-path`, mask, opacity, filter, transform, spacing or decoration (P2-3);
any box's `clip-path`; a cut above the surface (the wall's region, from
below, is `nothing-on-the-wall-is-cut-from-below`'s); a line's ink past its
content area (the text is its line boxes).

**Red proofs** (2026-10-14, the scratch clone):

- the critic's four (`e-clip.css` at once), on the probe page: 52 failures
  of this rule at 390 and at 360 and 56 at 1280 — Modern's face "cut … by
  div.face-x" on `item-listing-long-figure` and `item-quote-long-figure`;
  Rural's Pay several "cut from above or below by dl.pay-lines" on the
  ordinary `pay-several` as well as `-figure-lines`, `-long-figure` and
  `-longest-figure`; Neo's record hexes "cut from above or below by itself"
  on `publish-name` and `describe`; Neo's rows "by button.item-head" on
  `row-17`, `row-21`, `row-longest-figure`, `quote-row-18`,
  `quote-row-longest-figure` and the strip's rows, and at the desk the
  wall's Browse rows "by div.item-head.sw-row". Round 1's rule read none;
- plant f, on the probe page: every Neo Cycle card at the tablet and the
  canvas ("span.item-x … cut sideways by itself");
- the whole runner (the runs above): this rule, Neo 28 and Rural 20 at the
  phone and the narrow phone, 52 and 16 at the desk, Neo 78 at the canvas
  and `desk-wall`, 114 at the tall wall, 102 at the tablet and `short-wall`,
  12 in the reduced-motion pass; 0 on main.

**The spill rule names only what the spilled words overlap** (P3-1). Round
1 held the box's whole height past its end, so money far down a tall box
was named though no glyph stood over it (under the private look at 0x04,
nine face cards past their edge at 360 "under span.addr-short", the sign's
address behind the sheet). Now the line boxes of the node's own text past
its end are held, each kept to the box's own extent across the spill and to
every clip between its text and the node (`spilledWords`: a name marquee's
cell clips the name it moves); a spill with no text past the edge keeps the
strip. While a sheet is open, the targets are the sheet's (`surface`), and a
node behind it is held to its own clipper alone. A figure's own words
(`.item-from`, `.item-u`) join the money list, so a money node narrower
than its own text is read where its digits land on its unit; with the line
boxes alone the critic's plant F would have passed. **Not read**: spilled
words past a box's end that land on text not on either list; a spill
behind an open sheet over anything but its own clipper.

**Red proofs** (2026-10-14, the scratch clone):

- the critic's plant F (`f-ownbox.css`: Modern's face figure and Neo's pay
  figure `inline-block`, 1px wide, nothing clipping), on the probe page:
  "span.x paints 93px past its box (94 > 1), under span.item-u", where round
  1 named the address behind the sheet;
- the whole runner (the runs above): this rule Modern 91 and Neo 210 at the
  phone and the desk (Neo 210 at 360), and no `text-spills` left; main
  reported Neo's as `text-spills` (210, 56 and 182 under a wrong neighbour)
  and Modern's as `asked amount is covered` alone;
- under the private look at 0x04 (below), the nine misnamed spills are gone;
  the face figure past its card is `a-card-figure-stands-inside-its-row`'s,
  as it was.

**Unplanted, every shipped look, the skeleton and the tracked fixture read
0 on all three rules at every geometry pass**, and the round-3 and round-4
spill reads stay quiet. Two misfires found and closed on the way, both of
the line boxes: a name marquee's text past its cell (a 5px name spill read
over the figure on Neo's touch wall at 1920), and a content area taller than
its box (the face's picture button under the zoom's close, Rural, 7px).

**The private look at 0x04** (`fc874044`, not the pinned pair, read bare
only; its files not opened): against the critic's run of main with the same
selection, one new failure — `row-17`, at 360: "span.item-x
"99,999,999,999.99" has 9.9px of its text cut sideways by div.item"
(`a-money-figure-never-clips-itself`), not looked at; the nine misnamed
spills gone; nothing else differs (mobile 21, narrow 148 from 156, the
sticky-sign pass 7, contrast 3, all as before).

**Cost** (2026-10-14, back to back, load 1.6 rising to 5.4): main 227.5s,
the branch 240.1s (+12.6s, of 300). The geometry passes 66.6 → 73.3s
(+6.7s; each of the eight +0.6 to +1.3s); the contrast pass 145.8 → 151.7s,
where no rule of these runs, so its +5.9s is the load. Timed in the page
(`performance.now()` around each call, a scratch build): the ink rule
0.39–0.57s a pass, 3.8s over the eight; the self-clip rule 0.09–0.15s a
pass, 0.95s over the eight. Round 1's pair was +3.7s of geometry; the
allow-list roughly doubles that. One pair, not repeated.

### Round 3: a money figure is never misdressed (`a-money-figure-is-never-misdressed`, D-2026-10-19-01)

The owner's decision on the round-1 critic's P2-3 ("chọn a"): dressing the
whole money figure must not misstate it. Round 2 held a broken figure's
pieces to the figure and every box that clips its text, and left the
figure's own dress unread: `.item-x { clip-path: inset(0 0 0 55%) }` read
"200 XEC" for 1,200 XEC on every ordinary row of Neo with the whole runner
green on `offers`, `letter-spacing: -0.45em` piled Modern's digits, and an
opacity, a zoom, a `font-size-adjust`, a negative `text-indent`, a ground in
the ink's own colour and a box's `clip-path` across the digits each hid or
shrank a figure under every rule.

**The subjects** (`moneyDressFaults`, `layout/probe.ts`): on every screen,
look and variant of every geometry pass, every money node painted
(`MONEY_SET`), Pay several's line figures (`.pay-line-x`) and the element
every broken figure is written into (`.fig-say`'s parent), the door's deck
minis aside and a node not rendered skipped. Three reads.

**1. Its own dress: an allow-list over every computed longhand.** The
subject, and every element under it that holds text (a button's words in
their span; a `.fig-say` subtree is the ink rule's), computes longhand by
longhand, custom properties aside, what an untouched element computes
**outside the stall** (`dressReference`: a `span` with `all: unset`
appended to the stall's own parent, read once a page) — or the longhand is
in a family a look may dress freely (`DRESS_FREE`), or it is held to a
condition (`DRESS_HELD`), read whatever the reference says. The reference
stands outside the stall because an inherited longhand a look writes on a
box above the figure reaches the figure, and a reference inside the stall
would inherit the same dress and call it untouched; the conditions are
read absolutely for the same reason. (Round 2's piece rule reads a piece
against its own parent, which is right for a piece and blind for the
figure.) A free longhand may compute anything, so it is not read
(`dressReadList`); in this Chrome every longhand is free or held but one,
`text-fit`, which must equal the reference — and so must every longhand a
newer engine adds, until it is named. (Of this Chrome's 480 longhands, 43
are held, 436 free and that one left; three held names it does not list —
`-webkit-mask-image` and `-webkit-background-clip`, aliases it computes as
`mask-image` and `background-clip`, and `mask-border-source`, a longhand it
does not have, whose part `-webkit-mask-box-image-source` plays.)

**Why not "the node with the look's dress removed"**, which the decision
asked for if it could be made sound: the dress comes off only by taking
the look's `t-*` and `att-*` classes off the stall and putting them back,
which cancels and restarts every animation the look runs (the tree the
probe seeked and measured is no longer that tree), starts a transition on
every property a look transitions (`getComputedStyle` then answers the old
value at the transition's first frame, so the reference reads the very
dress it was meant to remove), and lays the whole stall out twice a screen.
The untouched element outside the stall needs none of that.

The free families, each with the reason it cannot misstate a figure (the
table's own words): the room around the box and its edge (painted outside
the content where the glyphs stand); its size (what it cuts is the
self-clip rule's); where it stands and how it lays out its content (a
figure moved is the coverage, spill and clip rules'); the face, size,
weight and setting of its text (the same digits in another face; the size
has its floor, the faces are held to the served ones statically); every
colour but the ground's (the contrast pass reads ink on ground); paint
beside, under or behind the glyphs (a box shadow, a backdrop filter, the
background's position and size, a border image, the mask longhands that do
nothing without a mask image, a decoration's colour and style without a
line); the corners and the rules between rows and columns; how the box
answers a hand, a scroll or the top layer; the timing of a motion; what
means nothing without a transform or a motion path; a prefixed twin of a
free longhand; SVG paint; lists, tables and pages.

The conditions (`dressHeldFault`), each with its reason:

- no `clip-path`, `clip`, mask image, mask border or mask box image on the
  figure itself: its own shape cuts its own digits (a box above may clip,
  read 3.);
- no `filter`, `mix-blend-mode`, `-webkit-box-reflect`, motion path,
  individual `rotate`, `scale` or `translate`, and no `transform` but none —
  save **a uniform scale of at least 1, unturned and unmoved**: the stream
  card's pulse (`bc-pulse`, broadcast.css) grows a figure that changed to
  106% for 0.4 s;
- `opacity` 1, `visibility` and `content-visibility` visible, `zoom` 1, no
  `font-size-adjust` (the critic's zoom 0.15 and adjust 0.06 painted an 18px
  group 9×4 and 8×3 px with `font-size` still 18px, the size the type floor
  reads), `content` `normal`;
- no negative `word-spacing` or `text-indent`;
- **a negative `letter-spacing` may take up the room between two glyphs and
  no more** (`spacingPiles`): for every two adjacent characters of its text
  (read in runs of one face and spacing, so a broken figure's groups — a
  text node each, `.fig-end` its own — are read across the comma where they
  meet), the spaces between them counted, the spacing may not make their
  inks share a pixel the face keeps apart — both glyphs drawn alone on a
  canvas in the text's computed face, at the spacing and at none, and the
  pixels both cover
  at least half counted (a pair whose ink boxes stay apart is not drawn; a
  pair's answer is kept for the run, by face, spacing and pair). The
  decision's words were "no negative letter-spacing", which fails every look
  but Neo: the theme table's price track is `-.02em` on the default row
  (Modern's, so the skeleton's and the tracked fixture's), and Modern's and
  Rural's sheets set `-0.01em` on `.item-x` — on the money nodes, −0.16 to
  −1.6px. That is a design the owner approved and misstates nothing, so the
  rule reads the piling, not the sign; the literal reading, and its cost of
  changing every figure's tracking, is the owner's to take. A first reading
  by ink boxes alone was wrong the other way: it failed `7,` on every long
  figure (the 7's bar overhangs the comma's box, and their inks never meet).
  Measured on a canvas (2026-10-19): at `-0.02em` no pair of the ten
  figures, the comma and the point shares a pixel in Inter 800, Stall Serif
  700 or JetBrains Mono 700 at 25–26px, nor in the first two at 120px; the
  first shared pixels come near `-0.08em` in Inter 800 at 120px ("71"), near
  `-0.05em` in Stall Serif 700 at 120px ("34"), near `-0.15em` in JetBrains
  Mono 700 at 26px ("00"); the critic's `-0.45em` shares 67–1,825 pixels on
  the worst pair. **The canvas draws proportional figures where the sheets
  set tabular ones** (no canvas takes `font-variant-numeric`): Inter's
  tabular 0 and 4 are 0.03em narrower than its proportional ones (64.6
  against 67.4 and 67.6px at 100px; Stall Serif's tabular figures are as
  wide or wider, JetBrains Mono's equal), so within about 0.03em of the
  spacing where two Inter digits touch, the rule can read them apart where
  the screen sets them touching;
- the glyphs painted in the figure's ink: `-webkit-text-fill-color` is
  `color`, no `-webkit-text-stroke`, no `-webkit-text-security`, no
  `background-clip: text`;
- **no ground in the ink's own colour**: a `background-color`, or a colour
  stop of a gradient, at least half opaque, reads 3:1 against the ink
  (`MIN_CONTRAST`); a picture under a figure (`url()`, `image-set()`) fails,
  a ground this rule cannot read; a fainter tint is the contrast pass's;
- **no outline across its glyphs**: the outline's inner edge (the border box
  moved out by `outline-offset`, in by a negative one) stands outside every
  line's ink (`inkLines`);
- **no line through or over it**: no `line-through` or `overline` in effect
  on its text (`-webkit-text-decorations-in-effect`, which carries a line
  drawn from any box above) or written on a box up to its surface, and an
  underline only at the face's own thickness and position; no
  `text-emphasis-style`;
- **no copy of it**: a `text-shadow` layer blurred at least as far as it
  stands off is a glow; a sharp layer stands within 0.12em of the glyphs it
  copies (`DRESS_SHADOW_EM`: under the thinnest stem of a served face's "1",
  0.13em in JetBrains Mono 700 — Inter 800 0.16em, Stall Serif 700 0.15em,
  on a canvas at 100px) or within the rain outline's reach, which small text
  wears in its ground's colour — a sharp copy farther off stands apart from
  the stroke it copies, a second figure;
- read in order: `direction` ltr, no `bidi-override`, `writing-mode`
  `horizontal-tb` (and its prefixed twin), no `display` that prints a list
  marker;
- every keyframe of every animation it runs, and of a transition while one
  runs, each held longhand resolved and held to its condition
  (`animationFaults`): the pass freezes one instant, and a figure is not
  dressed at the others. A value is resolved on one scratch block in a
  fixed, zero-sized, hidden box outside the stall that contains its own
  layout (a scratch put into the figure's own row and taken out re-laid the
  page out on the next read, every row; on an element with no box a
  transform resolves to `none`); a value naming a custom property is
  resolved where the box stands;
- no generated `::before` or `::after` on it or an element under it with
  text.

**2. The boxes that hold it, up to its surface** (`SELF_CLIP_SURFACE`,
inclusive; else up to the shell's scroll region). A paint effect that is
not inherited never reaches the figure's computed style, so the boxes are
read where the effect is written — a plant on `.item-a` in place of
`.item-x` is the obvious way round part 1: no `filter`, `mix-blend-mode`,
reflection, motion path, `zoom` but 1, opacity under 1, or `transform`,
`rotate` or `scale` but a turn of at most 10° (`DRESS_TILT_DEG`) with any
shift and no shrink, stretch, skew or mirror — at rest and at every keyframe
of an animation the box runs (a keyframe that moves a `clip-path` fails: a
clip that moves is read at no instant). One exception, named: the stream
card's stale plate (`.bc[data-state='stale'] .plate`, opacity 0.72), which
says its figure is old by fading it — the app's own sentence; no fixture
paints it today. Rural's tag sways ±0.8° (`t-rural-tag`, read keyframe by
keyframe) and its rows tilt 0.6°; the ticker's ribbon only shifts.

**3. Every clip above it, up to the stall.** A box above the figure may
clip, mask or `clip-path` it only where its shape encloses the figure's
ink (`inkLines`, the sign rule's model), read in the box's own frame: every
transform from each such figure to the stall is held off once a
measurement (`withTransformsHeldOff`: inline, `!important`, and put back
longhand by longhand through the CSSOM — the policy refuses an inline
`style` attribute, and the first build's `setAttribute('style', …)` restore
failed the full runner 846 times on `the-probe-page-meets-no-csp-refusal`),
as `cycleFigureFaults` reads the Cycle card, so Rural's swaying tag is read
in the frame its polygon is written in. An `inset()`, `circle()` or
`ellipse()` is resolved by `paintClips`; a `polygon()` through
`parsePolygon`, every corner and every 2px of every edge of every ink box
inside it and no vertex inside an ink box (a notch cut into the figure); a
`clip: rect()` as a box. Any other shape (`path()`, a box keyword, `url()`),
any mask, and any `clip-path` above a box that scrolls fail: a shape this
rule cannot read is not a shape it passes, and a figure that scrolls under a
clip is not read whole by one reading at rest. `overflow` is
`a-money-figure-never-clips-itself`'s.

**Not read, stated**: a figure a look hides whole — a money node not
rendered is skipped, as the ink rule skips it, because the app hides
figures too (a sheet with no rate, the address's two spans by width), and
of the money set only the price role and "You pay" are held to having a box
at all (`coveredBy`); an element under the subject that is not rendered;
where the figure's box stands; a filter, opacity, transform or blend on a
box above the surface; a shrink by a font feature (`font-variant-position`,
`sups`), which keeps the computed size the floor reads; an in-flow pseudo of
a box above it (the contrast pass's look-pseudo frames read its paint
inside a protected box); a `:hover` or `:focus` state, and a transition
until it runs; the figure's words beside it (`.item-from`, `.item-u`); a
clip above the stall.

**Owed** (`dressByClass`, `dressClipByClass`, `probe-coverage.mjs`;
`the-dress-rule-is-owed-on-every-look-and-under-rurals-tag`): every
geometry pass, money figures read on every look it painted; and on every
geometry pass that painted Rural, a figure read under its tag's clip-path —
Rural's notch is part 3's one shipped subject, and a pass that read none
compared no shape. Measured (2026-10-19, the shipped looks, the fixture,
the skeleton bare only): the phone 1,069–1,198 a look (the skeleton 444),
Rural 501 under its tag; the desk 1,158–1,309 (472), 591; the canvas
1,030–1,390 (261), 384; the tall wall 1,082–1,462 (256), 474; the tablet
and `short-wall` 692–916 (178), 201; `desk-wall` 608–812 (151), 111; the
narrow phone 774–849 (337), 286.

**Shipped looks, the skeleton and the tracked fixture read 0 at every
geometry pass.** The rule's own errors found on the way, none a look's: the
ink-box reading of a negative spacing (`7,`, above); `mask-border-source`,
which this Chrome computes as an empty string, read as none; the restore
through the style attribute (part 3).

**Red proofs** (2026-10-19):

- **the critic's eight, through the whole runner** (one run, every plant
  appended at once to the three look sheets of the worktree and taken out
  after; a scratch clone of the branch's parent, `757feb6`, run back to
  back with the same plants): `.t-neo .item-x { clip-path: inset(0 0 0
  55%) }` (the owner's example), `.t-modern .item-x { letter-spacing:
  -0.45em }`, `.t-rural .x { opacity: 0.12 }`, `.t-modern .pay-x-n { zoom:
  0.15 }`, `.t-rural .pay-x-n { font-size-adjust: 0.06 }`, `.t-neo
  .pay-total { text-indent: -40px }`, `.t-neo .x { background-color:
  currentColor }`, `.t-rural .item-a { clip-path: inset(0 0 0 50%) }` (a
  box above the figure). This rule, each by its own words, on every pass
  the plant's screens are measured — the clip-path on the figure ("a
  clip-path (inset(0px 0px 0px 55%)) on the figure itself") Neo 470 at the
  phone, 552 at the desk, 342 at the canvas, 424 at the tall wall, 190 at
  the tablet and `short-wall`, 108 at `desk-wall`, 274 at the narrow phone
  and 76 in the reduced-motion pass; the spacing ("letter-spacing -11.7px
  piles "87": 59 pixels of their inks overlap that the face keeps apart")
  Modern 439, 513, 300, 374, 179, 105, 179, 262 and 64; the box's clip-path
  ("has its ink at … cut by span.item-a's clip-path inset(0px 0px 0px
  50%)") Rural 501, 583, 384, 474, 201, 111, 201, 286 and 88; the zoom
  Modern 29 at each page pass (5 reduced); the adjust Rural 31 (7); the
  opacity Rural 34, 34, 27; the ground ("a ground its own ink reads at
  1.00:1 …") Neo 32, 32, 26; the indent Neo 8 at each page pass. On the
  parent, none of this rule (it is not there), and of the eight only side
  effects: the ink rule saw the zoom through the computed widths of the
  pieces' medium borders (6 a page pass), the card rule and the self-clip
  rule saw the indent push Pay several's total past its row (8 each), and
  the contrast pass's digit read saw broken figures on its five screens (44
  figures) — nothing on `offers`, nothing on the walls or the canvas;
- **every other branch, on the probe page** (a second set at once, the
  phone and the desk): opacity 0.1 on `.item-a` ("span.item-a above it:
  opacity 0.1", 423 at the phone), a blur on `.face-x`, `scale(0.3)` on
  `.pay-x` ("shrinks or stretches it"), `scaleX(-1)` on `.item-a`
  ("mirrors it"), `rotate: 180deg` on `.face-x` ("a turn of 180° (more
  than a 10° tilt)"), `mix-blend-mode: difference` on `.face-x`, a
  line-through on `.row.big` (named on the box and as in effect on the
  figure), a gradient mask on Pay several's total block ("stands under a
  mask"), `clip-path: path(…)` on a row head ("a clip-path this rule cannot
  read"), a sharp `text-shadow: 0.6em 0 0` ("a copy farther off than 4.3px
  stands apart"), `direction: rtl` with `bidi-override`,
  `-webkit-text-security: disc`, `text-fit: grow` (the residual: "which no
  rule lets a look dress"), and a `::after` generating `◆`; each failed
  under this rule by its own words;
- **the owed counts**: `the-dress-rule-is-owed-on-every-look-and-under-rurals-tag`
  red with the owed read taken out on either half.

**The private look at 0x04** (`fc874044`, not the pinned pair; its files not
opened): the branch and its parent with the same selection, back to back,
fail the same 179 lines, line for line — the phone 21, the narrow phone
148, the short phone 7, contrast 3, all pre-existing — and none is this
rule's. It read `t-inkwash` 151–471 money figures a pass, the skeleton's
counts to within one: the look is painted bare only, as the round-2 critic
found, so what its worn dress does under this rule is not read.

**Cost** (2026-10-19, the full runner with no selection — the tracked
fixture carried — against the branch's parent, on this Mac at load 3 to 7,
another builder's work beside the runs). The rule as first built cost the
geometry passes 24.6s (73.6 → 98.2s; 230.1 → 262.0s in all): it read every
longhand, put a scratch element into each figure's row to resolve a
keyframe (which re-laid the page out on the next read), and held the
transforms off once a figure. Read once where they repeat (`dressReadList`,
`boxFaults`, `clipsAtAll`, the reference once a page, a pair's piling once a
run, one contained scratch box, one hold for every clipped figure), the same
answers cost: parent first, 249.1s against 267.5s (+18.4s; geometry 81.4 →
94.1s, +12.7s); branch first, 257.3s against 247.4s (+9.9s; geometry 90.6
against 84.0s, +6.6s); the contrast pass, where no rule of these runs, moved
1.9 and 2.1s with the load. Timed in the page (`performance.now()` around
the call, a scratch build): 0.5–1.1s a pass, 6.2s over the eight — part 2
0.05–0.17s, part 3 0.07–0.30s, the held and unfreed longhands 0.08–0.12s,
the piling 0.03–0.06s a pass. **The margin is thin**: 257–268s of the 300s
ceiling under this load, against a measured parent of 230–249s.

### Round 4: what the dress rule did not read (CRITIC-MONEY-GUARDS, re-review of rounds 2 and 3)

The critic found D-2026-10-19-01 not delivered: a whole figure was still
hidden by an inset `box-shadow`, a `border-image` or a border the text ran
onto, all in the ink's colour; by an ink at 6% alpha; and piled by a
`line-height` of 0.3 — each with the whole runner green. Its P2s and P3s
named a break inside a digit group, columns that reordered a figure, a fade
on a box above the card, a ring of sharp shadows, a neighbour's shadow, two
shapes read square, a polygon's reference box, two restores through the
style attribute and coverage owed per look alone. Each item below replaces
the round-3 paragraph it names; those stay above as the record.

**A ground in the ink's colour is read from every paint under the glyphs**
(P1-1; `groundFault`, `groundAboveFault`). Round 3 read the subject's
background alone, and freed three properties that paint in the same place.
Now, for the subject and every element under it with text:

- **its own paints**: the background colour and every layer of its image,
  over their clip box; every `box-shadow` layer, an inset one over the
  padding box outside its hole (the padding box moved by its offset and
  shrunk by its spread), an outer one outside the border box; every border
  side with a width; a `border-image`, over the padding box with `fill`,
  over its border bands and outset otherwise;
- **the paints of every box above it**, up to and with the stall: the
  background colour, box shadows, borders and border image of each, against
  the element's ink, over its glyphs as painted — cut by every box between
  that clips what it holds (the first build read Rural's 35-line wall
  payment, whose lines scrolled out of their list stand under the plate's
  bottom border at rest, as a ground: 14 a wall pass) — until the nearest
  box with an opaque background colour, which hides every paint above it
  (read, then the walk stops); an element with an opaque background colour
  of its own stands on its own ground and the walk does not start.

Each paint, where it meets the ink, at least half opaque and under 3:1
against the ink, fails; a picture there (the element's own background or
border image, or a box above's border image) fails, a ground this rule
cannot read. A shadow's blur is not added to where it paints: the blur's
half-opaque line is the unblurred edge, and a paint fainter than half is
the contrast pass's. A box that clips its content paints no glyph outside
its padding box, so its own borders and outer shadows are not under its
text (Rural's dashed record hex, whose scrolled lines run under its bottom
border at rest, was the false alarm that taught it). **A box above's
background image is not read**: a box paints its decoration in those layers
— the rain's tiles (a picture, on every stall that wears it), the aurora's
washes, Neo's brackets and scanlines — each placed and sized by a position
and a size this read does not resolve, and what they paint under a figure
is the contrast pass's, read at the rain's worst. A `backdrop-filter` but a
blur is held on the figure and on every box above it: any other function
repaints the ground behind the glyphs from whatever is behind them (Modern's
sign and its dock blur theirs, and pass). A box's geometry is read only
once a paint's colour fails.

**The ink is held opaque** (P1-2). `color` is held at alpha 1 on every
subject and every element under it with text: a faded ink is a faded
figure, as `opacity` is. `-webkit-text-fill-color` is held to `color`, and
a text stroke to no width, so their alphas are held with it. **Not built**:
the contrast box read still drops the ink's alpha (`scripts/layout-check.mjs`
reads a computed ink's red, green and blue alone). On a money subject the
dress rule refuses that ink on every geometry pass before the contrast pass
samples it; compositing the alpha there changes what every non-money target
reads, outside this decision, and wants its own measurement.

**The figure's lines** (P1-3, P2-1; `lineFault`), where its text is one
inline flow (every text node of it set in the same block — a list's rows,
or a button's words in their own box, are not one flow and are not read
here):

- in order: its fragments (one per text node and line) taken line by line —
  lines are fragments on one baseline, within 0.15em of the smaller face,
  never by their boxes' overlap, which a `line-height` piling two lines
  makes complete — from the top, and left to right along a line, are the
  text's own order; columns, a reversed flow, an `order` or a moved part
  fail;
- no line break between two digits, or a digit and a point (every money
  node but an address and a record's bytes, `NOT_FIGURE_TEXT`, which wrap
  anywhere by design): `word-break: break-all`, `line-break: anywhere` fail
  where they split a group;
- lines apart: two lines whose ink boxes meet are drawn on a canvas where
  they stand, and a pixel both cover at least half fails.

The reads run in each figure's own frame: one hold of every transform from
every subject up to its stall a measurement (`withTransformsHeldOff`), since
Rural's tag sways and its rows tilt and a line at rest stands on no one
baseline (the first build read Rural's broken figures out of order, 6–38 a
pass, for exactly that). `text-overflow` but `clip` and any `line-clamp` are
held: an ellipsis printed in place of digits, or of a broken figure's later
lines, is not in the text the reads see. Not read: a single line set so
tight that the line above or below stands on its glyphs (the coverage and
spill rules').

**The boxes above, to the stall** (P2-2). Read 3. of round 3 walked to the
surface; it now walks every box from the figure up to and with its stall
(`boxFaults`, cached per box a measurement). A screen hung sideways turns
the whole stall a quarter turn (`.stall[data-turn]`, window.css), and is
the one quarter turn passed: the figure stands upright on the screen it is
painted for (either way; no pass paints a turned wall). The stale plate
stays the one opacity passed.

**Sharp shadows are judged as a set** (P2-3; `shadowFault`). The sharp
layers (blurred less than they stand off) and the glyph itself stand within
0.12em of each other, two by two: the set's spread, so eight copies each
0.12em off in a ring no longer pass. The rain's outline — one opaque colour,
unblurred, exactly one of the two sets (`outlineSet`) — is set apart
whole; the floor round 3 gave every layer (the outline's 2.24px reach) is
gone, so an ink-coloured copy at a small size is held to 0.12em.

**A neighbour's shadow, and an outline above** (P2-4;
`neighbourShadowFault`, `outlineAboveFault`). Every element with text of
its own under the figure's grandparent (its parent where the grandparent is
the stall: its unit, its "from", the words of its line) but the figure, its
own boxes and the boxes it stands in: a sharp `text-shadow` layer's copy of
that element's line boxes (moved by its offset, grown by its blur) that
meets the figure's ink fails — painted over the glyphs where the element
follows the figure, and as a ground where it comes before and is in the
ink's colour; a neighbour's shadow this rule cannot parse fails. The rain's
outline and every glow are not read. Read once per scope a measurement
(`shadowersUnder`: the rows of a list share their grandparent). The halo
rule (`a-halo-never-reaches-a-neighbours-text`) still reads box shadows
alone. And the ring of a box above's outline (between its inner edge, the
border box moved by `outline-offset`, and that edge grown by its width),
from the figure's parent up to and with the stall, meets none of its ink —
a negative offset draws an outline through what the box holds.

**Rounded shapes and a polygon's reference box** (P3).

- A clip-path `inset(… round …)` is read with its corners' curves
  (`insetRounded`, radii fitted as CSS fits them; round 3 read them
  square), and a polygon in the reference box it names (`polygonIn`).
  `parsePolygon` now refuses a reference box, so every other caller fails
  closed ("a clip-path this check cannot read") rather than reading the
  polygon against the border box.
- `a-money-figure-never-clips-itself` reads a box that cuts with rounded
  corners along their inner curve (`roundedCut`: each radius less its
  borders, the line boxes read first and the ink's corners only where one
  leaves the curve). A corner shape under `superellipse(1)` (`bevel`,
  `scoop`, `notch`) cuts inside the round curve, a corner this read cannot
  resolve, and fails; `superellipse(1)` is `round`, every card's computed
  default, and a larger exponent bulges outside the round curve, which is
  read for it and errs inward.
- Round 2's two `setAttribute('style', …)` restores (`moneySelfClipFaults`,
  `cycleFigureFaults`) go through `withTransformsHeldOff`, which also holds
  `scale` and `translate`; no `setAttribute('style'` is left in the probe.

**Owed per surface** (P3). `dressByClass` counts per look and per surface
(`dressSurface`: `sign`, `row` — the row's foot included —, `face`,
`sheet`, `strip`, `tag`, `activity`, `studio`, `card`, `wall`, `plate`,
`cycle`, `stream`, `ticker`, `door`), and the runner owes every surface each
pass paints on every look (`DRESS_SURFACES_OWED`): the phone the nine page
surfaces, the desk those and `wall` and `cycle`, the narrow phone its seven,
the canvas the three wall surfaces and the stream's two, the other wall
passes `wall`, `plate` and `cycle`. The door is Modern's alone and owed
nowhere. Measured 2026-10-19 (Modern, the phone): sign 185, row 541, face
119, sheet 187, strip 24, tag 4, activity 10, studio 2, card 2 (and the
door 1); the canvas: wall 474, plate 455, cycle 69, stream 11, ticker 21.
`the-dress-rule-is-owed-on-every-look-and-under-rurals-tag` is red with one
surface's read taken out on any pass.

**The README** (D-2026-10-19-02, the owner's words verbatim): the piece
paragraph gives a look "the box around it" where it said "shadow and
everything around it", and a new paragraph after it says what
`workshop:probe` holds the whole price to.
`a-look-may-not-dress-a-figures-pieces` pins both texts and their
positions (red on the old text, and with the new paragraph moved after the
QR paragraph).

**Unplanted, every shipped look, the skeleton and the tracked fixture read 0
on the rule at every geometry pass.**

**Red proofs** (2026-10-19, at `e04cb0c`; one whole runner a set, the
plants appended to the three look sheets of a scratch clone and taken out
after; counts are failing figures per pass — the phone, the desk, the
canvas, the tall wall, the tablet, `desk-wall`, `short-wall`, the narrow
phone and the reduced-motion pass, a pass the plant's screens are not on
left out). Sets A, B and C — the critic's plants, which its runs at
`f7ca686` read 0 on under this rule, and three of the round-4 builder's
(`line-break: anywhere`, the polygon's reference box, the rounded overflow
box), which `f7ca686` had no read for — each fail by their own words:

- `.t-modern .item-x { box-shadow: inset 0 0 0 3em currentColor }` (A1):
  "an inset box-shadow its own ink reads at 1.00:1" — 439, 512, 300, 372,
  169, 101, 177, 262, 64;
- `.t-neo .x { border-image: linear-gradient(currentColor, currentColor)
  fill 1 / 0 / 0 }` (A5): "a border image" — 32, 32, narrow 26;
- `.t-neo .pay-x-n { display: inline-block; width: 0; border-right: 4.6em
  solid currentColor }` (G2): "a right border" — 30, 30, narrow 30,
  reduced 6;
- `.t-rural .pay-x-n { color: rgb(60 40 20 / 0.06) }` (plant 3): "an ink
  at alpha 0.06" — 31 a page pass, reduced 7;
- `.t-modern .sel-total, .t-modern .pay-total { line-height: 0.3 }` (plant
  4): "its lines pile on each other" — 4, 2, narrow 8;
- `.t-rural .sel-total { word-break: break-all }` (plant 5): "a line break
  inside a digit group" — 2, narrow 2; `.t-modern .item-x { line-break:
  anywhere }`: the same, on the walls where the figure wraps — desk 1, tall
  2, tablet 10, `desk-wall` 4, `short-wall` 2;
- `.t-neo .sel-total { display: block; columns: 3 }` (E1): "its text is
  drawn out of its order" — 4, 4, narrow 4;
- eight `currentColor` copies 0.12em off in a ring on `.t-modern .pay-x-n`
  (plant 7): "8 sharp text-shadow layer(s) whose copies, with the glyph
  itself, stand up to …px apart" — 29 a page pass, reduced 5;
- 25 sharp `var(--s-surface)` copies of `.t-neo .item-u` (plant 6): "span.item-u
  beside it lays a sharp text-shadow … over its glyphs" — 438, 502, 68,
  134, 118, 54, 124, 246, 78 (the wall plate's unit, inside its money node,
  fails as a copy);
- `.t-neo .pay-total { -webkit-line-clamp: 1 }` (E3): "-webkit-line-clamp
  1" — 8, 8, narrow 8;
- `.t-rural .items { opacity: 0.15 }` (plant 8): "div.items above it:
  opacity 0.15" — 603, 707, 671, 775, 229, 125, 229, 364, 96; and
  `.t-neo .stall-body { opacity: 0.12 }` (G3): "main.stall-body above it" —
  736, 830, 1,134, 1,228, 760, 666, 760, 502, 84;
- `.t-neo .pay-x { clip-path: inset(0 round 0 100% 100% 0 / 0 50% 50% 0) }`
  (B3, an inset of nothing whose round corners alone cut): "cut by
  div.pay-x's clip-path inset(…)" — 22, 16, narrow 26, reduced 6;
- `.t-rural .item-p { clip-path: polygon(…) content-box }`: "cut by
  span.item-p's clip-path polygon(…) content-box" — 127, 123, narrow 100,
  reduced 18 — and every other polygon reader fails closed ("a clip-path
  this check cannot read", 4,512 lines in the run);
- `.t-modern .pay-x-n { display: inline-block; overflow: hidden;
  border-radius: 50% }`: `a-money-figure-never-clips-itself`, "cut by the
  rounded corner of itself" — 6 a page pass, where the padding rectangle
  passed them (23 more fail as cut from above or below, the rectangle's
  read).

Round 4's own plants (sets D, E, F), each by its own words:

- a box above's paint, the one read 19106f1 did not have (a probe-page
  run of the same set at `19106f1` read 0 on each): `.t-rural .item-a {
  background-color: var(--s-text) }` — "span.item-a above it: a ground the
  figure's ink reads at 1.00:1" — 501, 591, 384, 474, 201, 111, 201, 286,
  88; `.t-neo .face-x { box-shadow: inset 0 0 0 4em currentColor }` —
  "div.face-x above it: an inset box-shadow" — 32, 32, narrow 26; `.t-rural
  .pay-x { border-image: linear-gradient(var(--s-text), var(--s-text))
  fill 1 / 0 / 0 }` — "div.pay-x above it: a border image" — 31 a page
  pass, reduced 7; `.t-neo .item-a { outline: 2px solid #f0f;
  outline-offset: -6px }` — "span.item-a above it draws an outline … across
  its glyphs" — 470, 538, 322, 374, 150, 96, 164, 274, 76;
- `.t-modern .pay-x-n { display: inline-block; width: 0; box-shadow: 2.3em
  0 0 2.3em currentColor }`: "a box-shadow its own ink reads at …" (an
  outer one under text that overflows its box) — 29 a page pass, reduced 5;
- `.t-modern .item-from { text-shadow: 2.4em 0 0 rgb(20 23 26), … }` (the
  figure's ink, three copies of "from" laid before the figure): "span.item-from
  beside it lays a sharp text-shadow in its ink's own colour … under its
  glyphs" — 181, 207, 24, 51, 42, 16, 42, 92, 30;
- `backdrop-filter: invert(1)` on `.t-modern .face-x` (a box above) and on
  `.t-neo .sel-total` (the figure): "a backdrop-filter (invert(1)): it
  repaints the ground behind the glyphs" — 30, 30, narrow 25; 12 a page
  pass;
- `.t-neo .pay-x-n { -webkit-text-fill-color: rgb(255 255 255 / 0.06) }`:
  "glyphs filled rgba(…) where its ink is …" — 30 a page pass, reduced 6;
  `.t-rural .pay-x-n { -webkit-text-stroke: 3px rgb(0 0 0 / 0.5) }`: "a text
  stroke 3px wide" — 31, reduced 7;
- `.t-rural .sel-total { display: inline-block; overflow: hidden;
  border-radius: 6px; corner-shape: bevel }`: `a-money-figure-never-clips-itself`,
  "a corner of itself shaped superellipse(…), a corner this read cannot
  resolve" — 12 a page pass.

The owed counts: `the-dress-rule-is-owed-on-every-look-and-under-rurals-tag`
is red with one surface's read taken out on any pass. The CSSOM restores
are proved by the runner's own `the-probe-page-meets-no-csp-refusal` on
every clean and planted run, and by code (no `setAttribute('style'` is
left); no run here put a cut inside a turned frame with an inline style of
the app's own, the critic's latent path.

**The private look at 0x04** (`fc874044`, not the pinned pair; its files
not opened), the branch and main `c17ae5a` with the same selection back to
back: the branch fails 181 lines, main 189. The one line only the branch
fails is round 2's `row-17` at 360 (`a-money-figure-never-clips-itself`,
"99,999,999,999.99" cut 9.9px sideways by its row card: real ink, the
critic's crop, 8g2's to fix in the look); the nine only main fails are
`text-spills` lines naming the sign's address behind a face card, which
round 2's spill read no longer names. This rule reads 0 on `t-inkwash`,
the box-above read included — painted bare only, so its worn dress is not
read.

**Cost** (2026-10-19, on this Mac with another builder's `looks:diff`
running beside every run — load 4 to 7). The whole runner, main `c17ae5a`
and the branch at `e04cb0c` back to back in scratch clones, twice, the
order swapped: main 249.7s (geometry 74.8s), the branch 279.7s (101.2s);
the branch 291.2s (107.1s), main 255.7s (75.8s) — **+26.4s and +31.3s of
geometry, the branch 8.8s from the 300s ceiling at its slowest**; the
contrast pass moved 2.1 and 3.5s with the load. One earlier branch run at
load 8.7, before the read of the boxes above was cached, ran past the
ceiling in the contrast pass. Timed in the page (`performance.now()`
around the per-screen loop, scratch builds, all eight geometry passes, one
pair at load 2.7): main 54.7s, the branch 67.8s — the three money rules
15.0s of it, every other check of the loop within its noise; the rest of
the runner's +26–31s is not attributed (the loads differed, and the page
timing is one pair). Round 4's own share, against `19106f1` in the page twice:
the read of the boxes above as first built +2.3–3.3s over the eight
passes; read by colour first and near the text (`abovePaints`, the line
boxes grown by the text's size) +0.7–1.1s. **The margin is gone**: the
critic's recommendation stands — run the geometry passes on the contrast
pass's two tabs before `wall-offsize` merges on top; raising the ceiling is
the owner's last choice.

### Round 5: colours through the engine, the ground composited, lines across flows (CRITIC-MONEY-GUARDS, re-review of round 4)

The critic found round 4's promise still not kept: a whole figure was hidden
with the whole runner green by a ground in a colour space the reader did not
parse (P1-1), by grounds each under half opaque that are opaque together
(P1-2), and by one `display: flex` that made Pay several's total two flows
the line read skipped (P1-3). Each paragraph below replaces the round-4
paragraph it names; those stay above as the record.

**Every colour is a colour, resolved by the engine** (P1-1; `dressColour`,
`colourTokens` in `layout/groundStack.ts`). Round 4 read `rgb()`,
`color(srgb …)` and `oklab()` (`colourOf`) and took anything else for no
colour, so `inkOf` gave nothing and the ground reads returned at once, and
the ink's alpha passed. The build lowers a literal `oklch()`, `lab()` or
`color(display-p3 …)` to rgb, but not a colour that depends on the element:
Chrome computes `color-mix(in oklch, currentColor …)`, or a mix over a
`var()`, as `oklch(…)` or `lab(…)` (the critic's measurement; and this
round's plant read `oklch(0.202724 0.00758435 none / 0.06)` for a 6% ink).
Now every colour a computed value writes — every colour function with its
balanced arguments, the two keywords, a hex colour, and every bare word
`CSS.supports('color', …)` takes for one (a named colour) — is handed back
to the engine: set on a span in the document's head as `color-mix(in srgb,
<it> 100%, transparent)` and read back from its computed `color`, which
Chrome writes `color(srgb r g b / a)`: the page's own conversion, unrounded,
a channel outside 0–1 clipped as the display clips it; `currentcolor` is
the element's own computed `color`. Memoised per string a page. A value
whose parentheses do not balance, a colour the engine refuses, or a
one-colour property that does not hold exactly one colour is **a colour
this rule cannot read, and fails** ("a background colour this rule cannot
read", "an ink this rule cannot read"). Why the engine and not a canvas: a
canvas hands back eight premultiplied bits, losing a faint layer's hue, and
`fillStyle` has no element to take `currentcolor` from. The ink's alpha
(`color`, held at 1) is read the same way. The other colour readers in the
probe (the outline's, the at-rest rule's, the halo rule's) keep
`colourOf`: a colour they cannot parse fails there already, or is the
contrast pass's.

**The ground under the glyphs is the paints composited** (P1-2, replacing
round 4's "A ground in the ink's colour is read from every paint under the
glyphs"; `groundStackFault`, `worstGround`). The same paints are read, from
the element up to and with the nearest box whose background colour is
opaque (or the stall): its own background colour, image layers (a gradient
by its stops, a picture by its place), box shadows, borders and border
image, and each box above's background colour, box shadows, borders and
border image (`boxPaintsOf`, cached per box a measurement, the element's
own and a box above's apart). They are judged together: each stretch of
the glyphs' ink (`inkLines`), cut by every box in the walk that clips what
it holds, is cut into cells by the paints' edges, and on each cell the
paints that cover it are composited source-over in paint order — a box's
outer shadows (the last listed lowest), its background colour, its image's
layers (the last lowest), its inset shadows, its borders, its border image,
then the next box down — a gradient tried at each of its stops (at most
`STACK_CHOICES_CAP`, 256, ways a cell, or the stack is one this rule
cannot read). A cell whose composite is at least half opaque and reads
under 3:1 against the ink fails, naming the paints on it, top first. Where
the walk reached an opaque ground the cell is opaque and the judgement is
the ground the colours paint; five layers of the ink's own colour at 0.49
(0.97 opaque together) fail where round 4 passed each alone, and one such
layer over a cream card (the card showing through at 5.4:1) still reads.
**Its geometry is read only when the colours cannot pass it alone**
(`everyMixReads`): a composite's colour is, channel by channel, a weighted
mean of the paints' colours (blending in encoded sRGB), and where a stack is
judged at all a paint of alpha α weighs at most α / 0.5 of it — so the
lightest and darkest means those caps allow bound its luminance, and a
stack whose bound lies wholly on one side of the band that reads under 3:1
against the ink passes unmeasured, as does a stack that can never be half
opaque (`mostOpaque`). The bound counts every paint and every stop as if
they met one cell, so it is loose (a card's four borders and its shadows
all count): on the phone pass over the shipped looks and the skeleton,
2,829 of 4,070 stacks still read their geometry. Unit-held in `layout/groundStack.test.ts` (the critic's N9a and
N9b as numbers, a contrasting paint covering half the ink, a gradient's
stops, the cap, the bound).

**The figure's lines, flow by flow** (P1-3, replacing round 4's "The
figure's lines … where its text is one inline flow"; `lineFault`,
`flowFault`). A flow is the text set in one block — the nearest box above
a text that is not `inline` or `contents`. Round 4 read a node only when
its text was one flow, so `.t-modern .pay-total { display: flex;
flex-direction: column; width: 9em; line-height: 0.3 }`, which blockifies
the figure's `.fig-say`, printed the eight-byte figure over " in total" with
the rule silent. Now each flow is read for order, digit-group breaks and
piled lines as round 4 read the one flow; and across flows, two fragments
of different flows whose inks meet are drawn where they stand and a pixel
both cover at least half fails, and where the text enters a flow for the
first time, that flow's first fragment may not stand wholly above, or
beside on the left of, the first fragment of the flow it leaves (a
`row-reverse` printing "in total … =") — text that comes back to a flow it
began is that flow's own order. On the shipped looks and the skeleton the
one money node whose text is several flows is Pay several's
list (`dl.pay-lines`, 28 a page pass, counted over those four looks), and
it reads clean; the whole runner, the tracked fixture carried, reads 0. Not
read across flows, stated: a break inside a digit group (a group split
between two boxes is read within the flow that holds it), and the order of
a flow that begins beside another but below its first line.

**A pass the coverage tables do not name is a gap** (P3).
`GEOMETRY_PASSES` is exported beside `PASSES_OWING_NO_GEOMETRY` (the short
screens, the reduced-motion pass and the contrast pass, each with its
reason); `probeCoverageGaps` gaps on a pass in neither, and
`every-pass-the-runner-runs-is-in-a-coverage-table` reads every viewport the
runner defines off `scripts/layout-check.mjs` (`{ name: '…', width: … }`)
and holds each to the two lists, every geometry pass to the runner, and both
surface tables' keys to `GEOMETRY_PASSES`. So `wall-offsize`'s four
viewports turn `pnpm test` red until they are named, and a run that reaches
one unnamed fails as a rule that compared nothing. Red: a planted `{ name:
'side-tablet', width: 1024, height: 768 }` in the runner, and `short-wall`
taken out of `GEOMETRY_PASSES`.

**Not read, stated** (the docblock's list, corrected to what the rule
reads, P3-3): a money node not rendered (`display: none`,
`content-visibility: hidden`), skipped; where the figure's box stands; a
single line set so tight that the line above or below stands on its glyphs;
across flows, a break inside a digit group and the order of a flow beginning
beside another but lower; `hyphenate-character`; **a box above's background
image** (its gradients and pictures — the contrast pass's, and only on the
screens it samples: a look can scope such a paint to `data-paying`,
`data-touch` or `data-turn`, or to a screen the contrast pass does not
sample, and nothing reads it there — the critic's P2-1); **a paint
above the nearest box with an opaque background colour, whatever that
colour covers** (its `background-clip`, its rounded corners, ink that runs
past it — P2-1); a paint a box outside the walk lays under the glyphs (a
sibling's background or shadow, a positioned box — the coverage rules' —
and an in-flow `::before`/`::after` of a box above); a gradient between its
stops (each stop is tried, not the colours interpolated between two, nor an
`in <space>` interpolation's), a paint's rounded corners, the glyphs as
pixels (a cell is judged under the line's ink box, between glyphs too); the
ink's alpha in the contrast box read, and the contrast pass's blanking
through `color`, which drops a `currentColor` ground from its capture; a
shrink by a font feature; a stack of glows; **a neighbour's shadow from
beyond the grandparent** (the critic's N6: 121 sharp copies of
`[data-role="pay-final"]` moved 490–530px up erase "You pay" — P2-3); **a
state no pass paints** — `:hover`, `:focus`, `:focus-visible`,
`:focus-within`, `:active` — **and a turned wall** (`[data-turn]`): both
look lints admitted a clip scoped to either (P2-2); **the first-party look lint
refuses it now** (`a-look-state-rule-sets-only-what-a-state-may`, "The state
belt" below: a state rule sets colour, ground, border and outline colour, a
bounded shadow, a keyword cursor, transitions and the no-transform values, and
nothing else), the kit lint still admits it; a box above the stall.

**Unplanted, every shipped look, the skeleton and the tracked fixture read 0
on the rule at every geometry pass** (the whole runner, 2026-10-19, 291.0s
of 300 at load 4.6–5.9).

**Red proofs** (2026-10-19). First on the probe page, the plants appended to
the look sheets of the branch tip `5612189` and of this round, each built
into the scratchpad, the phone and the desk passes over `offers`,
`item-listing`, `item-quote`, `pay`, `pay-several`, `pay-several-long-figure`
and `pay-several-longest-figure`: at `5612189` the set read 2 failures a
pass, both the plain `$10.50` total on `pay-several` (one flow, which round 4
read); this round reads 84 a pass, each plant by its own words. Then the
whole runner on this round (a local clone, its ceiling raised to 1200s for
the planted run alone, the sheets planted there), failing figures per pass —
the phone, the desk, the canvas, the tall wall, the tablet, `desk-wall`,
`short-wall`, the narrow phone, the reduced-motion pass; a pass the plant's
screens are not on left out:

- `.t-rural .x { background-color: color-mix(in oklch, currentColor 100%,
  transparent) }` (N9a; Chrome computes `oklch(…)`): "the ground under its
  glyphs (its ground) reads at 1.00:1 on its ink" — the listing and quote
  faces, 34, 34, narrow 27;
- `.t-rural .item-x` with `background-color` and four inset `box-shadow`
  layers, each `color-mix(in srgb, currentColor 49%, transparent)` (N9b,
  0.97 opaque together): "the ground under its glyphs (its inset box-shadow
  over its inset box-shadow over … and 2 more) reads at 1.11:1 on its ink,
  1.00 opaque together" — 501, 591, 384, 474, 201, 111, 201, 286, 88;
- `.t-modern .pay-total { display: flex; flex-direction: column; width:
  9em; line-height: 0.3 }` (N4′): "its lines pile on each other: 187 pixels
  of "368,934,881,474," and "191,032.30 XEC" overlap" (the figure's own
  flow), on `pay-several-long-figure` and `pay-several-longest-figure`, and
  on `pay-several`'s `$10.50` as round 4 read it — 6, 6, narrow 6;
- `.t-rural .pay-total { display: flex; flex-direction: row-reverse;
  justify-content: flex-end }` (N4b): "its text is drawn out of its order:
  "in total" stands before "=" though it comes after" — 4, 4, narrow 4;
- `.t-modern .pay-x-n { color: color-mix(in oklch, var(--s-text) 6%,
  transparent) }` (the critic's runtime ink at 6%, which Chrome computes as
  `oklch(0.202724 0.00758435 none / 0.06)`): "an ink at alpha 0.06" — 29,
  29, narrow 29, reduced 5. The contrast pass stops at this plant's first
  sampled pay sheet ("unreadable computed colour", the runner's `rgbaOf`,
  unchanged here): that half is loud, but only on the screens it samples.

And on the probe page, at `5612189` 0 and this round 55 a pass on Modern: the
three boxes above the row figure (`.item-head`, `.item-p`, `.item-a`) each at
`color-mix(in oklch, currentColor 49%, transparent)` — "the ground under its
glyphs (span.item-a's ground over span.item-p's ground over
button.item-head's ground over div.item's ground) reads at 1.47:1".

The coverage tables: a planted `{ name: 'side-tablet', width: 1024, height:
768 }` in the runner, and `short-wall` taken out of `GEOMETRY_PASSES`, each
turn `every-pass-the-runner-runs-is-in-a-coverage-table` red.

**Cost** (2026-10-19, this Mac; the branch tip `5612189` and this round in
local clones, back to back, two pairs, the ceiling raised to 1200s in both
for the timing alone). The whole runner: `5612189` 268.9s, this round
231.3s (load 4.7–5.6, the contrast pass alone 159.0s against 123.0s — the
machine, not the code); this round 207.5s, `5612189` 207.2s (load 3.3–4.6).
The eight geometry passes summed: 91.6s against 94.0s, and 74.2s against
72.5s — **+1.7 to +2.4s**. In the page (the phone and the desk passes on
every screen, `performance.now()` around the ground reads, scratch builds,
two pairs): round 4's two ground reads 0.18–0.21s a page pass, this
round's stack 0.30–0.38s; the whole dress rule 1.10–1.47s against
1.22–1.55s. The colour bound passes 1,241 of the phone pass's 4,070 stacks
(the shipped looks and the skeleton) unmeasured (2,829 read their geometry); the line read across flows runs on
28 nodes a page pass. The unplanted runner in the worktree: 291.0s of 300
at load 4.6–5.9, the margin the machine's (the critic's figures for
`main` itself past 300s stand).

### Round 6: a blend held, a layer read where its tiles fall, a line split by its top, the contrast pass blanking the glyphs alone (CRITIC-MONEY-GUARDS, re-review of round 5)

The critic found four plants, each admitted by both look lints, that hide or
garble a money figure with the whole runner green: a blended ground (BL2), a
white layer one pixel square "covering" a ground in the ink's colour (SZ), two
lines of one text node piled within half a line (L2), and a ramp whose every
stop reads painting the ink's grey between them (G2). Three of them, and
round 4's N9a, wrote their paint from `currentColor`, which the contrast pass
blanked with the glyphs. Each paragraph below replaces the round-5 paragraph it
names, which stays above as the record.

**A blend is held** (BL2). `background-blend-mode` was free (the paint family
of `DRESS_FREE`), and the composite is source-over whatever it says:
`.t-modern .item-x { background-color: rgb(from currentColor 255 255 255);
background-image: linear-gradient(<the ink's inverse>, <the ink's inverse>);
background-blend-mode: difference }` read as the inverse over white, and
painted the ink. It is held now to `normal` (`DRESS_HELD`, `dressHeldFault`)
on the figure and every element under it with text, and on every box from it
up to and with the stall (`BOX_HELD`, `boxHeldFault`, which holds every box the
ground walk reads), beside `mix-blend-mode`, which was held in both places
already — at rest and at every keyframe. No served sheet sets either.
`isolation` stays free: the tracked fixture's sheet sets it on
`.stall-headings`, and it only keeps blends in; with every blend from the
figure up to the stall held to `normal` it cannot change a colour (the z-order
it gives a positioned child is the coverage rules').

**A gradient layer is read where its tiles fall** (SZ; `layerCovers` in
`layout/groundStack.ts`). Round 5 read each of the element's own gradient
layers over its whole clip box, its size, position and repeat unread, so
`background-size: 1px 1px; background-repeat: no-repeat` made one white pixel
a ground over the whole figure. Now a layer covers its clip area only when it
repeats on both axes (`repeat` or `round`; `space`, `no-repeat`, `repeat-x` and
`repeat-y` leave pixels bare) with a tile that has a width and a height (`auto`,
`cover` or `contain`, or a length or percentage over zero; a `calc()` is not
taken apart) over a positioning area that has both (its origin box, or the
viewport where the layer is `fixed`). Any other layer is tried absent as well
as at each stop (`MAY_BE_ABSENT`, a candidate at alpha 0), so every cell is
judged with it and without it — the sound choice of the two the brief offered:
reading the tiles' places would need the position, the size and the origin
resolved for every repeat mode and still meet the interpolation between stops
in the tile; tried absent, a layer is judged everywhere it might paint and
everywhere it might not, which is stricter than it paints and never looser. A
repeating layer at any position covers, so the shipped looks' layers keep the
read they had: the whole runner reads them 0. `background-clip: border-area`
(Chrome 155 supports it) clips a layer, and the colour under the last one, to
the border's bands.

**A character goes to the line it stands on** (L2; `lineOfCharacter` in
`layout/charLines.ts`). `fragmentsOf` gave each character of a text node set
over several lines to the first line whose rect held the character's middle; a
line's rect is its content area, a whole line tall whatever `line-height`
says, so at `line-height: 0.3` every character of the second line had its
middle in the first line's rect, the node read as one line, and "lines apart"
never ran. Chrome sets a character's range rect at its line's own top
(measured in Chrome 155 at `line-height` 0, 0.3, 0.35 and 1.2: every
character's top is its line's to the pixel), so each character goes to the line
whose top is nearest its own among the lines that hold it across; where lines
share a top (`line-height: 0`) a character that steps back left of the one
before it starts the next line. And `flowFault` never folds two fragments of
one text node into one line by their baselines: they are two of its lines by
construction, however close they stand. Unit-held in `layout/charLines.test.ts`
on the rects Chrome hands the probe at 0.3, 0 and 1.2.

**The contrast pass blanks the glyphs alone** (the shared root of BL2, SZ and
G2 on round 5, and of N9a on round 4; `blankGlyphs`, `showGlyphs`,
`glyphsBlanked`). The prepare set every target's `color`, and every element's
under it, transparent; `color` is also `currentColor`, so every ground,
border, shadow and gradient stop a look wrote from it left the ground capture
with the glyphs. Now an HTML element's glyphs go through
`-webkit-text-fill-color: transparent !important` and `color` stays. What
`color` painted as part of the glyphs still goes with them: an SVG element (a
drawn glyph, stroked and filled in `currentColor`) keeps the old blanking, and
a decoration line, an emphasis mark or a text stroke whose computed colour is
the element's `color` is set transparent beside the fill (`GLYPH_MARKS`). A
`::before` or `::after` inherits the transparent fill, as it inherited the
transparent colour; one that sets a colour of its own kept its glyphs under the
old blanking and keeps them now (`data-probe-pf-*` and an adopted sheet that
puts its fill back to its own `currentColor`), so the look-pseudo frames
(D6(i)) still see a glyph a look pseudo prints in a colour of its own. The
ring read's and the broken-figure read's second captures show and blank the
fill the same way, and every ink read takes the backup where the glyphs were
blanked. **The dump is unchanged**: `scripts/contrast-dump.mjs` against the
critic's run at `afbc626` (the shipped looks, the skeleton and the tracked
fixture) reads all 15,016 boxes over 823 jobs identical, on this round's code
in a clone (2026-10-19) and again in the worktree's own run; every summary line
of the pass (the ring, the sign name, the quiet zone, the boxes given no box,
the text no target reads) is the same, the contrast pages loaded (11 and 12)
and the seconds aside.

**Not read, stated** (the docblock's list, rewritten to what the code reads,
the critic's corrections on round 5): a money node not rendered, skipped; where
the figure's box stands, and a single line set so tight that the line above or
below stands on its glyphs; **across the flows of one node, all but two
things** — a flow is one element's text wherever the layout puts its pieces
(the anonymous boxes a grid or flex container makes of its text runs are one
flow), and where the text enters a flow for the first time, that flow's first
fragment stands neither wholly above the first fragment of the flow it leaves
nor wholly to its left on a line that overlaps it; text that comes back to a
flow it already began is read in that flow's order alone, so the critic's OR
(a grid on the total setting " in total" beside the figure's second line) reads
in order, as does a flow that begins beside another but lower; a break inside
a digit group between two flows; `hyphenate-character`; **a box above's
background image** (the contrast pass's, on the screens it samples — P2-1, not
built); **what lies above the nearest box with an opaque background colour**,
which stops the walk whether or not its colour is under the glyphs (its
`background-clip`, its corners, ink past it) and whether or not it paints at
all (`visibility` not `visible`, the critic's V; `display: contents`, DC) —
P2-1, not built; a paint a box outside the walk lays under the glyphs (a
sibling's, a positioned box, an in-flow pseudo of a box above, a blend such a
box composes, and what a `backdrop-filter` blur spreads from beside the box);
**a paint's geometry beyond its rect** — the paints are composited as plain
stacking (every blend in the walk held to `normal`), a layer that may not cover
is tried absent wherever its clip area meets the ink rather than where its
tiles fall, a `dashed`, `dotted` or `double` border is read as its colour over
its whole band, a 3D border (`inset`, `outset`, `groove`, `ridge`) as its
colour where Chrome paints two other shades (the critic's P3-2), rounded
corners, the glyphs as pixels; **a gradient between its stops** (below); the
ink's alpha in the contrast box read, and what the contrast pass blanks with
the glyphs (an SVG glyph, and a line, mark or stroke whose colour is the
element's `color` — so one written in the ink's colour by name); a shrink by a
font feature; a look's own face; a stack of glows, **a neighbour's shadow from
beyond the grandparent** (P2-3, not built), a neighbour's glow; **a state no
pass paints** — `:hover`, `:focus`, `:focus-visible`, `:focus-within`,
`:active`, a transition until it runs, and the tap highlight
(`-webkit-tap-highlight-color`, a colour; the critic's P3-5, not measured)
— **and a turned wall** (P2-2; the static belt was not built then, **and is
now, for first-party sheets only**, as an allow-list: see "The state belt",
below); a box above the stall; the canvas's proportional figures.

**A gradient between its stops** (G2, the critic's P1-4). The dress rule tries
each stop, not what a gradient paints between two of them: the critic's
`repeating-linear-gradient(90deg, white 0, black 1px, white 2px)` under a
`#767676` ink on Neo's "You pay" reads at 4.54:1 and 4.62:1 by its stops and
paints a mid grey. **Read now by the contrast pass, written either way, and
only where it samples**: with literal stops at 1.13–1.15:1 (the critic's run,
which caught it before this round), and with stops written from `currentColor`
— which the old blanking dropped — at 1.30–1.32:1 (taken to be Oklab's
middle grey: stops in relative colour syntax are not legacy colours, which CSS
interpolates in Oklab, and Oklab's middle between white and black is
`rgb(99, 99, 99)`, 1.32:1 on the ink; inferred from the spec and the figure,
not measured), on
the six pay screens that paint "You pay" at 390 and 1280, bare and worn. No
rule reads it on the tall wall, the tablet, the short walls, the narrow phone,
the geometry-only screens or any state no pass paints, and every pass paints at
a device pixel ratio of 1: at 2 or 3 the ramp paints stripes, not one grey
(the critic's still). The interpolation read in the dress rule (each adjacent
pair of stops sampled through the engine, or the segment's luminance tested
against the band) is not built.

**The coverage test's one textual shape** (the critic's P3-1) waits for
`probe-shard`, which restructures the runner's viewports; nothing here touches
`scripts/layout-check.mjs`.

**Unplanted, every shipped look, the skeleton and the tracked fixture read 0
on every rule at every pass** (the whole runner in the worktree, 2026-10-19,
207.6s of 300 at load 2.8–2.9).

**Red proofs** (2026-10-19; the critic's plants appended to the look sheets of
local clones, their ceiling raised to 1200s for the planted runs alone; the
counts are failing figures a pass — the phone, the desk, the canvas, the tall
wall, the tablet, `desk-wall`, `short-wall`, the narrow phone, the
reduced-motion pass; a pass the plant's screens are not on left out). On
`afbc626` the critic's runs read BL2, SZ and G2 0 everywhere, and L2 4 (the
narrow pass's eight-byte totals, three lines of pieces), nothing naming the
`$10.50` total or the address.

- BL2, `.t-modern .item-x` (above): "background-blend-mode difference: a blend
  composes its background's layers into a colour none of them is" — 439, 513,
  300, 374, 179, 105, 179, 262, 64. The contrast pass, after this round's
  blanking: "sits on paint at 1.00:1" on the phone 62, the desk 77, the canvas
  6, and the broken-figure read 4 and 6 (`pay-several-strip-long-figure`,
  `quote-row-longest-figure` and, at 1280, `shop-window-cycle-longest-figure`)
  (before: 0).
- SZ, `.t-rural .item-x { background-color: currentColor; background-image:
  linear-gradient(#fff, #fff); background-size: 1px 1px; background-repeat:
  no-repeat }`: "the ground under its glyphs (its gradient, where its tiles
  fall over its ground) reads at 1.00:1 on its ink" — 501, 591, 384, 474, 201,
  111, 201, 286, 88. The contrast pass: 64, 79, 6, and the broken-figure read 4
  and 6 (before: 0).
- SZ-lit, `.t-modern .pay-x-n { background-color: var(--s-text);
  background-image: linear-gradient(#fff, #fff); background-position: -9999px
  0; background-repeat: no-repeat }`: the same words — 29, 29, narrow 29,
  reduced 5 (before: 0 in geometry; the contrast pass caught it, 12 and 12 and
  the broken-figure read 4 and 4, before and after).
- L2, `.t-modern .pay-total { line-height: 0.3 }`: "its lines pile on each
  other: 116 pixels of "= $10.50 in tota" and "seller's records" overlap" —
  the phone 2, the narrow phone 6 (the `$10.50` total, bare and worn, and the
  eight-byte totals the round-5 read already caught); at 1280 the total is one
  line. And `.t-neo .addr-full { line-height: 0.35 }` on `addr-shown`: "28
  pixels of "ecash:qpjqjm0las" and "7hv09" overlap" — the phone 2 (one line at
  1280). The contrast pass does not read a pile (a money box is read with its
  glyphs blanked), before or after.
- G2, `.t-neo .pay-x-n { color: #767676; background-image:
  repeating-linear-gradient(90deg, rgb(from currentColor 255 255 255) 0,
  rgb(from currentColor 0 0 0) 1px, rgb(from currentColor 255 255 255) 2px)
  }`: 0 in geometry (between its stops, above). The contrast pass: "sits on
  paint at 1.30–1.32:1" on `pay`, `pay-xec`, `pay-moved`, `pay-several`,
  `pay-longest-figure` and `pay-several-longest-figure`, at 390 and 1280, bare
  and worn — 12 and 12 — and the broken-figure read 4 and 4 (before: 0).

Every failure in both planted runs names a plant's target; the geometry counts
are the same with and without the new blanking (it touches the contrast pass
alone), and the contrast pass read 32 figures under 3:1 before it (SZ-lit's)
and 378 after.

**Cost** (2026-10-19, this Mac; `afbc626` in a local clone and this round in
the worktree, back to back, one pair, the ceiling at 300s in both). The whole
runner: this round 207.6s (load 2.9 → 2.8), `afbc626` 208.5s (2.3 → 4.1). The
eight geometry passes summed: 73.5s against 72.3s, **+1.2s**, inside a run's
noise (the phone pass alone 11.2s against 10.3s, the desk 12.4s against
12.2s); the contrast pass 121.1s against 121.7s, its prepare phase (where the
blanking keeps each element's fill, marks and pseudo-elements) 25.6s against
26.9s over 802 calls. The planted runs (ceiling 1200s): 269.9s and 239.5s at
load up to 12, the failures' own reads and the machine.

### Round 7: every look pseudo's glyphs kept, a layer's tiles read against their area, an SVG element's colour kept (CRITIC-MONEY-GUARDS, re-review of round 6)

The critic found that round 6 made the branch worse than its parent on one
lint-admitted plant, and that the layer read was looser than it said. Each
paragraph below replaces the round-6 paragraph it names, which stays above as
the record.

**Every look pseudo keeps its glyphs** (the critic's P1-1 on round 6, a
regression; `keepGlyphs`, `adoptPseudoFillSheet`). Round 6 blanked the glyphs
through `-webkit-text-fill-color` and put a pseudo-element's fill back only
where its colour differed from its host's. A look pseudo in its host's own
ink — written by name (PS: `.t-modern .stall-tagline::after { content: '◆';
color: rgb(118, 118, 118); position: relative; top: 32px; font-size: 40px; … }`
under a tagline of that colour) or inherited (PSi, on Rural) — then took the
transparent fill and was blank in both frames of
`no-look-pseudo-paints-inside-a-protected-box`: a 40px diamond over the
address, every pass green. Under the old blanking PS's own colour beat its
host's transparent one and it was caught; PSi, inheriting the transparent
colour, never was. Now every pseudo `markLookPseudos` marks
(`data-probe-lp-*`) keeps its glyphs whatever its colour, as does any pseudo
with a colour of its own (`data-probe-pf-*`); its fill is put back to the fill
it painted before its host was blanked, read off the pseudo and carried on its
host as `--probe-pf-before` / `--probe-pf-after` (round 6 put it back to the
pseudo's `currentcolor`, which is the same unless a look gives the pseudo a
fill of its own). A pseudo the app's own sheets generate that inherits its
host's ink goes blank with it, as before. A look pseudo's glyphs are ground
wherever they paint (D6(ii)).

**A gradient layer is read where its tiles are proved to paint**
(`layerCovers`, `MIN_TILE_PX`, `layout/groundStack.ts`; the critic's P1-2 and
P2-2 on round 6). Round 6 took any length or percentage with a non-zero digit
as a tile with an area, and a layer that did not repeat on both axes as one
that might not paint anywhere. Both were wrong, measured on a bare page in
Chrome 155: a gradient tile under 1/64px on an axis paints nothing
(`0.015px` nothing, `0.016px` the box whole; `0.001px` under `round`
nothing), so `background-size: 0.001px 0.001px` over a ground in the ink's
own colour was read as a white ground and hid the figure (SZt, SZt-tier); and
a `no-repeat` gradient that fills its box paints the box whole, so the
skeleton's `.buy` written that way failed 186 times (FP). Now each tile
dimension is resolved against the layer's positioning area (`auto`, `cover`
and `contain` the area's own extent, a length, a percentage of the area; a
`calc()` size is not taken apart), and each axis answers on its own:

- an axis that **repeats** (`repeat`, `round`) covers the whole clip area —
  when its tile is at least `MIN_TILE_PX`, one pixel, far above Chrome's
  1/64px (a `round` tile no larger than its area shrinks by at most a third,
  and one larger becomes the area itself, never under 1/64px for a box with
  an extent; corrected in round 8, where this line said every `round` tile
  is rescaled by at most a third);
- an axis that **does not** (`no-repeat`, `space`, the other axis of
  `repeat-x` and `repeat-y`) covers the positioning area's span when one tile
  at least that long, and at least `MIN_TILE_PX`, is placed over all of it by
  its computed `background-position-x` / `-y` (a percentage, a length, or a
  `calc()` of the two — Chrome computes `right 10px` to `calc(100% - 10px)`);
  a `local` layer's lone tile proves nothing;
- anything else covers nothing.

The probe reads a layer as a paint over the part of its clip area both axes
cover, and as a paint that may be absent (`MAY_BE_ABSENT`) over the rest of it;
a layer whose tiles repeat over both axes is one paint, as before. So FP is a
ground again, SZ (one white pixel, `no-repeat`) and SZt (under 1/64px) cover
nothing, and a `no-repeat` tile that fills only the padding box is tried absent
over the border's bands. Unit-held in `layout/groundStack.test.ts`.

**An SVG element keeps its colour** (the critic's P2-1 on round 6;
`SVG_GLYPH_PAINTS`, `blankGlyphs`). Round 6 kept the old blanking for an SVG
element — its `color` transparent — which blanked its strokes and fills and
also dropped a background, border or shadow it wore in `currentColor`: `.t-modern
.step .ic { position: relative; left: -215px; width: 116px; height: 20px;
background-color: currentColor }` laid an ink bar over "2 × $5.00 = $10.00" in
Pay several's strip with every pass green (SV). Now an SVG element's `fill`,
`stroke`, `stop-color`, `flood-color` and `lighting-color` are set transparent
where their computed colour is the element's computed `color` (the old
blanking's reach), and its `color` stays. A literal paint equal to the ink by
name is blanked too, as a decoration line is.

**The dump is unchanged.** `scripts/contrast-dump.mjs` against the critic's run
at `537b8a2` reads all 15,016 boxes identical, and all 823 job records
identical field by field, the seconds aside; every summary line of the contrast
pass is the same, the timings and which tab ran which job aside (this round's
code in a clone, 2026-10-19). Neo's Wearing line's `// ` is the only look
pseudo with glyphs on the shipped looks, and its colour is its own, so round 6
already kept it; no shipped `svg` in a target wears a `currentColor` ground.

**Not read, stated**, for the line clause (the critic's P3-1 and P3-2 on round
6, neither planted, no fixture reaching either): fragments of different text
nodes whose baselines stand within 0.15em of the smaller face (a pixel at
least) are one line, and pixels are compared only between lines, so where one
text node's fragment is a line of its own and another node's text is piled
onto it within 0.15em, only their order is read (no money node's markup sets
that today); and a text node with a right-to-left run is cut into several
rects on one line, so a later text node on that line can join the first rect's
line and be read out of its order — and the order rule reads visual order, so
a legitimate Hebrew or Arabic item name in Pay several's lines
(`dl.pay-lines`, a money node) fails "drawn out of its order" (a false red,
older than round 6). The line clause, worded to the code (P3-3): each
character goes to the line whose top is nearest its own **among the lines that
hold it across (every line where none does), ties within half a pixel taken in
the text's order**.

**Unplanted, every shipped look, the skeleton and the tracked fixture read 0
on every rule at every pass** (the whole runner in a clone of this round's
code, 2026-10-19, 211.5s of 300; and in the worktree, 2026-10-20, 210.3s).
The worktree's run moved one box against the critic's `537b8a2` dump, and it
is not this round's: Neo's `pay-qr-lede` line (`p.fine`) on
`pay-several-longest-figure` at 1280, bare, read 7.03:1 where it reads 6.80:1
— the same box, the same two line rects and 4,228 pixels, the same job record.
The clone of this round's code read 6.80:1, and of the 43 dumps of this
job kept in the worktree and this session's scratch clones (rounds 3 to 7,
planted and not) the box read 7.03:1 twice: this run and one on `b39776e`
(round 3), whichever tab ran the job. Both far above
3:1; the cause, a pixel of the capture that varies between runs, not found.

**Red proofs** (2026-10-19; the critic's plants appended before each look
sheet's reduce block — FP before `stall.css`'s — in local clones, their
ceiling raised to 1200s for the planted runs alone; the same plants in a clone
of `537b8a2` and one of this round; the counts are failures a pass — the
phone, the desk, the canvas, the tall wall, the tablet, `desk-wall`,
`short-wall`, the narrow phone, the reduced-motion pass — and the contrast
pass's failures by target):

| plant | `537b8a2` | round 7 |
|---|---|---|
| PS (Modern, the tagline's diamond in its ink by name) | 0 | contrast 104: "`button.addr` changes 839 px when the look's pseudo-elements are hidden" 68 (34 and 34), and `.addr-short` / `.addr-full` read at 1.23–1.57:1, 36 |
| PSi (Rural, the same diamond inheriting its host's ink) | 0 | contrast 72: `button.addr` in the look-pseudo frames, 36 and 36 |
| SV (Modern, an SVG glyph's `currentColor` ground over the strip's line) | 0 | contrast 42: `button.step` read over its glyph at 1.00:1, 32; the selection line `span.sel-sub.in` at 1.00:1, 6, and its broken figure, 2; `span.sel-sub` at 1.43–1.88:1, 2 |
| SZt (Rural, `0.001px` white tiles over a `currentColor` ground) | geometry 0; contrast 159 | geometry 501, 591, 384, 474, 201, 111, 201, 286, 88 ("its gradient, where its tiles fall over its ground … 1.00:1"); contrast 159 |
| SZt-tier (Neo, the same in black, Cycle step 3 alone) | 0 | the canvas, the tall wall, the tablet, `desk-wall` and `short-wall` 6 each (`shop-window-cycle-listing-9`, `-quote-10`, `-usd-11`, bare and worn); the contrast pass samples no Cycle step-3 figure |
| FP (the skeleton's `.buy` as a `no-repeat` gradient of its own accent) | 63, 64, 0, 0, 0, 0, 0, 55, 4 | 0 |
| BL2, L2, G2 (rounds 5 and 6) | BL2 439, 513, 300, 374, 179, 105, 179, 262, 64 and contrast 155; L2 phone 4 (Modern 2, Neo 2), narrow 6; G2 contrast 32 | the same |
| SZ (round 5, one white pixel `no-repeat`; a run of its own, since it and SZt share `.t-rural .item-x`) | 501, 591, 384, 474, 201, 111, 201, 286, 88 and contrast 159 (round 6's) | the same |

Every failure in the planted runs names a plant's target.

**Cost** (2026-10-20, this Mac, back to back, the ceiling at 300s in both):
this round in the worktree 210.3s (load 2.1 → 3.2), `537b8a2` in a clean
clone 208.8s (3.2 → 4.2), **+1.5s**; the eleven geometry passes summed 76.3s
against 78.5s, the contrast pass 126.8s against 122.6s, its prepare phase
(where the blanking keeps each element's fill, marks, SVG paints and
pseudo-elements) 27.1s against 26.8s over 802 calls. The planted runs (ceiling
1200s): 247.6s (round 7) and 240.4s (`537b8a2`) with set A, 218.7s with SZ.

### Round 8: a look pseudo read by its class anywhere, a `fixed` layer's lone tile unproved (CRITIC-MONEY-GUARDS, re-review of round 7)

The critic found the branch behind main on one lint-admitted plant (PSc) and
behind its parent on another (FX). Each paragraph below replaces the round-7
paragraph it names, which stays above as the record.

**A look pseudo is read by its class anywhere in its selector** (the critic's
P1-1 on round 7; `lookPseudoOf`, `LOOK_RULE`, `selectorList`,
`layout/lookRule.ts`). Round 7 kept every look pseudo's glyphs, but took a
rule as a look's only when its `t-…` or `att-…` class followed the start, a
space, a combinator, a comma or `(`. A look pseudo spelt with its class in a
compound, which both look lints admit (`.stall.t-x`, `div.t-x`, `*.t-x`), was
then the app's chrome to the contrast pass: in its host's ink it went blank
with its host in both look-pseudo frames. The critic's PSc (PS spelt
`.stall.t-modern .stall-tagline::after`, a 40px diamond over the address)
passed the whole runner at `707f105` and failed on main, which blanked by
`color`; PSci (PSi spelt `div.t-rural …`) passed both. Now a class anywhere in
the selector makes the rule a look's: the dot is the boundary, and the class
is read as a whole token of `LOOK_CLASS`'s or `ATT_CLASS`'s shape, derived from
the two rules. The critic's suggested `/\.(?:t-[a-z0-9]+|att-[a-z0-9-]+)(?![\w-])/`
reads no hyphenated look class (`t-fixture-private`, `t-fixture-worn`), and
would have dropped the tracked fixture's own `.t-fixture-private
.stall-headings::before`. Every class the app writes that starts `t-` or
`att-` is a look's or a decoration's (grep over `src/`, `layout/` and
`workshop/`: the three looks, the skeleton, the kit, the two fixture looks,
the decorations and the beetle's `att-beetle-bug`; `t-rural-tag` and
`att-hum-gutter-outlined` are keyframes), and over every tracked sheet the five
pseudo selectors read as a look's before are the five read now. The selector
list is split at its top-level commas (`markLookPseudos` split at every comma,
so `:is(.t-x, .a) .b::after` left the class and the pseudo-element in two
chunks; `markFileArt`'s splitter was already top-level, and both share
`selectorList` now). Unit-held in `layout/lookRule.test.ts`, red with round
7's expression (three of its five cases).

**A `fixed` layer's lone tile proves nothing** (the critic's P1-2 on round 7;
`layerCovers`' `attachment`, `tileArea`, `layout/groundStack.ts`). Round 7 gave
a `fixed` layer the viewport as its positioning area, and a lone tile at least
that area long, placed over it, covered the figure. Under a transformed
ancestor Chrome paints `fixed` as `scroll` (CSS Transforms; the critic measured
a viewport tile at `150% 150%` land off a 102 × 37 box), and Rural sways its
tag and tilts every third card: FX, a white viewport-sized `no-repeat` tile at
`150% 150%` over a ground in the ink's colour on the Cycle card's step-3
figure, painted the figure out and read as a white ground on every pass at
`707f105` (red, 6 a wall pass, at `537b8a2`). Now a tile that does not repeat
is placed by its position on a `scroll` layer alone; a `fixed` or `local`
layer's lone tile proves nothing (`local`'s did not before either), and their
tiles that repeat still cover. A `fixed` layer's tiles are resolved against the
smaller of its origin box and the viewport on each axis, so a percentage tile
is never read larger than the engine may paint it. No served sheet sets a
`fixed` or `local` attachment. Unit-held in `layout/groundStack.test.ts`, red
with round 7's `attachment !== 'local'`.

**Corrected, stated:**

- round 7's "a `round` tile is rescaled by at most a third" (the critic's P3-4):
  a tile no larger than its area shrinks by at most a third, one larger becomes
  the area, never under 1/64px for a box with an extent; corrected above and in
  `layerCovers`' docblock;
- the positioning area is the element's bounding box (P3-1): for an inline
  split over lines or a block split over columns Chrome places a tile in
  another box (the fragments end to end), so a lone tile can leave a fragment
  bare and be read as covering it. No money glyph owner a look can tile wraps
  so today but a broken figure's pieces, whose every longhand
  `a-broken-figure-wears-the-figures-own-ink` holds; stated in the probe's
  docblock, not built;
- the probe's docblocks (the critic's four corrections to (d)): the contrast
  pass blanks every target's glyphs at once; a look pseudo is read at the
  frozen instant alone, so one animated invisible at 400ms is not read (PSa2);
  and a box moved over a figure by a relative offset, a transform or a
  negative margin, or a target's glyph scaled over it, is read by no geometry
  rule and by the contrast pass only as the figure's ground (PC2, SVs, PW).

**The kit README's labels** (D-2026-10-20-02): "Money is never covered, cut or
faded" and "The whole price is never dressed to misread" say that
`workshop:probe` catches most of this on the screens and states it paints, and
that Stall checks the rest at intake; "A price is dressed as one piece" keeps
its label. The pin, `a-look-may-not-dress-a-figures-pieces`, holds the money
paragraph's label too since this round (the critic's P3-2), red with either
label reverted to `707f105`'s.

**Not this round, stated:** the critic's P2-1 (a box moved over a money
figure, or a scaled glyph: PC2, SVs, PW), P2-3 (the quiet-zone read's retry,
which waits for the branch that owns `scripts/layout-check.mjs`), round 4's
P2s, PSa2, and a grep of the private look at 0x04's sheet for compound
spellings, `fixed` attachments and relative offsets near money — all for the
step before 8g2.

**Unplanted, every shipped look, the skeleton and the tracked fixture read 0
on every rule at every pass** (the whole runner in the worktree, 2026-10-20,
204.0s of 300; no quiet-zone red this time). **The dump is unchanged**:
`scripts/contrast-dump.mjs` against the critic's clean run at `707f105` reads
all 15,016 boxes identical, and all 823 job records are identical field by
field; so does the run of a clean `707f105` clone made right after. The
contrast pass found 186 jobs with look pseudos, the same count as at
`707f105`: the wider reading marked nothing the shipped looks, the skeleton or
the fixture paint.

**Red proofs** (2026-10-20; the critic's plants appended before each look
sheet's reduce block, FP before `stall.css`'s, in clones of this round with
their ceiling raised to 1200s; the `707f105` column is the critic's set B to E
runs; the counts are failures a pass — the phone, the desk, the canvas, the
tall wall, the tablet, `desk-wall`, `short-wall`, the narrow phone, the
reduced-motion pass — and the contrast pass's failures by target):

| plant | `707f105` | round 8 |
|---|---|---|
| PSc (Modern, PS spelt `.stall.t-modern .stall-tagline::after`) | 0 (red on main, 36) | contrast 104: "`button.addr` changes 839 px when the look's pseudo-elements are hidden" 68 (34 at the phone, 34 at the desk, over 17 screens), and `.addr-short` / `.addr-full` read at 1.23–1.57:1, 36 |
| PSci (Rural, PSi spelt `div.t-rural .stall-tagline::after`) | 0 | contrast 72: `button.addr` in the look-pseudo frames, 36 and 36 |
| FX (Rural, a `fixed` viewport tile at `150% 150%` over a `currentColor` ground, Cycle step 3) | 0 on every pass (red on `537b8a2`, 6 a wall pass) | the canvas, the tall wall, the tablet, `desk-wall` and `short-wall` 6 each (`shop-window-cycle-listing-9`, `-quote-10`, `-usd-11`, bare and worn: "its gradient, where its tiles fall over its ground … 1.00:1"); the contrast pass samples no Cycle step-3 figure |
| PSc, PSci and FX with round 6's six (PS, SV, SZt-tier, SZt, PSi, FP), one run | — | 501, 591, 390, 480, 207, 117, 207, 286, 88; contrast 377 (Modern 146: `button.addr` 68, `.addr-*` 36, `button.step` 32, the selection lines 10; Rural 231: `button.addr` 72, `span.item-x` 159). These are round 7's set A counts exactly: PSc and PS paint one diamond, as PSci and PSi do, and FX takes SZt's place on Rural's step-3 figure, so the three add no failure here; their own proofs are the three rows above. FP 0 |

Every failure in the planted runs names a plant's target.

**Cost** (2026-10-20, this Mac, back to back, the ceiling at 300s in both):
this round in the worktree 204.0s (load 3.0 → 3.2), `707f105` in a clean
clone 208.1s (3.2 → 3.4), **−4.1s, inside the noise**; the eleven geometry
passes summed 75.3s against 78.0s, the contrast pass 120.9s against 121.1s,
its prepare phase (where `markLookPseudos` runs) 25.5s against 25.3s over
802 calls. The planted runs (ceiling 1200s): 227.6s (PSc, PSci, FX) and
239.2s (with round 6's six).

## The geometry passes walk on two tabs (2026-10-19, D-2026-10-19-02 (3))

The owner's decision: the 300s ceiling stays, and the geometry passes run on
the contrast pass's tabs instead. With the money rules a run was 280–291s
under load (the dress rule's cost, above), and `wall-offsize` adds four wall
passes, +43–61s by its own measure.

**What changed** (`scripts/layout-check.mjs`, `scripts/plan-walk.mjs`). The
tabs are made before the geometry passes, by the contrast pass's own rule and
count (`CONTRAST_TABS`, `LAYOUT_CONTRAST_TABS`), and every tab's page is
asked to be focused by emulation (`Emulation.setFocusEmulationEnabled`,
which the contrast pass already set on every tab), so a pass cannot read one
way on one tab and another on the next. (This said a second window is not
focused otherwise. It did not reproduce: measured by the critic and again in
the fix round, Chrome reports every target visible and focused with and
without the emulation — a second window, a background tab in the first's
window, the first tab — so it is kept as a belt; the fix round, below.) Each geometry pass is a function of the tab it runs on and the answers
it reads, and hands back its record (`geometryRecord`): the lines it says,
whether it failed, the page's report, and what it adds to the totals the
contrast pass and the coverage read later (the worn classes, the outlines,
the marks, the codes, a page pass's sticky looks, a carried look's clip
points). Nothing in a pass writes a total. `walkPlan` hands the passes out in
plan order to whichever tab is free and commits each record in plan order as
soon as it and every record before it are in (`commitGeometryPass`), so the
lines come out in the order they always did, on the stream each names, while
the walk runs. A short pass reads the page pass it names (`after`) and waits
for it; a reduced-motion pass sets the media feature on its own tab and takes
it off in a `finally`. A pass that throws stops the hand-out: the other tabs
finish what they hold, the earliest pass in the plan that threw is the run's
error, and only the passes before it are said (and how many after it ran and
are not reported). A pass that comes back with no record of its own fails the
run naming it. The output gains three lines after the passes: `geometry:` (the
walk's wall time, and each tab's passes, busy time and reads again),
`geometry passes:` (each pass's own time and the tab it ran on, in plan
order) and the canary's line. A pass's printed time is now its own, from the
moment its tab took it (the old `took()` counted from the previous stamp, so
the portrait line carried the worn-only job's time).

**Found on the way, both fixed.** (1) The ask for a verdict (`readVerdict`)
waits out the page's one synchronous pass, under the run's 30s command bound:
read again under two tabs at load ~14, the phone pass took 30.3s and the
desk pass 30.2s, and both "read no report" (the bound fired); a phone pass on
one tab under a 2× CPU throttle took 38.1s. The old runner would have failed
such a pass as a page that hung, at one tab, on a slow enough machine. The
ask has its own bound now, `VERDICT_TIMEOUT_MS` (120s); the watchdog still
holds the run. (2) A belt: every verdict read checks the page is visible and
focused (`unshownFailures`), a failure of the pass if not. No real run has
tripped it; its red proof is a tab whose `document.hasFocus` answers false
(the fix round, below).

**`the-geometry-passes-read-the-same-on-every-tab`**, in the spirit of the
contrast pass's canary, two parts, on every run with more than one tab:

- **Two passes read again** (`GEOMETRY_CANARY`): the reduced-motion pass on
  the canvas and the short pass at the desk where a sticky sign gave it
  something to measure — and, since the fix round, the reduced-motion pass at
  the phone in its place where no look has a sticky desk sign, so a run reads
  two whatever it carries (until then such a run read one). Each
  is read by a tab other than the one that ran it, once that tab's hand-out
  has run out, so the reads fill the time it would stand waiting; each must
  hand back the walk's answer byte for byte — the page's whole report, the
  lines it says less their clocks, and every total it adds
  (`geometryRecordDiffers`). The report's one clock, `faces.waitedMs`, and
  the faces line's "asked, N ms" are set aside.
- **The page print** (`TAB_PRINT`): the probe page at the desk's size with
  no screen, read on the first tab before the walk and on every tab after
  its reads — size and density, the screen, nineteen media features, visible
  and focused, every sheet and its rule count, every adopted sheet, the
  window's own property names, the source text of the natives a probe reads
  time and layout through, locale, and every face's status. Every print after
  must equal the one before (`tabPrintDiffers` names what moved).

Why two parts. Before the picks were chosen, every pass was read again on the
other tab (a scratch hook, not kept), at load ~15: the first run found the
two clocks and the 30s bound above; after them, **11 of 11 passes the same,
byte for byte**. The others cost 4–35s each to read again, so the standing
canary reads the two cheapest — and a sample of passes only sees a tab state
that moves its own verdicts: a rule adopted onto tab 1's pages
(`.stall-head { margin-top: 2px }`) moved the desk pass's clip count from
2530/26204 to 2644/26519 and neither picked pass. The print sees it whatever
pass it would move.

**Proved red**, each a temporary plant, reverted:

- **A rule on one tab's pages** (that adopted sheet, through
  `Page.addScriptToEvaluateOnNewDocument` on tab 1): "tab 1's page after the
  walk is not the page before it — adopted (only after: 1)"; both passes
  read again the same, as above.
- **The media feature left on** (the reduced-motion pass's `finally` emptied,
  so each tab that ran one keeps `prefers-reduced-motion: reduce`): both
  prints differ at `media` ("(prefers-reduced-motion: reduce) false" before,
  "true" after), and "short-desk ran on tab 0 and read again on tab 1: its
  report differs at 1 key(s): reducedMotion (false → true)". The print alone
  would not have caught it had both tabs leaked and been compared only with
  each other, which is why it is compared with the page before the walk.
- **A pass answering another's record** (the narrow pass handing back the
  tablet's key): "1 geometry pass(es) handed to a tab came back with no record
  of their own: narrow", `layout-check: FAILED`, exit 1, and the narrow line
  not said.
- **A throw on the second tab** (tab 1 throwing on the portrait pass): the
  four passes before it said, "layout-check: PLANT D: tab 1 threw on the
  portrait pass", exit 1.
- **The walk itself** (`plan-walk.test.mjs`, seven cases over passes whose
  durations the test chooses): five mutations of `walkPlan` — commit on
  arrival, a fault not stopping the hand-out, a pick read on its own tab, a
  foreign record committed, a dependency not awaited — each turn one to three
  cases red.

**The same output, and where it is not.** The geometry lines, times and the
font wait masked, are the same in the old runner (one geometry tab), this
branch at one tab and this branch at two: identical over all five final runs
below. Over the day's 30 runs two lines moved, and neither is a verdict:

- the canvas pass's clip count, 311/7760 or 313/7762, **on one tab and on
  two alike** — 313 on one tab at load ~6.2 and under a 2× CPU throttle, 311
  on two tabs in six runs at load 1.3–6.5 — because `marquee.ts` and
  `broadcast.ts` continue a running line by `Date.now()` across repaints, so
  where a run stands when a variant is measured depends on the time between
  paints: the pace, not the tab (the ledger's "257/259 … varies by itself"
  is the same);
- the worn-only job's art list, "200, 200" or "200" (the resource entries
  seen two animation frames after its sheet lands): "200" in 6 of 23 runs
  with the job on tab 1, never in the 8 with it on tab 0 (one tab, and the
  old runner), and "200, 200" in three one-tab runs with the job moved right
  after the desk pass. Not proven either way whether that is the tab or the
  pace; `wornSheetJobFaults` passes it both ways. The contrast
dumps: two tabs and one tab on this branch against the old runner's
(5612189 at the same tree), 15,016 boxes identical, 0 moved; one later old
run moved one box (`desktop/item-listing` worn, `button.item-back`, 3.73 →
6.15), read 3.73 by every other run old or new — the old runner's own flake.

**Measured** on this Mac (Apple A18 Pro: 2 performance and 4 efficiency
cores, 8 GiB), shared with other agents' runs, so the load is given; loads are
the 1-minute average sampled every 15s, median (min–max). The old runner is
`money-guards` at 5612189 in a scratch clone, its ceiling raised in the clone
for the measurement; "one tab" is this branch with `LAYOUT_CONTRAST_TABS=1`,
which puts the contrast pass on one tab too.

| run | load | geometry | contrast | total |
|---|---|---|---|---|
| this branch, one tab (a) | 2.3 (2.0–2.8) | 73.9s | 177.7s | 260.9s |
| this branch, two tabs (a) | 3.0 (2.2–4.3) | 54.2s | 118.1s | 190.8s |
| old runner (geometry one tab, contrast two) | 3.5 (3.3–4.8) | ~79.3s | 131.1s | 230.8s |
| this branch, two tabs (b) | 5.0 (4.2–6.6) | 76.4s | 139.9s | 234.1s |
| this branch, one tab (b) | 4.2 (2.9–5.1) | 106.6s | 190.2s | 308.5s |

(The old runner prints no geometry total; ~79.3s is its passes' printed
times summed.) Earlier pairs on near-final code (three picks, the print
compared tab to tab): one tab 148.0s of geometry against two tabs 84.8s at
load ~6.3 (totals 428.0 and 262.1s); the old runner 77.3s / 212.4s at load
2.6 against two tabs 62.6s / 199.3s at 3.5.

**Two tabs take 20–30s off the geometry passes here, not the ~40s
estimated**: each pass is 1.2–1.4× slower while the other tab measures
(pair a: the passes' busy time 96.1s on two tabs against 73.9s on one), since
this machine has two performance cores and Chrome's own processes share them.
The canary costs ~4s of tab time (the two reads 3.8s, mostly in the tail
where a tab would wait) and the two prints ~1s each, about 2–3s of the walk's
wall. A two-tab run at load ~3 is 190.8s, against the old runner's 230.8s at
load ~3.5.

**`wall-offsize`'s four passes, projected.** Its four sizes (1024x768,
1366x768, 800x1280, 680x1000, every wall screen) run as passes on this branch
by a scratch hook (not kept; this branch's code has none of that branch's
fixes, so they paint 1,136 and 79 failures, and the two portrait sizes stop
at the landscape check, after measuring): 17 passes in 100.0s at load 3.5,
the four 13.5–21.2s each on two tabs, against 54.2s for the 13 passes at load
3.0 — about **+46s on two tabs**. So a two-tab run with `wall-offsize`
would be about 237s at load ~3 (190.8 + 46) and about 290s at load ~5
(234.1 + 55); the old runner with it, 274–292s at load ~3.5 (230.8 + 43–61)
and 323–352s under the load the dress rule was measured at. Under 300s on two
tabs at ordinary load, past the 240s sharding line under load, and with
little margin left for the three wall sizes still open.

**Not measured, stated**: the Linux box and CI (ci.yml's manual `layout` job
sets `LAYOUT_CONTRAST_TABS: '1'` and runs the geometry passes on one tab, as
before); three tabs; whether starting the contrast pass on a tab that leaves
the geometry walk early would save its tail (a second or two); `wall-offsize`
itself (its passes were run here on code they fail on, so their time is a
proxy); and the one-tab off-size run (152.6s of geometry) was at load ~10, no
pair for it.

### After the rebase onto money-guards (2026-10-20)

Rebased onto `0b73b9a` (money-guards merged, rounds 5–8 of the dress rule).
The one conflict was this file, both sides appending at its end; both
sections are kept, this one last. Two items the window asked of this round,
each its own commit.

**Every pass the runner runs is a value** (`scripts/probe-passes.mjs`; the
money-guards round-5 critic's P3). Round 5's
`every-pass-the-runner-runs-is-in-a-coverage-table` read the runner's
viewports out of its text with one pattern, `{ name: '…', width: N`, and
stayed green over a viewport written width first, height before width,
after a spread, as a template literal or in double quotes. The viewports,
the screen lists, the kinds the runner runs (`PASS_KINDS`), the geometry
plan `walkPlan` walks (`geometryPlan`: each pass's key, kind, coverage
name, viewport, screens, window block and what it reads first), the
geometry canary and the contrast and transparency passes
(`runnerPasses`) now live there, side-effect free, and both the runner and
the tests import it. (The runner built from `geometryPlan`, `CONTRAST_PASS`
and `TRANSPARENCY_PASS` and never read `runnerPasses`, the list the tests
held the tables to; the fix round, below, holds the two together.) The runner builds every geometry pass from the plan
by its kind, and stops before it builds on a kind it has no runner for, a
wall block that is not one the page echoes (`WALL_BLOCKS`), or a canary key
the plan lacks; the tall wall, the counter tablet and the two desk walls are
one `wall` runner reading its block, with their lines and verdicts as they
were. **Adding a pass is one entry in the module and its rows in the
coverage tables**: a wall pass of `wall-offsize` is `{ key, kind: 'wall',
coverage, vp, screens, block }`, plus `GEOMETRY_PASSES`, both surface
tables and `WALL_PASSES`. The test compares the module's passes with
`GEOMETRY_PASSES` and `PASSES_OWING_NO_GEOMETRY` by value, both ways and by
kind (a page, wall or narrow pass in `GEOMETRY_PASSES`, any other kind in
the other table with its reason), every wall pass in `WALL_PASSES`, every
`WALL_PASSES` row a pass the runner runs, every `PAGE_PASSES` row a page
pass; the runner's own text names no viewport in any of the five shapes
(planted in the test); and the shot plan's test holds every wall pass of
the plan to shots at its size. The worn-only road and the transparent wire,
passes the round-5 pattern never read, join `PASSES_OWING_NO_GEOMETRY` with
their reasons.

**Proved red**: a wall pass added to the module and named in no table
("the runner's side-tablet pass is in no coverage table", and "WALL_PASSES
does not name it"), a row dropped from the tables ("the runner's
transparency pass is in no coverage table"), a viewport written width first
in the runner, each a temporary edit of the real file; the same and five
more as cases of the test (`passTableFaults`, `runnerViewportLiterals`); a
plan entry of an unknown kind and a misspelt block, refused by the runner
before it built ("probe-passes.mjs plans a pass this run cannot make", exit
1); a wall pass with no shots, red in `shotPlan.test.ts`.

**A dark quiet zone is read again on a fresh pair** (`readQuietZones`,
`scripts/quiet-zone.mjs`; the money-guards round-7 critic's P2-3). Four
sightings, one on main: a pay screen's code read part of its quiet zone
non-white and passed on a rerun (`pay` @mobile, Neo worn, 4,572 of 21,420
pixels; `pay-several` @mobile, Modern worn, 4,500 of 21,312,
`rgb(18,21,26)`). The cause is not known. A code that reads dark is read
again once on a fresh pair — a new capture after 250ms, the zones read just
before and just after it — and the fresh pair's reading decides (since the
fix round, only over a code that stood still from the job's capture through
the pair and a ring at least as long as the first; below), the ring
read's rule; a real defect is steady state and reads dark there too. A
fresh pair that cannot be had, paints another set of codes, or cannot read
the code leaves the first reading standing. The job's capture, its retry
flag and its dump are untouched. Both readings are said, on a failure and,
when the second is white, on a new line under the pass (`quiet zone, read
again on a fresh pair and white there`): the dark pixels and the box they
span, the code's box, module and clip, where it stood just before the fresh
capture if it moved, the boxes above it that scroll and their offsets
(`__quietZones`' `scrolled`), and the capture (its size, no clip, scale 1,
how long after it the zones were read, the page's device pixel ratio, size,
scroll, visual viewport and focus). The line said "none" on the green runs
below; the next sighting will say which of the suspects it was.

**Proved red** on a full run (ceiling raised in the plant, reverted): a 6px
dark outline inset 14px into every Rural pay code (`.t-rural .pay-qr
svg.qr`) still fails all 24 of its jobs after the read again, "3330 of 20160
… on the fresh pair too", with both readings; and a 16px band painted over
the top of every code's ring on the first capture only is read again white
on 232 codes (every code read, every look) and fails nothing more. That
run's contrast pass took 160.6s against 124.4s, the cost of 256 reads
again; a run that reads none pays one page read per job that paints a code.
The read-again's own cases (`a-quiet-zone-that-reads-dark-is-read-again-on-a-fresh-pair`)
fail under five mutations: no read again, the fresh reading ignored, a fresh
pair with nothing on screen believed, one with other codes believed, every
code read again.

**Measured** on this Mac (shared; the 1-minute load sampled every 15s,
median (min–max)), back to back, `main` at `0b73b9a` in a clean clone:

| run | load | geometry | contrast | total |
|---|---|---|---|---|
| this branch, two tabs | 4.0 (3.5–4.2) | 52.5s | 124.4s | 184.6s |
| `main` (geometry one tab, contrast two) | 3.1 (2.4–4.1) | ~78.0s | 120.9s | 206.2s |

(`main` prints no geometry total; ~78.0s is its pass lines summed, the
worn-only job's time inside the portrait line.) Two tabs took 21.6s off the
run at a higher load, the geometry walk 25.5s; the contrast pass 3.5s
slower, within this machine's run-to-run spread. One tab
(`LAYOUT_CONTRAST_TABS=1`, once, not a pair) fitted: 261.8s at load 2.2
(1.6–2.8), the geometry 75.6s and the contrast pass 179.4s — 38s under the
ceiling, so ci.yml's one-tab job is still at risk under load. The contrast
dumps, two tabs and one, against `main`'s: 15,016 boxes identical, 0 moved,
0 added, 0 removed.

### The fix round (2026-10-20, the probe-shard critic)

The critic's verdict on the two sections above found two merge blockers and
seven smaller items. Each fix below has its red proof; the plants were run
on a scratch clone of the fixed branch, reverted, never committed.

**B1. A pass in the module list and never run.** The coverage tables were
held to `runnerPasses`, and the runner never read it: it builds the
geometry walk from `geometryPlan` and the two pixel passes from
`CONTRAST_PASS` and `TRANSPARENCY_PASS`. The critic appended a `lap-wall`
wall pass (1024x768) to `runnerPasses` and named it in every table, and
separately a second contrast pass at the tablet (`contrast-tablet`) with a
`PASSES_OWING_NO_GEOMETRY` row: the coverage tests passed 46 of 46 and the
runner would have measured neither. Now `passesNotRun`
(`scripts/probe-passes.mjs`, pure) compares the list with what the runner
builds, by value and in order: an entry the runner will not run (a
geometry entry the plan does not hold, a second pixel pass, a kind with no
runner), an entry it runs otherwise (same key, another value), a pass it
runs that the list does not name, and another order. The runner asks it
before it builds and exits 1 on any sentence. Test:
`the-runner-runs-every-pass-the-module-lists` — the pure cases, and the
real runner started with each plant handed in through a module hook
(`register` over `./probe-passes.mjs`, the real module re-exported with
`runnerPasses` extended), which must exit 1 naming it before it builds.

**Proved red**: the critic's two plants applied to the scratch clone.
`lap-wall` (its diff, coverage tables included): the coverage test 49 of
51, the two cases of `the-runner-runs-every-pass-the-module-lists` that
read the module red; the runner "probe-passes.mjs plans a pass this run
cannot make — the module lists lap-wall, a wall pass, and the runner's
geometry walk has no such pass: it would never run", exit 1, no build.
`contrast-tablet`: the same two cases red; the runner "the module lists a
contrast pass, contrast-tablet, the runner will not run: it runs one
contrast pass, contrast (…)", exit 1. And the runner with its call to
`passesNotRun` taken out: the module-hook case red (the runner went on to
its build).

**N1. A size the text check cannot see.** `runnerViewportLiterals` reads
five shapes in the runner's text: a `width` or `height` key whose value
starts with a digit or a quote; an object literal with no brace inside
holding a `name` key and a `width` or `height` key, either order; one
holding a `name` key and a spread, either order. It misses a size from
constants or arithmetic with no `name` beside it, a spread with no
`name` (`{ ...TABLET, height: TABLET.height - 256 }`), and an object with
a brace inside; the test now names two of these as misses. The run-time
half: `readVerdict` takes the plan entry it reads a verdict for
(`viewportOffPlan`), refuses one that is not the plan's own object before
it navigates, and fails the pass when the page's measured
`[innerWidth, innerHeight]` is not that entry's viewport
(`every-viewport-the-runner-measures-is-a-module-pass`). **Proved red**,
a plant after the walk on a full geometry run: the tablet entry read at
the critic's `SIDE_W`×`SIDE_H` — "the page measured 1024x768 where the
plan's tablet pass names 768x1024"; at a spread of `TABLET` — "the page
measured 768x768 where …"; a fresh entry of its own at 1024x768 — "a
verdict was read for side-tablet (…), which is not an entry of the plan
probe-passes.mjs lays out", before it navigated. **What it does not see,
stated**: a pass that never asks `readVerdict` (its own `Page.navigate`
and evaluate), and one that reuses a plan entry at that entry's own size
with another screen list or URL.

**B2. A weaker fresh read believed.** `readQuietZones` believed the fresh
pair's reading whenever it read one ring pixel, and logged where the code
stood just before the fresh capture without comparing it. The critic's two
cases, both over a steady band that read 3345 of 14760 dark on the first
capture: the fresh pair's ring clipped by a scroller at its top 25px (0 of
10530 dark), and its code moved from y 30 to y 50 during the pair — both
green. Now the first reading stands, `retry.why` saying which condition
failed and the fresh reading said beside it, "fresh pair, not believed",
unless both hold: the code's box, module, corner, clip and turn agree
before and after the fresh capture within `STILL_PX` (0.5px in the fix
round, 0 since the critic's B2′ below; a pair with no `before` shows no
stillness), and the fresh read covers at least the
ring pixels the first did. The branch's own case that believed a code
moving from y 12 to y 10 now keeps the first reading. **Proved red**: the
critic's script over the fixed module reads both cases red (3345 kept); the
same over the unfixed one, green, as he found. Four mutations of the fix
each turn the read-again cases red (the movement check dropped: 2; the
ring check dropped: 1; the tolerance at 5px: 1; a pair with no `before`
taken as still: 1). And a full run with the two plants above: the Rural
outline still fails all 24 jobs "3330 of 20160 … on the fresh pair too";
the band on the first capture only is believed white on 232 codes, none
"not believed", and fails nothing more (its contrast pass 196.6s, the run
260.8s under the plant's 900s ceiling). **Not measured, stated**: a code
that really moves or is re-clipped between the two reads of a fresh pair
on a probe page — the pass freezes animations and grows the shot to the
page, and none was produced; the cases are the pure function's. The cost,
chosen: a flake whose code moves during the fresh pair now fails where it
passed, with both readings said.

**N2. The page print and one tab's root style.** The critic's P2 set
`letter-spacing: -0.3px` on tab 1's `<html>` by script: the print read
the same, and only the canary's short pass moved. `TAB_PRINT` now reads
the root's and the body's own `style` attribute and what text on them
computes to (letter and word spacing, size, line height, face, kerning,
ligatures, rendering, zoom, writing mode, direction). **Proved red** with
P2, geometry only: "tab 1's page after the walk is not the page before it
— root (only before: "background-color: rgb(242, 242, 239);"; only after:
"letter-spacing: -0.3px; background-color: rgb(242, 242, 239);",
"-0.3px"), body (only after: "-0.3px")". (P2 also failed desktop 47 and
narrow 36 on their own, as the critic found.) An allow-list of the CDP
methods sent to each tab was not built.

**N3. The focus belt.** The critic's P1 (no focus emulation on tab 1), P1b
(tab 1 a background tab in tab 0's window) and P1c (none on tab 0) read
every pass green and the print unchanged; P1 re-run here on the fixed
branch: the same, every pass green, the print the same. So the sentence
above that a second window is not focused otherwise is corrected, the
emulation kept as a belt. **Its red proof**, P1d (tab 1's
`Document.prototype.hasFocus` answering false), re-run here: desktop,
portrait, desk-wall, narrow and reduced-motion @canvas — every pass tab 1
ran — failed "the page is visible and unfocused", the print differed at
`shown`, and both canary reads differed.

**N4. Two canary passes whatever a run carries.** Where no look has a
sticky desk sign the short pass at the desk measures nothing, and the
canary read one pass again (`pnpm workshop:probe`: "1 of 1"). A pick is
now a list of keys tried in order (`walkPlan`'s `picks`, with `measured`):
the first whose walk measured something is read again, the short pass at
the desk falling back on the reduced-motion pass at the phone. The
workshop's probe now reads "2 of 2 … reduced-motion @mobile (tab 1 → 0),
reduced-motion @canvas (tab 0 → 1)"; the ordinary probe reads short-desk
and reduced-motion @canvas as before. `plan-walk.test.mjs` gains a case,
and four mutations of the choice (`measured` ignored, the first key only,
two picks reading one pass twice, a pick read on its own tab) each turn
it, or more, red.

**N6. The canary's quiet-zone sightings.** The contrast canary's reads
again call the same read, and their dark-then-white sightings were neither
folded nor printed. They are said on the "read again" line after the
walk's, and the dump's `meta.quietReadAgain` counts both, with each
sighting's first line. **Seen** on the band plant's run: 232 on the walk
and 1 on the canary's reads (`shop-window-touch-quotes-pay` @canvas), meta
`{ walk: 232, canary: 1 }` with 233 sightings.

**Not done, stated**: N5 (a hung page now fails at the 120s bound rather
than 30s; no change), N7 (the worn-only art list, "200" or "200, 200";
cause unknown), N9 (Linux and CI: ci.yml's `layout` job runs one tab, so
the walk, the canaries and the page print never run there).

**Measured** on this Mac, back to back, no selection (the tracked fixture
carried), two tabs, `main` at `c8f3379` in a clean clone (the 1-minute
load sampled every 15s, median (min–max)):

| run | load | geometry | contrast | total |
|---|---|---|---|---|
| this branch, fixed | 2.65 (1.44–4.12) | 53.7s walk | 155.0s | 217.9s |
| `main` | 2.80 (2.34–3.09) | ~75.9s summed | 152.4s | 238.4s |

The contrast dumps: 15,016 boxes identical, 0 moved, 0 added, 0 removed.
Both runs green; the quiet-zone line "none" on both the walk and the
canary's reads.

**B2′, the code must stand still from the job's capture, not only through
the pair** (the probe-shard critic's re-review of the fix round). The fix
round compared where the code stood just before and just after the fresh
capture, never with where it stood on the job's own capture, and its
tolerance was half a pixel. Two cases went green on the pure function:
d1, a code in a scroller clipped at y 56..262 scrolled up 17px between the
job's zone read and the fresh pair, then stood still through it, so its
top band (and a steady dark band painted with it) was clipped away and its
bottom band revealed — 1338 of 10969 dark first, 0 of 10969 fresh, as many
pixels; and d2, a code that moved 0.45px (x 10.6 → 11.05) during the pair,
inside the tolerance, losing its outermost left column (a one-pixel dark
edge) and gaining one on the right, 14350 pixels both times. Now the
fresh reading is believed only when the job's zone, `before` and the zone
after the capture agree exactly on the code's name, box, module, corner,
clip and turn: `STILL_PX` is 0, and `movedBy` is asked first between the
job's zone and `before` ("it moved between the job's capture and the
fresh pair"), then through the pair. **Why 0**: on a full two-tab run with
a band planted on the job's capture alone, all 257 codes read again had
their zones before and after the fresh capture exactly equal, and exactly
equal to the job's own zone read (the critic's `band.jsonl`); a tolerance
bought nothing a real page needs. **Proved red**: the test
`the first reading stands when the code moved before the fresh pair` (d1
and d2) and the move cases of `lets the first reading stand when the code
moved during the fresh pair` (a 0.01px move, another code's name) fail on
the fix round's `quiet-zone.mjs` (3 of 19 cases red) and pass on this one.
The band on the first capture only, nothing moved, is still believed white.

## The Cycle card's figure, fitted to its column (2026-10-14; PLAN § Open's first P1)

The ladder above was a table of sizes by length, one per wall layout,
measured at the five sizes the passes paint, and it was right only there.
At 1024x768 (the counter tablet on its side) the short landscape layout's
steps were pixels measured at 1280 in a price column of 195–264px, and
`$999.99` read "$999.9" on Neo; where it was right for the widest look it
shrank every other look with it (the 145 cells above, `$999.99` on Modern
at the tablet 76.8 → 56.8px).

**What replaced it** (`fitWallFigures`, `src/ui/wallFit.ts`): after every
wall paint, again when the faces land and when the frame changes size with
no paint (a `ResizeObserver` on the frame), each Cycle card's figure is
tried at the size its layout and look give it and made smaller only where
it does not stand in the price area's grid column — the column read from
the head's resolved tracks and `grid-template-areas`, the cell and every
line of its figure inside it, as this rule reads it. The size is the money
node's own inline `font-size`, which no look sheet out-ranks. Shapes, in
order, each at the largest size up to the design size that stands, and
taken only at `WALL_FIGURE_MIN_PX` (32) or more: one line; a listing's
`from` on its own line (`data-wall-wrap="stack"`, taken where it buys the
figure 15% over one line); then the comma break (`data-wall-wrap="break"`,
a figure built with breaks, from band 4) at 32px, smaller only while a
piece does not stand, to `WALL_FIGURE_FLOOR_PX` (16). A one-line shape that
stands only because Chrome broke the figure at a `<wbr>` under `nowrap`
does not count (lines are counted). And a card past the status line takes
what the figure can give, down to 32px, while giving moves the card's edge
— read against the card as painted, since Rural tilts every third card and
its painted box reaches 3px lower (measured at 680x1000, where the fit had
cleared a box this rule then read 3px over the line). Read with the card's
turn and the tag's sway off (`holdStill`, shared with this rule), and along
the frame's own axes, so a `data-turn` wall is measured as it reads.

**The table's CSS is gone**: no `--sw-fig`, `--sw-k`, `data-wall-tier` or
`data-wall-break`; each layout's `.item-x` rule states its design size
alone, and the shapes' rules stand outside every container block. The
length bands (`WALL_FIGURE_CEILINGS`, `wallFigureTier`) size nothing now:
this rule counts every Cycle figure it reads by band, computed from the
figure's text, and every wall pass still owes every band on every look.

**The style restore goes through the CSSOM.** This rule held the card still
by writing `transform`/`rotate` and put the `style` attribute back as a
string. The money node carries the fit's inline size now, so the string
was non-empty, and the page's policy refuses an inline style written as an
attribute: the first run failed `the-probe-page-meets-no-csp-refusal` on
every geometry pass and 214 times in the contrast pass, and each refused
restore left the read's `none` on the card. `holdStill` saves and restores
the two properties instead, in the fit and here.

**Measured** (Chrome, the 53 wall screens, the shipped looks bare and worn
and the skeleton, the scratch harness): at the five probed sizes, 0
failures with the fit and no table. The fit's first cut, with no status-line
relief, put 5 cards over the line at 1920x1080, 47 at 1080x1920 and 70 at
768x1024: the table had been holding the card's height too, and figures
given their size back grew the stacked layouts. Sizes given back, against
the table: `$999.99` at the tablet 76.8px on Modern (56.8), 75.1 on Neo,
70.7 on Rural; `12,345.67 XEC` at 1280x900 on one line at 56.8 / 48.5 /
49.7px (38px, wrapped); at 1080x1920 124 / 95.3 / 98.2px.

**Guards changed**: `every-look-that-sizes-its-figure-sizes-every-price-tier`'s
wall half is gone — a look that sizes the Cycle figure gives the size the
fit starts from — and `a-look-never-sizes-inside-a-money-node` holds what
the inline size cannot reach: a font size on the figure's pieces
(`.fig-say`, `.fig-end`) or a money role's descendant, red on three planted
rules. The look lint's `data-wall-tier` state is gone (no served sheet
matches it). Tests: `the-cycle-figure-is-fitted-to-its-column`
(`wallFit.test.ts`, over a gauge modelling the card: the shapes, the floor,
a browser-broken line refused, the relief, the restore; and
`window.test.ts`, the paint and the fonts' refit, red with the refit's
call taken out). The frame's resize refit had no test until 2026-10-19:
`wallFit.test.ts` now drives a stubbed `ResizeObserver` — no fit on the
callback an unchanged size delivers, a fit to the new column when the
frame narrows, the old watch let go by a second fit and by
`forgetWallFit` — red with the observer never made, with the size check
taken out, and with `forgetWallFit` emptied.

**The ladder's thin margins are gone with it** (2026-10-19): the 0.7% at
1080x1920 above was the table's, measured in this Mac's fallback `₩`. The
fit reads the face the machine actually draws, so a wider `₩` or `元` on
another machine is made smaller, not cut. A `₩` figure is still painted
by no pass (the fixtures carry XEC, USD and `cny-27`), so that is proved
by the mechanism, not observed.

**Not measured, stated**: a font that fails to load (the fit runs on the
fallback and again on `document.fonts.ready`, which a failed face also
resolves); a look sizing the money node's descendants through a rule this
guard's selector reading misses; Safari and Firefox; the turned frame's fit
(axes mapped by construction, measured by nothing — the probe paints no
turned wall).

### The largest size that stands, not the first (2026-10-19)

`settle` scaled each try by what the last read said the figure needs on
one line and took the first size that stood. That estimate can land far
under the answer: a figure Chrome broke at a `<wbr>` reads its price cell
stretched across the column, so what stands beside the figure reads
larger than it is. Measured in Chrome on the showroom, at sizes the probe
paints, figures that stood whole on main came out smaller than main, with
nothing cut for any rule to see: Neo's `123,456,789,012.34 XEC` at
1920x1080 43.5px (main 67.9; one line stands at 75.8), Rural's 41.8 (78.1
stands); Neo's `$1,234,567.89` at 1080x1920 66.7px (main 103.7; 113.6
stands), Rural's 64.6 (120.6). `settle` now halves the gap between the
largest size read standing and the smallest read not standing, to
`FIT_PRECISION_PX` (0.5px), and takes the largest. Test: `takes the
largest size that stands where its first estimate lands far under it`
(the model gauge's `cellFills`), red on the old `settle`: 39.9px where
75.75 stands. Every probe pass is green after it, and a scratch run of
the probe at 13 sizes off the passes fails card for card as it did before
the fix.

**Against main, now** (the showroom, every Cycle screen, the three shipped
looks bare and worn, the money node's computed size after the faces land),
larger / same / smaller:

| size | larger | same | smaller |
|---|---|---|---|
| 768x1024 | 88 | 146 | 0 |
| 1920x1080 | 66 | 168 | 0 |
| 1080x1920 | 126 | 108 | 0 |
| 1280x900 | 99 | 48 | **87** |
| 1280x800 | 112 | 50 | **72** |
| 1024x768 | 27 | 44 | 163 |
| 800x1280 | 19 | 20 | 195 |
| 1366x768 | 145 | 50 | 39 |
| 680x1000 | 70 | 160 | 4 |

**The 159 smaller at the two 1280-wide short walls are two shapes, not a
read** (read again the afternoon of 2026-10-19, the same counts, and split
by shape): every one is a figure of 16 to 30 characters (as counted) that
main's ladder broke after a comma at 38px, on a card that passed on main.
112 are broken by the fit too, at 32px: the fit breaks at
`WALL_FIGURE_MIN_PX` and goes smaller only while a piece does not stand,
never larger. 47 print on one line or with a stacked `from` at 32–37.4px,
because the fit breaks only where no one-line shape stands at 32px.
Breaking at the largest size that stands, as one line is fitted, would give
the first group their size back at the cost of more lines and a taller
card; letting the break compete with one line would give the second group
theirs and, unbounded, would also break figures on the 1920 wall and the
tall wall that main and the fit keep on one line. Both are questions of
taste, for the owner (PLAN § Open), not built.

**The same two shapes at the off-size walls.** Smaller than main on a card
that passed on main: 30 cells at 1366x768 (main 38px, broken; the fit
32–37.5px — 14 broken, 9 stacked, 7 on one line — at 22 to 30 characters),
76 at 1024x768 (main 38px, broken; the fit 32–32.5px, 74 broken, at 13 to
30 characters) and 10 at 800x1280 (main 33.6–52px, broken in the stacked
column; the fit 32–33.8px, 9 broken, at 18 to 28 characters). Every other
smaller cell there is a card main's code failed — 9 of 39 at 1366x768, 87
of 163 at 1024x768, all 4 at 680x1000 and 185 of 195 at 800x1280, where the
side-by-side card's design size is 80px against the stacked column's 92 —
and there a smaller figure is the fix. Read by matching each smaller cell
to the red run's failures on main's code, by screen, look and bare or worn.
This paragraph said, until then, that every smaller figure at the off-size
walls was a defect on main: it was wrong for 116 cells.

## The off-size walls: four passes, and what they needed (2026-10-14)

**The passes** (`OFF_SIZE_WALLS` in `probe-passes.mjs`, geometry only, every wall
screen — 53 — on every look, bare and worn): `side-tablet` 1024x768 (the
counter tablet on its side), `hd-wall` 1366x768, `tall-tablet` 800x1280 (a
portrait Android tablet) and `narrow-wall` 680x1000 (the wall's width
floor). Each names the block its screen enters — `landscapeShort` for the
first two, `portraitShort` for the others — and fails a page that did not
enter it. Each owes what every wall pass owes (`WALL_PASS_NAMES` in
probe-coverage.mjs, held to the runner's list by
`the-wall-passes-owe-the-cycle-cards-every-step`): the touch wall's
controls, the status line, and a Cycle figure in every length band on
every look. The shot plan shoots the same four (`shotPlan.ts`).

**Red on main's code** (scratch clone `0a5abaf`: main's `window.ts`,
`window.css` and `render.ts` under this branch's probe, runner, fixtures
and tests; the full runner, the tracked fixture look carried), every
earlier pass green, the four new ones:

| pass | failures | by check |
|---|---|---|
| side-tablet (1024x768) | 954 | covered 438, Cycle figure 387, status line 85, text-spills 42, cut from below 2 |
| hd-wall (1366x768) | 79 | status line 79 |
| tall-tablet (800x1280) | 2,241 | cut from below 1,663, status line 330, text-spills 132, cut sideways 56, covered 56, Cycle figure 4 |
| narrow-wall (680x1000) | 697 | text-spills 348, cut sideways 175, covered 77, cut from below 40, Cycle figure 32, status line 25 |

That run's contrast pass died on a closed DevTools socket past the 300s
ceiling, on a machine at load 5–8 with another builder's probe running;
the four passes are geometry only, and the contrast pass carries no job at
these sizes. On the branch every pass is 0.

**Taken again 2026-10-19** (a fresh clone of the same shape: main's three
files at `c17ae5a` over the branch head `9a8cffe`), the whole runner with
its contrast pass green: side-tablet 955 (one `asked amount is covered`
more, at one of an animation's moments), hd-wall 79, tall-tablet 2,241,
narrow-wall 697, by check as the table says; every earlier pass green.
And once more that afternoon over the head `0d95080`, the runner stopped
after its geometry passes: 955 failures on 304 cards, 79 on 79, 2,241 on
373 and 697 on 113, by check exactly as the morning's; the five older wall
passes green.

**What each size needed, beside the fit** (window.css):

- **The tall portrait line moved from 1200 to 1500** (every
  `(orientation: portrait) and (max-height: …)` block, and the probe's
  `portraitTall` / `portraitShort` echoes). 800x1280 and 1024x1366 are both
  over 1200, and the stacked column ran 112–190px past the status line at
  800x1280 and cut Rural's code from below. They take the counter tablet's
  side-by-side arrangement now. Its code is capped by its own column
  (`min(26cqh, 100cqw - 180px - min(260px, 34cqw))`, floor 280): at 720x1280
  the tall wall's 26cqh is 333px in a 295px column. 1080x1920 is unchanged.
- **Under 790px of frame** (1024x768, 1366x768, and the Awning's 1280x900
  and 1280x800): the Cycle card's padding, gap and caption step down on every
  look (`--sw-pad` 12, `--sw-gap` 6, `--sw-cap` 6, caption 22px), and so do
  the sign's padding (12/8) and the status line (8px, 16px) on every wall
  screen. 768 of frame held the sign, the 280px code with its caption and
  the status line in 620–680px, and the card ran 7–41px past the line on
  Rural bare, under the Awning and with the yard. Browse's list ran 11–36px.
  The yard's air reaches 870px of frame (from 820), for 1152x864.
- **Landscape below 1280 wide**: every Browse row stands its price under its
  name and picture, across the row. At 1024 the list is 490px beside the
  code's 400px column, and a 13-character listing left its name 50px: the
  rail label ran over the figure (`asked amount is covered`), and a
  14-character one spilled left over the picture. The touch wall's
  selection strip keeps its names a column of at least `min(11ch, 30%)` and
  lets its "incl. surcharge" line wrap. On Neo that line was one nowrap line
  of 421px, which left the names 48px.
- **Portrait below 768 wide** (680x1000): Browse rows stand their price across
  the row, and a touch row stands its price under the stepper too. The Cycle
  card's air, caption, status line and sign step down, and so does the
  touch payment band's text (one step under the tablet's custom
  properties). At 680 the band ran 48px taller than at 768, and Back showed
  23 of its 64px under the Awning.
- **The fit** gained one rule here: a stacked listing whose card still runs
  past the status line takes one line where that clears it (864x1536, Rural
  worn: stacked at 60px and relieved to 32px, the card stayed 14px over; one
  line at 39px cleared it).

**Off the passes** (the scratch harness: the 53 wall screens, the shipped
looks bare and worn and the skeleton — no tracked fixture look — cards
failing any rule, main's code / the branch): 1920x1080, 1280x900,
1280x800, 1080x1920, 768x1024, 1440x900, 1600x900, 1920x1200, 2560x1440: 0
/ 0; 1024x768 237 / 0; 1366x768 79 / 0; 800x1280 280 / 0; 680x1000 102 /
0; 1280x1024 21 / 0; 1152x864 74 / 0; 1024x1366 284 / 0; 768x1366 295 / 0;
720x1280 340 / 0; **1280x720 78 / 70** (the Awning and the yard: the card
up to 20.5 and 30.5px past the status line, the touch wall's shop code cut
2–8px from below, inside its quiet zone); **900x1600 46 / 25** and
**864x1536 100 / 41** (Rural with the yard, the tall portrait card up to
79px past the line; at 864 Neo's long Browse figures beside the 160px
picture, and the 35-item payment's list). No card fails on the branch that
did not on main, at any of the 21 sizes.

**Measured again 2026-10-19 with the probe itself**: the runner in a
scratch clone, its `OFF_SIZE_WALLS` grown by 13 sizes (no block asked, the
contrast pass not run), every wall screen on every look bare and worn,
the skeleton and the tracked fixture look among them; main's three files
in a second clone beside it. Failures (cards failing):

| size | main's code | the branch |
|---|---|---|
| 1280x720 | 84 (78) | **73 (70)** |
| 1280x768 | 79 (79) | 0 |
| 1152x864 | 108 (82) | 0 |
| 1440x900 | 0 | 0 |
| 1600x900 | 0 | 0 |
| 1280x1024 | 21 (21) | 0 |
| 1920x1200 | 0 | 0 |
| 2560x1440 | 0 | 0 |
| 900x1600 | 46 (46) | **25 (25)** |
| 864x1536 | 341 (114) | **195 (35)** |
| 1024x1366 | 2,020 (363) | 0 |
| 768x1366 | 2,456 (368) | 0 |
| 720x1280 | 2,935 (445) | 0 |

Taken again the same afternoon over the head `0d95080`, both sides: every
figure in the table the same, card for card. Every card × check that fails
on the branch fails on main too, at all three red sizes. What is left: at
1280x720 the Awning's and the yard's cards and Browse lists past the status
line (up to 30.5px; 50 failures) and the touch wall's shop code cut 2–8px
from below by the body (23); at 900x1600 the yard's tall portrait card past
the line (up to 35.8px); at 864x1536 the yard's card up to 79.4px past it,
the 35-item payment's list on Rural with the yard (a scroller showing 28px
of a 48–51px row), and `shop-window-browse-long-figures` on Neo and Rural,
bare and worn (the row painting 35–38px past its card).

**Moved at the probed sizes**, stated: the fit's sizes on every Cycle
screen (the first section above); and the ≤790 frame rules on the Awning's
walls at 1280x900 (768 of frame) and 1280x800 (668) — the sign, the status
line and the Cycle card's air.

**What `looks:diff` shows moved** (2026-10-19, `pnpm looks:diff main
--expect` the 53 wall screens, the app code of `0d95080`, unchanged since):
1,975 identical, 1,893 real and expected, 0 not expected, 0 inconclusive,
of 3,868 shots over 10 viewports (4,919s; a run that morning on the same
tree read the same counts in 4,311s). At the five probed sizes every wall
screen moved: the Cycle screens on every shipped look (194 shots at
1280x900, 194 at 1280x800, 126 at 1080x1920, 88 at 768x1024, 60 at
1920x1080), and the 14 other wall screens on Modern worn alone at 1280x900
and 1280x800 — the Awning under the ≤790 frame rules. At the off-size
walls, which main paints too, 234 Cycle shots and 84 others each, 214 and
35 at 800x1280. No screen off the wall moved. The tokens are whole screens,
so this split by size is read from the log, not asserted by the command.

**Cost**: each new pass 5.8–6.1s on a run at load 2–4 (5.9–6.5s at load
6–10). **Back to back on this Mac, the morning of 2026-10-19** (the tracked
fixture look carried, two contrast tabs): main 189.3s and 185.8s (load
2.7–3), the branch 214.7s (load 3–4.5) — **+27s**, 214.7 of 300. The four
new passes 6.1 / 5.9 / 5.8 / 6.0s (23.8s); the five older wall passes +0.2s
each, the fit's own reads (portrait 7.7–7.9 → 8.1s, tablet 5.7 → 5.9,
desk-wall 4.7–4.8 → 4.9, short-wall 5.6–5.7 → 5.9, canvas 5.4–5.5 → 5.5);
the contrast pass 113.6–113.7 → 115.0s (the same 796 jobs). Two other
branch runs that morning read 240.9s (load 4–5 at the start) and 243.3s
(the load went to 9.8 mid-run, another worktree's job). That last run
failed one contrast job, `pay-several-longest-figure` at 390 on Neo, its
pay code's quiet zone half dark (12,244 of 23,088 pixels) — a page screen
the branch changes nothing on, green on both main runs, the other two
branch runs and the red run. Read as a capture race under that load; not
reproduced, not chased.

**Back to back again that afternoon**, the machine slower (load 2.7–3 at
each start): main 218.6s, the branch 280.0s and 261.3s — **+43 to +61s**,
both branch runs past the 240s sharding line and within 20–39s of the 300s
ceiling. The four new passes 9.8 / 9.5 / 9.6 / 9.0s and 10.0 / 9.7 / 8.8 /
8.1s; the contrast pass 132.5s on main, 141.2s and 118.9s on the branch,
its capture's mean 81, 87 and 73ms, so that pass moves with the machine and
not with the branch. The phone pass, which the branch does not change, read
8.9–17.2s across the afternoon's five runs (two of them scratch clones
stopped after the geometry passes), so a lone figure says little: the four
passes cost 24–38s, the rest is noise and the older wall passes. **The
fit's own share, timed in the page** (a scratch clone, every Cycle card's
fit summed per pass): 0.28–0.81s per wall pass, over 312–381 cards and
1,904–3,424 reads (five to nine a card on that sample; **restated at 9.4 a
card on average and 23 at most** by the critic's census of 2026-10-20, in
"Cost and the contrast dump" below) — the passes cost what 53 screens on
every look cost, and making the fit cheaper would buy a second or two.
The ceiling stays (D-2026-10-19-02): the probe is split across two tabs on
its own branch, which lands before this one merges.

**Weight** (`src/bundle.test.ts`, main in a scratch clone at `c17ae5a` and
the branch head `0d95080`, read the same afternoon): every visitor 876,485
→ 882,054 bytes (+5,569: the entry script 715,801 → 720,557, +4,756 — the
fit is more than the "few hundred bytes" the critic guessed — and the entry
sheet 156,659 → 157,472, +813), 32,946 left under the 915,000 ceiling; a
deploy build carrying the tracked fixture look 893,567 → 899,138 (15,862
left), one carrying the canary 899,122 (15,878 left). On demand
unchanged, 265,386.

## Rebase round (2026-10-20): the off-size walls on main, the stacked figure under its unit, and the owner's three answers

The branch rebased onto main `25d4015` (money-guards and probe-shard
merged), closing the wall-offsize critic's merge conditions
(`private/design/workshop-2026-09-23/CRITIC-WALL-OFFSIZE.md`) and the
owner's answers of D-2026-10-19-03.

**The four passes are plan entries.** `OFF_SIZE_WALLS` moved from the
runner into `scripts/probe-passes.mjs`, each a `{ key, kind: 'wall',
coverage, vp, screens: WINDOW_SCREENS, block }` entry of `geometryPlan`
after the two desk walls (`landscapeShort` for `side-tablet` and `hd-wall`,
`portraitShort` for `tall-tablet` and `narrow-wall`; no new block). The
runner builds them by kind, `passesNotRun` holds the list, and
`every-pass-the-runner-runs-is-in-a-coverage-table` and the shot plan's
"every wall pass the runner runs" hold the tables and the shots.
**`GEOMETRY_PASSES` and both money surface tables (`FIGURE_SURFACES_OWED`,
`DRESS_SURFACES_OWED`) are derived from `WALL_PASS_NAMES`** (the critic's
item 2: written out, they named eight passes and the merge left the four
new ones out of all three, owing no money rule), and pinned by value in
`the-money-rules-are-owed-on-every-look-of-every-geometry-pass`. So the four
owe what every wall pass owes: the broken figure's ink, the self-clip and
the dress on the wall, the plate and the Cycle card, and a Cycle figure in
every band; the spill rule runs on every paint. The two planted wall passes
of the coverage test are `lap-wall` and `kiosk-wall` now (the four were the
plants until they were real).

### A Cycle figure never runs under its own unit (`a-cycle-figure-never-runs-under-its-own-unit`)

The critic's item 1, new with the fit: the stacked shape (`from` above, `
XEC` beside the figure) gave the money node the broken shape's
`minmax(0, max-content)` track and kept it on one line, so in a cell
narrower than the figure the track shrank under it and the digits ran on
under ` XEC` — inside the column, where the fit and the probe read the cell
and the figure's lines as one span. Neo's `from 1,234,567 XEC` at 1280x900
printed "XEC" over the last "7" (the figure 78.3px out of its own box, under
the unit by 55.4px). Fixed three ways, each held apart:

- **window.css**: `[data-wall-wrap='stack'] .item-a:has(> .item-u)` takes
  `grid-template-columns: max-content auto` (the critic's proven fix), so a
  stacked figure's track never shrinks and the whole amount runs past the
  cell instead, which the fit reads.
- **the fit's gauge** (`realGauge`, `wallFit.ts`): a size stands only with
  the money node's text inside its own box and clear of `.item-from` and
  `.item-u` (two runs meet where they overlap along the line and their
  middle three fifths overlap across it).
- **the probe** (`cycleFigureFaults`, its own code): the same two facts on
  every Cycle figure of every wall pass, counted with the Cycle rule.

**Red** (the scratch driver over a probe build, the 53 wall screens, 381
Cycle figures a size — the shipped looks bare and worn, the skeleton and
the tracked fixture look): the branch as the critic read it, the new rule
on —

| size | cards under their unit | `a-spill-over-any-money-is-read` cards | all failures |
|---|---|---|---|
| 1280x900 | 14 | 14 | 108 |
| 1280x800 | 12 | 12 | 86 |
| 768x1024 | 23 | 22 | 165 |
| 1024x768 | 57 | 57 | 495 |
| 800x1280 | 20 | 20 | 146 |
| 680x1000 | 29 | 29 | 211 |
| 1920x1080, 1080x1920, 1366x768 | 0 | 0 | 0 |

(`a-money-figure-is-never-misdressed` failed too, on Rural's
`shop-window-cycle-listing-6`, `-7` and `-9`, 0–4 a size: the tag's right
border read as the ground under the overflowing digits.) The CSS alone, the gauge
alone, and both: 0 failures of any rule at all nine sizes.

### The owner's three answers (D-2026-10-19-03, all as recommended)

**(1) No transition or animation moves a money figure's size.** A running
transition out-ranks the fit's inline `font-size`, and a keyframe beats an
inline declaration; the fit's docblock said "no look sheet can out-rank",
which was false (the critic's item 3). `holdStill` now finishes every running
transition on the card and on every element under it, the money node among
them, and holds `transition: none !important` from before the fit takes the
last size off (it held five boxes — the card, its head, the price cell, the
amount and the money node — until the re-review's item 1: a look's
`transition: font-size 2s` on `.item-u`, which the look lint passes, left 7 of
39 Neo Cycle cards 9–16px past their column after a turn with no paint, and 0
of 7 with the subtree held, the critic's scratch test; the turn and the sway
stay off the five boxes, which are the only ones the fit sets and reads);
on release the style is read (settled) before the transitions return, so
none runs from the last size read to the one taken. The look lint refuses a
transition of `font-size`, `font` or `all` on a rule whose subject may be a
money node, and a size in any keyframe (`a-look-never-animates-a-money-nodes-size`,
`scripts/workshop-css.mjs`; the kit lint unchanged). **Red in Chrome** (the
showroom, the critic's plant `.t-neo.shop-window .item-x { transition: all
.4s }` in `theme-neo.css`, each Cycle screen on Neo painted at 1920x1080,
the viewport then set to 1024x768 with no paint so the frame watch refits,
against a fresh paint at 1024x768): without the hold 7 of 39 cards differ
(six left at 79.92px, past the 65.5px design, one at 16px); with it, 0. The
64px keyframe plant is the lint's: the fit does not hold animations
(holding `animation` would restart every look's motion at every fit).

**(2) The Awning's caption under 790px of frame** (28 → 22px at 1280x900
and 1280x800, with the card's padding, the sign's and the status line's):
accepted, the owner's call. Nothing measured changes.

**(3) The broken shape's size**: the largest size at which the figure
stands at any number of lines, capped by its design size, where it was
`WALL_FIGURE_MIN_PX` (32) and no larger; the card then held clear of the
status line at the largest size from 32px up that clears (`settleBreak`).
**Its first cut started `settle` from the design size and left the floor**:
a broken figure's cell spans its column at every size, so the one-line
estimate took 1% a try and ran out of tries — 87 broken cells at 16px over
the nine sizes, Modern's `from 1,234,567,890.12 XEC` at 1024x768 among them,
where it stands at 40px. `largestBreak` asks the design size, then 32px, and
halves above or below it to 0.5px. Measured after (the showroom, 2,106
cells): 531 broken figures, every one over 32px — 32.5 to 81.92px, median
58.8 (by size: 768x1024 33.5–76.8, median 52.6; 1280x900 56.9–81.92, 72.1;
1280x800 61.5–81.92, 69.5; 1024x768 32.5–65.5, 43.4; 800x1280 53.3–80,
74.3; 680x1000 36.8–68, 48.5; 1366x768 73.8–79.9, 79.9). The critic's
example, Neo's `from 12,345,678,901.23 XEC` at 1280x900, stands at its
81.92px design on four lines, the card clear of the status line (the
critic read 56px on three; the design size stands too).

### Sizes against main, again

Every Cycle figure on the three shipped looks bare and worn at the nine
sizes, main `25d4015` against the branch (2,106 cells; the showroom; main's
probe verdicts per card from the scratch driver): **larger 1,237, the same
569, smaller 300** (before this round: 752 / 794 / 560, the larger ones
including the figures under their unit). By size, larger/same/smaller:
768x1024 185/49/0; 1280x900 162/50/22; 1280x800 159/52/23; 1920x1080
66/168/0; 1080x1920 126/108/0; 1024x768 92/40/102; 800x1280 100/8/126;
680x1000 186/44/4; 1366x768 161/50/23. Of the 300 smaller, 235 are on cards
main's code failed (the fix) and **65 on cards that passed on main**: 64
figures main broke at 38px over two lines that the fit keeps on one line or
stacked at 32.3–37.5px (22 at 1280x900, 23 at 1280x800, 16 at 1366x768, 3
at 1024x768), and Modern's `from 1,234,567,890.12 XEC` at 800x1280, 52px on
one line in main's tall column, 35.4px stacked in the counter tablet's card
here. The 209 broken at 32px of the round before are gone: no broken figure
is smaller than main's on a card that passed on main (40 are smaller, all at
1024x768, where main's card failed: Neo's quotes at 36.1px and Rural's at
32.5–33.5px, against main's 38px). **Under 32px**, six cells, all at 1024x768: Neo's
and Rural's `from 1,234,567 XEC` stacked at 29.3 and 26.4px, and Rural's
`$123,456.78` on one line at 31.6px, bare and worn each — figures of 11
characters as counted, built with no break. (The showroom's read does not
hold Rural's sway, so its line count for Rural's tag and twelve Rural
"text out of its own box" readings at 1024x768 are the sway's; the probe,
which holds it, reads 0.)

### Still red, off the passes (pre-existing)

1280x720 73, 900x1600 25 and 864x1536 195 failures on the branch against
main's 84, 46 and 327 (the scratch driver, every wall screen); every branch
failure, by screen, look and check, fails on main too. What is left is the
PLAN § Open entry's: status lines at all three, the touch wall's shop code
cut 2–8px inside its quiet zone and the borrowed-token sentence cut 1–6px
from below at 1280x720, the eight-byte Browse figure's unit cut by its card
and the 35-item payment's rows cut from below at 864x1536. No pass, and not
counted as passes.

### Cost and the contrast dump

**The fit's reads, restated** (the critic's re-review, 2026-10-20, every
Cycle card at nine sizes; this section and `wallFit.ts`'s docblock said five
to nine a card and 43 at most): **9.4 reads a card per fit on average** —
5.1 at 1920x1080, about 11.2–11.5 at 768x1024, 1024x768 and 680x1000, 13.5 on
a broken figure's card, 23 at most. That is a sample and not a bound: the
loops are capped at 14 tries (`settle`), 12 (`largestBreak`) and 12
(`settleBreak`'s halving), and `relieve` at 6 steps. Every paint fits twice,
after the paint and when the faces land (`render.ts`), and a frame resized
with no paint fits once more, so a Cycle card is read about twice that many
times per paint. The fit's time over a wall pass is the 0.28–0.81s above.

**Back to back on this Mac, 2026-10-20** (two tabs, the tracked fixture
carried; XProtect's remediators held a core through both runs): the branch
`f74016b` 248.1s (load 3.13 at the start, 4.61 at the end), main `25d4015`
208.4s (3.72, 5.26) — **+39.7s**, 248.1 of the 300s ceiling, past the 240s
sharding line and under the 260s line the round was held to. The geometry
walk 63.5 → 102.0s of wall time; the four new passes 15.7 / 16.4 / 16.7 /
16.0s on their tabs (64.8s summed); the older wall passes slower by the
fit's reads and the break's halving — portrait 12.2 → 14.4s, tablet 11.2 →
13.9, desk-wall 9.7 → 12.2, short-wall 14.0 → 15.6, canvas 10.4 → 11.4; the
contrast pass 126.2 → 128.5s on its tabs (796 jobs each, capture mean 76 →
77ms). One sample each, under that load.

**Weight** (`src/bundle.test.ts`, the branch's `pnpm test` and main's in a
scratch clone): every visitor 876,485 → 883,886 bytes (+7,401; +1,832 over
the branch before this round), 31,114 left under 915,000; a deploy build
carrying the tracked fixture 893,567 → 900,972 (14,028 left), one carrying
the canary 900,956 (14,044 left). On demand unchanged, 265,386.

**The contrast dump** against main's (`node scripts/contrast-dump.mjs`):
15,010 boxes identical, 6 moved, 2 added, 0 removed. Five moved boxes are
the sign's name on Modern under the Awning (flags 65535) on five desk wall
screens, 10px higher (169 → 159) under the ≤790px frame rules, 13.55 →
13.42:1; the two added are a Browse row's figure and a quote row's chip on
the same look, read since the smaller sign and status line give the strip
458.5px for 420. Both are D-2026-10-19-03 (2). The sixth is the status
line's words on Rural worn, `shop-window-cycle-longest-figure` at 1280x900,
the box unmoved, 3.534 → 3.462:1: the eight-byte figure breaks at 62.7px
there now (main's table, 38px), and its card's painted edge stands 0.35px
past the status line's top, inside the fit's and the rule's 0.5px; Rural's
card shadow (`0 10px 22px`) now reaches the words, 19px below that edge.
D-2026-10-19-03 (3); still over 3:1. A card that touches its status line is
what the relief allows; whether a broken figure should leave the card more
air than 0.5px is the owner's, and not asked.

### Also this round

- **The frame watch** stops with the app (`boot`'s teardown calls
  `forgetWallFit`), and the refit on a frame resized with no paint runs the
  name ladder before the fit and the marquees after it (`WallRefit`), as the
  paint does. Tests in `wallFit.test.ts` and `app.live.test.ts`, each red
  without its call. The Browse wall, and every page screen, still re-measure
  neither on a resize with no paint, stated.
- **`a-look-never-sizes-inside-a-money-node`** splits a rule's selectors at
  top-level commas and reads each `:is()`, `:where()` and `:matches()` as its
  alternatives (the critic's item 8, `.t-x :is(.item-x, .pay-x) span` read
  as two selectors that sized nothing).
- **The code's column comment** says what is so: the 280px floor wins under
  a 720px frame (269px of column and a 280px code at 680 wide).
- **Two holds, on purpose.** The probe's Cycle rule holds the card still with
  money-guards' `withTransformsHeldOff` since the rebase (the resolution the
  critic's item 2 named), and the fit with its own `holdStill`; the section
  above that says `holdStill` is shared with this rule is history. The
  probe's reads stay apart from the fit's, as the unit rule's do.

## Before 8g2: 1a's second fix round (2026-10-20, D-2026-10-20-13)

1a, `nothing-covers-money-or-a-protected-box`, stayed report-only through
this round (it binds since 7a, "Before 8g2, 7a: 1a binds", below), and
`coveredBy` binds under its own check names. This round carries the
owner's decisions D-2026-10-20-13 (denser points over a glyph; the horizon's
worst pruned to its pinned jobs) and the window's rule fixes for the
critic's review of the first fix round. The plants are the critic's.

### The horizon's worst on its three jobs (the owner's D2(a))

A shipped run reads the sign at Grid horizon's worst on `HORIZON_WORST`'s
three jobs alone (`readsHorizonWorst`, `HORIZON_PINNED_JOBS` in
`layout-check.mjs`): `desktop/unreachable/2/65535`,
`desktop/shop-window-cycle/2/65535` and `mobile/item-listing/2/65535`. It
read every job that wore the horizon, 94 on the default plan, to hold that
no other job read lower. **What is lost**: that guard. A change that lowers
the name, the tagline or the state line at the horizon's worst on any other
job — another screen, width or variant — passes the run. The ring read over
the horizon as painted, on every job that wears it, is the failing guard and
is unchanged. The three jobs are owed both ways: the runner requires each to
have been read (`HORIZON_REQUIRED`), and `horizonWorstVerdict` holds each to
its number within 0.01, lower and higher. A read on any other job now fails
the verdict, so the prune is held rather than assumed
(`horizon-worst.test.mjs`, red with the check taken out). A kit run pins
nothing and still reads every job the page owes (`__contrastOwed`).

The pins read the same on the branch: name 2.7589, tagline 1.9153, state
line 9.2974. The phase went from 95 calls and 35.1s of tab time on main to
4 calls and 1.3s (the three jobs and the cross-tab canary's read again),
about 17s of wall time on two tabs.

### Past a side edge, above the top: asked for reach (the window's item 3)

The critic's PC: a centred, reversed sideways shelf on Neo puts each row's
price past the screen's right edge, past the scroll origin no position
reaches ("1,200" at x 563–643 at 360px). Every bound rule passed.

- `cutSideways` took any sideways scroller above a box as reaching all of
  it. Now every edge the box runs past — a box above it that cuts or scrolls
  sideways, then the viewport — is asked whether a scroller inside that edge
  brings every part of the box within it (`scrollReach`, cut to the edge's
  window by `reachWithin`): the edge's own scroller for its own side, any
  scroller below it for a cutter or the viewport. A box past the side of an
  `overflow-x: auto` box with nothing to scroll is cut, where it was not
  read. One scroller at a time, stated: a box only two nested scrollers
  together could bring in reads as out of reach.
- 1a only counted a point past a side edge, and counted one above the top
  as below the screen. Both are now asked whether a scroller, or the page,
  brings them into view (`offScreenReach`), and fail where none does. (Where
  one does, this round counted a point above the top as past a side edge;
  since 7a it is counted apart, the critic's third review, item 5.) A
  point below the bottom is still counted, not asked (D3): out of reach
  there is read by the self-clip rule for a node's own text, and by nothing
  for a cover.
- A figure in a moving or pinned ticker ribbon keeps its one exception, by
  value, in both. The clean tree is green on every pass, the ticker ribbon
  and the marquee cells included.
Red, the whole runner on the branch (2026-10-26): `a protected box is cut
sideways` 1,344 failures at 390, 1,316 at 1280 and 616 at 360, and `asked
amount is covered` 868, 868 and 224 (`coveredBy` asks `cutSideways` first);
1a would fail 192, 176 and 88 lines, every one Neo's price past the right
edge with no scroll position that brings it in. On cba463b the critic's
whole-runner log has every money rule green at both widths (its one red at
390, a marquee check, is not money).

### A keyframe on a box above money (the window's item 4)

The critic's PT: a keyframe `visibility: hidden` on the quote row's price
column, 120s after the paint, filled forwards. Pay stood over an empty tag,
and every pass read 0.

- `BOX_HELD` holds `visibility` (anything but `visible` fails, at rest and
  at every keyframe) and names `translate`. Every keyframe on a box above a
  money node is held as the box is held at rest (`keyframeHeld`), and what
  the geometry reads only at the instants may not move: a keyframe's
  `clip-path`, `translate` or transform translation that differs from the
  value the box computes when the dress rule reads it fails — and the dress
  rule reads after `checkOverTime`, at the last of its six instants, not at
  rest — and any keyframe naming a size (`KEYFRAME_SIZES`: the width and
  height families, `flex-basis` and the grid tracks) fails, whatever its
  value: sizes are never compared. (Until 7a this said each was held
  against the value the box computes at rest; the critic's third review,
  item 5.) A moving ticker ribbon moves by design, by value.
- `checkOverTime` zeroes every animation's delay before its six instants,
  as the contrast freeze does (`freezeAnimations`). With its delay, PT's
  animation stood before its first keyframe at every instant. The per-paint
  rules that run after the instants read the last instant, so they read PT
  hidden too.
- Not read, stated: a keyframe on a box above that changes a property these
  lists do not name. The look lint's refusal of `visibility` in first-party
  keyframes is the lint-belts branch's.
Red, the whole runner on the branch: `a-money-figure-is-never-misdressed`
76 failures at 390, 94 at 1280, 64 at 360 and 333 at the canvas, and on the
wall passes 351 on the portrait wall, 60 on desk-wall and 78 on each of the
other six, on every Rural quote figure (`span.item-a above it: visibility
hidden, at 100% of t-rural-later`, and the figure itself hidden at the last
instant). (This said "78 on each wall pass" until 7a, the critic's third
review, item 5; the counts are 7a's own run of PT, at 381d3b7, the same as
the critic's.) On cba463b, 0 at 390 (a session).

### Who takes a box away (the window's item 5)

The critic's PV: a look's `content-visibility: var(--h)` on the quote row's
price column. `lookHides` read rules by their written value, saw no
`hidden`, and called it the app's doing; 1a skipped the node and the dress
rule skipped it silently.

`hiddenBy` reads every rule that declares `display` or
`content-visibility` on each box that hides the node (the node itself for
`display`, the boxes above it for either), in force. The hide is the look's
when a look's rule could set the hiding value — the value itself, a `var()`,
or a keyword that defers to another value. It is the app's only when
something of the app's own explains it: the `hidden` attribute, an inline
style (a look writes none), or an app rule declaring the hiding value as
written. Anything else fails closed. 1a uses it in place of `lookHides`, and
the dress rule now fails a money node a look takes away by a rule, as it did
one taken away by an animation. Stated: rules are found by the first class
or id of their selector's last compound (`*` where it has none or holds a
functional pseudo-class), and a rule under a container query counts as in
force, which for an app rule errs toward excusing. The clean tree's counts
of nodes the app hides are unchanged on every pass (744 on the phone pass,
1,872 on each wall pass but the portrait wall and the canvas, which hide
none; this said "each wall pass" until 7a, the critic's third review, item
5).
Red, the whole runner on the branch: the dress rule 76 failures at 390, 94
at 1280, 64 at 360, 333 at the canvas and 351 on the tall wall passes (`has
no box: a rule of the look takes it away …`), beside the clip and spill
rules PV already turned red. On cba463b the dress rule read 0 at 390 (a
session).

### At rest: every animation put back, its delay zeroed (the critic's item 9)

`coverAtRest` put back only the animations the instants had moved, each
with its own delay. The ticker continues a pass across repaints through a
negative delay as long as the wall-clock time since its pass began
(`armTicker`), so at rest the ribbon stood a few pixels further on in one
run than another, and four of its points flipped between past the screen's
side and behind its cell. Now every animation on the page is reset with
its delay zeroed: one the instants moved to the time it stood at before
them, any other to 0. With its delay zeroed that time is a time into its
active phase, so one that stood in its delay before the instants does not
stand where it stood (until 7a this said "where it stood", the critic's
third review, item 5). Five runs of `broadcast-ticker-live` at the canvas
read the same tallies on every look (Neo: 288 points, 54 hit-tested, 218
past a side, 16 behind a clip). That holds for the ticker's tallies alone:
a pass's point count still moves from run to run, by a few hundred points,
every one among those hit-tested (the critic's two clean runs at ffecdc7:
mobile 407,329 and 407,252, the canvas 1,137,001 and 1,136,695), while the
contrast pass, on a fixed clock, read the same 697,851 points in all four
of the critic's runs. A relative time in a fixture's text, on the geometry
passes' real clock, is the likely mover; not traced.

### Where the time outside 1a's own timer went (the window's item 7)

V8's sampling profiler over an unminified probe build of the phone pass,
two pairs back to back (load 5–16), main against cba463b:

- `renderStall` 0.6–1.0s slower a pass. The forcing sat on `<html>` and was
  taken off before the next paint; `renderStall` reads the old scroller's
  offset before it replaces the tree, which restyled the whole old tree.
  Chrome's `RecalcStyleCount` over the phone pass: main 10,748, cba463b
  12,473 — two more a read (886 reads), one to put the forcing on and one to
  take it off.
- Garbage collection 0.07–0.10s more a pass. The point objects were not the
  cost.
- `scrollReach`: 7ms over the narrow pass.
- `measure` 0.4–0.85s slower, which moved with the load and is not
  explained.

**Cut**: the forcing now sits on the painted tree's own root elements
(`#app`'s children), so a paint takes it off by throwing that tree away
(`dropCoverForPaint`) and nothing is restyled for it; `releaseCover`, for
`coveredBy`, still restyles, since its tree stays. `RecalcStyleCount` on
the phone pass is 11,683 now, about one more a read than main (side tablet:
main 23,954, cba463b 25,131, now 24,553). And the points live in flat typed
arrays reused node to node (`pushPoint`), the glyph points handed to a
callback (`eachInkPoint`): asked for first, and worth little, since
collection was small.

### Denser points over a glyph (D-2026-10-20-13 item 1)

The owner asked for points no more than 3px apart down each glyph's centre
column and along its middle row, on top of the lattice, and to stop and
report if that added more than 5s of wall time. It did, by the measures
below; it was held out of the rule as a patch, and is applied here on the
owner's yes.

- **The rule as written**: the centre column and the middle row each at
  `ceil(extent / 3)` points, at the middles of their bands; a lattice point
  on either line not asked again; on a phone glyph of about 9 by 6px of ink,
  five points where the lattice asks two.
- **Red proof** (sessions, the plant on the branch's code with the patch):
  PB reads 10 would-be lines at 360 and 10 at 390, every one Modern's
  `selection-total` under `div.sel-tray-in`; `pay-several-strip-xec`, the
  "15,750.00 XEC" PB was calibrated on, 54 ink points covered at 360. On
  cba463b (the critic's whole-runner log) 8 lines at each width, and not
  that one.
- **Cost** (the less of two interleaved session runs of each of the twelve
  geometry passes, load 4–11): 1a's own time 23.2s → 34.2s (+11.0s, +47%),
  its hit tests 2.17M → 4.66M, about 4.4µs a hit test added. On two tabs
  that is about +5.5s of the geometry walk, and the contrast pass's one
  read a job (4.6–6.8s of tab time) grows by about half again, +1–1.5s of
  wall time: about +6.5–7s in all, over the 5s line. Of 1a's own time the
  hit tests are the cost: on five prepared paints (load about 40) the
  forcing's restyle took 0.3–1.3ms a read and the check that it took
  0.05–0.2ms, a hit test 3.7–4.8µs, and the rest scales with the points.

### What a lattice cannot see, and a false red (the critic's items 7 and 8)

Any fixed set of points can be dodged: a cover thinner than the pitch
between two points, or one cut around them — a `clip-path` with holes where
the points stand, a mask — is asked nowhere. On the points this rule
asks, a band at least 3px tall across a glyph's centre column, or 3px wide
across its middle row, meets a point; one thinner, or one that reaches
neither line, does not. And the other
way: a box that paints nothing — a transparent wrapper — has a hit area all
the same, and where it meets a glyph's ink box it reads as a cover. The
touch wall's `span.sw-step` over a quote's figure does, on the clean run. It
is a class of false red, not a one-off.

### The clean run's would-be list

At 2dc66f0, on the lattice alone, 35 lines, all on the touch wall's quote
rows (`shop-window-touch-quotes-16` and `-long-figures`), as at cba463b: 7 at
768x1024, 14 at 1024x768 and 14 at 800x1280; contrast 0.

- 33 are the stepper's "−" (`button.sw-step-b`) painting over part of the
  figure's glyphs: real, the layout defect the touch-wall branch fixes.
- 2 are `span.sw-step`, the stepper's transparent wrapper, 1 ink point at
  the top of a "9" on Modern and the skeleton at 1024x768: the false-red
  class above.
- No line is out of reach past a side or above the top, and none is a box a
  look takes away.

With the denser points (ffecdc7, the critic's whole-runner log): 45 lines,
7 at 768x1024, 24 at 1024x768 and 14 at 800x1280, every one the stepper or
its wrapper over the same figures, more of them found at the points between
the lattice's rows (Rural at 800x1280 among them). (This section gave the
lattice's 35, and 14 at 1024x768, as the dense rule's list until 7a, the
critic's third review, item 5.) After the touch-wall merge the list is 0 on
every pass, the wrapper's two false reds with it.

### Cost and the contrast dump
Two pairs back to back, main (0a34999) then the branch, two tabs, the
tracked fixture carried (796 contrast jobs), 2026-10-20:

| Pair | Main | Branch | Load (main → branch) |
|---|---|---|---|
| 1 | 275s | 273s | 3.2→5.7, then 5.7→6.9 |
| 2 | stopped by the 300s watchdog | 264s | 5.1→10.6 (another builder's run started), then 10.6→3.9 |

- The geometry walk: 110.7 → 119.6s (+8.9s) and 135.6 → 134.4s. At cba463b
  it was +22.7s and +21.5s over main; the forcing's restyle cut is the
  likely part of the difference, within noise of this size.
- 1a's own time: 26.9s and 29.9s over the geometry passes, and 6.8s and
  4.6s of tab time in the contrast pass.
- The horizon's worst: 35.1s of tab time on main, 1.3s on the branch.
- The contrast dump, the branch's first run against cba463b's three runs:
  all 15,018 boxes the same as two of them (the third differs from both in
  two boxes of `mobile/publish-name`, 5.49 against 6.15:1, a difference
  between cba463b's own runs), and every job record the same but for
  `horizonWorst`, gone from the 91 jobs the prune no longer reads.

## Before 8g2, 7a: 1a binds (2026-10-26; the critic's third review, its step-7a checklist)

1a, `nothing-covers-money-or-a-protected-box`, is a bound rule. Every line it
used to print as a would-be failure is a failure: on every geometry pass, the
reduced-motion passes among them, in the pass's own failure list; once a
contrast job, at its full height, a failure of the contrast pass. Its fail-
closed sentences (a `pointer-events` or `interactivity` the forcing did not
take, an inert subtree or a modal dialog, a point with nothing under it, a
node turned past 45° with no box, a box a look takes away) are failures with
it. None fired on the clean tree.

### What it reads, and what stays beside it

- **The unbuyable label** joins its nodes (`COVER_NODES`: the money nodes,
  the protected boxes and `[data-role="unbuyable"]`). On the clean tree the
  phone pass read 99 more nodes than at ffecdc7 (5,117 against 5,018), and
  18 more the app hides (762 against 744).
- **`coveredBy` is kept whole**, at rest and at the six instants for the
  price and "You pay", and after the instants for the unbuyable label, under
  its own check names: "asked amount is covered", "you-pay figure is
  covered" and the label's sentence. 1a reads at rest alone, and does not
  strictly cover `coveredBy`'s at-rest read either — `coveredBy` asks a text
  node's box at its centre and corners, where 1a asks its glyphs' ink, and
  it fails a price or "You pay" with no box at all, which 1a skips where the
  app hides it — so that read stays too, and the names stay as they are.
- **Its over-time read is the cheaper of the two ways**, measured (sessions
  on the probe page, the shipped looks and the skeleton, the fixture not
  carried, two runs of each, load 3.5–4.7; `private/design/workshop-2026-09-23/before-8g2/7a/tools/instants.mjs`).
  The six instants' loop, with `coveredBy` asking the price and "You pay":
  2.73s and 3.15s at 390, 3.53s and 4.33s at 1280. With `coveredBy` taken off
  the instants and 1a's `coverOf` asking the same nodes with the forcing on:
  5.22s and 6.81s at 390, 9.66s and 11.97s at 1280 — 2.5 to 3.7s more a phone
  pass and 6.1 to 7.6s more a desk pass. On the whole runner the instants
  cost `coveredBy` 7.3s of page time over every geometry pass (4,950 calls in
  1.03s at 390, 6,480 in 1.61s at 1280), its at-rest read 1.2s; 1a's own
  read 36.5s (the clean run below; the runner prints both per pass).
- **Not read, stated**: over time no hit test asks any money node but the
  price and "You pay" (`coveredBy`'s, at the six instants); every other
  money node and every protected box is hit-tested at rest alone, and since
  D-2026-10-26-03 at the end of a lasting animation (the fourth review's item
  5(a): this line read as if over time were read for every money node). Even
  over those two, `coveredBy` asks with `pointer-events` as the page has it,
  so a cover that takes no hit is read over time by nothing but the
  decoration sweep (a positioned or decoration box) and, on the sampled
  screens, the contrast pass at its one frozen instant; a cover that moves
  into place between frames, by neither (the critic's P3-1).

### The clip ceiling reads 1a's points

`CLIP_SKIP_CEILING` held `coveredBy`'s points, over the price and "You pay"
alone. It holds 1a's (`coverByClass`) since 7a, on every pass that read 1a —
the geometry passes but the short ones, and the contrast pass — the public
looks' sum on each, and every carried look on its own (`look-tallies.mjs`
reads `coverByClass`: `coverTally`, `clipCeilingFault`, `clipLine`). It stays
30%, and a tally that hit-tested nothing fails.

- **The two wall scrollers are named by value and counted apart**
  (`WALL_SCROLLERS`, `layout/coverPoints.ts`: `div.items.sw-strip`,
  `dl.sw-pay-lines`; a point is theirs when its innermost clip is one of
  them). At ffecdc7 they took the counter tablet to 34% and the narrow wall to
  33% (the critic's run): every point behind a clip on the tall and tablet
  walls was behind one of the two (the critic's census). On the clean tree
  at 7a, over every look the pass painted (the pass's own line prints the
  public looks' share), points behind a clip of those behind or hit-tested,
  and the wall scrollers' apart: mobile 23,996 of 289,563 (8%), 0;
  desktop 38,555 of 569,375 (7%), 7,090; canvas 641 of 486,570 (0%), 111,885;
  every other wall pass 0%, with 72,087 to 177,239 apart; narrow 11,828 of
  208,873 (6%), 0; contrast 783 of 466,318 (0%), 32,362. Each sum of the two
  is the same as the critic's count at the merge (the canvas's 112,526,
  the tablet's 173,880), where the phone's rose with the unbuyable label's
  nodes.
- **A point behind a clip that cuts and does not scroll fails**
  (`clipVerdict`, the critic's third review, item 3): past a clip whose
  `overflow` on that axis is `hidden` or `clip`, by more than a pixel, with
  no scroller inside it that brings the point into the clip's window
  (`reachWithin`). Until 7a it was counted as a point behind a scroller. A
  figure in a running ticker ribbon is cut sideways by design
  (`RUNNING_RIBBON`, `cutSideways`' own exception, by value): the first
  clean run failed 10 ribbon figures on the canvas and 1 contrast job, past
  the ticker cell's side (`div.tk-clip`) and then past the bar's
  (`div.plate.tk-bar`), and none since. No other point on the clean tree is
  cut; the critic's census, over the innermost clip alone, found none
  either.
- **A point above the top is counted apart** from one past a side edge
  (`above`; the critic's third review, item 5). 0 on every pass of the clean
  tree.

### Owed

Every geometry pass owes, on every look it painted, a 1a read that
hit-tested a point (`probe-coverage.mjs`; `1a-is-owed-a-read-on-every-look-of-every-geometry-pass`).
Every contrast job not refused owes its read (`coverUnread`), and a job whose
page answers no tally a job can be held to throws.

### The clean run

381d3b7, two tabs, the tracked fixture carried (796 contrast jobs): exit 0,
242.8s (load 4.1 → 3.8), 0 failures of 1a on every pass and on the contrast
pass, every pass and the contrast pass under the clip ceiling (the numbers
above). Every run of the timing pairs below read the same: exit 0.

### Cost

Two pairs back to back on this Mac, main (c1f3e97) then the branch
(381d3b7), two tabs, the tracked fixture carried (796 contrast jobs), no
other probe running:

| Pair | Main | Branch | Load (main, then the branch) |
|---|---|---|---|
| 1 | 240.2s | 251.5s | 2.0 → 3.2, then 3.2 → 2.9 |
| 2 | 243.0s | 252.8s | 2.9 → 4.1, then 4.1 → 3.9 |

The branch as a whole is +11.3s and +9.8s: its geometry walk 99.5 → 124.5s
and 102.0 → 125.5s, its contrast pass 132.9 → 118.3s and 132.9 → 118.9s
(the horizon's worst pruned to its three jobs, 1f44e05). 7a's own cost, one
pair, the branch before it (cd34f73) then after it: 249.2s (load 2.6 → 5.0)
and 252.5s (5.0 → 3.4), the walk 122.6 → 124.7s, the contrast pass 118.8 →
119.5s — +3.3s, inside the noise of one pair. 1a's own time is 36.5s of page
time over the geometry passes and 6.1s of tab time in the contrast pass (the
clean run). 47–49s stand under the 300s ceiling.

### Red proofs, the whole runner, each plant alone (381d3b7)

Each to exit 1. Plants in `private/design/workshop-2026-09-23/before-8g2/7a/plants/`, logs in its `runs/`. Counts
are 1a's failures, then what else failed; "alone" where 1a is the only
geometry rule that fails.

| Plant | 1a's failures | Beside them |
|---|---|---|
| PC2 (the no-escrow note moved over the pay figure, `pointer-events: none`, 390 media block) | 44 at 390, 59 at 360, 10 reduced motion; contrast 20 | contrast 12 figures on paint under 3:1 (the chance red it had before 7a) |
| PC3′ (the quote face's fine line moved over the quote's figure) | 6 at 390, 10 at 1280, 8 at 360 — `item-quote` at 390 and 1280 among them, which read 0 before | `text-spills` 56 a pass (the face icon's spill, chance) |
| PC3 (the face's head row moved down over the figure; rebuilt from set F) | 27 at 390 and 1280, 25 at 360; contrast 16 | "asked amount is covered" 105 a pass, the decoration sweep 175, a spill 175–189 |
| SVs (a stepper's glyph moved and scaled over the chosen line; stroke-width 3, which the look lint admits since lint-belts) | 1 at 1280; contrast 8 (`pay-several-strip` at 390, which the phone pass read none of: below its first screen, it is likely, not checked) | `LINE_SKIP_CEILING` 71 > 63 at 390, 2 figures under 3:1 |
| PQ (the code's fold summary moved over its modules) | 16 at 390; contrast 12 | none: red by 1a alone (the whole runner passed it before) |
| PWa (the Cycle card's price column `::after` moved over the figure) | 16 at 1280, 70 at the canvas, 70–86 on each other wall pass; contrast 8 | contrast: the look-pseudo frame 8, figures under 3:1 8 |
| T5 (a band in the look's ground over the Cycle figure's lower half; rebuilt) | 16 at 1280, 70 at the canvas, 58–86 on each other wall pass; contrast 8 | 4 and 4 on the hd wall; contrast: the look-pseudo frame 8, figures under 3:1 8 |
| PB (a 4.5px band through the selection total's digits) | 10 at 390, 10 at 360; contrast 6 | contrast: the look-pseudo frame 6, figures under 3:1 12 |
| PC (a centred, reversed sideways shelf) | 202 at 390, 186 at 1280, 90 at 360, 30 reduced motion; contrast 158 | `cutSideways` 1,400 / 1,372 / 616, "asked amount is covered" 924 / 924 / 224 |
| PH (every shelf cut to its first row by `overflow: hidden`) | 186 at 390 and 1280, 140 at the canvas, 128–172 on each other wall pass, 76 at 360, 6 reduced motion; contrast 152 — 1,892 of these 2,012 a point past a cutting clip (the shelf, `div.items`, the wall's strip among them, or a row card it squeezed), the rest a figure covered by the row beside it | the self-clip rule, the wall's cut-from-below rule, `LINE_SKIP_CEILING` |
| PT (a keyframe `visibility: hidden` on the quote's column, 120s later) | contrast 48 | the dress rule (above) |

### Pending for the owner at 7a, closed since

PF2 (a cover that arrives at the end of a finite animation and stays), PT2
(a keyframe on a custom property or an inherited ink on a box above a
figure) and the inherited-ink lint belt were the owner's at 7a. All three
are built since D-2026-10-26-03: "Before 8g2: money read at every keyframe
and at the end of a lasting animation", below.

The README labels are unchanged: "most" stays until step 10.

## Before 8g2: money read at every keyframe and at the end of a lasting animation (2026-10-26; the critic's third review, items 1 and 2; D-2026-10-26-03)

The owner took both of the critic's recommendations (D-2026-10-26-03). The
plants are the critic's, `PT2-var-rural.css` and `PF2-end-modern.css` in
`private/design/workshop-2026-09-23/before-8g2/critic3/plants/`; the logs
and tools of this round are in `before-8g2/pt2pf2/`.

### The held dress at every keyframe offset (PT2)

The critic's PT2: `@keyframes t-rural-ink { 25%, 68% { --s-text: transparent } }`
run on Rural's quote row `.item-a` for 100s, looping. Rural's quote figure
takes its ink from `var(--s-text)`, so it is clear from 12.5% to 84% of the
cycle (an unregistered custom property flips halfway between keyframes;
measured in Chrome). Every check passed: the dress rule read a keyframe by
the longhands it names, and this one names none; the instants read the
cover rules, not the ink; the contrast pass freezes at 400ms.

- `offsetDressFaults`, the dress rule's fifth read, after the others. Every
  animation on an element (not a pseudo-element, which nothing inherits
  from) that is a money subject, an element under it with text, or a box
  above it up to and with its stall, is seeked alone to each of its own
  keyframe offsets and to 0 and 1. For the read its timing is one normal,
  linear iteration, filled both ways, with no delay, so `offset × duration`
  is that keyframe's own value. The timing and the time are put back after.
  Every other animation stands where the pass's last instant left it.
- At each offset, every subject the animation can reach is read with the
  dress rule's own readers: it must still render (`rendersAt`); its own
  elements under the animated box are held on `OFFSET_HELD_OWN` by
  `dressHeldFault` (the ink's alpha, the fill, the stroke width, opacity,
  `visibility`, `content-visibility`, a filter, a blend, the transforms, a
  zoom, a clip-path, a mask, a text shadow); every box between it and the
  animated box is held on `BOX_HELD` by `boxHeldFault`. A failure names the
  animation, its box and the offset ("with t-rural-ink on span.item-a seeked
  to its keyframe at 25%"); one the instant's read said already is not said
  again.
- **The properties come from the `@keyframes` rule** (`keyframesDeclare`,
  read from the page's sheets, again when a sheet is added). Chrome's
  `getKeyframes()` lists no custom property for a CSS animation: PT2 reads as
  four keyframes, offsets 0, 0.25, 0.68 and 1, with no values (measured). The
  offsets come from `getKeyframes()`.
- **An animation is not seeked when its keyframes set only `SEEK_NEEDLESS`
  longhands** (`seekNeedless`): none inherited (or `visibility`, held where
  it is written), each held at its written value by `animationFaults` and
  `keyframeHeld` already (a transform and its parts, an opacity, a filter, a
  blend, a clip, a motion path, a zoom, `visibility`, a size), or reaching no
  held longhand (where a box stands, an outline; a background and a box
  shadow until the fourth review). Corrected by the fourth review, items 2
  and 3: this list named `content-visibility` as held at its written value,
  and on a box above nothing held it (`BOX_HELD` did not name it); and a
  background or a shadow reaches the ground under the glyphs, which no read
  held between instants. Both leave the list (below, "The fourth review's
  fixes"). Anything else is seeked: a custom property, an
  inherited ink or shadow, a font, a property the list does not name. On the
  clean tree that leaves the aurora's `--au-tide` and the sunburst's
  `--att-sun-angle` on the stall's root, two offsets each; every Rural tag's
  sway, every sign's swing and sweep, and the marquee are skipped. Measured
  in sessions over the desk pass's screens: 2,566 animations seeked in 3.1s
  without the skip, 206 in 0.44s with it.
- **Not read, stated**: a value between two offsets (a timing function that
  overshoots, `cubic-bezier()` with a y outside 0–1 or `linear()` with
  points outside them, can carry a value past both its keyframes); two
  animations at once; a pseudo-element's animation; at an offset, the lines,
  the spacing and an outline's ring (read at the pass's last instant alone;
  the grounds are read at an offset since the fourth review, where a seek
  changed them); an animation whose duration is not a finite time over 0.
  And the held list itself was 17 longhands copied by hand, fewer than this
  bullet's "every held longhand the value decides" (the fourth review's item
  1, PFA): derived from `DRESS_HELD` since.

Red, the whole runner (exit 1): PT2 fails `a-money-figure-is-never-misdressed`
76 times at 390, 94 at 1280, 333 at the canvas, 351 on the portrait wall,
60 on desk-wall, 78 on each of the other six wall passes and 64 at 360,
every Rural quote figure under `.item-head-q .item-a` ("an ink at alpha 0
(rgba(0, 0, 0, 0)) … with t-rural-ink on span.item-a seeked to its keyframe
at 25%"). The contrast pass stays green: it reads one frozen instant. The
critic ran PT2 green through the whole runner at ffecdc7, and 7a added no
read of it (not run again here).

### 1a at the end of a lasting animation (PF2)

The critic's PF2: a Modern quote head's own `::after` laid over every cell of
its grid, in the card's ground, `transform: scaleY(0)` until 95% of a 10s
run, then none, filled forwards. At rest (its delay zeroed, 0s), at 400ms
and at every instant (they stop at six sevenths of the longest animation)
it has no area; from 9.5s on it covers the figure and Pay for good. Every
check passed.

- `coverAtEnd`, after 1a's read at rest. On a paint with an animation that
  keeps its end (`keepsItsEnd`: a finite run longer than nothing, filled
  `forwards` or `both`; a pseudo-element's included), each such animation is
  seeked to its end time and 1a reads the paint again. Every other animation
  stands where the read at rest left it. Nothing is put back: 1a is the
  paint's last read, and the next paint throws the tree away.
- A failure says "at the end of t-modern-pf: …". Its points join the look's
  tally, so the clip ceiling reads them; it is not a paint of its own (the
  tally's `paints` is unchanged). The verdict carries `coverEnd` (reads,
  failures, and the animations seeked by name) and `coverEndMs`, a clock the
  geometry canary leaves out; the runner prints them per pass.
- **On the clean tree only the marquee pays** (`mq-run`, filled both, on a
  cut name; by name in sessions at 390, 1280 and the canvas over every page
  screen, and over the wall screens at 1024x768 and 768x1024). Reads at the
  end, per pass: 145 at 390, 70 at 1280, 31 at the canvas, 0 on the
  portrait wall, 189 on the tablet and on the tall tablet, 122 on desk-wall,
  117 on the short wall, 392 on the side tablet, 79 on the hd wall, 246 on
  the narrow wall, 236 at 360, 0 under reduced motion: 1,816, no failure.
- **The app's own one-shots, staged** (the critic's item 6). No fixture
  paints a press, so a scratch copy of `pay-several-strip` with
  `selectionEntered` and `selectionBumped` was painted in a session (not
  committed). The end read found nothing: `sel-unfold` (19 paints) and
  `sel-line-in` (38) at 390, `sel-fade` (19) and `sel-line-in` (38) at 1280,
  the tray open and the lines in place. But that paint fails two older
  reads. `keyframeHeld`: 57 failures at 390 and 57 at 1280 (`sel-unfold`
  names a size; `sel-fade` and `sel-line-in` an opacity of 0 and a shift at
  0%). And at 390 1a at rest: 38 (with its delay zeroed, `sel-unfold` stands
  at 0% at rest, the tray closed, and the total and Pay stand past
  `div.sel-tray-in`'s cutting clip). Neither is this round's; no run sees
  either, because no fixture paints a press. Both are false reds of the
  app's own entrance, for the owner. Not fixed.
- **Not read, stated**: one animation's end against another's (each lasting
  one is seeked to its end together, every other at rest); a run whose end
  is not its latest frame; and the contrast pass's one read a job, which
  stays at its frozen instant.

Red, the whole runner (exit 1): PF2 fails
`nothing-covers-money-or-a-protected-box` 53 times at 390, 73 at 1280, 109
at the canvas, 140 on the portrait wall, 91 on the tablet and on desk-wall,
100 on the short wall, the hd wall and the tall tablet, 99 on the side
tablet, 92 on the narrow wall and 29 at 360, every one "at the end of
t-modern-pf": the quote's figure (`span.item-x[seller-price]`) and its Pay
(`button.buy.pay-btn`) covered by `div.item-head.item-head-q`, the pseudo's
owner. The contrast pass stays green. The critic ran PF2 green through the
whole runner at ffecdc7, and 7a added no read of it (not run again here).

### 1a's earlier plants, on this round's code

Each alone through the whole runner, each to exit 1, with the same counts
7a's table has: PC2 44 failures of 1a at 390, 59 at 360, 10 under reduced
motion, contrast 20; PB 10 at 390, 10 at 360, contrast 6; PWa 16 at 1280,
70 at the canvas, 70 to 86 on each other wall pass, contrast 8. The end
read adds none of its own to them: a cover it finds at rest too, word for
word, is said once (`coverRead`). It said each twice until the red proofs
showed it — PC2 read 116 at 360 — and was fixed (0bbdff6).

The clean tree (0bbdff6, the timing pairs' branch runs below, and the
earlier run of the same code but the dedupe): exit 0, 0 failures on every
pass and the contrast pass.

### The inherited-ink belt

`lintLookSheet` (first party only) refuses an inherited longhand that paints
text in any keyframe (`KEYFRAME_INK`, `scripts/workshop-css.mjs`): `color`,
`text-shadow`, `caret-color`, `text-emphasis` and its longhands with their
`-webkit-` twins, `paint-order`, `font-palette`. The text's fill colour and
stroke (`-webkit-text-fill-color`, `-webkit-text-stroke*`) are refused
everywhere already (`REFUSED_PROPERTIES`; SVG `fill` and `stroke` were refused
nowhere until the fourth review's belt, below), and the tap
highlight is `transparent` everywhere. The kit is unchanged.

- Cost nil, read by the lint itself
  (`a-keyframe-never-sets-an-inherited-ink`): no first-party sheet a run
  serves sets one in a keyframe — the shipped looks, the three starters
  linted first party, the fixture look, the tracked private fixture and the
  canary — and the selected check with the private look at 0x04 (commit
  `168234a`) passes, 242 of 242. stall.css does set two (the sign's failing
  lamp, `att-hum-gutter`, and the door's pin demo), and it is no look sheet.
- New plant set `i1`, 22: 18 refused (PT2's shape with `color:
  transparent` first, then every property, a `var()`, `currentColor`, a
  pseudo-element that runs it, a media block, a stop beside an opacity) and
  4 controls. The last control, a keyframe `background-color: red` on
  `.item-a`, was accepted "a ground, which no box below inherits": true, and
  no reason the ground was harmless — the critic's PG is the same shape, a
  figure on its own ink. It is refused by the ground belt since the fourth
  review (`i1:21`, below). Five older plants moved with the belt: `g1:130` (`color: red`
  in the sheet's own keyframe, run on `.item-a`) was accepted and is
  refused; `f2:18`, `g1:131`, `g1:139` and `h1:9` are refused by the belt as
  well. 1,222 plants: 924 refused, 298 accepted.
- Red by mutation: the belt switched off, 5 tests fail (the new describe's
  refusals and the `f2`, `g1`, `h1` and `i1` sets); `text-shadow` and
  `caret-color` dropped from its list, 3 fail.

### Cost

Two pairs back to back on this Mac, main (c1f3e97) then the branch
(0bbdff6), two tabs, the tracked fixture carried (796 contrast jobs), no
other probe running:

| Pair | Main | Branch | Load (main, then the branch) |
|---|---|---|---|
| 1 | 246.5s | 263.3s | 4.6 → 4.0, then 4.0 → 3.3 |
| 2 | 246.9s | 263.4s | 3.3 → 3.1, then 3.1 → 3.8 |

The branch is +16.8s and +16.5s: its geometry walk 103.0 → 137.0s and
103.8 → 135.0s, its contrast pass 134.5 → 117.9s and 134.6 → 119.9s (the
horizon's worst pruned, 1f44e05; this round adds nothing to the contrast
pass). 7a's own pairs read the branch +11.3s and +9.8s over main, the walk
+25.0s and +23.5s, so this round is about +5 to +7s of wall time, +7 to
+10s of the walk; one pair of this round against 7a was not run. The two
reads' own page time, summed over the geometry passes: the end read 8.0s
and 8.1s (1,816 reads), the keyframe offsets 4.15s and 4.16s (1,520
animations, 3,040 seeks, 17,124 figure reads). 36.6s stand under the 300s
ceiling.

**A prune, if one is needed, not built**: every end read on the clean tree is
the marquee's, so a by-value exception for it (a transform alone, inside a
cell that clips and holds no asked node) would take back most of the 8s of
page time, at the cost of an exception 1a would then have to hold.

The README labels are unchanged: "most" stays until step 10.

## Before 8g2: the fourth review's fixes (2026-10-26; CRITIC-4, D-2026-10-26-04)

The critic's fourth review on before-8g2 (`private/design/workshop-2026-09-23/before-8g2/CRITIC-4.md`,
its plants in `critic4/plants/`). The plants, logs and tools of this round
are in `before-8g2/critic4-fixes/`. Every run is the whole runner, two tabs,
the tracked fixture carried (796 contrast jobs), each plant alone, the load
in each log's `.meta`.

### The held list is `DRESS_HELD` less the geometry (item 1: PFA; item 3: PCV)

- `OFFSET_HELD_OWN`, the longhands the offset read holds a figure's own
  elements on, was 17 copied by hand under a docblock that said "every
  longhand `dressHeldFault` decides from the value alone". It is
  `DRESS_HELD` less `OFFSET_GEOMETRY` (the spacing, the grounds, an outline,
  the decoration line with its thickness and offset, `animation-name`),
  derived in code. `the-keyframe-offset-read-holds-every-held-longhand-the-value-decides`
  (`layout/offsetHeld.test.ts`) parses `DRESS_HELD`, `OFFSET_GEOMETRY` and
  `dressHeldFault`'s cases out of the probe strictly: every held longhand
  has a case, and `OFFSET_GEOMETRY` is exactly the held longhands whose case
  answers nothing.
- `content-visibility` leaves `SEEK_NEEDLESS`, whose docblock called it
  "held at its written value" while `BOX_HELD` did not name it. `BOX_HELD`
  holds it now, at rest and at its written value in a keyframe: a box above
  that skips its contents does not render the figure, and one that skips them
  off-screen (`auto`) is size- and paint-contained there, which `contain`
  does not report and no clip read sees. No served sheet and no app code
  sets it.
- **Red, PFA** (the critic's, `font-size-adjust: 0.05` from 25% to 68% of a
  100s loop on Rural's quote `.item-a`; exit 0 on the whole runner before):
  exit 1, `a-money-figure-is-never-misdressed` 76 times at 390, 94 at 1280,
  333 at the canvas, 351 on the portrait wall, 60 on desk-wall, 78 on each of
  the six other wall passes and 64 at 360, every one from the offset read
  ("it: font-size-adjust 0.05 … with t-rural-adjust on span.item-a seeked to
  its keyframe at 25%"; the pass lines' offset faults equal the failures).
  Nothing else failed. PT2's own counts, exactly.
- **Red, PCV** (the critic's, `content-visibility: hidden` on `.item-a`, red
  before only by accident): exit 1, the dress rule 76 / 94 / 333 / 351 / 78
  on the tablet / 60 / 78 / 78 / 78 / 78 / 78 / 64, each failure carrying
  the offset read's "it has no box, with t-rural-cv on span.item-a seeked to
  its keyframe at 25%" (`rendersAt` at the seek) beside the box read's
  "content-visibility hidden" at rest's keyframe values and at the seek: 152
  offset faults at 390, two a figure. Beside them, the accidental reds stay
  (text escapes its clip 258 at 390, a protected box cut sideways 30, and so
  on: the size containment collapsing the box at the six instants).
- **PCVcis** (the same keyframe with `contain-intrinsic-size: auto 240px auto
  48px` on `.item-a`, CRITIC-4's "not verified"): red too, the dress rule's
  counts exactly PCV's, and the accidental reds change shape and do not go
  (`text-spills` 96 and a name column collapsed 48 at 390, text escapes its
  clip 111 at 1280): a fixed intrinsic size is not the box's own, so the
  instants still read a box of another size. Whether a plant that gave each
  box its exact size would pass every older rule was not tried; the offset
  read and the box read each fail it either way.
- **PT2 again**: 76 / 94 / 333 / 351 / 60 / 78 ×6 / 64, unchanged.

### The ground at an offset (item 2: PG)

- **Probe**: `background-color`, `background-image` and `box-shadow` leave
  `SEEK_NEEDLESS`. At each offset, where the seek changed a ground or an ink
  on a figure's walk (its own elements under the animated box, and the
  boxes from its parent up to that box; `GROUND_SIGNATURE` against the
  pass's last instant), the ground under each own element's glyphs is read
  again (`offsetGroundFaults`, `groundStackFault` with its paints read
  fresh). A box above is compared without its background image, which the
  ground read does not read there. An animation that sets only grounds,
  shadows and `SEEK_NEEDLESS` longhands is read for the ground alone
  (`GROUND_ONLY`); one that sets only an outer shadow, as `getKeyframes()`
  resolves it (its `var()`s substituted, measured in Chrome), on a box every
  figure it reaches stands inside with a quarter of its size to spare, is not
  seeked (`outerShadowOnly`).
- **Cost of the first version**: with neither narrowing, every Neo row
  head's card pulse was seeked and every seek of the aurora's tide read the
  ground again (the root's gradient changed): the offset read took 1.87s at
  390 against 0.44s at d19f1ff (657 animations, 3,661 grounds read again),
  14.4s over the geometry passes against 3.7s in the critic's clean run at
  d19f1ff (`clean2.c2-first.log`, exit 0, 262.5s). Narrowed (`clean3.log`,
  exit 0, 256.3s, load 2.1 → 4.9): 0.67s at 390 (177 animations, 3 grounds
  read again) and 6.2s over the passes — the held list's 43 longhands where
  it held 17, and the door button's breathing seeked, single runs under
  load 2–5.
- **Red, PG** (the critic's; exit 0 before): exit 1, the dress rule 76 / 94 /
  333 / 351 / 78 / 60 / 78 ×5 / 64, every Rural quote figure, "the ground
  under its glyphs (span.item-a's ground) reads at 1.00:1 on its ink … with
  t-rural-ground on span.item-a seeked to its keyframe at 25%". The same
  counts on the first version and on the narrowed one.
- **Red, PGv** (new: the ground fed through a custom property,
  `--t-rural-g`, which the `.item-a` reads as its background; the keyframe
  names no ground) and **PGs** (new: an inset shadow in the figure's ink):
  each exit 1 with PG's counts, on the first version. Both stay seeked on the
  narrowed one (a custom property; an inset layer), not re-run there.
- **Lint, first party only** (D-2026-10-26-04 (a)): `KEYFRAME_GROUND`, a
  background's colour or image, the shorthand and a box shadow, refused in
  any keyframe (`a-keyframe-never-sets-a-ground-or-a-shadow`). New plant set
  `j1`, 16 (13 refused, PG's shape first; 3 controls); `i1:21`, the ink
  belt's last control, moved to refused, its reason ("a ground, which no box
  below inherits") true and beside the point (item 5(c)); `b1:78` and
  `f2:19` refused by the belt as well. Red by mutation: the belt off, 5
  tests fail.

### A code is drawn black on white (item 4: PFQ)

- **Probe**, every geometry pass, no pixels (`a-code-is-drawn-black-on-white`):
  every `svg.qr` a paint shows is the shape `qrSvg` draws — a rect at 0,0 the
  size of its viewBox, then one path of `M c r h1v1h-1z` squares, its
  computed `d` the same squares (Chrome serialises them `M c r H c+1 V r+1 H
  c Z`, measured) — and computes the rect `rgb(255, 255, 255)` and the path
  `rgb(0, 0, 0)`, each at a fill opacity of 1 with no stroke, the svg, the
  rect and the path at opacity 1, visible, displayed, with no filter, mask,
  clip-path, blend or transform (it read `mask-image` alone, and not
  `content-visibility`: the fifth review's PQC and PQM, below, "A code drawn
  as nothing"). Owed per look (`qrColourByClass`: painted,
  counted where the codes are listed, and read); the pass line prints them.
  On the clean tree 35 / 78 / 122 / 130 … codes a look a pass, 0 failures.
- **Red, PFQ** (the critic's, `.t-modern .qr path { fill: #fff }`; exit 0
  before): exit 1, every Modern code: 35 at 390, 78 at 1280, 122 at the
  canvas, 130 on the portrait wall and on each wall pass but desk-wall's 97,
  29 at 360, 5 and 3 under reduced motion ("pay-qr: its modules are filled
  rgb(255, 255, 255), not black"). Nothing else failed.
- **Lint, first party only** (D-2026-10-26-04 (b)): `fill`, `stroke` and every
  `fill-*` and `stroke-*` longhand only on a rule whose every selector's
  subject is the `.ic` svg or a shape under it by a descendant or child
  combinator (`isIconRule`, `svg-paint-stands-only-on-a-drawn-icon`); never
  in a keyframe. New plant set `k1`, 20 (14 refused, PFQ's first; 6
  controls). Sixteen older plants moved: the `g1` stroke-cap plants and
  `f2:5` set a stroke on `.item-caret`, a drawn icon whose rule does not say
  `.ic` (five of them the cap's accepted controls), and `f1:35` a fill and a
  stroke on a pseudo-element. 1,258 plants: 958 refused, 300 accepted. Red by
  two mutations (the belt off; every rule taken as an icon's), 5 tests each.
- **Not read, stated**: a box above the code (the cover rules' and the
  quiet zone's), the code's size, the pixels (the quiet-zone read's, on the
  contrast jobs).

### Statements (item 5) and the one-shots (item 6)

- The 1a docblock and 7a's "Not read" said "over time, a cover that takes no
  hit is read by nothing but …" as if over time were read for every money
  node: over time no hit test asks any money node but the price and "You
  pay" (`coveredBy`); every other money node and protected box is asked at
  rest, and at the end of a lasting animation. Both say so now.
- "The fill colour and the stroke are refused everywhere" (CLAUDE.md §6, the
  `KEYFRAME_INK` docblock, the ink belt's section above) names
  `-webkit-text-fill-color` and the `-webkit-text-stroke` family now; SVG
  `fill` and `stroke` were refused nowhere until the belt above.
- **The app's one-shot entrance, for the day a fixture paints a press**: a
  strip painted with `selectionEntered` fails `keyframeHeld` (57 at 390 and
  at 1280) and 1a at rest (38 at 390) on the app's own `sel-unfold`,
  `sel-fade` and `sel-line-in` (above, "1a at the end of a lasting
  animation"). No fixture paints a press. Such a fixture must land with a
  read of the entrance at its end. Not fixed.

### The end read's prune (the cost item's first prune)

Every end read on the clean tree, 1,816 over the geometry passes, none
failing, was the marquee's run: a transform on a name's run (`mq-run`) inside
the name's clipping cell (`[data-mq]`). Such an animation's end moves paint
inside that cell alone, and a hit test there answers the cell's own subtree,
so where the cell meets nothing 1a asks the end read reads what the read at
rest read. This section called it "no loss"; it was not: a box that computes
a clip and clips nothing was taken for the clip (the fifth review's PFCd3,
below, "The prune's clip test").

- `endMoot`, general, naming no class: an animation is moot when its
  keyframes set only `transform`, `rotate`, `scale` or `translate`
  (`END_MOOT_PROPS`, read as the offset read reads them, `keyframeProps`);
  its box, or a pseudo-element's owner, holds no node 1a asked; it stands
  inside a box that clips both ways (an `overflow` but `visible` each way, or
  a painting `contain`), no box between, itself included, absolutely or fixed
  positioned; and that box (its border box, grown by its
  `overflow-clip-margin` where it clips by `clip`) meets no box and no point
  1a asked at rest (`coverAsked`, recorded by `coverOf` as it asks: each
  node's rects and every point it asks). A paint whose every lasting
  animation is moot is not read at its end and is counted
  (`coverEnd.skipped`); the pass line prints it.
- **The clean tree** (`clean4.log`, exit 0, 243.6s, load 3.7 → 4.7): 1,655
  paints left out, 161 still read (33 at 390, 14 on the side tablet, 24 on
  the narrow wall, 90 at 360: a marquee whose cell meets a box or a point 1a
  asks; not traced which), 0 failures. The end read's page time 0.97s over
  the geometry passes against 7.35s in this session's run before it
  (`clean3.log`), and the geometry walk 119.8s against 127.8s (single runs).
- **Red, PF2 again**: 53 / 73 / 109 / 140 / 91 / 91 / 100 / 99 / 100 / 100 / 92
  / 29, every one "at the end of t-modern-pf", the counts of the round that
  built the read.
- **Red, PFC** (new: PF2 with its quote head clipping its own content,
  `overflow: hidden`, so the pseudo stands inside a box that clips both ways
  and holds the figure and Pay): exit 1, PF2's counts exactly, "at the end of
  t-modern-pfc". With the prune made to ignore what the clip meets (a
  mutation in the plant tree, not committed) PFC stays red with the same
  counts: its owner holds the figure, so the owner check keeps it read
  before the clip is asked. It proves that check, not the clip's.
- **Red, PFCb** (new, for the clip check: the quote head clips its own
  content, and its name column `.item-b`, an element that holds no money,
  stands still until 95% of a 10s run and then grows three times and moves
  right, filled forwards; nothing covers anything at rest or at an instant):
  exit 1, 53 at 390, 73 at 1280, 71 at the canvas, 102 on the portrait wall,
  46 on the tablet, 86 on desk-wall, 95 on the short wall and the hd wall, 90
  on the side tablet, 48 on the tall tablet, 38 on the narrow wall and 29 at
  360, every one "at the end of t-modern-pfcb" (the quote's figure covered by
  the name's button). **With the prune made to ignore what the clip meets,
  the whole runner passes PFCb** (exit 0, 252.0s): the clip check is all that
  keeps it read, and nothing else in the runner reads it.

### Cost of the round

Two pairs back to back on this Mac, main (c1f3e97) then the branch
(bbb0bd5), two tabs, the tracked fixture carried (796 contrast jobs), no
other probe running:

| Pair | Main | Branch | Load (main, then the branch) |
|---|---|---|---|
| 1 | 235.9s | 248.2s | 2.4 → 5.4, then 5.4 → 3.3 |
| 2 | 237.6s | 253.2s | 3.3 → 3.4, then 3.4 → 6.4 |

The branch is +12.3s and +15.6s (median 236.8s against 250.7s): its
geometry walk 94.5 → 124.3s and 97.6 → 127.3s, its contrast pass 132.5 →
115.8s and 131.7 → 117.4s. The round before measured the branch +16.8s and
+16.5s over main; this round adds the longer held list, the ground and code
reads and takes the end read back (7.35s → 0.97s of page time, single runs),
for about 2s of wall time less than before. 47–52s stand under the 300s
ceiling.

## Before 8g2: the fifth review's fixes (2026-10-26; CRITIC-5)

The critic's fifth review on before-8g2 (`private/design/workshop-2026-09-23/before-8g2/CRITIC-5.md`,
its plants in `critic5/plants/`), decided by the window on the critic's
recommendations. The plants, logs and tools of this round are in
`before-8g2/critic5-fixes/`. Every run is the whole runner, two tabs, the
tracked fixture carried, each plant alone, the load in each log's `.meta`.

### The prune's clip test (item 1: PFCd, PFCd2, PFCd3)

- `endMoot` took a box for the clip when its computed `overflow` (but
  `visible` each way) or its `contain` said so. A box with `display:
  contents`, or a non-replaced inline box, computes `overflow: hidden` and
  clips nothing, and its rect is 0×0 at the origin, or its line: it "met
  nothing asked". The critic's PFCd3 (the quote head's labels line,
  `.item-labels`, made `display: contents; overflow: hidden`, off the wall;
  its rail label, an inline-block that holds no money, translated over the
  quote's figure and Pay at 95–100% of a 10s run, filled forwards; the
  first-party look lint admits it) passed the whole runner, and with the
  prune forced off it failed 16 at 390 and 13 at 360.
- Measured in headless Chrome 156 before the fix, a child
  translated 300px past a 100×40 box and hit-tested where it was painted,
  under `overflow: hidden`, `overflow: clip` and `contain: paint` alike: the
  box clips it under `block`, `inline-block`, `flex`, `inline-flex`, `grid`,
  `inline-grid`, `flow-root`, `list-item`, `table`, `inline-table`,
  `table-caption` and `table-cell`, and does not under `inline`, `contents`,
  `ruby`, `ruby-text`, `table-row`, `table-row-group`, `table-header-group`
  and `table-footer-group` (a `table-column` holds nothing). A table cell
  clips: the critic's "not a table-internal box" is narrowed to the internal
  boxes that do not.
- The fix: a box counts as the clip only when it can (`boxClips`): an HTML
  element of a listed display (`CLIPPING_DISPLAYS`; a display not listed
  fails closed) whose border box is not empty. A box that computes a clip
  and clips nothing is passed over, and the walk goes on to the box above
  (for PFCd3, the quote's row card, which holds the figure). Beside it, by
  reading and not planted: nothing under the animated box, nor a `::before`
  or `::after` of it or of an element under it, may be absolutely or fixed
  positioned, whose containing block could stand outside the clip once a
  transform ends at `none`.

### The self-clip read at each offset (item 3: PTI; D (2)(a))

- PTI (the critic's: the pay sheet's `.pay-x-n` at `width: 100%; min-width:
  0; overflow-x: clip` at rest, which cuts nothing, and a keyframe
  `text-indent: 2400px` from 25% to 68% of a 100s loop; the first-party look
  lint admits it) passed the whole runner: the offset read seeked it and
  held `text-indent` negative-only, and the self-clip rule
  (`a-money-figure-never-clips-itself`) read at the pass's last instant
  alone, where the indent is 0. At 30% the figure's text stood at x
  2429–2528 against a box at 29–361.
- The decision (D (2)(a)): run the self-clip read at each offset; hold no
  indent, padding, margin or spacing still, and add no lint. At every offset
  the offset read seeks, for every money figure on the animation's walk
  (`MONEY_FIGURES`, read where the rule reads it: painted, off the door's
  deck, out of a running ticker ribbon), the rule's own read
  (`selfClipSentences`, `cutFromItsSurface` and the sideways read, taken out
  of `moneySelfClipFaults` so the two cannot drift) is made again. A figure
  the rule found cut at the last instant is not read again
  (`selfClipCutNow`); one cut at an offset is said once, at its first
  offset, under the rule's name, with the animation, its box and the offset.
  The pass line counts the reads (`self-clip read(s)`).
- Seeked for it: `left`, `top`, `right` and `bottom` leave `SEEK_NEEDLESS`
  (nothing held them; a relatively positioned box moved by them carries the
  figure inside a clip as an indent or a margin does), and a size is seeked
  where the animated box is one of a figure's own elements (`SEEK_ON_OWN`; on
  a box above, `keyframeHeld` refuses any keyframe naming a size, so it stays
  needless there). No shipped keyframe sets an offset or a size on a box on a
  figure's walk (the beetle's `left` and `bottom` run on no box above money).

### A moving background on the figure's own layer (item 4: PGpos)

- PGpos (the critic's: Rural's quote `.item-x` takes `var(--s-text)`, its
  own ink, as its background colour under one opaque tile of `var(--s-bg)`
  that covers its box, and a keyframe sets `background-position: 0 -400px`
  from 25% to 68% of a 100s loop, the figure on its own ink there; the
  first-party look lint admits it, `KEYFRAME_GROUND` naming neither the
  position nor the size) passed the whole runner (268s, load 4.9): the
  animation was never seeked, `background-position` and `background-size`
  being `SEEK_NEEDLESS`, though the figure's own `GROUND_SIGNATURE` already
  holds both. The same paint at rest failed 28 times at 1.00:1.
- The fix: the four longhands (`background-position`, its `-x` and `-y`, and
  `background-size`) are seeked where the animated box is the figure or one
  of its own elements (`SEEK_ON_OWN`), and read for the ground alone there
  (`GROUND_ONLY` names them: they change a paint and no held longhand). On a
  box above they stay needless: the ground read does not read a box above's
  background image. On the clean tree no keyframe sets either on a figure's
  own element: Modern's two sweeps run on the sign (`.stall-head`) and on
  `.sparse-motif`, Neo's sheen and the Pinstripe run on boxes above
  (`.item-head`, `.item`), and the rain, the aurora and the confetti on the
  stall's root.

### Masks on a box above, at a keyframe (item 5: PMk)

- PMk (the critic's: a keyframe sets `mask-image: linear-gradient(#0000,
  #0000)` on Rural's quote `.item-a`, a box above the figure, from 25% to 68%
  of a 100s loop; the first-party look lint refuses a file's mask in a
  keyframe, not a gradient's) passed the whole runner (254s): the animation
  was seeked, and the offset read held the boxes above on `BOX_HELD`, which
  named no mask; `boxFaults` held a keyframe on a box above at its written
  value for a clip-path, a size and `BOX_HELD` alone. The same mask at rest
  failed 28 times (read 4., `clipCut`: any mask above the figure).
- The fix: the four mask sources read 4. holds at rest (`mask-image`,
  `-webkit-mask-image`, `mask-border-source`, `-webkit-mask-box-image-source`)
  join `BOX_HELD`, so `boxFaults` holds them at every keyframe's written value
  and the offset read at every offset, and `boxHeldFault` fails any mask
  there, as 4. does at rest. At rest the box read leaves them to 4.
  (`BOX_HELD_AT_REST`), which says a mask above once.

### A code drawn as nothing (items 2, 6 and 10: PQC, PQM; G4's twin)

- PQC (the critic's: `.t-modern .qr { content-visibility: hidden }` at rest;
  the first-party look lint admits it) passed the whole runner (251s): every
  Modern code collapsed to a white strip about 336×20, its rect and path
  skipped and its box and its hits kept. The hold read the svg, the rect and
  the path for opacity, visibility, display, a filter, `mask-image`, a
  clip-path, a blend and a transform, and not `content-visibility`; 1a hit
  the svg itself; the pay code's width gate saw 336 ≥ 308; the quiet zone
  read the collapsed box. PQM (a `-webkit-mask-box-image` on the code, its
  "twin" `mask-box-image` beside it, which nothing reads) was red only
  through the quiet-zone read, 31 failures where the backing is not white;
  the bare pay, studio and record codes passed, and the hold's docblock and
  CLAUDE.md said "no mask".
- The hold now reads, on the svg, the rect and the path,
  `content-visibility` (visible only) and every mask source (`QR_NONE`:
  `mask-image` and its `-webkit-` twin, `mask-border-source`,
  `-webkit-mask-box-image-source` and `-webkit-mask-box-image`), and holds
  the svg's box square, its width and height within a pixel.
- **The per-screen owe** (item 10: the per-look owe compared the codes a
  look painted with the codes it read under one filter, so a look that took a
  code's box away owed nothing for it): the page counts, per screen, look and
  number of codes the app built in the tree, the fewest and most codes with
  a box any paint of it showed (`qrByScreen`), and the coverage names a look
  that painted fewer of the codes it built on a screen than another look
  that built as many did there (`probe-coverage.mjs`); a report with no such
  count owes one. Compared over the codes built because the app does not
  build the same codes for every look: the name sheet composes no record,
  and so draws no code, for a paid look's try-on — the first version, which
  compared every look on a screen, failed the clean tree's desk pass on
  `publish-name` (the tracked fixture, a paid look, built none where Modern
  built one). On the clean tree's 82 screens at 390 every look built and
  painted as many as every other (a quick read, the fixture not carried).
- **G4's twin** (the side finding to item 6): in a first-party sheet the
  twin a prefixed property stands beside is a property (`PREFIXED_TWINS`):
  every `-webkit-` property headless Chrome 156 lists whose name less the
  prefix it neither lists nor reads (`CSS.supports`), 67 once the two every
  engine reads under the prefix are left out, maps to its real twin at the
  same value — the mask border's `mask-border` family, the logical box sides
  and sizes — or to none, and is then refused outright. A prefixed property
  Chrome does not list (Safari's `-webkit-backdrop-filter`, a `-moz-` one)
  keeps the name less its prefix as its twin, not held to exist. The kit
  keeps the plain rule its README states. New plant set `l1`, 9 (five
  refused, PQM's shape first; four accepted: the mask border beside
  `mask-border`, a logical twin, `-webkit-backdrop-filter`, and the `-moz-`
  gap); three older plants move (`f1:11`, `f1:33`, `f1:34`, refused before
  for a twin nothing reads as well as for their host's paint, and for their
  host's paint alone now). 1,267 plants: 963 refused, 304 accepted.

### Pins and statements (items 7–10)

- **The offset read's loops are pinned whole** (item 8): the critic changed
  the held loop to `OFFSET_HELD_OWN.filter(p => p !== 'font-size-adjust' &&
  p !== 'text-indent')` and `layout/offsetHeld.test.ts` stayed green, 5 of
  5: it pinned the list's definition, not its use. It now holds the three
  loops the read asks at each offset as written (`OFFSET_HELD_OWN` through
  `dressHeldFault`, the rest against the reference, `BOX_HELD` through
  `boxHeldFault`), and each list asked once in `offsetDressFaults`. Red by
  the critic's mutation and by a `continue` on `text-indent` inside the
  loop's body, 1 of 6 failing each; green restored.
- **The rest at an offset** (item 9): the dress rule compared the longhands
  no family frees and none holds (`dressReadList().rest`, `text-fit` alone
  in Chrome 156) with the untouched reference at rest alone; the offset read
  compares them at each offset too, a fault said once and not where the rest
  read said it. Cost: one read of one longhand per own element per seek.
- **The per-screen code owe** (item 10): above, "A code drawn as nothing".
- **Statements** (item 7): "no loss" (the prune, above); the code hold's "no
  … mask … visible, displayed" (above); PLAN § Open's fourth list, item 7,
  keeps its outline half (a `line-through` in a keyframe on a box above is
  read since `4264938`, `-webkit-text-decorations-in-effect`; the critic's
  PLT is red at 390, 28), and items 4 and 5 say what the self-clip read at an
  offset now reads of them; CLAUDE.md §6's ground belt said "a background
  that moves or grows stays … the probe reads the ground at every keyframe
  offset", which PGpos showed false (it says now where it is read, and
  where not); and the money size lint's "not named" reasons said `opacity`
  and `clip-path` in a keyframe are "read at one frozen instant", which the
  dress rule's keyframe reads and the offset read made stale (refreshed in
  `scripts/workshop-css.mjs`, CLAUDE.md §6 and the state belt's section
  here, with what the offset read now reads of the width-moving names).
  The `j1` controls' reasons for a moving and a growing background say the
  same.

### Red proofs, the whole runner, each plant alone

Counts per pass, in this order where a pass is not named: 390 / 1280 / canvas
/ portrait / tablet / desk-wall / short-wall / side-tablet / hd-wall /
tall-tablet / narrow-wall / 360. The load is in each log's `.meta`.

- **On the prune's fix** (`90e727e`): **PFCd3** (exit 0 before) exit 1, 1a 16
  at 390 and 13 at 360, every one "at the end of t-modern-pfcd3" (the
  quote's figure and Pay covered by the rail label): the critic's counts
  with the prune forced off. **PFCd2** (exit 0 before) exit 1, 37 at 390, 10
  at 1280, 20 at 360. **PFCd** exit 1, 37 at 390, 22 at 1280, 49 on the
  canvas, 58 on desk-wall, 51 on the short wall, 45 on the side tablet, 51
  on the hd wall, 4 on the narrow wall, 20 at 360. **PFC** and **PF2** 53 /
  73 / 109 / 140 / 91 / 91 / 100 / 99 / 100 / 100 / 92 / 29 and **PFCb** 53 /
  73 / 71 / 102 / 46 / 86 / 95 / 90 / 95 / 48 / 38 / 29, the round before's
  counts exactly.
- **On the self-clip read at each offset** (`a697f1a`, the four commits
  before the owe's fix): **PTI** (exit 0 before) exit 1, the self-clip rule
  23 at 390, 23 at 1280, 23 at 360, every one "seeked to its keyframe at
  25%". Three plants of the class built for this round, each holding its
  value from 30% to 40% of a 100s loop, between the instants at 28.6s and
  42.9s, so no instant read sees it (a quick read of three pay screens at
  390 read each 0 at `a9f4d39`): **PTM** (a margin carrying the figure out
  of its row's clip) 29 / 29 / 29, **PTP** (the row's padding) 29 / 29 / 29,
  **PTL** (a 300px letter-spacing, which the first-party lint refuses in a
  keyframe: the kit's road) 23 / 23 / 23; each from the offset read alone.
  The first versions of PTM and PTP, held from 25% to 68% as PTI is, were
  red through the instants as well (a protected box cut sideways, and a spill, at 71.4s; a quick read at 390, its log not kept).
- **On the moving background**: **PGpos** (exit 0 before) exit 1, the dress
  rule 76 / 94 / 333 / 351 / 78 / 60 / 78 ×5 / 64, every one "the ground under
  its glyphs … reads at 1.00:1 … with t-rural-gpos on span.item-x seeked to
  its keyframe at 25%": PT2's and PG's counts.
- **On masks above at an offset**: **PMk** (exit 0 before) exit 1, the same
  counts, "span.item-a above it: a mask (mask-image linear-gradient(…)) … at
  25% of t-rural-mask" from the box read's keyframe values, and the offset
  read's beside it.
- **On the code hold**: **PQC** (exit 0 before) exit 1, every Modern code:
  35 / 78 / 122 / 130 / 130 / 97 / 130 ×5 / 29, and 5 and 3 under reduced
  motion ("it: content-visibility hidden, which skips what it holds"); the
  quiet-zone read still reads none of it. **PQM** exit 1, the hold with the
  same counts ("-webkit-mask-box-image-source linear-gradient(…)"), and the
  quiet zone's 31 as before. **PQD** (new: `display: none` on every Modern
  code) exit 1, 1a's "svg has no box" 45 / 45 / 25 and 15 and 3 under reduced
  motion, 46 on the contrast pass, and the per-screen owe beside them on its
  pass lines (72 lines, "counted 0 code(s) with a box a t-modern stall painted
  on pay, of the 1 it built, where a t-fixture-private stall painted 1"): the
  owe is a belt beside 1a here.
- **On the rest at an offset** (`11287d0`): **PTF3** (the critic's: a
  keyframe `text-fit: shrink` and `text-indent: 2400px` on the pay figure,
  which clips sideways) exit 1, 52 at 390, 1280 and 360: the dress rule 29
  ("it computes text-fit shrink, which no rule lets a look dress … seeked to
  its keyframe at 25%") and the self-clip rule 23. **PTFr** (new: `text-fit:
  shrink` alone from 30% to 40%, which changes nothing a reader sees) 6 on
  three pay screens at 390, a quick read, the rest's compare alone.
- **The clean tree** (`11287d0`): exit 0, 244.7s, 0 failures. The end read
  161 paints read, 1,655 left out, as before the prune's fix (no paint the
  fix passes over meets the clean tree). The offset read: 1,542 animations,
  3,106 seeks, 17,190 figure reads and 17,124 self-clip reads, 6.57s of page
  time summed over the geometry passes, against 5.67s on the prune's fix
  alone (`90e727e`): the self-clip read, the rest's compare and the masks
  above cost 0.9s of page time on two tabs. No clean-tree animation sets an
  offset, a size or a background's position or size on a box the offset read
  reads newly (the same animations and seeks on both trees).
- **A false red the round made and took back**: the first per-screen code
  owe compared every look on a screen, and the clean run at `a697f1a` failed
  the desk pass on `publish-name` (the tracked fixture, a paid look, built no
  code where Modern built one). It compares the looks that built as many
  codes now (`abb403d`).

### Cost of the round

Two pairs back to back on this Mac, main (`c1f3e97`) then the branch
(`11287d0`), two tabs, the tracked fixture carried (796 contrast jobs), no
other probe running, each run started once the one-minute load was under 2.5
(or after three minutes):

| Pair | Main | Branch | Load at start (main, the branch) |
|---|---|---|---|
| 1 | 232.4s | 243.2s | 2.38, 2.44 |
| 2 | 223.1s | 240.2s | 1.27, 2.37 |

The branch is +10.8s and +17.1s (median 227.8s against 241.7s): its geometry
walk 93.0 → 120.4s and 87.2 → 117.6s, its contrast pass 130.7 → 115.0s and
128.7 → 114.9s. The round's own reads cost little: the offset read's page
time, summed over the geometry passes on two tabs, went from 5.67s on the
prune's fix alone to 6.57s with the self-clip read, the rest's compare and the
masks above (6.44–6.57s over three runs), the end read's from 0.99s to
1.07–1.43s (the same 161 paints read); the round before measured
the branch +10.3s (the critic's matched pair) and +12.3s and +15.6s (the
builder's). 57–60s stand under the 300s ceiling.

## Before 8g2: the sixth review's fixes (2026-10-27; CRITIC-6)

The critic's sixth review on before-8g2 (`private/design/workshop-2026-09-23/before-8g2/CRITIC-6.md`,
its plants in `critic6/plants/`), decided by the window on the critic's
recommendations: every item a probe read or a statement, no new look
restriction. The plants, logs and tools of this round are in
`before-8g2/critic6-fixes/`. A whole-runner count is the whole runner, two
tabs, the tracked fixture carried, each plant alone, the load in each log's
`.meta`; a quick read is one probe page at one size over named screens (or
all of them), its log opening with an uptime line.

### Where a code's modules land (item 1: PQP)

- PQP (the critic's: `.t-modern .qr path { offset-path: ray(0deg);
  offset-distance: 400px }`; the first-party look lint admits it) passed the
  whole runner (250s): every Modern code painted as its white square, the
  path carried off the svg, which clips it, while its computed `transform`
  stayed `none`. The hold read a list of properties (`QR_NONE`), and not
  `offset-path`; 1a hit the white rect, the code's own; the square check,
  the per-screen owe and the quiet zone all held.
- The fix: `offset-path` joins `QR_NONE`, and the hold reads where the
  modules land (`qrPlaceFault`): the path's `d` must span the matrix its
  viewBox and `qrSvg`'s quiet zone make (`QR_SVG_QUIET_MODULES`, exported by
  `render.ts`, which draws the code with it), and on screen the path's box
  must stand inside the svg's box and on that matrix area of the square the
  svg draws into (its content box, letterboxed `xMidYMid meet`, as the
  quiet-zone read reads it), each edge within a pixel. Where a box above the
  code is turned, scaled, moved or on a motion path, those are held off for
  the read through the CSSOM (`QR_FRAME_HELD`, `withHeldOff`, the mechanism
  `withTransformsHeldOff` uses). The svg's own transforms are held `none` by
  the list before the place is read.
- Proved two ways. **PQP** whole runner, exit 1, the hold alone: 35 / 78 /
  122 / 130 / 130 / 97 / 130 ×5 / 29, and 5 and 3 under reduced motion
  ("its modules: offset-path ray(0deg)"), PQC's counts. With `offset-path`
  taken out of `QR_NONE` (a quick read at 390, all 82 screens), the place
  read alone failed the same 35 ("its modules stand at 58,-1609 275×275,
  outside its own box at 27,748 336×336, which clips them"). **PQPs** (new:
  the same motion path, `ray(90deg)` at `offset-distance: 2px`, two of the
  path's own units: the modules 10px right, inside the svg's box and off
  its matrix), with `offset-path` out of the list, a quick read at 390: 35
  ("10.4px off the matrix at 58,779 275×275 that its viewBox and quiet zone
  put them in"). The clean tree read 0 at 390, 1280 and on the canvas
  (quick reads of every screen).

### A keyframe off the figure's walk (item 2 and P1-a: PSQ2)

- PSQ2 (the critic's: at desk width `.pay-x` nowrap, `.pay-x-n` at
  `min-width: 0; overflow-x: clip`, whole at rest; a keyframe
  `margin-inline-start: calc(100% - 70px)` on its unit sibling `.item-u`
  from 30% to 40% of a 100s loop; at 35% 62px of "5,250" cut; the
  first-party look lint admits it) passed the whole runner (244s): the
  offset read seeked only animations on a figure's walk (its own elements
  and the boxes above it), and the money size lint's docblock and CLAUDE.md
  said the probe reads what a keyframe margin does to a money figure.
- The fix (the window's 2b): every animation, a pseudo-element's included,
  whose keyframes set a longhand that can move a box other than its own is
  seeked at its keyframe offsets, and the self-clip read is made there for
  every money figure on the paint (`movesOtherBoxes`, read from the
  `@keyframes` rule as the offset read reads it). The list of longhands that
  move no other box with no anchor to follow them is `MOVES_NO_OTHER_BOX`,
  with its reason: the paints, the compositing, and a transform, a motion
  path or a box's offsets, which move the animated box and what it holds —
  and a figure the animated box holds is on its walk, read already — **and,
  the seventh review found, every box positioned with `anchor()` against an
  anchor they carry** (PAN); since that review a transform, a motion path
  or an offset counts as moving another box wherever an anchor can follow
  it (`ANCHOR_FOLLOWED`, `anchorCanFollow`), and `visibility` is off the
  list (a table row's `collapse` to `visible` moves the next row: PVC;
  "Before 8g2: the seventh review's fixes", below). Anything else — a size,
  a margin, a padding, a border's width or style, a font, a spacing, an
  indent, `zoom`, `content-visibility`, a custom property, a property the
  list does not name, a rule the page cannot read — is seeked. **Not
  strictly "paint-only"**: the brief's word; transforms and offsets are on
  the list because, with no anchor to follow them, they move no box but the
  animated one's own subtree, which the walk's read covers (and the
  self-clip read holds the turns off). One on a figure's walk does both
  reads at the same seeks.
- **The cost, measured.** The first version gathered every money figure and
  decided every animation's rule on every paint: the offset read's page
  time rose about 0.1s a page pass (quick reads of every screen, commit 1
  against commit 2, two rounds: 390 543–584 → 688–694ms, 1280 677–680 →
  809–812ms), with nothing more seeked. It now gathers the paint's figures
  the first time an animation that can move another box needs them, reads
  only those the self-clip rule reads at the pass's last instant, decides a
  CSS animation's rule once a name while the sheets stand, and seeks
  nothing for the self-clip read alone on a paint with no figure: the same
  A/B against the gathered-lazily version read 542–586 → 586–590ms at 390
  and 658–664 → 674–698ms at 1280 (two rounds), and with the no-figure skip
  565ms and 675ms (one read), within the noise of commit 1; the clean run's
  counts are those of `35a33bd` exactly (177 animations, 355 seeks, 2,047
  figure reads, 2,044 self-clip reads at 390; 0 seeked for the self-clip
  read alone on any pass). Under the brief's 3s stop line.
- Proved: **PSQ2** whole runner, exit 1, the self-clip rule 23 at 1280 and
  none elsewhere (the plant is desk-only, and no wall paints a pay sheet),
  every one "with t-modern-sq2 on span.item-u seeked to its keyframe at
  30%". A quick read of five pay screens at 1280 read 11.
- The money size lint's "not named" docblock (`scripts/workshop-css.mjs`)
  and CLAUDE.md §6 now say where each read is made: `font-size-adjust` and
  a negative indent held on the figure or a box above it, a cut wherever
  the keyframe runs, a spill, a cover and a value between offsets by
  nothing.

### The ground read's trigger (P1-b and P1-c: PGatt3, PGpad)

- PGatt3 (the critic's: Modern's quote `.item-x` on its own ink,
  `currentColor`, under one 1000×100 tile of `var(--s-bg)`, and a keyframe
  `background-attachment: fixed` from 30% to 40% of a 100s loop, off the
  wall) passed the whole runner (246s): the animation was seeked and its
  ground never read again, `GROUND_SIGNATURE` not naming the attachment.
  PGpad (the critic's: the same figure under a 100%×60px tile and a
  keyframe `padding-top: 80px`, the glyphs 80px down on the ink) passed
  too: no signature longhand changes when the glyphs move over a ground that
  stays.
- The fix: `background-attachment` joins the signature after
  `background-image` (so a box above keeps `GROUND_ABOVE`), and the four
  paddings join it before (they place a box's content box, where a
  background may be clipped or placed); `background-attachment` joins
  `GROUND_ONLY`. And the ground is read again where a seek moved the
  figure's text (`inkSignature`: its text's client rects to a hundredth of
  a pixel, against the pass's last instant), which reads PGpad and an
  indent or a margin that moves the glyphs off their ground.
- **The static pin**:
  `the-ground-signature-names-every-longhand-boxPaintsOf-and-borderImageReach-read`
  (`layout/offsetHeld.test.ts`) parses `boxPaintsOf` and the one helper it
  hands its style to (`borderImageReach`, and no other: held), and holds
  every longhand read of any box to the signature before `GROUND_ABOVE`
  (pinned, with `groundSignature`'s slice) and every one read of a figure's
  own elements alone to the whole list; no longhand is excluded today, and
  an exclusion must be read. Red by three mutations, each alone, restored:
  the attachment out, `padding-top` out, `padding-left` moved after
  `background-image` (1 of 8 failing each).
- Proved, whole runner, each exit 1, at 390 / 1280 / 360 (the plants are off
  the wall): **PGatt3** the dress rule 76 / 76 / 64; **PGpad** 76 / 76 / 64;
  **PGind** (new: the same figure under a 600px-wide tile and a keyframe
  `text-indent: 1000px`) the dress rule 44 / 66 / 38, beside the self-clip
  rule's 76 / 120 / 64, which the commit before already read; **PGmar** (new:
  the figure in a 60px row with a 100px bottom border in its own ink, and a
  keyframe `margin-top: 80px` on the figure, its own paints moving with it)
  the dress rule 66 / 66 / 54. Quick reads on three quote screens at 390,
  on the commit before as the control: PGatt3 0 → 16, PGpad 0 → 16, PGind
  ground 0 → 14 (self-clip 28 both), PGmar 0 → 16.

### Pins and statements (the P3s)

- **The offset read's blocks are pinned whole** (`layout/offsetHeld.test.ts`):
  the own-element block from its loop head through its guard, its style
  read and both loops; the box block from its guard through the walk up to
  the target; the self-clip read's figures and its loop; the ground read's
  trigger and its own-element loop; and `movesOtherBoxes`, with
  `MOVES_NO_OTHER_BOX` held to name no layout longhand and no custom
  property. Red, each mutation alone, restored: the critic's m1 (the
  own-element guard cut to `el !== target`), m2 (the held loop reading the
  stall's style) and m3 (the box loop started at the target), green on
  `35a33bd`, now 1 of 8 failing each; and m5 (the layout-wide read handed no
  figures), m6 (the ink trigger off), m7 (the self-clip loop skipping the
  pay figure), m8 (`movesOtherBoxes` answering false) and m9
  (`margin-inline-start` called paint-only), each 1 failing. **The limit,
  stated in the test**: the pins hold the blocks' text and
  `movesOtherBoxes`, not which animations on a figure's walk reach them
  (`seekNeedless`, `outerShadowOnly`, `groundOnly`, the seek's timing) nor
  the helpers they call; those are the probe's red proofs'.
- **The prune's positioned-descendant condition** (`endMoot`): its docblock
  said a containing block "could stand outside the clip once a transform
  ends at `none`". The critic measured in Chrome 156 that a transform
  animation filled forwards keeps its box the containing block of what it
  positions even at a computed `none`, and PPD read the same with and
  without the condition: it is a belt, said so, and kept.
- **`PREFIXED_TWINS`' `null` entries**: the refusal said the name less the
  prefix "is no CSS property"; Firefox may read `mask-position-x` and `-y`
  (not checked: no network). It says "names no property Chrome reads" now,
  true either way, and PLAN § Open carries the question.
- PLAN § Open gains the sixth review's list.
- The code hold's docblock and CLAUDE.md §6 now say it reads a code where
  the pass's last instant left it: a keyframe that carries the modules off
  the matrix between the instants is read by nothing (not planted; PLAN §
  Open).

### Red proofs on the final tree, the whole runner, each plant alone

Counts per pass: 390 / 1280 / canvas / portrait / tablet / desk-wall /
short-wall / side-tablet / hd-wall / tall-tablet / narrow-wall / 360, where a
pass is not named. Every one exit 1, on `48de815` (whose probe is the
ground fix's, `197de12`, but for comments), the load 3.3–7.3 at the ends:

- **PTI** the self-clip rule 23 / 23 / 23 (390 / 1280 / 360).
- **PQC** the hold 35 / 78 / 122 / 130 / 130 / 97 / 130 ×5 / 29, and 5 and 3
  under reduced motion; **PQM** the same, and the quiet zone's 31; **PQP**
  the same as PQC.
- **PF2** and **PFC** 1a 53 / 73 / 109 / 140 / 91 / 91 / 100 / 99 / 100 / 100 /
  92 / 29; **PFCb** 53 / 73 / 71 / 102 / 46 / 86 / 95 / 90 / 95 / 48 / 38 / 29.
- **PGpos** and **PMk** the dress rule 76 / 94 / 333 / 351 / 78 / 60 / 78 ×5 /
  64.
- **PSQ2** the self-clip rule 23 at 1280.

Each is the count the round before reported (PTI, PQC, PQM, PF2, PFC,
PFCb, PGpos, PMk) or this round's own commit reported (PQP, PSQ2): nothing
the fixes touched moved a count. The clean tree, `197de12`: exit 0, 250.0s
(load 4.7 at the end), 0 failures; the offset read's counts those of
`35a33bd` exactly, 0 seeked for the self-clip read alone on any pass.

### Cost of the round

Two pairs back to back on this Mac, main (`c1f3e97`) then the branch
(`6cbb85a`), two tabs, the tracked fixture carried (796 contrast jobs), no
other probe running, each run started once the one-minute load was under 2.5
(2.36–2.47 at the starts, 3.6–4.6 at the ends):

| Pair | Main | Branch | Load at start (main, the branch) |
|---|---|---|---|
| 1 | 228.1s | 238.1s | 2.40, 2.36 |
| 2 | 223.5s | 244.0s | 2.45, 2.47 |

The branch is +10.0s and +20.5s (median 225.8s against 241.1s): its geometry
walk 91.7 → 118.0s and 90.5 → 119.9s, its contrast pass 127.9 → 112.5s and
125.6 → 116.5s. Against the round before's own figures — the branch at
`35a33bd` 233.6s in the critic's pair (geometry 113.4s), 240.2–243.2s in the
builder's (geometry 117.6–120.4s) — this round adds no more than the noise
between pairs. The offset read's page time, summed over the geometry passes
on two tabs, is 6.80s and 6.85s, against 6.08s in the critic's run of
`35a33bd` at a load of 1.7 and 6.44–6.57s in the builder's: under 1s summed,
under the brief's 3s stop line. 56–62s stand under the 300s ceiling.

## Before 8g2: the seventh review's fixes (2026-10-27; CRITIC-7)

The critic's seventh review on before-8g2 (`private/design/workshop-2026-09-23/before-8g2/CRITIC-7.md`,
its plants in `critic7/plants/`), decided by the owner (D-2026-10-27-01,
"Probe đọc + chặn trong lint": the probe reads the hole on the kit's road
and the first-party road alike, and the first-party look lint refuses
anchor positioning). The plants, logs, measurement pages and tools of this
round are in `before-8g2/critic7-fixes/`. A whole-runner count is the whole
runner, two tabs, the tracked fixture carried, each plant alone, the load in
each log's `.meta`; a quick read is one probe page at one size over named
screens (or all of them), its log opening with an uptime line.

### `MOVES_NO_OTHER_BOX` is true (B1, the probe half: PAN, PVC)

- PAN (the critic's: at desk width Modern's `.pay-x-n`, the figure the
  wallet signs, placed by `anchor()` just left of its unit `.item-u`, the
  anchor; `.pay-x` at `overflow-x: clip; justify-content: flex-end`; a
  keyframe `translate: -600px 0` on the unit from 30% to 40% of a 100s loop)
  passed the whole runner (251.1s, the critic's): the figure stood at
  759–858 in its row at rest and at 159–258 at 35%, out of the row's clip,
  and `translate` was on `MOVES_NO_OTHER_BOX`, so the offset read never
  seeked it. PVC (the critic's: a collapsed `::before` table row before the
  figure made `visibility: visible` by a keyframe, pushing the figure out of
  a 52px clip) passed it too (243.1s): `visibility` was on the list.
- **Measured first, one longhand at a time** (Chrome 156,
  `critic7-fixes/pages/anchor-follows.html`, `anchor-3d.html`,
  `visibility-collapse.html`, logs `runs/eval-*.log`): each of the list's
  longhands set by a paused keyframe on a 50×20 anchor, or on its host, with
  a box placed by `anchor()` and sized by `anchor-size()` against it, and the
  same keyframe on a flex, a block and a grid item with the box after it
  measured. The anchored box followed 22 of 120 cases: `transform`,
  `rotate`, `scale` (its `anchor-size()` too, 50 → 100), `translate`,
  `transform-origin` and `transform-box` under a turn at rest, a host's
  `perspective` and `perspective-origin` over a 3D child, `offset-path`,
  `offset-distance`, `offset-rotate`, `offset-anchor`, `offset-position`,
  the four offsets and the four logical insets, and a transform on the
  anchor's host. `transform-style: preserve-3d` on a host moved the
  anchor's drawn box and the anchored box did not follow; `perspective` on
  the anchor itself, `backface-visibility`, `visibility: hidden` and every
  paint and compositing longhand moved neither. No case moved the box after
  a flex, block or grid item. A table row's and a table column's
  `visibility` from `collapse` to `visible` moved the next row (50px) and
  column; a flex item's and a grid item's did not.
- The fix: `visibility` is off the list; the transform, motion-path and
  offset longhands are `ANCHOR_FOLLOWED` (the 22 cases' longhands, and
  `transform-style`, which moved the anchor), and an animation that sets one
  of them and nothing else that moves another box counts as moving another
  box where an anchor can follow it (`anchorCanFollow`): a sheet of the page
  declares `anchor-name` at a value other than `none` (any rule, keyframe,
  nested or imported rule) or cannot be read, read once a sheet key with the
  keyframes (`sheetFacts`, which replaced the keyframe cache); an animation
  that is no CSS animation sets `anchor-name`; or the animated box (a
  pseudo-element included) or an element under it computes one. Each
  animation's moves are decided before any seek, while the style is the
  pass's last instant's. The pass line counts the animations counted so
  ("… because an anchor can follow them").
- The three statements and the test name that said a transform or an offset
  moves only the animated box and what it holds — the list's docblock, this
  ledger's sixth-review entry, CLAUDE.md §6, and the still-list test — are
  corrected; the test is
  "seeks for the self-clip read every keyframe that can move another box: no
  layout longhand or visibility on the still list, and a transform or an
  offset where an anchor can follow it", which holds `visibility` and the
  anchor positioning properties off the list, `ANCHOR_FOLLOWED` inside it,
  every transform, motion-path and offset longhand of the list in
  `ANCHOR_FOLLOWED`, and the decision's lines.
- Proved, quick reads at 1280 over the six pay screens: PAN 0 on `41fd3c1`,
  13 with the fix; PVC 0 and 13. Each half of the anchor read alone (the
  sheet half switched off, the computed half switched off) reads PAN's 13,
  and both off read 0. **Whole runner**: see "Red proofs on the final
  tree", below. The runner and the probe build run no look lint (the lint
  reads a private look's sheet at build alone), so a shipped-look plant
  reaches the probe whatever the lint says: PAN's probe half stands on its
  own, beside the lint half's refusal.
- **What a sheet that declares an anchor costs**: under PAN every transform
  and offset animation on the page is counted as moving another box (on the
  phone pass 1,134 of 1,295 seeked animations, the Rural tags' sway and the
  signs' swing among them, at every width, the declaration being inside a
  desk-only media block): the offset read's page time summed over the
  geometry passes rose from 7.2s on the clean tree that hour to 28.0s, and
  PAN's whole run took 259.7s against the clean tree's 251.4s. On the kit's
  road only; no first-party sheet declares one (the lint half, below).

### The first-party lint refuses anchor positioning (B1, the lint half)

- `lintLookSheet` refuses `ANCHOR_PROPERTIES` (`anchor-name`,
  `anchor-scope`, `position-anchor`, `position-area` and its old name
  `inset-area`, `position-try`, `position-try-fallbacks`,
  `position-try-order` and its old name `position-try-options`,
  `position-visibility`, `position-fallback`), `anchor()` and
  `anchor-size()` in any value, and `anchor-center`, read on the lower-cased
  property name and on the value with its strings blanked, in any case: so
  with `!important`, in a media block, in a keyframe and in a custom
  property (no custom property holds the function, so none reaches a
  property through `var()`). `@position-try` was already refused as an
  at-rule (G4). `a-look-never-positions-against-an-anchor`; the plant set
  `a1` (34: PAN's sheet first, 29 more refused, four controls), pinned with
  the others in `the-lint-belts-critics-plants-are-pinned` (1,301 plants:
  993 refused, 308 accepted).
- Red: the rule switched off, `a1`'s pin and the describe's first test fail
  (2 of 259; `runs/lint-rule-off.log`).
- Costs nothing: no first-party sheet a run serves (the shipped looks, the
  fixture look, the tracked private fixture), no starter and the canary
  writes any of it, by the lint and by a grep with comments stripped; under
  the private look's selection the selected check reads it too (270 of
  270). The kit's `lintSheet` admits PAN whole (the kit is unchanged).
- Beyond the brief's list, stated: `anchor-scope`, the two old names and
  `position-fallback`, and `anchor-center`, each part of anchor positioning
  and written by no sheet.

### Pins and statements (P2, P3)

- **PSQ2p** (the critic's: PSQ2 through `.pay-x::before`, a margin of the
  row less 70px from 30% to 40% of a loop, the figure squeezed in its own
  clip) is a red proof now: see below.
- **The lines that decide which animations reach the reads are pinned**
  (`layout/offsetHeld.test.ts`): the guard that takes every animation with a
  target in, a pseudo-element's included, in the decision and in the read
  (exactly twice, and no `continue` on a pseudo-element), the walk's own
  pseudo-element test, the off-walk gate, the moves cache and its key, the
  gather of the figures the dress rule does not read and their report, the
  ink signature's rest, and `inkSignature`, `movesOtherBoxes` and
  `anchorCanFollow` whole. Red, each mutation alone on a copy, restored
  (`runs/pin-mutations.log`): the critic's m10 (no off-walk seek), m11 (the
  cache answers still), m12 (pseudo-elements skipped in the read, and in the
  decision), m13 (`inkSignature` answering nothing), m14 (the unread figures
  not reported), m15 (the place read unwired) and m16 (the gather reading
  the dress subjects alone), each green on `41fd3c1`, and seven of the
  anchor read's (it off, `visibility` back, the sheets never anchoring, the
  anchored animations not counted, an early answer in `anchorCanFollow` and
  in `movesOtherBoxes`, `translate` off `ANCHOR_FOLLOWED`): each 1 of 10
  failing.
- The test's sentence that a mutation of the helpers "is the probe's red
  proofs' to catch" was false for m12; it says now that such a mutation is
  caught only where a red proof exercises the branch it breaks, and not
  every branch has one.
- **m15**: no whole-runner proof reaches the place read alone (PQP is
  refused first by `QR_NONE`), so the call is pinned:
  `the-code-hold-reads-where-a-codes-modules-land` holds `qrColourFault` to
  end in `qrPlaceFault`, called once, `QR_NONE` to hold `offset-path`, and
  the place read to derive the matrix from `QR_SVG_QUIET_MODULES`.
- **The ground-signature test claims what it reads**: renamed
  `the-ground-signature-names-every-longhand-boxPaintsOf-and-borderImageReach-read`,
  its docblock stating that `groundStackFault` also reads `overflow-x`,
  `overflow-y`, `contain` and the ink's lines, which it does not parse (a
  clip only narrows the ink read, and the glyphs' place is `inkSignature`'s).
- **The quiet zone is one number**: `QR_SVG_QUIET_MODULES` (`render.ts`),
  `QR_QUIET_MODULES` (`src/domain/qr.ts`, a third copy the critic did not
  name) and the quiet-zone read's `QUIET_MODULES` are read as literals and
  held equal, and `qrSvg` to draw with its own
  (`the-quiet-zone-is-one-number`, `scripts/quiet-zone.test.mjs`); red with
  either source copy moved (`runs/quiet-tie-mutation.log`).
- PLAN § Open gains the seventh review's list: the older reads that assume a
  transform or an offset moves only its own subtree (closed for first-party
  looks by the lint, open on the kit's road), the probe's hidden scrollbars,
  and what an anchored box does that the self-clip read does not read; and
  its sixth-review items 2 and 5 say what is pinned and measured now.

### Red proofs on the final tree, the whole runner, each plant alone

Counts per pass: 390 / 1280 / canvas / portrait / tablet / desk-wall /
short-wall / side-tablet / hd-wall / tall-tablet / narrow-wall / 360, where a
pass is not named. Every plant exit 1, on `29d1b36`'s tree with this
round's last commit's probe and tests (its probe differs from `29d1b36`'s
in one comment; the logs name the dirty files), the one-minute load
1.5–6.3 at the starts and the ends:

- **PSQ2p** the self-clip rule 23 at 1280 and none elsewhere, every one
  "with t-modern-sq2p on div.pay-x::before seeked to its keyframe at 30%"
  (242s). A quick read of the six pay screens at 1280 read 13, and 0 with
  the critic's m12 applied to this probe (`runs/quick/`).
- **PAN** the self-clip rule 19 at 1280 and none elsewhere (260s; on
  `3745b4b`, the probe half's commit, 253s and the same 19), every one
  "with t-modern-pan on span.item-u seeked to its keyframe at 30%": the
  figure "has 275.2px of its text cut sideways by div.pay-x". The critic's
  run of it on `41fd3c1` exited 0.
- **PVC** the self-clip rule 19 at 1280 and none elsewhere (244s; on
  `3745b4b` 257s and the same 19), "cut from above or below by div.pay-x …
  with t-modern-pvc on div.pay-x::before". The critic's run on `41fd3c1`
  exited 0.
- **PSQ2** the self-clip rule 23 at 1280; **PQP** the hold 35 / 78 / 122 /
  130 / 130 / 97 / 130 ×5 / 29, and 5 and 3 under reduced motion; **PF2** 1a
  53 / 73 / 109 / 140 / 91 / 91 / 100 / 99 / 100 / 100 / 92 / 29: each the
  count the round before reported.

The clean tree: exit 0, 251.4s (load 3.5 at the start, 3.7 at the end), 0
failures; the offset read's counts those of `35a33bd` and `41fd3c1`
exactly (177 animations, 355 seeks, 2,047 figure reads, 2,044 self-clip
reads at 390), 0 seeked for the self-clip read alone and 0 counted as
moving another box because an anchor can follow them, on every pass.

### Cost of the round

Two pairs back to back on this Mac, main (`c1f3e97`, a clone) then the
branch (this round's final probe), two tabs, the tracked fixture carried
(796 contrast jobs), no other probe running, each run started once the
one-minute load was under 2.5:

| Pair | Main | Branch | Load at start (main, the branch) | Geometry walk | Contrast pass |
|---|---|---|---|---|---|
| 1 | 224.3s | 240.2s | 2.43, 2.46 | 91.1 → 117.4s | 125.2 → 115.3s |
| 2 | 223.5s | 236.9s | 2.27, 2.41 | 89.2 → 116.3s | 126.6 → 113.0s |

The branch is +15.9s and +13.4s (median 223.9s against 238.6s), against the
critic's pair of `41fd3c1` (main 225.3s, the branch 240.9s, +15.6s) and the
builder's of `6cbb85a` (median 225.8s against 241.1s): this round adds
nothing measurable. The offset read's page time, summed over the geometry
passes on two tabs, is 6.77s and 6.68s (6.74s in the critic's run of
`41fd3c1`, 6.80–6.85s in the builder's of `6cbb85a`); two quick reads of
every screen at 390 read 581.6 and 598.6ms against `41fd3c1`'s 535.6 and
589.7ms, within the noise of a round. 59.8–63.1s stand under the 300s
ceiling.

## CI's layout job on two tabs (2026-10-20, D-2026-10-20-06 D6)

ci.yml's manual `layout` job now sets `LAYOUT_CONTRAST_TABS: '2'`.

Why, with the figures that were measured (each from its own run, none mixed
with another's load):

- **One tab, before the four off-size wall passes: 261.8s at load 2.2** (the
  probe-shard section above) **and 264.1s at load 2.0** (the probe-shard
  critic's run), against the probe's 300s ceiling.
- **The four off-size passes' own times sum to 64.8s** (15.7 / 16.4 / 16.7 /
  16.0s on their tabs) in the geometry walk of the back-to-back run above
  ("Back to back on this Mac, 2026-10-20", two tabs, under XProtect's load:
  248.1s against main's 208.4s, +39.7s). On one tab they would walk one
  after the other.
- **A quiet two-tab pair: the branch 230.2s against main 208.8s, +21.4s**
  (the wall-offsize critic's, item 8).

So one tab would likely cross the 300s ceiling (261.8–264.1s plus passes whose
own times sum to 64.8s; **not measured**: one tab with the passes), and two
tabs fit (230.2s quiet, 248.1s loaded). `ubuntu-latest` meets the runner's own
two-tab default (at least 4 cores and 8 GiB) on a public repository.

The earlier entries above that say the job "sets `LAYOUT_CONTRAST_TABS: '1'`" are
history. Not measured: the job itself on a runner, until the owner dispatches
it. On that first dispatch, the two-tab walk, its canaries and the page print
run in CI for the first time.

## The state belt (2026-10-20; an allow-list since D-2026-10-20-08, narrowed by D-2026-10-20-10 and D-2026-10-20-11; the fourth review's B1–B3 and D-2026-10-20-13 (3), and the fifth review's B1–B3, below)

`a-look-state-rule-sets-only-what-a-state-may` (`scripts/workshop-css.mjs`,
`scripts/look-lint.test.mjs`) is the static half of the "a state no pass
paints" lines above. **It is first party only, and the kit lint is unchanged**
(D5 of D-2026-10-20-06, as the window read it; kept by D-2026-10-20-08): the
workshop README says a pointer's hover is Stall's at intake, so a creator's
`:hover` is read by a person and not by `workshop:lint`, and the three
starters pass the kit lint with or without it (`the-state-belt-is-first-party-only`
holds the README's own words; `the-three-starters-pass-the-belt` lints each
starter first party too). The one kit-visible change of the third-review round
is the older pseudo-element refusals reading through a comment (below).

**It began as a blocklist and the owner replaced it** (D-2026-10-20-08, "Ok b").
The first version read the probe's `DRESS_HELD` and `BOX_HELD` longhands under a
state and refused the values the probe refuses at rest; the lint-belts critic
found a new hole in it on each of three rounds: a faded ink carried by a theme
token (`color: var(--s-addr-bg)`, 5% on Neo), `all: inherit`, an animation
keyword and a keyframe named after one, and a border, an outline or an
underline written at rest and switched on by a state. Each fix was a new
family to name. The allow-list inverts it.

**What names a state fails closed** (D-2026-10-20-11). A rule of a shipped look,
the harness's fixture look or a private look is a state rule when its selector
names *any* pseudo-class that is not one of sixteen structural ones, or one of
six attributes — `[open]`, `[hidden]`, `[data-turn]` and, since the fourth
review's B3, `[data-state]`, `[aria-disabled]` and `[data-over]` (the three a
look may match and no probe fixture paints; see "`addr-copied`" and
`layout/stateAttributes.test.ts`) — or, since the fifth review, **`data-format`
and `data-code` except for the values some screen paints**
(`STATE_EXCEPT_PAINTED`, pinned by value: `data-format='tag'`, which the poster
fixtures paint, and no value of `data-code`; the poster formats `square`, `story`
and `stream` and a pay code switched off, `data-code='false'`, are painted by
no fixture, and `data-tier='2'`, which sizes a figure and so could not be a
state, is painted instead: "The stream card's money tiers", above). A selector
on those two names that is not an exact match (`=`, no flag) on a painted value
is a state and fails closed: presence, a partial match, a flag, another value —
in any form or case: anywhere
in the selector, `:is()`, `:where()`, `:has()` and `:not()` included
(`:not(:hover)` is a state rule). The sixteen
(`STRUCTURAL_PSEUDO_CLASSES`, pinned by value, each with its reason beside it)
are `:not`, `:is`, `:where`, `:has`, `:nth-child`, `:nth-last-child`,
`:nth-of-type`, `:nth-last-of-type`, `:first-child`, `:last-child`,
`:only-child`, `:first-of-type`, `:last-of-type`, `:only-of-type`, `:empty`
and `:root`: the tree at rest, which the probe paints. Every other
pseudo-class, a name this list has never met included, is a state. The first
version named nine pseudo-classes and `[data-turn]` and called the rest "a rule
at rest", which was false for a state the probe does not paint: the probe opens
every `<details>`, so a fold's closed default
(`.sheet:has(details:not([open])) .pay-x { opacity: 0 }`), a field with its
placeholder showing (`:placeholder-shown`) and a box with `hidden` were states
no pass paints and the belt did not see. A comment between a colon and the
name is read through (`pseudoTokens`: a browser reads a colon, a comment and
`hover` as `:hover`), and so is a name with two dashes (`:--open`, a custom
selector no browser reads: the fourth review's smaller item), which the first-party
lint reads as the state it fails closed on and refuses as an engine's selector
too; the kit does not ask, and is unchanged. Such a rule sets **only** what is
below, and every other declaration is refused with one sentence naming the
property.

**Allowed under a state:**

- `color`: a literal colour at alpha 1 (a name, `#rgb`, `#rrggbb`, a colour
  function with no alpha or exactly 1; no `var()`, no `color-mix()`, no relative
  colour, no system colour), or `var(--s-…)` of one of eight palette roles with
  no fallback: `--s-bg`, `--s-surface`, `--s-text`, `--s-shade`, `--s-muted`,
  `--s-accent`, `--s-danger`, `--s-accent-2` (`STATE_OPAQUE_ROLES`, pinned by
  value). **Not `inherit` and not `currentColor`** (the third review's B2:
  either hands the ink to whatever the parent paints, and a parent a rule at
  rest drew clear fades the figure). `themeVars` writes each role as
  `rgb(r, g, b)`;
  `the-state-opaque-roles-are-the-opaque-colours-the-theme-table-emits` proves
  it under every shipped look bare and under both moods, and that the set of
  vars that are an opaque colour under all of them is exactly this list;
  `a-private-look-palette-role-is-opaque-by-construction` proves a private
  look's palette, read as RGB triples of whole numbers 0 to 255 through
  `lookFromData`, cannot make one anything else (the tracked fixture, with every
  role at four extremes, and every colour shape the file may not carry
  refused). **A first-party sheet may not re-declare one** (`.item {
  --s-accent: 300px }` would re-point every reader below it), which no served
  sheet does.
- `background-color`, `background-image` and `background`: a colour of any
  alpha (the shipped state rules write `rgba(37, 99, 235, 0.1)`: a tint is a
  ground, and the probe reads the ground), `transparent`, `initial`, `unset`,
  `var(--s-…)`, `color-mix()` of those; **not `currentColor`, in a gradient too,
  and not `inherit`** (a ground the colour of the ink it holds hides the figure,
  and `background-image: inherit` brings back a picture a rule at rest sized to
  nothing). A picture only as a gradient; `url()`, `image-set()`, `cross-fade()`,
  `element()` and `paint()` are refused for every subject.
- **`border-color`, each `border-*-color` and `outline-color`, colour only**
  (D-2026-10-20-11), and not `currentColor`, `inherit`, `initial` or `unset`
  (the initial colour of an edge is `currentcolor`). **No `border` shorthand, no
  `border-style`, no `border-width`, no `outline`, `outline-style`,
  `outline-width` or `outline-offset`.** The earlier rule allowed an outline
  whose width and offset were written in the same rule, and its sentence was
  false: the cascade defeats it. A later, more specific rule at rest sets
  `outline-width: 200px; outline-offset: -100px`, and the state's rule has no say
  in what it draws; a border works the same way (`border-style: solid` over
  `border: 40px none`), and the shorthand under a state adds up to 3px of
  padding by another name.
- `box-shadow`, **bounded** (a deviation from "any shadow", stated below): each
  layer names one colour (not `currentColor`; a layer that names none is drawn
  in the ink); **at most two outer layers; every blur at most
  `STATE_SHADOW_BLUR_MAX_PX` (16px)**, inset layers too; an outer layer has no
  spread and an offset of at most `STATE_SHADOW_MAX_PX` (8px). An inset shadow
  stands: it paints inside its own box, under its own text. A `var()` is refused
  unless it is a palette role standing as the colour. **A blur is not a fade that
  dies with distance**: layers add, and twenty layers of `0 -8px 120px #000`
  come to about 99.8% black over a width of 240px (arithmetic, not an
  observation), which is why the count and the blur are both capped.
- `cursor`, **a keyword** (`pointer`, `not-allowed`, `grab`, …), here and at rest
  (D-2026-10-20-11): `url(…)` and `image-set(…)` stand a picture of up to 128px
  at the pointer, over whatever it is over, where no pass paints it. No first-party
  sheet sets a cursor; Neo's `.invite-cursor` is a class name
  (`a-cursor-is-a-keyword`).
- The no-transform values: `transform`, `rotate`, `scale` and `translate` as
  `none`, `initial`, `unset` or an exact identity (`rotate: 0deg`, `scale: 1`,
  `translate: 0`, `transform: translateZ(0)`). Rural's straightening of a tilted
  row under a hand is `rotate: 0deg`.
- `transition` and its longhands (the size lint reads them on a money node), and
  `-webkit-tap-highlight-color` (`transparent` only, anywhere).

**Refused under a state** (named in the tests): `all`; any custom property
(stall.css reads `--s-price-clip`, `--s-icon-clip`, `--s-head-blur` and
`--s-tabs-blur` as a clip, a blur or an animation); `animation` and every
`animation-*`, CSS-wide keywords included, so a state starts no keyframe and
none is read as a state's; `content`, `position`, `z-index`, `display`, the
offsets; every text and spacing property; `font*`; padding, margin, sizes,
`opacity`, `visibility`, `filter`, `backdrop-filter`, `clip*`, `mask*`,
`offset*`, `overflow`; `text-decoration*`; the `border` shorthands,
`border-style` and every `outline` property but its colour; every non-identity
transform.

**A pseudo-element under a state is held to a shorter list**
(`STATE_PSEUDO_ALLOWED`, pinned by value): `cursor`, `transition` and its
longhands, and the exact identity transforms. **Not `color`** (the third
review's B3): a generated glyph such as `◆` at a large size would appear over a
figure when its colour changed. A selector that names a state and a
pseudo-element together (`.item:hover .item-p::after`; `:before` and `:after`
with one colon too) holds the whole rule to it, and every other declaration is
refused with a sentence that names the property and says the probe measures a
pseudo-element only by its paint at rest. That closes the open candidate of the
allow-list round: a pseudo-element a rule at rest moves over a figure
(`position: relative; left: -80px`) with its ground clear, given a ground by
`:hover` (plant `w1`). It costs the tree nothing: no shipped look, starter,
fixture or the canary has a pseudo-element under a state
(`no-sheet-a-run-serves-has-a-pseudo-element-under-a-state`). In a list, a state
selector with no pseudo-element in it beside a pseudo-element with no state
(`.item:hover, .item-p::after`) is not one: the pseudo-element stands at rest,
where the probe measures it.

**A pseudo-element's paint is its own at rest** (D-2026-10-20-08's B3, and the
fourth review's B1; `a-pseudo-element-paints-its-own-ground-and-ink`, first party
only). The other half of the same road: a pseudo-element a rule at rest moved
over a figure whose paint is its host's or the cascade's — a ground through
`inherit`, an edge, a shadow, an underline or a mask through `currentColor`
(which is also what a shadow, a border, an outline or an underline that names no
colour is drawn in), a custom property the host set to `currentColor`, a colour
rolled back by `revert` — is clear while its host is, and covers the figure the
moment a state gives the host a ground or an ink: the host is an element, and an
element may change both. **The third review's version was false by five roads**
(the fourth review's B1): one coloured edge cleared every edge (one flag for four
families and four sides), `revert` and `revert-layer` on an edge colour,
`all: inherit`, a mask in `currentColor` (`mask*` was not read), and a custom
property set to `currentColor` on the host. So a first-party rule whose selector
list holds a pseudo-element:

- writes no `inherit`, `currentColor`, `revert` or `revert-layer` in a
  `background*`, `border*`, `border-image*`, `outline*`, `column-rule*`,
  `text-decoration*`, `box-shadow`, `text-shadow`, `filter` or `mask*` value —
  a gradient inside a mask included, since a mask takes the alpha of its image
  and `currentColor`'s alpha is the host's ink's — nor `initial` or `unset` for an
  edge's colour, nor `inherit`, `unset`, `revert`, `revert-layer` or `currentColor`
  for its own `color`;
- reads a `var()` in any of those only as a palette role standing alone
  (`STATE_OPAQUE_ROLES`, no fallback); any other custom property may be one the
  host set to `currentColor`. **In a mask that holds where the `var()` stands as
  a colour or as the picture, and nowhere it stands as a length** (the window's
  selected check after the fourth fix round: judgement 14 refused any non-role
  `var()` anywhere in a mask, and the private look at 0x04, read under its
  selection, was refused on `var()` calls that stand as lengths; a length carries
  no colour, so B1 (d) and (e) — a mask colour that follows the host's ink —
  never needed that reach). So
  `mask-size`, `mask-position`, `mask-repeat`, `mask-composite`, `mask-mode`,
  `mask-origin`, `mask-clip`, `mask-type` and the border mask's slice, width,
  outset, repeat and mode are not read for a `var()` at all; in a picture
  (`mask-image`, `mask-border-source`, the `mask` and `mask-border`
  shorthands, a layer at a time) a gradient's arguments are split at their
  top-level commas, an argument holding a geometry word (`to`, `at`, `from`,
  `in`, a side, a shape, a colour space) names no colour, and any other is a
  stop, `<color> <length-percentage>?` with the colour first or last. A `var()`
  standing alone as a token of a stop is its place only beside a colour that is
  not itself a `var()` (`#000 var(--r)`, `var(--s-text) var(--r)`); with no such
  colour it is the colour (`var(--g) 50%`) or, alone, ambiguous, and is refused
  unless it is a palette role. A `var()` inside a colour function (`rgb()`,
  `color-mix()`) is a colour; inside a `calc()`, `min()`, `max()` or `clamp()` a
  length. A bare `var()` where a picture goes (`mask-image: var(--m)`, a layer of
  the shorthand with no picture of its own) is the picture, whose custom
  property may hold a gradient in `currentColor`, and is refused; after a `/` it
  is a length. `currentColor`, `inherit` and `revert` stay refused anywhere in a
  mask. Plants `c1` (eight accepted, sixteen refused). **A `var()` that stands as a
  place may hold more than a place** — substitution is by tokens, so a custom
  property a host rule set to `50%, currentColor` brings a stop in the host's ink
  into `#000 var(--x)`, and the same in the `mask` position slot, the size after a
  `/`, a radial gradient's `at` and a conic gradient's `from` or `in` (the fifth
  review's B2, confirmed in Chrome; plant `c1:8` was pinned as accepted and its
  reason, and `c1:5`'s and `c1:7`'s, were false). **That class is closed where the
  custom property is declared** ("No custom property holds the ink", below): none
  holds `currentColor` or `inherit`, so what a `var()` brings in is a colour of the
  sheet's own. `c1:8` is refused there, `c1:5` and `c1:7` stay accepted for that
  reason;
- writes no `all`, in any value (on an element `all` stays `inherit` or `unset`);
- names a colour for **each family and each side** of what it draws: a shadow or
  text-shadow layer, a `drop-shadow()`, each of a border's four physical sides, an
  outline, a column rule, a text decoration — a coloured edge of one family or
  side clears none of the others, a shorthand resets what it does not name, and a
  side with no style, a zero width or `none` draws nothing and needs none. **A
  logical border property (`border-block`, `border-inline-start-color`, …) is
  refused**: its side is a physical one that depends on the writing mode, a write
  to it may land on any of the four, and a style or a width written there may draw
  where the colour was written for another side;
- prints text (a `content` that is not empty) only with a `color` of its own in
  the same rule, a literal colour or a palette role.

**Checked on the sheets first, and the cost is nil**: Neo has four pseudo-element
rules (two gradients, the Wearing line's `// ` in `#3df2ea`, and the activity
tile's `box-shadow` in a literal colour); the tracked private fixture has one and
the canary the same one (a colour-mix of two palette roles, a mask of a file and
of `linear-gradient(#000, #000)`, an empty `content`); the harness fixture look and
the starters have no more. None is refused (`costs the shipped looks, the starters,
the fixtures and the canary nothing`). The private look at 0x04 is read under a
selected run, which the window makes. Not read, stated: a style in one rule and its
colour in another (the check is per rule, in the order the rule writes), and a
colour-bearing property not named above.

**A paint that reaches past its box names its own colour** (the fourth review's B2;
`a-paint-past-its-box-names-its-own-colour`, first party only). A colour change under
a state reveals any paint, written at rest, that reaches past its box — a shadow with
a 4000px spread in `currentColor` or in no colour (which is drawn in it),
`outline: 4000px solid`, a `border-image` with an outset, a `drop-shadow()` — and
none of them needs a move: a box at rest with a clear ink is invisible, and `color`
under `:hover` fills the page. So in a first-party sheet, **at rest, in a media block
and in a keyframe**, every outer `box-shadow` layer, every `text-shadow` layer, every
`filter: drop-shadow()`, `outline` and `outline-color` (and `outline-style` when it
draws), a `column-rule` and `column-rule-color` (and `column-rule-style` when it
draws; the fifth review's B1: its width can pass its gap), and a `border-image` and
`border-image-source` name a literal colour or a palette role standing alone; none
is `currentColor`, `inherit`, `revert`, `revert-layer`, `initial` or `unset` where
those are `currentcolor`, a `var()` that is not a palette role, or a layer with no
colour. An inset layer lies inside its box and a border's own band too: the
existing rules read them. The rule runs on a rule that names no state (the belt
refuses most of these by name under one and bounds the rest) and on one with no
pseudo-element. **The other two readers read those rules differently, not "as
strictly"** (the fifth review's smaller item): the belt reads a state rule's
`box-shadow` colour as a literal colour or a palette role, and its `outline-color`
(and its border and ground colours) as a literal colour or a `var(--s-…)` of *any*
name with no fallback, never `currentColor`, `inherit`, `initial` or `unset` — a
property of the stall's own that a rule at rest set to `currentColor` is
`currentColor` again, which the custom-property rule below now shuts at the
declaration; and `pseudoHostPaintProblems` reads a pseudo-element rule's paints
for the same keywords, a `var()` only as a palette role, and a colour for each
family and side, but counts any token that is not a length or a keyword as a colour
(so a system colour or an `env()` passes there, judgement 21, and `initial` or
`unset` as a shadow's colour is not refused). **Cost, surveyed on every first-party
sheet**: nil. The three looks write
their shadows, text shadows and drop shadows in literal colours (a count in the
test), Rural's one outline is `color-mix(in srgb, var(--s-muted) 35%, transparent)`,
and the fixtures and the canary write none; the private look at 0x04 is read under a
selected run.

**An outline is capped, per longhand** (the fourth review's ranked item 1, decided
by the window; `an-outline-is-capped-per-longhand`, first party only). The ring
reaches past its box over the boxes beside it, and this pass reads an outline at
rest only across the glyphs of its own box and of the boxes above a figure
(`outlineFault`, `outlineAboveFault`). A sum in one rule was split by the cascade
(`outline: 8px solid transparent` in one rule, `outline-offset: 8px` in another),
and a keyframe can carry the widths, so the cap is on each declaration where it
stands, at rest, in a media block and in a keyframe: **`outline-width` (and the
shorthand's width) is `thin`, `medium` or px, at most `OUTLINE_WIDTH_MAX_PX` (4px)
— `thick` is 5px and is refused — and `outline-offset` is px from
`OUTLINE_OFFSET_MIN_PX` (-8px) to `OUTLINE_OFFSET_MAX_PX` (4px); neither takes a
`var()` or a `calc()`** (a palette role standing as the shorthand's colour is a
colour, not a width). Under a state the belt refuses all three by name. Rural's one
outline, 1px at -5px, stands. Plant `w2:11`, the ring written clear and shown by a
colour, was a stated gap until this cap and is refused now.

**A line and a stroke are capped, per declaration** (the fifth review's B1;
`a-line-and-a-stroke-are-capped-per-declaration`, first party only). An underline, a
strike and an SVG stroke are drawn in the ink of their box (`currentColor` is their
initial colour), and each reaches past the box with one number.
`text-underline-offset: 300px` with `text-decoration-thickness: 60px` draws a bar
300px below its line, and stall.css already underlines `.guide-link`,
`.wearing-link` and `.token-link-live`, so a look needs no `text-decoration` of its
own to reach it; `stroke-width: 300` on a glyph (`.ic` is `stroke: currentColor`) with
`overflow: visible`, or the `d` property, fills the page. A colour under a state then
reveals it, with no move (the critic's page, in headless Chrome: an underline 200px below its line, a column rule and a stroke past their boxes). So,
wherever a declaration stands in a first-party sheet (at rest, in a media block and
in a keyframe), each is capped where it is written, in px or a keyword and with no
`var()` or `calc()` (a sum per rule is split by the cascade, as the outline's was):
**`text-underline-offset` within `UNDERLINE_OFFSET_MAX_PX` (4px) either side of the
line, or `auto` or `from-font`; `text-decoration-thickness` and the thickness a
`text-decoration` shorthand carries at most `DECORATION_THICKNESS_MAX_PX` (3px), or
`auto` or `from-font`; `stroke-width` a bare number or px, at most
`STROKE_WIDTH_MAX` (3); and the `d` property is not written.** A CSS-wide keyword
(`inherit`, `revert`, …) takes a value the cascade already holds, a capped look
rule's or a base sheet's, and is not read. **The shorthand is read by an allow-list**
(the sixth review's M1): each of its tokens is a line keyword (`none`, `underline`,
`overline`, `line-through`, `blink`), a style keyword (`solid`, `double`, `dotted`,
`dashed`, `wavy`), `auto`, `from-font`, a colour this lint reads (`literalColour`: a
name, a hex, `rgb()` and the other colour functions written out) or a palette role
standing alone, or a px length within the cap; every other token is refused, a
function of any name included. The reader before it refused the functions it knew
(`calc()`, `min()`, `max()`, `clamp()`) and let `abs(60px)`, `round(60px, 1px)` and
`hypot(60px)` through as a thickness, and Chrome draws a 30px bar for each (the
critic's page). A `color-mix()` or a system colour is not a colour it reads and is
refused in the shorthand (write it in `text-decoration-color`, which draws no
thickness). A column rule is the other half of the road and names its own colour like an
outline (above). Under a state the belt refuses every one of these properties by
name. **Cost, surveyed on every first-party sheet** (the shipped looks, the starters,
the harness's fixture look, the tracked private fixture, the canary): nil. The three
looks set a `stroke-width` (Modern 2, Neo 2, Rural 1.75) and none writes an underline
offset or thickness, a `text-decoration` with a length, `d` or a column rule (a count
in the test). Plants `f2`, `f8` and `g1`.

**No custom property holds the ink** (the fifth review's B2;
`no-custom-property-holds-the-ink`, first party only). `var()` is substituted as
tokens, so wherever it stands it can carry a comma and then a stop, a layer or a whole
value in the ink of the box that reads it: a stop's place (`#000 var(--x)` with
`--x: 50%, currentColor`), the `mask` position slot, the size after a `/`, a radial
gradient's `at`, a conic gradient's `from` or `in` — five shapes, all confirmed in
Chrome (the critic's page: each row clear while the host's ink is clear and fully
painted once it is not). The reader of a position cannot tell, so the
closure is at the declaration: **in a first-party sheet no custom property holds
`currentColor` or `inherit` anywhere in its value, and none is `revert`, `revert-layer`
or `unset` as its whole value** (`unset` on a custom property is `inherit`, which is
inherited; the sixth review's smaller item). That closes the class the pseudo-element mask
reader left as a stated gap (`c1:8`), backs up the pseudo-element reader's
palette-role-only rule for a colour, and closes the belt's own `var(--s-…)` road: a
state rule accepts `var(--s-…)` as a ground or an edge colour with no look at what a
sheet's own property holds. A rule under a state is refused its custom properties by
the belt on its own. **Cost, surveyed**: nil. No stylesheet the app loads declares
one (stall.css, `window.css`, `broadcast.css`, `obsGuide.css`, the shipped looks, the
kit's skeleton, the harness's fixture look, the tracked private fixture; 91 custom
properties read), the starters and the canary neither, the theme table's `--s-*`
(every shipped look, bare and under every mood: 200 and more variables) holds none.
The test holds those two halves (`costs nothing: no served stylesheet the app loads
declares such a custom property, and the theme table emits none`). **It does not hold
the third: no `setProperty` in `src/` writes the ink is a grep** (the calls are in
`wallFit.ts`, `broadcast.ts` and `render.ts`, each a size, a duration or a
percentage), and no test reads them. A custom property set from script is not seen by
this lint at all.

**A rule runs only the keyframes its own sheet declares** (the fifth review's B3;
`a-rule-runs-only-the-keyframes-its-own-sheet-declares`, first party only).
`@keyframes` names are global, and stall.css ships keyframes of its own:
`animation: pin-demo-land 1s 120s reverse forwards` on a quote's `.item-a` runs a base
keyframe that holds `visibility: hidden` from 0 to 44%, which reopens PT (a figure
removed for most of a cycle the pass reads one instant of); `animation: sel-bump 1s
infinite` on a money node scales it by 1.18, which the size lint refuses in a look's
own keyframes and never reads in a base sheet's; `animation-name: var(--an)` does the
same through a custom property. So **each rule's `animation` and `animation-name` name
`none` or a keyframe the same sheet declares at its top level, and never through a
`var()`**: the keyframes a look runs are the keyframes the look lint reads. The
shorthand is read single by single (`parseSingleAnimation`, the flash rule's reader;
case-sensitive, as CSS is). `inherit`, `revert` and `revert-layer` take the parent's or
the cascade's name and are refused; `initial` and `unset` are `none`. Under a state the
belt refuses `animation*` by name. **Only a top-level keyframes block counts as the
sheet's own, and one inside an at-rule is refused** (the sixth review's M2): inside
`@media` a keyframe applies only while the condition does, so below it a base sheet's
keyframe of the same name is the one a rule runs, and a quoted twin
(`@keyframes "pin-demo-land"`) inside a media block ran the base keyframe below 680px
while the lint counted it as the sheet's own (Chrome, the critic's page). A statement
(`@keyframes x;`) is no keyframes and counts as none. **The cross-sheet rule reads
names without their quotes** (`declaredNames`): at the top level a quoted twin
replaces the base keyframe everywhere, and `wornSheetProblems` compared the raw
prelude and missed it. No first-party sheet declares a keyframe inside an at-rule
(surveyed: the three looks, the fixtures, the canary, the starters). **Not read,
stated**: a longhand that names no keyframe (`animation-duration`, `animation-delay`)
is not harmless. It re-times what the cascade already runs on its element, a base
keyframe included (`.bc-ext { animation-delay: 120s; animation-fill-mode: backwards }`
re-times `.bc-ext.in`'s `bc-in`), and nothing here reads it (the critic's sixth-review
plants N3 and N4; `h1` pins the first as accepted). **Cost, surveyed**: nil — every shipped look, the fixture look, the tracked
private fixture and the canary run only their own keyframes (Modern two, Neo three,
Rural two), and so does every starter (`workshop:start` renames the keyframes `wk-…`
and the rules with them).

**A blur is capped** (the sixth review's judgement on `filter: blur()`, decided by
the window; `a-blur-is-capped`, first party only). `filter: blur(40px)` spreads the
paint of a box, its ink included, far past the box, and a colour under a state then
shows it with no move; the fifth review stated it as a gap. So wherever a `filter`
stands in a first-party sheet (at rest, in a media block and in a keyframe;
`-webkit-filter` is read as `filter`): **a `blur()` is a length in px, or a bare `0`,
of at most `FILTER_BLUR_MAX_PX` (4px), with no `var()`, `calc()` or other function in
it; a filter list holds at most one `blur()`; and no `var()`, `env()` or `attr()`
stands in the list outside a `drop-shadow()`**, because a custom property can hold a
whole `blur(80px)` (the colour readers read a `drop-shadow()`'s own arguments).
`backdrop-filter` is left alone: it blurs what lies behind the box, not its paint. A
CSS-wide keyword takes a value the cascade already holds. Under a state the belt
refuses `filter` by name. **Cost, surveyed**: nil. The looks' filters are `sepia()`,
`saturate()`, `brightness()`, `contrast()` and `drop-shadow()` (Rural two, Neo three,
the starters the same), no first-party sheet writes a `blur()` in a `filter`, and none
writes a `var()` in one; their `blur()` is a `backdrop-filter`. Plants `f2:32` (now
refused) and `h1`. Not read, stated: `filter: url()`, above.

**The OS colour scheme is not a look's to paint** (the fifth review's ranked item 3,
older than this branch; `the-os-colour-scheme-is-not-a-looks-to-paint`, first party
only). `color-scheme: light dark` with `light-dark(#000, transparent)` leaves a figure
invisible in a dark scheme, and system colours (`Canvas`, `CanvasText`) flip the same
way (the critic's page, in headless Chrome); this pass paints one scheme. So in a
first-party sheet **`light-dark()` is not written anywhere in a value and `color-scheme`
is `normal`, `light` or `initial`** (`only light` is refused with the rest: the words
are the decision's). That is what makes a system colour on a pseudo-element, which
judgement 21 accepts, one fixed colour. None of the app's base or screen sheets sets a
scheme (`/404` does, and is a page of its own); no look sheet writes either. **Cost**:
nil.

**The fifth review's round, measured** (2026-10-26, the fifth review's builder; the
`STALL_LOOKS_*` variables unset). `pnpm test:layout` (ports 4421 and 9441, checked free,
no other probe running): **every pass green and `layout-check: passed` at 235.0s of
the 300s ceiling**, at a load of 3.4 to 4.7 (`uptime`, at the start and during the
run); 17 geometry passes in 97.2s on two tabs, the canvas pass 62 screens (the 60 it
had and the two stream-tier fixtures), the contrast plan 796 jobs, unchanged. One run,
not a back-to-back pair against main, so it says the runner finishes with the round and
not what the round costs (two canvas screens on a pass of 10.7s). The path the plan
takes for a look that names `[data-copied]` was run in Chrome on the kit's look with a
rule planted under `[data-copied='true']` in `workshop/theme-workshop.css` (put back
afterwards): `pnpm workshop:probe` planned 86 contrast jobs against 82 without the
rule (the four are the two staged screens at the phone and the desk), read 94 more
figure boxes, and passed. **Red**: the same run with the CSSOM reader made to find
nothing stops in the contrast pass with `the-plan-follows-the-sheets-that-name-data-copied:
the served sheets name it on [t-workshop], the page reads it on [] and the plan samples
addr-shown and addr-copied for []`. **Not run**: a `pnpm test:layout` with a private
look selected (the variables are the window's); the jobs are planned for any carried
look whose sheet names `[data-copied]`, so such a run plans the two screens for it. The stream tiers print on the canvas pass's
`compared:` line (the kit's probe printed `stream card tiers read: t-workshop
0:1/1:1/2:1/3:4`; that one print was added after the full run and is checked by the
kit's probe and a unit test).

**The sixth review's round, measured** (2026-10-26, the sixth review's builder; the
`STALL_LOOKS_*` variables unset but for the one command named below). Both `tsc` projects
exit 0. `pnpm test` exits 0: vitest 106 files, 2,439 tests (from 2,435); node 1,121
tests, 1,120 pass and the one skip it always had (from 1,113); `look-lint.test.mjs`
alone 238 tests (from 230). `pnpm build` exits 0. `pnpm test:layout` (ports 4421 and
9441, checked free at the start): **every pass green and `layout-check: passed` at
255.6s of the 300s ceiling**, at a load of 4.2 at the start (6.9 a minute after the
run ended); 17 geometry passes, the canvas pass **66 screens** (the 62 it had and the
four quote-card fixtures, on a pass of 12.1s), the contrast plan 796 jobs, unchanged,
the transparency pass green. It printed the stream card's tiers per rail: `quotes
0:3/1:1/2:1/3:2` on Modern, Neo and the skeleton and `quotes 0:4/1:1/2:1/3:1` on
Rural, with the listing rail as it was. One run, not a back-to-back pair against main,
on a shared machine, so the time says the runner finishes with the round and does not
measure what four canvas screens cost. **Red**: 14 mutations of
`scripts/workshop-css.mjs`, each file put back and compared by hash, each failing at
least one test: the shorthand's old reader (2 tests and the `h1` and critics' plants),
the colour read dropped, a nested keyframe counted again, a nested keyframe not refused,
`declaredNames` keeping its quotes, a statement counted as declared, `blurCapProblems`
not called at rest and not called in a keyframe, the cap raised to 400, two blurs
allowed, a `var()` in the list allowed, the prefix unread, a negated painted value read
as a painted one, and `unset` allowed on a custom property. **The probe side, three
more**: a quote fixture at the wrong length (`broadcast-quote-11` made 10 characters)
fails 2 vitest tests; quote tier 1 un-owed on Modern, 1; the quotes rail not owed at
all, 1 (`probe-coverage.test.mjs` names the tier, the rail and the look for each
missing count). **Not measured**: `streamTierRead`'s per-rail split in Chrome has no mutation of
its own (the full run prints it, and `streamTiers.test.ts` holds the same selector in
happy-dom); the pairwise cost against main. The selected look-lint check (the private
look at 0x04, the window's command) passes 238 of 238 and names `t-fixture-private`
and `t-inkwash` in the guards' line.

**The probe's sets, kept as a drift test.** `the-state-belt-reads-every-longhand-the-probe-holds-or-refuses-it`
parses `DRESS_HELD` and `BOX_HELD` out of `layout/probe.ts` — strictly: a list
body that is not single-quoted strings fails the parse (the critic's P3-7: a
double-quoted or spread member was missed in silence) — and holds that the
members a state may set are exactly seven (`background-color`,
`background-image`, `color`, `rotate`, `scale`, `transform`, `translate`), each
with a reader, and that every other member, the three `outline` longhands now
among them, is refused under a state.

**The plants.** `scripts/look-lint-plants.json` holds the 242 rules the critic
planted on a copy of Neo over three rounds (`p1`–`p10`, `q1`–`q7`), the 238 of
the third review (`n1`–`n9`), the window's 13 (`w1`, the pseudo-element
above; `w2`, the keyframe, glyph, shadow, cursor and ring), the 224 of the fourth
review (`m1`–`m9`), the builder's own 108 (`b1`: the paints a pseudo-element or
an element may and may not write, the outline's edges, `visibility` in a keyframe),
the window's selected check's 24 (`c1`: a `var()` in a mask), **the fifth review's
153 (`f1`–`f8`: per-side colours, past the box, the outline cap, keyframes, the mask
reader, the colour scheme and a custom property, the states, the underline) and the
builder's own 158 beside them (`g1`: the caps' edges, the custom property's forms,
every spelling of a foreign keyframe, the scheme, the formats nobody paints)**,
**and the sixth review's round's own 40 (`h1`: the shorthand's thickness through a
math function, a keyframe inside an at-rule or with no block, a negated painted
value, a blur past its cap, `unset` on a custom property, and the two sentences it
leaves as stated gaps)**, 1,200 in all, each with its outcome pinned: `refused`, and
by which kind of sentence, or `accepted`, with the reason
(`the-lint-belts-critics-plants-are-pinned`). Of the 1,200, 295 are accepted (905
refused); of the first 825, 167 were: the empty control; forms that set nothing (an alpha of 1, a
palette role, an identity transform in each of its spellings, a declaration CSS
drops); grounds, which paint under the ink; the shadows inside every bound;
width-moving properties outside D-2026-10-20-07's list (`font-weight`,
`font-stretch`, `text-indent`, `padding`, `width`, … in a transition or a keyframe),
a keyframe's `opacity` or `clip-path` (the probe's dress rule holds both on a
money figure at each keyframe and, since before 8g2, at each keyframe offset,
and on a box above it at each keyframe, a moving `clip-path` refused; off money
a moving ink is read at one frozen instant, §10),
and a keyframe's
`position`, `float`, `contain`, `overflow`, `height`, `order`, `z-index`,
`mix-blend-mode` or `filter` (outside the four names `display`,
`content-visibility`, `visibility` and `all`; stated); `mini`, `fine` and `pay-sub`,
classes a money line shares with boxes that are not money; a pseudo-element beside
a state selector in a list; an attribute state the fixtures paint (`[aria-pressed]`,
`[data-copied]`, both values); **a colour a state gives an element a rule at rest
moved over a figure and left clear (`m4`, six plants, the stated gap below)**; the
controls of the fourth review (a pseudo-element's own literal colour, a palette
role, a mask from a file); and the cursor, shadow and number forms inside every
bound. Refused since the fourth review: the five roads of B1, the floods of B2, the
cascade-split and keyframe-carried outlines of the cap, the unpainted states of B3,
`:--open`, `all` in a keyframe and `visibility` in a keyframe (PT). Refused since
the third review: the states `:checked`, `:open`, `:popover-open`, `:visited`,
`:any-link`, `:fullscreen` (fail closed), and `color: inherit` (B2). Refused since
the fifth review: the underline, the column rule, the stroke and the path of B1, the
custom properties of B2 (`c1:8` among them, which was accepted as a stated gap), the
foreign keyframes of B3, the colour scheme, and the two states `data-format` and
`data-code` (`f1`–`f8` and `g1`); 13 older plants moved and are re-pinned with the
sentence kind they now carry, `b1:12` (an underline of 4px) from accepted to
refused. Moved by the sixth review: `f2:32` (a blur of 400px), `g1:98` (`--x: unset`)
and `g1:131` (a keyframe declared inside a media block, and run) from accepted to
refused; `q1:28`, `m7:17` and `b1:103` gained a second sentence kind. The 295 accepted
are each a control, a form that sets nothing, a reach the caps leave or a stated gap,
with the reason beside them.

**Not read, stated** (each a gap in the belt):

- **Contrast under a state.** An ink at alpha 1 can still equal its ground
  (`#fff` on a white card), and a ground can be the colour of the ink. The
  probe reads contrast at rest only.
- **The ring a rule at rest wrote in a clear colour, shown by a colour under a
  state**, up to what the cap leaves: an outline of 4px at an offset of up to 4px
  (or down to -8px) reaches 8px past its box, and `outline-color` under `:hover`
  shows it. The cap closed the unbounded ring (`outline: 200px solid transparent;
  outline-offset: -100px`, plant `w2:11`); what is left is the reach of a small one.
- **Reach.** An outer shadow reaches at most its 8px offset and its 16px blur
  (24px), in two layers; an inset one stays inside its box.
- **`filter: url()`** (the fifth review, "not verified"; plant `f2:7`).
  `filter: url(art/x.svg#dilate)` names an SVG filter, whose primitives
  (`feMorphology`, `feGaussianBlur`, an offset) this lint does not open, so a filter
  that grows or spreads the box's paint is not read; only a `drop-shadow()`'s colour
  is. Not checked. No shipped sheet writes one. **`filter: blur()` is capped since the
  sixth review** (above, "A blur is capped"; plant `f2:32` moved from accepted to
  refused): `backdrop-filter` is left alone.
- **A colour a state gives an element that a rule at rest moved over a figure and
  left clear** (the fourth review's P2, restated; plants `m4`). The move is an
  offset (`position: relative; top: 40px`), a negative margin
  (`margin-bottom: -60px`) or a transform; the element is clear at rest — a ground
  `transparent`, a border in `transparent`, an inset shadow in `transparent` — or
  its `color` is clear under a ground, a border or an inset shadow a rule at rest
  wrote in `currentColor`; and a state gives it a ground, a border colour, an inset
  shadow, or only `color`. A state's colours are on the list for an element and the
  probe reads an element at rest, so this half stands. The pseudo-element half is
  refused above. **The move can also be a growth, and a multiplier** (the fifth
  review's smaller item): an element that grows (`width`, `height`) or is scaled
  (`zoom`, `scale`, `transform: scale()`) multiplies what a capped ring, offset,
  stroke or underline reaches, because each cap is measured in the box's own pixels
  — `zoom: 40` on a box with the 4px outline at an offset of 4px reaches 320px
  (plants `f3:1`, `f3:2`, `f8:2`). The money lints refuse a scale on a money node
  and a keyframe that scales; a box that holds none is not read.
- **A colour read through a custom property** is closed at the declaration since the
  fifth review: no first-party custom property holds `currentColor` or `inherit`
  ("No custom property holds the ink", above), so a `var(--s-…)` a state rule
  accepts as a ground, an edge or a shadow colour brings in no ink.
- **A state written another way**: a class a script toggles, an attribute but
  the eight above (the six, and `data-format` and `data-code` but for their
  painted value: `[aria-pressed]`, `[disabled]`, `[aria-current]` and the
  others the fixtures paint are read as a rule at rest, which the probe measures:
  `[data-copied='shown']` by `addr-shown` and `[data-copied='true']` by
  `addr-copied`, both staged), and a structural pseudo-class, which is the tree at
  rest. **A value a look may match that no screen paints and the belt does not
  name** is on `UNPAINTED` in `layout/stateAttributes.test.ts`, pinned by value:
  the name ladder's six rungs (written after a layout measure, in Chrome).
  `[data-marquee]`, a presence attribute armed by a layout measure, is not on it: it
  is the presence test's one exception. The four groups the trace found in the fourth review are closed:
  `[data-code='false']` and `[data-format='square']`, `'story'` and `'stream'` are
  states, and `[data-tier='2']` is painted by the stream card's two fixtures.
- A transition (read only by the size lint, on a money node).
- **The kit.** The kit lint carries none of it.

**What the kit sees of this round** (one change, a fix of a hole on main): the
older pseudo-element refusals, and the `content` rule that reads which
pseudo-element a `content` lands in, read through a comment between the colons
and the name. `::/**/first-letter`, `::/**/marker` and `::/**/selection` got
past them on main, in the kit as in a first-party sheet; each is refused now,
as its plain spelling always was (`a-comment-inside-a-pseudo-class-is-still-the-pseudo-class`,
`the-older-pseudo-element-refusals-read-through-a-comment-in-the-kit-too`). The
older state list the file-mask refusal and the sticky-sign test read
(`STATE_PSEUDO`) takes the same whitespace and no more. Everything else of the
round is first party only.

**Judgements the allow-list needed that the decisions did not state**, for the
owner to keep or veto: `box-shadow` is bounded where D-2026-10-20-08 said "any
shadow" (a 4000px spread paints over the rows beside it when rows are grid or
flex items, which paint as atomic units in tree order, their shadows with them);
`currentColor` is refused as a ground, where the decision said a ground is "the
same rules as color", and as a shadow or an edge colour; a pseudo-element's
`color` is refused under a state and its host paint at rest, which the decisions
asked for in the pseudo-element's case. The money classes the size lint reads
are `MONEY_NODE_CLASSES`
(`the-money-node-classes-are-the-classes-of-the-money-nodes`), widened from the
ten it began with to every class a money node wears, `pay-line-s`,
`face-surcharge` and `sel-sub` among them since this round, and `another` out of
it (the pay sheets' hand-off button is a `mini another` button, and `mini` was
never listed). The scan reads the class a call hands `quoteSurchargeNode`, and
one a conditional chooses.

**The size lint, beside it** (D-2026-10-20-07). A keyframe named after an
animation keyword (`@keyframes ease`, run by `animation: ease 1s ease`) was
lost in the shorthand: the keyword went to the timing function both times
and the name was skipped, so the flash rule never read a strobe so named
(`parseSingleAnimation` now follows the shorthand's own rule: a keyword goes to
the first property that can take it, the second is the name, a quoted string is
always the name). A custom property in a `transition` list is read as `all` (a
registered one, `@property --au-tide`, animates by its type). **That change is
kit-visible in three ways, all in `workshop:lint`'s flash rule** (the third
review's P3): a quoted name is read as the name; an invalid shorthand loses a
false red it had; and `infinite 1s infinite` now names an animation (the second
`infinite` is the name). **`display`, `content-visibility`, `visibility` and `all` in a first-party
keyframe are refused** (D-2026-10-20-10 for the first two,
`a-keyframe-never-takes-a-box-out-of-the-layout`; D-2026-10-20-13 (3) for
`visibility`, the critic's PT — a keyframe `visibility: hidden` on a quote's
`.item-a`, delayed 120s and filled forwards, which this pass's one frozen instant
never reaches — read in capitals, with `!important`, inside a media block, and
through a custom property, which is refused in a keyframe on its own; and the
fourth review's smaller item for `all`, which re-states every property): a keyframe
that sets one takes a box out of the layout, or leaves it unrendered or unseen,
for part of a cycle. The cost is nil: no first-party sheet writes `visibility` or
`all` in a keyframe, and stall.css's pin demo is a base sheet and is not linted as a
look. The kit is unchanged. Still accepted in a keyframe (stated, plants `m7`):
`position`, `float`, `contain`, `overflow`, `height`, `max-height`, `order`,
`grid-area`, `z-index`, `mix-blend-mode` and `filter` (its `blur()` is capped since the
sixth review; the rest of a filter is as it was).
