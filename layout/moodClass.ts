/**
 * What a mood's class may be (D11, step 5c, 2026-09-27).
 *
 * A mood moved the palette and nothing else until this step, because a class
 * on the stall root would have reached the stream overlay, whose branch
 * wears a mood (`renderStall` keeps `slot: 'mood'` rows there). Ink wash's
 * 拓本 moods need their own line angles, which no token carries, so a mood
 * may now name one class — and the three things that make that safe are
 * held in three places:
 *
 * - **its shape**, here: one class, the decorations' own `att-` prefix and
 *   alphabet, so every sweep that finds a decoration by prefix (the probe's
 *   `decorations()`, the door's strip, the overlay's strip) finds it, and no
 *   `paint` field — a mood's class lands on the stall root, always
 *   (`attachmentClasses`);
 * - **its scope**: no other row owns it, in either direction of the
 *   `att-a` / `att-a-b` child-class rule the decor gate uses — a mood named
 *   `att-rainfall` would wear Neo's rain wherever stall.css paints
 *   `.stall.att-rainfall`, which is not look-scoped. The CSS half (every rule
 *   naming it names its look's class too) is `a-mood-class-is-look-scoped`
 *   for a shipped look, and the kit's lint for a creator's (every selector
 *   under `.t-workshop`);
 * - **the overlay strip**: `a-mood-class-never-reaches-the-overlay`.
 *
 * Used by the catalogue's pin test, the decor gate and the kit's `look.json`
 * validator, so the three agree on what a mood's class is.
 */
import type { ShippedAttachment } from '../src/domain/attachments';

/** One class: `att-`, then lower-case letters and digits in hyphen-separated runs. */
export const ATT_CLASS = /^att-[a-z0-9]+(-[a-z0-9]+)*$/;

/** Whether two classes are one row's: equal, or one the other's child (`att-beetle-bug` is `att-beetle`'s). */
export function sameOwner(a: string, b: string): boolean {
    return a === b || a.startsWith(`${b}-`) || b.startsWith(`${a}-`);
}

/**
 * Every problem with `mood`'s class, against every other row it could be
 * confused with (`others`: the shipped catalogue, and a kit look's own rows).
 * Empty for a mood with no class. The row itself may be in `others`.
 */
export function moodClassProblems(
    mood: Pick<ShippedAttachment, 'slot' | 'cls' | 'paint' | 'label'>,
    others: readonly Pick<ShippedAttachment, 'cls' | 'label'>[],
): string[] {
    if (mood.slot !== 'mood' || mood.cls === undefined) {
        return [];
    }
    const out: string[] = [];
    if (!ATT_CLASS.test(mood.cls)) {
        out.push(`${mood.cls}: must be one class starting with "att-", lower-case letters, digits and single hyphens`);
    }
    if (mood.paint !== undefined) {
        out.push(`${mood.cls}: a mood's class lands on the stall root — no "paint"`);
    }
    for (const other of others) {
        if (other === mood || other.cls === undefined) {
            continue;
        }
        if (sameOwner(mood.cls, other.cls)) {
            const how = other.cls === mood.cls ? 'is also' : 'shares an owner with';
            out.push(`${mood.cls}: ${how} ${other.cls} ("${other.label}") — a mood's class is its look's own`);
        }
    }
    return out;
}
