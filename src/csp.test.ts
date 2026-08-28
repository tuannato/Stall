import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import appConfig, { CSP } from '../vite.config';
import { ICON_HOST } from './domain/icons';
import { CHRONIK_HOSTS, PRICE_HOST } from './net/hosts';

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

/** The three policy copies, compared by directive in deploy-spec-matches-the-app. */
function policyCopies(): Array<[string, string]> {
    return [
        ['vite', CSP],
        ['cloudflare pages', policyIn(read('public/_headers'))],
        ['nginx', policyIn(read('deploy/stall-headers.conf'))],
    ];
}

function referrerPolicyIn(file: string): string {
    const nginx = file.match(/add_header Referrer-Policy "([^"]*)"/);
    if (nginx) {
        return nginx[1]!;
    }
    const pages = file.match(/^\s*Referrer-Policy:\s*(.+)$/m);
    expect(pages, 'no Referrer-Policy found').not.toBeNull();
    return pages![1]!.trim();
}

function viteHeader(block: 'server' | 'preview', name: string): string {
    const headers = appConfig[block]?.headers;
    expect(headers, `${block} headers`).toBeTypeOf('object');
    const value = (headers as Record<string, unknown>)[name];
    expect(value, `${block} ${name}`).toBeTypeOf('string');
    return value as string;
}

/**
 * A directive's sources as tokens.
 *
 * Substring checks cannot police this list: `not.toContain('unsafe-eval')`
 * also matches the harmless `'wasm-unsafe-eval'`, so the one keyword that turns
 * an XSS into arbitrary code could be added and read as already banned. Split
 * first, then compare whole tokens.
 */
function sources(policy: string, name: string): string[] {
    return (directives(policy).get(name) ?? '').split(/\s+/).filter((s) => s !== '');
}

describe('script-src-and-connect-src-are-pinned', () => {
    /**
     * `deploy-spec-matches-the-app` only proves the three copies agree, and
     * `csp-is-header-not-meta` only asks whether a few strings are present. Both
     * stay green if every copy is loosened together — which is exactly how a
     * policy gets loosened. `img-src-is-self-and-the-icon-host` is the pattern
     * that was not repeated for the two directives that matter most.
     */
    it('allows nothing in script-src but self', () => {
        for (const [label, policy] of policyCopies()) {
            // No wasm is bundled, so 'wasm-unsafe-eval' is gone too: the loosest
            // allowance the origin ever needed. `'self'` and nothing else.
            expect(sources(policy, 'script-src'), label).toEqual(["'self'"]);
            expect(sources(policy, 'script-src'), label).not.toContain("'unsafe-eval'");
            expect(sources(policy, 'script-src'), label).not.toContain(
                "'wasm-unsafe-eval'",
            );
        }
    });

    it('allows nothing in connect-src but self and the chronik hosts', () => {
        const expected = [
            "'self'",
            ...CHRONIK_HOSTS,
            ...CHRONIK_HOSTS.map((host) => host.replace('https://', 'wss://')),
            // The price feed. One origin, and the only non-chronik host here:
            // the fiat line is supplementary, and this is what it costs.
            PRICE_HOST,
        ].sort();
        for (const [label, policy] of policyCopies()) {
            expect([...sources(policy, 'connect-src')].sort(), label).toEqual(expected);
        }
    });
});

/** Hostnames of URL sources. `'self'` and tokens are skipped. */
function sourceHostnames(sources: string): Set<string> {
    const out = new Set<string>();
    for (const src of sources.split(/\s+/)) {
        if (!/^[a-z][a-z0-9+.-]*:/i.test(src)) {
            continue;
        }
        try {
            const host = new URL(src).hostname;
            if (host !== '') {
                out.add(host);
            }
        } catch {
            // scheme with no host, e.g. data:
        }
    }
    return out;
}

describe('csp-is-header-not-meta', () => {
    it('keeps the policy in a response header and states what default-src cannot backstop', () => {
        expect(read('index.html').toLowerCase()).not.toMatch(
            /http-equiv\s*=\s*["']content-security-policy["']/,
        );
        const d = directives(CSP);
        expect(d.get('frame-ancestors')).toBe("'none'");
        expect(d.get('script-src')).toBe("'self'");
        expect(d.get('script-src')).not.toContain('sha256-');
        expect(d.get('script-src')).not.toContain("'unsafe-inline'");
        // worker-src falls back through child-src to script-src, never to
        // default-src, so it is stated rather than left to inherit script-src.
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

    it('answers a stall with the document at 200 and never caches it', () => {
        const redirects = read('public/_redirects');
        // Destination "/" and not "/index.html": Pages 308s an .html URL to
        // its extensionless form, so a rewrite aimed at the file never
        // resolves and every stall link falls through to the 404 page.
        expect(redirects).toMatch(/^\/s\/\*\s+\/\s+200$/m);
        expect(redirects).not.toMatch(/\/index\.html\s+200/);
        // A bare /* rewrite would serve HTML for a missing hashed asset.
        expect(redirects).not.toMatch(/^\/\*\s/m);

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

describe('img-src-is-self-and-the-icon-host', () => {
    /**
     * Agreement across copies does not pin img-src: widening every copy
     * together stays green. ICON_HOST is the one extra image origin; the
     * page never fetches it. The host is pinned as a literal so a lockstep
     * change of the constant and every copy cannot stay green.
     */
    it('pins img-src to self plus ICON_HOST on every copy', () => {
        expect(ICON_HOST).toBe('https://icons.stall.cash');
        const expected = `'self' https://icons.stall.cash`;
        for (const [name, policy] of policyCopies()) {
            expect(directives(policy).get('img-src'), name).toBe(expected);
        }
    });

    it('refuses the upstream CDN and a data scheme', () => {
        expect(ICON_HOST).not.toMatch(/icons\.etokens\.cash/i);
        expect(ICON_HOST).not.toMatch(/^data:/i);
        for (const [name, policy] of policyCopies()) {
            expect(policy, name).not.toMatch(/icons\.etokens\.cash/i);
            expect(directives(policy).get('img-src'), name).not.toMatch(/data:/i);
        }
    });

    it('keeps ICON_HOST out of connect-src', () => {
        const iconHost = new URL(ICON_HOST).hostname;
        for (const [name, policy] of policyCopies()) {
            const connect = directives(policy).get('connect-src') ?? '';
            expect(sourceHostnames(connect).has(iconHost), name).toBe(false);
        }
    });
});

describe('referrer-policy-agrees', () => {
    /**
     * public/_headers and deploy/stall-headers.conf already sent no-referrer.
     * vite server and preview did not. The value is pinned so lockstep drift
     * to origin cannot stay green.
     */
    it('sends no-referrer from preview, pages, and nginx', () => {
        const server = viteHeader('server', 'Referrer-Policy');
        const preview = viteHeader('preview', 'Referrer-Policy');
        const pages = referrerPolicyIn(read('public/_headers'));
        const nginx = referrerPolicyIn(read('deploy/stall-headers.conf'));
        expect(server).toBe('no-referrer');
        expect(preview).toBe(server);
        expect(pages).toBe(server);
        expect(nginx).toBe(server);
    });
});

describe('missing-asset-is-not-a-success', () => {
    /**
     * Without a 404 page at the build root, Cloudflare Pages treats every
     * unmatched path as single-page-application routing and answers with
     * index.html at HTTP 200 — including a missing hashed asset, which then
     * arrives as HTML claiming to be JavaScript. The `_redirects` rule is
     * scoped to `/s/*` precisely so that everything else can 404, and this
     * file is what lets it.
     *
     * Proven here by mechanism: that the page ships and cannot be blocked by
     * our own policy. That the host returns 404 with it is observable only on
     * a deployed origin.
     */
    it('ships a 404 page that the policy will not block', () => {
        const page = read('public', '404.html');
        expect(page).toContain('<!doctype html>');

        // style-src is 'self' with no 'unsafe-inline', so an inline block
        // would be refused and the page would render unstyled.
        expect(directives(CSP).get('style-src')).toBe("'self'");
        expect(page).not.toMatch(/<style[\s>]/i);
        expect(page).not.toMatch(/\sstyle\s*=/i);
        expect(page).not.toMatch(/<script/i);
        expect(page).toMatch(/<link rel="stylesheet" href="\/404\.css"/);
        read('public', '404.css');
    });

    it('rewrites nothing under the asset path', () => {
        // The bare-/* case is already refused by `answers a stall with the
        // document at 200`; repeating it here would be a second lock on the
        // same door. This is the other way back to the same defect: a rewrite
        // scoped to /assets/ puts the app behind exactly the path the 404 was
        // measured on.
        const rules = read('public', '_redirects')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line !== '' && !line.startsWith('#'));
        for (const rule of rules) {
            expect(rule.startsWith('/assets'), rule).toBe(false);
        }
        expect(rules.some((rule) => rule.startsWith('/s/* '))).toBe(true);
    });
});

describe('unhashed-path-is-not-cacheable', () => {
    /** `_headers` as a map of path pattern to the headers it sets. */
    function rules(): Map<string, Map<string, string>> {
        const out = new Map<string, Map<string, string>>();
        let current: Map<string, string> | undefined;
        for (const raw of read('public/_headers').split('\n')) {
            if (raw.trim() === '' || raw.trimStart().startsWith('#')) {
                continue;
            }
            if (!raw.startsWith(' ') && !raw.startsWith('\t')) {
                current = new Map();
                out.set(raw.trim(), current);
                continue;
            }
            const [name, ...rest] = raw.trim().split(':');
            current?.set(name!.trim().toLowerCase(), rest.join(':').trim());
        }
        return out;
    }

    /**
     * Pages merges every rule whose path matches instead of letting the most
     * specific win, so a Cache-Control on `/*` reaches `/assets/*` too and
     * no-store beats immutable. That shipped: hashed assets were served
     * `no-store, public, max-age=31536000, immutable` and never cached.
     */
    it('keeps Cache-Control off the catch-all so it cannot merge into assets', () => {
        expect(rules().get('/*')?.has('cache-control')).toBe(false);

        const assets = rules().get('/assets/*');
        expect(assets?.get('cache-control')).toContain('immutable');
        expect(assets?.get('cache-control')).not.toContain('no-store');
    });

    /**
     * Declaring Cache-Control per path means a path nobody remembers to list
     * becomes cacheable in silence. These are the paths the document is
     * reachable at; the stall one is taken from `_redirects` rather than
     * repeated here, so adding a route without its header rule fails.
     */
    it('gives every document path an explicit no-store', () => {
        const declared = rules();
        const stallSource = read('public/_redirects')
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line !== '' && !line.startsWith('#'))
            .map((line) => line.split(/\s+/)[0]!);

        for (const path of ['/', '/404.css', '/404.html', ...stallSource]) {
            expect(declared.get(path)?.get('cache-control'), path).toBe('no-store');
        }
    });
});
