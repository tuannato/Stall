// @vitest-environment happy-dom
import { encodeCashAddress } from 'ecashaddrjs';
import { fromHex, shaRmd160, toHex } from 'ecash-lib';
import { describe, expect, it, vi } from 'vitest';
import type { StallView } from '../domain/state';

/**
 * The hold on screen for a RECORD's look (step 8d2; STEP-8-PLAN §3): what
 * the renderer paints for a record naming a worn-only look whose sheet has
 * not loaded on this page — still on its way, or failed — and what the
 * Studio and the name sheet say about it. Step 8's only private look is paid
 * and never licensed, so no record paints it (`paintableLook`); this file
 * plants the theme table with the tracked fixture's id FREE, the one road on
 * which a record's own worn-only look reaches the renderer, as a free private
 * look or a licensed paid one will. The sheet's state is the view's
 * (`view.lookSheets`, written by the app at paint time); the renderer's own
 * ask for a ready look is recorded rather than sent.
 */
vi.mock('virtual:stall-private-looks', async () =>
    (await import('../../layout/fixturePrivateLooks')).fixturePrivateLooksModule(),
);
vi.mock('../domain/theme', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../domain/theme')>()),
    PAID_LOOK_IDS: Object.freeze([]),
    FREE_PRIVATE_LOOK_IDS: Object.freeze([0x04]),
}));
vi.mock('./lookSheets', async (original) => ({
    ...(await original<typeof import('./lookSheets')>()),
    askForLookSheet: vi.fn(),
}));

const { renderStall } = await import('./render');
const copy = await import('./copy');
const { decodeLook, mintedLookTokens, paintableLook } = await import('../domain/lookTable');
const { DEFAULT_THEME, themeVars } = await import('../domain/theme');
const { encodeManifestHex } = await import('../domain/manifest');

const FIXTURE_ID = 0x04;
/** Nobody holds this key: a byte pattern, not a wallet. */
const PK = `02${'11'.repeat(32)}`;
const ADDR = encodeCashAddress('ecash', 'p2pkh', toHex(shaRmd160(fromHex(PK))));

function handlers() {
    return new Proxy({} as Record<string, ReturnType<typeof vi.fn>>, {
        get: (target, name: string) => (target[name] ??= vi.fn()),
    });
}

function paint(view: StallView): HTMLElement {
    const root = document.createElement('div');
    document.body.append(root);
    renderStall(root, view, handlers() as never);
    return root;
}

/** A stall whose record names the fixture look — free here — with its trim and its mood, both held, and its sheet where `sheet` says. */
function inkStall(sheet: 'ready' | 'pending' | 'failed' | undefined, over: Partial<StallView> = {}): StallView {
    const theme = decodeLook(FIXTURE_ID);
    const held = mintedLookTokens();
    return {
        route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
        overlay: { kind: 'idle' },
        tokens: new Map(),
        address: ADDR,
        fetch: { kind: 'empty' },
        stallName: 'Ink stall',
        recordTheme: theme,
        recordFlags: 0b11,
        heldTokens: held,
        worn: paintableLook(theme, 0b11, held).worn,
        ...(sheet === undefined ? {} : { lookSheets: new Map([[FIXTURE_ID, sheet]]) }),
        ...over,
    };
}

const stallOf = (root: HTMLElement) => root.querySelector('.stall') as HTMLElement;
const notes = (root: HTMLElement) => [...root.querySelectorAll('.stall-body > p.fine')].map((p) => p.textContent);
const decor = (root: HTMLElement) => [...stallOf(root).classList].filter((cls) => cls.startsWith('att-'));
const WALL = { window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false } } as const;
const OVERLAY = {
    broadcast: { preset: 'corner', mode: 'rail', transparent: false, cards: 'listings', side: 'right', edge: 'bottom' },
    broadcastState: 'live',
} as const;

/**
 * A record's look paints once its sheet is ready on this page, and not
 * before: still on its way, or never asked for, the stall paints the default
 * and says nothing yet. The positive control for the cases below.
 */
describe('a-stall-in-a-worn-only-look-paints-once-its-sheet-has-loaded', () => {
    it('paints the look, its decorations and its palette once its sheet is ready', () => {
        expect(paintableLook(decodeLook(FIXTURE_ID), 0b11, mintedLookTokens()).why, 'free in this file').toBeUndefined();
        const root = paint(inkStall('ready'));
        const stall = stallOf(root);
        expect(stall.classList.contains('t-fixture-private')).toBe(true);
        expect(decor(root)).toContain('att-fixture-trim');
        expect(stall.style.getPropertyValue('--s-bg')).not.toBe(themeVars(DEFAULT_THEME)['--s-bg']);
        expect(notes(root)).toEqual([]);
        root.remove();
    });

    it('paints the default and says nothing while the sheet is on its way, or not asked for', () => {
        for (const sheet of ['pending', undefined] as const) {
            const root = paint(inkStall(sheet));
            expect(stallOf(root).classList.contains('t-modern'), String(sheet)).toBe(true);
            expect(stallOf(root).classList.contains('t-fixture-private'), String(sheet)).toBe(false);
            expect(notes(root), String(sheet)).toEqual([]);
            root.remove();
        }
    });
});

/**
 * A record's look whose sheet failed on this page paints the default — the
 * default's own palette, no class of the look — and says so on the shop, in
 * words about this page (`THEME_SHEET_UNLOADED`), never the unknown-look or
 * not-unlocked sentence. The wall and the stream overlay paint the default
 * too and say nothing. Red: the failure branch in `settingsNotes` dropped;
 * the hold in `paintedTheme` removed (the look's class on with no sheet).
 */
describe('a-look-sheet-that-does-not-load-paints-the-default-and-says-so', () => {
    it('paints the default on the shop and the Studio, and says why', () => {
        for (const panel of [undefined, 'studio' as const]) {
            const root = paint(inkStall('failed', panel === undefined ? {} : { panel }));
            const stall = stallOf(root);
            expect(stall.classList.contains('t-modern')).toBe(true);
            expect(stall.classList.contains('t-fixture-private')).toBe(false);
            expect(stall.style.getPropertyValue('--s-bg')).toBe(themeVars(DEFAULT_THEME)['--s-bg']);
            expect(notes(root)).toContain(copy.THEME_SHEET_UNLOADED);
            expect(root.textContent).not.toContain(copy.THEME_UNKNOWN);
            expect(root.textContent).not.toContain(copy.THEME_NOT_UNLOCKED);
            root.remove();
        }
    });

    it('paints the default on the wall and the overlay, and says nothing there', () => {
        for (const [what, over, selector] of [
            ['the wall', WALL, '.stall.shop-window'],
            ['the overlay', OVERLAY, '.stall.broadcast'],
        ] as const) {
            const root = paint(inkStall('failed', over as Partial<StallView>));
            const stall = root.querySelector(selector) as HTMLElement | null;
            expect(stall, what).not.toBeNull();
            expect(stall!.classList.contains('t-modern'), what).toBe(true);
            expect(stall!.classList.contains('t-fixture-private'), what).toBe(false);
            expect(root.textContent, what).not.toContain(copy.THEME_SHEET_UNLOADED);
            root.remove();
            // And once the sheet is ready, the look is on there too.
            const ready = paint(inkStall('ready', over as Partial<StallView>));
            expect((ready.querySelector(selector) as HTMLElement).classList.contains('t-fixture-private'), what).toBe(true);
            ready.remove();
        }
    });
});

/**
 * A look held back for its sheet wears none of its rows — its flags are bits
 * of its own table, so none of the default's either — on the shop, the wall
 * and the overlay (a mood is the overlay's one decoration, as palette), and
 * places no decoration node. Red: the worn set left on the view the hold
 * hands down (`asThisPagePaints`).
 */
describe('a-look-that-did-not-load-wears-none-of-its-rows', () => {
    it('wears nothing while held, on every surface, and its rows once ready', () => {
        expect(inkStall('failed').worn?.length, 'the record does wear rows').toBe(2);
        for (const sheet of ['failed', 'pending'] as const) {
            for (const over of [{}, WALL, OVERLAY]) {
                const root = paint(inkStall(sheet, over as Partial<StallView>));
                expect(decor(root), `${sheet}`).toEqual([]);
                expect(root.querySelector('.stall [class^="att-"], .stall [class*=" att-"]'), `${sheet}: no decoration node`).toBeNull();
                expect(stallOf(root).style.getPropertyValue('--s-bg'), `${sheet}: no mood's palette`).toBe(
                    themeVars(DEFAULT_THEME)['--s-bg'],
                );
                root.remove();
            }
        }
        const ready = paint(inkStall('ready'));
        expect(decor(ready)).toContain('att-fixture-trim');
        ready.remove();
    });
});

/**
 * Held back, the look is the page's state and not the seller's choice: the
 * Studio's Wearing row says the look has not loaded on this page — never
 * "Nothing worn" — and reads the record back by name; the name sheet opens on
 * the record's look and its decorations, says the look did not load, and
 * still composes the record, since the record is about the stall and the
 * sheet about this page. Red: the held branch in `wearingRow` dropped (the
 * row says nothing is worn); the name sheet's line dropped.
 */
describe('a-look-that-did-not-load-is-not-called-wearing-nothing', () => {
    it('says on the Wearing row that the look has not loaded, while held either way', () => {
        for (const sheet of ['failed', 'pending'] as const) {
            const root = paint(inkStall(sheet, { panel: 'studio' }));
            const row = root.querySelector('[data-role="studio-wearing-row"]')!;
            expect(row.textContent, sheet).toContain(copy.STUDIO_WEARING_NOT_LOADED);
            expect(row.textContent, sheet).not.toContain(copy.STUDIO_WEARING_NONE);
            expect(root.querySelector('[data-role="studio-look-row"]')?.textContent, sheet).toContain('Fixture private look');
            root.remove();
        }
        const ready = paint(inkStall('ready', { panel: 'studio' }));
        expect(ready.querySelector('[data-role="studio-wearing-row"]')!.textContent).not.toContain(copy.STUDIO_WEARING_NOT_LOADED);
        ready.remove();
    });

    it('opens the name sheet on the record’s look, says it did not load, and still composes the record', () => {
        const root = paint(inkStall('failed', { overlay: { kind: 'publish-name' } }));
        const pressed = root.querySelector('[data-role="theme-picker"] [aria-pressed="true"]');
        expect(pressed?.getAttribute('data-theme-id')).toBe(String(FIXTURE_ID));
        expect(root.querySelector('[data-role="decor-trim-0"]')?.getAttribute('aria-pressed')).toBe('true');
        const status = root.querySelector('[data-role="look-status"]') as HTMLElement;
        expect(status.hidden).toBe(false);
        expect(status.textContent).toBe(copy.PUBLISH_LOOK_UNLOADED);
        expect((root.querySelector('[data-role="publish-hex"]') as HTMLElement).textContent).toBe(
            encodeManifestHex('Ink stall', FIXTURE_ID, 0b11),
        );
        root.remove();
        const ready = paint(inkStall('ready', { overlay: { kind: 'publish-name' } }));
        expect((ready.querySelector('[data-role="look-status"]') as HTMLElement).hidden).toBe(true);
        ready.remove();
    });
});

/**
 * The door paints no stall's look (`a-look-the-door-does-not-paint-costs-the-
 * door-nothing`), here over a record that WOULD paint: the fixture is free in
 * this file and its sheet is ready, and the door still wears the default's
 * values and asks for nothing. Red: the door rule in `paintedOnThisPage`
 * removed. (`render.private.test.ts` holds the try-on half.)
 */
describe('a-look-the-door-does-not-paint-costs-the-door-nothing', () => {
    it('paints the door bare under a record whose look could paint, and asks for no sheet', async () => {
        const { askForLookSheet } = await import('./lookSheets');
        const ask = vi.mocked(askForLookSheet);
        ask.mockClear();
        const root = paint(inkStall('ready', { route: { kind: 'home' } }));
        const stall = stallOf(root);
        expect(stall.classList.contains('door')).toBe(true);
        expect([...stall.classList].filter((cls) => cls.startsWith('t-') || cls.startsWith('att-'))).toEqual([]);
        expect(stall.style.getPropertyValue('--s-bg')).toBe(themeVars(DEFAULT_THEME)['--s-bg']);
        expect(ask).not.toHaveBeenCalled();
        root.remove();
    });
});
