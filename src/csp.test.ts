import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('csp-is-header-not-meta', () => {
    it('does not put CSP in a meta tag', () => {
        const html = readFileSync(join(import.meta.dirname, '..', 'index.html'), 'utf8');
        expect(html.toLowerCase()).not.toMatch(/http-equiv\s*=\s*["']content-security-policy["']/);
        const vite = readFileSync(join(import.meta.dirname, '..', 'vite.config.ts'), 'utf8');
        expect(vite).toMatch(/Content-Security-Policy/);
        expect(vite).toMatch(/wasm-unsafe-eval/);
        expect(vite).toMatch(/frame-ancestors 'none'/);
    });
});
