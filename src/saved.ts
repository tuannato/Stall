/**
 * The one stall this browser opens by default.
 *
 * Lives here rather than in `domain/`, which is pure, or `net/`, where
 * `directory-walls` forbids storage outright. What is kept is the route token a
 * person already typed or followed — never a key, and never anything that grows:
 * one short string, replaced each time.
 *
 * Storage is allowed to fail. A browser in private mode, with storage disabled,
 * or over quota throws on read and on write, and none of that is a reason for a
 * stall not to paint. Every call here swallows that and behaves as if nothing
 * was ever saved.
 */
import { isSurchargePct } from './domain/description';
import { DEFAULT_FIAT_CODE, isSupportedFiat } from './domain/fiat';
import type { RememberedSurcharge } from './domain/state';
import { parseSellerParam } from './domain/route';
import { isLegibleText } from './domain/text';

const KEY = 'stall.default';

/**
 * A pubkey is 66 characters and an address is under 60, so anything longer was
 * not written by this app. Capping the read stops a hand-edited value becoming
 * a long string on the route, and the parse below stops it becoming a stall.
 */
const MAX_SAVED = 128;

export function readSavedStall(): string | undefined {
    let raw: string | null;
    try {
        raw = localStorage.getItem(KEY);
    } catch {
        return undefined;
    }
    if (raw === null || raw.length > MAX_SAVED) {
        return undefined;
    }
    // Storage is user-writable. Treat it exactly like a pasted address, and
    // answer the canonical form: a stall saved from a link in capitals is
    // the same stall as one opened in lower case.
    return canonicalStall(raw);
}

/** The one string one stall is stored and compared as, or nothing. */
export function canonicalStall(raw: string): string | undefined {
    const parsed = parseSellerParam(raw);
    return parsed.kind === 'address'
        ? parsed.address
        : parsed.kind === 'pubkey'
          ? parsed.pubkeyHex
          : undefined;
}

export function saveStall(raw: string): void {
    const canonical = raw.length > MAX_SAVED ? undefined : canonicalStall(raw);
    if (canonical === undefined) {
        return;
    }
    try {
        localStorage.setItem(KEY, canonical);
    } catch {
        // Nothing to tell the seller: the stall they are looking at is unchanged.
    }
}

export function clearSavedStall(): void {
    try {
        localStorage.removeItem(KEY);
    } catch {
        // Already unreachable, which is the state the caller asked for.
    }
}

/** True when this stall is the one this browser opens by default. */
export function isSavedStall(raw: string | undefined): boolean {
    if (raw === undefined) {
        return false;
    }
    const saved = readSavedStall();
    return saved !== undefined && saved === canonicalStall(raw);
}

/**
 * Stalls pinned to the front door. The same contract as the default stall —
 * route tokens a person already typed or followed, re-validated on every read
 * because storage is user-writable — with one addition: a hard cap, because §2
 * allows storage to hold display preferences and *nothing that grows*. A full
 * door refuses a new pin rather than silently evicting one somebody chose;
 * the studio says which rule bit.
 */
const PINS_KEY = 'stall.pins';

export const MAX_PINNED_STALLS = 12;

/**
 * A pinned name is a snapshot of the stall's `STL1` name at the moment of
 * pinning (owner, 2026-09-20): the door fetches nothing, so this is the one
 * chain-derived string storage holds, beside the route token and never
 * instead of it. Nothing routes on it. It is screened on the way out like
 * every other stored string — storage is user-writable — and capped at the
 * record's own 32 code points.
 */
const MAX_PIN_NAME = 32;

/** A stored entry: the legacy bare token, or the token with its name. */
type PinEntry = { readonly stall: string; readonly name?: string };

const MAX_PINS_RAW = (MAX_SAVED + 160) * MAX_PINNED_STALLS;

function pinName(raw: unknown): string | undefined {
    if (typeof raw !== 'string' || raw === '') {
        return undefined;
    }
    const trimmed = raw.trim();
    if (trimmed === '' || [...trimmed].length > MAX_PIN_NAME || !isLegibleText(trimmed)) {
        return undefined;
    }
    return trimmed;
}

function readPinEntries(): PinEntry[] {
    let raw: string | null;
    try {
        raw = localStorage.getItem(PINS_KEY);
    } catch {
        return [];
    }
    if (raw === null || raw.length > MAX_PINS_RAW) {
        return [];
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) {
        return [];
    }
    // Each entry treated exactly like a pasted address, deduped, and capped
    // even on read: a hand-edited array must not become an unbounded door.
    // A bare string is the shape every pin had before names (2026-09-20).
    const pins: PinEntry[] = [];
    for (const entry of parsed) {
        const token =
            typeof entry === 'string'
                ? entry
                : entry !== null && typeof entry === 'object' && typeof (entry as { s?: unknown }).s === 'string'
                  ? (entry as { s: string }).s
                  : undefined;
        if (token === undefined || token.length > MAX_SAVED) {
            continue;
        }
        const canonical = canonicalStall(token);
        if (canonical === undefined || pins.some((pin) => pin.stall === canonical)) {
            continue;
        }
        const name =
            typeof entry === 'object' && entry !== null ? pinName((entry as { n?: unknown }).n) : undefined;
        pins.push(name === undefined ? { stall: canonical } : { stall: canonical, name });
        if (pins.length === MAX_PINNED_STALLS) {
            break;
        }
    }
    return pins;
}

export function readPinnedStalls(): string[] {
    return readPinEntries().map((pin) => pin.stall);
}

/** The names the pins were made with, by canonical token. */
export function readPinnedNames(): Map<string, string> {
    const names = new Map<string, string>();
    for (const pin of readPinEntries()) {
        if (pin.name !== undefined) {
            names.set(pin.stall, pin.name);
        }
    }
    return names;
}

function writePins(pins: readonly PinEntry[]): void {
    try {
        if (pins.length === 0) {
            localStorage.removeItem(PINS_KEY);
        } else {
            localStorage.setItem(
                PINS_KEY,
                JSON.stringify(pins.map((pin) => (pin.name === undefined ? { s: pin.stall } : { s: pin.stall, n: pin.name }))),
            );
        }
    } catch {
        // Nothing to tell the visitor: the stall on screen is unchanged.
    }
}

export function pinStall(raw: string, name?: string): void {
    const canonical = raw.length > MAX_SAVED ? undefined : canonicalStall(raw);
    if (canonical === undefined) {
        return;
    }
    const pins = readPinEntries();
    if (pins.some((pin) => pin.stall === canonical) || pins.length >= MAX_PINNED_STALLS) {
        // Full is a refusal, never an eviction — the copy in the studio says
        // so, which keeps this silent return from being a silent failure.
        return;
    }
    const kept = pinName(name);
    writePins([...pins, kept === undefined ? { stall: canonical } : { stall: canonical, name: kept }]);
}

export function unpinStall(raw: string): void {
    const canonical = canonicalStall(raw);
    writePins(readPinEntries().filter((pin) => pin.stall !== canonical));
}

export function isPinnedStall(raw: string | undefined): boolean {
    if (raw === undefined) {
        return false;
    }
    const canonical = canonicalStall(raw);
    return canonical !== undefined && readPinnedStalls().includes(canonical);
}

/** True when one more pin would be refused. */
export function pinnedDoorIsFull(): boolean {
    return readPinnedStalls().length >= MAX_PINNED_STALLS;
}

/**
 * The fiat currency this browser reads prices in. A display preference and
 * nothing else — §2 allows storage to hold exactly that.
 *
 * Re-validated on every read against the shipped table, because the value is
 * user-writable and it is concatenated into a request path. A stored code we no
 * longer ship reads as the default, never as a URL fragment.
 */
const FIAT_KEY = 'stall.fiat';

/** No shipped code is longer than this; anything longer was not written here. */
const MAX_FIAT_CODE = 8;

/**
 * Whether the visitor ever chose a currency. `readSavedFiat` answers the
 * default for "never chose", which is right for painting and wrong for the
 * seller's fiat hint — a hint may fill silence and must never override a
 * choice, so the two questions need two answers.
 *
 * **Nobody asks it today**: the hint is unhonoured and no picker paints, so
 * "never chose" is the only answer there is. Kept with `saveFiat` as the seam
 * the picker comes back through, and as the place the storage screen the
 * simplified read no longer needs is still written down.
 */
export function hasSavedFiat(): boolean {
    try {
        const raw = localStorage.getItem(FIAT_KEY);
        return raw !== null && raw.length <= MAX_FIAT_CODE && isSupportedFiat(raw);
    } catch {
        return false;
    }
}

/**
 * The currency this browser reads prices in.
 *
 * **One currency above the table** (CLAUDE §8): nothing paints a picker, so
 * `usd` is the only code this build can arrive at, and a stored code from a
 * build that had one is a value no control can change back. Ignoring it would
 * pin a browser to that currency for as long as the key survives, so the read
 * that finds it also removes it.
 *
 * `FIAT_CURRENCIES` and `isSupportedFiat` are untouched — the table is display
 * data with its own pinned assertions, and this gate has to keep working the
 * day the picker comes back.
 */
export function readSavedFiat(): string {
    let raw: string | null;
    try {
        raw = localStorage.getItem(FIAT_KEY);
    } catch {
        return DEFAULT_FIAT_CODE;
    }
    if (raw === null) {
        return DEFAULT_FIAT_CODE;
    }
    // One comparison, because it subsumes the two this used to make: the only
    // code this build can arrive at is the default, so a longer string, a code
    // we never shipped and a shipped code that is simply not this one are all
    // the same leftover. Widening this again means restoring the length and
    // `isSupportedFiat` gates `hasSavedFiat` still makes — storage is
    // user-writable and this value is concatenated into a request path.
    if (raw !== DEFAULT_FIAT_CODE) {
        try {
            localStorage.removeItem(FIAT_KEY);
        } catch {
            // Nothing to do: the stale code simply stays, unread.
        }
        return DEFAULT_FIAT_CODE;
    }
    return raw;
}

export function saveFiat(code: string): void {
    if (code.length > MAX_FIAT_CODE || !isSupportedFiat(code)) {
        return;
    }
    try {
        localStorage.setItem(FIAT_KEY, code);
    } catch {
        // Nothing to do: the choice simply is not remembered.
    }
}

/*
 * The surcharge a seller last handed to a wallet on a stall's describe sheet.
 *
 * **Storage reaching the signing path, which is not §2's "display
 * preference"** — so it is a named exception with fences (CLAUDE §2, the
 * pin's name beside it), decided 2026-09-21 (D5): the sheet prefills an EMPTY
 * surcharge field from it, visibly, above the fold, named on the "Publishes:"
 * line, and a published byte always wins. Per stall by `canonicalStall`;
 * a percent, or `none` once a quote without one was signed, so a seller who
 * wants none does not clear a field that refills forever. Capped like the
 * pins — `MAX_PINNED_STALLS` stalls, refuse rather than evict — with a
 * raw-length belt on read; every entry validated on read as an integer 1–100
 * the way `pinName` is screened; every read and write wrapped, so a throwing
 * `localStorage` is an empty field. What this app observes is the press of a
 * sign control, never the signature: "signed" here means handed to a wallet.
 */
const SURCHARGE_KEY = 'stall.surcharge';

type SurchargeEntry = { readonly stall: string; readonly pct: RememberedSurcharge };

/** `0` on the wire of this store is "none" — the one percent the record voids. */
const NONE_STORED = 0;

const MAX_SURCHARGE_RAW = (MAX_SAVED + 40) * MAX_PINNED_STALLS;

function readSurchargeEntries(): SurchargeEntry[] {
    let raw: string | null;
    try {
        raw = localStorage.getItem(SURCHARGE_KEY);
    } catch {
        return [];
    }
    if (raw === null || raw.length > MAX_SURCHARGE_RAW) {
        return [];
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) {
        return [];
    }
    const entries: SurchargeEntry[] = [];
    for (const entry of parsed) {
        if (entry === null || typeof entry !== 'object') {
            continue;
        }
        const { s: token, p: stored } = entry as { s?: unknown; p?: unknown };
        if (typeof token !== 'string' || token.length > MAX_SAVED) {
            continue;
        }
        const canonical = canonicalStall(token);
        if (canonical === undefined || entries.some((known) => known.stall === canonical)) {
            continue;
        }
        const pct: RememberedSurcharge | undefined =
            stored === NONE_STORED ? 'none' : isSurchargePct(stored) ? stored : undefined;
        if (pct === undefined) {
            continue;
        }
        entries.push({ stall: canonical, pct });
        if (entries.length === MAX_PINNED_STALLS) {
            break;
        }
    }
    return entries;
}

function writeSurchargeEntries(entries: readonly SurchargeEntry[]): void {
    try {
        if (entries.length === 0) {
            localStorage.removeItem(SURCHARGE_KEY);
        } else {
            localStorage.setItem(
                SURCHARGE_KEY,
                JSON.stringify(entries.map((e) => ({ s: e.stall, p: e.pct === 'none' ? NONE_STORED : e.pct }))),
            );
        }
    } catch {
        // Nothing to tell the seller: the next sheet simply opens empty.
    }
}

/** What this browser remembers for a stall, or nothing. */
export function readRememberedSurcharge(raw: string | undefined): RememberedSurcharge | undefined {
    if (raw === undefined) {
        return undefined;
    }
    const canonical = canonicalStall(raw);
    return canonical === undefined ? undefined : readSurchargeEntries().find((e) => e.stall === canonical)?.pct;
}

/**
 * A quote was handed to a wallet with this surcharge (or none). A stall
 * already remembered is updated in place; a new one is refused when the
 * store is full — never evicted, the pins' rule.
 */
export function rememberSurcharge(raw: string, pct: RememberedSurcharge): void {
    const canonical = raw.length > MAX_SAVED ? undefined : canonicalStall(raw);
    if (canonical === undefined || (pct !== 'none' && !isSurchargePct(pct))) {
        return;
    }
    const entries = readSurchargeEntries();
    const at = entries.findIndex((e) => e.stall === canonical);
    if (at >= 0) {
        writeSurchargeEntries(entries.map((e, i) => (i === at ? { stall: canonical, pct } : e)));
        return;
    }
    if (entries.length >= MAX_PINNED_STALLS) {
        return;
    }
    writeSurchargeEntries([...entries, { stall: canonical, pct }]);
}

export function forgetSurcharge(raw: string): void {
    const canonical = canonicalStall(raw);
    writeSurchargeEntries(readSurchargeEntries().filter((e) => e.stall !== canonical));
}
