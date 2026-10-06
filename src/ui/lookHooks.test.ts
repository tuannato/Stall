// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { NAME_RUNGS_PROPERTY, NAME_TIER_MAX, applyNameTiers, lookMark, nameRungs, setNameTierFits } from './lookHooks';

/**
 * Step 8f1's shared hooks, the half that is not the renderer's placement
 * (`render.hooks.test.ts` holds where each mark stands).
 */

afterEach(() => {
    setNameTierFits(undefined);
    document.head.querySelectorAll('style[data-test]').forEach((node) => node.remove());
    document.body.replaceChildren();
});

describe('a-look-mark-is-an-inert-node', () => {
    it('is an empty, hidden-from-readers <i> naming its kind', () => {
        for (const kind of ['figure', 'shelf', 'tile'] as const) {
            const mark = lookMark(kind);
            expect(mark.tagName).toBe('I');
            expect(mark.getAttribute('aria-hidden')).toBe('true');
            expect(mark.getAttribute('data-look-mark')).toBe(kind);
            expect(mark.classList.contains('look-mark')).toBe(true);
            expect(mark.classList.contains(`mark-${kind}`)).toBe(true);
            expect(mark.childNodes).toHaveLength(0);
        }
    });
});

describe('the-name-climbs-the-looks-ladder-until-it-fits', () => {
    /**
     * A look that bounds the name's box names its rungs
     * in `--name-rungs`; the ladder tries the name at its own size and then
     * each rung, and stops at the first that fits. happy-dom lays nothing
     * out, so the fit is injected: a name that fits from rung `fitsFrom`.
     */
    const named = (rungs?: string): HTMLElement => {
        const name = document.createElement('h1');
        name.className = 'stall-name';
        name.textContent = 'A thirty-two byte seller name ok';
        if (rungs !== undefined) {
            name.style.setProperty(NAME_RUNGS_PROPERTY, rungs);
        }
        document.body.append(name);
        return name;
    };
    const fitsFrom = (rung: number) => (name: HTMLElement) => Number(name.getAttribute('data-name-tier') ?? '0') >= rung;

    it('leaves a name on a look with no ladder alone, and takes a rung a look left behind off', () => {
        const name = named();
        let asked = 0;
        setNameTierFits(() => {
            asked += 1;
            return false;
        });
        applyNameTiers(document);
        expect(name.hasAttribute('data-name-tier')).toBe(false);
        expect(asked, 'no layout forced on a look with no ladder').toBe(0);
        name.setAttribute('data-name-tier', '3');
        applyNameTiers(document);
        expect(name.hasAttribute('data-name-tier')).toBe(false);
    });

    it('stops at the first rung that fits, and stands on the last when none does', () => {
        const name = named('5');
        setNameTierFits(fitsFrom(0));
        applyNameTiers(document);
        expect(name.hasAttribute('data-name-tier'), 'fits at its own size').toBe(false);
        setNameTierFits(fitsFrom(3));
        applyNameTiers(document);
        expect(name.getAttribute('data-name-tier')).toBe('3');
        setNameTierFits(() => false);
        applyNameTiers(document);
        expect(name.getAttribute('data-name-tier'), 'the last rung is the one that always fits').toBe('5');
        // Measured again from its own size: a name that fits again climbs down.
        setNameTierFits(fitsFrom(1));
        applyNameTiers(document);
        expect(name.getAttribute('data-name-tier')).toBe('1');
    });

    it('reads the rung count with no rung on, so a look that restates it under a rung cannot flip it', () => {
        // The look states its rungs on the name and, under its last rung,
        // none: read under the rung the last paint left, the ladder would be
        // gone on every other paint (the 8f1 critic's item 6).
        const style = document.createElement('style');
        style.setAttribute('data-test', '');
        style.textContent = '.stall-name { --name-rungs: 2; } .stall-name[data-name-tier="2"] { --name-rungs: 0; }';
        document.head.append(style);
        const name = named();
        setNameTierFits(() => false);
        for (let paint = 0; paint < 3; paint += 1) {
            applyNameTiers(document);
            expect(name.getAttribute('data-name-tier'), `paint ${paint}`).toBe('2');
        }
    });

    it('reads a whole number of rungs up to the most a look may have, and nothing else', () => {
        expect(nameRungs(named('4'))).toBe(4);
        expect(nameRungs(named(String(NAME_TIER_MAX + 3)))).toBe(NAME_TIER_MAX);
        for (const bad of ['2.5', '-1', 'two', '']) {
            expect(nameRungs(named(bad)), bad).toBe(0);
        }
        expect(NAME_TIER_MAX).toBe(6);
    });
});
