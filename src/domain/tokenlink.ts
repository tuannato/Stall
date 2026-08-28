/**
 * The homepage a token's minter wrote into its genesis.
 *
 * CLAUDE.md §4 already says what this field is: "genesis carries a
 * seller-supplied `url` (a homepage, not an image) and a hash, and neither
 * reaches an image source." Showing it as a link is the use it was named for.
 * Loading it is not, and neither is trusting it.
 *
 * **This string is written by whoever minted the token, and nobody else checked
 * it.** It is on chain, which makes it permanent, not true. So:
 *
 * - Only `http:` and `https:` survive. A `javascript:` href is script execution
 *   from a stranger's genesis field, which is an XSS with a permanent payload;
 *   `data:` and `blob:` are the same trick wearing another scheme. Parsed with
 *   `URL`, never sniffed with a prefix match, because `\tjavascript:alert(1)`
 *   and `JaVaScRiPt:` both defeat a string test and both still run.
 * - It is capped. A kilometre-long href is a layout attack on a card that has
 *   to keep an asked amount readable.
 * - The caller shows the text and asks before it opens anything. A link a
 *   reader did not choose to follow, from a source nobody verified, on a page
 *   about money, is a phishing surface — so the destination is printed in full
 *   and the reader confirms.
 *
 * Pure: no DOM, no fetch. It decides what a link may be, never what happens.
 */

/** Longer than this and it is not a homepage, it is a payload. */
export const MAX_TOKEN_URL = 512;

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * The URL if it is one this app will offer to open, otherwise `undefined`.
 * Returns the parsed, normalised form so what is displayed is what is followed
 * — printing the raw string and opening the parsed one is how a reader is shown
 * one destination and sent to another.
 */
export function tokenUrl(raw: string | undefined): string | undefined {
    if (raw === undefined) {
        return undefined;
    }
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.length > MAX_TOKEN_URL) {
        return undefined;
    }
    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        // Not absolute, so there is no destination to name. A relative string
        // would resolve against *this* origin, which would dress a stranger's
        // genesis field as a page of ours.
        return undefined;
    }
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
        return undefined;
    }
    // A host is what makes it a homepage. `https:///path` parses and has none.
    if (parsed.hostname === '') {
        return undefined;
    }
    const href = parsed.href;
    return href.length > MAX_TOKEN_URL ? undefined : href;
}

/**
 * The host alone, for a reader deciding whether to follow it. The full href is
 * shown too — this is the part a person actually recognises, and the part a
 * lookalike domain gets caught by.
 */
export function tokenUrlHost(url: string): string | undefined {
    try {
        return new URL(url).hostname;
    } catch {
        return undefined;
    }
}
