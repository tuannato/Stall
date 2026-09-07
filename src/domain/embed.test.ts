import { describe, expect, it } from 'vitest';
import { EMBED_HEIGHT, EMBED_WIDTH, embedImagePath, embedSnippet, escapeAttr } from './embed';
import { ogImageFor } from '../../functions/lib/unfurl';

describe('embed-image-matches-the-edge-card', () => {
    /**
     * The snippet's picture is the same still the social card ships; two
     * tables for one picture is how a seller embeds one look and unfurls
     * another. Every shipped id and the unknown-id fallback agree.
     */
    it('agrees with ogImageFor on every shipped look and on an unknown id', () => {
        // The shipped ids, by number — `theme-table-ids-are-pinned` holds the
        // table to exactly these.
        for (const id of [0x01, 0x02, 0x03]) {
            expect(embedImagePath(id), `theme ${id}`).toBe(ogImageFor(id));
        }
        expect(embedImagePath(0x7f)).toBe(ogImageFor(0x7f));
        expect(new Set([0x01, 0x02, 0x03].map(embedImagePath)).size, 'three looks, three cards').toBe(3);
    });
});

describe('the-embed-snippet-escapes-the-name', () => {
    /**
     * The name is chain text pasted into somebody else's page as markup.
     * `isLegibleText` screens invisible characters, not `"` or `<`.
     */
    it('is one anchor around one image, every attribute escaped', () => {
        const out = embedSnippet({
            stallUrl: 'https://stall.cash/s/qpabc',
            imageUrl: 'https://stall.cash/og/stall-neo.png',
            alt: 'Riverside & "Co" <x> on Stall',
        });
        expect(out).toBe(
            `<a href="https://stall.cash/s/qpabc"><img src="https://stall.cash/og/stall-neo.png" alt="Riverside &amp; &quot;Co&quot; &lt;x&gt; on Stall" width="${EMBED_WIDTH}" height="${EMBED_HEIGHT}"></a>`,
        );
        expect(out).not.toMatch(/<script|javascript:/i);
        expect(escapeAttr(`'`)).toBe('&#39;');
    });
});
