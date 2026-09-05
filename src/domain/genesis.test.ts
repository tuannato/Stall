// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { rankDecision } from './genesis';
import {
    attributionFromAuthPubkey,
    mergeAttribution,
    type GenesisAttribution,
} from './genesis';

const STALL = `02${'aa'.repeat(32)}`;
const OTHER = `03${'bb'.repeat(32)}`;

describe('an-alp-genesis-is-attributed-from-its-auth-pubkey', () => {
    /**
     * The minter's own claim, free to read on metadata the page already has,
     * and screened before it is compared: the field holds whatever bytes a
     * minter wrote, and chronik's own fixture carries ASCII there.
     */
    it('reads the stall’s own key as attributed and another key as not', () => {
        expect(attributionFromAuthPubkey(STALL, STALL)).toBe('attributed');
        expect(attributionFromAuthPubkey(STALL.toUpperCase(), STALL)).toBe('attributed');
        expect(attributionFromAuthPubkey(OTHER, STALL)).toBe('not-attributed');
    });

    it('falls through to unknown for anything that is not a key', () => {
        for (const claimed of [
            undefined,
            '',
            'Token Pubkey',
            // A key shape this chain does not use, and one byte short.
            `04${'aa'.repeat(32)}`,
            `02${'aa'.repeat(31)}`,
        ]) {
            expect(attributionFromAuthPubkey(claimed, STALL), String(claimed)).toBe(
                'unknown',
            );
        }
    });
});

describe('an-unknown-answer-never-downgrades-an-attribution', () => {
    /**
     * A genesis is permanent, so an attribution is too. A live re-read whose
     * walk took the lokad branch answers `unknown` for every token, and
     * applying that would have the editor start refusing quotes on the
     * seller's own tokens seconds after the page opened.
     */
    it('keeps a decided state against a later unknown', () => {
        expect(mergeAttribution('attributed', 'unknown')).toBe('attributed');
        expect(mergeAttribution('not-attributed', 'unknown')).toBe('not-attributed');
    });

    it('never flips one decided state into the other', () => {
        expect(mergeAttribution('attributed', 'not-attributed')).toBe('attributed');
        expect(mergeAttribution('not-attributed', 'attributed')).toBe('not-attributed');
    });

    it('takes any answer over nothing known at all', () => {
        for (const next of ['attributed', 'not-attributed', 'unknown'] as const) {
            expect(mergeAttribution(undefined, next)).toBe(next);
            expect(mergeAttribution('unknown', next)).toBe(next);
        }
    });

    it('is order-blind for the states a reader can reach', () => {
        const states: GenesisAttribution[] = ['unknown', 'attributed', 'unknown'];
        expect(states.reduce<GenesisAttribution | undefined>(mergeAttribution, undefined)).toBe(
            'attributed',
        );
    });
});

describe('a-signed-genesis-outranks-a-claim-against-it', () => {
    /**
     * Three sources decide an attribution and they are not equal: the stall's
     * key on the genesis input proves a mint; a mint output paying the stall
     * is something anyone can send; an ALP `authPubkey` is the minter's own
     * unchecked claim. First-decided-wins let a well-formed claim against
     * the stall freeze `not-attributed` for the session and block the read
     * that would have proved otherwise.
     */
    it('lets a signed answer overturn a claim, and never the reverse', () => {
        const claim = { state: 'not-attributed', strength: 'claimed' } as const;
        const signed = { state: 'attributed', strength: 'signed' } as const;
        expect(rankDecision(claim, signed)).toEqual(signed);
        expect(rankDecision(signed, claim)).toEqual(signed);
        const paid = { state: 'attributed', strength: 'paid' } as const;
        expect(rankDecision(claim, paid)).toEqual(paid);
        expect(rankDecision(paid, claim)).toEqual(paid);
        expect(rankDecision(paid, signed)).toEqual(signed);
    });

    it('never lets unknown overwrite a decision, and takes any decision over nothing', () => {
        const paid = { state: 'attributed', strength: 'paid' } as const;
        expect(rankDecision(paid, { state: 'unknown' })).toEqual(paid);
        expect(rankDecision(undefined, { state: 'unknown' })).toEqual({ state: 'unknown' });
        expect(rankDecision({ state: 'unknown' }, paid)).toEqual(paid);
    });
});

describe('equal-strength-keeps-the-earlier-decision', () => {
    /**
     * Ranking without a tie rule reopens the live downgrade the monotonic
     * rule closed: a re-read at the same strength must not flip a decision.
     */
    it('keeps the first of two answers at one strength, whichever way they disagree', () => {
        const yes = { state: 'attributed', strength: 'paid' } as const;
        const no = { state: 'not-attributed', strength: 'paid' } as const;
        expect(rankDecision(yes, no)).toEqual(yes);
        expect(rankDecision(no, yes)).toEqual(no);
    });
});
