import { describe, expect, it } from 'vitest';
import { MAX_TOKEN_URL, tokenUrl, tokenUrlHost } from './tokenlink';

describe('genesis-url-cannot-become-script', () => {
    /**
     * The minter wrote this field and nobody else checked it. A `javascript:`
     * href is script execution from a stranger's genesis, permanent on chain.
     * Parsed, never prefix-matched: whitespace and case both defeat a string
     * test and the URL still runs.
     */
    it('refuses every scheme but http and https', () => {
        for (const raw of [
            'javascript:alert(1)',
            'JaVaScRiPt:alert(1)',
            '\tjavascript:alert(1)',
            '  javascript:alert(1)  ',
            'data:text/html,<script>alert(1)</script>',
            'blob:https://evil.example/x',
            'vbscript:msgbox(1)',
            'file:///etc/passwd',
            'ftp://evil.example/x',
        ]) {
            expect(tokenUrl(raw), raw).toBeUndefined();
        }
    });

    it('refuses anything that is not an absolute url with a host', () => {
        for (const raw of [
            undefined,
            '',
            '   ',
            'not a url',
            '/relative/path',
            '//evil.example/x',
            'a'.repeat(MAX_TOKEN_URL + 1),
            `https://evil.example/${'a'.repeat(MAX_TOKEN_URL)}`,
        ]) {
            expect(tokenUrl(raw as string | undefined), String(raw).slice(0, 30)).toBeUndefined();
        }
    });

    it('collapses an extra slash rather than inventing a host', () => {
        // `https:///nohost` parses with `nohost` AS the host, so it is a real
        // destination and is offered as one — the hostname guard in the module
        // is for the shapes the parser accepts with none, not for this.
        expect(tokenUrl('https:///nohost')).toBe('https://nohost/');
    });

    it('returns the parsed form, so what is shown is what is followed', () => {
        // Displaying the raw string and opening the parsed one is how a reader
        // is shown one destination and sent to another.
        expect(tokenUrl('https://example.com')).toBe('https://example.com/');
        expect(tokenUrl('  https://example.com/a?b=1  ')).toBe('https://example.com/a?b=1');
        expect(tokenUrl('http://example.com/x')).toBe('http://example.com/x');
    });

    it('names the host, which is the part a lookalike domain gets caught by', () => {
        expect(tokenUrlHost('https://example.com/a/b')).toBe('example.com');
        expect(tokenUrlHost('not a url')).toBeUndefined();
    });
});
