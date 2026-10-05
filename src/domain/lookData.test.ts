import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LookDataError, lookDataProblems, lookFromData, parseLookData, type LookPlace } from './lookData';
import { DEFAULT_THEME, PRIVATE_LOOK_IDS } from './theme';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The tracked private-look fixture's own place: its index's id and class. */
const FIXTURE_PLACE: LookPlace = {
    id: 0x04,
    sheetClass: 't-fixture-private',
    file: 'fixture/look.json',
};

/**
 * The validator moved out of the kit (step 8b1) and takes its place — the
 * id every row carries, the class, the file the error names — from its
 * caller, so a private look's `look.json` is read by the same rules as the
 * kit's (`a-kit-look-json-is-validated-and-every-fault-listed` holds the
 * kit's place). The subject is the tracked private-look fixture, at the
 * reserved id its index names, so the read runs over a real private look's
 * file in public CI.
 */
describe('a-look-is-read-under-the-place-it-is-given', () => {
    it('builds the row and every decoration under the place’s id and class', () => {
        const index = JSON.parse(readFileSync(join(ROOT, 'layout/fixture-private-looks/index.json'), 'utf8'));
        expect(index.looks[0]).toMatchObject({ id: FIXTURE_PLACE.id, cls: FIXTURE_PLACE.sheetClass });
        expect(PRIVATE_LOOK_IDS).toContain(FIXTURE_PLACE.id);
        const look = parseLookData(
            readFileSync(join(ROOT, 'layout/fixture-private-looks/fixture/look.json'), 'utf8'),
            FIXTURE_PLACE,
        );
        expect(look.theme.id).toBe(0x04);
        expect(look.theme.known).toBe(true);
        expect(look.theme.sheetClass).toBe('t-fixture-private');
        expect(look.theme.label).toBe('Fixture private look');
        // Nothing restated: every other field is the base row's (Modern).
        const { id: _i, known: _k, sheetClass: _c, label: _l, ...rest } = look.theme;
        const { id: _i2, known: _k2, sheetClass: _c2, label: _l2, ...modern } = DEFAULT_THEME;
        expect(rest).toEqual(modern);

        const rows = lookFromData(
            {
                label: 'Placed',
                base: 'rural',
                tierCeilings: [6, 8, 10],
                overlayTierCeilings: [4, 6, 8],
                moods: [{ bit: 2, slot: 'mood', label: 'Dusk', place: 'the whole palette', motion: false, palette: { bg: [1, 2, 3] } }],
                decorations: [
                    { bit: 0, slot: 'yard', label: 'Fence', place: 'on the ground', cls: 'att-fence', paint: 'node', motion: false },
                ],
            },
            FIXTURE_PLACE,
        ).rows;
        expect(rows.map((row) => [row.bit, row.themeId])).toEqual([
            [0, 0x04],
            [2, 0x04],
        ]);
    });

    it('names the place’s file in the one error, and lists every fault', () => {
        let error: unknown;
        try {
            parseLookData('{ "label": "x" }', FIXTURE_PLACE);
        } catch (err) {
            error = err;
        }
        expect(error).toBeInstanceOf(LookDataError);
        expect((error as Error).message).toMatch(/^fixture\/look\.json has \d+ problems:\n {2}- /);
        expect(lookDataProblems('{ "label": "x" }', FIXTURE_PLACE)).toEqual((error as LookDataError).problems);
        expect(lookDataProblems('not json', FIXTURE_PLACE)[0]).toMatch(/^not JSON: /);
    });
});
