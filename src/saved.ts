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
import { DEFAULT_FIAT_CODE, isSupportedFiat } from './domain/fiat';
import { parseSellerParam } from './domain/route';

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
    // Storage is user-writable. Treat it exactly like a pasted address.
    return parseSellerParam(raw).kind === 'invalid' ? undefined : raw;
}

export function saveStall(raw: string): void {
    if (raw.length > MAX_SAVED || parseSellerParam(raw).kind === 'invalid') {
        return;
    }
    try {
        localStorage.setItem(KEY, raw);
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
    return saved !== undefined && saved === raw;
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

/** A JSON array of route tokens can never legitimately be longer than this. */
const MAX_PINS_RAW = (MAX_SAVED + 8) * MAX_PINNED_STALLS;

export function readPinnedStalls(): string[] {
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
    const pins: string[] = [];
    for (const entry of parsed) {
        if (typeof entry !== 'string' || entry.length > MAX_SAVED) {
            continue;
        }
        if (parseSellerParam(entry).kind === 'invalid' || pins.includes(entry)) {
            continue;
        }
        pins.push(entry);
        if (pins.length === MAX_PINNED_STALLS) {
            break;
        }
    }
    return pins;
}

function writePins(pins: readonly string[]): void {
    try {
        if (pins.length === 0) {
            localStorage.removeItem(PINS_KEY);
        } else {
            localStorage.setItem(PINS_KEY, JSON.stringify(pins));
        }
    } catch {
        // Nothing to tell the visitor: the stall on screen is unchanged.
    }
}

export function pinStall(raw: string): void {
    if (raw.length > MAX_SAVED || parseSellerParam(raw).kind === 'invalid') {
        return;
    }
    const pins = readPinnedStalls();
    if (pins.includes(raw) || pins.length >= MAX_PINNED_STALLS) {
        // Full is a refusal, never an eviction — the copy in the studio says
        // so, which keeps this silent return from being a silent failure.
        return;
    }
    writePins([...pins, raw]);
}

export function unpinStall(raw: string): void {
    writePins(readPinnedStalls().filter((pin) => pin !== raw));
}

export function isPinnedStall(raw: string | undefined): boolean {
    return raw !== undefined && readPinnedStalls().includes(raw);
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
 */
export function hasSavedFiat(): boolean {
    try {
        const raw = localStorage.getItem(FIAT_KEY);
        return raw !== null && raw.length <= MAX_FIAT_CODE && isSupportedFiat(raw);
    } catch {
        return false;
    }
}

export function readSavedFiat(): string {
    let raw: string | null;
    try {
        raw = localStorage.getItem(FIAT_KEY);
    } catch {
        return DEFAULT_FIAT_CODE;
    }
    if (raw === null || raw.length > MAX_FIAT_CODE || !isSupportedFiat(raw)) {
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
