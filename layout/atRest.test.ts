/**
 * The at-rest rule's set-aside decision (`layout/atRest.ts`) is pure, so it
 * is held by behaviour: what a stall root wears and what its row's backdrop
 * computes to decide it, and the look's own class never does. The kit's Neo
 * starter wears Neo's rows and Neo's backdrop under `t-workshop`; the
 * harness's worn-only fixture wears its own class; the same facts under any
 * of them decide the same. Until 2026-10-06 the backdrop's two exceptions
 * asked for `t-neo`, and the Neo starter failed 212 lines its look does not
 * paint.
 */
import { describe, expect, it } from 'vitest';
import { LOOK_BACKDROP, ROOT_LAYERS_SET_ASIDE, colourOf, rootLayerSetAside, surfaceArtSetAside, type RootFacts } from './atRest';
import { FIXTURE_SHEET_CLASS } from './looks';
import { WORKSHOP_SHEET_CLASS } from './workshopLook';

/** Neo's accents, as the stall computes `--s-accent` and `--s-accent-2`. */
const TOKENS: RootFacts['tokens'] = {
    '--s-accent': colourOf('rgb(44, 233, 224)'),
    '--s-accent-2': colourOf('rgb(255, 77, 122)'),
};

/** Neo's backdrop as Chrome computes `var(--s-backdrop)`: the scanlines and the top glow. */
const SCANLINES =
    'repeating-linear-gradient(0deg, color(srgb 0.172549 0.913725 0.878431 / 0.04) 0px, color(srgb 0.172549 0.913725 0.878431 / 0.04) 1px, rgba(0, 0, 0, 0) 1px, rgba(0, 0, 0, 0) 4px)';
const GLOW = 'linear-gradient(color(srgb 0.0563 0.1301 0.1561) 0%, rgb(7, 11, 20) 480px)';
const BACKDROP = [SCANLINES, GLOW];

const RAIN = 'url("http://127.0.0.1:4319/assets/rain-near-Ab12Cd.svg")';
const WASH = 'radial-gradient(farthest-side, color(srgb 0.172549 0.913725 0.878431 / 0.28), rgba(0, 0, 0, 0) 66%)';
const TINT =
    'linear-gradient(140deg, color(srgb 0.172549 0.913725 0.878431 / 0.16), rgba(0, 0, 0, 0) 46%, color(srgb 1 0.301961 0.478431 / 0.16))';
const HORIZON = 'url("http://127.0.0.1:4319/assets/horizon-moon-Ef34Gh.svg")';

/** Layers no rule sets aside: a scanline in another colour, a wash in a colour no token holds, a plain gradient, a picture. */
const STRANGERS = [
    'repeating-linear-gradient(0deg, color(srgb 1 1 1 / 0.04) 0px, color(srgb 1 1 1 / 0.04) 1px, rgba(0, 0, 0, 0) 1px, rgba(0, 0, 0, 0) 4px)',
    'linear-gradient(rgb(255, 255, 255) 0%, rgb(7, 11, 20) 480px)',
    'radial-gradient(farthest-side, color(srgb 0.5 0.5 0.5 / 0.28), rgba(0, 0, 0, 0) 66%)',
    'linear-gradient(rgb(7, 11, 20), rgb(7, 11, 20))',
    'url("http://127.0.0.1:4319/assets/someone-else.svg")',
];

const LOOK_CLASSES = ['t-neo', WORKSHOP_SHEET_CLASS, FIXTURE_SHEET_CLASS, 't-rural', 't-modern'];
const WORN = ['att-hum', 'att-rainfall', 'att-horizon', 'att-aurora'];

function facts(look: string | undefined, worn: readonly string[], backdrop: readonly string[] = BACKDROP): RootFacts {
    return { classes: ['stall', ...(look === undefined ? [] : [look]), ...worn], backdrop, tokens: TOKENS };
}

describe('the-at-rest-exceptions-decide-the-same-for-a-starter-and-its-look', () => {
    it('sets aside the same layers for the same facts under t-neo, t-workshop, the fixture’s class and none', () => {
        const expected: Record<string, string | undefined> = {
            [RAIN]: 'the rain',
            [WASH]: 'the aurora’s washes',
            [TINT]: 'the aurora’s tint over the rain',
            [SCANLINES]: 'the backdrop’s scanlines',
            [GLOW]: 'the backdrop’s top glow',
            ...Object.fromEntries(STRANGERS.map((layer) => [layer, undefined])),
        };
        // Every entry of the table is reached, so the case is not over a part of it.
        expect(new Set(Object.values(expected).filter(Boolean))).toEqual(new Set(ROOT_LAYERS_SET_ASIDE.map((k) => k.name)));
        for (const look of [...LOOK_CLASSES, undefined]) {
            const said = Object.fromEntries(Object.keys(expected).map((layer) => [layer, rootLayerSetAside(layer, facts(look, WORN))]));
            expect(said, look ?? 'no look class').toEqual(expected);
        }
    });

    it('lets the backdrop’s data decide, never the look’s class', () => {
        for (const look of [...LOOK_CLASSES, undefined]) {
            // No backdrop on the row: Neo's two shapes are a ground, on `t-neo` as anywhere.
            expect(rootLayerSetAside(SCANLINES, facts(look, WORN, [])), look).toBeUndefined();
            expect(rootLayerSetAside(GLOW, facts(look, WORN, [])), look).toBeUndefined();
            // The backdrop's own layers are set aside with nothing worn at all.
            expect(rootLayerSetAside(SCANLINES, facts(look, [])), look).toBe('the backdrop’s scanlines');
            // The form alone is not enough: a scanline the backdrop does not paint is read.
            expect(rootLayerSetAside(STRANGERS[0]!, facts(look, WORN, [STRANGERS[0]!.replace('1 1 1', '1 1 0.9')])), look).toBeUndefined();
        }
    });

    it('lets what is worn decide the decorations’ layers, never the look’s class', () => {
        for (const look of [...LOOK_CLASSES, undefined]) {
            const bare = facts(look, []);
            expect(rootLayerSetAside(RAIN, bare), look).toBeUndefined();
            expect(rootLayerSetAside(WASH, bare), look).toBeUndefined();
            expect(rootLayerSetAside(TINT, bare), look).toBeUndefined();
            // A wash in the look's accents but not the stall's own tokens is read.
            expect(rootLayerSetAside(WASH, { ...facts(look, WORN), tokens: {} }), look).toBeUndefined();
            // The horizon's art, on the sign alone and only where it is worn.
            const sign = (selector: string): boolean => selector === '.stall-sign';
            expect(surfaceArtSetAside(HORIZON, facts(look, WORN).classes, sign), look).toBe('Grid horizon’s skyline, moon and stars');
            expect(surfaceArtSetAside(HORIZON, facts(look, WORN).classes, () => false), look).toBeUndefined();
            expect(surfaceArtSetAside(HORIZON, bare.classes, sign), look).toBeUndefined();
        }
    });

    it('names a decoration’s class or the look’s backdrop as what paints each layer', () => {
        expect(LOOK_BACKDROP).toBe('--s-backdrop');
        for (const k of ROOT_LAYERS_SET_ASIDE) {
            expect(k.paints === LOOK_BACKDROP || /^att-[a-z-]+$/.test(k.paints), k.name).toBe(true);
        }
    });
});
