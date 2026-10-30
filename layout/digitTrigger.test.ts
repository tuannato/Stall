/**
 * 1c(c)'s trigger, the pure half (`digitTrigger.ts`; before 8g2, bound since
 * step 7d): what moves a box, and when what it paints meets a money
 * node's line boxes. The probe's half reads the styles and boxes off the
 * prepared paint; its red proofs are the plants in `PROBE-RULES.md`,
 * "Before 8g2, 1c(c)".
 */
import { describe, expect, it } from 'vitest';
import { MEET_TOL, PAINT_ONLY_ANIMATION, kebab, keyframeLonghands, meetsLines, moverKinds, overlap, type MoverFacts } from './digitTrigger';

const still: MoverFacts = {
    position: 'static',
    top: 'auto',
    right: 'auto',
    bottom: 'auto',
    left: 'auto',
    transform: 'none',
    translate: 'none',
    rotate: 'none',
    scale: 'none',
    marginTop: '0px',
    marginRight: '0px',
    marginBottom: '0px',
    marginLeft: '0px',
    offsetPath: 'none',
};

describe('1c(c): what moves a box (moverKinds)', () => {
    it('reads nothing on a box in flow, and nothing on a relative box with no offset', () => {
        expect(moverKinds(still)).toEqual([]);
        expect(moverKinds({ ...still, position: 'relative', top: '0px', left: '0px' })).toEqual([]);
    });
    it('reads 1a’s moves: an offset, a transform, a negative margin', () => {
        expect(moverKinds({ ...still, position: 'relative', top: '-172px' })).toEqual(['top -172px (position relative)']);
        expect(moverKinds({ ...still, transform: 'matrix(1, 0, 0, 1, 0, -40)' })).toHaveLength(1);
        expect(moverKinds({ ...still, translate: '0px -20px' })).toEqual(['translate 0px -20px']);
        expect(moverKinds({ ...still, marginBottom: '-36px' })).toEqual(['margin-bottom -36px']);
    });
    it('reads a sticky box with any inset, a zero one included, and an out-of-flow box', () => {
        expect(moverKinds({ ...still, position: 'sticky', top: '0px' })).toEqual(['position sticky']);
        expect(moverKinds({ ...still, position: 'sticky' })).toEqual([]);
        expect(moverKinds({ ...still, position: 'absolute', top: '0px', left: '0px' })).toEqual(['position absolute']);
        expect(moverKinds({ ...still, position: 'fixed' })).toEqual(['position fixed']);
    });
    it('reads a motion path', () => {
        expect(moverKinds({ ...still, offsetPath: 'path("M 0 0 L 10 10")' })).toHaveLength(1);
    });
    it('reads an animation that sets more than an ink or a ground, and one whose keyframes it cannot read', () => {
        expect(moverKinds(still, [{ name: 'blink', props: ['opacity'] }, { name: 'tint', props: ['background-color', 'color'] }])).toEqual([]);
        expect(moverKinds(still, [{ name: 'sway', props: ['rotate'] }])).toEqual(['animation sway (rotate)']);
        expect(moverKinds(still, [{ name: 'tide', props: [] }])).toEqual(['animation tide (keyframes this page cannot read)']);
        expect(moverKinds(still, [{ name: 'grow', props: ['opacity', 'height'] }])).toEqual(['animation grow (height)']);
    });
    it('holds no longhand that moves a box or what it paints as paint only', () => {
        for (const prop of ['transform', 'translate', 'rotate', 'scale', 'top', 'margin-top', 'height', 'box-shadow', 'outline-width', 'filter', 'clip-path', 'visibility']) {
            expect(PAINT_ONLY_ANIMATION.has(prop)).toBe(false);
        }
    });
});

describe('1c(c): keyframe properties as Chrome names them (kebab, keyframeLonghands)', () => {
    it('turns camel case into the computed style’s kebab case', () => {
        expect(kebab('backgroundColor')).toBe('background-color');
        expect(kebab('webkitTextFillColor')).toBe('-webkit-text-fill-color');
        expect(kebab('--att-sun-angle')).toBe('--att-sun-angle');
        expect(kebab('opacity')).toBe('opacity');
    });
    it('reads every property a run of keyframes sets, and none of its timing keys', () => {
        const frames = [
            { offset: 0, computedOffset: 0, easing: 'linear', composite: 'auto', rotate: '0deg' },
            { offset: 1, computedOffset: 1, easing: 'linear', composite: 'auto', rotate: '1deg', backgroundColor: 'red' },
        ];
        expect(keyframeLonghands(frames).sort()).toEqual(['background-color', 'rotate']);
        expect(keyframeLonghands([{ offset: 0, easing: 'linear', composite: 'auto' }])).toEqual([]);
    });
});

describe('1c(c): when what a mover paints meets money (overlap, meetsLines)', () => {
    const line = { left: 100, top: 100, right: 200, bottom: 120 };
    it('meets a line it overlaps by more than MEET_TOL on both axes', () => {
        expect(meetsLines([{ left: 150, top: 110, right: 400, bottom: 300 }], [line])?.at).toEqual({ left: 150, top: 110, right: 200, bottom: 120 });
    });
    it('does not meet a line it only touches, or overlaps by a rounding sliver', () => {
        expect(meetsLines([{ left: 200, top: 100, right: 300, bottom: 120 }], [line])).toBeUndefined();
        expect(meetsLines([{ left: 0, top: 120 - MEET_TOL, right: 300, bottom: 200 }], [line])).toBeUndefined();
        expect(meetsLines([{ left: 0, top: 119, right: 300, bottom: 200 }], [line])).toBeDefined();
    });
    it('reads an overlap as undefined where the boxes are apart', () => {
        expect(overlap(line, { left: 300, top: 100, right: 400, bottom: 120 })).toBeUndefined();
    });
});
