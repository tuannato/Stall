// @vitest-environment happy-dom
/**
 * `layout/holdOff.ts`: the CSSOM hold the probe page makes, and
 * `textShadowHeirs` on it (the fourteenth review's M1, the owner's
 * D-2026-10-30-01).
 *
 * happy-dom runs no transition, so `an-heir-with-a-transition-is-still-an-heir`
 * models Chrome's: an element whose computed `transition-property` names
 * `text-shadow` (or `all`) answers the text-shadow it had before the hold, as
 * Chrome's does while the transition toward the sentinel runs (measured by
 * the critic, `critic14/runs/heirs-transition-chrome.log`). Holding the box's
 * transitions alone, as `textShadowHeirs` did until M1, leaves such an heir
 * out, and the test goes red. An element that sets a text-shadow of its own
 * (`none` included) is not an heir; that half is Chrome's cascade, which
 * happy-dom does not follow here (a parent's inline `!important` reaches a
 * child's own declaration through its inheritance), so it is read in Chrome
 * by the ITS plant (`layout/PROBE-RULES.md`, the thirteenth and fourteenth
 * reviews' fixes) and not here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEXT_SHADOW_SENTINEL, holdOff, textShadowHeirs } from './holdOff';

const SHEET = `
.box { text-shadow: rgb(255, 0, 0) 1px 1px 0px }
.slow { transition-property: text-shadow }
.every { transition-property: all }
`;

let style: HTMLStyleElement;
const real = globalThis.getComputedStyle;
beforeEach(() => {
    style = document.createElement('style');
    style.textContent = SHEET;
    document.head.append(style);
    // What each element computed before any hold: a transition that is not held answers it.
    const was = new WeakMap<Element, string>();
    vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
        const cs = real(el, pseudo);
        if (!was.has(el)) was.set(el, cs.textShadow);
        const moving = cs.transitionProperty.split(',').some((p) => ['text-shadow', 'all'].includes(p.trim()));
        if (!moving) return cs;
        return new Proxy(cs, {
            get: (target, prop) => (prop === 'textShadow' ? was.get(el) : Reflect.get(target, prop, target)),
        });
    });
});
afterEach(() => {
    vi.restoreAllMocks();
    style.remove();
    document.body.replaceChildren();
});

function stall(): { box: HTMLElement; kids: Record<string, HTMLElement> } {
    const box = document.createElement('div');
    box.className = 'box';
    const kids: Record<string, HTMLElement> = {};
    for (const name of ['plain', 'slow', 'every']) {
        const kid = document.createElement('span');
        kid.className = name;
        kid.textContent = name;
        box.append(kid);
        kids[name] = kid;
    }
    document.body.append(box);
    // Every element is read once at rest, as the probe reads the paint before it holds anything.
    for (const el of [box, ...Object.values(kids)]) void getComputedStyle(el).textShadow;
    return { box, kids };
}

describe('an-heir-with-a-transition-is-still-an-heir', () => {
    it('takes every element that inherits the box’s text-shadow, a transition on it or not', () => {
        const { box, kids } = stall();
        const heirs = textShadowHeirs(box, () => true);
        expect(heirs).toEqual([kids.plain, kids.slow, kids.every]);
    });

    it('puts every element back as it was: no inline style left where there was none', () => {
        const { box, kids } = stall();
        kids.slow!.style.setProperty('color', 'red');
        textShadowHeirs(box, () => true);
        expect(box.hasAttribute('style')).toBe(false);
        expect(kids.plain!.hasAttribute('style')).toBe(false);
        expect(kids.slow!.getAttribute('style')).toBe('color: red;');
        expect(real(box).textShadow).not.toBe(TEXT_SHADOW_SENTINEL);
        expect(real(kids.slow!).transitionProperty).toBe('text-shadow');
    });

    it('is red where only the box’s transition is held, as before M1: the model of a running transition bites', () => {
        const { box, kids } = stall();
        // The shape before M1, by hand.
        const putBack = holdOff([box], { 'text-shadow': TEXT_SHADOW_SENTINEL });
        const marked = getComputedStyle(box).textShadow;
        const found = [...box.querySelectorAll('*')].filter((el) => getComputedStyle(el).textShadow === marked);
        putBack();
        expect(found).toEqual([kids.plain]);
    });

    it('asks `owns` of every element it takes', () => {
        const { box, kids } = stall();
        expect(textShadowHeirs(box, (el) => el !== kids.slow)).toEqual([kids.plain, kids.every]);
    });

    /*
     * The fifteenth review's item 4 (the owner's D-2026-10-31-01): in Chrome
     * the put-backs alone left an heir transitioning toward `none` in 37 of
     * the critic's 144 trials, so the call cancels every transition on the
     * box and under it that was not running when it began. happy-dom starts
     * no transition, so the page's answers are modelled here: before the
     * call one transition and one animation run; after it, one transition
     * more. Chrome is `critic15-fixes/runs/m1-heirs-chrome-after.log` (0 of
     * 144) against `m1-heirs-chrome-nocancel.log` (38 of 144, the cancel
     * taken out).
     */
    it('cancels the transitions its call started on the box and under it, and no other', () => {
        const { box } = stall();
        const answer = (kind: 'transition' | 'animation') => {
            const a = { cancel: vi.fn(), ...(kind === 'transition' ? { transitionProperty: 'text-shadow' } : { animationName: 'k' }) };
            return a as unknown as Animation & { cancel: ReturnType<typeof vi.fn> };
        };
        const running = answer('transition');
        const keyframes = answer('animation');
        const started = answer('transition');
        const asked: unknown[] = [];
        let calls = 0;
        Object.defineProperty(box, 'getAnimations', {
            configurable: true,
            value: (options?: GetAnimationsOptions) => {
                asked.push(options);
                calls += 1;
                return calls === 1 ? [running, keyframes] : [running, keyframes, started];
            },
        });
        textShadowHeirs(box, () => true);
        expect(asked).toEqual([{ subtree: true }, { subtree: true }]);
        expect(started.cancel).toHaveBeenCalledTimes(1);
        expect(running.cancel).not.toHaveBeenCalled();
        expect(keyframes.cancel).not.toHaveBeenCalled();
    });
});

describe('a-hold-holds-the-transitions-and-puts-them-back', () => {
    it('holds the values and transition-property at none, then puts both back, the inline priority with them', () => {
        const el = document.createElement('div');
        el.style.setProperty('transition-property', 'opacity', 'important');
        document.body.append(el);
        const putBack = holdOff([el], { rotate: 'none' });
        expect(el.style.getPropertyValue('transition-property')).toBe('none');
        expect(el.style.getPropertyValue('rotate')).toBe('none');
        putBack();
        expect(el.style.getPropertyValue('transition-property')).toBe('opacity');
        expect(el.style.getPropertyPriority('transition-property')).toBe('important');
        expect(el.style.getPropertyValue('rotate')).toBe('');
    });
});
