import { defineConfig } from 'vitest/config';

/** HTTP header only — <meta> would drop frame-ancestors. */
const CSP = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self'",
    "img-src 'self' data:",
    "connect-src 'self' https://chronik-native1.fabien.cash https://chronik-native2.fabien.cash https://chronik-native3.fabien.cash",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join('; ');

export default defineConfig({
    appType: 'spa',
    server: {
        headers: { 'Content-Security-Policy': CSP },
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
