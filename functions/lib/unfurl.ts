/**
 * The pure half of the unfurl: what a stall link says about itself before
 * anyone opens it. Without a wallet the shared link is the whole product
 * (CLAUDE.md §9), and until this existed every /s/<seller> unfurled as the
 * same generic platform card.
 *
 * Everything here is string work on the seller parameter — no chain reads,
 * so there is nothing to fail, nothing to rate-limit and nothing to cache.
 * It does import `p2pkhHashFromCashaddr` from `resolve.ts`, which is the
 * module that DOES read the chain: the function itself is arithmetic on the
 * string (charset index, polymod, a 5-to-8-bit regroup) and reaches no
 * network, and sharing it is what makes this card and that walk agree about
 * an address by construction rather than by two rules that happen to line
 * up. Said out loud because "the pure half" would otherwise read as a claim
 * about the import graph, which it is not (2026-09-20). `resolveStallName` in the function is the socket the manifest name
 * arrives through later; when it answers, the name goes through the same
 * legibility screen the app's own decoder uses, imported from the one module
 * that owns it.
 */
import { isLegibleText } from '../../src/domain/text';
import { p2pkhHashFromCashaddr } from './resolve';

/** Same ceiling as the manifest decoder: longer is not a name we show. */
const MAX_NAME = 32;

/**
 * The seller as the route carries it, bounded and classified — never
 * trusted. `undefined` means "say nothing specific": the generic card is
 * always safe, and a p2sh address gets it on purpose — a script address
 * cannot be a stall, and a card promising a shop there would be the app's
 * own screen contradicted by its own unfurl.
 */
export function sellerIdentity(raw: string): string | undefined {
    let param: string;
    try {
        param = decodeURIComponent(raw);
    } catch {
        return undefined;
    }
    if (param.length > 120) {
        return undefined;
    }
    if (/^[0-9a-fA-F]{66}$/.test(param)) {
        const hex = param.toLowerCase();
        if (!hex.startsWith('02') && !hex.startsWith('03')) {
            return undefined;
        }
        return `${hex.slice(0, 6)}…${hex.slice(-4)}`;
    }
    const addr = param.toLowerCase().startsWith('ecash:')
        ? param.slice('ecash:'.length)
        : param;
    /*
     * p2pkh only — a script address (p…) is not a stall and gets no card —
     * and the checksum, not the shape (2026-09-20).
     *
     * This tested `/^q[a-z0-9]{41}$/`, which has no checksum term and is
     * wider than the cashaddr charset besides (`b`, `i`, `o` and `1` are not
     * in it). So a link with one character flipped — the ordinary way a
     * shared address goes wrong — unfurled as a per-stall card naming that
     * address and asserting a seller's shop is there, and then opened on
     * the app's own "this link is unreadable" screen. That contradiction is
     * what this function's own rule about script addresses exists to
     * prevent, arriving through the other door.
     *
     * `p2pkhHashFromCashaddr` is the same verifier `stallHashOf` uses three
     * lines away in the function, so the card and the walk now agree by
     * construction rather than by two rules that happen to line up. It is
     * arithmetic on the string, not a chain read: this module's purity is
     * unchanged.
     */
    if (p2pkhHashFromCashaddr(addr) !== undefined) {
        const a = addr.toLowerCase();
        return `${a.slice(0, 6)}…${a.slice(-4)}`;
    }
    return undefined;
}

/** A manifest name, screened exactly as the app screens it, or nothing. */
export function usableName(name: string | undefined): string | undefined {
    if (name === undefined) {
        return undefined;
    }
    const bytes = new TextEncoder().encode(name);
    if (bytes.length < 1 || bytes.length > MAX_NAME) {
        return undefined;
    }
    return isLegibleText(name) ? name : undefined;
}

export type UnfurlText = {
    title: string;
    description: string;
};

/**
 * The card's picture, by the look the manifest asked for. Ships as three
 * crafted 1200x630 stills under /og/ — unfurlers accept PNG and little else,
 * and rasterising text at the edge is the wasm this origin evicted — so the
 * image carries the *look* while the title carries the name, which every
 * platform renders in text anyway. An id we ship no card for gets Modern,
 * mirroring `decodeTheme`'s fallback.
 */
export function ogImageFor(themeId: number): string {
    if (themeId === 0x02) {
        return '/og/stall-neo.png';
    }
    if (themeId === 0x03) {
        return '/og/stall-rural.png';
    }
    return '/og/stall-modern.png';
}

/**
 * The words on the card. With a screened name the stall speaks first; with
 * only an identity the card is still unmistakably *this* stall's; with
 * neither, the generic platform card stands and no rewrite happens at all.
 */
/** A tagline, screened like everything else the seller wrote. */
export function usableTagline(tagline: string | undefined): string | undefined {
    if (tagline === undefined) {
        return undefined;
    }
    const bytes = new TextEncoder().encode(tagline);
    if (bytes.length < 1 || bytes.length > 64) {
        return undefined;
    }
    return isLegibleText(tagline) ? tagline : undefined;
}

export function unfurlText(
    identity: string | undefined,
    name: string | undefined,
    tagline?: string,
): UnfurlText | undefined {
    const screened = usableName(name);
    if (screened !== undefined) {
        const line = usableTagline(tagline);
        return {
            title: `${screened} — Stall`,
            description:
                (line !== undefined ? `${line} · ` : '') +
                `${screened} on eCash Agora — open to see what is listed right now, ` +
                `priced as the contract on chain encodes it. Stall reads the chain and holds no keys.`,
        };
    }
    if (identity !== undefined) {
        return {
            title: `Stall — ${identity}`,
            description:
                'A seller’s shop on eCash Agora — open to see what is listed ' +
                'right now, read straight from the chain. Stall holds no keys.',
        };
    }
    return undefined;
}
