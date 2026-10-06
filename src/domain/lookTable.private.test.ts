import { describe, expect, it, vi } from 'vitest';
import type { PrivateLookSource } from './lookData';

/**
 * The look table over the tracked private-look fixture (step 8b2): the
 * module a build hands the app when it selects `layout/fixture-private-looks`
 * at `preview`, mocked here because a vitest run never selects a private
 * look (`scripts/private-looks-build.mjs`) — so the suite reads the same on
 * every machine, a `looks/` clone on the disk or not (the step-8 critic's
 * item 12). The fixture is the real reserved, paid id `0x04`, with a minted
 * decoration, a minted mood and an unminted crest; its tokens are dummies
 * (`f1…`, `f2…`) that no wallet holds.
 */
vi.mock('virtual:stall-private-looks', async () =>
    (await import('../../layout/fixturePrivateLooks')).fixturePrivateLooksModule(),
);

const table = await import('./lookTable');
const { SHIPPED_ATTACHMENTS, mintedAttachmentTokens, attachmentsForTheme } = await import('./attachments');
const { DEFAULT_THEME, DEFAULT_THEME_ID, PAID_LOOK_IDS, SHIPPED_THEMES, decodeTheme } = await import('./theme');
const { isPriceable, rowCategoryOf } = await import('./category');
const { fixturePrivateLooks } = await import('../../layout/fixturePrivateLooks');

const FIXTURE_ID = 0x04;
const TRIM_TOKEN = 'f1'.repeat(32);
const DUSK_TOKEN = 'f2'.repeat(32);
const FIXTURE_ROWS = () => table.LOOK_ATTACHMENTS.filter((row) => row.themeId === FIXTURE_ID);

/**
 * Every export of the look table answers the fixture look — enumerated from
 * the module, so a view or a gate added without a case here fails (the 8b1
 * critic's item 2: a merge that moved the obvious views and left a derived
 * one on the shipped catalogue was green and wrong). Rows by reference
 * throughout: `category.ts` orders decorations by
 * `LOOK_ATTACHMENTS.indexOf(row)`.
 */
describe('every-merged-view-answers-the-fixture-look', () => {
    const CASES: Record<string, () => void> = {
        decodeLook: () => {
            const look = table.decodeLook(FIXTURE_ID);
            expect(look.known).toBe(true);
            expect(look.id).toBe(FIXTURE_ID);
            expect(look.sheetClass).toBe('t-fixture-private');
            expect(look.sheetLoad).toBe('worn');
            expect(look.label).toBe('Fixture private look');
            // A public id is still the public table's.
            expect(table.decodeLook(DEFAULT_THEME_ID)).toEqual(decodeTheme(DEFAULT_THEME_ID));
        },
        LOOK_ROWS: () => {
            expect(table.LOOK_ROWS.slice(0, SHIPPED_THEMES.length)).toEqual(SHIPPED_THEMES);
            expect(table.LOOK_ROWS.slice(SHIPPED_THEMES.length)).toEqual([{ id: FIXTURE_ID, label: 'Fixture private look' }]);
        },
        LOOK_ATTACHMENTS: () => {
            SHIPPED_ATTACHMENTS.forEach((row, i) => expect(table.LOOK_ATTACHMENTS[i], `row ${i}`).toBe(row));
            const rows = table.LOOK_ATTACHMENTS.slice(SHIPPED_ATTACHMENTS.length);
            expect(rows.map((row) => [row.themeId, row.bit, row.slot, row.tokenId])).toEqual([
                [FIXTURE_ID, 0, 'trim', TRIM_TOKEN],
                [FIXTURE_ID, 1, 'mood', DUSK_TOKEN],
                [FIXTURE_ID, 2, 'crest', undefined],
            ]);
        },
        attachmentsForLook: () => {
            const rows = table.attachmentsForLook(FIXTURE_ID);
            expect(rows).toHaveLength(3);
            rows.forEach((row, i) => expect(row).toBe(FIXTURE_ROWS()[i]));
            for (const { id } of SHIPPED_THEMES) {
                expect(table.attachmentsForLook(id)).toEqual(attachmentsForTheme(id));
            }
        },
        wornForLook: () => {
            // The try-on: every flagged row, held or not.
            expect(table.wornForLook(FIXTURE_ID, 0b111).map((row) => row.bit)).toEqual([0, 1, 2]);
            // With a holdings set: what is held, and never the unminted crest.
            expect(table.wornForLook(FIXTURE_ID, 0b111, new Set([TRIM_TOKEN])).map((row) => row.bit)).toEqual([0]);
            expect(table.wornForLook(FIXTURE_ID, 0b111, new Set([TRIM_TOKEN, DUSK_TOKEN])).map((row) => row.bit)).toEqual([0, 1]);
            expect(table.wornForLook(FIXTURE_ID, 0b111, new Set())).toEqual([]);
            table.wornForLook(FIXTURE_ID, 0b111).forEach((row) => expect(FIXTURE_ROWS()).toContain(row));
        },
        publishableLookFlags: () => {
            // The crest (bit 2) has no token, so a record never names it; a
            // bit naming no row passes through.
            expect(table.publishableLookFlags(FIXTURE_ID, 0b111)).toBe(0b011);
            expect(table.publishableLookFlags(FIXTURE_ID, 0b1000)).toBe(0b1000);
        },
        mintedLookTokens: () => {
            const tokens = table.mintedLookTokens();
            expect(tokens.has(TRIM_TOKEN)).toBe(true);
            expect(tokens.has(DUSK_TOKEN)).toBe(true);
            for (const token of mintedAttachmentTokens()) {
                expect(tokens.has(token)).toBe(true);
            }
            expect(tokens.size).toBe(mintedAttachmentTokens().size + 2);
        },
        lookAttachmentByTokenId: () => {
            expect(table.lookAttachmentByTokenId(TRIM_TOKEN)).toBe(FIXTURE_ROWS()[0]);
            expect(table.lookAttachmentByTokenId(DUSK_TOKEN)).toBe(FIXTURE_ROWS()[1]);
        },
        lookSheetOf: () => {
            // The fixture's row, as the table admits it: its built sheet
            // and its class — what the renderer hands the loader.
            expect(table.lookSheetOf(table.decodeLook(FIXTURE_ID))).toEqual({
                url: fixturePrivateLooks()[0]!.sheetUrl,
                cls: 't-fixture-private',
            });
            // What a locked record paints is the default: a shipped row, in
            // the entry CSS, so nothing to load.
            const locked = table.paintableLook(table.decodeLook(FIXTURE_ID), 0, table.mintedLookTokens());
            expect(table.lookSheetOf(locked.theme)).toBeUndefined();
            // Only the table's own row: the fixture's id under another class
            // (a harness row), or not worn-only, is handed no sheet.
            expect(table.lookSheetOf({ ...table.decodeLook(FIXTURE_ID), sheetClass: 't-skeleton' })).toBeUndefined();
            expect(table.lookSheetOf({ ...table.decodeLook(FIXTURE_ID), sheetLoad: 'bundled' })).toBeUndefined();
            expect(table.lookSheetOf({ ...table.decodeLook(FIXTURE_ID), known: false })).toBeUndefined();
            for (const { id } of SHIPPED_THEMES) {
                expect(table.lookSheetOf(table.decodeLook(id))).toBeUndefined();
            }
        },
        CARRIES_WORN_ONLY_LOOKS: () => {
            // The fixture's sheet is its own file, so this build holds its
            // paints for it (8d2).
            expect(table.CARRIES_WORN_ONLY_LOOKS).toBe(true);
            expect(table.decodeLook(FIXTURE_ID).sheetLoad).toBe('worn');
        },
        paintableLook: () => {
            const held = table.mintedLookTokens();
            // The fixture is paid and no stall is licensed in step 8.
            expect(PAID_LOOK_IDS).toContain(FIXTURE_ID);
            const locked = table.paintableLook(table.decodeLook(FIXTURE_ID), 0xffff, held);
            expect(locked).toEqual({ theme: DEFAULT_THEME, worn: [], why: 'not-unlocked' });
            // The seam opens it: a licensed stall wears what it holds of its own look.
            const licensed = table.paintableLook(table.decodeLook(FIXTURE_ID), 0b111, held, new Set([FIXTURE_ID]));
            expect(licensed.why).toBeUndefined();
            expect(licensed.theme).toBe(table.decodeLook(FIXTURE_ID));
            expect(licensed.worn.map((row) => row.bit)).toEqual([0, 1]);
        },
    };

    it('owes a case to every export of the look table', () => {
        expect(Object.keys(table).sort()).toEqual(Object.keys(CASES).sort());
    });

    for (const [name, check] of Object.entries(CASES)) {
        it(`${name} answers the fixture look`, check);
    }
});

/**
 * A private decoration's token is a decoration, never an item a seller can
 * put a price on (the 8b1 critic's item 2): `defaultLookOf` reads
 * `lookAttachmentByTokenId` and `LOOK_ROWS` together, and either left on the
 * shipped table would file a private decoration — an ALP token, decimals 0,
 * fungible on chain — as an eToken, and the describe sheet would offer a
 * permanent quote on it once it is minted.
 */
describe('a-private-decoration-token-is-decor-and-never-priceable', () => {
    const fungible = (tokenId: string) => ({
        tokenId,
        name: 'Fixture trim',
        ticker: 'FXT',
        decimals: 0,
        tokenType: { protocol: 'ALP', type: 'ALP_TOKEN_TYPE_STANDARD' },
    });

    it('files both fixture tokens as decorations of the fixture look, after the shipped ones', () => {
        for (const token of [TRIM_TOKEN, DUSK_TOKEN]) {
            expect(rowCategoryOf(token, fungible(token))).toBe('decor');
            expect(isPriceable(token, fungible(token))).toBe(false);
        }
        // An unrelated fungible token is still an eToken.
        expect(isPriceable('ab'.repeat(32), fungible('ab'.repeat(32)))).toBe(true);
    });
});

/**
 * Where a private look sits in the table is checked when it is read (the
 * 8b1 critic's item 4): `lookFromData` copies the place onto the row
 * unchecked, so a source that would shadow a shipped look, take an id
 * nothing reserved, or share an id, a class or a token is dropped — every
 * source sharing it — and its id reads as unknown, never a thrown boot. The
 * harness's classes are the build's to refuse (`privateIndexProblems`), not
 * spelt in the served table.
 */
describe('a-private-source-that-shadows-a-shipped-id-or-class-is-dropped', () => {
    async function tableOver(sources: readonly unknown[]) {
        vi.resetModules();
        vi.doMock('virtual:stall-private-looks', () => ({ carriesPrivateLooks: true, privateLooks: sources }));
        try {
            return await import('./lookTable');
        } finally {
            vi.doUnmock('virtual:stall-private-looks');
        }
    }
    const fixture = async (): Promise<PrivateLookSource> =>
        (await import('../../layout/fixturePrivateLooks')).fixturePrivateLooks()[0]!;
    const withTokens = (source: PrivateLookSource, trim: string, dusk: string): PrivateLookSource => {
        const look = structuredClone(source.look) as { moods: { tokenId?: string }[]; decorations: { tokenId?: string }[] };
        look.decorations[0]!.tokenId = trim;
        look.moods[0]!.tokenId = dusk;
        return { ...source, look };
    };

    it('admits the fixture as it is', async () => {
        const t = await tableOver([await fixture()]);
        expect(t.decodeLook(FIXTURE_ID).known).toBe(true);
        expect(t.lookSheetOf(t.decodeLook(FIXTURE_ID))?.cls).toBe('t-fixture-private');
    });

    it('drops an unreserved id, a shipped id and a malformed or shipped class', async () => {
        const base = await fixture();
        for (const source of [
            { ...base, id: 0x05 },
            { ...base, id: DEFAULT_THEME_ID },
            { ...base, sheetClass: 't-modern' },
            { ...base, sheetClass: 't-Fixture' },
            { ...base, sheetClass: 'fixture' },
            { ...base, sheetClass: 't-two classes' },
            null,
        ]) {
            const t = await tableOver([source]);
            expect(t.LOOK_ROWS, JSON.stringify(source)).toEqual(SHIPPED_THEMES);
            expect(t.decodeLook(FIXTURE_ID).known).toBe(false);
            // A dropped look loads nothing: its id paints the default's row.
            expect(t.lookSheetOf(t.decodeLook(FIXTURE_ID))).toBeUndefined();
            expect(t.lookSheetOf({ ...t.decodeLook(FIXTURE_ID), known: true, sheetLoad: 'worn', sheetClass: base.sheetClass })).toBeUndefined();
            expect(t.decodeLook(DEFAULT_THEME_ID)).toEqual(decodeTheme(DEFAULT_THEME_ID));
            expect(t.LOOK_ATTACHMENTS).toHaveLength(SHIPPED_ATTACHMENTS.length);
        }
    });

    it('drops every source that shares an id or a class, and every look that shares a token', async () => {
        const base = await fixture();
        const other = withTokens({ ...base, sheetClass: 't-other-look' }, 'e1'.repeat(32), 'e2'.repeat(32));
        for (const sources of [
            [base, other],
            [base, { ...withTokens(base, 'e1'.repeat(32), 'e2'.repeat(32)), id: 0x04 }],
            [base, { ...other, id: 0x04, sheetClass: 't-fixture-private' }],
        ]) {
            const t = await tableOver(sources);
            expect(t.decodeLook(FIXTURE_ID).known).toBe(false);
            expect(t.LOOK_ROWS).toEqual(SHIPPED_THEMES);
        }
        // A row naming a shipped decoration's token shadows it.
        const shipped = SHIPPED_ATTACHMENTS.find((row) => row.tokenId !== undefined)!.tokenId!;
        const shadow = await tableOver([withTokens(base, shipped, DUSK_TOKEN)]);
        expect(shadow.decodeLook(FIXTURE_ID).known).toBe(false);
        expect(shadow.lookAttachmentByTokenId(shipped)).toEqual(
            SHIPPED_ATTACHMENTS.find((row) => row.tokenId === shipped),
        );
    });
});

/**
 * A look whose `look.json` the runtime validator refuses is dropped and its
 * id reads as unknown — the build said why, loudly; the page fails safe and
 * never throws at boot. Planted: a field the validator does not know, a key
 * named `__proto__` (an own key after `JSON.parse`, which is how the build's
 * module hands the data over), a bad colour, and not an object at all.
 */
describe('a-private-row-that-does-not-validate-reads-as-an-unknown-id', () => {
    it('drops the look, paints the default and says the id is unknown', async () => {
        const base = (await import('../../layout/fixturePrivateLooks')).fixturePrivateLooks()[0]!;
        const look = base.look as Record<string, unknown>;
        for (const bad of [
            { ...look, script: 'x' },
            JSON.parse(`{"__proto__": {"label": "x"}, ${JSON.stringify(look).slice(1)}`),
            { ...look, palette: { bg: [300, 0, 0] } },
            'not an object',
            null,
        ]) {
            vi.resetModules();
            vi.doMock('virtual:stall-private-looks', () => ({ carriesPrivateLooks: true, privateLooks: [{ ...base, look: bad }] }));
            const t = await import('./lookTable');
            vi.doUnmock('virtual:stall-private-looks');
            const decoded = t.decodeLook(FIXTURE_ID);
            expect(decoded.known, JSON.stringify(bad)).toBe(false);
            expect(t.paintableLook(decoded, 0xffff, t.mintedLookTokens()).why).toBe('unknown');
        }
    });
});

/**
 * The fallback wears nothing, in both directions (PROPOSAL §6.3, the step-8
 * critic's item 3): a record naming a paid look this stall holds no licence
 * for paints the default, and its flags are rows of the PAID look's table —
 * read against the default's they would put Modern's decorations, held by
 * any stall that bought them, on a stall that chose none. So under the gate
 * no flag is read at all: not against the default's rows, every one held and
 * flagged, and not against the look's own, mood included.
 */
describe('an-unlicensed-look-wears-none-of-the-default-looks-rows', () => {
    it('wears none of the default look’s rows, every one flagged and held', () => {
        const modern = attachmentsForTheme(DEFAULT_THEME_ID);
        expect(modern.some((row) => row.tokenId !== undefined), 'the default has minted rows to be wrong with').toBe(true);
        const flags = modern.reduce((all, row) => all | (1 << row.bit), 0);
        const held = new Set(modern.flatMap((row) => (row.tokenId === undefined ? [] : [row.tokenId])));
        // The same flags over the default's own record do wear them: the
        // gate, not the flags, is what takes them off.
        expect(table.paintableLook(table.decodeLook(DEFAULT_THEME_ID), flags, held).worn.length).toBeGreaterThan(0);
        const painted = table.paintableLook(table.decodeLook(FIXTURE_ID), flags, held);
        expect(painted.theme).toBe(DEFAULT_THEME);
        expect(painted.worn).toEqual([]);
        expect(painted.why).toBe('not-unlocked');
    });

    it('wears none of its own rows either, the mood included', () => {
        const painted = table.paintableLook(table.decodeLook(FIXTURE_ID), 0xffff, table.mintedLookTokens());
        expect(painted.worn).toEqual([]);
        expect(painted.theme.bg).toEqual(DEFAULT_THEME.bg);
    });
});

/**
 * Two private looks may not share a row class (the 8b2 critic's item 4): a
 * class one look's sheet paints would dress the other's row too. Today one
 * id is reserved, so the theme table is planted with a second for this case.
 * Both looks go when they share (or one is the other's child); both stay
 * when they do not. A shipped row's class is the validator's to refuse
 * (`lookData.test.ts`), which drops the look the same way.
 */
describe('a-private-row-class-is-its-looks-own', () => {
    async function tableWithTwo(second: { cls: string; trim: string }) {
        const base = (await import('../../layout/fixturePrivateLooks')).fixturePrivateLooks()[0]!;
        const look = structuredClone(base.look) as {
            moods: { tokenId?: string; cls?: string }[];
            decorations: { tokenId?: string; cls?: string }[];
        };
        look.decorations[0]!.tokenId = 'e1'.repeat(32);
        look.decorations[0]!.cls = second.trim;
        look.decorations[1]!.cls = 'att-other-crest';
        look.moods[0]!.tokenId = 'e2'.repeat(32);
        look.moods[0]!.cls = 'att-other-dusk';
        vi.resetModules();
        vi.doMock('./theme', async (importOriginal) => ({
            ...(await importOriginal<typeof import('./theme')>()),
            PRIVATE_LOOK_IDS: Object.freeze([0x04, 0x05]),
            PAID_LOOK_IDS: Object.freeze([0x04, 0x05]),
        }));
        vi.doMock('virtual:stall-private-looks', () => ({
            carriesPrivateLooks: true,
            privateLooks: [base, { id: 0x05, sheetClass: second.cls, sheetUrl: '/assets/other.css', look }],
        }));
        try {
            return await import('./lookTable');
        } finally {
            vi.doUnmock('./theme');
            vi.doUnmock('virtual:stall-private-looks');
        }
    }

    it('admits two looks whose row classes are their own', async () => {
        const t = await tableWithTwo({ cls: 't-other-look', trim: 'att-other-trim' });
        expect(t.decodeLook(0x04).known).toBe(true);
        expect(t.decodeLook(0x05).known).toBe(true);
    });

    it('drops both when they share a look class under two reserved ids', async () => {
        // The shared-class half of the place check, which one reserved id
        // could only test together with a shared id.
        const t = await tableWithTwo({ cls: 't-fixture-private', trim: 'att-other-trim' });
        expect(t.decodeLook(0x04).known).toBe(false);
        expect(t.decodeLook(0x05).known).toBe(false);
    });

    it('drops both when a row class is shared, or one is the other’s child', async () => {
        for (const trim of ['att-fixture-trim', 'att-fixture-trim-wide', 'att-fixture']) {
            const t = await tableWithTwo({ cls: 't-other-look', trim });
            expect(t.decodeLook(0x04).known, trim).toBe(false);
            expect(t.decodeLook(0x05).known, trim).toBe(false);
        }
    });
});
