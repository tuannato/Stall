import { mergeConfig } from 'vite';
import appConfig, { forHarness } from './vite.config';

/**
 * The layout probe's build: the app's own config, unchanged, plus
 * `layout/probe.html` as a second entry, written to `.probe-dist`.
 *
 * `scripts/layout-check.mjs` and `scripts/print-measure.mjs` used to patch that
 * entry into `vite.config.ts` for the length of a run and write it back after,
 * so a killed run left the app's config patched, a `pnpm test` beside it built
 * the probe into the bundles it measures, and the run overwrote `dist/`. Both
 * build and preview from this file now (`--config vite.probe.config.ts`) and
 * only read the app's config, failing if it changed while they ran.
 *
 * `mergeConfig` keeps everything else the app's config says — the two plugins,
 * the build options, and the preview headers, so the probe is still measured
 * under the production CSP and referrer policy. Its own `outDir`, because Vite
 * empties an outDir on every build and `dist/` is the app's.
 *
 * And its private-look plugin made for a harness build (`forHarness`, 8e2):
 * under a selection this build carries the selected looks exactly as a
 * deploy build would, and the dist check the build runs over `.probe-dist`
 * reads the step-6 fixture look's sheet and art as the harness's own rather
 * than a private look's strays.
 */
export default mergeConfig(forHarness(appConfig), {
    build: {
        rollupOptions: { input: { main: 'index.html', layoutProbe: 'layout/probe.html' } },
        outDir: '.probe-dist',
    },
});
