/**
 * **The matrix a code was drawn from** (before 8g2, 1d; `PROBE-RULES.md`,
 * "Before 8g2, 1d: the code's modules"). 1d reads every module's centre
 * pixel on a contrast job's own capture and holds it to the module the code
 * is meant to have, so what it compares against must come from the DOM the
 * app built and never from the pixels it reads.
 *
 * `qrSvg` takes the text, asks `qrMatrix(text)` for its modules, and writes
 * them into the path's `d` attribute as one `M c r h1v1h-1z` square per dark
 * module, offset by `QR_SVG_QUIET_MODULES`, in a viewBox `0 0 size size`
 * (size = the matrix's side plus both quiet zones). It hands the text over
 * nowhere else: the svg carries no copy of it, and the pay sheets keep the
 * composed link in their closure on purpose (`CLAUDE.md` §8). So the
 * attribute is the app's own record of `qrMatrix(text)`, and a stylesheet
 * cannot change an attribute (a `d` property can redraw the path, which the
 * code hold refuses: `a-code-is-drawn-black-on-white`). Where the DOM does
 * carry the text — the touch wall's payment plate, `data-pay-uri` — the
 * probe also holds the attribute's matrix to `qrMatrix` of that text.
 *
 * Pure, so a test holds the parse to `qrSvg` and `qrMatrix` themselves
 * (`codeMatrix.test.ts`, `a-codes-path-is-the-matrix-qrmatrix-gave-it`).
 */

/** A code's matrix, row-major, `'1'` a dark module, `n` modules a side. */
export type CodeMatrix = { n: number; bits: string };

/** Why a code's path is not the matrix `qrSvg` draws, or the matrix. */
export function matrixOfPath(d: string, viewBox: string, quiet: number): CodeMatrix | { fault: string } {
    const view = /^0 0 (\d+) \1$/.exec(viewBox.trim());
    if (view === null) return { fault: `its viewBox (${viewBox.slice(0, 40) || 'none'}) is not the square qrSvg draws` };
    const size = Number(view[1]);
    const n = size - 2 * quiet;
    if (!(n > 0)) return { fault: `its viewBox of ${size} leaves no matrix inside a quiet zone of ${quiet}` };
    const squares = [...d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)];
    if (squares.length === 0 || squares.map((m) => m[0]).join('') !== d) {
        return { fault: 'its path is not the squares qrSvg draws, so the matrix it was drawn from cannot be read' };
    }
    const bits = new Array<string>(n * n).fill('0');
    for (const m of squares) {
        const c = Number(m[1]) - quiet;
        const r = Number(m[2]) - quiet;
        if (c < 0 || r < 0 || c >= n || r >= n) {
            return { fault: `its path draws a module at ${m[1]},${m[2]}, outside the ${n}-module matrix inside its quiet zone` };
        }
        const at = r * n + c;
        if (bits[at] === '1') return { fault: `its path draws the module at ${m[1]},${m[2]} twice` };
        bits[at] = '1';
    }
    return { n, bits: bits.join('') };
}

/** `qrMatrix`'s answer as the same row-major string. */
export function matrixBits(matrix: readonly (readonly boolean[])[]): string {
    return matrix.map((row) => row.map((dark) => (dark ? '1' : '0')).join('')).join('');
}
