import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { attachmentsForTheme } from '../src/domain/attachments';
import { DEFAULT_THEME_ID, SHIPPED_THEMES, WORKSHOP_THEME_ID, decodeTheme } from '../src/domain/theme';
import {
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
import { parseWorkshopLook } from './workshopLook';
import { KIT_SKELETON, lookFileText } from './workshopStarter';

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
 * Allowed: `looks.ts` (the resolver), and the two modules that BUILD the kit's
 * look from a shipped row — `workshopLook.ts` (the base row the file names)
 * and `workshopStarter.ts` (a shipped look written out as a starter). Tests
 * are not harness code. Proved red by planting `decodeTheme(themeId)` back in
 * `probe.ts`'s `paint()`.
 */
describe('the-harness-chooses-looks-in-one-place', () => {
    const ALLOWED = new Set(['looks.ts', 'workshopLook.ts', 'workshopStarter.ts']);
    const BANNED = [/\bdecodeTheme\(/, /\battachmentsForTheme\(/, /\bwornAttachments\(/, /\bwornFrom\(/, /\bSHIPPED_THEMES\b/];

    it('no harness file but the resolver picks a look by id', () => {
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
                if (banned.test(text)) {
                    offences.push(`${file}: ${banned.source}`);
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

        registerWorkshopLook(parseWorkshopLook(lookFileText(KIT_SKELETON)));
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
        // Once only.
        expect(() => registerWorkshopLook(parseWorkshopLook(lookFileText(KIT_SKELETON)))).toThrow(
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
        expect(() => registerWorkshopLook({ ...kit, theme: { ...kit.theme, id: DEFAULT_THEME_ID } })).toThrow(
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

    it('wears a class no stylesheet in the repository names', () => {
        const ROOT = join(LAYOUT, '..');
        const sheets = [
            ...readdirSync(join(ROOT, 'src/ui')).filter((n) => n.endsWith('.css')).map((n) => join(ROOT, 'src/ui', n)),
            ...readdirSync(LAYOUT).filter((n) => n.endsWith('.css')).map((n) => join(LAYOUT, n)),
            join(ROOT, 'workshop/theme-workshop.css'),
        ];
        // The walk found the sheets it exists for.
        expect(sheets.some((path) => path.endsWith('stall.css'))).toBe(true);
        expect(sheets.some((path) => path.endsWith('theme-modern.css'))).toBe(true);
        for (const path of sheets) {
            expect(readFileSync(path, 'utf8').includes(SKELETON_SHEET_CLASS), path).toBe(false);
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
