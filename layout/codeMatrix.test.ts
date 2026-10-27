// @vitest-environment happy-dom
/**
 * 1d reads every module's centre against the matrix a code was drawn from,
 * and reads that matrix off the path's `d` attribute (`layout/codeMatrix.ts`,
 * `__codeMatrices` in the probe): the app hands its text over nowhere else.
 * Held here to `qrSvg` and `qrMatrix` themselves, so the attribute is
 * `qrMatrix(text)` by test and not by reading `qrSvg`'s body.
 */
import { describe, expect, it } from 'vitest';
import { qrMatrix } from '../src/domain/qr';
import { QR_SVG_QUIET_MODULES, qrSvg } from '../src/ui/render';
import { MODULE_SNAP_OFFSETS, MODULE_SNAP_SIZES, matrixBits, matrixOfPath, moduleSnapText } from './codeMatrix';

const TEXTS = [
    'ecash:qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035?amount=12.34&op_return_raw=04535454502000112233',
    'https://stall.cash/s/qz2708636snqhsxu8wnlka78h6fdp77ar59jrf5035',
    'x',
];

const parse = (svg: SVGSVGElement) =>
    matrixOfPath(svg.querySelector('path')!.getAttribute('d') ?? '', svg.getAttribute('viewBox') ?? '', QR_SVG_QUIET_MODULES);

describe('a-codes-path-is-the-matrix-qrmatrix-gave-it', () => {
    it('reads back, off the path qrSvg draws, exactly qrMatrix of the text it was given', () => {
        for (const text of TEXTS) {
            const read = parse(qrSvg(text, 'a code'));
            expect('fault' in read).toBe(false);
            const want = qrMatrix(text);
            expect(read).toEqual({ n: want.length, bits: matrixBits(want) });
        }
    });

    it('tells two codes apart: a code drawn for other text does not read as this one', () => {
        const a = parse(qrSvg(TEXTS[0]!, 'a'));
        const b = parse(qrSvg(`${TEXTS[0]!}0`, 'b'));
        expect(a).not.toEqual(b);
    });

    it('refuses what qrSvg never draws, rather than reading it as a matrix', () => {
        expect(matrixOfPath('M4 4h1v1h-1z', '0 0 29 30', 4)).toEqual({ fault: expect.stringMatching(/is not the square qrSvg draws/) });
        expect(matrixOfPath('M4 4h1v1h-1zM5 4h2v1h-2z', '0 0 29 29', 4)).toEqual({ fault: expect.stringMatching(/not the squares qrSvg draws/) });
        expect(matrixOfPath('', '0 0 29 29', 4)).toEqual({ fault: expect.stringMatching(/not the squares qrSvg draws/) });
        expect(matrixOfPath('M3 4h1v1h-1z', '0 0 29 29', 4)).toEqual({ fault: expect.stringMatching(/outside the 21-module matrix/) });
        expect(matrixOfPath('M4 4h1v1h-1zM4 4h1v1h-1z', '0 0 29 29', 4)).toEqual({ fault: expect.stringMatching(/twice/) });
        expect(matrixOfPath('M4 4h1v1h-1z', '0 0 8 8', 4)).toEqual({ fault: expect.stringMatching(/leaves no matrix/) });
    });
});

describe('the-module-read-agrees-with-this-chrome', () => {
    it('draws its sheet on both sides of the cut, past the smallest code the clean tree paints, at offsets strictly inside a pixel', () => {
        // The runner holds the cut to Chrome on this sheet (`__moduleSnap`): it must hold codes the read refuses and codes it reads.
        // The cut, `MODULE_MIN_PX` in `scripts/code-modules.mjs`, pinned by value there and here (a TS test reads no untyped .mjs).
        const MODULE_MIN_PX = 3;
        expect(MODULE_SNAP_SIZES.some((m) => m < MODULE_MIN_PX)).toBe(true);
        expect(MODULE_SNAP_SIZES).toContain(MODULE_MIN_PX);
        // Past 3.62px, the least module the clean tree paints, to the pay codes' 5.21.
        expect(Math.max(...MODULE_SNAP_SIZES)).toBeGreaterThanOrEqual(5.21);
        expect(MODULE_SNAP_SIZES.some((m) => m > MODULE_MIN_PX && !Number.isInteger(m))).toBe(true);
        expect(MODULE_SNAP_OFFSETS.length).toBeGreaterThanOrEqual(5);
        for (const o of MODULE_SNAP_OFFSETS) expect(o > 0 && o < 1).toBe(true);
        // Every code a code of its own: no two texts alike, so no two matrices are.
        const texts = MODULE_SNAP_SIZES.flatMap((_, i) => MODULE_SNAP_OFFSETS.map((_, j) => moduleSnapText(i * MODULE_SNAP_OFFSETS.length + j)));
        expect(new Set(texts).size).toBe(texts.length);
        expect(new Set(texts.slice(0, 7).map((t) => matrixBits(qrMatrix(t)))).size).toBe(7);
    });
});
