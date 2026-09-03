/**
 * The one place this app names a block explorer.
 *
 * An activity row is a citation: it says a transaction happened at this
 * address, and a reader who wants to check that needs somewhere to check it.
 * A public explorer is where the chain is already readable — linking to one is
 * pointing at the record, not sending anyone to a market (§2's rule is about
 * `action=BUY` deep links, which sell somebody else's tokens on a per-seller
 * stall; nothing here can transact).
 *
 * **A hostname is a decision, so it lives in a constant with a test.** Built
 * inline in a renderer it would be edited in the one file nobody greps for a
 * host, and a link on a money page that quietly changed where it goes is the
 * shape of a phish. `explorer-url-is-a-constant-not-a-string-built-in-render`
 * is what holds that.
 *
 * No CSP change: an anchor is a navigation, not a fetch, and the policy carries
 * no `navigate-to`. The caller adds `target="_blank"` with
 * `rel="noopener noreferrer"`, the house pattern, and the origin already sends
 * `Referrer-Policy: no-referrer`, so the explorer is not told which stall was
 * being read.
 *
 * Pure: no DOM, no fetch. It decides what a link may be, never what happens.
 *
 * Shape measured 2026-09-03 before it shipped: `curl -I
 * https://explorer.e.cash/tx/<a real txid>` answers `HTTP/2 200` with
 * `content-type: text/html` and no redirect; a txid that is not on chain
 * answers 500. So the path is `/tx/<txid>` with no trailing slash and no query.
 */

export const EXPLORER_TX_BASE = 'https://explorer.e.cash/tx/';

/** 64 lowercase hex, and nothing else. */
const TXID = /^[0-9a-f]{64}$/;

/**
 * The explorer page for a transaction, or nothing when the string is not a
 * txid.
 *
 * **Gated for the same reason `chronik.tx()` is** (§5): that call concatenates
 * whatever it is given into a request path and never checks it. An href is the
 * same hazard pointed outward — a `../` or a query smuggled into the path
 * builds a link to somewhere this app never chose. `UNKNOWN_TXID`, the burst's
 * stand-in for a message that named no transaction, is refused by the same
 * rule: it names nothing to cite.
 */
export const EXPLORER_TX_URL = (txid: string): string | undefined =>
    TXID.test(txid) ? `${EXPLORER_TX_BASE}${txid}` : undefined;
