# AGENTS.md — how we work on Stall

The working contract between **tuannato** and any agent. `CLAUDE.md` is the
technical remainder: what this codebase currently *is*. This file is *how we
work*, and it stays true even if `src/` is empty.

Neither file is a changelog. History is `git log`.

---

## 1. Who decides

| | tuannato | Agent |
|---|---|---|
| Product, scope, taste, what ships | Owns it | Argue once, with evidence, **before** the edit |
| How the code actually works | — | Read it. Cite a symbol and a file, never a line number |
| Bug fix vs behaviour change vs feature | Confirms | Classify first. Wiring a path is a behaviour change |
| Keys, secrets, domains | Owns it | Never print, commit, or invent |
| The diff | Approves the plan | Implement only the approved bullets |

After a decision is made: implement it and stop re-arguing. If it then breaks,
report what broke and the options — do not unilaterally reverse the call.

**Push back before the edit.** Scope discipline governs the diff, not the
thinking. A plan, an audit finding, and a design handed to you are inputs to be
tested, not instructions to be executed.

---

## 2. How a turn works

- **Internet off until asked.** Any network call needs a yes first.
- **Conversation Vietnamese. Code, comments, commit subjects English.** Always.
- **Plan → confirm → code** for anything touching money, behaviour, or
  architecture. A typo does not get a ceremony.
- **Name what you did not verify.** Silence about coverage reads as coverage.

---

## 3. Claims are allegations until you re-read the source

Every load-bearing claim gets re-verified before it is acted on — including
claims from a previous session, from a subagent, and from these files.

This is not caution. In the session that produced this repo:

- a plan cited four call sites; there were five
- a review's lint premise was factually wrong
- a "zero grep hits" claim was one hit
- a collision-probability argument was wrong on the arithmetic
- every line-number anchor died the moment the source tree was re-extracted

A sentence in a manual that says something is safe is the reason nobody
re-checks it. When you write one, cite what enforces it.

---

## 4. False signals

A false signal looks like evidence but measures something else. Three shapes,
all hit in one session:

**The wrapper's exit code.** `pnpm test | tail -35` printed exit `0` while the
suite was red — the code belonged to `tail`. A subagent hit the same thing
through `head` and SIGPIPE. **Read the runner's own exit status, never a
pipeline's.**

**The quiet reporter.** The test script appends `--silent` by default, and a
coverage table pushed the failure out of view. The screen looked clean.
**Confirm the failure text was in view before calling anything green.**

**Preserved mtimes.** `tar` and `unzip` keep original timestamps, so a tree
written to disk minutes ago reads as days old. "Newest file is two days old"
was used to conclude a tree was settled while it was being overwritten.
**mtime is not a clock for when something arrived.**

Never treat a pager, a parent process, or a file timestamp as a test result.

---

## 5. Do not inherit from eCash-Live

An agent arriving from the eCash-Live project will import its constraints. They
were right for a static, dependency-free, read-only dashboard. Stall bundles npm
packages and will hold keys. Specifically **do not** bring:

- **Length as thoroughness.** A 3,000-line manual is how a two-line rule gets
  missed. These files have caps.
- **A version ledger inside the manual.** Current state is overwritten, never
  appended.
- **`PROJECT_INDEX.md` and "index first every session."** That patched a single
  22,000-line inline module. Stall is files you can grep. Keep it that way.
- **No-build / inline-module / CSP-hash ritual as identity.** A strict CSP is a
  value; `update-csp-hash.sh` is a mechanism for a problem Stall does not have.
- **Two doors, one truth.** Stall is one product with staged capability.
- **Relay, bot, VPS, systemd, TPS rings, mirrored percentile math.** Wrong domain.
- **Copying any file out of `eCash-Live/vendor/`.** See §6.
- **Hand-rolled cashaddr, `Number()` on satoshis, `innerHTML` + `escapeHtml` as
  the whole XSS model.** All load-bearing there, dangerous here.

Keep the *discipline*, not the machinery: no third-party runtime scripts, cap
every buffer, a failed page is a hole and not coverage, omit rather than invent.

---

## 6. No shared files with eCash-Live

**No file in Stall may have its bytes originate in `eCash-Live/vendor/`.** No
Stall test may import from that repo. There is no "temporary copy to get
started" — that *is* the fossil, and it has already happened once over there.

The concrete reason, not just the principle: those modules import each other
with GitHub Pages cache-busters (`./match.js?v=7`). A bundler does not resolve
that as the same module, so a copy needs an edit on day one — divergence before
Stall has a feature.

If an invariant must travel, it travels as **a named test in Stall**, written
against Stall's own types.

One narrow back-flow is allowed, Stall → eCash-Live: a parser defect found on
real mined transactions that the dashboard still renders wrong. Form: a hex
fixture plus a patch, by hand, as a PR. Nothing else. No shared package, no
shared CI, no sync script.

---

## 7. Money, from day one

**Treat every commit as if this repo already holds keys.** Stage 1 has none.
Stage 1 is exactly when someone adds a logger "temporarily".

- Never log, print, commit, or paste a mnemonic, seed, xprv, WIF, or raw
  entropy. Not in a fixture, not in a screenshot, not to test the UI.
- No backend, no accounts, no custody, no analytics, no error-reporting service.
  A storefront that becomes a wallet cannot grow a server that might see a seed.
- **A CDN is accepted only while this origin neither holds a key nor asks a
  wallet to send.** Whoever serves the document decides what the visitor runs,
  and the buy control is a payload byte: a rewritten origin retargets it without
  touching a seed. Leave the CDN the day any of these becomes true — keys here,
  any `send` verb wired to an extension, or a control this origin composes that
  moves money. `PLAN.md` names the current host and that condition.
- Separate domain from ecashlive.net. That site tells people in amber text that
  it never sees their seed phrase. That sentence cannot travel here, and reusing
  its branding around a key screen is how you build a well-designed phish.
- Generating a seed is the dangerous moment. **A stall renders without one.**
  Never create a mnemonic as a side effect of rendering a page.
- Pin dependency versions the day they are added.
- You are a wallet vendor to anyone who loses money, including from their own
  backup failure. There is no recovery email. The second backup confirm says
  so on screen: Stall is not responsible if the words are lost or forgotten.

Mechanism lives in `CLAUDE.md`. This section is the ethic, and it applies now.

---

## 8. How to write a rule that ages

Bind a rule to something that survives a rewrite:

- a **symbol** — `ALLOW_BUYS_ABOVE_SPOT_RATIO`, `activeOffersByPubKey`
- a **module** — `src/domain/manifest.ts`, not `:412`
- a **behaviour in English** — "the remainder of a partial fill is a new UTXO,
  so a seller-pinned link survives and an outpoint-pinned link does not"
- a **test name** that fails when the rule breaks

**Banned in both files:** `file:line` anchors, line counts, current hashes,
"as of DATE this file is N lines", and cross-reference webs that need the whole
document loaded to follow one rule.

**Tests are the durable form of a footgun.** The manual points at the test and
says why it exists. Once that pointer works, the story is eviction fodder.

---

## 9. What "done" means

- Syntax checks prove syntax. Nothing else.
- Green means the runner's own exit code was 0 **and** you saw the summary line.
- A UI change is exercised, not screenshotted.
- Say what you did not test. "Proven by mechanism, not observed" is a real
  result; silence is not.

---

## 10. Eviction

**These files shrink on purpose.** When a footgun gets a test, it leaves
`CLAUDE.md`. When a war story becomes a one-line rule, the story leaves this
file. If either file hits its cap, cut examples — never rules.
