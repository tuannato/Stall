# Security

Stall is a shop window over a public chain. It reads eCash through chronik,
holds no key, signs nothing, and composes payment links that a buyer's own
wallet signs. That shape sets what a security report here can be about.

## What this origin promises

- **No key, no seed, no signing.** Nothing here can spend. Key derivation is
  stubbed out of the served bundle at build time and a test reads the built
  bytes to prove it (`built-bundle-has-no-key-derivation`).
- **Every composed payment pays the stall's own address**, read from the
  route and verified by hashing the recovered public key back to it
  (`every-composed-bip21-pays-the-stall-address`). No string from the chain
  or from a URL reaches a payee, an amount or a memo.
- **A strict Content-Security-Policy**, sent as a response header:
  `script-src 'self'`, no inline script, no `unsafe-*`, `connect-src` pinned
  to the named chronik hosts and the rate feed. Three copies of the policy
  are kept in agreement by a test (`src/csp.test.ts`).
- **Chain-derived text never reaches `innerHTML`.** Every string from a
  transaction is screened (`isLegibleText`) and lands through `textContent`.
- **Empty is never painted as unreachable, and our failure is never painted
  as a fact about the seller.** A screen that lies about money is treated as
  a security defect here, not a copy nit.

## What is in scope

- The app at `stall.cash` (`src/`), the per-stall unfurl at the edge
  (`functions/`), and the icon proxy Worker (`worker-icons/`).
- Anything that could make a wallet pay the wrong party or the wrong amount,
  make a seller sign an on-chain record under a false belief, execute script
  on this origin, or turn this origin's requests against a third party.

## What is out of scope

- The chronik nodes, Cashtab, the Agora plugin, CoinGecko and Cloudflare are
  other people's software; report their defects to them. Stall does treat
  a lying indexer as a threat it must not amplify, so a report showing Stall
  *repeating* a bad answer as a fact is in scope.
- Prices, stock and delivery are the seller's. Stall shows what the chain
  says and claims nothing about what arrives.

## Reporting

Please use GitHub's private vulnerability reporting on this repository
(**Security → Report a vulnerability**) rather than a public issue, so a
money-path defect is not published before it is fixed. Include the route or
the transaction shape that reproduces it and, where you can, the test name
that should have caught it — every rule in this codebase is meant to be
pinned by one.

There is no bounty. A confirmed report is credited in the commit that fixes
it, if you want the credit.
