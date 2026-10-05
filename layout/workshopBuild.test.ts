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
     * The kit loads its sheet the worn-only way (8d1; STEP-6-PLAN v2 item
     * 6.8): its own built file — in no kit page's entry CSS and linked by
     * neither page's HTML — put on the page by the app's loader
     * (`src/ui/lookSheets.ts`, through `layout/workshopKitSheet.ts`), the
     * road a private look's sheet takes in the app. The loader appends it
     * after every sheet the page already links, so it lands after the app's
     * sheets by construction, where it once depended on the order a page
     * imported its chunks (measured 2026-09-23: importing the register first
     * linked it ahead of `stall.css`); that the loader's link lands last is
     * measured in Chrome by the probe's
     * `a-worn-only-sheet-loads-under-the-production-policy`.
     */
    it('builds the kit’s sheet as its own file, which both kit pages load through the app’s loader', async () => {
        const output = await workshopParts();
        const sheets = output.filter(
            (p): p is Asset =>
                p.type === 'asset' &&
                (p.originalFileNames ?? []).some((name) => name.replaceAll('\\', '/').endsWith('/workshop/theme-workshop.css')),
        );
        expect(sheets.map((p) => p.fileName)).toEqual([expect.stringMatching(/^assets\/theme-workshop-[\w-]+\.css$/)]);
        const kitFile = sheets[0]!.fileName;
        expect(String(sheets[0]!.source)).toMatch(/--look-sheet:\s*t-workshop/);
        const chunks = output.filter((p): p is Chunk => p.type === 'chunk');
        for (const chunk of chunks) {
            expect([...(chunk.viteMetadata?.importedCss ?? [])], `${chunk.fileName}'s entry CSS`).not.toContain(kitFile);
            const css = [...(chunk.viteMetadata?.importedCss ?? [])].map(
                (name) => output.find((p): p is Asset => p.type === 'asset' && p.fileName === name)!,
            );
            for (const part of css) {
                expect(String(part.source), `${part.fileName} carries the kit's rules`).not.toMatch(/\.t-workshop\b/);
            }
        }
        const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
        for (const page of ['layout/gallery.html', 'layout/probe-workshop.html']) {
            const html = output.find((p): p is Asset => p.type === 'asset' && p.fileName === page);
            expect(html, page).toBeDefined();
            expect(String(html!.source), `${page} links the kit's sheet itself`).not.toContain(kitFile);
            // The page's own graph carries the app's loader and the kit's URL.
            const entry = chunks.find((chunk) => chunk.isEntry && (chunk.facadeModuleId ?? '').endsWith(`/${page}`));
            expect(entry, page).toBeDefined();
            const seen = new Set<string>();
            const reach = (name: string): Chunk[] => {
                if (seen.has(name)) return [];
                seen.add(name);
                const chunk = byName.get(name)!;
                return [chunk, ...chunk.imports.flatMap(reach)];
            };
            const graph = reach(entry!.fileName);
            const ids = graph.flatMap((chunk) => chunk.moduleIds);
            expect(ids.some((id) => id.endsWith('/src/ui/lookSheets.ts')), `${page} carries the app's loader`).toBe(true);
            expect(ids.some((id) => id.endsWith('/layout/workshopKitSheet.ts')), `${page} carries the kit's sheet URL`).toBe(true);
            expect(graph.some((chunk) => chunk.code.includes(kitFile)), `${page} names the kit's built sheet`).toBe(true);
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
