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
  constant is updated — and no other job may read lower. A line read at the
  worst with no sample fails, named. The limit, stated: another seller's
  words can put a glyph beside a lit window or a star, where the ring reads
  as low as those numbers — and the flat layer is the brightest paint over
  the whole sky band, so it is a bound over every placement of a light. The rain
  stays flattened as a fail because its drops cross every glyph within one
  drift; the horizon's lights are static and sparse. The critic's pure test
  ("every art paint half covered by the one-pixel ring clears 3:1") is not
  added: it fails by design — 2.71:1 for the tagline's pink over half the
  white star — which is the limit accepted. 77 jobs, 20.6 s (phase `horizon
  worst`). The runner owes five jobs by name (`HORIZON_REQUIRED`). Before the lamp carried the outline its bare letter read
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
  each of Inter, Stall Serif, Stall Serif italic and JetBrains Mono. What no
  served face draws today is pinned, each with where it prints: `≈` (the
  unit rate under a listing and the pay sheets' rate row,
  `[data-role="rate"]`, a money node), `→` (`DESC_SUB`, the first-stall
  checklist's "Share your link" step, `OBS_RECIPE_SOURCE`), `◆` (the
  ticker's separator, `GENERATED_TEXT`), and `元 ₹ ₪ ₩ ₦ ₱ ₺ р` (a quote's
  `seller-price`, a money node, in CNY, INR, ILS, KRW, NGN, PHP, TRY, RUB).
  Each is drawn by a font of the reader's machine, so differently per OS,
  and the probe measures this Mac's. Whether to re-subset the faces for
  them is the owner's call; the list is the statement until then. A second
  pinned list holds the code points a face's `unicode-range` names on its
  own that its file lacks — Fontsource's family ranges are wider than the
  subsets: `₫` in Stall Serif's two Vietnamese files, `↑ ↓` in its two
  Latin ones, U+2215 in Inter's Latin, U+0329 in all eight, U+FFFD in the
  four Latin files of Inter, Stall Serif and JetBrains Mono — none printed
  by the app today (VND prints `đ`), which the test holds too.

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
- **A private clone not at the pin** is not refused (no `STALL_LOOKS_DEV`,
  no "not a deployable pair" verdict): the pin is 8c's.
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
default run) and each proved red by a plant. The three looks paint none of
it, so their verdicts and their `looks:diff` stay what they were.

### The seller's name stands whole (`the-sellers-name-stands-whole`)

**The incident it answers** (CRITIC-STEP-8 item 10): DECISIONS D4 measured a
32-byte Latin name in a look's vertical column running off the bottom of a
wall — its last letters gone — and no rule could fail on it: `text-spills`
reads a box whose overflow is visible and a width, `cutSideways` is
sideways by design, the line reads clip their rects to what shows, and the
name is no protected box. A cut name is an absent one.

**Now**, on every screen, look and variant of every geometry pass, every
line of the sign's name and tagline (`.stall-head .stall-name`,
`.stall-head .stall-tagline`; each text node's line boxes, a Range's client
rects) must stand whole on both axes inside every clip from its own box up
to the viewport — `nothing-on-the-wall-is-cut-from-below`'s shape: a clip
(`overflow` hidden or clip, the element's own included) holds the line
whole; inside a box that scrolls on that axis the line is reachable, and
from there up it is the scroller's showing part that must be able to hold
it; the viewport scrolls down when the page does, never sideways. **A line
is its line-height's slot**, not its face's content area: under a
line-height tighter than the face (the wall's 1.02, Inter at 1.15) every
content area runs past its slot by design with every glyph inside it — the
first run read every fixture name on a wall as cut by 2–3px of content area
(`35–56 inside 37–55`). The slot is centred on the content area, as CSS
places the half-leading, and runs across the width in a vertical writing
mode; a line's trailing letter-spacing is no glyph. Counted per look
(`nameLinesByClass`) and owed on every page and wall pass for every look it
painted; the rungs a name climbed are counted too (`nameTiersByClass`).
Not read: a name inside a turned wall (`[data-turn]`, axis-aligned rects of
a rotated paint) and the door's deck minis.

**The ladder's fit was the same mistake** (a finding, fixed in
`src/ui/lookHooks.ts`'s `realFits`): it asked the box's own scroll size,
which counts the content areas past the slots, so a two-line name standing
whole in a box two lines tall read as overflowing and climbed a rung it did
not need — measured on the fixture's desk sign, 44px over 50.6px slots,
`scrollHeight` 103 against 101, and `a-shipped-row-states-the-sizes-its-sheet-paints`
then read the fixture's name at 18px against the row's 44. When the box's
own answer is no, the lines are now asked, slot by slot, by the measure
above. Inert on the three looks (no `--name-rungs`, never asked).

**The shipped looks**: no failure on any screen, the new stress screens
included — a 32-byte name wraps on every look and the sign grows.

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
protected box in none of the sticky box's columns can never pass under it
and is asked at the shelf stops alone; the region is put back where it
was. Counted per look (`stickyByClass`: paints with a sticky sign, paints
whose region scrolled, stops); a page pass that found a sticky sign owes
it a region that scrolled. The fence is deleted; its replacement test
holds the two lists to one and the tracked fixture to having a sticky
sign, and no public look sheet to having one.

### No look mark paints inside a protected box (`no-look-mark-paints-inside-a-protected-box`)

A mark a look shows is an in-flow node: a negative margin or a relative
offset moves its paint over a figure while every box the geometry passes
read stands clear; with `pointer-events: none` the five-point hit test
reads straight through it; and it carries no `att-` class, so the box sweep
never asks it (STEP-8-PLAN §5, dry-run D6). So it is measured the look
pseudos' way (D6(i), "No look pseudo paints inside a protected box"): the
prepare counts the marks the job's scope shows (`lookMarks`), and the
runner compares a frame with them shown against one with every mark at
`visibility: hidden`, inside every protected box, a device pixel in, at
`LOOK_PSEUDO_LEVELS`. **One frame hides the look pseudos and the marks
together** where a job has both (`__lookPaintHidden('both')`), so a passing
job pays the two captures a job with look pseudos alone always did; only a
frame that moved is taken again with each hidden alone, to say which
painted there. On the geometry
passes a mark a carried private look shows is still held to be the
renderer's empty, aria-hidden node (`no-shipped-look-shows-a-mark` keeps
the display read for every other look), and counted (`marksShownByClass`).

### A word reads when the art does not load (`a-word-reads-when-the-art-does-not-load`)

**The incident it answers** (CRITIC-STEP-8 item 11; owner question 2): a
file can always fail to load — a flaky line, a tab older than a deploy —
and a mask image that has not loaded is transparent black by the spec, so a
box a look masks with its own art paints nothing at all. `no-word-is-clipped-by-a-file`
keeps a file's mask off every box with words, but a ground under words
drawn by a masked pseudo is what a look of washes and masses is made of
(`fileClipFaults` reads elements only, the critic's own note), and with its
file gone the words stand on whatever is left.

**Now**, on every contrast job whose scope paints file art, the prepare
marks every element and every `::before`/`::after` whose computed mask
image, mask border source or `clip-path` names a file (`markFileArt`: the
masking rules found in the CSSOM, their hosts matched, each read computed),
and writes the sheet that fails exactly that art as a failed load leaves
it — each mask image's `url()` layers turned to an image of transparent
black (`FAILED_LAYER`, `linear-gradient(transparent, transparent)`: the
spec's own failure; gradient layers and compositing kept), each file mask
border source `none`, each file `clip-path` `none` (a reference that does
not load is as if none were given). **Never `none` for a mask layer**: the
first red proof read green because of it — a mask whose every layer is
`none` is no mask at all, so the "failed" mass painted whole, dark, behind
a name in the paper's ink, where a failed file paints nothing. The runner reads every
target again on that frame by the reader it was read by — a line by its
line rects, money whole, an outlined line in its ring on a second frame
with its glyphs shown — and every one must clear the floor; a frame that
failed is taken again once before it is believed. The masking rules are
found by their longhands and their shorthands (a shorthand holding a
`var()` leaves its longhands empty in the CSSOM). Asked only where file
art is painted: no shipped look paints any, so the rule costs the public
run nothing (`fileArt` echoed per job; `artOff` in the dump). **Not
switched off, stated**: a `background-image` or `border-image` file that
fails leaves the element's colour standing — a look whose words need the
picture over a different colour is not seen here; and a `url()` a custom
property carries is read computed, so it is seen.

### The stress names: CJK, 32 bytes on every wall composition, and on a try-on

New screens, geometry only and bare and all worn (`STATE_SCREENS`,
`GEOMETRY_ONLY_SCREENS`): `cjk-name` (nine ideographs, 27 bytes, and a CJK
tagline — `data-script="cjk"`); `shop-window-long-name` and
`shop-window-browse-long-name` (`hostile-name`'s 32-byte `W`s, now
`LONGEST_NAME`, on the Cycle card and in Browse at the desk) and
`shop-window-wall-long-name` and `shop-window-wall-browse-long-name` (the
same at 1920x1080), and `shop-window-cjk-name` — every one of them on the
portrait wall and the counter tablet too (`WINDOW_SCREENS`). The CJK glyphs
are the machine's fallback face (no CJK face is served): those screens
measure a per-OS layout, as the plan states for a CJK name.

**On a try-on** (the 8f1 critic's item 6): every carried private look is
painted through the try-on already (`paintView`), but as a whole paint; a
seller who tries a look on from the name sheet gets `showLook`'s `put`,
which patches the look onto the stall behind the sheet and chooses the
name's rung there. So on every pass that measures `publish-name`, for each
carried look and each stress name, the sheet is painted over the default
look with that name, the look's own picker button pressed, and the stall
behind held to wearing the look and to its name standing whole
(`tryOnNamesByClass`, owed per carried look on the page passes).

### What the tracked fixture carries, and what a run owes

The fixture's sheet gained, each scoped as narrowly as its rule needs:
a name ladder (`--name-rungs: 2`, a bounded name box — 72px on a phone,
110px at the desk where two lines of its 44px name stand — rungs at 18 and
12px, and a letter-spacing under `data-script="cjk"`), at every width; and
at the desk only, off the wall: the sign sticky in a column of its own
(`grid-template-columns: 380px minmax(0, 1fr)` on the scroller, the rows as
tall as what they hold — an auto row in a scroller of definite height
shrank a body whose minimum height is 0 and the footer painted over the
goods, the first run's 58 failures), a dot after every row's figure (the
figure mark), and a mass masked by its own file (`art/mass.svg`) behind the
name, light enough that the name reads on the paper when the file does not
load. A run that carries the fixture owes each subject
(`TRACKED_FIXTURE_CLASS`, `probe-coverage.mjs` and the runner): a region
scrolled under its sticky sign and a mark shown at the desk, a rung
climbed on both page passes, a mark hidden and file art failed on some
contrast job — so an edit that took a subject away fails the run.

**The fixture's own tallies did not move**: line skips 16/10, 4/8, 205/0
(`CARRIED_LINE_SKIP_CEILING` unchanged); points behind a clip desktop
261/2230 (12%).

### Proved red

Two runs of plants on the tracked fixture (a commit object of the planted
sheet, selected by `STALL_LOOKS_COMMIT`) and the code, each reverted:

- **Run A**: the fixture's sign widened across both columns
  (`grid-column: 1 / -1`), the ladder off (`applyNameTiers` returning at
  once), the zoom plant above with the reset's `!important` off the mask
  and radius, and a tile mark 8px wider than its tile with
  `a-tile-shows-its-letters-whole` reading the whole tile again.
  `a-sticky-sign-covers-nothing-as-the-region-scrolls` 65 at the desk —
  "header.stall-head stands over a.buy by 583x51px with div.stall-scroll
  scrolled to 439 of 643"; `the-sellers-name-stands-whole` 19 (phone 7,
  desk 3, tablet 8, reduced motion 1) — "hostile-name: … a line at 83,111 is
  cut from below or above by its own box (h1.stall-name): 10 of its 31px
  show", the name sheet's try-on of the 32-byte name among them — and the
  coverage gap "read no t-fixture-private name on a rung of its ladder" on
  both page passes; the zoom's mask and framing 10 each; the tile rule 1,365
  — which is the red proof 8f1's `.ic-initials` change was owed: a tile
  mark a look shows lends its box to the letters' extent ("spans 52.0×52.0px
  in a 44×44px box"). Every failure the fixture's; no shipped look's.
- **Run B**: the figure mark pulled over the price and out of the hit test
  (`margin-left: -40px; pointer-events: none`), the mass in the text's ink
  with the name in the paper's over it and nothing under the two, and the
  zoom and tile plants of run A kept with the probe and stall.css as they
  are. `no-look-mark-paints-inside-a-protected-box` 62 — "span.item-x at
  1094,233 changes 24 px when the look's marks are hidden" — while "asked
  amount is covered" read 0 (the hit test reads through `pointer-events:
  none`, which is why the capture exists); `a-word-reads-when-the-art-does-not-load`
  60, every art-off job — `offers`' name at 1.17:1 — and on 20 of those
  screens the ordinary read of the same name passed (the others' names run
  to the mass's ragged edge and failed it too); the zoom's mask and framing
  0, and the tile rule 0. **The first run B read the art-off rule green**:
  the failure layer was `none` (above), now `FAILED_LAYER`.

### Measured

This Mac, 2026-10-06, back to back with `main` (1bcdf58, a worktree):
`pnpm test:layout` **171.0s on main, 189.4s here (+18.4s)**, under the
240s shard line. Where it went: the geometry passes +2.3s together (the
name read on every paint, the scroll pass over the fixture's 53 desk
paints whose region scrolls — 146 stops — the five stress screens and the
try-on job); the contrast pass +16.2s — the look-paint frame on 60 more
jobs (the fixture's desk jobs, whose masked mass is a look pseudo; 30 of
them show marks too) +9.0s, and the art-off frame on the same 60 jobs
+7.3s (1,046 targets read again). No public job gained a capture. The
contrast dump: 13,214 boxes on both sides, 12,997 identical, 217 moved, 0
added or removed — every moved box the fixture's (its desk sign in a
column of its own moves its rows), every public look's identical. **What
a look showing every hook on every job costs**: on the fixture's numbers
about +0.3s a job (one look-paint frame, one art-off frame), so a look
measured on ~140 jobs adds ~40s — 8g's to measure on Ink wash, and the
first lever if the run nears 240s is the stress screens' and the
fixture's scope, not the rules.
