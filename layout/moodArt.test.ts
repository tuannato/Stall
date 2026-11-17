import { describe, expect, it } from 'vitest';
import {
    BEAM,
    beamStack,
    EXHAUSTIVE_LIMIT,
    exhaustiveStack,
    CLEAR,
    cssOf,
    gradientColours,
    judgeFor,
    layerCoverage,
    lengthOf,
    onGround,
    overRgba,
    parseColour,
    percentOf,
    rasterColours,
    readLayer,
    repeatsOf,
    splitTop,
    WIDE_BEAM,
    worstCells,
    worstStack,
    type Box,
    type ElementBoxes,
    type LayerStyle,
    type Rgba,
    type Scroller,
    type SearchTally,
    type BeamMiss,
} from './moodArt';
import { contrastOf, relLum, type Rgb } from './rainDrop';

/*
 * The model behind `a-mood-art-layer-is-read-at-its-worst` (`moodArt.ts`):
 * the probe reads a mood's page art with it and paints its worst ground in
 * the art's place, in every contrast job that wears a mood. The probe's own
 * half, and the rule's red proofs, are in `PROBE-RULES.md`.
 */
const LIGHT_BG: Rgb = [240, 244, 250];
const DARK_TEXT: Rgb = [20, 23, 26];
const DARK_BG: Rgb = [18, 21, 26];
const LIGHT_TEXT: Rgb = [232, 237, 243];
const lum = (c: Rgb): number => relLum(c[0], c[1], c[2]);

const box = (x0: number, y0: number, x1: number, y1: number): Box => ({ x0, y0, x1, y1 });
const BOXES: ElementBoxes = {
    'border-box': box(0, 0, 390, 844),
    'padding-box': box(1, 1, 389, 843),
    'content-box': box(17, 21, 373, 823),
};
const REGION: Scroller = { box: box(0, 54, 390, 762), x: false, y: true, range: { x: 0, y: 500 } };
const style = (over: Partial<LayerStyle>): LayerStyle => ({
    size: 'auto',
    posX: '0%',
    posY: '0%',
    repeat: 'repeat',
    origin: 'padding-box',
    clip: 'border-box',
    attachment: 'scroll',
    ...over,
});

describe('a-mood-art-layer-is-read-at-its-worst', () => {
    it('reads the colours Chrome computes, and none outside sRGB', () => {
        expect(parseColour('rgb(91, 147, 255)')).toEqual([91, 147, 255, 1]);
        expect(parseColour('rgba(0, 0, 0, 0)')).toEqual([0, 0, 0, 0]);
        expect(parseColour('rgba(64, 191, 64, 0.5)')).toEqual([64, 191, 64, 0.5]);
        expect(parseColour('color(srgb 1 0.301961 0.478431 / 0.157436)')).toEqual([255, 0.301961 * 255, 0.478431 * 255, 0.157436]);
        expect(parseColour('color(srgb 0.171137 0.242745 0.37898)')?.[3]).toBe(1);
        expect(parseColour('transparent')).toEqual(CLEAR);
        for (const outside of ['oklch(0.7 0.1 200)', 'lab(50 20 30)', 'color(display-p3 1 0 0)', 'hwb(120 0% 0%)', 'currentcolor']) {
            expect(parseColour(outside), outside).toBeUndefined();
        }
    });

    it('reads a gradient by its stops and the colours between them, and refuses one it cannot model', () => {
        // Red to green: the stops and every colour between; between two stops
        // of different hue the composite can be darker than either, so the
        // darkest is not a stop.
        const read = gradientColours('linear-gradient(rgb(255, 0, 0), rgb(0, 255, 0))');
        expect('colours' in read).toBe(true);
        const colours = 'colours' in read ? read.colours : [];
        expect(colours).toContainEqual([255, 0, 0, 1]);
        expect(colours).toContainEqual([0, 255, 0, 1]);
        const darkest = Math.min(...colours.map((c) => lum(onGround(c, LIGHT_BG))));
        expect(darkest).toBeLessThan(Math.min(lum([255, 0, 0]), lum([0, 255, 0])));
        // A transparent end is interpolated premultiplied: the colour holds, the alpha falls.
        const fade = gradientColours('linear-gradient(color(srgb 0.356863 0.576471 1 / 0.2), rgba(0, 0, 0, 0) 100%)');
        const half = 'colours' in fade ? fade.colours.find((c) => Math.abs(c[3] - 0.1) < 1e-9) : undefined;
        expect(half?.[0]).toBeCloseTo(0.356863 * 255, 6);
        // Hints, two-position stops, angles, shapes, repeating and conic forms, `in srgb`.
        for (const ok of [
            'linear-gradient(90deg, rgb(255, 0, 0) 10%, 30%, rgb(0, 0, 255))',
            'linear-gradient(rgb(255, 0, 0) 0px, rgb(255, 0, 0) 10px, rgb(0, 0, 255) 10px, rgb(0, 0, 255) 20px)',
            'radial-gradient(13px at 50% 0px, rgba(0, 0, 0, 0) 0px, rgba(0, 0, 0, 0) 12.4px, rgb(18, 21, 26) 12.8px)',
            'repeating-conic-gradient(from 2.05714deg at 50% 110px, color(srgb 0.462745 0.407843 0.329412 / 0.17) 0deg, color(srgb 0.462745 0.407843 0.329412 / 0.17) 9deg, rgba(0, 0, 0, 0) 9deg, rgba(0, 0, 0, 0) 18deg)',
            'repeating-linear-gradient(45deg, color(srgb 0.5 0.5 0.5 / 0.05) 0px, color(srgb 0.5 0.5 0.5 / 0.05) 1px, rgba(0, 0, 0, 0) 1px, rgba(0, 0, 0, 0) 6px)',
            'linear-gradient(90deg in srgb, rgb(255, 0, 0), rgb(0, 0, 255))',
            'linear-gradient(calc(10deg + 1turn), rgb(255, 0, 0) calc(10% + 4px), rgb(0, 0, 255))',
            // A color(srgb …) stop where OKLab and sRGB paint alike: to or from transparent, a hard stop,
            // one colour held, or a space written.
            'linear-gradient(color(srgb 0.356863 0.576471 1 / 0.2), rgba(0, 0, 0, 0) 100%)',
            'linear-gradient(color(srgb 1 0 0) 0px, color(srgb 1 0 0) 10px, rgb(0, 0, 255) 10px, rgb(0, 0, 255) 20px)',
            'linear-gradient(color(srgb 1 0 0) 0px 10px, rgb(0, 0, 255) 10px)',
            'linear-gradient(to right in srgb, color(srgb 0 0 1), rgb(255, 255, 0))',
        ]) {
            expect('colours' in gradientColours(ok), ok).toBe(true);
        }
        for (const [refused, why] of [
            ['linear-gradient(in oklch, rgb(255, 0, 0), rgb(0, 0, 255))', /interpolated in oklch/],
            ['linear-gradient(90deg in hsl longer hue, rgb(255, 0, 0), rgb(0, 0, 255))', /interpolated in hsl/],
            ['linear-gradient(oklch(0.7 0.1 200), rgb(255, 0, 0))', /cannot model/],
            ['radial-gradient(color(display-p3 1 0 0), rgba(64, 191, 64, 0.5))', /cannot model/],
            ['linear-gradient(rgb(10, 20, 30), lab(50 20 30))', /cannot model/],
            // A color(srgb …) stop with no space written: Chrome interpolates in OKLab (blue to yellow
            // paints (108, 172, 198) at its midpoint, sRGB (128, 128, 127)), so a segment between two
            // distinct visible colours is refused.
            ['linear-gradient(to right, color(srgb 0 0 1), rgb(255, 255, 0))', /interpolates in OKLab, between color\(srgb 0 0 1\) and rgb\(255, 255, 0\)/],
            ['linear-gradient(color(srgb 0.2 0.3 0.4 / 0.5) 0px, color(srgb 0.5 0.3 0.4 / 0.5) 20px)', /OKLab/],
        ] as const) {
            const out = gradientColours(refused);
            expect('refused' in out && out.refused, refused).toMatch(why);
        }
        expect(readLayer('url("http://localhost:4319/assets/ground-x.svg")')).toEqual({ kind: 'file', url: 'http://localhost:4319/assets/ground-x.svg' });
        for (const image of ['-webkit-linear-gradient(top, rgb(255, 0, 0), rgb(0, 0, 255))', 'image-set(url("http://localhost:4319/a.png") 1dppx)', 'cross-fade(url(a.png), url(b.png), 50%)']) {
            expect(readLayer(image), image).toHaveProperty('refused');
        }
    });

    it('chooses the worst ground toward the mood’s own text (a): the darkest on a light mood, the lightest on a dark one', () => {
        const pale: Rgba = [250, 250, 250, 0.5];
        const grey: Rgba = [120, 130, 140, 0.4];
        const onLight = worstStack([[pale, grey, CLEAR]], judgeFor(DARK_TEXT, LIGHT_BG));
        expect(onLight).toEqual(grey);
        const onDark = worstStack([[pale, grey, CLEAR]], judgeFor(LIGHT_TEXT, DARK_BG));
        expect(onDark).toEqual(pale);
        // A layer that only moves the ground away from the ink drops out: transparent is its worst.
        expect(worstStack([[pale, CLEAR]], judgeFor(DARK_TEXT, LIGHT_BG))).toEqual(CLEAR);
        expect(worstStack([[[0, 0, 0, 0.4], CLEAR]], judgeFor(LIGHT_TEXT, DARK_BG))).toEqual(CLEAR);
    });

    it('searches the stack, so an opaque scrap on top does not hide a darker one below it', () => {
        // Two tiles of opaque paper scraps over transparency: the lower one's
        // scrap is the darker. Flattened one layer at a time, the top layer's
        // own extreme (opaque) would cover it; over the stack, the worst is
        // where the top tile is transparent and the lower scrap shows.
        const darker: Rgba = [176, 188, 162, 1];
        const lighter: Rgba = [214, 196, 168, 1];
        const judge = judgeFor(DARK_TEXT, LIGHT_BG);
        expect(worstStack([[darker, CLEAR], [lighter, CLEAR]], judge)).toEqual(darker);
        // Each layer's own extreme over the ground, stacked, reads the lighter scrap: the mistake this avoids.
        const perLayer = [[darker, CLEAR], [lighter, CLEAR]].map((cs) => cs.reduce((a, b) => (judge(a) <= judge(b) ? a : b)));
        expect(perLayer.reduce((below, top) => overRgba(top, below), CLEAR)).toEqual(lighter);
        // Two translucent layers that both darken compose: both extremes at once.
        const tint: Rgba = [107, 89, 66, 0.06];
        const ray: Rgba = [118, 104, 84, 0.17];
        const both = worstStack([[tint, CLEAR], [ray, CLEAR]], judge);
        expect(both).toEqual(overRgba(ray, tint));
    });

    it('searches a stack whole up to its limit, and past it by a beam that is not exact', () => {
        expect(BEAM).toBe(12);
        expect(EXHAUSTIVE_LIMIT).toBe(200_000);
        // The critic's counter-example: on a light mood, opaque greys and one dark blue below, one
        // translucent yellow above. The old beam (the twelve lowest alone) kept greys and read 3.34:1;
        // the worst is the blue under the yellow, 2.47:1. Thirteen combinations: searched whole.
        const judge = judgeFor([96, 84, 66], [255, 254, 250]);
        const bottom: Rgba[] = [[0, 2, 32, 1]];
        for (let g = 100; g <= 144; g += 4) bottom.push([g, g, g, 1]);
        const top: Rgba[] = [[202, 208, 83, 0.74]];
        const tally = { whole: 0, beam: 0 };
        const worst = worstStack([bottom, top], judge, tally);
        expect(worst).toEqual(overRgba(top[0]!, bottom[0]!));
        expect(judge(worst)).toBeCloseTo(2.47, 2);
        expect(tally).toEqual({ whole: 1, beam: 0 });
        // The beam keeps each premultiplied channel's extremes beside the twelve lowest, so it reads
        // this one right as well, at any width.
        expect(beamStack([bottom, top], judge)).toEqual(worst);
        expect(beamStack([bottom, top], judge, 1)).toEqual(worst);
        // On small random stacks the dispatch is exact, and the beam never reads below the whole search
        // (it tries a subset of the combinations) but misses it on some: a search, not a proof. The
        // probe prints how many stacks each read searched by the beam.
        let seed = 7;
        const rnd = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
        let misses = 0;
        for (const [ink, ground] of [
            [[96, 84, 66], [255, 254, 250]],
            [[230, 235, 240], [20, 24, 32]],
        ] as const) {
            const j = judgeFor(ink, ground);
            for (let t = 0; t < 500; t += 1) {
                const stack: Rgba[][] = [];
                for (let l = 0, layers = 2 + Math.floor(rnd() * 3); l < layers; l += 1) {
                    const colours: Rgba[] = [CLEAR];
                    for (let i = 0, k = 2 + Math.floor(rnd() * 14); i < k; i += 1) {
                        colours.push([Math.floor(rnd() * 256), Math.floor(rnd() * 256), Math.floor(rnd() * 256), rnd() < 0.3 ? 1 : Math.round(rnd() * 100) / 100]);
                    }
                    stack.push(colours);
                }
                const whole = j(exhaustiveStack(stack, j));
                expect(j(worstStack(stack, j))).toBe(whole);
                const beam = j(beamStack(stack, j));
                expect(beam).toBeGreaterThanOrEqual(whole - 1e-12);
                if (beam > whole + 1e-9) misses += 1;
            }
        }
        expect(misses).toBeGreaterThan(0);
        // Past the limit, the beam: counted.
        const wide: Rgba[] = Array.from({ length: 450 }, (_, i) => [i % 256, (i * 7) % 256, (i * 13) % 256, 0.5]);
        const past = { whole: 0, beam: 0 };
        worstStack([wide, wide], judge, past);
        expect(past).toEqual({ whole: 0, beam: 1 });
    });

    it('searches a beam stack again with the wide beam where asked, paints the lower, and counts each miss (the re-check’s P3-1)', () => {
        expect(WIDE_BEAM).toBe(256);
        // A seeded small stack the beam of 12 misses, made to go to the beam by a top layer of
        // transparent colours (each leaves every composite as it is, and multiplies the combinations).
        let seed = 7;
        const rnd = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
        const j = judgeFor([96, 84, 66], [255, 254, 250]);
        const none: Rgba[] = Array.from({ length: 1000 }, (_, i) => [i % 256, 0, 0, 0]);
        let found: Rgba[][] | undefined;
        for (let t = 0; t < 2000 && found === undefined; t += 1) {
            const stack: Rgba[][] = [];
            for (let l = 0; l < 4; l += 1) {
                const colours: Rgba[] = [CLEAR];
                for (let i = 0, k = 6 + Math.floor(rnd() * 10); i < k; i += 1) {
                    colours.push([Math.floor(rnd() * 256), Math.floor(rnd() * 256), Math.floor(rnd() * 256), rnd() < 0.3 ? 1 : Math.round(rnd() * 100) / 100]);
                }
                stack.push(colours);
            }
            const whole = j(exhaustiveStack(stack, j));
            if (j(beamStack(stack, j)) > whole + 1e-9 && j(beamStack(stack, j, WIDE_BEAM)) < j(beamStack(stack, j)) - 1e-9) found = stack;
        }
        expect(found).toBeDefined();
        const past = [...found!, none];
        const narrow = j(beamStack(past, j));
        const lower = j(beamStack(past, j, WIDE_BEAM));
        expect(lower).toBeLessThan(narrow);
        // Not asked: the narrow beam alone, as before.
        const plain = { whole: 0, beam: 0 };
        expect(j(worstStack(past, j, plain))).toBe(narrow);
        expect(plain).toEqual({ whole: 0, beam: 1 });
        // Asked: the lower of the two, and the miss said with both reads.
        const asked: SearchTally = { whole: 0, beam: 0 };
        expect(j(worstStack(past, j, asked, true))).toBe(lower);
        expect(asked.beam).toBe(1);
        expect(asked.wide?.checked).toBe(1);
        expect(asked.wide?.lower).toHaveLength(1);
        expect(asked.wide!.lower[0]).toMatchObject({ layers: 5, narrow, wide: lower });
        expect(asked.wide!.lower[0]!.combinations).toBeGreaterThan(EXHAUSTIVE_LIMIT);
        // A stack the two beams read alike: checked, no miss, the narrow one kept.
        const same: SearchTally = { whole: 0, beam: 0 };
        const one = worstStack([[[40, 60, 80, 1]], none, none], j, same, true);
        expect(one).toEqual([40, 60, 80, 1]);
        expect(same).toMatchObject({ whole: 0, beam: 1, wide: { checked: 1, lower: [] } });
        expect(same.wide!.ms).toBeGreaterThanOrEqual(0);
        // A stack searched whole is never searched again.
        const small = { whole: 0, beam: 0 };
        worstStack(found!, j, small, true);
        expect(small).toEqual({ whole: 1, beam: 0 });
        // And `worstCells` hands the request down, a cached stack searched once a page.
        const memo = new Map<string, Rgba>();
        const misses = new Map<string, BeamMiss>();
        const layer = (id: string, colours: readonly Rgba[]) => ({ tiles: [box(0, 0, 10, 10)], bands: [], colours, absent: false, id });
        const cellsTally: SearchTally = { whole: 0, beam: 0 };
        const layers = [...found!.map((c, i) => layer(`l${i}`, c)), layer('none', none)];
        const first = worstCells(layers, j, memo, 'k', cellsTally, true, misses);
        expect(j(first[0]!.colour)).toBe(lower);
        expect(cellsTally.wide).toMatchObject({ checked: 1 });
        expect(cellsTally.wide!.lower).toHaveLength(1);
        expect(cellsTally.wide!.used).toEqual(cellsTally.wide!.lower);
        // A later read on the same page reuses the search, searches nothing again, and still names the
        // miss its cell came from (what a job's record carries: the same whichever job searched first).
        const later: SearchTally = { whole: 0, beam: 0 };
        const again = worstCells(layers, j, memo, 'k', later, true, misses);
        expect(again).toEqual(first);
        expect(later.beam).toBe(0);
        expect(later.wide?.lower ?? []).toEqual([]);
        expect(later.wide!.used).toEqual(cellsTally.wide!.lower);
    });

    it('covers a repeating layer’s clip area, and widens a still tile over the band its scroller sweeps (b)', () => {
        const scrollers = [REGION];
        // Repeating both ways: the clip area, nothing else.
        const grain = layerCoverage(style({ size: '200px 180px', repeat: 'repeat' }), BOXES, true, scrollers, false);
        expect(grain).toEqual({ tiles: [box(0, 0, 390, 844)], bands: [], tile: { w: 200, h: 180 }, absent: false });
        // Stripes across the top that the region never scrolls under: the tile alone.
        const stripes = layerCoverage(style({ size: '100% 46px', repeat: 'repeat-x', posY: '0px', origin: 'border-box' }), BOXES, false, scrollers, false);
        expect(stripes).toEqual({ tiles: [box(0, 0, 390, 46)], bands: [], tile: { w: 390, h: 46 }, absent: false });
        // A spill that meets the region: its band runs from its part inside the region down by the
        // region's range (a line below it scrolls up over it), across the tile's span.
        const spill = layerCoverage(style({ size: '100% 74px', repeat: 'no-repeat', posY: '46px', origin: 'border-box' }), BOXES, false, scrollers, false);
        expect(spill).toEqual({ tiles: [box(0, 46, 390, 120)], bands: [box(0, 54, 390, 620)], tile: { w: 390, h: 74 }, absent: true });
        // A small tile behind the sign: the band is its own columns — not the whole page, not only the tile.
        const patch = layerCoverage(style({ size: '160px 96px', repeat: 'no-repeat', posX: '24px', posY: '24px', origin: 'border-box' }), BOXES, true, scrollers, false);
        expect(patch).toEqual({ tiles: [box(24, 24, 184, 120)], bands: [box(24, 54, 184, 620)], tile: { w: 160, h: 96 }, absent: true });
        // The band stops at the scroller's box, however far the range.
        const far = layerCoverage(style({ size: '160px 96px', repeat: 'no-repeat', posX: '24px', posY: '24px', origin: 'border-box' }), BOXES, true, [{ ...REGION, range: { x: 0, y: 5000 } }], false);
        expect('bands' in far && far.bands).toEqual([box(24, 54, 184, 762)]);
        // A scroller that cannot move — a short screen — widens nothing: the lines over the tile do not move.
        const still = layerCoverage(style({ size: '100% 74px', repeat: 'no-repeat', posY: '46px', origin: 'border-box' }), BOXES, false, [{ ...REGION, range: { x: 0, y: 0 } }], false);
        expect(still).toEqual({ tiles: [box(0, 46, 390, 120)], bands: [], tile: { w: 390, h: 74 }, absent: false });
        // A row that scrolls sideways widens a tile along x alone, inside the row, by its range.
        const row: Scroller = { box: box(0, 300, 390, 360), x: true, y: false, range: { x: 200, y: 0 } };
        const across = layerCoverage(style({ size: '40px 40px', repeat: 'no-repeat', posX: '100px', posY: '310px', origin: 'border-box' }), BOXES, true, [row], false);
        expect('bands' in across && across.bands).toEqual([box(100, 310, 340, 350)]);
        // `local` follows the element's own scrolling alone. On a box that scrolls itself it moves with
        // the content, and is read where it is; on the root, which does not, it stands still while
        // the region scrolls over it, which `scroll`'s bands would need: refused, with a sentence.
        const localLayer = style({ size: '160px 96px', repeat: 'no-repeat', posX: '24px', posY: '24px', origin: 'border-box', attachment: 'local' });
        const self: Scroller = { box: box(0, 0, 390, 844), x: false, y: true, range: { x: 0, y: 900 }, self: true };
        expect(layerCoverage(localLayer, BOXES, true, [self], false)).toEqual({ tiles: [box(24, 24, 184, 120)], bands: [], tile: { w: 160, h: 96 }, absent: false });
        expect(layerCoverage(localLayer, BOXES, true, scrollers, false)).toEqual({
            refused: 'background-attachment local on a box that does not scroll its own content: it stands still while a scroller inside it moves',
        });
        // A still tile under a sideways row inside the region: the corner reached by scrolling both is
        // not modelled, so it is refused rather than read one axis at a time.
        const inside: Scroller = { box: box(0, 300, 390, 360), x: true, y: false, range: { x: 200, y: 0 } };
        const both = layerCoverage(style({ size: '40px 40px', repeat: 'no-repeat', posX: '100px', posY: '310px', origin: 'border-box' }), BOXES, true, [REGION, inside], false);
        expect(both).toEqual({ refused: 'a still tile under scrollers on two axes: the corner reached by scrolling both is not modelled' });
        // Animated position or size: anywhere in the clip area, or not there at all.
        const falling = layerCoverage(style({ size: '160px 96px', repeat: 'no-repeat', posX: '24px', posY: '24px' }), BOXES, true, scrollers, true);
        expect(falling).toEqual({ tiles: [box(0, 0, 390, 844)], bands: [], tile: { w: 160, h: 96 }, absent: true });
    });

    it('refuses a percentage along y on a box the capture grew, and reads it on one it did not (b)', () => {
        // A bottom-anchored tile on a grown capture is placed against the grown height: refused.
        const bottom = style({ size: '160px 96px', repeat: 'no-repeat', posX: '24px', posY: '100%', origin: 'border-box' });
        expect(layerCoverage(bottom, BOXES, true, [], false, 313)).toEqual({
            refused: "background-position-y 100% on a box the capture grew by 313px: its tile is read where the grown box puts it, not the job's own",
        });
        expect(layerCoverage(bottom, BOXES, true, [], false, 0)).toMatchObject({ tiles: [box(24, 748, 184, 844)] });
        // `calc(95% - 10px)` carries a percentage too; `0%` and px do not.
        expect(layerCoverage(style({ size: '160px 96px', repeat: 'no-repeat', posY: 'calc(95% - 10px)' }), BOXES, true, [], false, 50)).toHaveProperty('refused');
        expect(layerCoverage(style({ size: '160px 96px', repeat: 'no-repeat', posY: '0%' }), BOXES, true, [], false, 50)).not.toHaveProperty('refused');
        expect(layerCoverage(style({ size: '160px 96px', repeat: 'no-repeat', posY: '24px' }), BOXES, true, [], false, 50)).not.toHaveProperty('refused');
        // A size along y by a percentage: a file's tile, or a gradient's that does not repeat down.
        expect(layerCoverage(style({ size: '100% 50%', repeat: 'no-repeat', posY: '0px' }), BOXES, false, [], false, 50)).toEqual({
            refused: "background-size 100% 50% on a box the capture grew by 50px: its tile is sized against the grown box, not the job's own",
        });
        expect(layerCoverage(style({ size: '100px 50%', repeat: 'repeat' }), BOXES, true, [], false, 50)).toHaveProperty('refused');
        // A gradient repeating down covers the clip area whatever its height: nothing to refuse.
        expect(layerCoverage(style({ size: '100% 50%', repeat: 'repeat' }), BOXES, false, [], false, 50)).not.toHaveProperty('refused');
        // A percentage along x is read against a width the capture does not change.
        expect(layerCoverage(style({ size: '50% 40px', repeat: 'no-repeat', posX: '100%', posY: '0px' }), BOXES, false, [], false, 50)).not.toHaveProperty('refused');
        expect(percentOf('calc(95% - 10px)')).toBe(95);
        expect(percentOf('0%')).toBe(0);
        expect(percentOf('24px')).toBe(0);
    });

    it('keeps each layer’s own size, position, origin and clip (c)', () => {
        expect(lengthOf('calc(100% - 10px)', 200)).toBe(190);
        expect(lengthOf('calc(95% - 10px)', 100)).toBeCloseTo(85, 9);
        expect(lengthOf('0px', 50)).toBe(0);
        expect(lengthOf('50%', 300)).toBe(150);
        expect(repeatsOf('repeat-x')).toEqual({ x: true, y: false });
        expect(repeatsOf('round repeat')).toEqual({ x: true, y: true });
        expect(repeatsOf('space no-repeat')).toEqual({ x: true, y: false });
        // `right 10px bottom 20px` computes to calc(100% - 10px) calc(100% - 20px): a tile in the content box's corner, cut by the padding box.
        const corner = layerCoverage(
            style({ size: '40px 30px', repeat: 'no-repeat', posX: 'calc(100% - 10px)', posY: 'calc(100% - 20px)', origin: 'content-box', clip: 'padding-box' }),
            BOXES,
            true,
            [],
            false,
        );
        expect(corner).toEqual({ tiles: [box(323, 773, 363, 803)], bands: [], tile: { w: 40, h: 30 }, absent: false });
        // A gradient at `auto` is its origin box; a percentage size is of the origin box.
        expect(layerCoverage(style({ size: 'auto', repeat: 'no-repeat', origin: 'content-box', clip: 'content-box' }), BOXES, false, [], false)).toMatchObject({
            tiles: [box(17, 21, 373, 823)],
        });
        expect(layerCoverage(style({ size: '50% 10px', repeat: 'no-repeat', posX: '0px', posY: '0px' }), BOXES, false, [], false)).toMatchObject({ tile: { w: 194, h: 10 } });
        // The cells: whole-pixel cuts, each covered cell its stack's worst, no two cells overlapping.
        const judge = judgeFor(DARK_TEXT, LIGHT_BG);
        const grey: Rgba = [120, 130, 140, 0.3];
        const cells = worstCells(
            [
                { tiles: [box(0, 0, 390, 844)], bands: [], colours: [[200, 200, 200, 0.1], CLEAR], absent: false, id: 'ground' },
                { tiles: [box(24.4, 24.4, 184.4, 120.4)], bands: [box(24.4, 54, 184.4, 762)], colours: [grey, CLEAR], absent: true, id: 'patch' },
            ],
            judge,
        );
        for (const c of cells) {
            for (const v of [c.x0, c.x1, c.y0, c.y1]) expect(Number.isInteger(v)).toBe(true);
        }
        for (const [i, a] of cells.entries()) {
            for (const b of cells.slice(i + 1)) {
                expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1, `${JSON.stringify(a)} ${JSON.stringify(b)}`).toBe(false);
            }
        }
        const area = cells.reduce((sum, c) => sum + (c.x1 - c.x0) * (c.y1 - c.y0), 0);
        expect(area).toBe(390 * 844);
        const inBand = cells.find((c) => c.x0 <= 100 && c.x1 > 100 && c.y0 <= 400 && c.y1 > 400)!;
        expect(inBand.colour).toEqual(overRgba(grey, [200, 200, 200, 0.1]));
        const outside = cells.find((c) => c.x0 <= 300 && c.x1 > 300 && c.y0 <= 400 && c.y1 > 400)!;
        expect(outside.colour).toEqual([200, 200, 200, 0.1]);
        expect(cssOf([1.23456, 2, 3, 0.5])).toBe('rgba(1.235, 2, 3, 0.5)');
        // A search is reused across calls by the layers' ids and the judge's key, and only by them.
        const memo = new Map<string, Rgba>();
        let judged = 0;
        const counting = (c: Rgba): number => {
            judged += 1;
            return judge(c);
        };
        const layers = [{ tiles: [box(0, 0, 390, 844)], bands: [], colours: [grey, CLEAR], absent: false, id: 'grey' }];
        const first = worstCells(layers, counting, memo, 'dark on light');
        const afterFirst = judged;
        expect(worstCells(layers, counting, memo, 'dark on light')).toEqual(first);
        expect(judged).toBe(afterFirst);
        worstCells(layers, counting, memo, 'light on dark');
        expect(judged).toBeGreaterThan(afterFirst);
    });

    it('answers a sentence for what it cannot read, never a skip (d)', () => {
        const refused = (over: Partial<LayerStyle>, file = false): string => {
            const out = layerCoverage(style(over), BOXES, file, [REGION], false);
            return 'refused' in out ? out.refused : '';
        };
        expect(refused({ size: 'auto' }, true)).toMatch(/file layer at background-size auto/);
        expect(refused({ size: 'cover' }, true)).toMatch(/file layer at background-size cover/);
        expect(refused({ size: 'auto 20px' }, true)).toMatch(/file layer at background-size auto 20px/);
        expect(refused({ attachment: 'fixed' })).toMatch(/background-attachment fixed/);
        expect(refused({ clip: 'text' })).toMatch(/background-clip text/);
        expect(refused({ origin: 'margin-box' })).toMatch(/background-origin margin-box/);
        expect(refused({ repeat: 'repeat-z' })).toMatch(/background-repeat repeat-z/);
        expect(refused({ size: 'min(10px, 5%) 4px' })).toMatch(/background-size/);
        expect(refused({ posX: 'max(10px, 5%)' })).toMatch(/background-position/);
    });

    it('reads every distinct pixel a canvas hands back, and a transparent one once', () => {
        const data = [0, 0, 0, 0, 9, 9, 9, 0, 122, 138, 153, 89, 122, 138, 153, 89, 255, 255, 255, 255];
        expect(rasterColours(data)).toEqual([CLEAR, [122, 138, 153, 89 / 255], [255, 255, 255, 1]]);
        expect(splitTop('url("a,b.svg"), linear-gradient(rgb(1, 2, 3), rgb(4, 5, 6)), none')).toEqual([
            'url("a,b.svg")',
            'linear-gradient(rgb(1, 2, 3), rgb(4, 5, 6))',
            'none',
        ]);
        // The contrast arithmetic is the rain's (`rainDrop.ts`).
        expect(contrastOf([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 9);
    });
});
