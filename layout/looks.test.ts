import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { attachmentsForTheme } from '../src/domain/attachments';
import { DEFAULT_THEME_ID, PRIVATE_LOOK_IDS, SHIPPED_THEMES, WORKSHOP_THEME_ID, decodeTheme } from '../src/domain/theme';
import { HARNESS_LOOK_CLASSES } from '../scripts/private-looks.mjs';
import { guardSheets } from '../scripts/served-sheets.mjs';
import {
    FIXTURE_LOOK_ID,
    FIXTURE_SHEET_CLASS,
    SKELETON_LOOK_ID,
    SKELETON_SHEET_CLASS,
    galleryLooks,
    kitLook,
    lookById,
    looksFor,
    measuredLooks,
    registerWorkshopLook,
    shippedLooks,
} from './looks';
import { loadKitLook } from './workshopKit';
import { WORKSHOP_SHEET_CLASS, parseWorkshopLook, workshopLookProblems } from './workshopLook';
import { KIT_SKELETON, lookFileText } from './workshopStarter';
import { wornSheetsOf } from './wornSheet';

/** The URL a kit page registers the kit's built sheet under — any same-origin path will do here. */
const KIT_URL = '/assets/theme-workshop-test.css';

const LAYOUT = dirname(fileURLToPath(import.meta.url));

/** Block comments and whole-line `//` comments out: a sentence about `decodeTheme(` is not a call. */
function code(file: string): string {
    return readFileSync(join(LAYOUT, file), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^[ \t]*\/\/.*$/gm, '');
}

/**
 * The workshop critic's P1: after the row learned its class and ladders,
 * `decodeTheme(0xff)` still answers — with Modern's row — and
 * `attachmentsForTheme(0xff)` answers `[]`. Any harness site left choosing a
 * look by id would paint Modern bare under the kit's name and pass green. So
 * every harness file chooses through `looks.ts`, and this refuses the
 * by-id functions anywhere else in `layout/`.
 *
 * Allowed: `looks.ts` (the resolver), and `workshopStarter.ts` (a shipped
 * look written out as a starter). The kit's look is built from its base row
 * by `src/domain/lookData.ts` since step 8b1, so `workshopLook.ts` names the
 * kit's place and reads no row by id. Tests are not harness code. Proved red
 * by planting `decodeTheme(themeId)` back in `probe.ts`'s `paint()`.
 *
 * **The merged views and the view's look are the resolver's too** (8e2): a
 * harness file that read the app's merged table by id (`decodeLook`,
 * `attachmentsForLook`, `wornForLook`, `LOOK_ROWS`), asked the gate
 * (`paintableLook`) or composed a look onto a view itself — a record
 * (`recordTheme:`) or a try-on (`previewLook:`) — could paint a carried
 * private look by a road `paintView` does not take: its record, which the
 * gate paints as the default under the look's name. Each file listed with a
 * name it may still use says why: the fittings shop sells the shipped
 * catalogue's tokens (`fixtures.ts`, `SHIPPED_ATTACHMENTS`), and the probe
 * paints the record road once, on purpose, to hold the gate to the default
 * (`the-record-road-paints-a-locked-look-as-the-default`). Proved red by
 * planting `recordTheme: look.theme` back in `probe.ts`'s `paint()`.
 */
describe('the-harness-chooses-looks-in-one-place', () => {
    const ALLOWED = new Set(['looks.ts', 'workshopStarter.ts']);
    const BANNED = [
        /\bdecodeTheme\(/,
        /\battachmentsForTheme\(/,
        /\bwornAttachments\(/,
        /\bwornFrom\(/,
        /\bSHIPPED_THEMES\b/,
        /\bSHIPPED_ATTACHMENTS\b/,
        /\bdecodeLook\(/,
        /\battachmentsForLook\(/,
        /\bwornForLook\(/,
        /\bLOOK_ROWS\b/,
        /\bpaintableLook\(/,
        /\brecordTheme\s*:/g,
        /\bpreviewLook\s*:/,
    ];
    /** A name a file may still use, and how many times: each with its reason (the docblock above). */
    const EXCUSED: Readonly<Record<string, Readonly<Record<string, number>>>> = {
        'fixtures.ts': { [String(/\bSHIPPED_ATTACHMENTS\b/)]: 2 },
        'probe.ts': { [String(/\brecordTheme\s*:/g)]: 1 },
    };

    it('no harness file but the resolver picks a look by id, or composes one onto a view', () => {
        const files = readdirSync(LAYOUT).filter(
            (name) => name.endsWith('.ts') && !name.endsWith('.test.ts') && !ALLOWED.has(name),
        );
        // The two the critic named are among them — a walk that found neither
        // would pass over nothing.
        expect(files).toContain('probe.ts');
        expect(files).toContain('gallery.ts');
        const offences: string[] = [];
        for (const file of files) {
            const text = code(file);
            for (const banned of BANNED) {
                const found = text.match(new RegExp(banned.source, 'g'))?.length ?? 0;
                const excused = EXCUSED[file]?.[String(banned)] ?? 0;
                if (found !== excused && (found > 0 || excused > 0)) {
                    offences.push(`${file}: ${banned.source} ×${found}${excused > 0 ? ` (excused ×${excused})` : ''}`);
                }
            }
        }
        expect(offences, offences.join('\n')).toEqual([]);
    });

    it('resolves the shipped looks to their own rows, and the kit only once registered', () => {
        // Before registration (this module's own state): the three shipped
        // looks, each its own row and its own decorations, and the skeleton.
        expect(kitLook()).toBeUndefined();
        expect(measuredLooks().map((look) => look.id)).toEqual([
            ...SHIPPED_THEMES.map((row) => row.id),
            SKELETON_LOOK_ID,
        ]);
        expect(shippedLooks().map((look) => look.id)).toEqual(SHIPPED_THEMES.map((row) => row.id));
        for (const look of shippedLooks()) {
            expect(look.theme).toEqual(decodeTheme(look.id));
            expect(look.rows).toEqual(attachmentsForTheme(look.id));
            expect(lookById(look.id)).toBe(look);
        }
        expect(looksFor('door').map((look) => look.id)).toEqual([DEFAULT_THEME_ID]);
        expect(() => lookById(WORKSHOP_THEME_ID)).toThrow(/workshop pages/);

        // The skeleton is measured on every screen but the door.
        const skeleton = lookById(SKELETON_LOOK_ID);
        expect(skeleton.theme.sheetClass).toBe(SKELETON_SHEET_CLASS);
        expect(looksFor('offers')).toContain(skeleton);
        expect(looksFor('door')).not.toContain(skeleton);

        // Every look read from data is worn-only from the row up (8d1):
        // nothing that reads the kit's row before it is registered meets its
        // base's `bundled`.
        expect(parseWorkshopLook(lookFileText(KIT_SKELETON)).theme.sheetLoad).toBe('worn');
        registerWorkshopLook(parseWorkshopLook(lookFileText(KIT_SKELETON)), KIT_URL);
        const kit = kitLook()!;
        // The probe measures the kit ALONE, and the door not at all.
        expect(measuredLooks()).toEqual([kit]);
        expect(looksFor('offers')).toEqual([kit]);
        expect(looksFor('door')).toEqual([]);
        // The showroom offers all four.
        expect(galleryLooks().map((look) => look.id)).toEqual([
            ...SHIPPED_THEMES.map((row) => row.id),
            WORKSHOP_THEME_ID,
        ]);
        expect(lookById(WORKSHOP_THEME_ID)).toBe(kit);
        expect(kit.theme.sheetClass).toBe('t-workshop');
        // The kit loads the worn-only way (8d1): its row says so, and the
        // page loads the URL it registered before it paints.
        expect(kit.theme.sheetLoad).toBe('worn');
        expect(wornSheetsOf(measuredLooks())).toEqual([{ url: KIT_URL, cls: 't-workshop' }]);
        // Once only.
        expect(() => registerWorkshopLook(parseWorkshopLook(lookFileText(KIT_SKELETON)), KIT_URL)).toThrow(
            /already registered/,
        );
    });
});

/**
 * The kit's half of `the-scratch-id-is-not-a-shipped-look` (the table's half
 * is `src/domain/theme.test.ts`, which cannot import `layout/`): the look the
 * kit builds carries `WORKSHOP_THEME_ID` on its row and every decoration, and
 * the resolver refuses a look that does not.
 */
describe('the-scratch-id-is-not-a-shipped-look', () => {
    it('the kit’s look carries 0xff, through the same `?raw` read the kit’s pages use', () => {
        const look = loadKitLook();
        expect(look.theme.id).toBe(WORKSHOP_THEME_ID);
        expect(WORKSHOP_THEME_ID).toBe(0xff);
        expect(look.rows.every((row) => row.themeId === WORKSHOP_THEME_ID)).toBe(true);
        expect(look.theme.sheetClass).toBe('t-workshop');
    });

    it('a look under any other id is refused', () => {
        const kit = parseWorkshopLook(lookFileText(KIT_SKELETON));
        expect(() => registerWorkshopLook({ ...kit, theme: { ...kit.theme, id: DEFAULT_THEME_ID } }, KIT_URL)).toThrow(
            /carries id 255/,
        );
    });
});

/**
 * The skeleton the ordinary probe measures (step 2d, the owner's D3): the
 * default row under a class no stylesheet names, so the base sheets paint it
 * and no look's does. Three ways it could stop being that, each pinned
 * without trusting the module under test: a sheet somewhere learning the
 * class, the row drifting from the default's, and the runner forgetting to
 * expect the class (a pass that never painted it would then read green).
 */
describe('the-skeleton-is-the-default-row-under-a-class-no-sheet-styles', () => {
    // Read at collection, before any test registers the kit: once a kit look
    // is registered this page measures the kit alone, as a workshop page does.
    const skeleton = lookById(SKELETON_LOOK_ID);

    it('is the default row, every field but the class', () => {
        const { sheetClass, ...rest } = skeleton.theme;
        const { sheetClass: defaultClass, ...defaultRest } = decodeTheme(DEFAULT_THEME_ID);
        expect(sheetClass).toBe('t-skeleton');
        expect(defaultClass).not.toBe(sheetClass);
        expect(rest).toEqual(defaultRest);
        expect(skeleton.rows).toEqual([]);
        expect(skeleton.label).toBe('Skeleton');
    });

    it('carries a harness address that is no shipped id and not the kit’s', () => {
        expect(SHIPPED_THEMES.map((row) => row.id)).not.toContain(SKELETON_LOOK_ID);
        expect(SKELETON_LOOK_ID).not.toBe(WORKSHOP_THEME_ID);
        // The renderer never sees the address: the row keeps the default's id.
        expect(skeleton.theme.id).toBe(DEFAULT_THEME_ID);
    });

    it('wears a class no stylesheet a run serves names', async () => {
        // Every sheet a run serves, a private look's among them
        // (`scripts/served-sheets.mjs`, the 8e1 critic's item 3).
        const sheets = await guardSheets();
        expect(sheets.some((sheet) => sheet.path === 'src/ui/stall.css')).toBe(true);
        expect(sheets.some((sheet) => sheet.path === 'src/ui/theme-modern.css')).toBe(true);
        expect(sheets.some((sheet) => sheet.role === 'private')).toBe(true);
        for (const sheet of sheets) {
            expect(sheet.css.includes(SKELETON_SHEET_CLASS), sheet.path).toBe(false);
        }
    });

    it('is a class the ordinary runner expects to see painted', () => {
        const runner = readFileSync(join(LAYOUT, '..', 'scripts/layout-check.mjs'), 'utf8');
        const at = runner.indexOf('const EXPECTED_SHEET_CLASSES =');
        expect(at).toBeGreaterThan(-1);
        const statement = runner.slice(at, runner.indexOf(';', at));
        expect(statement).toContain(`'${SKELETON_SHEET_CLASS}'`);
    });
});

/**
 * The classes the ordinary runner expects to see painted are derived, never
 * listed (8e2): the shipped looks from the role table's look rows, which
 * `every-look-row-loads-its-sheet-the-way-its-role-says` holds to the theme
 * table, and the private looks from what the run's selection carries
 * (`harness-looks.mjs`) — so a fourth shipped look is expected the day its
 * row lands, and a selected look the day it is selected. Read off the
 * runner's own statements; the run itself refuses a pass whose painted set
 * differs (`the-workshop-probe-measures-the-workshop-look`), and a page whose
 * build carries other private looks than the selection's.
 */
describe('the-runner-expects-the-classes-it-derives', () => {
    const runner = readFileSync(join(LAYOUT, '..', 'scripts/layout-check.mjs'), 'utf8');
    const statement = (name: string): string => {
        const at = runner.indexOf(`const ${name} =`);
        expect(at, name).toBeGreaterThan(-1);
        return runner.slice(at, runner.indexOf(';', at));
    };

    it('takes the shipped looks from the role table and the private ones from the selection', () => {
        const shipped = statement('SHIPPED_SHEET_CLASSES');
        expect(shipped).toContain("SERVED_SHEETS.filter((sheet) => sheet.role === 'look')");
        for (const cls of SHIPPED_THEMES.map((row) => decodeTheme(row.id).sheetClass)) {
            expect(shipped, cls).not.toContain(`'${cls}'`);
        }
        expect(statement('PRIVATE_SHEET_CLASSES')).toContain('CARRIED.looks.map((look) => look.cls)');
        expect(statement('EXPECTED_SHEET_CLASSES')).toContain('...PRIVATE_SHEET_CLASSES');
        expect(statement('CARRIED')).toContain('await harnessLooks(SELECTION)');
    });
});

/**
 * A private look (step 8, `scripts/private-looks.mjs`) takes an id
 * `PRIVATE_LOOK_IDS` reserves and a class of its own. The harness's
 * addresses and classes live here, out of `src/`, so this is where they are
 * held apart from it: no harness address is a reserved id, and the list of
 * harness classes the private index refuses is exactly the harness's.
 */
describe('no-harness-look-is-a-private-look', () => {
    it('keeps the kit, skeleton and fixture addresses out of the reserved ids', () => {
        for (const id of [WORKSHOP_THEME_ID, SKELETON_LOOK_ID, FIXTURE_LOOK_ID]) {
            expect(PRIVATE_LOOK_IDS, `0x${id.toString(16)}`).not.toContain(id);
        }
    });

    it('names exactly the harness classes the private index refuses', () => {
        expect([...HARNESS_LOOK_CLASSES].sort()).toEqual([WORKSHOP_SHEET_CLASS, SKELETON_SHEET_CLASS, FIXTURE_SHEET_CLASS].sort());
    });

    it('carries a tracked private fixture whose look.json is the kit’s shape plus the tokens a private row may name', () => {
        // The fixture's look.json is written in the kit's shape, widened by
        // one field: a private look's row may name the token that entitles
        // it (8b2, `mintable`). The kit refuses exactly that field and
        // nothing else, so the fixture is a kit look once its tokens go.
        const source = readFileSync(join(LAYOUT, 'fixture-private-looks', 'fixture', 'look.json'), 'utf8');
        expect(workshopLookProblems(source)).toEqual([
            'moods[0].tokenId: unknown field — a kit row is never minted (allowed: bit, slot, label, place, cls, paint, palette, motion)',
            'decorations[0].tokenId: unknown field — a kit row is never minted (allowed: bit, slot, label, place, cls, paint, palette, motion)',
        ]);
        const json = JSON.parse(source) as { moods: { tokenId?: string }[]; decorations: { tokenId?: string }[] };
        for (const row of [...json.moods, ...json.decorations]) {
            delete row.tokenId;
        }
        expect(workshopLookProblems(JSON.stringify(json))).toEqual([]);
        expect(parseWorkshopLook(JSON.stringify(json)).theme.label).toBe('Fixture private look');
    });
});
