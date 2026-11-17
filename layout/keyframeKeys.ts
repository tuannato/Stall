/**
 * **A keyframe's key as the property it names** (the still-painter step,
 * D-2026-11-17-02; the 8i-2 critic's P3-2). Chrome's `getKeyframes()` names
 * each property it animates in camel case, and names a property Chrome holds
 * only under a vendor prefix with that prefix in lower case and no dash: an
 * unprefixed `mask-position` comes back as `webkitMaskPositionX` and
 * `webkitMaskPositionY`, because Chrome's longhands of that shorthand are
 * `-webkit-mask-position-x` and `-webkit-mask-position-y` (measured in
 * Chrome 157, `layout/PROBE-RULES.md`, "The still painter"). A camel-to-kebab
 * mapping that only puts a dash before each capital turns that into
 * `webkit-mask-position-x`, with no leading dash: a name no computed style
 * and no list of longhands holds, so every list the probe keys on a
 * prefixed longhand missed it. This is the one mapping every keyframe read in
 * the probe goes through: 1a's end read, 1b's seek and its keyframe-values
 * road, the keyframe-offset reads, `movesOtherBoxes`, `groundOnly`, the dress
 * rule's `animationFaults`, 1c's trigger, and the four reads that look up a
 * longhand by name (`animatedAway`, `outerShadowOnly`, `widestTurn`,
 * `movesBackground`, routed through it after the still-painter critic's
 * P3-3); and the probe holds every name it maps to one CSS knows
 * (`a-keyframe-key-is-read-as-a-longhand-css-knows`).
 *
 * - a custom property (`--x`) stands as it is;
 * - `cssFloat` is `float` and `cssOffset` is `offset` (the Web Animations
 *   names for the two properties whose own names a keyframe object already
 *   uses: `float` is reserved, and `offset` is the keyframe's own offset);
 * - a key that opens with a vendor prefix in either case (`webkit`,
 *   `Webkit`, `moz`, `Moz`, `ms`, `Ms`) followed by a capital is that
 *   prefix's property, `-webkit-…`, `-moz-…`, `-ms-…`;
 * - anything else takes a dash and a lower-case letter for each capital.
 */

/** The keys of a keyframe that are not properties. */
export const KEYFRAME_META: ReadonlySet<string> = new Set(['offset', 'computedOffset', 'easing', 'composite']);

/** A vendor prefix as a keyframe key opens with it: either case, then a capital. */
const VENDOR = /^(webkit|Webkit|moz|Moz|ms|Ms)(?=[A-Z])/;

/** A keyframe property as `getKeyframes()` names it (camel case), in the computed style's kebab case. */
export function keyframeProperty(key: string): string {
    if (key.startsWith('--')) return key;
    if (key === 'cssFloat') return 'float';
    if (key === 'cssOffset') return 'offset';
    const vendor = VENDOR.exec(key);
    const rest = vendor === null ? key : key.slice(vendor[1]!.length);
    const kebab = rest.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    return vendor === null ? kebab : `-${vendor[1]!.toLowerCase()}${kebab}`;
}

/**
 * The value a keyframe sets for `prop` (kebab case, as the computed style
 * names it), read through `keyframeProperty` so a prefixed property is found
 * under the key Chrome gives it; undefined where the keyframe sets none.
 */
export function keyframeValue(frame: Readonly<Record<string, unknown>>, prop: string): string | undefined {
    for (const [key, value] of Object.entries(frame)) {
        if (KEYFRAME_META.has(key) || typeof value !== 'string') continue;
        if (keyframeProperty(key) === prop) return value;
    }
    return undefined;
}

/** The properties a run of keyframes sets (`getKeyframes()`), in kebab case. */
export function keyframeLonghands(frames: readonly Readonly<Record<string, unknown>>[]): string[] {
    const out = new Set<string>();
    for (const frame of frames) for (const key of Object.keys(frame)) if (!KEYFRAME_META.has(key)) out.add(keyframeProperty(key));
    return [...out];
}
