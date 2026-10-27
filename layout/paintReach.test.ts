import { describe, expect, it } from 'vitest';
import {
    BLUR_OPACITY,
    MEET_TOL,
    blurMeet,
    borderImageBox,
    boxShadowLayers,
    compositeOver,
    coverageAt,
    filterLayers,
    maxCoverageOver,
    meetsPast,
    minus,
    normalCdf,
    outlineBox,
    parseFilter,
    parseShadows,
    pseudoRegion,
    sharpMeet,
    tailReach,
    textShadowLayers,
    underlineBand,
    zoomOf,
    type Box,
    type PseudoFacts,
} from './paintReach';

const box = (left: number, top: number, right: number, bottom: number): Box => ({ left, top, right, bottom });
/** Every colour a test writes reads: `transparent` as nothing, `rgba(…, a)` at its alpha, anything else opaque. */
const alphaOf = (c: string): number | undefined => {
    if (c === 'transparent') return 0;
    const m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(c);
    return m === null ? 1 : Number(m[1]);
};

describe('paints with no hit area reaching over money (1b): the reach of each paint', () => {
    it('reads a computed shadow list, colour first or last, inset and all', () => {
        expect(parseShadows('none', alphaOf)).toEqual([]);
        expect(parseShadows('rgba(20, 23, 26, 0.18) 0px 8px 30px 0px', alphaOf)).toEqual([
            { x: 0, y: 8, blur: 30, spread: 0, inset: false, alpha: 0.18, colour: 'rgba(20, 23, 26, 0.18)' },
        ]);
        const two = parseShadows('rgb(255, 0, 0) 0px 0px 0px 60px, rgba(0, 0, 0, 0.5) 1px 2px 3px 4px inset', alphaOf)!;
        expect(two.map((s) => [s.spread, s.inset, s.alpha])).toEqual([
            [60, false, 1],
            [4, true, 0.5],
        ]);
        // A text-shadow: three lengths. A layer that does not read refuses the list.
        expect(parseShadows('rgb(0, 0, 0) 2px 3px 4px', alphaOf)![0]).toMatchObject({ x: 2, y: 3, blur: 4, spread: 0 });
        expect(parseShadows('rgb(0, 0, 0) 2px', alphaOf)).toBeUndefined();
        expect(parseShadows('rgb(0, 0, 0) 2em 3px', alphaOf)).toBeUndefined();
    });

    /*
     * The critic's PW: an `::after` of the price column, height 0, moved up
     * 60px, with `box-shadow: 0 0 0 60px` in a literal colour. The shadow is
     * its zero box grown by 60px; a figure inside that reach is met, and no
     * hit test sees it.
     */
    it('counts a sharp shadow’s offset and spread in full, past the box it is drawn from', () => {
        const base = box(100, 40, 300, 40);
        const [layer] = boxShadowLayers(base, parseShadows('rgb(7, 11, 21) 0px 0px 0px 60px', alphaOf)!);
        expect(layer!.rect).toEqual(box(40, -20, 360, 100));
        const figure = box(200, 60, 280, 90);
        expect(meetsPast(layer!.rect, figure, base)).toEqual(figure);
        // An offset alone moves the rect.
        const [moved] = boxShadowLayers(box(0, 0, 10, 10), parseShadows('rgb(0, 0, 0) 5px -3px 0px 0px', alphaOf)!);
        expect(moved!.rect).toEqual(box(5, -3, 15, 7));
        // An inset layer and a transparent one paint nothing past the box.
        expect(boxShadowLayers(base, parseShadows('rgb(0, 0, 0) 0px 0px 0px 60px inset, transparent 0px 0px 0px 60px', alphaOf)!)).toEqual([]);
        // A transform's magnification grows every length.
        expect(boxShadowLayers(box(0, 0, 10, 10), parseShadows('rgb(0, 0, 0) 0px 0px 0px 4px', alphaOf)!, 2)[0]!.rect).toEqual(box(-8, -8, 18, 18));
    });

    it('meets only past the paint’s own box, by more than a pixel on both axes', () => {
        const base = box(0, 0, 100, 20);
        // Inside the base: its hit area, 1a's.
        expect(meetsPast(box(-10, -10, 110, 30), box(10, 2, 90, 18), base)).toBeUndefined();
        // A pixel of overlap is none.
        expect(meetsPast(box(0, 20, 100, 21), box(0, 20, 100, 40), base)).toBeUndefined();
        expect(meetsPast(box(0, 20, 100, 20 + MEET_TOL + 0.5), box(0, 20, 100, 40), base)).toEqual(box(0, 20, 100, 21.5));
        // No base (a pseudo's region): any overlap.
        expect(meetsPast(box(0, 0, 10, 10), box(2, 2, 8, 8))).toEqual(box(2, 2, 8, 8));
        expect(minus(box(0, 0, 10, 10), box(2, 2, 8, 8))).toHaveLength(4);
        expect(minus(box(0, 0, 10, 10), box(20, 20, 30, 30))).toEqual([box(0, 0, 10, 10)]);
    });

    /*
     * The blur policy: a Gaussian tail, its coverage separable. One layer
     * at its edge covers half its alpha, a deviation out about 16%.
     */
    it('covers a blurred rect’s edge at half its alpha and falls away as a Gaussian', () => {
        expect(normalCdf(0)).toBeCloseTo(0.5, 6);
        expect(normalCdf(1)).toBeCloseTo(0.841345, 5);
        expect(normalCdf(-2)).toBeCloseTo(0.02275, 5);
        const wide = { rect: box(-1e6, -1e6, 0, 1e6), alpha: 1, sigma: 10 };
        expect(coverageAt(wide, 0, 0)).toBeCloseTo(0.5, 5);
        expect(coverageAt(wide, 10, 0)).toBeCloseTo(0.158655, 5);
        // The most over a box is at its point nearest the rect's centre.
        const dot = { rect: box(0, 0, 10, 10), alpha: 0.6, sigma: 5 };
        expect(maxCoverageOver(dot, box(20, 0, 30, 10))).toBeCloseTo(coverageAt(dot, 20, 5), 9);
        expect(maxCoverageOver(dot, box(-50, -50, 50, 50))).toBeCloseTo(coverageAt(dot, 5, 5), 9);
        // A layer's clip: nothing past it covers.
        expect(maxCoverageOver({ ...dot, clip: box(0, 0, 12, 10) }, box(20, 0, 30, 10))).toBe(0);
        expect(maxCoverageOver({ ...dot, clip: box(0, 0, 25, 10) }, box(20, 0, 30, 10))).toBeCloseTo(coverageAt(dot, 20, 5), 9);
        // A sharp layer covers fully where it overlaps, else not at all.
        expect(maxCoverageOver({ rect: box(0, 0, 10, 10), alpha: 0.4, sigma: 0 }, box(5, 5, 20, 20))).toBe(0.4);
        expect(maxCoverageOver({ rect: box(0, 0, 10, 10), alpha: 0.4, sigma: 0 }, box(15, 5, 20, 20))).toBe(0);
        expect(tailReach(1, 10)).toBeGreaterThan(8);
        expect(tailReach(1, 10)).toBeLessThan(9);
        expect(tailReach(0.3, 10)).toBe(0);
    });

    /*
     * The two cases the policy was set against: thirty stacked copies of
     * `0 0 40px` composite near opaque well past the box; the dock's glows
     * (Modern's `0 8px 30px rgba(20, 23, 26, 0.18)` on the dock bar, Neo's
     * `0 0 24px rgba(44, 233, 224, 0.25)`) stay under the policy over a row
     * that stands against the dock's top edge.
     */
    it('composites stacked copies, so thirty soft ones count where one is a glow', () => {
        const line = box(0, 0, 200, 20);
        const one = textShadowLayers([line], parseShadows('rgb(242, 242, 239) 0px 0px 40px', alphaOf)!);
        const thirty = textShadowLayers([line], parseShadows(Array(30).fill('rgb(242, 242, 239) 0px 0px 40px').join(', '), alphaOf)!);
        const beside = box(0, 30, 200, 50);
        expect(compositeOver(one, beside)).toBeLessThan(0.5);
        expect(compositeOver(thirty, beside)).toBeGreaterThan(0.99);
        expect(blurMeet('text-shadow blur', thirty, beside, line, 'thirty')).toMatchObject({ kind: 'text-shadow blur' });
        // The docks: a row whose box ends at the dock's top edge.
        const dock = box(20, 800, 370, 860);
        const row = box(20, 760, 370, 800);
        const modern = boxShadowLayers(dock, parseShadows('rgba(20, 23, 26, 0.18) 0px 8px 30px 0px', alphaOf)!);
        const neo = boxShadowLayers(dock, parseShadows('rgba(44, 233, 224, 0.25) 0px 0px 24px 0px', alphaOf)!);
        expect(compositeOver(modern, row)).toBeLessThan(BLUR_OPACITY);
        expect(compositeOver(neo, row)).toBeLessThan(BLUR_OPACITY);
        expect(blurMeet('box-shadow blur', neo, row, dock, 'dock')).toBeUndefined();
        // A sharp layer is the sharp rule's, never the blur policy's.
        expect(blurMeet('box-shadow blur', boxShadowLayers(dock, parseShadows('rgb(0, 0, 0) 0px 0px 0px 60px', alphaOf)!), row, dock, 'x')).toBeUndefined();
    });

    it('reads an outline’s width and offset, and a border image’s outset', () => {
        const base = box(0, 0, 50, 20);
        // The lint's cap: 4px wide at a 4px offset reaches 8px.
        expect(outlineBox(base, 'solid', 4, 4)).toEqual(box(-8, -8, 58, 28));
        expect(outlineBox(base, 'none', 4, 4)).toBeUndefined();
        expect(outlineBox(base, 'solid', 0, 4)).toBeUndefined();
        // An offset inside the box by more than its width paints inside it.
        expect(outlineBox(base, 'solid', 2, -5)).toBeUndefined();
        expect(borderImageBox(base, [0, 40, 0, 0])).toEqual(box(0, 0, 90, 20));
        expect(borderImageBox(base, [0, 0, 0, 0])).toBeUndefined();
    });

    it('reads a filter’s drop shadows and blurs, and fails closed on url()', () => {
        expect(parseFilter('none', alphaOf)).toEqual({ drops: [], blurs: [] });
        expect(parseFilter('brightness(1.1) saturate(0.8)', alphaOf)).toEqual({ drops: [], blurs: [] });
        expect(parseFilter('url("#x")', alphaOf).unread).toMatch(/url/);
        expect(parseFilter('blur(4px)', alphaOf).blurs).toEqual([4]);
        const f = parseFilter('drop-shadow(rgb(0, 0, 0) 0px 30px 0px) drop-shadow(rgb(0, 0, 0) 0px 30px 0px)', alphaOf);
        expect(f.drops).toHaveLength(2);
        // Each drop shadows the ones before it: offsets 30, 30 and 60.
        const { drops } = filterLayers(box(0, 0, 10, 10), f);
        expect(drops.map((l) => l.rect.top).sort((a, b) => a - b)).toEqual([30, 30, 60]);
        expect(parseFilter(Array(5).fill('drop-shadow(rgb(0, 0, 0) 1px 1px 0px)').join(' '), alphaOf).unread).toMatch(/5 drop shadows/);
        // A blur spreads the element's own paint, taken as opaque.
        expect(filterLayers(box(0, 0, 10, 10), parseFilter('blur(4px)', alphaOf)).blur).toEqual({ rect: box(0, 0, 10, 10), alpha: 1, sigma: 4 });
    });

    it('places a decoration line from the baseline, and an under-placed one from the line’s bottom', () => {
        const line = box(0, 100, 80, 120);
        // Ascent 15: the baseline at 115; an underline 4px below it, 3px thick.
        expect(underlineBand(line, 'underline', 15, 16, '4px', '3px', 'auto')).toEqual(box(0, 119, 80, 122));
        // Raised by the lint's cap: inside its own line.
        expect(underlineBand(line, 'underline', 15, 16, '-4px', '3px', 'auto')).toEqual(box(0, 111, 80, 114));
        expect(underlineBand(line, 'underline', 15, 16, '4px', '3px', 'under')).toEqual(box(0, 124, 80, 127));
        expect(underlineBand(line, 'underline', 15, 12, 'auto', 'auto', 'auto')).toEqual(box(0, 115, 80, 116));
    });

    const pseudo = (over: Partial<PseudoFacts>): PseudoFacts => ({
        host: box(100, 100, 200, 140),
        display: 'block',
        position: 'static',
        width: '100px',
        height: '0px',
        top: 'auto',
        right: 'auto',
        bottom: 'auto',
        left: 'auto',
        marginTop: '0px',
        marginRight: '0px',
        marginBottom: '0px',
        marginLeft: '0px',
        paddingX: 0,
        paddingY: 0,
        borderX: 0,
        borderY: 0,
        fontSize: 16,
        lineHeight: 'normal',
        text: '',
        transform: 'none',
        translate: 'none',
        rotate: 'none',
        scale: 'none',
        offsetPath: 'none',
        zoom: '1',
        ...over,
    });

    it('places a pseudo somewhere in its host, moved by its offsets and margins and grown by its text', () => {
        expect(pseudoRegion(pseudo({}))).toEqual({ box: box(100, 100, 200, 140) });
        expect(pseudoRegion(pseudo({ zoom: 'normal' }))).toEqual({ box: box(100, 100, 200, 140) });
        // PW: moved up 60px.
        expect(pseudoRegion(pseudo({ position: 'relative', top: '-60px' }))).toEqual({ box: box(100, 40, 200, 80) });
        // PWa: a negative top margin pulls it up.
        expect(pseudoRegion(pseudo({ marginTop: '-48px', height: '48px' }))).toEqual({ box: box(100, 52, 200, 148) });
        // Wider than its host: it runs past it.
        expect(pseudoRegion(pseudo({ width: '2000px' }))).toEqual({ box: box(100, 100, 2100, 140) });
        // A glyph stands outside its zero box by up to its size.
        expect(pseudoRegion(pseudo({ text: '◆', fontSize: 40 }))).toEqual({ box: box(60, 60, 240, 180) });
        // An inline pseudo is as wide as its text.
        const inline = pseudoRegion(pseudo({ display: 'inline', width: 'auto', height: 'auto', text: '// ', fontSize: 11, lineHeight: '14px' }));
        expect(inline).toEqual({ box: box(89, 89, 211, 151) });
    });

    it('fails a pseudo closed where a transform moves it, where its own zoom sizes it, where it is out of flow or where a length does not resolve', () => {
        for (const over of [
            { transform: 'matrix(1, 0, 0, 1, 0, -60)' },
            { translate: '0px -60px' },
            { rotate: '45deg' },
            { scale: '3' },
            { offsetPath: 'ray(0deg)' },
            // Z1: its own zoom scales lengths the computed style gives unzoomed.
            { zoom: '20' },
            { zoom: '0.5' },
            { position: 'absolute' },
            { position: 'sticky' },
            { width: 'auto' },
            { marginTop: '-10%' },
            { position: 'relative', top: '50%' },
        ]) {
            expect(pseudoRegion(pseudo(over)), JSON.stringify(over)).toHaveProperty('anywhere');
        }
    });

    it('reads a computed zoom as a factor', () => {
        expect(zoomOf('1')).toBe(1);
        expect(zoomOf('20')).toBe(20);
        expect(zoomOf('0.56')).toBe(0.56);
        expect(zoomOf('250%')).toBe(2.5);
        expect(zoomOf('normal')).toBe(1);
        expect(zoomOf('')).toBe(1);
    });

    it('says a meet in the kind that met', () => {
        expect(sharpMeet('outline', [box(0, 0, 10, 10)], box(5, 5, 20, 20), box(0, 0, 4, 4), 'x')).toMatchObject({ kind: 'outline', at: box(5, 5, 10, 10) });
        expect(sharpMeet('outline', [box(0, 0, 10, 10)], box(50, 50, 60, 60), undefined, 'x')).toBeUndefined();
    });
});
