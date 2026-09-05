/**
 * The drawn glyphs: one set on a 16-grid, stroked in `currentColor`. Every
 * stroke attribute lives in CSS (`.ic` in stall.css, the weight per look in
 * each theme sheet), never on the node, so a look changes the line in its
 * own file. A glyph is decoration — `aria-hidden`, no text — and the control
 * that carries one keeps its words (or an `aria-label`) beside it, so the
 * control's `textContent` is still exactly its copy constant.
 */
export const SVG_NS = 'http://www.w3.org/2000/svg';

export type GlyphName =
    | 'close'
    | 'back'
    | 'forward'
    | 'chevron'
    | 'copy'
    | 'check'
    | 'pin'
    | 'external'
    | 'retry'
    | 'plus';

const GLYPH_PATHS: Record<GlyphName, string> = {
    close: 'M4 4l8 8M12 4l-8 8',
    back: 'M13 8H3M7 4L3 8l4 4',
    forward: 'M3 8h10M9 4l4 4-4 4',
    chevron: 'M6 3l5 5-5 5',
    copy: 'M6 6h8v8H6zM10 6V3H3v7h3',
    check: 'M3 8.5l3.5 3.5L13 4.5',
    pin: 'M6 2h4M8 2v4M5 6h6l1 4H4zM8 10v4',
    external: 'M9 3h4v4M13 3L7 9M11 9v4H3V5h4',
    retry: 'M13.5 8A5.5 5.5 0 1 1 11.6 3.9M13.5 3v3.5H10',
    plus: 'M8 3v10M3 8h10',
};

/** One `<svg class="ic …" aria-hidden>` holding the named path. */
export function glyph(name: GlyphName, extraClass?: string): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', extraClass === undefined ? 'ic' : `ic ${extraClass}`);
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', GLYPH_PATHS[name]);
    svg.append(path);
    return svg;
}
