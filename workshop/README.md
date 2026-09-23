# The Stall workshop

A kit for designing a look (or a decoration) for [Stall](../README.md) and
seeing it on every screen the app paints, on your own machine, before you
send it in.

A **look** is what a seller picks for their whole stall: palette, type,
shape, and a stylesheet that dresses the app's screens. A **decoration** is
an object a stall can wear inside one look — bunting along the top, rain
behind the page, a mood that moves the palette.

**The workshop is not open for submissions yet.** The kit is here so you can
try it and see how a look is built; this page will say when looks and
decorations can be sent in.

Everything below runs offline after one `pnpm install` (Node, pnpm and
Google Chrome or Chromium on your machine). Nothing in the kit reaches the
network: the kit's server only lets a page load from itself, so token icons
show as letters and the app makes no chain or price requests, and the
headless browser that takes screenshots and runs the measurements has every
outside host blocked.

## The commands

| Command | What it does |
|---|---|
| `pnpm workshop:start modern` (or `neo`, `rural`) | Copies one of Stall's looks into `workshop/` as your starting point: its stylesheet re-scoped to `.t-workshop` and its row as `look.json`. **Start here** — the untouched kit is a bare skeleton and does not pass the probe on its own. Refuses to write over a stylesheet with a rule in it, or a `look.json` you have changed. |
| `pnpm workshop` | Builds the app with your look and serves the showroom: every screen, your look, your moods and decorations, with a timeline to pause animations. Prints the address to open. |
| `pnpm workshop:shots` | Screenshots every screen × bare / every decoration worn / each mood × the widths Stall measures (390, 1280, and the wall and stream sizes), plus a contact sheet at `.workshop-dist/shots-out/index.html`. Prints the count before it starts. |
| `pnpm workshop:probe` | Runs Stall's layout probe on your look alone — the same rules Stall's own looks pass before they ship, in one to two minutes. Red means a rule failed; the message names the screen, the element and the rule. |
| `pnpm workshop:lint` | A quick read of your stylesheet for the rules below that need no browser. |

## Your files

- `workshop/look.json` — the look as data: `label`; `base`, the Stall look
  it starts from (`modern`, `neo` or `rural`); `palette`, colours as
  `[r, g, b]`; `fontIndex`, one of the three font stacks; `softness`, the
  corner radius in px; `shape`, numbers only (lengths in px and two font
  weights); the two price ladders, `tierCeilings` and `overlayTierCeilings`;
  and your `moods` and `decorations` as rows. The kit validates it before
  every build and lists every problem at once. It is data, never code:
  Stall does not run code from a submission.
- `workshop/theme-workshop.css` — your stylesheet. Every rule sits under
  `.t-workshop`.
- `workshop/art/` — your pictures, as SVG files named in lower-case letters,
  digits and hyphens, referenced from your stylesheet as
  `url(art/<name>.svg)`. They are served from the same site as
  the app; nothing is inlined and nothing is fetched from elsewhere.

## What is yours to decide

Any colour, measurement, composition or texture in your stylesheet. A look
does not have to resemble Stall's looks or share their proportions. The only
things that bind are the structure of the stall and the rules that keep a
buyer safe, below.

## What binds

Each rule says who checks it: **the kit** (you will see it fail on your own
machine) or **Stall at intake** (checked when you send your look in, until
the kit learns it).

**The page is the app's.** Your look changes how the app's own markup is
painted; it never adds, removes or reorders content, and never changes what
a control does. *(Stall at intake.)*

**Money is never covered, cut or faded.** These are protected: the asked
price, the seller's own quoted price, the surcharge lines, the figure a
buyer pays, the line items and totals of a combined payment, the exchange
rate and converted-price lines, the amount on an Activity receipt, every QR
code, the buy and pay controls, the seller's address, and the bytes of a
record a seller is about to sign. Nothing may paint over them at any width,
push them past the edge of the screen, or leave them below 3:1 contrast
against what is actually painted behind them. *(The kit — `workshop:probe`.)*

**QR codes stay black on white, with their quiet margin.** Only the box
around a code may take your look. *(The kit checks that nothing covers a
code; its colours and margin, Stall at intake until the kit learns it.)*

**No page scrolls sideways, and no words run under a control or past the
edge of their box.** *(The kit.)*

**No positioned `::before` or `::after`.** An absolutely positioned
pseudo-element has no box the probe can measure, so it is refused outright;
decorations are real elements or background paint. *(The kit.)*

**Motion comes from a menu, and stops when asked.** A decoration may move
with one of: `sway`, `drift`, `spin`, `crawl`, `breathe`, `fall`. Every
moving thing is stilled under `prefers-reduced-motion`, in a block that is
the **last rule of your stylesheet**. *(The kit checks the still state and
the last-rule position.)* Nothing flashes, and motion outside the menu is
not accepted. *(Stall at intake.)*

**Type.** Pick one of three stacks for the look: Inter (the only face Stall
serves, so it looks the same everywhere), a system monospace, or a system
serif — the last two are whatever the reader's device has, so their widths
differ between phones and computers; test at both widths. No new font files.
Text is never smaller than Stall's small-text scale (11 px for labels,
11.5 px for fine print), and every control keeps a 44 px touch target.
*(Stall at intake, until the kit learns it.)*

**Nothing loads from anywhere else.** No `@import`, no `@font-face`, no
`url(data:…)`, no `url()` to another site or to an absolute path — art is
referenced as `url(art/<name>.svg)`, a file in `workshop/art/` whose name is
lower-case letters, digits and hyphens. *(The kit — `workshop:lint`.)*

**Plain CSS.** Every selector under `.t-workshop`; at-rules limited to
`@media`, `@supports`, `@container` and `@keyframes`; no nested rules; no
escapes outside strings. *(The kit — `workshop:lint`.)*

**Keyframes are named `wk-…`**, so they never collide with Stall's own.
*(The kit.)*

## Moods

A mood moves the palette and nothing else: background, surface, text,
muted, accent, second accent, shade. It must move far enough for a buyer to
see it — today, the background and surface together by at least 60 points of
summed RGB difference. A mood adds no class to the page, so anything that
must change with it is written in the look's colour tokens (`var(--s-…)`).
*(The kit.)*

## Decorations

A decoration is a row in `look.json` and a rule in your stylesheet:

- **A slot** — where it lives: `fringe` (along the top), `crest` (under the
  seller's name), `badge` (on the sign, in flow or at a corner), `yard` (a
  band above or below the sign), `trim` (behind the whole page), or `mood`.
  One decoration per slot is worn at a time.
- **A place** — the words a seller reads for that slot in your look ("along
  the awning", "behind the page").
- **A class** starting with `att-`, and whether it paints as a **node** (a
  real element the probe measures — anything with a box or that moves) or on
  the **root** (paint that cannot leave the element it sits on: rays, rain,
  a band).
- **Sizes stated in terms of `--s-decor-scale`**, so the same decoration
  works on a phone and on a shop's wall screen at twice the size.

Colours for root paint come from the look's tokens, so a mood carries them.
An object's own drawing may keep its own colours.

**SVG files** are re-written at intake through an allow-list: `path`,
`rect`, `circle`, `ellipse`, `polygon`, `polyline`, `line`, `g`, `defs`,
`use`, `clipPath`, `mask`, `linearGradient`, `radialGradient`, `stop`,
`filter` and the `fe…` primitives `feGaussianBlur`, `feColorMatrix`,
`feTurbulence`, `feMorphology`, `feComposite`, `feDisplacementMap`, their
geometry, paint and filter attributes, and references to ids inside the
same file only. Anything else is removed: scripts, styles, text, images,
links, animation elements, event attributes and outside references. Draw
text as paths.

## Sending it in

Two ways to reach the owner, whichever suits you:

- **GitHub** — open a discussion in this repository's **Workshop** category.
- **Telegram** — [@Tuannato](https://t.me/Tuannato).

Start with one line on the look's scene and up to three reference pictures.
**Do not open a pull request here** — this repository is public. If Stall
wants to go ahead, you will be asked to share a private repository with the
owner's GitHub account (or send a zip) holding `workshop/`, your shots, and
a one-page note on what the look is.

Stall is only ever reached through the two accounts above. Nobody working on
Stall will ask you for a seed phrase, a private key, or a payment to review
your work — anyone who does is not us.

## What happens next

1. An agreement: the licence (you keep your copyright; Stall receives a
   non-exclusive licence to ship and maintain the look), credit, and the
   money terms.
2. Intake: an automatic check of the package — shape, sizes, every SVG
   through the allow-list, every string legible, the probe and the shots.
3. A dry run and a ledger: every place where what you designed and what can
   ship differ, with the rule behind it. A rule that refuses a safe design
   is treated as Stall's defect to fix, not yours.
4. The port: Stall writes the shipped stylesheet from your design under its
   own tests, and you sign off on the result from the same shots.
5. Release.

Intake, the dry run and the port are carried out with AI agents working
under Stall's review, so your files are processed that way.

## Licence

The kit is part of Stall and under the same MIT License as the rest of this
repository. A look or decoration you send is covered by its own agreement,
not by this licence.
