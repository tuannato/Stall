import { defineConfig } from 'vitest/config';
import { CHRONIK_HOSTS } from './src/net/hosts';

/**
 * HTTP header only — <meta> would drop frame-ancestors.
 *
 * Derived from CHRONIK_HOSTS so a fourth node cannot be added to the app while
 * the policy silently blocks it: the failover proxy treats a CSP refusal as an
 * unreachable host and moves on, so the drift would cost a node without ever
 * failing loudly.
 *
 * object-src, frame-src and worker-src are stated rather than left to
 * default-src: worker-src does not fall back to default-src at all (it falls
 * back through child-src to script-src, which carries 'wasm-unsafe-eval').
 */
export const CSP = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "worker-src 'none'",
    // Both schemes, from the one constant. chronik-client turns each https
    // host into wss://<host>/ws for its subscription socket, and CSP does not
    // infer one from the other — a missing wss:// is a silent dead socket.
    `connect-src 'self' ${CHRONIK_HOSTS.join(' ')} ${CHRONIK_HOSTS.map((h) => h.replace('https://', 'wss://')).join(' ')}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join('; ');

/**
 * Dev only, and never deployed. Vite's dev server injects styles as inline
 * <style> and runs an optimizer worker from a blob: URL, both of which the
 * real policy blocks — without this the dev page renders with no CSS at all,
 * which is a very convincing way to verify the wrong thing.
 *
 * `preview` deliberately keeps the strict policy: it serves the built output,
 * so it is the honest rehearsal for production.
 */
const DEV_CSP = CSP.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
    .replace("worker-src 'none'", "worker-src 'self' blob:");

export default defineConfig({
    appType: 'spa',
    build: {
        // The polyfill is emitted as an inline <script>, which this policy has
        // no 'unsafe-inline' and no hash for. Disabling it keeps the built
        // document free of inline script instead of growing a hash ritual.
        modulePreload: { polyfill: false },
    },
    server: {
        headers: { 'Content-Security-Policy': DEV_CSP },
    },
    preview: {
        headers: { 'Content-Security-Policy': CSP },
    },
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node',
        reporters: ['default'],
    },
});
