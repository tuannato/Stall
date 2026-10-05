import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, FONT_STACKS, WORKSHOP_THEME_ID, decodeTheme } from '../src/domain/theme';
import { LookDataError } from '../src/domain/lookData';
import { WorkshopLookError, lookFromJson, parseWorkshopLook, workshopLookProblems } from './workshopLook';
import { KIT_SKELETON, lookFileText } from './workshopStarter';

/**
 * `workshop/look.json` is the look under design as DATA — Stall never runs a
 * creator's code (the step-1 critic's P2-7) — so the loader is the whole
 * boundary: every field typed and ranged, every unknown field refused, and
 * every fault listed in one error, so a creator fixes the file once.
 */
describe('a-kit-look-json-is-validated-and-every-fault-listed', () => {
    it('reads the skeleton as the base row under the kit’s id, class and label', () => {
        const look = parseWorkshopLook(lookFileText(KIT_SKELETON));
        expect(look.theme.id).toBe(WORKSHOP_THEME_ID);
        expect(look.theme.known).toBe(true);
        expect(look.theme.sheetClass).toBe('t-workshop');
        expect(look.theme.label).toBe(KIT_SKELETON.label);
        expect(look.theme.tierCeilings).toEqual([7, 9, 12]);
        expect(look.theme.overlayTierCeilings).toEqual([5, 7, 9]);
        // Worn-only, as every look read from data is (8d1): its sheet is its
        // own file, never the entry CSS its base's row is bundled in.
        expect(look.theme.sheetLoad).toBe('worn');
        // Nothing else restated: every other field is Modern's row.
        const { id: _i, known: _k, sheetClass: _c, label: _l, sheetLoad: _s, ...rest } = look.theme;
        const { id: _i2, known: _k2, sheetClass: _c2, label: _l2, sheetLoad: _s2, ...modern } = DEFAULT_THEME;
        expect(rest).toEqual(modern);
        expect(look.rows).toEqual([]);
    });

    it('applies every override the file may state, and gives every row the kit’s id', () => {
        const look = lookFromJson({
            label: 'Harbour',
            base: 'neo',
            palette: { bg: [1, 2, 3], shade: [200, 200, 200] },
            fontIndex: 2,
            softness: 22,
            shape: { icon: 48, itemName: 15.5, priceWeight: 700 },
            tierCeilings: [6, 8, 10],
            overlayTierCeilings: [4, 6, 8],
            moods: [
                {
                    bit: 3,
                    slot: 'mood',
                    label: 'Dusk',
                    place: 'the whole palette',
                    motion: false,
                    palette: { bg: [20, 20, 30] },
                },
            ],
            decorations: [
                { bit: 0, slot: 'fringe', label: 'Flags', place: 'across the top', cls: 'att-flags', paint: 'node', motion: true },
                { bit: 1, slot: 'fringe', label: 'Rope', place: 'across the top', cls: 'att-rope', paint: 'root', motion: false },
            ],
        });
        const neo = decodeTheme(0x02);
        expect(look.theme.bg).toEqual({ r: 1, g: 2, b: 3 });
        expect(look.theme.shade).toEqual({ r: 200, g: 200, b: 200 });
        expect(look.theme.surface).toEqual(neo.surface);
        expect(look.theme.fontIndex).toBe(2);
        expect(look.theme.softness).toBe(22);
        expect(look.theme.shape.icon).toBe('48px');
        expect(look.theme.shape.itemName).toBe('15.5px');
        expect(look.theme.shape.priceWeight).toBe('700');
        expect(look.theme.shape.areasM).toBe(neo.shape.areasM);
        expect(look.theme.ornament).toEqual(neo.ornament);
        expect(look.rows.map((row) => row.themeId)).toEqual([WORKSHOP_THEME_ID, WORKSHOP_THEME_ID, WORKSHOP_THEME_ID]);
        // In bit order, moods and decorations interleaved, as the catalogue is.
        expect(look.rows.map((row) => row.bit)).toEqual([0, 1, 3]);
        expect(look.rows.map((row) => row.cls)).toEqual(['att-flags', 'att-rope', undefined]);
        expect(look.rows[2]!.palette).toEqual({ bg: { r: 20, g: 20, b: 30 } });
    });

    it('takes a mood that names its own class, and carries it to the row (D11)', () => {
        const look = lookFromJson({
            label: 'Harbour',
            base: 'rural',
            tierCeilings: [6, 8, 10],
            overlayTierCeilings: [4, 6, 8],
            moods: [
                { bit: 1, slot: 'mood', label: 'Rubbing', place: 'the whole palette', motion: false, palette: { bg: [20, 20, 30] }, cls: 'att-rubbing' },
                { bit: 2, slot: 'mood', label: 'Wash', place: 'the whole palette', motion: false, palette: { bg: [240, 240, 230] } },
            ],
            decorations: [],
        });
        expect(look.rows.map((row) => [row.label, row.cls, row.paint])).toEqual([
            ['Rubbing', 'att-rubbing', undefined],
            ['Wash', undefined, undefined],
        ]);
    });

    it('lists every fault in one error, and refuses what the file may not say', () => {
        const faulty = {
            label: '\u202Eevil',
            base: 'brutalist',
            palette: { bg: [1, 2], danger: [0, 0, 0] },
            fontIndex: FONT_STACKS.length,
            softness: -1,
            shape: { areasM: 5, icon: -2 },
            tierCeilings: [9, 7, 12],
            moods: [
                { bit: 0, slot: 'mood', label: 'A', place: 'the palette', motion: false, palette: {}, cls: 'att-a' },
                { bit: 5, slot: 'mood', label: 'P', place: 'the palette', motion: false, palette: { bg: [1, 1, 1] }, cls: 'att-p', paint: 'root' },
                { bit: 6, slot: 'mood', label: 'Q', place: 'the palette', motion: false, palette: { bg: [1, 1, 1] }, cls: 'q' },
                { bit: 7, slot: 'mood', label: 'G', place: 'the palette', motion: false, palette: { bg: [1, 1, 1] }, cls: 'att-rainfall' },
                { bit: 8, slot: 'mood', label: 'H', place: 'the palette', motion: false, palette: { bg: [1, 1, 1] }, cls: 'att-e-glow' },
            ],
            decorations: [
                { bit: 16, slot: 'fringe', label: 'B', place: 'top', cls: 'b', paint: 'up', motion: 1, tokenId: 'aa' },
                { bit: 2, slot: 'mood', label: 'C', place: 'top', cls: 'att-c', paint: 'root', motion: true },
                { bit: 3, slot: 'yard', label: 'D', place: 'ground', cls: 'att-d', paint: 'node', motion: true, themeId: 255 },
                { bit: 4, slot: 'yard', label: 'E', place: 'floor', cls: 'att-e', paint: 'root', motion: false },
                { bit: 4, slot: 'crest', label: 'F', place: 'name', cls: 'att-e', paint: 'root', motion: false },
            ],
            extra: true,
        };
        let error: unknown;
        try {
            lookFromJson(faulty);
        } catch (err) {
            error = err;
        }
        expect(error).toBeInstanceOf(WorkshopLookError);
        const problems = (error as WorkshopLookError).problems;
        const expected = [
            'extra: unknown field',
            'overlayTierCeilings: required',
            'label: must be text a reader can see',
            'base: must be one of modern, neo, rural',
            'palette.danger: unknown field',
            'palette.bg: must be three whole numbers',
            'fontIndex: must be a whole number',
            'softness: must be a whole number',
            'shape.areasM: unknown field',
            'shape.icon: must be a number of px',
            'tierCeilings: must be three whole numbers',
            'moods[0].palette: a mood must move at least one colour role',
            'moods[1].paint: a mood\'s class lands on the stall root',
            'moods[2].cls: must be one class starting with "att-"',
            'moods: "G" — att-rainfall: is also att-rainfall',
            'moods: "H" — att-e-glow: shares an owner with att-e',
            'decorations[0].tokenId: unknown field — a kit row is never minted',
            'decorations[0].bit: must be a whole number from 0 to 15',
            'decorations[0].motion: must be true or false',
            'decorations[0].cls: must be one class starting with "att-"',
            'decorations[0].paint: must be "root"',
            'decorations[1].slot: must be one of',
            'decorations[2].themeId: unknown field — the kit gives every row its own id',
            'bit 4: carried by both "E" and "F"',
            'class att-e: carried by both "E" and "F"',
        ];
        for (const want of expected) {
            expect(
                problems.some((p) => p.startsWith(want)),
                `missing "${want}" in:\n${problems.join('\n')}`,
            ).toBe(true);
        }
        // The one message a reader sees names the file and counts the faults.
        expect((error as Error).message).toMatch(/^workshop\/look\.json has \d+ problems:\n {2}- /);
    });

    it('holds rows sharing a slot to one place word', () => {
        const problems = workshopLookProblems(
            JSON.stringify({
                ...KIT_SKELETON,
                decorations: [
                    { bit: 0, slot: 'yard', label: 'A', place: 'on the ground', cls: 'att-a', paint: 'node', motion: false },
                    { bit: 1, slot: 'yard', label: 'B', place: 'the floor', cls: 'att-b', paint: 'root', motion: false },
                ],
            }),
        );
        expect(problems).toEqual([
            'slot yard: named "on the ground" and "the floor" — rows sharing a slot share its place word',
        ]);
    });

    it('the-kit-error-keeps-its-name', () => {
        // The validator moved into `src/domain` (step 8b1) and throws its own
        // `LookDataError`; the kit's reads hand it back as the kit's error,
        // by name and by kind, with the header the kit has always printed.
        for (const read of [() => parseWorkshopLook('[]'), () => lookFromJson({ label: 'x' }), () => parseWorkshopLook('{')]) {
            let error: unknown;
            try {
                read();
            } catch (err) {
                error = err;
            }
            expect(error).toBeInstanceOf(WorkshopLookError);
            expect(error).toBeInstanceOf(LookDataError);
            expect((error as Error).name).toBe('WorkshopLookError');
            expect((error as Error).message).toMatch(/^workshop\/look\.json has \d+ problems?:\n {2}- /);
        }
        const made = new WorkshopLookError(['one']);
        expect(made.name).toBe('WorkshopLookError');
        expect(made.message).toBe('workshop/look.json has 1 problem:\n  - one');
        expect(made.problems).toEqual(['one']);
    });

    it('says a file that is not JSON is not JSON, and a list is not a look', () => {
        expect(workshopLookProblems('{ "label": ')[0]).toMatch(/^not JSON: /);
        expect(workshopLookProblems('[]')).toEqual(['the file must hold one object, {…}']);
    });
});
