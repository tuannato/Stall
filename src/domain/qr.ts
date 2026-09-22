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

/**
 * The quiet zone `qrSvg` draws, four modules each side, so a span is the data
 * count plus eight. Stated here because the density below is per PAINTED
 * module and the margin is part of what the box has to hold (§9).
 */
export const QR_QUIET_MODULES = 4;

/**
 * **The one density this project has watched a phone read**: 81 data modules
 * — an 89 span — inside the record sheet's 440px painted code, which is
 * 4.94px a module (`CLAUDE.md` §9). The failed reading beside it is 3.37.
 * Neither names a device, a distance or the light, so this is a floor taken
 * from one observation, not a curve.
 *
 * It exists because a memo grows with the items it names, and an item count
 * is the wrong gate: twenty-six items at counts under 256 draw at 5.18px a
 * module and the same twenty-six at counts past 255 draw at 4.73, below this
 * floor, while the count says twenty-six either way. The composed string is
 * what decides (2026-09-22, the critic's P2-6).
 */
export const QR_PROVEN_PX_PER_MODULE = 4.94;

/**
 * The span — modules plus both margins — `text` would paint in, or
 * `undefined` past `MAX_QR_CHARS`, where there is no code to measure. One
 * encode per call, which is the same encode the drawer makes.
 */
export function qrSpan(text: string): number | undefined {
    if (!fitsQr(text)) {
        return undefined;
    }
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr.getModuleCount() + QR_QUIET_MODULES * 2;
}

/**
 * Whether a code for `text` drawn in a `boxPx`-wide box stays at or above the
 * one density a phone has read here. `boxPx` is the PAINTED width — the box
 * minus its own padding, which is 20px on the sheets' plates since the box is
 * border-box (§9: the paragraph was 4% optimistic until that was measured).
 */
export function qrScansInBox(text: string, boxPx: number): boolean {
    const span = qrSpan(text);
    return span !== undefined && boxPx / span >= QR_PROVEN_PX_PER_MODULE;
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
