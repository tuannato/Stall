import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
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
    lookSheetOf,
    mintedLookTokens,
    paintableLook,
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
 * the merge is for. Since 8b2 the record's worn set reaches the view through
 * the paid gate (`paintableLook`, the step-8 critic's item 3), so the sites
 * that once read `wornForLook` in `app.ts` read the gate, and
 * `no-app-site-wears-a-look-around-the-gate` below holds the rest.
 */
describe('no-app-site-decodes-against-the-shipped-table-alone', () => {
    it('walked the sites that decode, and they read the merged view', () => {
        const files = appFiles();
        const sites: ReadonlyArray<readonly [string, RegExp]> = [
            ['app.ts', /\bpaintableLook\(/],
            ['app.ts', /\bmintedLookTokens\(/],
            ['ui/render.ts', /\bpaintableLook\(/],
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

/**
 * The text of each call to `name` in `text`, from its name to its closing
 * parenthesis, and how many arguments it passes (top-level commas plus one).
 */
function callsOf(text: string, name: string): { call: string; args: number }[] {
    const out: { call: string; args: number }[] = [];
    for (const m of text.matchAll(new RegExp(`\\b${name}\\(`, 'g'))) {
        let depth = 0;
        let commas = 0;
        let empty = true;
        for (let i = m.index + name.length; i < text.length; i += 1) {
            const c = text[i]!;
            if (c === '(' || c === '[' || c === '{') {
                depth += 1;
            } else if (c === ')' || c === ']' || c === '}') {
                depth -= 1;
                if (depth === 0) {
                    out.push({ call: text.slice(m.index, i + 1), args: empty ? 0 : commas + 1 });
                    break;
                }
            } else if (c === ',' && depth === 1) {
                commas += 1;
            } else if (depth === 1 && !/\s/.test(c)) {
                empty = false;
            }
        }
    }
    return out;
}

/** Every call to `wornForLook` an app file makes that is not a try-on, as sentences. */
function wornOutsideTheGate(files: ReadonlyMap<string, string>): string[] {
    const out: string[] = [];
    for (const [rel, text] of files) {
        if (rel === 'domain/lookTable.ts') {
            continue;
        }
        for (const { call, args } of callsOf(text, 'wornForLook')) {
            if (rel !== 'ui/render.ts') {
                out.push(`${rel}: ${call} — only the look table and the try-on in render.ts call wornForLook`);
            } else if (args !== 2) {
                out.push(`${rel}: ${call} — a try-on passes a look and its flags, never a holdings set; a record's worn set is the gate's`);
            } else if (/\bview\.|\brecord/.test(call)) {
                out.push(`${rel}: ${call} — a try-on's look and flags are the try-on's, never the view's record`);
            }
        }
        for (const { call } of callsOf(text, 'attachmentsForLook')) {
            if (/\bview\.|\brecord/.test(call)) {
                out.push(`${rel}: ${call} — the record's rows are the gate's to read`);
            }
        }
    }
    const app = files.get('app.ts') ?? '';
    for (const m of app.matchAll(/(?:\bview\.worn\s*=|^\s*worn\s*:)([^\n]*)/gm)) {
        if (!/\bpaintableLook\(/.test(m[1]!)) {
            out.push(`app.ts: ${m[0].trim()} — the view's worn set is the gate's (paintableLook)`);
        }
    }
    return out;
}

/**
 * The paid gate cannot be walked around (the 8b1 critic's item 6; the
 * step-8 critic's item 3): once `paintableLook` decides what a record wears,
 * an exported `wornForLook` handed a holdings set is a road around it — a
 * paid look's own rows, mood included, on a stall that holds no licence. So
 * no app file but the look table calls it, except the try-on in `render.ts`,
 * which shows a look without claiming it and so passes a look and its flags
 * and never a holdings set; and every write of the view's worn set in
 * `app.ts` reads the gate. Proved red by restoring 8b1's
 * `view.worn = wornForLook(manifest.theme.id, flags, held)` in `app.ts`.
 */
describe('no-app-site-wears-a-look-around-the-gate', () => {
    it('finds the try-on calls and the gate, and nothing else', () => {
        const files = appFiles();
        expect(wornOutsideTheGate(files)).toEqual([]);
        // The walk saw what it is about: the try-on calls, and in the app
        // its three writes, the two a look waiting for its sheet makes (the
        // look kept, then the look put on; 8d2) and the row whose sheet the
        // hold waits for (`sheetForLook`).
        expect(callsOf(files.get('ui/render.ts')!, 'wornForLook').length).toBeGreaterThanOrEqual(5);
        expect([...files.get('app.ts')!.matchAll(/\bpaintableLook\(/g)].length).toBe(6);
    });

    it('refuses a holdings set outside the gate, a call outside render.ts, and an app write around it', () => {
        const planted = (rel: string, text: string) => wornOutsideTheGate(new Map([[rel, text]]));
        expect(planted('ui/render.ts', 'const w = wornForLook(previewed.themeId, previewed.attachmentFlags);')).toEqual([]);
        expect(planted('ui/render.ts', 'const w = wornForLook(id, flags, view.heldTokens ?? new Set());')).toHaveLength(1);
        expect(planted('ui/render.ts', 'const w = wornForLook(f(a, b), g([c, d]));')).toEqual([]);
        expect(planted('ui/window.ts', 'const w = wornForLook(id, flags);')).toHaveLength(1);
        expect(planted('app.ts', '            view.worn = wornForLook(manifest.theme.id, flags, held);')).toHaveLength(2);
        expect(planted('app.ts', '                worn: wornFrom(rows, flags, held),')).toHaveLength(1);
        expect(planted('app.ts', '            view.worn = paintableLook(manifest.theme, flags, held).worn;')).toEqual([]);
        // The critic's plant B: two arguments, both the record's.
        expect(planted('ui/render.ts', 'const w = wornForLook((view.recordTheme ?? DEFAULT_THEME).id, view.recordFlags ?? 0);')).toHaveLength(1);
        expect(planted('ui/render.ts', 'const rows = attachmentsForLook(view.recordTheme!.id);')).toHaveLength(1);
        expect(planted('ui/render.ts', 'const rows = attachmentsForLook(themeId);')).toEqual([]);
    });
});

/**
 * Where the record's own look and flags may be read, by file and by the
 * function a read sits in — each with the reason it paints nothing around
 * the gate. `render.ts`'s are top-level functions; `app.ts`'s are the three
 * writers inside `boot` and `loadCurrent`, and `recordSheet`, which reads the
 * look only to hand it to the gate (8d2's hold).
 */
const MAY_READ_THE_RECORD: ReadonlyMap<string, ReadonlyMap<string, string>> = new Map([
    [
        'ui/render.ts',
        new Map([
            ['recordLook', 'the gate itself: what the record paints and wears, and why'],
            ['recordAsPainted', "the try-on's comparison: the gate's look and flags, never the record's under a lock"],
            ['recordLookLabel', "the Studio's read-back of the record, as words"],
            ['lookLabelOf', 'the "Publishes:" line\'s label, as words'],
            ['recordFingerprint', "the name sheet's draft key, as a string"],
        ]),
    ],
    [
        'app.ts',
        new Map([
            ['applyManifest', 'writes the record, and its worn set through the gate'],
            ['refreshHoldings', 'compares the record to the one it asked about, and wears through the gate'],
            ['loadCurrent', 'writes the record, and its worn set through the gate'],
            ['recordSheet', "the sheet the hold waits for (8d2): the gate's row, never the record's own under a lock"],
        ]),
    ],
]);

/** The declaration lines of `text`: top-level ones (column 0), or every named function and arrow at any depth. */
function declarationsOf(text: string, depth: 'top' | 'any'): { line: number; name: string }[] {
    const TOP = /^(?:export\s+)?(?:async\s+)?function\s+(\w+)|^(?:export\s+)?(?:const|let)\s+(\w+)\b/;
    const ANY = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*[(<]|^\s*const\s+(\w+)\s*=\s*(?:async\s*)?\(/;
    return text.split('\n').flatMap((line, i) => {
        const m = (depth === 'top' ? TOP : ANY).exec(line);
        return m === null ? [] : [{ line: i, name: (m[1] ?? m[2])! }];
    });
}

/** Every read or write of the record's look or flags in `files` outside the functions listed for it, as sentences. */
function recordReadsAroundTheGate(files: ReadonlyMap<string, string>): string[] {
    const out: string[] = [];
    for (const [rel, text] of files) {
        if (rel === 'domain/state.ts') {
            continue;
        }
        const allowed = MAY_READ_THE_RECORD.get(rel) ?? new Map<string, string>();
        const declarations = declarationsOf(text, rel === 'app.ts' ? 'any' : 'top');
        text.split('\n').forEach((line, i) => {
            if (!/\brecord(?:Theme|Flags)\b/.test(line)) {
                return;
            }
            const within = declarations.filter((d) => d.line <= i).at(-1)?.name ?? '(top level)';
            if (!allowed.has(within)) {
                out.push(`${rel}: ${line.trim()} — in ${within}, which may not read the record's look or flags (paint what paintableLook answers)`);
            }
        });
    }
    return out;
}

/**
 * The paid gate cannot be read around (the 8b2 critic's item 1): the record's
 * look and flags are `recordTheme` and `recordFlags` on the view — named so
 * every read says what it is — and a read of either is allowed only in the
 * functions listed with their reasons: the gate (`recordLook`), the try-on's
 * comparison, two read-backs as words, the draft key, and in `app.ts` the
 * three writers. Every paint reads `paintedTheme`, so a branch that painted
 * the record's look directly — the wall or the overlay painting
 * `view.recordTheme ?? theme` (the critic's plant A), a worn set built from
 * the record's flags (plant B), or the name sheet seeding its chips from
 * them under a lock (plant C) — is refused here, beside the behaviour each
 * breaks (`a-locked-look-paints-the-default-and-says-this-page-does-not-show-it`,
 * `a-locked-record-lends-no-bit-to-the-default-it-paints`).
 */
describe('no-site-paints-the-record-look-around-the-gate', () => {
    it('finds the record read only where the list says, and every listed function is there', () => {
        const files = appFiles();
        expect(recordReadsAroundTheGate(files)).toEqual([]);
        for (const [rel, names] of MAY_READ_THE_RECORD) {
            const declared = declarationsOf(files.get(rel)!, rel === 'app.ts' ? 'any' : 'top').map((d) => d.name);
            for (const name of names.keys()) {
                expect(declared, `${rel} declares ${name}`).toContain(name);
            }
        }
    });

    it('refuses the critic’s three plants and a read in any other file', () => {
        const render = (body: string) =>
            new Map([['ui/render.ts', `export function renderStall(root, view) {\n${body}\n}\n`]]);
        // Plant A: the wall or the overlay painting the record's look.
        expect(recordReadsAroundTheGate(render('    applyTheme(stall, view.recordTheme ?? theme, worn);'))).toHaveLength(1);
        // Plant B: a worn set from the record's flags.
        expect(
            recordReadsAroundTheGate(render('    const w = wornForLook((view.recordTheme ?? DEFAULT_THEME).id, view.recordFlags ?? 0);')),
        ).toHaveLength(1);
        // Plant C: the name sheet's chips seeded from the record.
        expect(
            recordReadsAroundTheGate(new Map([['ui/render.ts', 'function nameSheet(view) {\n    let flags = view.recordFlags ?? 0;\n}\n']])),
        ).toHaveLength(1);
        expect(recordReadsAroundTheGate(new Map([['ui/window.ts', 'const t = view.recordTheme;']]))).toHaveLength(1);
        expect(recordReadsAroundTheGate(new Map([['app.ts', '    const paint = () => {\n        applyTheme(state.view.recordTheme);\n    };']]))).toHaveLength(1);
        // The gate itself may.
        expect(
            recordReadsAroundTheGate(new Map([['ui/render.ts', 'function recordLook(view) {\n    return paintableLook(view.recordTheme);\n}\n']])),
        ).toEqual([]);
    });
});

/**
 * Every use of the gate in `source` that could hand it a licence: a call
 * with a fourth argument (or a spread, which can carry one), or the gate
 * used as a value — passed, stored, aliased, `.call`ed or `.apply`d —
 * which a fence over its calls cannot follow. Parsed, never text-matched.
 * Each as `<what> at <line>`.
 */
function licensedGateUses(source: string): string[] {
    const file = ts.createSourceFile('app.ts', source, ts.ScriptTarget.Latest, true);
    const out: string[] = [];
    const line = (node: ts.Node): number => file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
    const visit = (node: ts.Node): void => {
        if (ts.isIdentifier(node) && node.text === GATE) {
            const parent = node.parent;
            const declared =
                ts.isImportSpecifier(parent) ||
                ts.isExportSpecifier(parent) ||
                (ts.isFunctionDeclaration(parent) && parent.name === node) ||
                (ts.isPropertyAccessExpression(parent) && parent.name === node && !ts.isCallExpression(parent.parent));
            if (ts.isCallExpression(parent) && parent.expression === node) {
                if (parent.arguments.length > 3) {
                    out.push(`a call with ${parent.arguments.length} arguments at ${line(node)}`);
                } else if (parent.arguments.some((arg) => ts.isSpreadElement(arg))) {
                    out.push(`a call with a spread argument at ${line(node)}`);
                }
            } else if (!declared) {
                out.push(`the gate used as a value at ${line(node)}`);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(file);
    return out;
}

/**
 * `no-app-site-passes-a-licence-before-step-9` (8e2, the 8e2 critic's item
 * 4). The gate's fourth parameter, `licensed`, is the seam step 9's licence
 * check fills, and step 8 has no licence check: one call in `src/` that
 * handed it a set naming a paid id would paint that look for free, and every
 * other fence would stay green. The harness asks the gate the licensed
 * question (`harnessGateFaults`, `layout/looks.ts`), which is outside `src/`
 * and paints nothing. So no app file calls the gate with more than three
 * arguments, or with a spread, or holds the gate as a value it could call
 * another way; the table itself declares it.
 */
describe('no-app-site-passes-a-licence-before-step-9', () => {
    it('finds every app call of the gate with three arguments at most, and the gate never held as a value', () => {
        const files = walk(SRC, (path) => path.endsWith('.ts') && !path.endsWith('.test.ts') && !path.endsWith(join('domain', 'lookTable.ts')));
        const calls = files.flatMap((path) => {
            const text = readFileSync(path, 'utf8');
            return licensedGateUses(text).map((at) => `${relative(SRC, path)}: ${at}`);
        });
        expect(calls, calls.join('\n')).toEqual([]);
        // The walk is not blind: the app's own calls are there to be read.
        const app = readFileSync(join(SRC, 'app.ts'), 'utf8');
        expect(app.match(/\bpaintableLook\(/g)?.length ?? 0).toBeGreaterThan(3);
    });

    it('refuses a planted licence, in every shape', () => {
        for (const planted of [
            'const p = paintableLook(theme, flags, held, new Set([0x04]));',
            'const p = paintableLook(theme, flags, held, licence, extra);',
            'const p = paintableLook(...args);',
            'const gate = paintableLook; gate(theme, flags, held, licence);',
            'const p = paintableLook.call(undefined, theme, flags, held, licence);',
            'apply(paintableLook);',
        ]) {
            expect(licensedGateUses(planted), planted).toHaveLength(1);
        }
        expect(licensedGateUses("import { paintableLook } from './lookTable';\nconst p = paintableLook(theme, flags, held);")).toEqual([]);
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

/** The one gate every record's look passes before it paints (8b2). */
const GATE = 'paintableLook';

/**
 * The sheet a painted worn-only row needs (8d1): no public counterpart —
 * a shipped look's sheet is in the entry CSS — so every public row answers
 * none (`every-merged-view-answers-a-public-id-as-the-public-table-does`).
 */
const SHEET = 'lookSheetOf';

/**
 * The build's switch for every road that waits for a worn-only sheet (8d2):
 * the virtual module's literal, re-exported so `render.ts` and `app.ts` can
 * sit their hold behind it — the one name here that is a value, not a view.
 */
const SWITCH = 'CARRIES_WORN_ONLY_LOOKS';

/**
 * The look table's runtime exports are exactly its eight merged views, the
 * gate, the sheet a painted row loads and the switch (the 8b1 critic's item
 * 2; the gate is 8b2's, the step-8 critic's item 3; the sheet 8d1's; the
 * switch 8d2's): another is a view no parity test reads, and a missing one is
 * a site with nowhere to go. `every-merged-view-answers-the-fixture-look`
 * (`lookTable.private.test.ts`) enumerates the same exports and owes each a
 * case.
 */
describe('the-look-table-exports-exactly-its-merged-views', () => {
    it('exports the eight, the gate, the sheet and the switch, and no other name', () => {
        expect(Object.keys(table).sort()).toEqual([...MERGED_VIEWS, GATE, SHEET, SWITCH].sort());
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
            // A public row's sheet is in the entry CSS: nothing to load.
            expect(lookSheetOf(decodeLook(id)), `lookSheetOf(${id})`).toBeUndefined();
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
 * A build that selects no private look — every public build, and every
 * vitest run, which never selects one — carries none: the merged views ARE
 * the public table's answers, and a paid id reads as unknown, never as
 * locked, so `THEME_UNKNOWN` and not `THEME_NOT_UNLOCKED` is what a public
 * stall says about a `0x04` record (byte-identical behaviour to step 8b1;
 * `a-build-with-no-released-look-is-the-public-build` holds the bytes). The
 * fixture's own test (`lookTable.private.test.ts`) is the other half.
 */
describe('a-build-with-no-private-look-is-the-public-table', () => {
    it('lists the shipped looks and rows alone, and reads every reserved id as unknown', () => {
        expect(table.CARRIES_WORN_ONLY_LOOKS, 'no worn-only look, so nothing waits for a sheet').toBe(false);
        expect(LOOK_ROWS).toEqual(SHIPPED_THEMES);
        sameRows(LOOK_ATTACHMENTS, SHIPPED_ATTACHMENTS, 'LOOK_ATTACHMENTS');
        for (const id of PRIVATE_LOOK_IDS) {
            expect(decodeLook(id)).toEqual(decodeTheme(id));
            expect(decodeLook(id).known).toBe(false);
            expect(attachmentsForLook(id)).toEqual([]);
            // Nothing carried, so no sheet — even for a row dressed as worn.
            expect(lookSheetOf(decodeLook(id))).toBeUndefined();
            expect(lookSheetOf({ ...decodeLook(id), known: true, sheetLoad: 'worn' })).toBeUndefined();
            const painted = paintableLook(decodeLook(id), 0xffff, mintedAttachmentTokens());
            expect(painted).toEqual({ theme: decodeTheme(id), worn: [], why: 'unknown' });
        }
    });

    it('lets a free look through the gate unchanged, holdings checked', () => {
        for (const { id } of SHIPPED_THEMES) {
            const minted = mintedAttachmentTokens();
            const painted = paintableLook(decodeLook(id), 0xffff, minted);
            expect(painted.why).toBeUndefined();
            expect(painted.theme).toEqual(decodeTheme(id));
            sameRows(painted.worn, wornAttachments(id, 0xffff, minted), `gate(${id})`);
            expect(paintableLook(decodeLook(id), 0xffff, new Set()).worn).toEqual([]);
        }
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
    it('exports one list of private look sources, and the switch that says whether it holds any', () => {
        expectTypeOf<typeof PrivateLooksModule.privateLooks>().toEqualTypeOf<readonly PrivateLookSource[]>();
        expectTypeOf<typeof PrivateLooksModule.carriesPrivateLooks>().toEqualTypeOf<boolean>();
    });
});
