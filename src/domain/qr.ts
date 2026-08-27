import qrcode from 'qrcode-generator';

/**
 * A QR module matrix for `text`, square, dark = true. Pure: the SVG is drawn in
 * `src/ui`. Error correction `M` (15%) is the wallet-QR default; type 0 lets the
 * library pick the smallest version that fits.
 */
export function qrMatrix(text: string): boolean[][] {
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
