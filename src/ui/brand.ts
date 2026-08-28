/**
 * The Stall mark — the shipped logo itself, not a redrawing of it. The source
 * art has a dark background baked in, so it is extracted to a transparent
 * hexagon (`logo-mark.png`) that sits on any theme's canvas — white, cream or
 * near-black — because the mark carries its own hexagon and inks. Vite fingerprints
 * the file into `/assets`, so it is same-origin (`img-src 'self'`) and immutably
 * cached; no external host, and it is the real brand pixel-for-pixel.
 */

import logoMark from './logo-mark.png';

/**
 * The mark, sized by CSS (`.stall-mark`). Decorative: `alt=""` keeps a screen
 * reader from announcing it, because the stall name or wordmark beside it
 * already carries the name.
 */
export function stallMark(): HTMLImageElement {
    const img = document.createElement('img');
    img.className = 'stall-mark';
    img.src = logoMark;
    img.alt = '';
    img.width = 30;
    img.height = 36;
    img.decoding = 'async';
    return img;
}
