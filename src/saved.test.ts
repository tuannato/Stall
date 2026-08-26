// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSavedStall, isSavedStall, readSavedStall, saveStall } from './saved';

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
    });
});
