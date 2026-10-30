/**
 * Two holds the probe page makes through the CSSOM (`layout/probe.ts`), apart
 * so a test can drive them: `holdOff`, a hold that spans the runner's own
 * calls, and `textShadowHeirs`, which uses it to find what inherits a box's
 * text-shadow (the keyframe-values road of 1b, `reachKeyframes`).
 */

/**
 * Hold each of `values`' properties at its value, `!important`, on `els`
 * through the CSSOM, with `transition-property` held at `none` beside them so
 * no transition starts, and answer the function that puts each back as it was
 * (`withHeldOff`'s mechanism, for a hold that spans the runner's own calls —
 * a capture between them): the properties first, then, once the page has
 * taken them with the transitions still held, the transitions, so none of the
 * properties it held starts a transition on the way back either (measured in
 * Chrome at the fifteenth review's fixes: 0 of 96 trials on a box turned by
 * `rotate` or `transform` with a transition on it, a keyframe on its `rotate`
 * among them, `critic15-fixes/runs/m1-holdoff-chrome.log`). A value its
 * elements inherit is not one of its properties, and its change can start a
 * transition when the transitions are put back (`textShadowHeirs`, which
 * cancels what its call starts). A box that had no inline style is left with
 * none. With no `values`, it holds the transitions alone.
 */
export function holdOff(els: readonly (HTMLElement | SVGElement)[], values: Readonly<Record<string, string>>): () => void {
    const props = ['transition-property', ...Object.keys(values)];
    const kept = els.map((el) => props.map((p) => [el.style.getPropertyValue(p), el.style.getPropertyPriority(p)] as const));
    const bare = els.map((el) => !el.hasAttribute('style'));
    for (const el of els) {
        el.style.setProperty('transition-property', 'none', 'important');
        for (const [p, v] of Object.entries(values)) el.style.setProperty(p, v, 'important');
    }
    const restore = (from: number, to: number): void =>
        els.forEach((el, i) => {
            for (let j = from; j < to; j += 1) {
                const [value, priority] = kept[i]![j]!;
                if (value === '') el.style.removeProperty(props[j]!);
                else el.style.setProperty(props[j]!, value, priority);
            }
        });
    return () => {
        restore(1, props.length);
        // The page takes the values back while the transitions are still held, so none starts.
        for (const el of els) void getComputedStyle(el).getPropertyValue(props[1] ?? 'transition-property');
        restore(0, 1);
        els.forEach((el, i) => {
            if (bare[i] && el.getAttribute('style') === '') el.removeAttribute('style');
        });
    };
}

/** The text-shadow `textShadowHeirs` holds a box at: a value no sheet writes. */
export const TEXT_SHADOW_SENTINEL = 'rgb(1, 2, 3) 1px 2px 3px';

/**
 * The text owners under `box` whose text-shadow is the box's own, inherited
 * (`reachKeyframes`; the thirteenth review's item 5): `box`'s text-shadow is
 * held at a sentinel through the CSSOM (`holdOff`), every element under it
 * that `owns` and that computes the sentinel takes it, and the box is put
 * back as it was. An element that sets a text-shadow of its own — `none`
 * included — computes its own, and is not among them, where comparing each
 * with the box's at rest read it with the keyframe's copies whenever the two
 * were equal. A box that holds no inline style (not an HTML or SVG element)
 * has no heirs read.
 *
 * **Every element under the box has its transitions held too, before the box
 * is** (the fourteenth review's M1, the owner's D-2026-10-30-01): an heir
 * with a transition on its text-shadow (`transition: text-shadow .3s`, or
 * `all`) starts a transition toward the sentinel and still computes its old
 * value, so holding the box's transitions alone left it out — the critic's
 * KTSH, a text-shadow keyframe on a name column that the rail label inherited
 * under such a transition, passed the kit's probe (in real playback the heir
 * catches up while the keyframe holds, and its copy lies over the price). The
 * box is put back first and the elements under it after. A transition already
 * running on one of them is cancelled by the hold and does not resume (the
 * CSS Transitions rule for a `transition-property` that no longer names it;
 * observed in Chrome by the fifteenth critic, `critic15/runs/m1-heirs-chrome.log`).
 *
 * **And any transition the call starts on the box or under it is cancelled
 * before it answers** (the fifteenth review's item 4, the owner's
 * D-2026-10-31-01): the put-backs alone did not keep one from starting — in
 * Chrome, on a box whose text-shadow a keyframe sets, an heir under
 * `transition: text-shadow …` (or `all`) was left transitioning from its
 * value toward `none` in 37 of the critic's 144 trials, more often where its
 * style had not been read before the call (`critic15/runs/m1-heirs-chrome-3.log`).
 * So every transition on the box and the elements under it (`getAnimations`
 * with its subtree) that was not running when the call began is cancelled
 * once both are put back. A page with no `getAnimations` cancels nothing.
 */
export function textShadowHeirs(box: Element, owns: (el: Element) => boolean): Element[] {
    if (!(box instanceof HTMLElement || box instanceof SVGElement)) return [];
    const under = [...box.querySelectorAll('*')].filter((el): el is HTMLElement | SVGElement => el instanceof HTMLElement || el instanceof SVGElement);
    const running = new Set(subtreeTransitions(box));
    const putUnderBack = holdOff(under, {});
    const putBack = holdOff([box], { 'text-shadow': TEXT_SHADOW_SENTINEL });
    try {
        const marked = getComputedStyle(box).textShadow;
        return under.filter((el) => owns(el) && getComputedStyle(el).textShadow === marked);
    } finally {
        putBack();
        putUnderBack();
        for (const t of subtreeTransitions(box)) if (!running.has(t)) t.cancel();
    }
}

/**
 * The transitions on `box` and every element under it, pseudo-elements
 * included (`getAnimations({ subtree: true })`, which brings the page's style
 * up to date first, so a transition the last style change started is among
 * them): a CSS transition answers its `transitionProperty`. None where the
 * page has no `getAnimations`.
 */
function subtreeTransitions(box: Element): Animation[] {
    if (typeof box.getAnimations !== 'function') return [];
    return box.getAnimations({ subtree: true }).filter((a) => 'transitionProperty' in a);
}
