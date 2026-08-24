# Stall

A per-seller storefront over [eCash Agora](https://agora.cash), at `/s/<seller>`.

Stall reads the chain and holds no key. It renders a seller's live Agora offers
as a shop page that can be shared as a link, and hands a buyer who wants to
complete a purchase to Cashtab, which signs.

**What it does not do.** It never mints, lists, signs, or holds a key. It cannot
tell that a purchase happened, and does not claim to: Cashtab's token page lists
every offer for a token and preselects the cheapest, which may belong to a
different seller — the buy sheet says so before you leave.

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

Node and pnpm versions are pinned in `.nvmrc` and `package.json`. Every runtime
dependency is a committed tarball in `vendor/`, packed from a Bitcoin ABC
checkout, so a build does not resolve them from a registry.

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm test
```

```bash
pnpm build
```

`pnpm build` type-checks before it bundles, so a type error fails the build
rather than shipping. Output is a static site in `dist/`.

## Layout

| Path | |
|---|---|
| `src/domain/` | Pure. No network, no DOM. |
| `src/net/` | Chronik and Agora reads. Never touches `document`. |
| `src/ui/` | Plain DOM rendering. Never imports chronik. |
| `src/keys/` | Empty, and deliberately not gitignored. |
| `public/` | `_headers` and `_redirects` for the host. |
| `deploy/` | The same policy in nginx form, for leaving that host. |

Those boundaries are enforced by a test, not by convention — see
`directory-walls` in `src/walls.test.ts`.

The CSP is derived from one constant, `CHRONIK_HOSTS`, and `src/csp.test.ts`
fails when the deployed copies drift from it. That is why `deploy/*.conf` is in
the repository: it is a fixture, not decoration.

## Working notes

The design specimens, the technical manual, the working contract and the roadmap
are kept out of this repository on purpose. They are working documents about
people, prices and plans, and they are not published. What survives them as
rules lives in the code and in the tests named above.

## Licence

Not chosen yet, so default copyright applies to this repository's own source:
no permission to use, copy, or modify it is granted until a licence is added.

Packages under `vendor/` are separate. They are MIT and belong to the Bitcoin
ABC project, and their terms travel with them.
