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
import { colourTokens, composite, cellsOf, everyMixReads, layerCovers, luminance, mostOpaque, srgbColour, worstGround, STACK_CHOICES_CAP } from './groundStack';

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

    it('takes a gradient layer as covering its clip area only when its tiles meet on both axes (round 6, the critic’s SZ)', () => {
        const area = { w: 120, h: 40 };
        // The initial values, and every tiling that repeats on both axes with
        // a tile that has an area, wherever the position puts the first tile.
        expect(layerCovers('repeat', 'auto', area)).toBe(true);
        expect(layerCovers('repeat', 'auto auto', area)).toBe(true);
        expect(layerCovers('round', 'cover', area)).toBe(true);
        expect(layerCovers('repeat round', '1px 1px', area)).toBe(true);
        expect(layerCovers('repeat', '50% auto', area)).toBe(true);
        expect(layerCovers('repeat', '0.5px 3px', area)).toBe(true);
        // The critic's SZ: one white pixel, not repeated.
        expect(layerCovers('no-repeat', '1px 1px', area)).toBe(false);
        // Its control: a whole tile, placed off the box.
        expect(layerCovers('no-repeat', 'auto', area)).toBe(false);
        // One axis repeated, or tiles spaced apart.
        expect(layerCovers('repeat-x', 'auto', area)).toBe(false);
        expect(layerCovers('repeat no-repeat', 'auto', area)).toBe(false);
        expect(layerCovers('space', 'auto', area)).toBe(false);
        expect(layerCovers('repeat space', 'auto', area)).toBe(false);
        // A tile with no area paints nothing, and a positioning area with
        // none places no tile this reader vouches for.
        expect(layerCovers('repeat', '0px auto', area)).toBe(false);
        expect(layerCovers('repeat', 'auto 0%', area)).toBe(false);
        expect(layerCovers('repeat', 'auto', { w: 120, h: 0 })).toBe(false);
        expect(layerCovers('repeat', '10px 10px', { w: 0, h: 40 })).toBe(false);
        // A size this reader does not take apart is not proved.
        expect(layerCovers('repeat', 'calc(50% + 2px) auto', area)).toBe(false);
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
