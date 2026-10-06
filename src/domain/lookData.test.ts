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
        // Its own ground, so a paint that used it under the gate shows
        // (`a-locked-look-paints-the-default-and-says-this-page-does-not-show-it`);
        // nothing else restated: every other field is the base row's (Modern).
        expect(look.theme.bg).toEqual({ r: 236, g: 230, b: 218 });
        expect(look.theme.bg).not.toEqual(DEFAULT_THEME.bg);
        // Worn-only, as every look read from data is (8d1).
        expect(look.theme.sheetLoad).toBe('worn');
        const { id: _i, known: _k, sheetClass: _c, label: _l, bg: _b, sheetLoad: _s, ...rest } = look.theme;
        const { id: _i2, known: _k2, sheetClass: _c2, label: _l2, bg: _b2, sheetLoad: _s2, ...modern } = DEFAULT_THEME;
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

/**
 * A private look's row classes are its own (the 8b2 critic's item 4):
 * `stall.css` paints `.stall.att-rainfall`, `.att-hum` and `.att-horizon` for
 * any look, so a private decoration named after a shipped row would wear its
 * paint, and the probe's class-keyed tables would read it as the shipped
 * row. Refused under a private (mintable) place, the child-class rule
 * included; the kit's place keeps taking a shipped class, because a starter
 * copies a shipped look's rows on purpose. Red by the critic's plant D.
 */
describe('a-private-row-class-is-its-looks-own', () => {
    const lookWith = (decorations: readonly object[], moods: readonly object[] = []) =>
        JSON.stringify({
            label: 'Classes',
            base: 'modern',
            tierCeilings: [7, 9, 12],
            overlayTierCeilings: [5, 7, 9],
            moods,
            decorations,
        });
    const row = (cls: string, bit = 0) => ({ bit, slot: 'trim', label: `Row ${bit}`, place: 'behind', cls, paint: 'root', motion: false });

    it('refuses a decoration named after a shipped row, or after its child', () => {
        for (const cls of ['att-rainfall', 'att-hum', 'att-horizon-moon', 'att-beetle']) {
            const problems = lookDataProblems(lookWith([row(cls)]), FIXTURE_PLACE);
            expect(problems.some((p) => p.startsWith(`class ${cls}: `) && p.endsWith("a private look's row classes are its own")), cls).toBe(true);
        }
        expect(lookDataProblems(lookWith([row('att-fixture-own')]), FIXTURE_PLACE)).toEqual([]);
    });

    it('lets the kit take a shipped class, as a starter copies one', () => {
        const { mintable: _m, ...kitLike } = FIXTURE_PLACE;
        expect(lookDataProblems(lookWith([row('att-rainfall')]), kitLike)).toEqual([]);
    });
});

/**
 * Step 8f1: a first-party look's row names its own slot (any lower-case
 * word), where its node stands (`mount`) and the slots it is never worn
 * beside (`excludes`). The kit's rows keep the shape the workshop README
 * names, and refuse all three.
 */
describe('a-first-party-row-names-its-slot-mount-and-exclusions', () => {
    const lookWith = (decorations: readonly object[], moods: readonly object[] = []) =>
        JSON.stringify({
            label: 'Mounts',
            base: 'modern',
            tierCeilings: [7, 9, 12],
            overlayTierCeilings: [5, 7, 9],
            moods,
            decorations,
        });
    const node = (bit: number, slot: string, extra: object = {}) => ({
        bit,
        slot,
        label: `Row ${bit}`,
        place: `the ${slot}`,
        cls: `att-mounted-${bit}`,
        paint: 'node',
        motion: false,
        ...extra,
    });
    const mounted = [
        node(0, 'trim', { mount: 'below-goods' }),
        node(1, 'perch', { mount: 'below-goods' }),
        node(2, 'strip', { mount: 'above-dock' }),
        node(3, 'badge'),
        { ...node(6, 'field', { excludes: ['trim', 'perch'] }), paint: 'root' },
    ];

    it('reads the slots, the mounts and the exclusions onto the rows', () => {
        const rows = lookFromData(JSON.parse(lookWith(mounted)), FIXTURE_PLACE).rows;
        expect(rows.map((r) => [r.bit, r.slot, r.mount, r.excludes])).toEqual([
            [0, 'trim', 'below-goods', undefined],
            [1, 'perch', 'below-goods', undefined],
            [2, 'strip', 'above-dock', undefined],
            [3, 'badge', undefined, undefined],
            [6, 'field', undefined, ['trim', 'perch']],
        ]);
    });

    it('refuses a mount it does not know, a mount on a root row, and a node with nowhere to stand', () => {
        const problems = (rows: readonly object[]) => lookDataProblems(lookWith(rows), FIXTURE_PLACE);
        expect(problems([node(0, 'trim', { mount: 'aloft' })])).toEqual([
            'decorations[0].mount: must be one of fringe, crest, badge, trim, yard, below-goods, above-dock',
        ]);
        expect(problems([{ ...node(0, 'trim', { mount: 'below-goods' }), paint: 'root' }])).toEqual([
            'decorations[0].mount: only a "node" row stands somewhere — a "root" row paints on the stall',
        ]);
        expect(problems([node(0, 'perch')])).toEqual([
            'decorations[0].mount: a "node" row in slot "perch" stands nowhere — name one of fringe, crest, badge, trim, yard, below-goods, above-dock',
        ]);
        // A root row in a slot of its own needs no mount.
        expect(problems([{ ...node(0, 'field'), paint: 'root' }])).toEqual([]);
        expect(problems([node(0, 'Perch')])).toEqual([
            'decorations[0].slot: must be a lower-case word naming the place this row is exclusive in (a mood goes under "moods")',
        ]);
    });

    it('refuses an exclusion of its own slot, of the mood, twice over, or of a slot no decoration is in', () => {
        const problems = (excludes: unknown) =>
            lookDataProblems(lookWith([node(0, 'trim', { mount: 'below-goods' }), node(1, 'field', { mount: 'below-goods', excludes })]), FIXTURE_PLACE);
        const shape = "decorations[1].excludes: must be a list of other decorations' slots, each once — not its own, not \"mood\"";
        for (const bad of [['field'], ['mood'], ['trim', 'trim'], [], 'trim', [3]]) {
            expect(problems(bad), JSON.stringify(bad)).toEqual([shape]);
        }
        expect(problems(['brim'])).toEqual([
            'decorations: "Row 1" excludes slot "brim", which no decoration of this look is in',
        ]);
        expect(problems(['trim'])).toEqual([]);
    });

    it('refuses a mount or an exclusion on a mood', () => {
        const mood = { bit: 4, slot: 'mood', label: 'Dusk', place: 'the whole stall', palette: { bg: [1, 2, 3] }, motion: false };
        expect(lookDataProblems(lookWith([], [{ ...mood, mount: 'below-goods' }]), FIXTURE_PLACE)).toEqual([
            'moods[0]: a mood is the whole palette — no "mount", no "excludes"',
        ]);
    });

    it('refuses all three on the kit, whose rows keep the README’s shape', () => {
        const { mintable: _m, ...kitLike } = FIXTURE_PLACE;
        const problems = lookDataProblems(lookWith(mounted), kitLike);
        expect(problems).toContain(
            'decorations[0].mount: unknown field — a kit row stands where its slot puts it (allowed: bit, slot, label, place, cls, paint, palette, motion)',
        );
        expect(problems).toContain(
            'decorations[4].excludes: unknown field — a kit row is exclusive in its slot alone (allowed: bit, slot, label, place, cls, paint, palette, motion)',
        );
        expect(problems).toContain('decorations[1].slot: must be one of crest, fringe, yard, badge, trim (a mood goes under "moods")');
    });
});
