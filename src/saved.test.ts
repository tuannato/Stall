// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearSavedStall,
    isPinnedStall,
    isSavedStall,
    MAX_PINNED_STALLS,
    pinnedDoorIsFull,
    pinStall,
    readPinnedStalls,
    readSavedStall,
    saveStall,
    unpinStall,
} from './saved';

const ADDRESS = 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09';
const KEY = 'stall.default';

beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

describe('saved-stall', () => {
    it('round-trips a stall and forgets it on request', () => {
        expect(readSavedStall()).toBeUndefined();
        saveStall(ADDRESS);
        expect(readSavedStall()).toBe(ADDRESS);
        expect(isSavedStall(ADDRESS)).toBe(true);
        clearSavedStall();
        expect(readSavedStall()).toBeUndefined();
        expect(isSavedStall(ADDRESS)).toBe(false);
    });
});

describe('saved-stall-is-not-trusted-input', () => {
    /**
     * Storage is writable by anyone with the console open, and by any earlier
     * version of this app. A value that would not survive the paste box must
     * not reach the route just because it came from disk.
     */
    it('ignores a stored value that is not a stall', () => {
        localStorage.setItem(KEY, 'not-an-address');
        expect(readSavedStall()).toBeUndefined();
        saveStall('not-an-address');
        expect(readSavedStall()).toBeUndefined();
    });

    it('ignores a stored value longer than any route token', () => {
        localStorage.setItem(KEY, 'x'.repeat(5000));
        expect(readSavedStall()).toBeUndefined();
    });

    it('refuses to write one', () => {
        // Refusing to write is not the same as clearing, so start from empty:
        // the assertion is that nothing oversized ever lands in storage.
        localStorage.clear();
        saveStall(`${ADDRESS}${'x'.repeat(5000)}`);
        expect(localStorage.getItem(KEY)).toBeNull();
    });
});

/** Distinct valid route tokens, cheap: a compressed-pubkey hex per index. */
const pk = (i: number): string => `02${i.toString(16).padStart(2, '0').repeat(32)}`;
const PINS_KEY = 'stall.pins';

describe('pinned-stalls', () => {
    it('round-trips pins in the order they were chosen', () => {
        expect(readPinnedStalls()).toEqual([]);
        pinStall(ADDRESS);
        pinStall(pk(1));
        expect(readPinnedStalls()).toEqual([ADDRESS, pk(1)]);
        expect(isPinnedStall(ADDRESS)).toBe(true);
        expect(isPinnedStall(pk(2))).toBe(false);
        unpinStall(ADDRESS);
        expect(readPinnedStalls()).toEqual([pk(1)]);
        unpinStall(pk(1));
        // An emptied door leaves no key behind — storage holds preferences,
        // never residue.
        expect(localStorage.getItem(PINS_KEY)).toBeNull();
    });

    it('a-full-door-refuses-a-pin-and-never-evicts-one', () => {
        for (let i = 0; i < MAX_PINNED_STALLS; i += 1) {
            pinStall(pk(i));
        }
        expect(pinnedDoorIsFull()).toBe(true);
        pinStall(pk(99));
        // The thirteenth is refused; every pin somebody chose is still there.
        expect(readPinnedStalls()).toHaveLength(MAX_PINNED_STALLS);
        expect(isPinnedStall(pk(99))).toBe(false);
        expect(isPinnedStall(pk(0))).toBe(true);
        unpinStall(pk(0));
        expect(pinnedDoorIsFull()).toBe(false);
        pinStall(pk(99));
        expect(isPinnedStall(pk(99))).toBe(true);
    });

    it('treats the stored array exactly like pasted addresses', () => {
        // Storage is user-writable: junk shapes, junk entries, duplicates and
        // an over-cap array must all come back as a bounded list of stalls.
        localStorage.setItem(PINS_KEY, 'not-json{');
        expect(readPinnedStalls()).toEqual([]);
        localStorage.setItem(PINS_KEY, JSON.stringify({ a: 1 }));
        expect(readPinnedStalls()).toEqual([]);
        localStorage.setItem(
            PINS_KEY,
            JSON.stringify([ADDRESS, 'not-a-stall', 7, ADDRESS, `x${'y'.repeat(500)}`]),
        );
        expect(readPinnedStalls()).toEqual([ADDRESS]);
        const over = Array.from({ length: MAX_PINNED_STALLS + 6 }, (_, i) => pk(i));
        localStorage.setItem(PINS_KEY, JSON.stringify(over));
        expect(readPinnedStalls()).toHaveLength(MAX_PINNED_STALLS);
        // A raw value longer than any honest array is not read at all.
        localStorage.setItem(PINS_KEY, `["${'a'.repeat(4000)}"]`);
        expect(readPinnedStalls()).toEqual([]);
    });

    it('refuses to pin what the paste box would refuse', () => {
        pinStall('not-a-stall');
        pinStall(`${ADDRESS}${'x'.repeat(500)}`);
        expect(localStorage.getItem(PINS_KEY)).toBeNull();
    });
});

describe('storage-failure-is-not-a-broken-stall', () => {
    /**
     * Private mode, storage disabled, or over quota all throw. None of that is
     * a reason for a stall to stop painting, so every path here swallows it and
     * behaves as though nothing was ever saved.
     */
    it('survives a throwing localStorage on every call', () => {
        const boom = (): never => {
            throw new Error('denied');
        };
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(boom);

        expect(() => readSavedStall()).not.toThrow();
        expect(readSavedStall()).toBeUndefined();
        expect(() => saveStall(ADDRESS)).not.toThrow();
        expect(() => clearSavedStall()).not.toThrow();
        expect(() => isSavedStall(ADDRESS)).not.toThrow();
        expect(() => readPinnedStalls()).not.toThrow();
        expect(readPinnedStalls()).toEqual([]);
        expect(() => pinStall(ADDRESS)).not.toThrow();
        expect(() => unpinStall(ADDRESS)).not.toThrow();
        expect(() => pinnedDoorIsFull()).not.toThrow();
    });
});
