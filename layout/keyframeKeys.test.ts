/**
 * `keyframeKeys.ts`: a keyframe's key as the longhand it names (the
 * still-painter step, the 8i-2 critic's P3-2). The prefixed keys below are
 * every one Chrome 157's `getKeyframes()` gave for a `@keyframes` rule naming
 * each property its computed style lists (`layout/PROBE-RULES.md`, "The still
 * painter"): before this mapping the probe read each without its leading
 * dash, a name no list holds.
 */
import { describe, expect, it } from 'vitest';
import { KEYFRAME_META, keyframeLonghands, keyframeProperty, keyframeValue } from './keyframeKeys';

/** Every vendor-prefixed key Chrome 157 gave, with the property each names (measured). */
const CHROME_PREFIXED: readonly (readonly [string, string])[] = [
    ['webkitBorderHorizontalSpacing', '-webkit-border-horizontal-spacing'],
    ['webkitBorderImage', '-webkit-border-image'],
    ['webkitBorderVerticalSpacing', '-webkit-border-vertical-spacing'],
    ['webkitBoxAlign', '-webkit-box-align'],
    ['webkitBoxDecorationBreak', '-webkit-box-decoration-break'],
    ['webkitBoxDirection', '-webkit-box-direction'],
    ['webkitBoxFlex', '-webkit-box-flex'],
    ['webkitBoxOrdinalGroup', '-webkit-box-ordinal-group'],
    ['webkitBoxOrient', '-webkit-box-orient'],
    ['webkitBoxPack', '-webkit-box-pack'],
    ['webkitBoxReflect', '-webkit-box-reflect'],
    ['webkitFontSmoothing', '-webkit-font-smoothing'],
    ['webkitLineBreak', '-webkit-line-break'],
    ['webkitLineClamp', '-webkit-line-clamp'],
    ['webkitLocale', '-webkit-locale'],
    ['webkitMaskBoxImageOutset', '-webkit-mask-box-image-outset'],
    ['webkitMaskBoxImageRepeat', '-webkit-mask-box-image-repeat'],
    ['webkitMaskBoxImageSlice', '-webkit-mask-box-image-slice'],
    ['webkitMaskBoxImageSource', '-webkit-mask-box-image-source'],
    ['webkitMaskBoxImageWidth', '-webkit-mask-box-image-width'],
    ['webkitMaskPositionX', '-webkit-mask-position-x'],
    ['webkitMaskPositionY', '-webkit-mask-position-y'],
    ['webkitRtlOrdering', '-webkit-rtl-ordering'],
    ['webkitRubyPosition', '-webkit-ruby-position'],
    ['webkitTapHighlightColor', '-webkit-tap-highlight-color'],
    ['webkitTextCombine', '-webkit-text-combine'],
    ['webkitTextDecorationsInEffect', '-webkit-text-decorations-in-effect'],
    ['webkitTextFillColor', '-webkit-text-fill-color'],
    ['webkitTextOrientation', '-webkit-text-orientation'],
    ['webkitTextSecurity', '-webkit-text-security'],
    ['webkitTextStrokeColor', '-webkit-text-stroke-color'],
    ['webkitTextStrokeWidth', '-webkit-text-stroke-width'],
    ['webkitUserDrag', '-webkit-user-drag'],
    ['webkitUserModify', '-webkit-user-modify'],
];

describe('a keyframe’s key as the longhand it names (keyframeProperty)', () => {
    it('gives every prefixed key Chrome reports its leading dash', () => {
        for (const [key, prop] of CHROME_PREFIXED) expect(keyframeProperty(key), key).toBe(prop);
    });
    it('reads an unprefixed mask-position as Chrome names its longhands, the names the probe’s lists hold', () => {
        expect(keyframeLonghands([{ offset: 0, webkitMaskPositionX: '0px', webkitMaskPositionY: '100%' }]).sort()).toEqual([
            '-webkit-mask-position-x',
            '-webkit-mask-position-y',
        ]);
    });
    it('reads a prefix in either case, for each vendor, and only before a capital', () => {
        expect(keyframeProperty('WebkitTextFillColor')).toBe('-webkit-text-fill-color');
        expect(keyframeProperty('mozOsxFontSmoothing')).toBe('-moz-osx-font-smoothing');
        expect(keyframeProperty('MozAppearance')).toBe('-moz-appearance');
        expect(keyframeProperty('msTransform')).toBe('-ms-transform');
        // A property that merely opens with those letters is not a prefix.
        expect(keyframeProperty('mask')).toBe('mask');
        expect(keyframeProperty('maskPosition')).toBe('mask-position');
        expect(keyframeProperty('mathDepth')).toBe('math-depth');
    });
    it('keeps a custom property and the two Web Animations names as CSS writes them', () => {
        expect(keyframeProperty('--att-sun-angle')).toBe('--att-sun-angle');
        expect(keyframeProperty('cssFloat')).toBe('float');
        expect(keyframeProperty('cssOffset')).toBe('offset');
        expect(keyframeProperty('backgroundColor')).toBe('background-color');
        expect(keyframeProperty('opacity')).toBe('opacity');
    });
    it('names no property for the keyframe’s own keys', () => {
        expect([...KEYFRAME_META].sort()).toEqual(['composite', 'computedOffset', 'easing', 'offset']);
        expect(keyframeLonghands([{ offset: 0, computedOffset: 0, easing: 'linear', composite: 'auto', rotate: '1deg' }])).toEqual(['rotate']);
    });
});

describe('a keyframe’s value for a longhand (keyframeValue)', () => {
    it('finds a prefixed longhand under the key Chrome gives it, and nothing a keyframe does not set', () => {
        const frame = { offset: 0.5, easing: 'linear', webkitTextFillColor: 'transparent', boxShadow: 'none', webkitMaskPositionX: '3px' };
        expect(keyframeValue(frame, '-webkit-text-fill-color')).toBe('transparent');
        expect(keyframeValue(frame, '-webkit-mask-position-x')).toBe('3px');
        expect(keyframeValue(frame, 'box-shadow')).toBe('none');
        expect(keyframeValue(frame, 'filter')).toBeUndefined();
        expect(keyframeValue(frame, 'offset')).toBeUndefined();
    });
});
