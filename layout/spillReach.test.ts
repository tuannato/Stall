import { describe, expect, it } from 'vitest';
import { reachesAnything, spillReach, type Box } from './spillReach';

describe('a-spill-below-the-fold-is-still-read', () => {
    /**
     * The scroller is 0–390 by 0–762 (a phone's `.stall-scroll`); the strip
     * is a 115px spill at y 1089–1108, below the fold. Round 3 read every
     * strip cut to the scroller, so this one reached nothing whatever lay
     * beside it. Red with `controlInsideClipper` ignored (round 3's read):
     * the first case reaches nothing.
     */
    const scroller = { box: { left: 0, top: 0, right: 390, bottom: 762 }, clipsX: true, clipsY: true };
    const below: Box = { left: 45, top: 1089, right: 160, bottom: 1108 };

    it('reads a strip below the fold whole against a control inside the scroller', () => {
        expect(spillReach(below, scroller, true)).toEqual(below);
        expect(reachesAnything(spillReach(below, scroller, true))).toBe(true);
    });

    it('cuts it to the scroller against a control outside it, where it reaches nothing', () => {
        expect(reachesAnything(spillReach(below, scroller, false))).toBe(false);
    });

    it('keeps the part a scroller shows against a control outside it', () => {
        const across: Box = { left: 300, top: 700, right: 392, bottom: 800 };
        expect(spillReach(across, scroller, false)).toEqual({ left: 300, top: 700, right: 390, bottom: 762 });
    });

    it('cuts only the axis a clipper clips', () => {
        const clipX = { box: scroller.box, clipsX: true, clipsY: false };
        expect(spillReach(below, clipX, false)).toEqual(below);
        const wide: Box = { left: 380, top: 10, right: 420, bottom: 30 };
        expect(spillReach(wide, clipX, false)).toEqual({ left: 380, top: 10, right: 390, bottom: 30 });
    });

    it('reads a strip with no clipper whole', () => {
        expect(spillReach(below, undefined, false)).toEqual(below);
    });
});
