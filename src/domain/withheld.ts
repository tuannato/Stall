import type { TokenMeta } from './state';
import { WITHHELD_NAMES, WITHHELD_TOKEN_IDS } from './withheld-data';

/**
 * Tokens this page will not paint — not a listing, not a quote, not a card.
 *
 * A backstop, by the owner's rule (2026-09-05). Cashtab refuses impersonating
 * names when a token is *created*; a wallet built to skip that check can mint
 * them anyway, and ABC keeps a blacklist of the ones that were. So the fence
 * here is theirs: the names Cashtab refuses at creation, matched with
 * Cashtab's own normalisation, and the ids ABC blacklists — plus the four
 * tokens the owner named, which have their own venues and rules. The lists
 * are data (`withheld-data.ts`, regenerated from a checkout by
 * `scripts/withheld-from-abc.mjs`); this module is the rule.
 *
 * Withheld is not unreadable: a withheld row is one this page chose not to
 * paint, counted under its own word and never among the records it could
 * not read.
 */
const NAMES = new Set(WITHHELD_NAMES);

/** Cashtab's `isProbablyNotAScam` normalisation: lower case, trimmed, spaces collapsed. */
export function normalizeTokenText(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .split(' ')
        .filter((part) => part !== '')
        .join(' ');
}

/**
 * Whether a token is withheld: its id is listed, or its genesis name or
 * ticker — normalised — equals a listed string. Whole strings only: a token
 * called "Firmament" is somebody else's. Compared raw, before the legibility
 * screen, because a hostile name is hidden either way.
 */
export function isWithheldToken(tokenId: string, meta: TokenMeta | undefined): boolean {
    if (WITHHELD_TOKEN_IDS.has(tokenId.toLowerCase())) {
        return true;
    }
    if (meta === undefined) {
        return false;
    }
    return NAMES.has(normalizeTokenText(meta.name)) || NAMES.has(normalizeTokenText(meta.ticker));
}
