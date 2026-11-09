/**
 * The ground stack's pure half (`layout/groundStack.ts`; round 5 of
 * `a-money-figure-is-never-misdressed`, the critic's P1-1 and P1-2 on round
 * 4). Held by behaviour: what a computed value writes is read as colours, a
 * stack of paints is composited the way a browser composites it, and the
 * judge fails a stretch of ink only where the composite under it reads
 * under the floor — the critic's plants given as the numbers the probe
 * hands it. The engine half (resolving a colour, reading paints off a page)
 * is the probe's, proved red in a browser (`layout/PROBE-RULES.md`).
 */
import { describe, expect, it } from 'vitest';
import type { Colour } from './atRest';
import {
    byScroller,
    colourTokens,
    composite,
    cellsOf,
    cutsBelowScroller,
    everyMixReads,
    fromTopmostOpaque,
    hidesBelow,
    layerCovers,
    luminance,
    mostOpaque,
    paintsNothing,
    picturesShowing,
    placeGradient,
    placeTile,
    readGradient,
    shiftFor,
    srgbColour,
    stopsOver,
    tileArea,
    tileBand,
    tileHoldsItsGradient,
    worstGround,
    STACK_CHOICES_CAP,
    type GradientPlace,
    type StackPaint,
} from './groundStack';

const c = (r: number, g: number, b: number, alpha = 1): Colour => ({ rgb: [r, g, b], alpha });
const INK: [number, number, number] = [74, 52, 30]; // a Rural-brown ink
const CREAM = c(244, 234, 214);
const ink = (alpha: number): Colour => c(...INK, alpha);
const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });
const GLYPHS = box(10, 10, 110, 40);
const OVER = [box(0, 0, 200, 100)];

describe('a-money-figure-is-never-misdressed: the ground stack', () => {
    it('reads every colour a computed value writes, and refuses one it cannot take apart', () => {
        expect(colourTokens('linear-gradient(oklch(0.5 0.1 30 / 0.49), color(srgb 1 0 0) 50%)')?.tokens).toEqual([
            'oklch(0.5 0.1 30 / 0.49)',
            'color(srgb 1 0 0)',
        ]);
        expect(colourTokens('color-mix(in oklch, currentcolor 100%, transparent)')?.tokens).toEqual([
            'color-mix(in oklch, currentcolor 100%, transparent)',
        ]);
        expect(colourTokens('rgb(0, 0, 0) 0px 0px 0px 64px inset')?.tokens).toEqual(['rgb(0, 0, 0)']);
        // A named colour is a bare word, which the probe asks the engine about;
        // a hex colour is a token; a number's unit is neither.
        expect(colourTokens('red 0px 2px 0px')).toEqual({ tokens: [], words: ['red'] });
        expect(colourTokens('linear-gradient(to right, #ff0000, transparent 66%)')).toEqual({ tokens: ['#ff0000', 'transparent'], words: ['to', 'right'] });
        // A picture's address is never read for colour.
        expect(colourTokens('url("a(red).svg")')).toEqual({ tokens: [], words: [] });
        expect(colourTokens('oklch(0.5 0.1 30')).toBeUndefined();
        expect(colourTokens('rgb(0, 0, 0))')).toBeUndefined();
    });

    it('reads the engine’s sRGB answer, clipped to the gamut, and nothing else', () => {
        expect(srgbColour('color(srgb 0.5 1.2 -0.1 / 0.49)')).toEqual({ rgb: [127.5, 255, 0], alpha: 0.49 });
        expect(srgbColour('color(srgb 1 0 0)')).toEqual({ rgb: [255, 0, 0], alpha: 1 });
        expect(srgbColour('rgba(10, 20, 30, 0.5)')).toEqual({ rgb: [10, 20, 30], alpha: 0.5 });
        expect(srgbColour('oklch(0.5 0.1 30)')).toBeUndefined();
        expect(srgbColour('color(display-p3 1 0 0)')).toBeUndefined();
    });

    it('composites paints bottom first, as a browser does', () => {
        // Five layers of the ink at 0.49 are 1 − 0.51⁵ ≈ 0.97 opaque together.
        const five = composite([ink(0.49), ink(0.49), ink(0.49), ink(0.49), ink(0.49)]);
        expect(five.alpha).toBeCloseTo(1 - 0.51 ** 5, 6);
        expect(five.rgb.map(Math.round)).toEqual(INK);
        // An opaque paint on top is all there is.
        expect(composite([ink(1), CREAM])).toEqual(CREAM);
        expect(composite([]).alpha).toBe(0);
        expect(mostOpaque([[ink(0.49)], [ink(0.49), ink(0.2)]])).toBeCloseTo(1 - 0.51 * 0.51, 6);
    });

    it('fails five layers of the ink at 0.49 over the ground, which round 4 passed one by one (the critic’s N9b)', () => {
        const paints = [
            { what: 'ground of the card', candidates: [CREAM], rects: OVER },
            ...[1, 2, 3, 4, 5].map((n) => ({ what: `layer ${n}`, candidates: [ink(0.49)], rects: OVER })),
        ];
        const v = worstGround(paints, GLYPHS, INK, 3, 0.5);
        expect(v !== undefined && 'ratio' in v && v.ratio < 1.2).toBe(true);
        // One such layer leaves a ground that reads (the cream shows through).
        expect(worstGround(paints.slice(0, 2), GLYPHS, INK, 3, 0.5)).toBeUndefined();
    });

    it('fails a ground in the ink’s own colour however it was written (the critic’s N9a, resolved to sRGB)', () => {
        const v = worstGround([{ what: 'its ground', candidates: [ink(1)], rects: OVER }], GLYPHS, INK, 3, 0.5);
        expect(v !== undefined && 'ratio' in v ? v.ratio : 0).toBeCloseTo(1, 6);
    });

    it('judges each cell by the paints that cover it, so a contrasting paint covers only where it paints', () => {
        // An ink-coloured ground over the left half of the glyphs, the cream
        // card everywhere, and a cream patch over the right half only.
        const paints = [
            { what: 'card', candidates: [CREAM], rects: OVER },
            { what: 'dark half', candidates: [ink(1)], rects: [box(0, 0, 60, 100)] },
            { what: 'cream patch', candidates: [CREAM], rects: [box(60, 0, 200, 100)] },
        ];
        expect(cellsOf(GLYPHS, paints.flatMap((p) => p.rects))).toHaveLength(2);
        const v = worstGround(paints, GLYPHS, INK, 3, 0.5);
        expect(v !== undefined && 'paints' in v ? v.paints : []).toEqual(['dark half', 'card']);
        // The same patch over the whole stretch hides the dark half: it reads.
        expect(worstGround([paints[0]!, paints[1]!, { ...paints[2]!, rects: OVER }], GLYPHS, INK, 3, 0.5)).toBeUndefined();
    });

    it('tries a gradient at every stop, and refuses a stack of too many choices', () => {
        const gradient = { what: 'gradient', candidates: [CREAM, ink(0.9)], rects: OVER };
        expect(worstGround([{ what: 'card', candidates: [CREAM], rects: OVER }, gradient], GLYPHS, INK, 3, 0.5)).toBeDefined();
        const many = Array.from({ length: 9 }, (_, i) => ({ what: `g${i}`, candidates: [CREAM, c(250, 250, 250)], rects: OVER }));
        expect(worstGround(many, GLYPHS, INK, 3, 0.5)).toEqual({ tooMany: 2 ** 9 });
        expect(2 ** 9).toBeGreaterThan(STACK_CHOICES_CAP);
    });

    it('takes a gradient layer as covering only where its tiles, resolved against their area, paint (rounds 6 to 8, the critic’s SZ, SZt, FP and FX)', () => {
        const area = { w: 120, h: 40 };
        const at0: [string, string] = ['0%', '0%'];
        const both = (v: string) => [v, v];
        // The initial values, and every tiling that repeats on both axes with
        // a tile of a pixel or more, wherever the position puts the first.
        expect(layerCovers('repeat', 'auto', at0, area)).toEqual(both('painting-area'));
        expect(layerCovers('repeat', 'auto auto', at0, area)).toEqual(both('painting-area'));
        expect(layerCovers('round', 'cover', at0, area)).toEqual(both('painting-area'));
        expect(layerCovers('repeat round', '1px 1px', ['13px', 'calc(50% - 2px)'], area)).toEqual(both('painting-area'));
        expect(layerCovers('repeat', '50% auto', at0, area)).toEqual(both('painting-area'));
        // The critic’s SZt (round 6): a tile under 1/64px, which Chrome does
        // not paint at all, however it repeats — and under a pixel, which
        // this reader does not vouch for.
        expect(layerCovers('repeat', '0.001px 0.001px', at0, area)).toEqual(both('none'));
        expect(layerCovers('repeat', '0.01px', at0, area)).toEqual(['none', 'painting-area']);
        expect(layerCovers('repeat', '0.001% 0.001%', at0, area)).toEqual(both('none'));
        expect(layerCovers('round', '0.001px auto', at0, area)).toEqual(['none', 'painting-area']);
        expect(layerCovers('repeat', '1e-05px auto', at0, area)).toEqual(['none', 'painting-area']);
        expect(layerCovers('repeat', '0.5px 3px', at0, area)).toEqual(['none', 'painting-area']);
        // A percentage resolved against its area: 1% of 120 is 1.2px.
        expect(layerCovers('repeat', '1% 1%', at0, area)).toEqual(['painting-area', 'none']);
        // The critic’s SZ: one white pixel, not repeated.
        expect(layerCovers('no-repeat', '1px 1px', at0, area)).toEqual(both('none'));
        // The critic’s FP (round 6): a no-repeat tile that fills its area
        // covers it, at any position that keeps it over the area.
        expect(layerCovers('no-repeat', 'auto', at0, area)).toEqual(both('positioning-area'));
        expect(layerCovers('no-repeat', '100% 100%', ['50%', '100%'], area)).toEqual(both('positioning-area'));
        expect(layerCovers('no-repeat', 'cover', ['0px', '0px'], area)).toEqual(both('positioning-area'));
        expect(layerCovers('space', 'auto', at0, area)).toEqual(both('positioning-area'));
        expect(layerCovers('no-repeat', '300px 60px', ['50%', '25%'], area)).toEqual(both('positioning-area'));
        // ... and not where a length moves it off a pixel of the area, a
        // percentage outside 0–100% leaves an edge bare, or it is smaller.
        expect(layerCovers('no-repeat', 'auto', ['calc(100% - 10px)', '0%'], area)).toEqual(['none', 'positioning-area']);
        expect(layerCovers('no-repeat', 'auto', ['2px', '0%'], area)).toEqual(['none', 'positioning-area']);
        expect(layerCovers('no-repeat', '300px 60px', ['150%', '0px'], area)).toEqual(['none', 'positioning-area']);
        expect(layerCovers('no-repeat', '119px auto', at0, area)).toEqual(['none', 'positioning-area']);
        expect(layerCovers('no-repeat', 'auto', ['calc(50% + 2px)', '0%'], area)).toEqual(['none', 'positioning-area']);
        // A `space` tile smaller than its area leaves gaps.
        expect(layerCovers('space', '10px 10px', at0, area)).toEqual(both('none'));
        // One axis repeated, the other one tile over its area.
        expect(layerCovers('repeat-x', 'auto', at0, area)).toEqual(['painting-area', 'positioning-area']);
        expect(layerCovers('repeat no-repeat', '4px auto', at0, area)).toEqual(['painting-area', 'positioning-area']);
        expect(layerCovers('repeat-y', '4px auto', at0, area)).toEqual(['none', 'painting-area']);
        expect(layerCovers('repeat space', 'auto 10px', at0, area)).toEqual(['painting-area', 'none']);
        // A `local` layer's area scrolls with the content: one tile proves
        // nothing there, tiles that repeat still do.
        expect(layerCovers('no-repeat', 'auto', at0, area, 'local')).toEqual(both('none'));
        expect(layerCovers('repeat', 'auto', at0, area, 'local')).toEqual(both('painting-area'));
        // The critic's FX (round 8, P1-2 on round 7): a `fixed` layer's area
        // is the viewport only while no box above is transformed — under
        // Rural's swaying tag Chrome paints it as `scroll`, and a viewport
        // tile at `150% 150%` lands off the figure. One tile proves nothing
        // on a `fixed` layer, however it fills the viewport; tiles that
        // repeat still do. Red with round 7's `attachment !== 'local'`.
        const viewport = { w: 768, h: 1024 };
        expect(layerCovers('no-repeat', '768px 1024px', ['150%', '150%'], viewport, 'fixed')).toEqual(both('none'));
        expect(layerCovers('no-repeat', 'auto', at0, area, 'fixed')).toEqual(both('none'));
        expect(layerCovers('space', 'cover', at0, area, 'fixed')).toEqual(both('none'));
        expect(layerCovers('repeat-x', 'auto', at0, area, 'fixed')).toEqual(['painting-area', 'none']);
        expect(layerCovers('repeat', '4px 4px', at0, area, 'fixed')).toEqual(both('painting-area'));
        // ... and the same tile on a `scroll` layer is placed by its position.
        expect(layerCovers('no-repeat', '768px 1024px', ['150%', '150%'], viewport, 'scroll')).toEqual(both('positioning-area'));
        // A tile with no area paints nothing, and a positioning area with
        // none places no tile this reader vouches for.
        expect(layerCovers('repeat', '0px auto', at0, area)).toEqual(['none', 'painting-area']);
        expect(layerCovers('repeat', 'auto 0%', at0, area)).toEqual(['painting-area', 'none']);
        expect(layerCovers('repeat', 'auto', at0, { w: 120, h: 0 })).toEqual(['painting-area', 'none']);
        expect(layerCovers('repeat', '10px 10px', at0, { w: 0, h: 40 })).toEqual(['none', 'painting-area']);
        // A size or a position this reader does not take apart is not proved.
        expect(layerCovers('repeat', 'calc(50% + 2px) auto', at0, area)).toEqual(['none', 'painting-area']);
        expect(layerCovers('no-repeat', 'auto', ['anchor(--x)', '0%'], area)).toEqual(['none', 'positioning-area']);
        expect(layerCovers('repeat repeat repeat', 'auto', at0, area)).toEqual(both('none'));
    });

    it('resolves a fixed layer’s tiles against the smaller of its box and the viewport (round 8)', () => {
        const own = { w: 102, h: 37 };
        const viewport = { w: 1920, h: 1080 };
        // A `fixed` layer may be painted against its own box (a transform
        // above) or the viewport; the smaller area reads a percentage tile
        // no larger than the engine may paint it.
        expect(tileArea('fixed', own, viewport)).toEqual(own);
        expect(tileArea('fixed', { w: 3000, h: 37 }, viewport)).toEqual({ w: 1920, h: 37 });
        expect(tileArea('scroll', own, viewport)).toEqual(own);
        expect(tileArea('local', own, viewport)).toEqual(own);
        // 0.06% of the viewport is 1.15px, of a 102px box 0.06px: read
        // against the box, under `MIN_TILE_PX`, it proves nothing.
        expect(layerCovers('repeat', '0.06% 0.06%', ['0%', '0%'], tileArea('fixed', own, viewport), 'fixed')).toEqual(['none', 'none']);
        expect(layerCovers('repeat', '0.06% 0.06%', ['0%', '0%'], viewport, 'fixed')).toEqual(['painting-area', 'none']);
    });

    it('judges a layer that may not cover with it and without it (round 6, the critic’s SZ)', () => {
        // A ground in the ink's own colour under a white layer read as
        // covering passes; read as a paint that may be absent, it fails.
        const ground = { what: 'its ground', candidates: [ink(1)], rects: OVER };
        const white = c(255, 255, 255);
        expect(worstGround([ground, { what: 'its gradient', candidates: [white], rects: OVER }], GLYPHS, INK, 3, 0.5)).toBeUndefined();
        const v = worstGround([ground, { what: 'its gradient, where its tiles fall', candidates: [white, c(0, 0, 0, 0)], rects: OVER }], GLYPHS, INK, 3, 0.5);
        expect(v !== undefined && 'ratio' in v ? v.ratio : 0).toBeCloseTo(1, 6);
    });

    it('leaves a stack under half opaque to the contrast pass', () => {
        expect(worstGround([{ what: 'tint', candidates: [ink(0.45)], rects: OVER }], GLYPHS, INK, 3, 0.5)).toBeUndefined();
    });

    it('passes a stack unmeasured only when no blend of its colours can read under the floor', () => {
        const black: [number, number, number] = [0, 0, 0];
        // White and a light grey under black ink: every blend reads.
        expect(everyMixReads([[c(255, 255, 255)], [c(229, 231, 235)]], black, 3, 0.5)).toBe(true);
        // Black and white under a mid-grey ink: their blend is the ink's grey.
        const grey: [number, number, number] = [119, 119, 119];
        expect(everyMixReads([[c(0, 0, 0)], [c(255, 255, 255)]], grey, 3, 0.5)).toBe(false);
        // Paints at alpha 0 add nothing.
        expect(everyMixReads([[c(0, 0, 0, 0)], [c(255, 255, 255)]], black, 3, 0.5)).toBe(true);
        // A faint shadow of the ink weighs at most twice its alpha where the
        // stack is judged at all: over a white card it cannot darken the ground
        // under dark ink, though its colour is the ink's.
        const dark: [number, number, number] = [20, 23, 26];
        expect(everyMixReads([[c(255, 255, 255)], [c(0, 0, 0, 0.06)]], dark, 3, 0.5)).toBe(true);
        // Five layers of the ink at 0.49 can.
        expect(everyMixReads([[CREAM], ...[1, 2, 3, 4, 5].map(() => [ink(0.49)])], INK, 3, 0.5)).toBe(false);
        // Paints that can never be half opaque together read.
        expect(everyMixReads([[ink(0.2)], [ink(0.2)]], INK, 3, 0.5)).toBe(true);
        expect(luminance([255, 255, 255])).toBeCloseTo(1, 6);
        expect(luminance([0, 0, 0])).toBe(0);
    });
});

/**
 * 3a's pure half (before 8g2, item 3a; `the-ground-walk-reaches-the-stall`,
 * report-only): the walk to the stall, a box that paints nothing skipped,
 * each cell read from its topmost opaque paint, a box above's pictures named.
 * The critic's plants given as the numbers the probe hands the judge: N2 (an
 * opaque white clipped to its content box, the figure moved off it onto a
 * dark ground), V (that white on a box set `visibility: hidden`) and DC (on
 * a `display: contents` box). The probe's half — reading the paints off a
 * page — is proved red in a browser (`layout/PROBE-RULES.md`, "Before 8g2,
 * 3a").
 */
describe('the-ground-walk-reaches-the-stall: the walk to the stall', () => {
    const DARK = c(...INK);
    const WHITE = c(255, 255, 255);

    it('skips a box that paints nothing: one not visible, and one with no box', () => {
        expect(paintsNothing('visible', 'block')).toBeUndefined();
        expect(paintsNothing('hidden', 'block')).toBe('invisible');
        expect(paintsNothing('collapse', 'inline')).toBe('invisible');
        expect(paintsNothing('visible', 'contents')).toBe('no box');
        expect(paintsNothing('hidden', 'contents')).toBe('no box');
    });

    it('takes a paint to hide what is below it only when every colour it may be is opaque', () => {
        expect(hidesBelow({ candidates: [WHITE] })).toBe(true);
        expect(hidesBelow({ candidates: [WHITE, c(0, 0, 0, 0)] })).toBe(false);
        expect(hidesBelow({ candidates: [c(255, 255, 255, 0.99)] })).toBe(false);
        expect(hidesBelow({ candidates: [] })).toBe(false);
        expect(hidesBelow({ candidates: [WHITE], picture: true })).toBe(false);
        const paints = [{ candidates: [DARK], n: 'stall' }, { candidates: [WHITE], n: 'card' }, { candidates: [ink(0.3)], n: 'tint' }];
        expect(fromTopmostOpaque(paints).map((p) => p.n)).toEqual(['card', 'tint']);
        expect(fromTopmostOpaque([{ candidates: [ink(0.3)], n: 'tint' }]).map((p) => p.n)).toEqual(['tint']);
    });

    it('reads a cell from its topmost opaque paint, so the stall under a card adds no choices', () => {
        // Nine gradients of the stall's own under an opaque card: 2⁹ ways, which
        // the bound judge refuses; read from the card up, one.
        const stall = Array.from({ length: 9 }, (_, i) => ({ what: `stall gradient ${i}`, candidates: [CREAM, ink(1)], rects: OVER }));
        const paints: StackPaint[] = [...stall, { what: 'card', candidates: [CREAM], rects: OVER }];
        expect(worstGround(paints, GLYPHS, INK, 3, 0.5)).toEqual({ tooMany: 2 ** 9 });
        expect(worstGround(paints, GLYPHS, INK, 3, 0.5, { fromOpaque: true })).toBeUndefined();
        // A card that does not cover the glyphs hides nothing there.
        const half = [...stall.slice(0, 1), { what: 'card', candidates: [CREAM], rects: [box(60, 0, 200, 100)] }];
        const v = worstGround(half, GLYPHS, INK, 3, 0.5, { fromOpaque: true });
        expect(v !== undefined && 'paints' in v ? v.paints : []).toEqual(['stall gradient 0']);
    });

    it('tries a paint’s candidates that composite alike once', () => {
        // Nine layers each of a repeated stop, two transparent ends and the
        // absence of a tile: 4⁹ ways as written, 2⁹ as they composite — and
        // eight such layers fit under the cap.
        const nothing = c(0, 0, 0, 0);
        const layer = (i: number) => ({ what: `bracket ${i}`, candidates: [ink(1), ink(1), c(9, 9, 9, 0), nothing], rects: OVER });
        expect(worstGround(Array.from({ length: 9 }, (_, i) => layer(i)), GLYPHS, INK, 3, 0.5)).toEqual({ tooMany: 4 ** 9 });
        expect(worstGround(Array.from({ length: 9 }, (_, i) => layer(i)), GLYPHS, INK, 3, 0.5, { fromOpaque: true })).toEqual({ tooMany: 2 ** 9 });
        const v = worstGround([{ what: 'card', candidates: [CREAM], rects: OVER }, ...Array.from({ length: 8 }, (_, i) => layer(i))], GLYPHS, INK, 3, 0.5, { fromOpaque: true });
        expect(v !== undefined && 'ratio' in v ? v.ratio : 0).toBeCloseTo(1, 6);
    });

    it('passes a cell no blend of whose paints can read under the floor without enumerating its stops', () => {
        const light = Array.from({ length: 9 }, (_, i) => ({ what: `wash ${i}`, candidates: [CREAM, WHITE, c(250, 245, 235, 0.5)], rects: OVER }));
        expect(worstGround(light, GLYPHS, INK, 3, 0.5)).toEqual({ tooMany: 3 ** 9 });
        expect(worstGround(light, GLYPHS, INK, 3, 0.5, { fromOpaque: true })).toBeUndefined();
    });

    it('fails the critic’s N2: an opaque white clipped to its content box does not hide the dark ground the figure was moved onto', () => {
        // `.item-p`'s dark ground over the whole row, `.item-a`'s white over its
        // content box only (x 60–200), the glyphs moved 50px left of it.
        const paints: StackPaint[] = [
            { what: "span.item-p's ground", candidates: [DARK], rects: OVER, source: 'past the bound stop' },
            { what: "span.item-a's ground", candidates: [WHITE], rects: [box(60, 0, 200, 100)] },
        ];
        const v = worstGround(paints, GLYPHS, INK, 3, 0.5, { fromOpaque: true });
        expect(v !== undefined && 'ratio' in v ? v.ratio : 0).toBeCloseTo(1, 6);
        expect(v !== undefined && 'sources' in v ? v.sources : []).toEqual(['past the bound stop']);
        // Where the white does cover the glyphs, it hides the dark ground.
        expect(worstGround([paints[0]!, { ...paints[1]!, rects: OVER }], GLYPHS, INK, 3, 0.5, { fromOpaque: true })).toBeUndefined();
    });

    it('fails the critic’s V and DC once the box that paints nothing is left out of the walk', () => {
        // The walk hands the judge no paint of the skipped box: its opaque white
        // is not there, and the dark ground above it is the figure's.
        const skipped = { what: "span.item-a's ground", candidates: [WHITE], rects: OVER };
        const dark = { what: "span.item-p's ground", candidates: [DARK], rects: OVER };
        expect(worstGround([dark, skipped], GLYPHS, INK, 3, 0.5, { fromOpaque: true })).toBeUndefined();
        const v = worstGround([dark], GLYPHS, INK, 3, 0.5, { fromOpaque: true });
        expect(v !== undefined && 'ratio' in v ? v.ratio : 0).toBeCloseTo(1, 6);
    });

    it('cuts an ink by the clips below the nearest scroller, and by none at or above it', () => {
        const at = (b: ReturnType<typeof box>) => () => b;
        const walk = [
            { clips: true, scrolls: false, box: at(box(0, 0, 50, 50)) },
            { clips: false, scrolls: false, box: at(box(0, 0, 60, 60)) },
            { clips: true, scrolls: true, box: at(box(0, 0, 70, 70)) },
            { clips: true, scrolls: false, box: at(box(0, 0, 80, 80)) },
        ];
        expect(cutsBelowScroller(walk)).toEqual([box(0, 0, 50, 50)]);
        expect(cutsBelowScroller(walk.slice(1))).toEqual([]);
        expect(cutsBelowScroller([walk[0]!, walk[3]!])).toEqual([box(0, 0, 50, 50), box(0, 0, 80, 80)]);
    });

    it('splits an ink by the scrollers above it, each part read where a scroll brings it into view', () => {
        // An ink 10–110 × 10–40 in a scroller (the walk's link 2) whose view is
        // x 0–60, inside another (link 5) whose view is y 0–30.
        const parts = byScroller(GLYPHS, [
            { at: 2, box: box(0, 0, 60, 100) },
            { at: 5, box: box(0, 0, 200, 30) },
        ]);
        expect(parts).toEqual([
            // In both views: as it stands.
            { part: box(10, 10, 60, 30), moves: [] },
            // In the inner view, below the outer one: scrolled 10px up.
            { part: box(10, 20, 60, 30), moves: [{ below: 5, dx: 0, dy: -10 }] },
            // Past the inner view's right edge: scrolled 50px left into it, and
            // its lower 10px then up into the outer view.
            { part: box(10, 10, 60, 30), moves: [{ below: 2, dx: -50, dy: 0 }] },
            { part: box(10, 20, 60, 30), moves: [{ below: 2, dx: -50, dy: 0 }, { below: 5, dx: 0, dy: -10 }] },
        ]);
        // A paint under the inner scroller moves with both scrolls, one between
        // the two with the outer alone, one at or above the outer with neither.
        const moves = [{ below: 2, dx: -50, dy: 0 }, { below: 5, dx: 0, dy: -10 }];
        expect(shiftFor(1, moves)).toEqual({ dx: -50, dy: -10 });
        expect(shiftFor(2, moves)).toEqual({ dx: 0, dy: -10 });
        expect(shiftFor(5, moves)).toEqual({ dx: 0, dy: 0 });
        // Wholly below the view: brought up to its bottom edge.
        expect(byScroller(box(10, 300, 110, 330), [{ at: 0, box: box(0, 0, 400, 100) }])).toEqual([{ part: box(10, 70, 110, 100), moves: [{ below: 0, dx: 0, dy: -230 }] }]);
        expect(byScroller(GLYPHS, [])).toEqual([{ part: GLYPHS, moves: [] }]);
    });

    it('names a picture of a box above only where it shows, and composites it as absent', () => {
        const rain: StackPaint = { what: "div.stall's picture", candidates: [], rects: OVER, picture: true };
        const ground = { what: "div.stall's ground", candidates: [CREAM], rects: OVER };
        const card = { what: 'card', candidates: [WHITE], rects: [box(60, 0, 200, 100)] };
        expect(picturesShowing([ground, rain, card], GLYPHS)).toEqual(["div.stall's picture"]);
        // Under an opaque card that covers the glyphs, it shows nowhere.
        expect(picturesShowing([ground, rain, { ...card, rects: OVER }], GLYPHS)).toEqual([]);
        // The judge reads the ground as if the picture were not there.
        expect(worstGround([ground, rain], GLYPHS, INK, 3, 0.5, { fromOpaque: true })).toBeUndefined();
        expect(worstGround([{ ...ground, candidates: [DARK] }, rain], GLYPHS, INK, 3, 0.5, { fromOpaque: true })).toBeDefined();
    });
});

/**
 * Where a tile stands and where a stop falls (before 8g2, the binding of 3a;
 * J1(a) of D-2026-10-28-01): read wherever every value is one this reader
 * takes apart, and, whenever one is not, the strict read as before.
 */
describe('the-ground-walk-reaches-the-stall: where a tile stands and where a stop falls', () => {
    const area = { w: 120, h: 40 };
    const at0: [string, string] = ['0%', '0%'];

    it('places a tile by its size and position, and fails closed on anything it does not read', () => {
        expect(placeTile('no-repeat', '8px 2px', ['7px', 'calc(100% - 3px)'], area)).toEqual({ x: 7, y: 35, w: 8, h: 2, repeatX: false, repeatY: false });
        expect(placeTile('no-repeat', 'auto', ['-9999px', '0%'], area)).toEqual({ x: -9999, y: 0, w: 120, h: 40, repeatX: false, repeatY: false });
        expect(placeTile('repeat-x', '4px 2px', ['0px', '100%'], area)).toEqual({ x: 0, y: 38, w: 4, h: 2, repeatX: true, repeatY: false });
        expect(placeTile('repeat', 'auto', at0, area)).toEqual({ x: 0, y: 0, w: 120, h: 40, repeatX: true, repeatY: true });
        // Chrome keeps `2px calc(100% - 32px)` (the Activity rail): taken apart, as a position's is.
        expect(placeTile('no-repeat', '2px calc(100% - 32px)', ['8.5px', '16px'], { w: 300, h: 500 })).toEqual({ x: 8.5, y: 16, w: 2, h: 468, repeatX: false, repeatY: false });
        // A tile 1px square is placed: that it paints no more than itself is what the critic’s SZ needed read.
        expect(placeTile('no-repeat', '1px 1px', at0, area)).toEqual({ x: 0, y: 0, w: 1, h: 1, repeatX: false, repeatY: false });
        // Not read, and so the strict read: under a pixel, `round`, `space`, a size or position not taken apart, an attachment not `scroll`, no area.
        for (const [repeat, size, position, a, attachment] of [
            ['no-repeat', '0.5px 3px', at0, area, 'scroll'],
            ['round', 'auto', at0, area, 'scroll'],
            ['space', '10px 10px', at0, area, 'scroll'],
            ['no-repeat', 'min(50%, 2px) auto', at0, area, 'scroll'],
            ['no-repeat', 'auto', ['anchor(--x)', '0%'], area, 'scroll'],
            ['no-repeat', 'auto', at0, area, 'fixed'],
            ['repeat', 'auto', at0, area, 'local'],
            ['no-repeat', 'auto', at0, { w: 0, h: 40 }, 'scroll'],
            ['repeat repeat repeat', 'auto', at0, area, 'scroll'],
        ] as const) {
            expect(placeTile(repeat, size, position, a, attachment), `${repeat} ${size} ${attachment}`).toBeUndefined();
        }
    });

    it('bands a tile: its own span on an axis that does not repeat, every place on one that does', () => {
        expect(tileBand({ x: 7, y: 35, w: 8, h: 2, repeatX: false, repeatY: false }, 100, 200)).toEqual(box(107, 235, 115, 237));
        expect(tileBand({ x: 0, y: 38, w: 4, h: 2, repeatX: true, repeatY: false }, 100, 200)).toEqual({ left: -Infinity, right: Infinity, top: 238, bottom: 240 });
    });

    it('takes a stop’s place from a tile that holds its whole gradient, and not from tiles that repeat inside the area', () => {
        expect(tileHoldsItsGradient({ x: 0, y: 0, w: 120, h: 40, repeatX: true, repeatY: true }, area)).toBe(true);
        expect(tileHoldsItsGradient({ x: 0, y: 0, w: 8, h: 2, repeatX: false, repeatY: false }, area)).toBe(true);
        expect(tileHoldsItsGradient({ x: 0, y: 0, w: 4, h: 40, repeatX: true, repeatY: false }, area)).toBe(false);
    });

    it('reads the gradients it can place, and no others', () => {
        expect(readGradient('radial-gradient(circle at 9px 50%, rgb(255, 255, 255) 2.2px, rgb(255, 0, 0) 3px, rgb(255, 0, 0) 4.4px, color(srgb 0.82 0 0.18) 5.4px)')).toEqual({
            kind: 'radial',
            head: 'circle at 9px 50%',
            items: [
                { colour: 'rgb(255, 255, 255)', at: '2.2px' },
                { colour: 'rgb(255, 0, 0)', at: '3px' },
                { colour: 'rgb(255, 0, 0)', at: '4.4px' },
                { colour: 'color(srgb 0.82 0 0.18)', at: '5.4px' },
            ],
        });
        expect(readGradient('linear-gradient(rgb(255, 0, 0), 40%, rgb(0, 0, 255) calc(100% - 4px))')?.items).toEqual([{ colour: 'rgb(255, 0, 0)' }, { at: '40%' }, { colour: 'rgb(0, 0, 255)', at: 'calc(100% - 4px)' }]);
        for (const other of [
            'conic-gradient(rgb(255, 0, 0), rgb(0, 0, 255))',
            'repeating-linear-gradient(90deg, rgb(255, 0, 0) 0px, rgb(0, 0, 255) 2px)',
            '-webkit-linear-gradient(top, rgb(255, 0, 0), rgb(0, 0, 255))',
            'linear-gradient(in oklch longer hue, rgb(255, 0, 0), rgb(0, 0, 255))',
            'linear-gradient(90deg in oklab, rgb(255, 0, 0), rgb(0, 0, 255))',
            'radial-gradient(circle at 9px 50% in hsl, rgb(255, 0, 0), rgb(0, 0, 255))',
            'linear-gradient(rgb(255, 0, 0) 10px 20px 30px, rgb(0, 0, 255))',
            'linear-gradient(rgb(255, 0, 0)',
            'url("a.svg")',
        ]) {
            expect(readGradient(other), other).toBeUndefined();
        }
        // A position the reader cannot take apart leaves the gradient unplaced.
        expect(placeGradient(readGradient('linear-gradient(rgb(255, 0, 0) 20px, rgb(0, 0, 255) min(50%, 30px))')!, 120, 40)).toBeUndefined();
    });

    const placed = (layer: string, w: number, h: number, colours: readonly Colour[], left = 0, top = 0): GradientPlace => {
        const p = placeGradient(readGradient(layer)!, w, h)!;
        return { shape: p.shape, tile: { left, top, w, h, repeatX: false, repeatY: false }, stops: p.at.map((at, i) => ({ at, colour: colours[i]! })) };
    };
    const A = c(1, 1, 1);
    const B = c(2, 2, 2);
    const C = c(3, 3, 3);

    it('lays a linear gradient along its line: each direction, angle and corner', () => {
        const down = placed('linear-gradient(rgb(1, 1, 1) 0%, rgb(2, 2, 2) 50%, rgb(3, 3, 3) 100%)', 100, 100, [A, B, C]);
        expect(stopsOver(down, box(10, 5, 90, 20))).toEqual([A, B]);
        expect(stopsOver(down, box(10, 60, 90, 70))).toEqual([B, C]);
        const right = placed('linear-gradient(90deg, rgb(1, 1, 1) 0%, rgb(2, 2, 2) 50%, rgb(3, 3, 3) 100%)', 100, 100, [A, B, C]);
        expect(stopsOver(right, box(60, 0, 90, 100))).toEqual([B, C]);
        const up = placed('linear-gradient(to top, rgb(1, 1, 1) 0%, rgb(2, 2, 2) 50%, rgb(3, 3, 3) 100%)', 100, 100, [A, B, C]);
        expect(stopsOver(up, box(0, 60, 100, 70))).toEqual([A, B]);
        // To a corner, on a box that is not square: the corner is 100%, the far corner 0%.
        const corner = placed('linear-gradient(to right bottom, rgb(1, 1, 1) 0%, rgb(2, 2, 2) 50%, rgb(3, 3, 3) 100%)', 200, 50, [A, B, C]);
        expect(stopsOver(corner, box(0, 0, 2, 2))).toEqual([A, B]);
        expect(stopsOver(corner, box(198, 48, 200, 50))).toEqual([B, C]);
    });

    it('honours a hard stop, a stop written in px, a position with none, and a hint', () => {
        // White from 50% on: the black is proved elsewhere past it.
        const hard = placed('linear-gradient(rgb(1, 1, 1) 0px, rgb(1, 1, 1) 50%, rgb(2, 2, 2) 50%, rgb(2, 2, 2) 100%)', 100, 100, [A, A, B, B]);
        expect(stopsOver(hard, box(0, 60, 100, 80))).toEqual([B, B]);
        const px = placed('linear-gradient(rgb(1, 1, 1) 0px, rgb(2, 2, 2) 10px, rgb(3, 3, 3) 20px)', 100, 100, [A, B, C]);
        expect(stopsOver(px, box(0, 40, 100, 80))).toEqual([C]);
        // Spaced evenly with no position; raised to the largest before it.
        expect(placeGradient(readGradient('linear-gradient(rgb(1, 1, 1), rgb(2, 2, 2), rgb(3, 3, 3))')!, 100, 100)!.at).toEqual([0, 0.5, 1]);
        expect(placeGradient(readGradient('linear-gradient(rgb(1, 1, 1) 50%, rgb(2, 2, 2) 20%, rgb(3, 3, 3))')!, 100, 100)!.at).toEqual([0.5, 0.5, 1]);
        expect(placeGradient(readGradient('linear-gradient(rgb(1, 1, 1), 40%, rgb(2, 2, 2))')!, 100, 100)!.at).toEqual([0, 1]);
    });

    it('sets a radial gradient’s stops by their distance from its centre, and reads Rural’s punch hole where it is drawn', () => {
        // circle at 9px 50%: the bg to 2.2px, the ring 3px to 4.4px, the card from 5.4px.
        const layer = 'radial-gradient(circle at 9px 50%, rgb(1, 1, 1) 2.2px, rgb(2, 2, 2) 3px, rgb(2, 2, 2) 4.4px, rgb(3, 3, 3) 5.4px)';
        const hole = placed(layer, 160, 40, [A, B, B, C]);
        // The figure, past the tag's 22px of padding: the card alone.
        expect(stopsOver(hole, box(22, 10, 150, 30))).toEqual([C]);
        // Ink over the ring: the ring is tried.
        expect(stopsOver(hole, box(12, 16, 150, 24))).toContain(B);
        // Over the centre: the hole too.
        expect(stopsOver(hole, box(7, 18, 11, 22))).toContain(A);
    });

    it('reads every size of ending shape, and an elliptical stop in the gradient ray’s units', () => {
        const sized = (head: string, w: number, h: number) => placeGradient(readGradient(`radial-gradient(${head}${head === '' ? '' : ', '}rgb(1, 1, 1), rgb(2, 2, 2))`)!, w, h)!.shape;
        // The default: an ellipse through the far corner, sides in the box's proportion.
        const e = sized('', 200, 100) as { rx: number; ry: number; cx: number };
        expect(e.cx).toBe(100);
        expect(e.rx).toBeCloseTo(100 * Math.SQRT2, 6);
        expect(e.ry).toBeCloseTo(50 * Math.SQRT2, 6);
        expect(sized('circle', 200, 100)).toMatchObject({ rx: Math.hypot(100, 50), ry: Math.hypot(100, 50) });
        expect(sized('75px at 24% 50%', 200, 100)).toMatchObject({ cx: 48, cy: 50, rx: 75, ry: 75 });
        expect(sized('135% 86px at 50% -10px', 200, 100)).toMatchObject({ cx: 100, cy: -10, rx: 270, ry: 86 });
        expect(sized('farthest-side at 10px 20px', 200, 100)).toMatchObject({ rx: 190, ry: 80 });
        expect(sized('circle closest-side at 10px 20px', 200, 100)).toMatchObject({ rx: 10, ry: 10 });
        expect(sized('circle farthest-corner at 0px 0px', 30, 40)).toMatchObject({ rx: 50, ry: 50 });
        expect(sized('circle closest-corner at 10px 20px', 200, 100)).toMatchObject({ rx: Math.hypot(10, 20) });
        // Past what it can draw from: no extent at all.
        expect(placeGradient(readGradient('radial-gradient(0px 10px, rgb(1, 1, 1), rgb(2, 2, 2))')!, 100, 100)).toBeUndefined();
        expect(placeGradient(readGradient('radial-gradient(closest-side at 0px 0px, rgb(1, 1, 1), rgb(2, 2, 2))')!, 100, 100)).toBeUndefined();
        // An elliptical px stop is on the horizontal ray.
        expect(placeGradient(readGradient('radial-gradient(40px 10px at 50% 50%, rgb(1, 1, 1) 20px, rgb(2, 2, 2))')!, 100, 100)!.at).toEqual([0.5, 1]);
    });

    it('wraps a tile that repeats into the band around its area', () => {
        const p = placeGradient(readGradient('linear-gradient(90deg, rgb(1, 1, 1) 0%, rgb(2, 2, 2) 50%, rgb(3, 3, 3) 100%)')!, 100, 40)!;
        const wrap: GradientPlace = { shape: p.shape, tile: { left: 10, top: 10, w: 100, h: 40, repeatX: true, repeatY: true }, stops: p.at.map((at, i) => ({ at, colour: [A, B, C][i]! })) };
        // The left border's band shows the end of the tile before.
        expect(stopsOver(wrap, box(8, 20, 10, 30))).toEqual([B, C]);
        // Inside the tile, its start.
        expect(stopsOver(wrap, box(12, 20, 20, 30))).toEqual([A, B]);
    });
});
