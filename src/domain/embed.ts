/**
 * The one-line HTML a seller pastes into a site of their own: a picture
 * that opens the stall. The cheapest shape of a widget, and the one that
 * needs no framing and no script on the host page — `frame-ancestors
 * 'none'` stays, and nothing of ours runs where we cannot see it (PLAN §
 * Open, the widget). The picture is the look's own card, the same still the
 * social unfurl ships (`ogImageFor` in `functions/lib/unfurl.ts`, held to
 * this table by `embed-image-matches-the-edge-card`): it does not change,
 * and the link is what opens the stall. Live prices on somebody else's page
 * are a different, priced decision.
 */

/** The card for a look, by the id the manifest asked for. Unknown → Modern, as the reader falls back. */
export function embedImagePath(themeId: number): string {
    if (themeId === 0x02) {
        return '/og/stall-neo.png';
    }
    if (themeId === 0x03) {
        return '/og/stall-rural.png';
    }
    return '/og/stall-modern.png';
}

/** The card's own pixels, halved for a page column. */
export const EMBED_WIDTH = 600;
export const EMBED_HEIGHT = 315;

/**
 * Every value is attribute-escaped, the name included: it is screened chain
 * text, but a screen against invisible characters is not a screen against
 * `"` or `<`, and this string is pasted into somebody's page as markup.
 */
export function embedSnippet(input: {
    readonly stallUrl: string;
    readonly imageUrl: string;
    readonly alt: string;
}): string {
    const href = escapeAttr(input.stallUrl);
    const src = escapeAttr(input.imageUrl);
    const alt = escapeAttr(input.alt);
    return `<a href="${href}"><img src="${src}" alt="${alt}" width="${EMBED_WIDTH}" height="${EMBED_HEIGHT}"></a>`;
}

export function escapeAttr(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
