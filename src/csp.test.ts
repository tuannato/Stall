import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CSP } from '../vite.config';
import { CHRONIK_HOSTS } from './net/hosts';

const ROOT = join(import.meta.dirname, '..');

function read(...parts: string[]): string {
    return readFileSync(join(ROOT, ...parts), 'utf8');
}

/** Directive name to its sources, so two syntaxes can be compared by meaning. */
function directives(policy: string): Map<string, string> {
    const out = new Map<string, string>();
    for (const part of policy.split(';')) {
        const trimmed = part.trim();
        if (trimmed === '') {
            continue;
        }
        const space = trimmed.indexOf(' ');
        const name = space === -1 ? trimmed : trimmed.slice(0, space);
        out.set(name, space === -1 ? '' : trimmed.slice(space + 1).trim());
    }
    return out;
}

/** The CSP value as that file writes it, stripped of its host syntax. */
function policyIn(file: string): string {
    const nginx = file.match(/add_header Content-Security-Policy "([^"]*)"/);
    if (nginx) {
        return nginx[1]!;
    }
    const pages = file.match(/^\s*Content-Security-Policy:\s*(.+)$/m);
    expect(pages, 'no Content-Security-Policy found').not.toBeNull();
    return pages![1]!.trim();
}

describe('csp-is-header-not-meta', () => {
    it('keeps the policy in a response header and states what default-src cannot backstop', () => {
        expect(read('index.html').toLowerCase()).not.toMatch(
            /http-equiv\s*=\s*["']content-security-policy["']/,
        );
        const d = directives(CSP);
        expect(d.get('frame-ancestors')).toBe("'none'");
        expect(d.get('script-src')).toContain('wasm-unsafe-eval');
        expect(d.get('script-src')).not.toContain('sha256-');
        expect(d.get('script-src')).not.toContain("'unsafe-inline'");
        // worker-src falls back through child-src to script-src, never to
        // default-src, so script-src's 'wasm-unsafe-eval' would carry into it.
        expect(d.get('worker-src')).toBe("'none'");
        expect(d.get('object-src')).toBe("'none'");
        expect(d.get('frame-src')).toBe("'none'");
    });

    it('never lets the dev relaxation reach the deployed policy', () => {
        // The dev server needs inline styles and a blob worker. Neither may
        // appear in the policy that actually ships.
        const config = read('vite.config.ts');
        expect(config).toMatch(/const DEV_CSP =/);
        expect(config).toMatch(/server:\s*\{\s*headers:\s*\{\s*'Content-Security-Policy':\s*DEV_CSP/);
        expect(config).toMatch(/preview:\s*\{\s*headers:\s*\{\s*'Content-Security-Policy':\s*CSP/);
        for (const file of ['public/_headers', 'deploy/stall-headers.conf']) {
            const policy = policyIn(read(file));
            expect(policy, file).not.toContain("'unsafe-inline'");
            expect(policy, file).not.toContain('blob:');
        }
    });

    it('keeps the built document free of inline script rather than hashing one', () => {
        expect(read('vite.config.ts')).toMatch(/modulePreload:\s*\{\s*polyfill:\s*false\s*\}/);
    });
});

describe('deploy-spec-matches-the-app', () => {
    /**
     * Three copies of one policy: the dev/preview header, the deployed
     * Cloudflare Pages header, and the nginx form kept for the revisit
     * condition. They are compared by directive rather than by bytes, because
     * `_headers` and `add_header` are different syntaxes for the same rule.
     *
     * This proves the copies agree. It proves nothing about any running
     * origin — confirm the header actually arrives before trusting it.
     */
    it.each([
        ['cloudflare pages', 'public/_headers'],
        ['nginx', 'deploy/stall-headers.conf'],
    ])('%s serves the same policy as the app', (_name, path) => {
        const deployed = directives(policyIn(read(path)));
        expect(Object.fromEntries(deployed)).toEqual(Object.fromEntries(directives(CSP)));
        for (const host of CHRONIK_HOSTS) {
            expect(deployed.get('connect-src'), `${host} missing`).toContain(host);
        }
    });

    it('answers a stall with index.html at 200 and never caches the document', () => {
        const redirects = read('public/_redirects');
        expect(redirects).toMatch(/^\/s\/\*\s+\/index\.html\s+200$/m);
        // A bare /* rewrite would serve HTML for a missing hashed asset.
        expect(redirects).not.toMatch(/^\/\*\s/m);
        // Two origins would mean two separate browser stores.
        expect(redirects).toContain('www.stall.cash');

        const headers = read('public/_headers');
        expect(headers).toMatch(/Cache-Control:\s*no-store/);
        expect(headers).toMatch(/\/assets\/\*/);
        expect(headers).toMatch(/immutable/);
        // Tabnabbing isolation, not a self-close helper. Keep it.
        expect(headers).toMatch(/Cross-Origin-Opener-Policy:\s*same-origin/);

        const nginx = read('deploy/nginx.conf');
        expect(nginx).toContain('try_files $uri /index.html');
        expect(nginx).not.toContain('error_page 404');
        expect(nginx).toContain('try_files $uri =404');
        expect(nginx).toContain('Cache-Control "no-store"');
    });
});
