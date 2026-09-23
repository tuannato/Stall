import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, loadConfigFromFile, resolveConfig, type InlineConfig } from 'vite';
import { beforeAll, describe, expect, it } from 'vitest';
import { ICON_HOST } from '../src/domain/icons';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Structural, because `rollup` is not a dependency of this app to import types from. */
type Chunk = {
    type: 'chunk';
    fileName: string;
    isEntry: boolean;
    facadeModuleId: string | null;
    moduleIds: readonly string[];
    imports: readonly string[];
    dynamicImports: readonly string[];
    code: string;
    viteMetadata?: { importedCss: Set<string> };
};
type Asset = { type: 'asset'; fileName: string; source: string | Uint8Array; originalFileNames?: readonly string[] };
type Part = Chunk | Asset;

beforeAll(() => {
    // `vite.workshop.config.ts` refuses to build without a command named, the
    // way `scripts/workshop.mjs` names it.
    process.env['STALL_WORKSHOP_CMD'] = 'probe';
});

let workshopBuild: Promise<Part[]> | undefined;
/** The kit's build, once for the file. */
function workshopParts(): Promise<Part[]> {
    workshopBuild ??= parts({ configFile: join(ROOT, 'vite.workshop.config.ts') });
    return workshopBuild;
}

async function parts(inline: InlineConfig): Promise<Part[]> {
    const result = (await build({ root: ROOT, logLevel: 'silent', ...inline, build: { write: false } })) as unknown;
    const outputs = Array.isArray(result) ? result : [result];
    return outputs.flatMap((o) => (o as { output: Part[] }).output);
}

/** Every module the app's own entry (`index.html`) reaches, through every chunk it imports. */
function appClosure(output: readonly Part[]): Set<string> {
    const chunks = new Map(
        output.filter((p): p is Chunk => p.type === 'chunk').map((chunk) => [chunk.fileName, chunk]),
    );
    const entry = [...chunks.values()].find(
        (chunk) => chunk.isEntry && (chunk.facadeModuleId ?? '').endsWith('/index.html'),
    );
    expect(entry, 'the app entry was built').toBeDefined();
    const seen = new Set<string>();
    const modules = new Set<string>();
    const walk = (fileName: string): void => {
        if (seen.has(fileName)) return;
        seen.add(fileName);
        const chunk = chunks.get(fileName)!;
        for (const id of chunk.moduleIds) modules.add(id);
        for (const next of [...chunk.imports, ...chunk.dynamicImports]) walk(next);
    };
    walk(entry!.fileName);
    return modules;
}

/** Leaf paths where two plain config values differ; a function compares by name. */
function diffPaths(a: unknown, b: unknown, path = ''): string[] {
    if (typeof a === 'function' || typeof b === 'function') {
        return (a as { name?: string })?.name === (b as { name?: string })?.name ? [] : [path];
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return [path];
        return a.flatMap((item, i) => diffPaths(item, b[i], `${path}[${i}]`));
    }
    const plain = (v: unknown): v is Record<string, unknown> =>
        typeof v === 'object' && v !== null && !Array.isArray(v);
    if (plain(a) && plain(b)) {
        const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
        return [...keys].flatMap((key) => diffPaths(a[key], b[key], path === '' ? key : `${path}.${key}`));
    }
    return Object.is(a, b) ? [] : [path];
}

/**
 * The kit builds the app's own entry beside its pages, and that entry must be
 * the production app — no define, no alias, no plugin the kit added (the
 * seam approach (a) would have been, and a module set cannot see a
 * transform). So: the same modules reach `index.html` in both builds, none of
 * them under `layout/` or `workshop/`, and the two configs differ only where
 * the kit says they do — its inputs, its outDir and its preview server, whose
 * policy is production's minus the icon host.
 */
describe('the-workshop-build-serves-the-same-app', () => {
    it('reaches the same modules from index.html as the production build, none of them the kit’s', async () => {
        const [production, workshop] = await Promise.all([parts({}), workshopParts()]);
        const prod = appClosure(production);
        const kit = appClosure(workshop);
        expect(prod.size).toBeGreaterThan(50);
        expect([...kit].sort()).toEqual([...prod].sort());
        const strays = [...kit].filter((id) => /[/\\](layout|workshop)[/\\]/.test(id));
        expect(strays).toEqual([]);
        // And the kit's pages were built at all — a build that dropped them
        // would compare the app with itself.
        const entries = workshop.filter((p): p is Chunk => p.type === 'chunk' && p.isEntry);
        expect(entries.map((chunk) => chunk.facadeModuleId?.replace(ROOT, '')).sort()).toEqual(
            ['/index.html', '/layout/gallery.html', '/layout/probe-workshop.html'].sort(),
        );
    }, 180_000);

    /**
     * The kit's sheet lands where a shipped look's does — after `stall.css` —
     * on both kit pages. A build links an entry's stylesheets in the order it
     * imports their chunks, and the kit's sheet shares a chunk with the kit's
     * loaders: measured 2026-09-23, the workshop probe linked it AHEAD of the
     * app's sheets until its entry imported the renderer first
     * (`layout/probe-workshop.ts`). Found by reading the served page, so it
     * is pinned here, by chunk metadata rather than by file name.
     */
    it('links the kit’s sheet after the app’s sheets on both kit pages', async () => {
        const output = await workshopParts();
        const chunks = output.filter((p): p is Chunk => p.type === 'chunk');
        const cssOf = (suffix: string): string[] => {
            const owner = chunks.find((chunk) => chunk.moduleIds.some((id) => id.endsWith(suffix)));
            expect(owner, `a chunk carries ${suffix}`).toBeDefined();
            return [...(owner!.viteMetadata?.importedCss ?? [])];
        };
        const [appCss] = cssOf('/src/ui/stall.css');
        const [kitCss] = cssOf('/workshop/theme-workshop.css');
        expect(appCss).toBeDefined();
        expect(kitCss).toBeDefined();
        expect(kitCss).not.toBe(appCss);
        for (const page of ['layout/gallery.html', 'layout/probe-workshop.html']) {
            const html = output.find((p): p is Asset => p.type === 'asset' && p.fileName === page);
            expect(html, page).toBeDefined();
            const text = String(html!.source);
            const app = text.indexOf(`/${appCss}"`);
            const kit = text.indexOf(`/${kitCss}"`);
            expect(app, `${page} links the app's sheets`).toBeGreaterThan(-1);
            expect(kit, `${page} links the kit's sheet after them`).toBeGreaterThan(app);
        }
    }, 180_000);

    it('adds no define, alias or plugin, and differs only in inputs, outDir and preview', async () => {
        const env = { command: 'build' as const, mode: 'production' };
        const app = (await loadConfigFromFile(env, join(ROOT, 'vite.config.ts'), ROOT, 'silent'))!.config;
        const kit = (await loadConfigFromFile(env, join(ROOT, 'vite.workshop.config.ts'), ROOT, 'silent'))!.config;
        const allowed = new Set([
            'build.rollupOptions',
            'build.outDir',
            'preview.port',
            'preview.strictPort',
            'preview.headers.Content-Security-Policy',
        ]);
        const differ = diffPaths(app, kit);
        expect(differ.filter((path) => !allowed.has(path)), differ.join(', ')).toEqual([]);
        const appCsp = (app.preview?.headers as Record<string, string>)['Content-Security-Policy']!;
        const kitCsp = (kit.preview?.headers as Record<string, string>)['Content-Security-Policy']!;
        expect(appCsp).toContain(`img-src 'self' ${ICON_HOST}`);
        expect(kitCsp).toBe(
            appCsp.replace(` ${ICON_HOST}`, '').replace(/connect-src [^;]*/, "connect-src 'self'"),
        );
        expect(kitCsp).not.toContain(ICON_HOST);
        // Nothing but its own origin: no chronik host, no price feed.
        expect(kitCsp.match(/connect-src [^;]*/)?.[0]).toBe("connect-src 'self'");

        const [resolvedApp, resolvedKit] = await Promise.all([
            resolveConfig({ root: ROOT, configFile: join(ROOT, 'vite.config.ts'), logLevel: 'silent' }, 'build'),
            resolveConfig({ root: ROOT, configFile: join(ROOT, 'vite.workshop.config.ts'), logLevel: 'silent' }, 'build'),
        ]);
        expect(resolvedKit.define).toEqual(resolvedApp.define);
        expect(resolvedKit.resolve.alias).toEqual(resolvedApp.resolve.alias);
        expect(resolvedKit.plugins.map((p) => p.name)).toEqual(resolvedApp.plugins.map((p) => p.name));
    }, 60_000);
});

/**
 * `pnpm test:layout` measures Stall's three looks and must never load a
 * creator's: the ordinary probe entry reaches no module under `workshop/` and
 * none of the kit's loaders, and its output names no `t-workshop`.
 */
describe('the-ordinary-probe-loads-no-kit', () => {
    it('builds the ordinary probe with nothing of the kit in it', async () => {
        const output = await parts({ configFile: join(ROOT, 'vite.probe.config.ts') });
        const chunks = output.filter((p): p is Chunk => p.type === 'chunk');
        const probe = chunks.find((chunk) => (chunk.facadeModuleId ?? '').endsWith('/layout/probe.html'));
        expect(probe, 'the ordinary probe was built').toBeDefined();
        const ids = chunks.flatMap((chunk) => chunk.moduleIds);
        expect(ids.some((id) => id.endsWith('/layout/probe.ts'))).toBe(true);
        expect(ids.filter((id) => /[/\\]workshop[/\\]|workshopKit|workshopRegister/.test(id))).toEqual([]);
        for (const part of output) {
            const text =
                part.type === 'chunk'
                    ? part.code
                    : typeof part.source === 'string'
                      ? part.source
                      : Buffer.from(part.source).toString('utf8');
            expect(text.includes('t-workshop'), part.fileName).toBe(false);
        }
    }, 180_000);
});
