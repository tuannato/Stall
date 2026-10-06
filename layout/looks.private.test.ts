// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The harness over a build that carries a private look (step 8e2): the
 * module a build hands the app when it selects `layout/fixture-private-looks`
 * at `preview`, mocked because a vitest run never selects one
 * (`scripts/private-looks-build.mjs`). The fixture is the real reserved,
 * paid id `0x04`, with a minted trim, a minted mood and an unminted crest.
 */
vi.mock('virtual:stall-private-looks', async () =>
    (await import('./fixturePrivateLooks')).fixturePrivateLooksModule(),
);

/*
 * The loader, held: the renderer's ask is recorded rather than sent (a
 * connected stylesheet link is a request, `no-test-reaches-the-network`),
 * and the state the loader holds for a URL is whatever a case sets — the
 * loader itself is `src/ui/lookSheets.test.ts`'s, and in Chrome the probe's
 * (`a-worn-only-sheet-loads-under-the-production-policy`).
 */
const sheetStates = new Map<string, 'pending' | 'ready' | 'failed'>();
vi.mock('../src/ui/lookSheets', async (original) => ({
    ...(await original<typeof import('../src/ui/lookSheets')>()),
    askForLookSheet: vi.fn(),
    lookSheetState: vi.fn((url: string) => sheetStates.get(url)),
}));

const { renderStall } = await import('../src/ui/render');
const copy = await import('../src/ui/copy');
const { attachmentsForLook, decodeLook, lookSheetOf } = await import('../src/domain/lookTable');
const { DEFAULT_THEME_ID, PAID_LOOK_IDS, SHIPPED_THEMES } = await import('../src/domain/theme');
const {
    HARNESS_LICENCE,
    SKELETON_LOOK_ID,
    flagsOf,
    galleryLooks,
    harnessGateFaults,
    lookById,
    looksFor,
    measuredLooks,
    paintView,
    privateLooks,
    shippedLooks,
    wornAllFlags,
    wornOf,
} = await import('./looks');
const { SCREENS, handlers } = await import('./fixtures');
const { wornSheetsOf } = await import('./wornSheet');
const { WORN_ALL, contrastOwed, contrastPlan } = await import('./contrastPlan');
const { diffPlan, shotPlan } = await import('./shotPlan');

const FIXTURE_ID = 0x04;

afterEach(() => {
    sheetStates.clear();
    document.body.replaceChildren();
});

/** Paint `view` into a fresh root; the stall's look classes and its text. */
function painted(view: Parameters<typeof renderStall>[1]): { looks: string[]; classes: string[]; text: string } {
    const root = document.createElement('div');
    document.body.append(root);
    renderStall(root, view, handlers);
    const stall = root.querySelector('.stall:not(.deck-stall)')!;
    const classes = [...stall.classList];
    return { looks: classes.filter((cls) => cls.startsWith('t-')), classes, text: root.textContent ?? '' };
}

describe('the-harness-measures-the-private-looks-a-build-carries', () => {
    it('reads each carried look through the app’s own table, with its built sheet, beside the shipped looks', () => {
        const [fixture, ...more] = privateLooks();
        expect(more).toEqual([]);
        expect(fixture!.id).toBe(FIXTURE_ID);
        // The app's own row and rows, by reference: what the renderer paints.
        expect(fixture!.theme).toBe(decodeLook(FIXTURE_ID));
        expect(fixture!.rows).toEqual(attachmentsForLook(FIXTURE_ID));
        for (const [i, row] of fixture!.rows.entries()) {
            expect(row).toBe(attachmentsForLook(FIXTURE_ID)[i]);
        }
        expect(fixture!.theme.sheetClass).toBe('t-fixture-private');
        expect(fixture!.sheetUrl).toBe(lookSheetOf(fixture!.theme)!.url);
        expect(fixture!.carried).toBe('private');
        // Measured beside the shipped looks and before the skeleton; offered
        // in the showroom; never on the door, which wears the default alone.
        expect(measuredLooks().map((look) => look.id)).toEqual([...SHIPPED_THEMES.map((row) => row.id), FIXTURE_ID, SKELETON_LOOK_ID]);
        expect(galleryLooks().map((look) => look.id)).toEqual([...SHIPPED_THEMES.map((row) => row.id), FIXTURE_ID]);
        expect(lookById(FIXTURE_ID)).toBe(fixture);
        expect(looksFor('offers')).toContain(fixture);
        expect(looksFor('door')).not.toContain(fixture);
        expect(shippedLooks().map((look) => look.id)).toEqual(SHIPPED_THEMES.map((row) => row.id));
        // Its sheet is loaded before the first paint, through the app's loader.
        expect(wornSheetsOf(measuredLooks())).toEqual([{ url: fixture!.sheetUrl, cls: 't-fixture-private' }]);
        // Two moods' worth of all-worn states only when it has two moods.
        expect(wornAllFlags(fixture!)).toEqual([0xffff]);
    });

    it('holds an explicit licence for every paid look it carries, and the app’s gate answers it', () => {
        expect(PAID_LOOK_IDS).toContain(FIXTURE_ID);
        expect([...HARNESS_LICENCE]).toEqual([FIXTURE_ID]);
        expect(harnessGateFaults()).toEqual([]);
    });

    it('plans contrast, diff and shot jobs for the carried look, and leaves the shipped plan as it was', () => {
        const fixture = lookById(FIXTURE_ID);
        const jobs = contrastPlan(measuredLooks());
        const mine = jobs.filter((job) => job.look === FIXTURE_ID);
        const theirs = jobs.filter((job) => job.look !== FIXTURE_ID);
        // The public run's plan, unchanged by value (`the-contrast-plan-is-every-job-the-pass-owes`).
        expect(theirs.map((job) => job.key)).toEqual(contrastPlan([...shippedLooks(), lookById(SKELETON_LOOK_ID)]).map((job) => job.key));
        expect(theirs.length).toBe(557);
        // Every screen the skeleton is sampled on, bare and all worn: the look
        // has rows, and carries neither the rain nor the horizon nor a moving price.
        const skeletonCells = jobs.filter((job) => job.look === SKELETON_LOOK_ID).map((job) => `${job.viewport}/${job.screen}`);
        expect([...new Set(mine.map((job) => `${job.viewport}/${job.screen}`))]).toEqual(skeletonCells);
        expect(mine.every((job) => job.sheetClass === 't-fixture-private')).toBe(true);
        expect(new Set(mine.map((job) => job.flags))).toEqual(new Set([0, WORN_ALL]));
        expect(contrastOwed([fixture])).toEqual({ rain: [], horizon: [] });
        // looks:diff compares it on both sides when a run selects it.
        const diff = diffPlan([...shippedLooks(), ...privateLooks()]);
        expect(diff.filter((job) => job.look === FIXTURE_ID).length).toBeGreaterThan(0);
        expect(diff.filter((job) => job.look !== FIXTURE_ID).map((job) => job.file)).toEqual(diffPlan(shippedLooks()).map((job) => job.file));
        // And workshop:shots shoots it, every mood alone and with the dress.
        const shots = shotPlan(fixture);
        expect(shots.some((job) => job.variant === 'mood-fixture-dusk')).toBe(true);
        expect(shots.some((job) => job.variant === 'worn-fixture-dusk')).toBe(true);
    });
});

describe('a-paid-look-is-measured-under-the-harness-licence-and-the-gate-is-untouched', () => {
    const base = SCREENS['offers']!;

    it('puts a carried paid look on screen through the try-on, with its sheet as the loader holds it', () => {
        const fixture = lookById(FIXTURE_ID);
        const worn = wornOf(fixture, 0xffff);
        const view = paintView(base, fixture, worn);
        // The try-on, never the record: a record naming it would paint the default.
        expect(view.recordTheme).toBe(base.recordTheme);
        expect(view.previewLook).toEqual({ themeId: FIXTURE_ID, attachmentFlags: flagsOf(worn) });
        expect(view.worn).toEqual(worn);
        // The loader has not answered: the renderer holds the look back, and
        // the stall paints its own (the fixture's record: the default).
        expect(view.lookSheets?.get(FIXTURE_ID)).toBe('pending');
        const held = painted(view);
        expect(held.looks).toEqual(['t-modern']);
        // Failed is held back the same way.
        sheetStates.set(fixture.sheetUrl!, 'failed');
        expect(painted(paintView(base, fixture, worn)).looks).toEqual(['t-modern']);
        // Ready: the look, every row of the dress, and no word that it is locked.
        sheetStates.set(fixture.sheetUrl!, 'ready');
        const ready = paintView(base, fixture, worn);
        expect(ready.lookSheets?.get(FIXTURE_ID)).toBe('ready');
        const shown = painted(ready);
        expect(shown.looks).toEqual(['t-fixture-private']);
        for (const row of worn.filter((r) => r.paint === 'root' || r.slot === 'mood')) {
            if (row.cls !== undefined) expect(shown.classes, row.label).toContain(row.cls);
        }
        // The unminted crest paints too: looking is free.
        expect(worn.some((row) => row.tokenId === undefined)).toBe(true);
        expect(shown.text).not.toContain(copy.THEME_NOT_UNLOCKED);
    });

    it('leaves the record road gated: a record naming the paid look paints the default, wears none of it and says so', () => {
        const fixture = lookById(FIXTURE_ID);
        sheetStates.set(fixture.sheetUrl!, 'ready');
        const record = painted({
            ...base,
            recordTheme: fixture.theme,
            recordFlags: 0xffff,
            worn: [],
            lookSheets: new Map([[FIXTURE_ID, 'ready']]),
        });
        expect(record.looks).toEqual([lookById(DEFAULT_THEME_ID).theme.sheetClass]);
        for (const row of fixture.rows) {
            if (row.cls !== undefined) expect(record.classes).not.toContain(row.cls);
        }
        expect(record.text).toContain(copy.THEME_NOT_UNLOCKED);
        // And the harness's own gate check reads the same gate.
        expect(harnessGateFaults()).toEqual([]);
        expect(
            harnessGateFaults([{ ...fixture, theme: { ...fixture.theme, id: DEFAULT_THEME_ID } }]).length,
            'a look the gate does not lock is said',
        ).toBeGreaterThan(0);
    });

    it('rides the record for a shipped look, exactly as before', () => {
        const modern = lookById(DEFAULT_THEME_ID);
        const worn = wornOf(modern, 0xffff);
        expect(paintView(base, modern, worn)).toEqual({ ...base, recordTheme: modern.theme, worn });
    });

    it('refuses a dress the try-on cannot paint', () => {
        const fixture = lookById(FIXTURE_ID);
        const trim = fixture.rows.find((row) => row.slot === 'trim')!;
        // A second row in the trim's slot, under a bit no row of the table has.
        expect(() => paintView(base, fixture, [trim, { ...trim, bit: 9, label: 'Second trim' }])).toThrow(/at most one row per slot/);
    });
});
