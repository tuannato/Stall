import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type * as PrivateLooksModule from 'virtual:stall-private-looks';
import {
    ATTACHMENT_BITS,
    SHIPPED_ATTACHMENTS,
    attachmentByTokenId,
    attachmentsForTheme,
    mintedAttachmentTokens,
    publishableFlags,
    wornAttachments,
    type ShippedAttachment,
} from './attachments';
import type { PrivateLookSource } from './lookData';
import * as table from './lookTable';
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
import { PRIVATE_LOOK_IDS, SHIPPED_THEMES, decodeTheme } from './theme';

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

/** Every app source file, by its path under `src/`: non-test TypeScript, declarations included. */
function appFiles(): Map<string, string> {
    const files = walk(SRC, (path) => path.endsWith('.ts') && !path.endsWith('.test.ts'));
    return new Map(files.map((path) => [relative(SRC, path).replaceAll('\\', '/'), code(readFileSync(path, 'utf8'))]));
}

/** One name an import takes, and whether it is a type (which reads nothing at run time). */
type Taken = { readonly name: string; readonly type: boolean };

/** What one import statement takes from one module. */
type ImportOf = {
    readonly spec: string;
    /** The names, or `*` for a namespace, a star re-export or a dynamic import: everything the module has. */
    readonly taken: readonly Taken[] | '*';
    /** The whole statement is type-only (`import type`, `export type`, or any import in a `.d.ts`). */
    readonly type: boolean;
};

/** `A`, `type A`, `A as B`, `default` — one entry of a brace list, by the name it takes. */
function takenFrom(list: string, statementType: boolean): Taken[] {
    return list
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== '')
        .map((entry) => {
            const type = statementType || /^type\s/.test(entry);
            const name = entry.replace(/^type\s+/, '').split(/\s+as\s+/)[0]!.trim();
            return { name, type };
        });
}

/**
 * Every import and re-export in `text`: static (`import … from`, `export … from`,
 * with or without `type`), and dynamic with a literal (`import('…')`). A
 * side-effect import (`import '…'`) takes no name and is not listed.
 */
function importsOf(text: string, declaration = false): ImportOf[] {
    const out: ImportOf[] = [];
    const STATIC =
        /\b(?:import|export)\s+(type\s+)?(\{[^}]*\}|\*\s*(?:as\s+\w+)?|\w+\s*,\s*\{[^}]*\}|\w+\s*,\s*\*\s*as\s+\w+|\w+)\s*from\s*['"]([^'"]+)['"]/g;
    for (const m of text.matchAll(STATIC)) {
        const type = declaration || m[1] !== undefined;
        const clause = m[2]!;
        const braces = /\{([^}]*)\}/.exec(clause);
        const star = clause.includes('*');
        const head = /^(\w+)\s*(?:,|$)/.exec(clause.trim());
        const taken: Taken[] | '*' = star
            ? '*'
            : [
                  ...(head !== null && clause.trim()[0] !== '{' ? [{ name: 'default', type }] : []),
                  ...(braces === null ? [] : takenFrom(braces[1]!, type)),
              ];
        out.push({ spec: m[3]!, taken, type });
    }
    for (const m of text.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
        out.push({ spec: m[1]!, taken: '*', type: declaration });
    }
    return out;
}

/** The module a relative specifier names, as its path under `src/` with no suffix (`domain/theme`). */
function moduleOf(fromRel: string, spec: string): string | undefined {
    if (!spec.startsWith('.')) {
        return undefined;
    }
    const base = resolve(SRC, dirname(fromRel), spec).replace(/\.(?:ts|js)$/, '');
    const rel = relative(SRC, base).replaceAll('\\', '/');
    // A directory names its index — a barrel, whether or not one is on disk.
    const directory = !existsSync(`${base}.ts`) && existsSync(base) && statSync(base).isDirectory();
    return directory ? `${rel}/index` : rel;
}

/**
 * What an app file may take from the public table's two modules, each name
 * with the reason it reads no catalogue. A name not here is refused until
 * somebody classifies it: a new export of `attachments.ts` that filters
 * `SHIPPED_ATTACHMENTS` (the next diff, when 8f adds slot helpers) is a
 * catalogue read under a name a blocklist never heard of.
 */
const MAY_TAKE: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map([
    [
        'domain/theme',
        new Map([
            ['DEFAULT_THEME', 'the look painted with no record: one row, never a lookup by id'],
            ['DEFAULT_THEME_ID', "the default look's id, a constant"],
            ['NEO_CITY_THEME_ID', "a shipped look's id, a constant (the door deck names the three public looks)"],
            ['RURAL_THEME_ID', "a shipped look's id, a constant (the door deck names the three public looks)"],
            ['FONT_STACKS', 'the shipped font stacks, a constant list'],
            ['THEME_ID_BYTES', "the theme push's width, a wire constant"],
            ['themeVars', "a row's custom properties, from the row it is handed"],
        ]),
    ],
    [
        'domain/attachments',
        new Map([
            ['ATTACHMENT_FLAGS_TAG', "the flags field's tag, a wire constant"],
            ['ATTACHMENT_BITS', 'how many rows a look may have, a wire constant'],
            ['decodeAttachmentFlags', "the flags field's codec: bytes to a number"],
            ['encodeAttachmentFlags', "the flags field's codec: a number to bytes"],
            ['attachmentClasses', 'reads the worn set it is handed, never the catalogue'],
            ['attachmentNodesWanted', 'reads the worn set it is handed, never the catalogue'],
            ['withMood', 'reads the row and the worn set it is handed, never the catalogue'],
        ]),
    ],
]);

/**
 * What `lookData.ts` may take besides: a look's base row is a shipped row by
 * definition, and its mood class is held against the shipped decorations.
 */
const LOOK_DATA_MAY_TAKE: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map([
    ['domain/theme', new Map([['decodeTheme', "a look's base row, which is a shipped row by definition"]])],
    [
        'domain/attachments',
        new Map([['SHIPPED_ATTACHMENTS', "the shipped decorations a look's mood class may not collide with"]]),
    ],
]);

/** The files that define the public table, and the one merge point: exempt whole. */
const DEFINE_OR_MERGE: ReadonlyMap<string, string> = new Map([
    ['domain/theme.ts', 'defines the shipped looks'],
    ['domain/attachments.ts', 'defines the shipped decorations'],
    ['domain/lookTable.ts', 'the one merge point'],
]);

/** Every name `rel`'s imports take that it may not, as sentences. */
function refusedIn(rel: string, text: string): string[] {
    const out: string[] = [];
    for (const imp of importsOf(text, rel.endsWith('.d.ts'))) {
        const module = moduleOf(rel, imp.spec);
        if (module === undefined) {
            continue;
        }
        if (module === 'domain/index') {
            out.push(`${rel}: imports the domain barrel (${imp.spec}), which takes the public table whole`);
            continue;
        }
        if (module === 'domain/lookData') {
            // The validator is the look table's to run; anywhere else a
            // runtime name of it is a road around the table.
            const runtime = imp.taken === '*' ? !imp.type : imp.taken.some((t) => !t.type);
            if (runtime && rel !== 'domain/lookTable.ts') {
                out.push(`${rel}: takes a runtime name from lookData.ts, which only the look table may run`);
            }
            continue;
        }
        const allowed = MAY_TAKE.get(module);
        if (allowed === undefined) {
            continue;
        }
        if (imp.taken === '*') {
            if (!imp.type) {
                out.push(`${rel}: takes ${imp.spec} whole (a namespace, a star or a dynamic import)`);
            }
            continue;
        }
        const extra = rel === 'domain/lookData.ts' ? LOOK_DATA_MAY_TAKE.get(module) : undefined;
        for (const taken of imp.taken) {
            if (!taken.type && !allowed.has(taken.name) && !extra?.has(taken.name)) {
                out.push(`${rel}: takes ${taken.name} from ${module}.ts`);
            }
        }
    }
    return out;
}

/**
 * Step 8's join (the plan's §2.2; the kit's P1 shape): a site that turns a
 * record's id into a look, lists the looks a seller can choose, or reads a
 * decoration row out of the catalogue must read the merged view in
 * `lookTable.ts`, or it paints the default look and no decoration under a
 * private look's id with nothing on screen to say so.
 *
 * **An allow-list, not a list of the names that read** (the 8b1 critic's
 * item 1): a nine-name blocklist let a fresh export of `attachments.ts`
 * that filters `SHIPPED_ATTACHMENTS` through, green and type-checked. So an
 * app file takes from `theme.ts` and `attachments.ts` only the names above,
 * each one a constant, a codec or a reader of what it is handed; types are
 * free, since a type reads nothing at run time. Not the barrel, nothing
 * whole, and nothing of `lookData.ts` at run time outside the table.
 * `lookData.ts` itself may take `decodeTheme` and `SHIPPED_ATTACHMENTS`
 * besides, and nothing else; the two defining modules and the merge point
 * are exempt. Tests are not app sites: they pin the three shipped looks. The
 * harness keeps its own fence (`the-harness-chooses-looks-in-one-place`)
 * until 8e2. Proved red by the critic's plant: `decorRowsFor(themeId)` in
 * `attachments.ts`, and `previewLook` rewritten to
 * `wornFrom(decorRowsFor(themeId), flags)`.
 */
describe('the-app-takes-from-the-public-table-only-what-reads-no-catalogue', () => {
    it('no app file takes a name from theme.ts or attachments.ts that the list does not give a reason for', () => {
        const files = appFiles();
        const refused: string[] = [];
        for (const [rel, text] of files) {
            if (!DEFINE_OR_MERGE.has(rel)) {
                refused.push(...refusedIn(rel, text));
            }
        }
        expect(refused, refused.join('\n')).toEqual([]);
        // The walk read the files that import the public table, and the exempt ones exist.
        for (const rel of ['app.ts', 'ui/render.ts', 'domain/manifest.ts', 'domain/lookData.ts']) {
            expect(files.has(rel), `${rel} was not walked`).toBe(true);
        }
        for (const rel of DEFINE_OR_MERGE.keys()) {
            expect(files.has(rel), `${rel} is exempt and not in the tree`).toBe(true);
        }
    });

    it('lists only names the public modules export', () => {
        // A stale entry is a name a later export could take without review.
        const exported = (rel: string): string => readFileSync(join(SRC, `${rel}.ts`), 'utf8');
        for (const [module, names] of [...MAY_TAKE, ...LOOK_DATA_MAY_TAKE]) {
            const text = exported(module);
            for (const name of names.keys()) {
                expect(text, `${module}.ts exports ${name}`).toMatch(
                    new RegExp(`export (?:const|function|class|type) ${name}\\b`),
                );
            }
        }
    });

    it('reads every import form, and refuses what the list does not name', () => {
        const at = 'ui/render.ts';
        expect(refusedIn(at, "import { attachmentClasses, withMood, type ShippedAttachment } from '../domain/attachments';")).toEqual([]);
        expect(refusedIn(at, "import {\n    decodeTheme,\n    themeVars,\n} from '../domain/theme';")).toEqual([
            'ui/render.ts: takes decodeTheme from domain/theme.ts',
        ]);
        expect(refusedIn(at, "import { wornFrom, decorRowsFor } from '../domain/attachments';")).toEqual([
            'ui/render.ts: takes wornFrom from domain/attachments.ts',
            'ui/render.ts: takes decorRowsFor from domain/attachments.ts',
        ]);
        expect(refusedIn(at, "import { SHIPPED_THEMES as LOOKS } from '../domain/theme.js';")).toEqual([
            'ui/render.ts: takes SHIPPED_THEMES from domain/theme.ts',
        ]);
        expect(refusedIn('domain/category.ts', "export { attachmentByTokenId } from './attachments';")).toEqual([
            'domain/category.ts: takes attachmentByTokenId from domain/attachments.ts',
        ]);
        expect(refusedIn(at, "import * as theme from '../domain/theme';")).toHaveLength(1);
        expect(refusedIn('domain/category.ts', "export * from './attachments';")).toHaveLength(1);
        expect(refusedIn(at, "const m = await import('../domain/attachments');")).toHaveLength(1);
        expect(refusedIn(at, "import { decodeTheme } from '../domain';")).toEqual([
            "ui/render.ts: imports the domain barrel (../domain), which takes the public table whole",
        ]);
        expect(refusedIn(at, "import { lookFromData } from '../domain/lookData';")).toHaveLength(1);
        // Types read nothing at run time; the validator's types are free too.
        expect(refusedIn(at, "import type { DecodedTheme } from '../domain/theme';")).toEqual([]);
        expect(refusedIn(at, "import type * as T from '../domain/theme';")).toEqual([]);
        expect(refusedIn(at, "import type { PrivateLookSource } from '../domain/lookData';")).toEqual([]);
        // A declaration file's imports are types by nature.
        expect(refusedIn('private-looks.d.ts', "export const x: import('./domain/lookData').PrivateLookSource;")).toEqual([]);
        // `lookData.ts` takes its two, and no third.
        expect(refusedIn('domain/lookData.ts', "import { decodeTheme, FONT_STACKS } from './theme';")).toEqual([]);
        expect(refusedIn('domain/lookData.ts', "import { SHIPPED_THEMES } from './theme';")).toHaveLength(1);
        // Another module's names are not this list's business.
        expect(refusedIn(at, "import { decodeLook } from '../domain/lookTable';")).toEqual([]);
        // A comment is not an import.
        expect(refusedIn(at, code("/** `import { decodeTheme } from '../domain/theme'` was the old road. */"))).toEqual([]);
    });
});

/**
 * Where the decodes are: every site that used to read the public table
 * reads its merged view. Paired with the allow-list above, which keeps the
 * public names out of every app file; this one says the walk saw the sites
 * the merge is for. 8b2's paid gate routes the `view.worn` sites through one
 * function (the step-8 critic's item 3), and this list moves with them.
 */
describe('no-app-site-decodes-against-the-shipped-table-alone', () => {
    it('walked the sites that decode, and they read the merged view', () => {
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
            ['domain/category.ts', /\bLOOK_ATTACHMENTS\b/],
        ];
        for (const [rel, uses] of sites) {
            expect(files.get(rel), `${rel} was not walked`).toBeDefined();
            expect(files.get(rel)!, `${rel} reads ${uses.source}`).toMatch(uses);
        }
    });
});

/** The documented merged views (`lookTable.ts`'s table), and nothing else. */
const MERGED_VIEWS = [
    'decodeLook',
    'LOOK_ROWS',
    'LOOK_ATTACHMENTS',
    'attachmentsForLook',
    'wornForLook',
    'publishableLookFlags',
    'mintedLookTokens',
    'lookAttachmentByTokenId',
] as const;

/**
 * The look table's runtime exports are exactly its eight merged views (the
 * 8b1 critic's item 2): a ninth is a view no parity test reads, and a
 * missing one is a site with nowhere to go. 8b2 keeps this and enumerates
 * the same list in its fixture test.
 */
describe('the-look-table-exports-exactly-its-merged-views', () => {
    it('exports the eight, and no other name', () => {
        expect(Object.keys(table).sort()).toEqual([...MERGED_VIEWS].sort());
    });
});

/** Every one-byte id but the reserved private ones, whose answer 8b2 changes on purpose. */
const PUBLIC_IDS = Array.from({ length: 0x100 }, (_, id) => id).filter((id) => !PRIVATE_LOOK_IDS.includes(id));

/** Every single bit a flags field can carry, and all of them at once. */
const FLAG_VALUES = [...Array.from({ length: ATTACHMENT_BITS }, (_, bit) => 1 << bit), 0xffff];

/** Two lists of rows hold the same rows, by reference and in order. */
function sameRows(a: readonly ShippedAttachment[], b: readonly ShippedAttachment[], why: string): void {
    expect(a.length, why).toBe(b.length);
    a.forEach((row, i) => expect(row, `${why}, row ${i}`).toBe(b[i]));
}

/**
 * Every merged view answers a public id exactly as the public table does,
 * rows by reference (the 8b1 critic's item 2): a merge that rewrote the
 * obvious half and left `wornForLook` or the token readers on the shipped
 * catalogue, or that copied rows (`{ ...row }`, which takes every
 * decoration's catalogue order to −1 in `category.ts`), goes red here. Over
 * every public id, every single bit, all bits, and three entitlements — the
 * preview's (none asked), none held, every minted token held — and every
 * shipped token. Written to survive 8b2: a private look adds ids and rows,
 * and moves no public answer.
 */
describe('every-merged-view-answers-a-public-id-as-the-public-table-does', () => {
    const minted = mintedAttachmentTokens();
    const entitlements: ReadonlyArray<ReadonlySet<string> | undefined> = [undefined, new Set(), minted];

    it('decodes, lists and wears every public id as the public table does', () => {
        for (const id of PUBLIC_IDS) {
            expect(decodeLook(id), `decodeLook(${id})`).toEqual(decodeTheme(id));
            sameRows(attachmentsForLook(id), attachmentsForTheme(id), `attachmentsForLook(${id})`);
            for (const flags of FLAG_VALUES) {
                expect(publishableLookFlags(id, flags), `publishableLookFlags(${id}, ${flags})`).toBe(
                    publishableFlags(id, flags),
                );
                for (const held of entitlements) {
                    sameRows(
                        wornForLook(id, flags, held),
                        wornAttachments(id, flags, held),
                        `wornForLook(${id}, ${flags}, ${held === undefined ? 'preview' : held.size})`,
                    );
                }
            }
        }
    });

    it('carries the shipped rows, the shipped looks and their tokens', () => {
        expect(LOOK_ROWS.filter((row) => !PRIVATE_LOOK_IDS.includes(row.id))).toEqual(SHIPPED_THEMES);
        sameRows(
            LOOK_ATTACHMENTS.filter((row) => !PRIVATE_LOOK_IDS.includes(row.themeId)),
            SHIPPED_ATTACHMENTS,
            'LOOK_ATTACHMENTS',
        );
        const tokens = mintedLookTokens();
        for (const token of minted) {
            expect(tokens.has(token), `mintedLookTokens has ${token}`).toBe(true);
            expect(lookAttachmentByTokenId(token), `lookAttachmentByTokenId(${token})`).toBe(attachmentByTokenId(token));
        }
        expect(lookAttachmentByTokenId('ff'.repeat(32))).toBeUndefined();
    });
});

/**
 * Step 8b1 is behaviour-neutral: no build includes a private look until the
 * plugin lands (8b2), so the merge of the public table with nothing IS the
 * public table, and each merged view is its public counterpart re-exported
 * under the merged name — the same function, the same array, the reserved
 * ids included. That is what keeps the served bundle the bytes it was. 8b2
 * deletes this by design (its identities must break) and adds the fixture
 * look's own test beside the parity above.
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
});

const VIRTUAL_MODULE = 'virtual:stall-private-looks';

/** An import of the virtual module in any form: `from '…'`, a bare `import '…'`, or `import('…')`. */
const IMPORTS_THE_VIRTUAL_MODULE = new RegExp(`(?:\\bfrom\\s*|\\bimport\\s*\\(?\\s*)['"]${VIRTUAL_MODULE}['"]`);

/**
 * The step-8 critic's item 15: `lookTable.ts` is the one module that may
 * import `virtual:stall-private-looks`, so whatever the build hands the app
 * reaches it through the table and nowhere else. Today nothing imports it —
 * the plugin that answers it is 8b2's — and this holds the road shut until
 * then; 8b2's import from `lookTable.ts` is the one this lets through.
 * Walked over every non-test source the app, the edge, the harness and the
 * kit compile; a test may mock the module (8b2's design for an app-level
 * private-look test). Proved red by planting an import of it in `render.ts`.
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
