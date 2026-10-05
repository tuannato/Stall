/**
 * `moodClassProblems` is the pin test's and the kit's reading of what a
 * mood's class may be (D11). The catalogue carries no mood with a class
 * today, so the pin test iterates it vacuously; this is where the rule is
 * shown to refuse something.
 */
import { describe, expect, it } from 'vitest';
import { SHIPPED_ATTACHMENTS, type ShippedAttachment } from './attachments';
import { ATT_CLASS, moodClassProblems, sameOwner } from './moodClass';

const mood = (cls: string | undefined, extra: Partial<ShippedAttachment> = {}): ShippedAttachment => ({
    themeId: 3,
    bit: 9,
    slot: 'mood',
    label: 'Harness dusk',
    place: 'the whole palette',
    motion: false,
    palette: { bg: { r: 1, g: 2, b: 3 } },
    ...(cls === undefined ? {} : { cls }),
    ...extra,
});

describe('a-mood-class-is-look-scoped (the shape and the owner)', () => {
    it('takes no class, or one att- class nobody else owns', () => {
        expect(moodClassProblems(mood(undefined), SHIPPED_ATTACHMENTS)).toEqual([]);
        expect(moodClassProblems(mood('att-harness-dusk'), SHIPPED_ATTACHMENTS)).toEqual([]);
        // The row itself in the list is not a collision.
        const own = mood('att-harness-dusk');
        expect(moodClassProblems(own, [...SHIPPED_ATTACHMENTS, own])).toEqual([]);
    });

    it('refuses a class without the prefix, a paint field, and one another row owns', () => {
        expect(moodClassProblems(mood('dusk'), [])).toHaveLength(1);
        expect(moodClassProblems(mood('att-Dusk'), [])).toHaveLength(1);
        expect(moodClassProblems(mood('att-dusk', { paint: 'root' }), [])).toHaveLength(1);
        // Neo's rain paints on `.stall.att-rainfall` from stall.css, look-blind:
        // a mood by that name would wear it.
        expect(moodClassProblems(mood('att-rainfall'), SHIPPED_ATTACHMENTS)[0]).toMatch(/att-rainfall: is also att-rainfall/);
        // Ownership runs both ways: a child of a row's class, and a parent.
        expect(moodClassProblems(mood('att-beetle-glow'), SHIPPED_ATTACHMENTS)[0]).toMatch(/shares an owner with att-beetle/);
        expect(moodClassProblems(mood('att-sun'), [mood('att-sun-x', { label: 'X' })])[0]).toMatch(/shares an owner/);
    });

    it('reads the prefix rule the way the decor gate reads child classes', () => {
        expect(sameOwner('att-beetle', 'att-beetle-bug')).toBe(true);
        expect(sameOwner('att-beetle', 'att-beetles')).toBe(false);
        expect(ATT_CLASS.test('att-a-b')).toBe(true);
        expect(ATT_CLASS.test('att-a--b')).toBe(false);
    });
});
