// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { SCREENS, handlers } from '../../layout/fixtures';
import { setNameTierFits } from './lookHooks';
import { header, renderStall } from './render';

/**
 * The renderer's half of step 8f1's shared hooks: the sign's script, the
 * name ladder run after a paint, and the zoom's reset. Where the marks
 * stand is `layout/lookMarks.test.ts`'s, over every probe screen.
 */

const UI_DIR = dirname(fileURLToPath(import.meta.url));

afterEach(() => {
    setNameTierFits(undefined);
    document.head.querySelectorAll('style[data-test]').forEach((node) => node.remove());
    document.body.replaceChildren();
});

describe('the-sign-says-when-its-name-is-written-in-cjk', () => {
    it('marks a CJK name and a CJK tagline, each on its own text, and nothing else', () => {
        const cjk = header('茶屋さくら', undefined, undefined, 'Fresh tea every morning');
        expect(cjk.querySelector('.stall-name')?.getAttribute('data-script')).toBe('cjk');
        expect(cjk.querySelector('.stall-tagline')?.hasAttribute('data-script')).toBe(false);
        const latin = header('Roasted Beans', undefined, undefined, '毎朝の新しいお茶');
        expect(latin.querySelector('.stall-name')?.hasAttribute('data-script')).toBe(false);
        expect(latin.querySelector('.stall-tagline')?.getAttribute('data-script')).toBe('cjk');
        // The lamp's span still splits the name; the attribute is on the h1.
        expect(cjk.querySelector('.stall-name')?.textContent).toBe('茶屋さくら');
        for (const name of ['Cà phê Sữa đá', 'Fittings', '茶 Tea']) {
            expect(header(name).querySelector('[data-script]'), name).toBeNull();
        }
    });
});

describe('the-name-ladder-runs-after-every-paint', () => {
    /**
     * `applyNameTiers` after the shop's paint and the wall's, before the
     * rows' lines are measured. The rung count comes from the look's sheet;
     * here a test sheet names two rungs and the fit is injected (happy-dom
     * lays nothing out): a name that fits nowhere stands on the last rung.
     */
    it('climbs the ladder a sheet names, on the shop and on the wall, and leaves a look with none alone', () => {
        setNameTierFits(() => false);
        for (const screen of ['offers', 'shop-window-browse']) {
            const root = document.createElement('div');
            document.body.append(root);
            renderStall(root, SCREENS[screen]!, handlers);
            expect(root.querySelector('.shop-window') !== null, `${screen} paints its own road`).toBe(screen !== 'offers');
            expect(root.querySelector('.stall-name')?.hasAttribute('data-name-tier'), `${screen}: no ladder`).toBe(false);
            const style = document.createElement('style');
            style.setAttribute('data-test', '');
            style.textContent = '.stall-name { --name-rungs: 2; }';
            document.head.append(style);
            renderStall(root, SCREENS[screen]!, handlers);
            expect(root.querySelector('.stall-name')?.getAttribute('data-name-tier'), screen).toBe('2');
            style.remove();
            root.remove();
        }
    });
});

describe('the-zoom-takes-off-a-looks-mask', () => {
    /**
     * A look that masks its tiles would cut the seller's
     * picture to that shape on the zoom too — `.zoom-ic` IS `.item-ic`. The
     * reset is (0,3,0), out-ranking every look's `.t-* .item-ic`, and takes
     * the mask off beside the radius and the clip; the tile's mark stays off
     * the zoom. The probe's reading of the computed mask is step 8f2's.
     */
    it('resets the mask both ways at (0,3,0), with the rest of the shelf’s framing', () => {
        const css = readFileSync(join(UI_DIR, 'stall.css'), 'utf8');
        const block = /\n\.zoom-frame \.zoom-ic\.item-ic \{([^}]+)\}/.exec(css)?.[1] ?? '';
        for (const decl of ['border-radius: 0;', 'clip-path: none;', '-webkit-mask: none;', 'mask: none;']) {
            expect(block, decl).toContain(decl);
        }
    });
});
