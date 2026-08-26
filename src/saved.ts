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
