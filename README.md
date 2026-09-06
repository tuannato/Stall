# Stall

A per-seller shop page over [eCash Agora](https://agora.cash), at
`/s/<seller>`. Live at [stall.cash](https://stall.cash).

Stall reads the chain and holds no key. A seller lists tokens in the Cashtab
wallet; Stall paints those listings as one page, with a name, a tagline and a
look the seller publishes as a small on-chain record, shared as one link. A
buyer who wants to complete a purchase is handed to Cashtab, which signs.

## What it does

- **Listings** — the seller's live Agora offers, priced as the covenant on
  chain encodes them. Buying happens on Cashtab's order book, which lists
  every offer for a token and may preselect one from another seller; the page
  says so before you leave.
- **Quotes** — the seller's own price for an item they deliver themselves,
  written on a token they minted and published as an on-chain record. A buyer
  pays the seller's address directly from their own wallet, with a memo naming
  the item. No escrow, no token changes hands, and the page never claims a
  delivery it cannot see.
- **A stream overlay** for OBS (`/s/<seller>?view=broadcast`), posters and
  images to print or share, a public activity feed of what the page saw
  arrive at the address, and two static guides at `/guide` and `/stream`.
- **Three looks**, chosen by a one-byte id in the seller's record. Colours,
  fonts and layout ship with the app; the chain supplies only which row.

## What it does not do

It never mints, lists, signs, or holds a key. It runs no backend, keeps no
account, sets no cookie and ships no analytics; the browser stores only
display preferences. It cannot tell that a purchase happened or that an item
was delivered, and does not claim to. There is no directory of stalls and no
name in the URL: a stall is identified by its seller's key, and found through
the link the seller shares.

## Identity and routing

The canonical identity is the seller's compressed public key, because that is
what the Agora plugin indexes offers under. A seller cannot read their own
public key out of Cashtab, so the route accepts either form:

- `/s/<66 hex>` — used directly.
- `/s/<ecash address>` — the key is recovered from any past P2PKH spend and
  verified by hashing it back to the same address. An address that has never
  spent cannot be resolved, and the page says so rather than guessing.

Listing on Agora is itself a spend, so anyone with a stall is resolvable.

## Build

Node and pnpm versions are pinned in `.nvmrc` and `package.json`. Every
runtime dependency is a committed tarball in `vendor/`, packed from a Bitcoin
ABC checkout, so a build does not resolve them from a registry.

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm build
```

`pnpm build` type-checks before it bundles, so a type error fails the build
rather than shipping. Output is a static site in `dist/`; `pnpm preview`
serves it with the deployed headers.

## Tests

```bash
pnpm test
```

Runs the app's suite and the icon Worker's own tests. Green means the runner's
own exit code was 0 and the summary line is in view.

```bash
pnpm test:layout
```

Paints every screen in every look in headless Chrome and measures the result:
nothing covers a price, a QR or the record a seller is about to sign; no page
scrolls sideways; every theme reaches the edges; text never spills under a
control; contrast is read from rendered pixels. It needs a Chrome, and a
missing Chrome is a failure, not a skip. The rules and the incidents that
earned them are in `layout/PROBE-RULES.md`.

CI (`.github/workflows/ci.yml`) runs the build and the suite on every push;
the layout probe runs on manual dispatch.

## Layout

| Path | |
|---|---|
| `src/domain/` | Pure. No network, no DOM. The wire formats, the money maths, the route. |
| `src/net/` | Chronik and Agora reads, the live socket. Never touches `document`. |
| `src/ui/` | Plain DOM rendering, the copy, the three theme sheets. Never imports chronik. |
| `src/keys/` | Empty, and deliberately not gitignored. |
| `functions/` | The Cloudflare Pages function that gives each stall link its own social card. Never reaches `src/ui/`. |
| `worker-icons/` | The token-icon proxy Worker, a sibling service with its own tests. |
| `layout/` | The layout probe and the offline showroom. Never served. |
| `public/` | `_headers`, `_redirects`, the two guides and the 404 page. |
| `deploy/` | The same header policy in nginx form, for leaving the host. |
| `vendor/` | Pinned tarballs of the Bitcoin ABC packages this app reads the chain with. |

Those boundaries are enforced by a test, not by convention — see
`directory-walls` in `src/walls.test.ts`.

The CSP is derived from one constant, `CHRONIK_HOSTS`, and `src/csp.test.ts`
fails when the deployed copies drift from it. That is why `deploy/*.conf` is in
the repository: it is a fixture, not decoration.

## Security

Stall holds no key and signs nothing; every payment link it composes pays the
stall's own address; the served script is `'self'` only; text from the chain
never reaches `innerHTML`. Each of those is pinned by a named test rather than
by a sentence. The full model, what is in scope, and how to report a defect
privately are in [SECURITY.md](SECURITY.md).

## Working notes

The design specimens, the technical manual, the working contract and the
roadmap are kept out of this repository on purpose. They are working documents
about people, prices and plans, and they are not published. What survives them
as rules lives in the code and in the tests named above.

## Licence

[MIT](LICENSE) for this repository's own source.

Packages under `vendor/` are separate. They are MIT and belong to the Bitcoin
ABC project, and their terms travel with them.
