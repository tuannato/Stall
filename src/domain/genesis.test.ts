// @vitest-environment node
import { describe, expect, it } from 'vitest';
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
