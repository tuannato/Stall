import { describe, expect, it } from 'vitest';
import { LOOK_CLASS } from '../src/domain/lookClass';
import { ATT_CLASS } from '../src/domain/moodClass';
import { LOOK_RULE, lookPseudoOf, selectorList } from './lookRule';

describe('no-look-pseudo-paints-inside-a-protected-box: which pseudo is a look’s', () => {
    /**
     * Round 8, the critic's P1-1 on round 7: `LOOK_RULE` took a class only
     * after the start, a space, a combinator, a comma or `(`, so the critic's
     * PSc (`.stall.t-modern .stall-tagline::after`, a diamond over the address
     * in its host's ink) was the app's to the contrast pass and blank in both
     * look-pseudo frames, the whole runner green. Red with the round-7
     * expression: every compound spelling below reads false.
     */
    it('takes a look’s or a decoration’s class wherever the selector names it', () => {
        for (const sel of [
            // Round 7's spellings, still read.
            '.t-modern .stall-tagline::after',
            '.t-x > .a::before',
            ':is(.t-x) .a::after',
            ':where(.t-x) .a::after',
            '.t-x + .a::after',
            // The class in a compound (the critic's PSc and PSci, and the
            // other spellings the look lints admit).
            '.stall.t-modern .stall-tagline::after',
            'div.t-rural .stall-tagline::after',
            '*.t-x .a::after',
            '[x].t-x .a::after',
            ':is(div).t-x .a::after',
            '.stall.att-rainfall .a::before',
            '.t-modern.att-pinstripe .item::after',
            // A class of hyphenated runs is one whole class.
            '.t-fixture-private .stall-headings::before',
            '.att-beetle-bug::after',
        ]) {
            expect(LOOK_RULE.test(sel), sel).toBe(true);
            expect(lookPseudoOf(sel), sel).not.toBeUndefined();
        }
    });

    it('takes no class of the app’s own chrome, and no pseudo a look’s rule does not generate', () => {
        for (const sel of ['.tk-run::after', '.st-x::before', '.item-x::after', '.attx::after', '.tool::before', '.t-::after', '#t-modern .a::after', '.T-modern .a::after', '.t-modern_x .a::after']) {
            expect(lookPseudoOf(sel), sel).toBeUndefined();
        }
        // A look's rule with no pseudo-element generates none.
        expect(lookPseudoOf('.stall.t-modern .stall-tagline')).toBeUndefined();
    });

    it('reads the class as the two class rules write one', () => {
        for (const cls of ['t-modern', 't-fixture-private', 't-a1-b2', 'att-rainfall', 'att-beetle-bug', 't-x', 'tk-run', 't-', 't--x', 't-x-', 'att-', 'att-a--b', 'tool', 'item-x']) {
            expect(LOOK_RULE.test(`.${cls}`), cls).toBe(LOOK_CLASS.test(cls) || ATT_CLASS.test(cls));
        }
    });

    it('names the host and the pseudo-element', () => {
        expect(lookPseudoOf('.stall.t-modern .stall-tagline::after')).toEqual({ which: 'after', host: '.stall.t-modern .stall-tagline' });
        expect(lookPseudoOf('div.t-rural .stall-tagline:before')).toEqual({ which: 'before', host: 'div.t-rural .stall-tagline' });
        expect(lookPseudoOf('.t-x::after')).toEqual({ which: 'after', host: '.t-x' });
    });

    it('splits a selector list at its top-level commas alone', () => {
        // Split naively, the first list left a chunk with the class and no
        // pseudo-element, and one with the pseudo-element and no class.
        expect(selectorList(':is(.t-x, .a) .b::after')).toEqual([':is(.t-x, .a) .b::after']);
        expect(selectorList('.t-x .a::before, .t-x .b::after')).toEqual(['.t-x .a::before', '.t-x .b::after']);
        expect(selectorList('[x="a,b"].t-x .c::after, .d')).toEqual(['[x="a,b"].t-x .c::after', '.d']);
        expect(selectorList('.a\\,b, .c')).toEqual(['.a\\,b', '.c']);
        expect(selectorList('url("x,y"), linear-gradient(red, blue)')).toEqual(['url("x,y")', 'linear-gradient(red, blue)']);
        expect(lookPseudoOf(selectorList(':is(.t-x, .a) .b::after')[0]!)).toEqual({ which: 'after', host: ':is(.t-x, .a) .b' });
    });
});
