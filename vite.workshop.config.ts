import { defineConfig, mergeConfig, type UserConfig } from 'vite';
import appConfig, { CSP } from './vite.config';
import { ICON_HOST } from './src/domain/icons';

/**
 * The workshop kit's build: the app's own config, unchanged, plus three
 * entries — the app (`main`, so the showroom paints the real renderer over
 * the real sheets), the showroom (`layout/gallery.html`) and the workshop
 * probe (`layout/probe-workshop.html`).
 *
 * **The `main` entry stays the production app.** Nothing here adds a
 * `define`, an alias or a plugin: the kit hands its look to the harness as
 * an object (`layout/looks.ts`), and the only differences from the app's
 * config are the inputs, the outDir and the preview server
 * (`the-workshop-build-serves-the-same-app`).
 *
 * **Each command its own outDir**, because Vite empties an outDir on every
 * build: `pnpm workshop:shots` building into the directory `pnpm workshop` is
 * serving would pull the showroom's assets out from under it. The command is
 * named by `scripts/workshop.mjs` in `STALL_WORKSHOP_CMD`, and a build with no
 * command named is refused rather than guessed.
 *
 * **Off the network.** The preview's policy is the production CSP with the
 * icon host taken out of `img-src` and `connect-src` narrowed to `'self'`: the showroom paints token icons as
 * letters and never asks the owner's Worker (a creator's address never
 * reaches its logs), and a remote `url()` in a creator's sheet cannot load.
 * The headless Chrome that takes the shots and runs the probe is off the
 * network as well (`--host-resolver-rules`).
 */
export const WORKSHOP_COMMANDS = {
    serve: { outDir: '.workshop-dist/serve', port: 4331 },
    shots: { outDir: '.workshop-dist/shots', port: 4332 },
    probe: { outDir: '.workshop-dist/probe', port: 4333 },
} as const;
export type WorkshopCommand = keyof typeof WORKSHOP_COMMANDS;

const withoutIconHost = CSP.replace(` ${ICON_HOST}`, '');
if (withoutIconHost === CSP) {
    // The policy moved: failing the build is the point, or the showroom would
    // quietly ask the icon Worker again.
    throw new Error(`vite.workshop.config.ts: ${ICON_HOST} is no longer in the CSP's img-src; update this file.`);
}
const CONNECT = /connect-src [^;]*/;
if (!CONNECT.test(withoutIconHost)) {
    throw new Error('vite.workshop.config.ts: the CSP carries no connect-src to narrow; update this file.');
}
/**
 * The production policy with the icon host removed from `img-src` and
 * `connect-src` narrowed to `'self'`, and nothing else changed: the showroom
 * paints fixtures and asks no index and no price feed, and the same server
 * also serves the app at `/`, which then reaches no chronik host either — so
 * "the kit reaches nothing" holds for every page it serves.
 */
export const WORKSHOP_CSP = withoutIconHost.replace(CONNECT, "connect-src 'self'");

export function workshopConfig(command: WorkshopCommand): UserConfig {
    const { outDir, port } = WORKSHOP_COMMANDS[command];
    return mergeConfig(appConfig, {
        build: {
            rollupOptions: {
                input: {
                    main: 'index.html',
                    gallery: 'layout/gallery.html',
                    probeWorkshop: 'layout/probe-workshop.html',
                },
            },
            outDir,
        },
        preview: {
            port,
            strictPort: true,
            headers: { 'Content-Security-Policy': WORKSHOP_CSP },
        },
    });
}

function commandFromEnv(): WorkshopCommand {
    const named = process.env['STALL_WORKSHOP_CMD'];
    if (named === undefined || !(named in WORKSHOP_COMMANDS)) {
        throw new Error(
            'vite.workshop.config.ts is run by scripts/workshop.mjs, which names the command in ' +
                `STALL_WORKSHOP_CMD (${Object.keys(WORKSHOP_COMMANDS).join(', ')}); got ${named ?? 'nothing'}.`,
        );
    }
    return named as WorkshopCommand;
}

export default defineConfig(() => workshopConfig(commandFromEnv()));
