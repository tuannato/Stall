import qrcode from 'qrcode-generator';

/**
 * A QR module matrix for `text`, square, dark = true. Pure: the SVG is drawn in
 * `src/ui`. Error correction `M` (15%) is the wallet-QR default; type 0 lets the
 * library pick the smallest version that fits.
 */
/**
 * The longest input this returns a matrix for. Not the library's ceiling — it
 * throws near 2,300 characters — but the point past which the result has
 * stopped being a QR code anyone can use: at 2,272 characters the matrix is 177
 * modules wide, drawn inside a 168px box, which is under one device pixel per
 * module. A code that cannot be scanned is not worth painting, and a link long
 * enough to reach the library's limit takes the whole page down with it
 * (`renderStall` empties the root before it paints, so a throw mid-paint leaves
 * nothing, and every repaint throws again).
 *
 * Callers ask `fitsQr` first and offer the plain link instead.
 */
export const MAX_QR_CHARS = 512;

/** Whether `text` is short enough to produce a code a phone can actually read. */
export function fitsQr(text: string): boolean {
    return text.length <= MAX_QR_CHARS;
}

export function qrMatrix(text: string): boolean[][] {
    if (!fitsQr(text)) {
        throw new RangeError(`qrMatrix: ${text.length} chars exceeds ${MAX_QR_CHARS}`);
    }
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const rows: boolean[][] = [];
    for (let r = 0; r < n; r += 1) {
        const row: boolean[] = [];
        for (let c = 0; c < n; c += 1) {
            row.push(qr.isDark(r, c));
        }
        rows.push(row);
    }
    return rows;
}
