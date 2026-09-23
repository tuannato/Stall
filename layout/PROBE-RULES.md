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
  card against the undated ones (`pay-xec` by geometry alone since 2026-09-05), and a two-chip name column against a track
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
- A **mood** must move the canvas ≥60 channel-points — the first Sun-faded
  moved it four and a buyer could not tell they were wearing it.
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
**4.05:1** (Rural under Sun-faded) against this pass's floor of 3. So the
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
looks bare and worn, and the skeleton — and all three rows read; on the
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

## The dash is the size of the figure (2026-09-23, the owner's D1)

An unbuyable offer (`isUnbuyable`) paints a dash where its figure would be —
on a shop row (`offerRow`), on the listing face and on a wall row and the
wall's Cycle card (`window.ts`). `.dash` read `--s-price-size`, which every
look's sheet overrides for the figure and not for the dash, and no fixture
carried an unbuyable offer (`minAcceptedAtoms` appeared nowhere under
`layout/`), so the mismatch was measured by nothing. The dash now wears the
figure's own class — `item-x` on a row and on the wall, `x` on the face —
and `.stall .dash.item-x, .stall .dash.x` restores everything but the size.
Measured after (every look, S1 → S2): the phone row 30/26/31 → 26/26/25px
(Modern/Neo/Rural), the desk row 30/26/31 → 32/32/31, the face → 34 on every
look at every width, the wall's Browse row → 39.68px at 1280 (46 at 1080 and
768), the wall's Cycle card → the card figure's clamp (up to 112px, 124 on a
tall screen).

**`the-dash-is-the-size-of-the-figure`** gathers, over each pass, the
computed `font-size` of every `.dash` and of every buyable figure
(`[data-role="price"]`, a row only at tier 0) by place — `row`, `face`,
`wall-browse`, `wall-cycle` — and by look with its worn state, and fails a
dash whose size is not every figure's in the same place, a dash with no
figure measured there, and a dash screen that painted no dash. Across
screens on purpose: the face and the Cycle card show one offer, so
`item-unbuyable`'s dash is held to `item-listing`'s figure and
`shop-window-cycle-unbuyable`'s to `shop-window-cycle`'s; the row and the
wall's Browse have both on one screen. **It also holds the dash's dress**:
the class lends it the figure's rules, so its colour must equal a swatch
painted `var(--s-muted)` in its own parent, its `text-shadow` and
`font-weight` its parent's, and its `animation-name` and `transform` must be
`none`. The door's deck is not a shop and is skipped. Fixtures:
`unbuyable`, `item-unbuyable`, `shop-window-unbuyable`,
`shop-window-cycle-unbuyable` (geometry only, state-screen variants; the
wall two ride the portrait and tablet passes too). **The comparisons are
counted** (`dashChecks`) and the runner requires at least one per place it
owes — row and face on the phone pass, all four on the desk pass
(`probe-coverage.mjs`, tested on its own in
`a-probe-rule-that-compared-nothing-fails-the-pass`).

**Proved red.** HEAD's dash put back (class `dash` alone, `.dash {
font-size: var(--s-price-size) }`) with HEAD's rows: every place red — the
dash 30/26/31px against a 39.68px Browse figure at 1280 and 46px at 1080 and
768, against 34px on the face, and Modern's phone row 30 against 26, the
incident the owner decided on. Only the dash rule's own `font-size` given
back: 21 failures, the face at both widths and every desk row (the phone
rows passed because the rows now state their sheets' figures, and the wall
because `window.css` sizes `.item-x` at (0,4,0) over the plant). The dress:
`.t-modern .item-p > .item-x { color: #ff0000; font-weight: 900 }` planted
in `theme-modern.css` — (0,3,0), later than stall.css, so it reaches the row
and wall dashes (a direct child of `.item-p`; the buyable figure is not) —
read "colour rgb(255, 0, 0), not the muted ink" and "font-weight 900, not
its parent's 400" on every Modern row and wall dash. The count: the Cycle
fixture's listing made buyable read "painted no dash" on every look and
"compared no dash with a figure on a wall-cycle" on the desk pass. (A
fixture merely renamed would not have: the rule reads the dash wherever it
is painted, so the dash still counts under another name.)

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
