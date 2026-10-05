import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..');
const SRC = join(ROOT, 'src');

function walk(dir: string): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
            out.push(...walk(p));
        } else if (p.endsWith('.ts') || p.endsWith('.css')) {
            out.push(p);
        }
    }
    return out;
}

/**
 * The file with its comments removed.
 *
 * This wall is a text scan, and it cannot tell prose from code. Twice now a
 * comment explaining *why* a module never touches the DOM has tripped the rule
 * against touching the DOM — which pushes an author towards writing a worse
 * comment to appease a grep, and a rule that punishes explaining itself is
 * worse than no rule.
 *
 * Stripping comments makes the scan strictly more accurate, not weaker: a
 * comment cannot call `document`, import chronik, or read `localStorage`. Only
 * code can, and only code is what is left.
 */
export function stripForTest(source: string): string {
    return strip(source);
}

function strip(source: string): string {
    return (
        source
            // Block comments, which is where the long explanations live.
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Line comments only when they are the whole line. Telling a
            // trailing `//` from one inside a string needs a real tokeniser,
            // and a guard is not worth one — a trailing comment that trips the
            // scan can be written as a block comment instead.
            .replace(/^[ \t]*\/\/.*$/gm, '')
    );
}

function read(p: string): string {
    return strip(readFileSync(p, 'utf8'));
}

/**
 * An import (`from '…'`, a bare `import '…'`, a CSS `@import` or `url()`)
 * whose path climbs out into `layout/` or `workshop/`.
 */
const LAYOUT_OR_WORKSHOP =
    /(?:from\s*|import\s*|@import\s*|url\(\s*)['"]?(?:\.\.\/)+(?:layout|workshop)\//;

/** Every specifier a source names: `from '…'`, a bare `import '…'`, and `import('…')` with a literal. */
function specifiersOf(text: string): string[] {
    return [...text.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"]([^'"]+)['"]/g)].map((m) => m[1]!);
}

/**
 * The `.ts` file a relative specifier names, as the bundlers this repo uses
 * resolve it: as written, `.js` read as `.ts`, the `.ts` suffix added, or a
 * directory's `index.ts`. Undefined when none is on disk.
 */
function resolveRelative(from: string, spec: string): string | undefined {
    const base = resolve(dirname(from), spec);
    for (const candidate of [base, base.replace(/\.js$/, '.ts'), `${base}.ts`, join(base, 'index.ts')]) {
        if (candidate.endsWith('.ts') && existsSync(candidate) && statSync(candidate).isFile()) {
            return candidate;
        }
    }
    return undefined;
}

/** A package or virtual module the edge may not reach at any depth. */
const EDGE_REFUSED_BARE = /^(?:virtual:|ecash-lib(?:\/|$)|ecash-wallet(?:\/|$)|ecash-agora(?:\/|$)|chronik-client(?:\/|$))/;

/**
 * Every module the edge's sources reach, followed through relative imports to
 * the end, and every rule broken anywhere on the way: a file of the ui, the
 * harness or the kit; the look table or the look data validator (step 8: a
 * private look's data reaches the app through `lookTable.ts` alone, and the
 * edge's one look fact is `ogImageFor`, a literal of the shipped cards); a
 * `virtual:` module, which no edge compile can answer; the `ecash-lib`
 * barrel and its wasm, which `resolve.ts` exists to avoid, and the other
 * packages the edge never carries; a `document`; and a relative import that
 * resolves to nothing. `textOf` reads a file, so a test can plant one.
 */
function edgeClosure(roots: readonly string[], textOf: (file: string) => string): { files: string[]; faults: string[] } {
    const seen = new Set<string>();
    const faults: string[] = [];
    const queue = [...roots];
    while (queue.length > 0) {
        const file = queue.shift()!;
        if (seen.has(file)) {
            continue;
        }
        seen.add(file);
        const rel = relative(ROOT, file).replaceAll('\\', '/');
        const text = strip(textOf(file));
        if (/^src\/ui\//.test(rel)) {
            faults.push(`${rel}: the ui`);
        }
        if (/^(?:layout|workshop)\//.test(rel)) {
            faults.push(`${rel}: the harness or the kit`);
        }
        if (/^src\/domain\/look(?:Table|Data)\.ts$/.test(rel)) {
            faults.push(`${rel}: a private look's road`);
        }
        if (/\bdocument\b/.test(text)) {
            faults.push(`${rel}: touches document`);
        }
        for (const spec of specifiersOf(text)) {
            if (spec.startsWith('.')) {
                const target = resolveRelative(file, spec);
                if (target === undefined) {
                    faults.push(`${rel}: ${spec} resolves to no .ts file`);
                } else {
                    queue.push(target);
                }
            } else if (EDGE_REFUSED_BARE.test(spec)) {
                faults.push(`${rel}: imports ${spec}`);
            }
        }
    }
    return { files: [...seen].map((file) => relative(ROOT, file).replaceAll('\\', '/')).sort(), faults };
}

/** The edge's own sources: every `.ts` under `functions/`. */
function edgeRoots(): string[] {
    return walk(join(ROOT, 'functions')).filter((file) => file.endsWith('.ts'));
}

describe('directory-walls', () => {
    it('keeps domain pure, net off document, ui off chronik, the harness out, and keys empty', () => {
        const files = walk(SRC);
        for (const file of files) {
            const rel = relative(SRC, file).replaceAll('\\', '/');
            const text = read(file);
            if (rel.startsWith('domain/')) {
                expect(text, rel).not.toMatch(/\bdocument\b/);
                expect(text, rel).not.toMatch(/\bfetch\s*\(/);
                expect(text, rel).not.toMatch(/from ['"]chronik-client['"]/);
                expect(text, rel).not.toMatch(/from ['"]ecash-agora['"]/);
            }
            if (rel.startsWith('net/')) {
                expect(text, rel).not.toMatch(/\bdocument\b/);
                expect(text, rel).not.toMatch(/localStorage/);
            }
            if (rel.startsWith('ui/')) {
                expect(text, rel).not.toMatch(/from ['"]chronik-client['"]/);
                expect(text, rel).not.toMatch(/from ['"]ecash-agora['"]/);
            }
            expect(text, rel).not.toMatch(/from ['"]ecash-wallet['"]/);
            // The layout harness and the workshop kit are dev-only, built by
            // their own configs; nothing the app serves may reach them. Tests
            // are not served, and may read the harness (`gallery-is-not-served`
            // names the kit's skeleton label).
            if (!rel.endsWith('.test.ts')) {
                expect(text, rel).not.toMatch(LAYOUT_OR_WORKSHOP);
            }
        }
        const keys = readdirSync(join(SRC, 'keys'));
        expect(keys).toEqual(['.gitkeep']);
    });

    it('keeps the edge functions off the DOM, off the wasm barrel and off the ui', () => {
        // `functions/lib/resolve.ts` exists to avoid the `ecash-lib` barrel
        // (its wasm hasher), and nothing at the edge has a document. A wall
        // that walked `src/` alone never saw this directory.
        const files = walk(join(ROOT, 'functions'));
        expect(files.length, 'the edge directory was walked').toBeGreaterThan(0);
        for (const file of files) {
            const rel = relative(ROOT, file).replaceAll('\\', '/');
            const text = read(file);
            expect(text, rel).not.toMatch(/\bdocument\b/);
            expect(text, rel).not.toMatch(/from ['"]ecash-lib['"]/);
            expect(text, rel).not.toMatch(/from ['"]chronik-client['"]/);
            expect(text, rel).not.toMatch(/src\/ui\//);
            expect(text, rel).not.toMatch(/from ['"]ecash-wallet['"]/);
            expect(text, rel).not.toMatch(LAYOUT_OR_WORKSHOP);
        }
    });

    /**
     * The same rules at every depth (the 8b1 critic's item 3): one hop let
     * an edge import of `manifest.ts` through, whose closure holds the look
     * table and the `ecash-lib` barrel. Today the edge reaches
     * `src/domain/text.ts` and nothing private. Proved red in the next test
     * by planting that import, and by hand in `functions/lib/unfurl.ts`.
     */
    it('the-edge-closure-reaches-nothing-private-and-no-wasm-barrel', () => {
        const { files, faults } = edgeClosure(edgeRoots(), (file) => readFileSync(file, 'utf8'));
        expect(faults, faults.join('\n')).toEqual([]);
        // The walk left the edge's own directory, or it proved nothing.
        expect(files).toContain('functions/lib/unfurl.ts');
        expect(files).toContain('src/domain/text.ts');
    });
});

describe('directory-walls-still-sees-code', () => {
    /**
     * Stripping comments must not blind the scan. Proved on strings shaped like
     * the real thing rather than by editing a source file: a guard that is only
     * ever exercised by the code that happens to be there is a guard nobody has
     * seen fail.
     */
    it('strips prose and keeps the statements', () => {
        const stripped = stripForTest(
            [
                '/** This module never touches the document. */',
                "        // It does not import from 'chronik-client' either.",
                "import { thing } from 'chronik-client';",
                'const el = document.body;',
                'const url = "https://example.com/a//b";',
            ].join('\n'),
        );
        // The prose is gone.
        expect(stripped).not.toContain('never touches');
        expect(stripped).not.toContain('does not import');
        // The code is not.
        expect(stripped).toMatch(/from ['"]chronik-client['"]/);
        expect(stripped).toMatch(/\bdocument\b/);
        // A `//` inside a string is not a comment.
        expect(stripped).toContain('https://example.com/a//b');
    });

    it('sees every road from the app into the harness', () => {
        for (const road of [
            "import { SCREENS } from '../../layout/fixtures';",
            "import '../workshop/theme-workshop.css';",
            "import raw from '../../workshop/look.json?raw';",
            "@import '../../workshop/theme-workshop.css';",
            "background: url('../../workshop/art/kite.svg');",
        ]) {
            expect(road).toMatch(LAYOUT_OR_WORKSHOP);
        }
        // A directory of the same name inside `src/` is not the harness.
        expect("import { x } from './layout/grid';").not.toMatch(LAYOUT_OR_WORKSHOP);
    });

    it('follows the edge through a module that reaches the look table', () => {
        // The plant: one import of `manifest.ts` in the unfurl, the shape a
        // later edit to the edge's own record decoder could take.
        const unfurl = join(ROOT, 'functions', 'lib', 'unfurl.ts');
        const planted = (file: string): string =>
            readFileSync(file, 'utf8') +
            (file === unfurl ? "\nimport { decodeManifestPushes } from '../../src/domain/manifest';\n" : '');
        const { files, faults } = edgeClosure(edgeRoots(), planted);
        expect(files).toContain('src/domain/manifest.ts');
        expect(faults).toContain("src/domain/lookTable.ts: a private look's road");
        expect(faults).toContain('src/domain/manifest.ts: imports ecash-lib');
    });

    it('resolves the specifiers a bundler resolves, and refuses one it cannot', () => {
        const from = join(ROOT, 'functions', 'lib', 'unfurl.ts');
        const lookTable = join(SRC, 'domain', 'lookTable.ts');
        expect(resolveRelative(from, '../../src/domain/lookTable')).toBe(lookTable);
        expect(resolveRelative(from, '../../src/domain/lookTable.js')).toBe(lookTable);
        expect(resolveRelative(from, '../../src/domain/lookTable.ts')).toBe(lookTable);
        expect(resolveRelative(from, '../../worker-icons/src')).toBe(join(ROOT, 'worker-icons', 'src', 'index.ts'));
        expect(resolveRelative(from, './nowhere')).toBeUndefined();
        expect(specifiersOf("import { a } from 'virtual:stall-private-looks';\nconst m = await import('./x.js');\nimport './y';")).toEqual([
            'virtual:stall-private-looks',
            './x.js',
            './y',
        ]);
        const { faults } = edgeClosure([from], (file) =>
            file === from ? "import { x } from './nowhere';\nimport 'virtual:stall-private-looks';" : '',
        );
        expect(faults).toEqual([
            'functions/lib/unfurl.ts: ./nowhere resolves to no .ts file',
            'functions/lib/unfurl.ts: imports virtual:stall-private-looks',
        ]);
    });
});
