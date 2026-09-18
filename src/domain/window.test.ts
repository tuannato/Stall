// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { offersWithinLock, suggestedLock, tokensAtBlock } from './window';
import { parseBlockParam, parseWindowParams, MAX_BLOCK_HEIGHT } from './route';
import type { StallOffer } from './state';

const BEANS = 'a'.repeat(64);
const TEA = 'b'.repeat(64);
const JUNK = 'c'.repeat(64);

/** One offer of `tokenId`, sitting in `blockHeight`. Height omitted when undefined. */
function offer(tokenId: string, blockHeight?: number, outIdx = 0): StallOffer {
    return {
        outpoint: { txid: 'd'.repeat(64), outIdx },
        tokenId,
        atoms: 10n,
        variant: 'PARTIAL',
        askedSats: 1_200n,
        askedAtoms: 1n,
        ...(blockHeight === undefined ? {} : { blockHeight }),
    };
}

describe('the-freeze-remembers-tokens-and-never-compares-heights-alone', () => {
    /**
     * The defect this exists to refuse. A partial fill spends the offer and
     * re-creates the remainder as a NEW utxo in a later block (§3), so the
     * height of a seller's own goods jumps forward the moment somebody buys
     * part of a lot. A height test alone would take the item off the screen as
     * a reward for selling some of it — which is the opposite of what a
     * shopkeeper means by locking today's shelf.
     */
    it('keeps an item whose utxo moved to a later block after a partial fill', () => {
        const atLock = [offer(BEANS, 100), offer(TEA, 100)];
        const remembered = tokensAtBlock(atLock, 120);
        expect([...remembered].sort()).toEqual([BEANS, TEA].sort());

        // Somebody buys half the beans: same token, new utxo, block 130.
        const later = [offer(BEANS, 130), offer(TEA, 100)];
        const shown = offersWithinLock(later, 120, remembered);
        expect(shown.map((o) => o.tokenId).sort()).toEqual([BEANS, TEA].sort());
    });

    /**
     * And the whole point: a token nobody was offering at the lock stays out,
     * however it arrived. This is the gift listing of §10 — a PARTIAL lands in
     * any pubkey group with no key of that pubkey, so the seller never
     * consented to it being on their shopfront.
     */
    it('refuses a token that was not being offered at the lock', () => {
        const remembered = tokensAtBlock([offer(BEANS, 100)], 120);
        const shown = offersWithinLock([offer(BEANS, 100), offer(JUNK, 130)], 120, remembered);
        expect(shown.map((o) => o.tokenId)).toEqual([BEANS]);
    });

    /**
     * A first load has nothing remembered — the screen has only just opened on
     * this link — so the heights alone have to answer, or the freeze would
     * blank the shop until a reload.
     */
    it('works from the heights alone before anything is remembered', () => {
        const shown = offersWithinLock([offer(BEANS, 100), offer(JUNK, 130)], 120);
        expect(shown.map((o) => o.tokenId)).toEqual([BEANS]);
    });

    /**
     * A node that answered without the field must not empty a seller's shelf.
     * The freeze refuses an arrival it can see; it does not refuse on our own
     * gap, which is §4's rule about a floor printed as a count, on a new
     * surface.
     */
    it('keeps an offer whose height the node never gave', () => {
        const shown = offersWithinLock([offer(BEANS, undefined), offer(JUNK, 130)], 120);
        expect(shown.map((o) => o.tokenId)).toEqual([BEANS]);
        expect(tokensAtBlock([offer(BEANS, undefined)], 120).has(BEANS)).toBe(true);
    });

    /**
     * chronik writes -1 for a mempool utxo and `heightOf` normalises that to 0,
     * which is below every real height — a listing the seller broadcast a
     * moment ago belongs on their own screen rather than being treated as a
     * stranger arriving after the lock.
     */
    it('keeps a listing still in the mempool', () => {
        const shown = offersWithinLock([offer(BEANS, 0)], 120);
        expect(shown.map((o) => o.tokenId)).toEqual([BEANS]);
    });

    it('is the whole book when no lock is asked for', () => {
        const all = [offer(BEANS, 100), offer(JUNK, 900)];
        expect(offersWithinLock(all, undefined)).toEqual(all);
    });

    it('suggests the next block, never the tip', () => {
        expect(suggestedLock(874_212)).toBe(874_213);
    });
});

describe('a-shop-window-link-falls-back-per-option-and-never-invents-a-lock', () => {
    it('is nobody else’s screen without the gate', () => {
        expect(parseWindowParams('?view=broadcast&mode=browse')).toBeUndefined();
        expect(parseWindowParams('?mode=browse')).toBeUndefined();
        expect(parseWindowParams('')).toBeUndefined();
    });

    /**
     * A malformed option falls back rather than dropping the window: a shop
     * screen that silently became the ordinary shop page — dock, tabs, footer
     * — is a failure the seller would not see until a customer did.
     */
    it('falls back per option rather than dropping the window', () => {
        expect(parseWindowParams('?view=window')).toEqual({ show: 'all', mode: 'cycle' });
        expect(parseWindowParams('?view=window&show=nonsense&mode=nonsense')).toEqual({
            show: 'all',
            mode: 'cycle',
        });
        expect(parseWindowParams('?view=window&show=quotes&mode=browse')).toEqual({
            show: 'quotes',
            mode: 'browse',
        });
    });

    /**
     * The freeze is the one option that does NOT fall back. Inventing a height
     * would either hide the whole shop or hide nothing while the status bar
     * claims a lock — and the bar prints what it claims.
     */
    it('leaves a malformed lock absent rather than choosing one', () => {
        for (const bad of ['', '0', '-5', '1.5', '874,213', ' 874213', '1e6', 'abc']) {
            expect(parseWindowParams(`?view=window&upto=${encodeURIComponent(bad)}`)).toEqual({
                show: 'all',
                mode: 'cycle',
            });
        }
        expect(parseWindowParams('?view=window&upto=874213')).toEqual({
            show: 'all',
            mode: 'cycle',
            upto: 874_213,
        });
    });

    it('bounds the height it will accept', () => {
        expect(parseBlockParam('1')).toBe(1);
        expect(parseBlockParam(String(MAX_BLOCK_HEIGHT))).toBe(MAX_BLOCK_HEIGHT);
        expect(parseBlockParam(String(MAX_BLOCK_HEIGHT + 1))).toBeUndefined();
        expect(parseBlockParam('999999999')).toBeUndefined();
        expect(parseBlockParam(null)).toBeUndefined();
    });
});
