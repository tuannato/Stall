import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type * as PrivateLooksModule from 'virtual:stall-private-looks';
import {
    SHIPPED_ATTACHMENTS,
    attachmentByTokenId,
    attachmentsForTheme,
    mintedAttachmentTokens,
    publishableFlags,
    wornAttachments,
} from './attachments';
import type { PrivateLookSource } from './lookData';
import {
    LOOK_ATTACHMENTS,
    LOOK_ROWS,
    attachmentsForLook,
    decodeLook,
    lookAttachmentByTokenId,
    mintedLookTokens,
    publishableLookFlags,
    wornForLook,
} from './lookTable';
import { SHIPPED_THEMES, decodeTheme } from './theme';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'src');

function walk(dir: string, keep: (path: string) => boolean): string[] {
    const out: string[] = [];
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            out.push(...walk(path, keep));
        } else if (keep(path)) {
            out.push(path);
        }
    }
    return out;
}

/**
 * The file with its comments removed, as `directory-walls` reads it: a
 * sentence explaining why a module reads the merged view is not a read of
 * the public one.
 */
function code(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

/** Every app source file: non-test TypeScript under `src/`, declarations included. */
function appFiles(): Map<string, string> {
    const files = walk(SRC, (path) => path.endsWith('.ts') && !path.endsWith('.test.ts'));
    return new Map(files.map((path) => [relative(SRC, path).replaceAll('\\', '/'), code(readFileSync(path, 'utf8'))]));
}

/**
 * The public table's names that answer by id or list the catalogue — the
 * names a site uses to turn a record into a look. The readers that take a
 * worn set rather than an id (`wornFrom`, `withMood`, `attachmentClasses`,
 * `attachmentNodesWanted`) consult no catalogue and are not here.
 */
const PUBLIC_TABLE_NAMES = [
    'decodeTheme',
    'SHIPPED_THEMES',
    'isShippedThemeId',
    'SHIPPED_ATTACHMENTS',
    'attachmentsForTheme',
    'wornAttachments',
    'publishableFlags',
    'mintedAttachmentTokens',
    'attachmentByTokenId',
] as const;

/** A namespace import of a module that holds the public table reaches every name above without naming it. */
const NAMESPACE_IMPORT = /\bimport\s+(?:type\s+)?\*\s+as\s+\w+\s+from\s+['"][^'"]*\/(?:theme|attachments|domain)['"]/;

/** What a file names that it may not, read the way the test reads every app file. */
function offencesIn(text: string): string[] {
    const out: string[] = PUBLIC_TABLE_NAMES.filter((name) => new RegExp(`\\b${name}\\b`).test(text));
    if (NAMESPACE_IMPORT.test(text)) {
        out.push('a namespace import of the public table');
    }
    return out;
}

/**
 * The files that may name the public table, each for its own reason.
 */
const MAY_NAME_THE_PUBLIC_TABLE: ReadonlyMap<string, string> = new Map([
    ['domain/theme.ts', 'defines the shipped looks'],
    ['domain/attachments.ts', 'defines the shipped decorations'],
    ['domain/lookTable.ts', 'the one merge point'],
    [
        'domain/lookData.ts',
        "a look's base is a shipped row by definition, and its classes are held against the shipped decorations",
    ],
]);

/**
 * Step 8's join (the plan's §2.2; the kit's P1 shape): every app site that
 * turns a record's id into a look, lists the looks a seller can choose, or
 * reads a decoration row out of the catalogue reads the merged view in
 * `lookTable.ts`. A site left on the public table would paint the default
 * look, and no decoration, under a private look's id — with nothing on
 * screen to say the look was not its own. So no app file but the ones that
 * define the public table, the merge point and the look data validator
 * names the public names, nor imports one of their modules whole.
 *
 * Tests are not app sites and keep the public names: they pin the three
 * shipped looks. The harness has its own fence
 * (`the-harness-chooses-looks-in-one-place`). Proved red by planting
 * `decodeTheme(` back in `render.ts`'s `paintedTheme`.
 */
describe('no-app-site-decodes-against-the-shipped-table-alone', () => {
    it('no app file but the table, the merge point and the validator names the public table', () => {
        const files = appFiles();
        const offences: string[] = [];
        for (const [rel, text] of files) {
            if (MAY_NAME_THE_PUBLIC_TABLE.has(rel)) {
                continue;
            }
            for (const offence of offencesIn(text)) {
                offences.push(`${rel}: ${offence}`);
            }
        }
        expect(offences, offences.join('\n')).toEqual([]);
    });

    it('walked the sites that decode, and they read the merged view', () => {
        // A walk that missed the files that used to decode would pass over
        // nothing: each one is read, and each names its merged view.
        const files = appFiles();
        const sites: ReadonlyArray<readonly [string, RegExp]> = [
            ['app.ts', /\bwornForLook\(/],
            ['app.ts', /\bmintedLookTokens\(/],
            ['ui/render.ts', /\bdecodeLook\(/],
            ['ui/render.ts', /\bLOOK_ROWS\b/],
            ['ui/render.ts', /\bLOOK_ATTACHMENTS\b/],
            ['ui/render.ts', /\battachmentsForLook\(/],
            ['ui/render.ts', /\bpublishableLookFlags\(/],
            ['ui/render.ts', /\bwornForLook\(/],
            ['domain/manifest.ts', /\bdecodeLook\(/],
            ['domain/category.ts', /\blookAttachmentByTokenId\(/],
            ['domain/category.ts', /\bLOOK_ROWS\b/],
        ];
        for (const [rel, uses] of sites) {
            expect(files.get(rel), `${rel} was not walked`).toBeDefined();
            expect(files.get(rel)!, `${rel} reads ${uses.source}`).toMatch(uses);
        }
        for (const rel of MAY_NAME_THE_PUBLIC_TABLE.keys()) {
            expect(files.has(rel), `${rel} is on the list and not in the tree`).toBe(true);
        }
    });

    it('sees a public name in code and not in a comment', () => {
        expect(offencesIn(code('const theme = decodeTheme(id);'))).toEqual(['decodeTheme']);
        expect(offencesIn(code('for (const row of SHIPPED_THEMES) {}'))).toEqual(['SHIPPED_THEMES']);
        expect(offencesIn(code("import { wornAttachments as worn } from '../domain/attachments';"))).toEqual([
            'wornAttachments',
        ]);
        expect(offencesIn(code("import * as theme from '../domain/theme';"))).toEqual([
            'a namespace import of the public table',
        ]);
        expect(offencesIn(code("import * as everything from './domain';"))).toEqual([
            'a namespace import of the public table',
        ]);
        expect(offencesIn(code('/** `decodeTheme` turns the id into a row. */\nconst t = decodeLook(id);'))).toEqual([]);
        // A longer name that only contains a public one is another name.
        expect(offencesIn(code('const x = SHIPPED_THEMES_BY_LABEL;'))).toEqual([]);
    });
});

/**
 * Step 8b1 is behaviour-neutral: no build includes a private look until the
 * plugin lands (8b2), so the merge of the public table with nothing IS the
 * public table, and each merged view is its public counterpart re-exported
 * under the merged name — the same function, the same array. That is what
 * keeps every decode answering exactly what it answered before the sites
 * moved, and the served bundle the bytes it was. 8b2 replaces this test
 * with the merge's own: the views then answer a private look's id too.
 */
describe('the-merged-views-are-the-public-table-while-no-private-look-is-included', () => {
    it('re-exports each public name under its merged name', () => {
        expect(decodeLook).toBe(decodeTheme);
        expect(LOOK_ROWS).toBe(SHIPPED_THEMES);
        expect(LOOK_ATTACHMENTS).toBe(SHIPPED_ATTACHMENTS);
        expect(attachmentsForLook).toBe(attachmentsForTheme);
        expect(wornForLook).toBe(wornAttachments);
        expect(publishableLookFlags).toBe(publishableFlags);
        expect(mintedLookTokens).toBe(mintedAttachmentTokens);
        expect(lookAttachmentByTokenId).toBe(attachmentByTokenId);
    });

    it('answers every one-byte id as the public table does, the reserved private ids included', () => {
        for (let id = 0; id <= 0xff; id += 1) {
            expect(decodeLook(id)).toEqual(decodeTheme(id));
            expect(attachmentsForLook(id)).toEqual(attachmentsForTheme(id));
        }
    });
});

const VIRTUAL_MODULE = 'virtual:stall-private-looks';

/** An import of the virtual module in any form: `from '…'`, a bare `import '…'`, or `import('…')`. */
const IMPORTS_THE_VIRTUAL_MODULE = new RegExp(`(?:\\bfrom\\s*|\\bimport\\s*\\(?\\s*)['"]${VIRTUAL_MODULE}['"]`);

/**
 * The step-8 critic's item 15: `lookTable.ts` is the one module that may
 * import `virtual:stall-private-looks`, so whatever the build hands the app
 * reaches it through the table's runtime validation and nowhere else. Today
 * nothing imports it — the plugin that answers it is 8b2's — and this holds
 * the road shut until then; 8b2's import from `lookTable.ts` is the one this
 * lets through. Walked over every non-test source the app, the edge, the
 * harness and the kit compile; a test may mock the module (8b2's design for
 * an app-level private-look test). Proved red by planting an import of it in
 * `render.ts`.
 */
describe('the-private-looks-module-is-the-look-tables-alone', () => {
    it('is imported by no source but the look table', () => {
        const sources = ['src', 'functions', 'layout', 'workshop'].flatMap((dir) =>
            walk(join(ROOT, dir), (path) => /\.(?:ts|mts|mjs|js)$/.test(path) && !/\.test\.(?:ts|mjs)$/.test(path)),
        );
        expect(sources.map((path) => relative(ROOT, path).replaceAll('\\', '/'))).toContain('src/ui/render.ts');
        const importers = sources
            .map((path) => relative(ROOT, path).replaceAll('\\', '/'))
            .filter((rel) => rel !== 'src/domain/lookTable.ts')
            .filter((rel) => IMPORTS_THE_VIRTUAL_MODULE.test(code(readFileSync(join(ROOT, rel), 'utf8'))));
        expect(importers).toEqual([]);
    });

    it('sees every import form, and not the declaration', () => {
        for (const road of [
            `import { privateLooks } from '${VIRTUAL_MODULE}';`,
            `import "${VIRTUAL_MODULE}";`,
            `const m = await import('${VIRTUAL_MODULE}');`,
            `export { privateLooks } from '${VIRTUAL_MODULE}';`,
        ]) {
            expect(road).toMatch(IMPORTS_THE_VIRTUAL_MODULE);
        }
        expect(`declare module '${VIRTUAL_MODULE}' {}`).not.toMatch(IMPORTS_THE_VIRTUAL_MODULE);
    });
});

/**
 * `src/private-looks.d.ts` declares what the plugin will resolve the module
 * to. `skipLibCheck` leaves a declaration file unread by `tsc` on its own, so
 * this type-only import is what makes `pnpm build` read it: a declaration
 * that drifted from the type the table reads fails the build here. Erased by
 * the test runner, so nothing resolves the module at run time. Proved red by
 * declaring `privateLooks` as `readonly string[]`.
 */
describe('the-private-looks-module-declares-what-the-table-reads', () => {
    it('exports one list of private look sources', () => {
        expectTypeOf<typeof PrivateLooksModule.privateLooks>().toEqualTypeOf<readonly PrivateLookSource[]>();
    });
});
