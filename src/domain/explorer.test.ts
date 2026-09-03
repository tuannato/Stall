// @vitest-environment node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXPLORER_TX_BASE, EXPLORER_TX_URL } from './explorer';

describe('explorer-url-is-a-constant-not-a-string-built-in-render', () => {
    /**
     * The destination of an outbound link is a decision, not a detail. Built
     * inline it would be edited in the one file nobody greps for a hostname,
     * and a link on a money page that quietly changed where it goes is the
     * shape of a phish. One constant, one gate, both testable.
     *
     * Measured 2026-09-03 before it shipped: `curl -I
     * https://explorer.e.cash/tx/<a real txid>` answers `HTTP/2 200`,
     * `content-type: text/html`, no redirect; a txid that does not exist
     * answers 500. So the path shape is `/tx/<txid>` with no trailing slash
     * and no query.
     */
    it('names the explorer in exactly one module', () => {
        const root = join(import.meta.dirname, '..');
        // The **URL**, not the word: `copy.ts` names the site in prose where
        // it explains where a reader has seen a token-type label before, and a
        // grep that punished explaining itself would be answered by writing a
        // worse comment (`directory-walls` learned the same lesson).
        for (const rel of ['ui/render.ts', 'ui/copy.ts', 'app.ts']) {
            const text = readFileSync(join(root, rel), 'utf8');
            expect(text, rel).not.toContain('https://explorer');
        }
        expect(EXPLORER_TX_BASE).toBe('https://explorer.e.cash/tx/');
    });

    it('builds a url only from 64 lowercase hex', () => {
        const txid = 'ab'.repeat(32);
        expect(EXPLORER_TX_URL(txid)).toBe(`${EXPLORER_TX_BASE}${txid}`);

        // `chronik.tx()` concatenates whatever it is given into a request path
        // and never checks it (§5); an href is the same hazard pointed
        // outward, so the same 64-hex gate stands here.
        for (const bad of [
            '',
            'unknown',
            'AB'.repeat(32),
            `${'ab'.repeat(32)}/../evil`,
            'ab'.repeat(31),
            `${'ab'.repeat(32)}0`,
            '../../etc/passwd',
            'ab'.repeat(32) + '?x=1',
        ]) {
            expect(EXPLORER_TX_URL(bad), bad).toBeUndefined();
        }
    });
});
