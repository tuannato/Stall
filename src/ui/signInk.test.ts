// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inkLines } from './signInk';

/**
 * The ink model measures a sign line as it is PAINTED (the 8f2 critic's
 * re-check, item 1): Neo's row uppercases its sign, and a seller types a
 * lowercase Vietnamese name — "ẫữệ" measured as written reaches 40.7px above
 * the baseline at 44px in Inter 800, "ẪỮỆ" as painted 48.7px, so a ladder
 * and a probe that measured the source let the painted marks be cut.
 * happy-dom lays out nothing and draws nothing, so the line's box and the
 * canvas are stood in for here and what the model hands the canvas is read;
 * the layout probe's plant (PROBE-RULES.md, "Step 8f2") is the painted half.
 */

type Measured = { text: string; caps: string; stretch: string; font: string };
let measured: Measured[] = [];

beforeEach(() => {
    measured = [];
    const ctx = {
        font: '',
        fontVariantCaps: 'normal',
        fontStretch: 'normal',
        measureText(text: string) {
            measured.push({ text, caps: this.fontVariantCaps, stretch: this.fontStretch, font: this.font });
            return { actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2, fontBoundingBoxAscent: 9 };
        },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    const line = { left: 10, top: 20, right: 210, bottom: 40, width: 200, height: 20, x: 10, y: 20 };
    vi.spyOn(Range.prototype, 'getClientRects').mockReturnValue([line] as never);
    vi.spyOn(Range.prototype, 'getBoundingClientRect').mockReturnValue({ ...line, left: 12, right: 20, width: 8 } as never);
});

afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
});

function line(text: string, style: string): HTMLElement {
    const el = document.createElement('h1');
    el.setAttribute('style', style);
    el.textContent = text;
    document.body.append(el);
    return el;
}

describe('a-transformed-name-is-measured-as-it-is-painted', () => {
    it('measures an uppercased name in capitals, and its ink from those', () => {
        // happy-dom computes no writing mode unless one is given; a browser
        // always computes one.
        const ink = inkLines(line('ẫữệ ấầẩ', 'text-transform: uppercase; writing-mode: horizontal-tb'));
        expect(measured.map((m) => m.text)).toEqual(['ẪỮỆ ẤẦẨ']);
        // The baseline is the line's top plus the face's ascent; the ink
        // reaches the measured ascent above it and the descent below.
        expect(ink).toEqual([{ left: 10, top: 19, right: 210, bottom: 31 }]);
    });

    it('measures a lowercased name in small letters', () => {
        inkLines(line('ẪỮỆ', 'text-transform: lowercase'));
        expect(measured.map((m) => m.text)).toEqual(['ẫữệ']);
    });

    it('capitalizes every word, erring toward more capitals than CSS paints', () => {
        inkLines(line('ẫữệ ấầẩ-ẫ', 'text-transform: capitalize'));
        expect(measured.map((m) => m.text)).toEqual(['Ẫữệ Ấầẩ-Ẫ']);
    });

    it('measures an untransformed name as written', () => {
        inkLines(line('ẫữệ ấầẩ', ''));
        expect(measured.map((m) => m.text)).toEqual(['ẫữệ ấầẩ']);
    });

    it('hands the canvas the small caps and the width the line is painted in', () => {
        // A browser computes `font-stretch` as a percentage; canvas takes the
        // keyword alone.
        inkLines(line('ẫữệ', 'font-variant-caps: small-caps; font-stretch: 75%'));
        expect(measured).toHaveLength(1);
        expect(measured[0]!.caps).toBe('small-caps');
        expect(measured[0]!.stretch).toBe('condensed');
    });
});
