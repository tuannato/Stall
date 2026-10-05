import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LookDataError, lookDataProblems, lookFromData, parseLookData, type LookPlace } from './lookData';
import { DEFAULT_THEME, PRIVATE_LOOK_IDS } from './theme';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The tracked private-look fixture's own place: its index's id and class, rows mintable as a private look's are. */
const FIXTURE_PLACE: LookPlace = {
    id: 0x04,
    sheetClass: 't-fixture-private',
    file: 'fixture/look.json',
    mintable: true,
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
        // Its rows carry the id, and a minted row its token; an unminted one none.
        expect(look.rows.map((row) => [row.bit, row.themeId, row.tokenId])).toEqual([
            [0, 0x04, 'f1'.repeat(32)],
            [1, 0x04, 'f2'.repeat(32)],
            [2, 0x04, undefined],
        ]);

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

/**
 * A private look's row may name the token that entitles it (step 8b2): a
 * private look is minted the way the shipped ones are, and the look table's
 * token readers answer from its rows. The kit's place is not `mintable` and
 * refuses the field (`a-kit-look-json-is-validated-and-every-fault-listed`).
 */
describe('a-private-look-row-names-its-token-or-none', () => {
    const lookWith = (rows: readonly object[]) => ({
        label: 'Minted',
        base: 'modern',
        tierCeilings: [7, 9, 12],
        overlayTierCeilings: [5, 7, 9],
        moods: [],
        decorations: rows,
    });
    const row = (bit: number, extra: object) => ({
        bit,
        slot: bit === 0 ? 'trim' : 'crest',
        label: `Row ${bit}`,
        place: bit === 0 ? 'behind' : 'on the sign',
        cls: `att-row-${bit}`,
        paint: 'root',
        motion: false,
        ...extra,
    });

    it('takes a 64-hex token, or none, under a mintable place', () => {
        const rows = lookFromData(lookWith([row(0, { tokenId: 'ab'.repeat(32) }), row(1, {})]), FIXTURE_PLACE).rows;
        expect(rows.map((r) => r.tokenId)).toEqual(['ab'.repeat(32), undefined]);
    });

    it('refuses a token that is not a txid, and one token on two rows', () => {
        for (const tokenId of ['AB'.repeat(32), 'ab'.repeat(31), 42, null]) {
            const problems = lookDataProblems(JSON.stringify(lookWith([row(0, { tokenId })])), FIXTURE_PLACE);
            expect(problems, String(tokenId)).toEqual([
                "decorations[0].tokenId: must be the token's genesis txid, 64 lower-case hex — or left out until it is minted",
            ]);
        }
        const twice = lookDataProblems(
            JSON.stringify(lookWith([row(0, { tokenId: 'cd'.repeat(32) }), row(1, { tokenId: 'cd'.repeat(32) })])),
            FIXTURE_PLACE,
        );
        expect(twice).toEqual([`token ${'cd'.repeat(32)}: entitles both "Row 0" and "Row 1" — a token names one row`]);
    });

    it('refuses the field where the place is not mintable', () => {
        const { mintable: _m, ...kitLike } = FIXTURE_PLACE;
        expect(lookDataProblems(JSON.stringify(lookWith([row(0, { tokenId: 'ab'.repeat(32) })])), kitLike)).toEqual([
            'decorations[0].tokenId: unknown field — a kit row is never minted (allowed: bit, slot, label, place, cls, paint, palette, motion)',
        ]);
    });
});
