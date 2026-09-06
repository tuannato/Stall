import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DUST_SATS } from './domain/money';
import {
    DESC_PRICE_LEDE,
    DESC_TITLE,
    HANDOFF_FINE_PRINT,
    HANDOFF_MAY_PRESELECT,
    HANDOFF_PRICE_IS_NOT_THE_ROW,
    PAY_NOTE_DIRECT,
    PAY_NOTE_FINAL,
    PAY_TOLERANCE_NONE,
    QUOTE_MINTED_CHIP,
    QUOTE_NOT_MINTED_HERE,
    STUDIO_CARD_ITEMS,
    STUDIO_DESCRIBE_ROW,
} from './ui/copy';
import { PAY_RATE_MAX_AGE_MS } from './ui/render';

const ROOT = join(import.meta.dirname, '..');

function read(...parts: string[]): string {
    return readFileSync(join(ROOT, ...parts), 'utf8');
}

/** Source formatting wraps sentences; the page's words are what is compared. */
function flat(text: string): string {
    return text.replace(/\s+/g, ' ');
}

describe('the-guide-carries-no-script-and-no-inline-style', () => {
    /**
     * A static document under `style-src 'self'`, the same rule as the
     * stream guide. The one foreign host it may name is Cashtab's, where a
     * seller lists a token — the app links there from the first-stall
     * screen already.
     */
    it('ships no script, no inline style, and no host but stall.cash and cashtab.com', () => {
        const html = read('public', 'guide.html');
        expect(html).toContain('<!doctype html>');
        expect(html).not.toMatch(/<script/i);
        expect(html).not.toMatch(/ style="/);
        expect(html).not.toMatch(/<style[\s>]/i);
        expect(html).not.toMatch(/http:\/\//i);
        const https = html.match(/https:\/\/[^\s"'<>]+/gi) ?? [];
        for (const url of https) {
            expect(
                url.startsWith('https://stall.cash') || url.startsWith('https://cashtab.com'),
                url,
            ).toBe(true);
        }
        expect(html).toMatch(/<link rel="stylesheet" href="\/stream\.css"/);
        expect(html).toMatch(/<link rel="stylesheet" href="\/guide\.css"/);
        expect(html).toContain('href="/"');
        expect(html).toContain('href="/stream"');
        expect(html).not.toContain('href="/guide.html"');
        expect(html).not.toContain('href="/stream.html"');
        expect(read('public', 'guide.css')).not.toMatch(/url\(|@import/);
    });
});

describe('the-guide-quotes-the-apps-own-sentences', () => {
    /**
     * The guide describes screens the app paints, in the app's own words:
     * a second phrasing of the handoff or the no-escrow line would be a
     * second truth on a page nobody re-reads when the app's copy moves.
     */
    it('carries the two Cashtab lines, the direct-pay lines, the price lede and the studio names verbatim', () => {
        const html = flat(read('public', 'guide.html'));
        for (const sentence of [
            HANDOFF_MAY_PRESELECT,
            HANDOFF_PRICE_IS_NOT_THE_ROW,
            HANDOFF_FINE_PRINT,
            PAY_NOTE_DIRECT,
            PAY_NOTE_FINAL,
            DESC_PRICE_LEDE,
            // The quote chapter's own three: the provenance chip, the
            // borrowed-id warning and the missing-tolerance line, so a copy
            // move in the app turns this page red rather than leaving a
            // second truth standing.
            QUOTE_MINTED_CHIP,
            QUOTE_NOT_MINTED_HERE,
            PAY_TOLERANCE_NONE,
        ]) {
            expect(html, sentence).toContain(flat(sentence));
        }
        expect(html).toContain(flat(`Studio → ${STUDIO_CARD_ITEMS.replace('&', '&amp;')}`));
        expect(html).toContain(flat(`“${DESC_TITLE}”`));
        expect(html).toContain(flat(STUDIO_DESCRIBE_ROW.replace('&', '&amp;')));
    });

    it('quotes the dust floor and the rate window from the code, not from memory', () => {
        const html = flat(read('public', 'guide.html'));
        const dustXec = (Number(DUST_SATS) / 100).toFixed(2);
        expect(html).toContain(`${dustXec} XEC`);
        expect(PAY_RATE_MAX_AGE_MS).toBe(2 * 60_000);
        expect(html).toContain('older than two minutes');
        for (const name of ['Firma', 'fCHF', 'fEUR', 'XECX']) {
            expect(html).toContain(name);
        }
    });
});

/*
 * The tolerance is the seller's published byte. The page prints it and
 * never rules on whether a payment covered a quote — PLAN § D: "the
 * seller's stated tolerance informs, and the seller decides". A guide that
 * said a payment "counts as paid in full" in its own voice was this page
 * adjudicating, on the one sentence a dispute would quote.
 */
describe('the-guide-does-not-say-a-payment-counts-as-paid-in-full', () => {
    it('attributes the tolerance to the seller and leaves the verdict to them', () => {
        const html = flat(read('public', 'guide.html'));
        expect(html).not.toMatch(/a payment within it counts as paid in full/i);
        expect(html).toContain('the seller decides');
        expect(html).toContain('record says');
    });
});

/*
 * The rate a USD quote is converted through comes from one host the policy
 * allows and nothing else; the guide names it, read from the same policy
 * file the app ships, so a change of feed turns this page red.
 */
describe('the-guide-names-the-rate-source-the-csp-allows', () => {
    it('names CoinGecko because _headers allows api.coingecko.com', () => {
        const headers = read('public', '_headers');
        const csp = headers.split('\n').find((line) => line.includes('Content-Security-Policy'))!;
        const connect = csp.split(';').find((part) => part.trim().startsWith('connect-src'))!;
        expect(connect).toContain('https://api.coingecko.com');
        expect(flat(read('public', 'guide.html'))).toContain('CoinGecko');
    });
});

describe('the-guide-promises-nothing', () => {
    it('does not promise safety, a guarantee or a refund', () => {
        const html = read('public', 'guide.html');
        expect(html).not.toMatch(/guarantee|secure|refund|risk-free/i);
    });
});
