import { decodeCashAddress, isValidCashAddress } from 'ecashaddrjs';
import type { BroadcastParams, RouteParse, WindowParams } from './state';

const PUBKEY_RE = /^(02|03)[0-9a-fA-F]{64}$/;

export function parseSellerParam(raw: string): RouteParse {
    // Lower-cased first: cashaddr is case-insensitive while single-case, and
    // a QR code or a wallet's copy presents it in capitals — measured live,
    // `/s/QPJQ…` read as "unreadable" while the same address in lower case
    // opened the stall. A pubkey is hex, which lowers the same way.
    const trimmed = raw.trim().toLowerCase();
    if (PUBKEY_RE.test(trimmed)) {
        return { kind: 'pubkey', pubkeyHex: trimmed };
    }
    const withPrefix = trimmed.includes(':') ? trimmed : `ecash:${trimmed}`;
    // The prefix is demanded here, where a refusal has a screen. Left
    // optional, any prefix whose own checksum validates — `etoken:`,
    // `bitcoincash:` — reached `view.address`, and every composer downstream
    // refused it with no sentence.
    if (!isValidCashAddress(withPrefix, 'ecash')) {
        return { kind: 'invalid', raw };
    }
    try {
        const decoded = decodeCashAddress(withPrefix);
        // A script address is refused here rather than walked. Offers are
        // grouped by public key, and the only way to recover one is a p2pkh
        // spend revealing it in an input script — a p2sh input never does, and
        // `pubkeyFromSpends` skips those inputs outright. So a p2sh route could
        // only ever spend ten pages of history to arrive at "this address has
        // never sent", which is false about an address that has sent thousands
        // of times. It carries `why` so the screen can say the true thing.
        if (decoded.type === 'p2sh') {
            return { kind: 'invalid', raw, why: 'script-address' };
        }
        if (decoded.type !== 'p2pkh') {
            return { kind: 'invalid', raw };
        }
        return {
            kind: 'address',
            address: withPrefix,
            type: decoded.type,
            hash: decoded.hash,
        };
    } catch {
        return { kind: 'invalid', raw };
    }
}

/** The apex and nothing else. `/s/...` is a stall; anything else is unreadable. */
export function isHomePath(pathname: string): boolean {
    return pathname === '/' || pathname === '';
}

export function sellerFromPath(pathname: string): string | undefined {
    const match = pathname.match(/^\/s\/([^/]+)\/?$/);
    if (!match) {
        return undefined;
    }
    try {
        return decodeURIComponent(match[1]!);
    } catch {
        return undefined;
    }
}

/**
 * The canonical link for one stall. An address travels **without** its
 * `ecash:` prefix (owner's call, 2026-09-06): the parse re-adds it, every old
 * prefixed link still opens, and the landing code a poster or a stream
 * carries drops one QR version — 41 modules to 37 in the 204px box, measured
 * through `qrMatrix`; the share code was 37 either way. `view.address` and
 * every composer keep the prefixed form — this is the path's shape only.
 */
export function stallPath(raw: string): string {
    const parsed = parseSellerParam(raw);
    const token =
        parsed.kind === 'pubkey'
            ? parsed.pubkeyHex
            : parsed.kind === 'address'
              ? parsed.address.slice('ecash:'.length)
              : raw.trim();
    return `/s/${encodeURIComponent(token)}`;
}

/**
 * `?pay=<hex>` on `/s/<seller>`: which item a scanned code was aimed at.
 *
 * A **prefix of a token id**, not the whole thing, because a QR that carries
 * this link has to stay at the module count the share link already scans at.
 * Twelve hex characters is 48 bits inside one stall's own price map, which
 * cannot collide in practice — and the ambiguous case is handled anyway, by
 * opening nothing.
 *
 * Bounded and lowercase-hex or nothing. The value never reaches a request:
 * it is compared against records this page already holds, never looked up on
 * chain. The bound is here so an unbounded search string never becomes the
 * comparison in the first place.
 */
export const MIN_PAY_PARAM_CHARS = 12;
export const MAX_PAY_PARAM_CHARS = 64;

/** How much of an id a link this app writes carries. The parser accepts more. */
export const PAY_PARAM_PREFIX = 12;

/**
 * The query key a scanned link names its item under. One home, because the
 * close path deletes exactly what this parse reads (`dropPayParam` in
 * `app.ts`) and two spellings of it would leave a sheet reopening on a
 * reload with nothing to say why.
 */
export const PAY_PARAM = 'pay';

const PAY_PARAM_RE = new RegExp(
    `^[0-9a-f]{${MIN_PAY_PARAM_CHARS},${MAX_PAY_PARAM_CHARS}}$`,
);

/**
 * The item a scanned link named, or nothing. Pure and no-throw, beside
 * `parseBroadcastParams` and read where `?m=` is read.
 */
export function parsePayParam(search: string): string | undefined {
    let params: URLSearchParams;
    try {
        params = new URLSearchParams(search);
    } catch {
        return undefined;
    }
    const raw = params.get(PAY_PARAM);
    if (raw === null || raw.length > MAX_PAY_PARAM_CHARS) {
        return undefined;
    }
    return PAY_PARAM_RE.test(raw) ? raw : undefined;
}

/**
 * A link to this stall's page, at one item.
 *
 * **The base is handed in.** `src/domain` is pure — reading `location` here
 * would put the browser's URL inside the layer that has no browser, which the
 * directory walls exist to prevent — so the caller supplies origin and path
 * and this decides only what the parameter says.
 *
 * A link and not a payment URI, deliberately: a raw BIP21 drops a buyer into a
 * wallet holding an amount and a hex memo nobody explained to them. This opens
 * the page that explains it, with the Pay control on it.
 */
export function payLandingUrl(base: string, tokenId: string): string | undefined {
    if (typeof base !== 'string' || base === '') {
        return undefined;
    }
    const id = typeof tokenId === 'string' ? tokenId.toLowerCase() : '';
    if (!/^[0-9a-f]{64}$/.test(id)) {
        return undefined;
    }
    return `${base}?pay=${id.slice(0, PAY_PARAM_PREFIX)}`;
}

/** No accepted value is longer than `lower-third` / `transparent` / `listings`. */
const MAX_BROADCAST_PARAM = 16;

function broadcastParam(params: URLSearchParams, key: string): string | undefined {
    const raw = params.get(key);
    if (raw === null || raw.length > MAX_BROADCAST_PARAM) {
        return undefined;
    }
    return raw;
}

/**
 * Query params that turn `/s/<seller>` into the stream overlay.
 *
 * `view=broadcast` is the gate: anything else is the ordinary stall. A bad
 * option falls back to its default rather than dropping the overlay — a
 * stream that silently became a shop is the failure. Each raw value is
 * length-clamped before comparison so an unbounded search string never
 * becomes the lookup.
 */
export function parseBroadcastParams(search: string): BroadcastParams | undefined {
    let params: URLSearchParams;
    try {
        params = new URLSearchParams(search);
    } catch {
        return undefined;
    }
    if (broadcastParam(params, 'view') !== 'broadcast') {
        return undefined;
    }
    const presetWord = broadcastParam(params, 'preset');
    const preset = presetWord === 'rail' ? 'rail' : presetWord === 'ticker' ? 'ticker' : 'corner';
    // The rail has no card and the ticker has no rest, so neither reads
    // `mode`; a resting ticker would be a blank bar (a dead source).
    const mode =
        preset === 'rail'
            ? 'rail'
            : preset === 'ticker' || broadcastParam(params, 'mode') === 'fixed'
              ? 'fixed'
              : 'rail';
    const cardsWord = broadcastParam(params, 'cards');
    return {
        preset,
        mode,
        transparent: broadcastParam(params, 'bg') === 'transparent',
        // Opt-in, and off for anything but the two words: a streamer who
        // mistyped it gets the shop they already had rather than a screen
        // showing money from a different rail. `all` takes turns per pass
        // (owner, 2026-09-21) and never merges the rails.
        cards: cardsWord === 'quotes' ? 'quotes' : cardsWord === 'all' ? 'all' : 'listings',
        // The ticker's two placements, bounded to one word each; anything
        // else is the default, the rule every option on this wire follows.
        side: broadcastParam(params, 'side') === 'left' ? 'left' : 'right',
        edge: broadcastParam(params, 'edge') === 'top' ? 'top' : 'bottom',
    };
}

/**
 * The highest block height this parse will accept.
 *
 * eCash is around 870,000 and gains ~144 a day, so ten million is roughly two
 * centuries of headroom and still refuses a string long enough to be an
 * accident. A bound rather than no bound because the value reaches a
 * comparison against every offer on the page, and an unbounded digit string
 * from a URL is an unbounded digit string on the paint path.
 */
export const MAX_BLOCK_HEIGHT = 10_000_000;

/** Digits only: no sign, no separators, no exponent, and never empty. */
const BLOCK_HEIGHT_RE = /^[0-9]{1,8}$/;

/**
 * The block a shop window's listing set is frozen at, or `undefined`.
 *
 * Refuses rather than clamps. A clamp would turn "874,213" — which is what a
 * seller reads off a block explorer, commas and all — into some other height
 * silently, and the screen would then be locked to a block nobody chose. Zero
 * is refused too: it is a real height in the type but no stall's listing
 * predates it, so a `0` on the wire is a typo and not a freeze at genesis.
 */
export function parseBlockParam(raw: string | null): number | undefined {
    if (raw === null || !BLOCK_HEIGHT_RE.test(raw)) {
        return undefined;
    }
    const height = Number(raw);
    return height >= 1 && height <= MAX_BLOCK_HEIGHT ? height : undefined;
}

/**
 * Query params that turn `/s/<seller>` into the shop window.
 *
 * `view=window` is the gate; anything else is somebody else's screen. The same
 * shape as `parseBroadcastParams` and for the same reason: a malformed option
 * falls back to its default rather than dropping the window, because a shop
 * screen that silently became a shop PAGE — dock, tabs, footer and all — is
 * the failure a seller would not see until a customer did.
 *
 * The one option that does NOT fall back is the freeze: a malformed `upto` is
 * absent, never zero and never "everything up to now". Inventing a height
 * would either hide the whole shop or hide nothing while claiming to hide
 * something, and the status bar prints what it claims.
 */
/** The quarter-turn a link asks for, or none. */
function turnParam(said: string | undefined): 'none' | 'cw' | 'ccw' {
    return said === 'cw' || said === 'ccw' ? said : 'none';
}

export function parseWindowParams(search: string): WindowParams | undefined {
    let params: URLSearchParams;
    try {
        params = new URLSearchParams(search);
    } catch {
        return undefined;
    }
    if (broadcastParam(params, 'view') !== 'window') {
        return undefined;
    }
    const show = broadcastParam(params, 'show');
    const upto = parseBlockParam(broadcastParam(params, 'upto') ?? null);
    return {
        show: show === 'listings' || show === 'quotes' ? show : 'all',
        mode: broadcastParam(params, 'mode') === 'browse' ? 'browse' : 'cycle',
        // Opt-in and the exact word, the broadcast's rule: anything else is
        // the wall as it is today, which is the screen nobody touches.
        touch: broadcastParam(params, 'touch') === 'on',
        // Opt-OUT, and only the exact word: the code is what the quotes rail
        // is for, so anything malformed falls back to showing it — the
        // broadcast's rule, and here it errs towards the screen doing its job
        // rather than towards a silently mute wall.
        payCode: broadcastParam(params, 'paycode') !== 'off',
        // Two named turns and nothing else; anything malformed is no turn,
        // the broadcast's rule — a screen that turned itself on a typo would
        // be sideways with nobody able to read why.
        turn: turnParam(broadcastParam(params, 'turn')),
        ...(upto === undefined ? {} : { upto }),
    };
}

/**
 * The address as the sign shows it on a phone (round 8, 2026-09-15): the
 * payload's first and last eight characters around an ellipsis, the prefix
 * dropped — 17 characters where the whole string is 48. A glance, never what
 * a buyer compares against a wallet: the whole string stays in the DOM beside
 * it (opened by the same control) and the copy control copies the whole. A
 * payload short enough to show whole is shown whole.
 */
export function shortAddress(address: string): string {
    const payload = address.startsWith('ecash:') ? address.slice('ecash:'.length) : address;
    if (payload.length <= 20) {
        return payload;
    }
    return `${payload.slice(0, 8)}…${payload.slice(-8)}`;
}
