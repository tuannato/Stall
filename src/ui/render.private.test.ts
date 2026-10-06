// @vitest-environment happy-dom
import { encodeCashAddress } from 'ecashaddrjs';
import { fromHex, shaRmd160, toHex } from 'ecash-lib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StallView } from '../domain/state';

/**
 * The paid gate on screen (step 8b2, the step-8 critic's item 3), over the
 * tracked private-look fixture: the module a build hands the app when it
 * selects `layout/fixture-private-looks` at `preview`, mocked because a
 * vitest run never selects one. The fixture is the real reserved, paid id
 * `0x04`, with a minted trim, a minted mood and an unminted crest. Step 8
 * has no licence check, so no stall is ever licensed for it.
 */
vi.mock('virtual:stall-private-looks', async () =>
    (await import('../../layout/fixturePrivateLooks')).fixturePrivateLooksModule(),
);

/*
 * The renderer's ask for a worn-only sheet (8d1), recorded rather than
 * sent: a try-on of the fixture look asks for its sheet, and a connected
 * stylesheet link is a request no test may make
 * (`no-test-reaches-the-network`). The loader itself is
 * `lookSheets.test.ts`'s.
 */
vi.mock('./lookSheets', async (original) => ({
    ...(await original<typeof import('./lookSheets')>()),
    askForLookSheet: vi.fn(),
}));

const { renderStall } = await import('./render');
const { askForLookSheet, LOOK_SHEET_PROPERTY, LOOK_SHEET_WAIT_MS, loadLookSheet, resetLookSheetsForTests } =
    await import('./lookSheets');
const { resetMarqueesForTests, setMarqueeMeasure } = await import('./marquee');
const { fixturePrivateLooks } = await import('../../layout/fixturePrivateLooks');
const copy = await import('./copy');
const { decodeLook, mintedLookTokens, paintableLook } = await import('../domain/lookTable');
const { DEFAULT_THEME, DEFAULT_THEME_ID, themeVars } = await import('../domain/theme');
const { attachmentsForTheme } = await import('../domain/attachments');
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

function paint(view: StallView) {
    const root = document.createElement('div');
    document.body.append(root);
    const h = handlers();
    renderStall(root, view, h as never);
    return { root, h };
}

/**
 * A stall whose published record names the fixture look with every flag
 * set, and whose address holds every token the merged catalogue can be
 * entitled by — the fixture's own and every shipped one — with `worn` as
 * the app computes it, through the gate.
 */
function locked(over: Partial<StallView> = {}): StallView {
    const theme = decodeLook(FIXTURE_ID);
    const held = mintedLookTokens();
    return {
        route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
        overlay: { kind: 'idle' },
        tokens: new Map(),
        address: ADDR,
        fetch: { kind: 'empty' },
        stallName: 'Locked look',
        recordTheme: theme,
        recordFlags: 0xffff,
        heldTokens: held,
        worn: paintableLook(theme, 0xffff, held).worn,
        ...over,
    };
}

const stallOf = (root: HTMLElement) => root.querySelector('.stall') as HTMLElement;

/** The fixture look's built sheet, as the look table hands it to the loader. */
const FIXTURE_SHEET = () => ({ url: fixturePrivateLooks()[0]!.sheetUrl, cls: 't-fixture-private' });

/**
 * The page's worn-only sheets, held rather than sent (8d2): the head records
 * every link the loader appends and connects none — a connected stylesheet
 * link is a request, and no test reaches the network — and a test answers
 * each link as a browser would, `load` with the sheet or `error`, the way
 * `lookSheets.test.ts` does. A fresh page per test: the loader keeps a
 * page's sheets for its life, and these tests share one document.
 */
let sheetHead: { links: () => HTMLLinkElement[]; restore: () => void } | undefined;
function holdSheets(): () => HTMLLinkElement[] {
    sheetHead?.restore();
    resetLookSheetsForTests(document);
    const holder = document.createElement('div');
    const append = vi.spyOn(document.head, 'append').mockImplementation((...nodes) => holder.append(...nodes));
    sheetHead = {
        links: () => [...holder.querySelectorAll('link')],
        restore: () => {
            append.mockRestore();
            resetLookSheetsForTests(document);
        },
    };
    return sheetHead.links;
}
afterEach(() => {
    sheetHead?.restore();
    sheetHead = undefined;
});

/** Answer `link` as a browser would: `load` with the fixture's sheet, or `error`. */
function answer(link: HTMLLinkElement, how: 'sheet' | 'error'): void {
    if (how === 'error') {
        link.dispatchEvent(new Event('error'));
        return;
    }
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`.t-fixture-private { ${LOOK_SHEET_PROPERTY}: t-fixture-private; }`);
    Object.defineProperty(link, 'sheet', { value: sheet, configurable: true });
    link.dispatchEvent(new Event('load'));
}

/** The fixture's sheet on the page, ready: what a try-on finds once it has loaded. */
async function fixtureSheetReady(links: () => HTMLLinkElement[]): Promise<void> {
    const done = loadLookSheet(FIXTURE_SHEET().url, FIXTURE_SHEET().cls, document);
    answer(links().at(-1)!, 'sheet');
    await done;
}

/** Let the loader's answers and the waits behind them land. */
async function settle(): Promise<void> {
    for (let i = 0; i < 4; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}

const pressLook = (root: HTMLElement, id: number): void => {
    root.querySelector<HTMLButtonElement>(`[data-role="look-${id}"]`)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};
const notes = (root: HTMLElement) => [...root.querySelectorAll('.stall-body > p.fine')].map((p) => p.textContent);

describe('a-locked-look-paints-the-default-and-says-this-page-does-not-show-it', () => {
    it('paints the default look whole, wears nothing, and says why — never the unknown-look sentence', () => {
        expect(decodeLook(FIXTURE_ID).known, 'the fixture is in this build').toBe(true);
        for (const panel of [undefined, 'studio' as const]) {
            const { root } = paint(locked(panel === undefined ? {} : { panel }));
            const stall = stallOf(root);
            expect(stall.classList.contains('t-modern')).toBe(true);
            expect(stall.classList.contains('t-fixture-private')).toBe(false);
            expect([...stall.classList].filter((cls) => cls.startsWith('att-'))).toEqual([]);
            expect(stall.style.getPropertyValue('--s-bg')).toBe(themeVars(DEFAULT_THEME)['--s-bg']);
            expect(notes(root)).toContain(copy.THEME_NOT_UNLOCKED);
            expect(root.textContent).not.toContain(copy.THEME_UNKNOWN);
            root.remove();
        }
    });

    it('paints the default on the wall and on the stream overlay too', () => {
        // The two unattended surfaces (the 8b2 critic's item 1, plant A): a
        // branch that painted the record's look there would wear the paid
        // look's class and its own ground.
        const fixtureBg = themeVars(decodeLook(FIXTURE_ID))['--s-bg'];
        expect(fixtureBg, 'the fixture look has a ground of its own').not.toBe(themeVars(DEFAULT_THEME)['--s-bg']);
        for (const [what, over, selector] of [
            ['the wall', { window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false } }, '.stall.shop-window'],
            [
                'the overlay',
                { broadcast: { preset: 'corner', mode: 'rail', transparent: false, cards: 'listings', side: 'right', edge: 'bottom' }, broadcastState: 'live' },
                '.stall.broadcast',
            ],
        ] as const) {
            const { root } = paint(locked(over as Partial<StallView>));
            const stall = root.querySelector(selector) as HTMLElement | null;
            expect(stall, `${what} painted`).not.toBeNull();
            expect(stall!.classList.contains('t-modern'), what).toBe(true);
            expect(stall!.classList.contains('t-fixture-private'), what).toBe(false);
            expect([...stall!.classList].filter((cls) => cls.startsWith('att-')), what).toEqual([]);
            expect(stall!.style.getPropertyValue('--s-bg'), what).toBe(themeVars(DEFAULT_THEME)['--s-bg']);
            root.remove();
        }
    });

    it('says on the Wearing row that this page does not show the look yet, never that nothing was chosen', () => {
        const { root } = paint(locked({ panel: 'studio' }));
        const row = root.querySelector('[data-role="studio-wearing-row"]')!;
        expect(row.textContent).toContain(copy.STUDIO_WEARING_NOT_UNLOCKED);
        expect(row.textContent).not.toContain(copy.STUDIO_WEARING_NONE);
        expect(row.textContent).not.toContain(copy.DECOR_ROW_UNKNOWN);
        // The record is read back as written: it names the fixture look.
        expect(root.querySelector('[data-role="studio-look-row"]')?.textContent).toContain('Fixture private look');
        root.remove();
    });

    it('lets the same look painted from a licence-free row through, as a free look', () => {
        // The gate is the paid list's: the default look with every flag is
        // a free look and wears what it holds, as before.
        const theme = decodeLook(DEFAULT_THEME_ID);
        const held = mintedLookTokens();
        const worn = paintableLook(theme, 0xffff, held).worn;
        expect(worn.length).toBeGreaterThan(0);
        const { root } = paint(locked({ recordTheme: theme, worn }));
        expect(notes(root)).toEqual([]);
        root.remove();
    });
});

/**
 * A locked record's flags are bits of the PAID look's table, and the sheet
 * opens on the default that record paints (the 8b2 critic's item 1, plant C;
 * PROPOSAL §6.3): seeded from the record's flags, the chips would press the
 * default's rows those bits happen to name — bit 1 is Modern's Pinstripe —
 * and a republish would sign a permanent default record wearing a
 * decoration the seller never chose. So no chip is pressed, and the record
 * composed carries no flags field at all.
 */
describe('a-locked-record-lends-no-bit-to-the-default-it-paints', () => {
    it('opens with no chip pressed and composes the default with no flags', () => {
        const modern = attachmentsForTheme(DEFAULT_THEME_ID);
        const flags = modern.reduce((all, row) => all | (1 << row.bit), 0);
        expect(flags, 'the default has rows those bits name').not.toBe(0);
        const { root } = paint(
            locked({ recordFlags: flags, stallName: 'Locked look', overlay: { kind: 'publish-name' } }),
        );
        const pressed = root.querySelector('[data-role="theme-picker"] [aria-pressed="true"]');
        expect(pressed?.getAttribute('data-theme-id')).toBe(String(DEFAULT_THEME_ID));
        expect(root.querySelectorAll('[data-role^="decor-"] [aria-pressed="true"]').length, 'no chip pressed').toBe(0);
        const input = root.querySelector('[data-role="publish-name"]') as HTMLInputElement;
        expect(input.value).toBe('Locked look');
        const hex = (root.querySelector('[data-role="publish-hex"]') as HTMLElement).textContent;
        expect(hex).toBe(encodeManifestHex('Locked look', DEFAULT_THEME_ID, 0));
        root.remove();
    });
});

describe('a-paid-look-composes-no-record-until-it-can-be-bought', () => {
    const sheet = (over: Partial<StallView> = {}) =>
        paint({
            route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
            tokens: new Map(),
            address: ADDR,
            fetch: { kind: 'empty' },
            stallName: 'A stall',
            overlay: { kind: 'publish-name' },
            ...over,
        });
    const parts = (root: HTMLElement) => ({
        web: root.querySelector('[data-role="publish-cashtab"]') as HTMLAnchorElement,
        pay: root.querySelector('[data-role="publish-pay"]') as HTMLAnchorElement,
        hex: root.querySelector('[data-role="publish-hex"]') as HTMLElement,
        summary: root.querySelector('[data-role="publish-summary"]') as HTMLElement,
        err: root.querySelector('[data-role="publish-invalid"]') as HTMLElement,
        qr: root.querySelector('[data-role="publish-qr"]') as HTMLElement,
    });
    const press = (root: HTMLElement, id: number) =>
        root.querySelector<HTMLButtonElement>(`[data-role="look-${id}"]`)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const composesNothing = (root: HTMLElement) => {
        const p = parts(root);
        for (const link of [p.web, p.pay]) {
            expect(link.hasAttribute('href'), 'no link carries a record').toBe(false);
            expect(link.getAttribute('aria-disabled')).toBe('true');
        }
        expect(p.hex.textContent).toBe('');
        expect(p.summary.hidden).toBe(true);
        expect(p.qr.querySelector('svg')).toBeNull();
        expect(p.err.hidden).toBe(false);
        expect(p.err.textContent).toBe(copy.PUBLISH_LOOK_NOT_UNLOCKED);
    };

    // The fixture's sheet has loaded: a try-on of it goes on at the press
    // (the wait itself is `a-try-on-waits-for-its-sheet-and-the-latest-press-wins`).
    beforeEach(async () => {
        await fixtureSheetReady(holdSheets());
    });

    it('offers the paid look, tries it on, and composes nothing that names it', () => {
        const { root, h } = sheet();
        expect(root.querySelector(`[data-role="look-${FIXTURE_ID}"]`)?.textContent).toBe('Fixture private look');
        expect(parts(root).web.hasAttribute('href'), 'the default composes').toBe(true);
        press(root, FIXTURE_ID);
        // Tried on: the stall behind wears the look, and the app is told.
        expect(stallOf(root).classList.contains('t-fixture-private')).toBe(true);
        expect(h['onPreviewLook']).toHaveBeenLastCalledWith({ themeId: FIXTURE_ID, attachmentFlags: 0 });
        composesNothing(root);
        // Its decorations are offered and tried on too, and still nothing composes.
        root.querySelector<HTMLButtonElement>('[data-role="decor-trim-0"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(stallOf(root).classList.contains('att-fixture-trim')).toBe(true);
        composesNothing(root);
        // Back to a free look: it composes again.
        press(root, DEFAULT_THEME_ID);
        expect(parts(root).web.hasAttribute('href')).toBe(true);
        expect(parts(root).err.hidden).toBe(true);
        root.remove();
    });

    it('opens on the default a locked record paints, and the locked look is a try-on from there', () => {
        const theme = decodeLook(FIXTURE_ID);
        const { root, h } = sheet({ recordTheme: theme, recordFlags: 0b11, heldTokens: mintedLookTokens(), worn: [] });
        const pressed = root.querySelector('[data-role="theme-picker"] [aria-pressed="true"]');
        expect(pressed?.getAttribute('data-theme-id'), 'the pressed look is the painted one').toBe(String(DEFAULT_THEME_ID));
        expect(parts(root).web.hasAttribute('href'), 'republishing the default composes').toBe(true);
        press(root, FIXTURE_ID);
        expect(h['onPreviewLook']).toHaveBeenLastCalledWith({ themeId: FIXTURE_ID, attachmentFlags: 0 });
        composesNothing(root);
        press(root, DEFAULT_THEME_ID);
        // Choosing what the record paints is no try-on.
        expect(h['onPreviewLook']).toHaveBeenLastCalledWith(undefined);
        root.remove();
    });

    it('paints a try-on of the very look and flags a locked record names', () => {
        // What the record paints is the default with no flag, so a try-on
        // that names the record's own look and flags is a try-on — compared
        // against the record's id instead, it read as "no try-on" and the
        // stall stayed on the default under the seller's press.
        const theme = decodeLook(FIXTURE_ID);
        const { root } = paint(
            locked({
                recordFlags: 0b1,
                previewLook: { themeId: FIXTURE_ID, attachmentFlags: 0b1 },
                lookSheets: new Map([[FIXTURE_ID, 'ready']]),
            }),
        );
        const stall = stallOf(root);
        expect(theme.known).toBe(true);
        expect(stall.classList.contains('t-fixture-private')).toBe(true);
        expect(stall.classList.contains('att-fixture-trim')).toBe(true);
        root.remove();
    });

    it('paints a try-on of the locked look on every later paint, decorations included', () => {
        const { root } = paint({
            route: { kind: 'pubkey', pubkeyHex: PK, address: ADDR },
            overlay: { kind: 'idle' },
            tokens: new Map(),
            address: ADDR,
            fetch: { kind: 'empty' },
            previewLook: { themeId: FIXTURE_ID, attachmentFlags: 0b1 },
            lookSheets: new Map([[FIXTURE_ID, 'ready']]),
        });
        const stall = stallOf(root);
        expect(stall.classList.contains('t-fixture-private')).toBe(true);
        expect(stall.classList.contains('att-fixture-trim')).toBe(true);
        root.remove();
    });
});

/**
 * The renderer asks for a worn-only sheet for the row it paints, and only
 * that row (8d1, `applyTheme`): a try-on of the fixture look asks for the
 * fixture's built sheet on the stall's own document, and once it has loaded
 * every paint that puts it on asks again (the same answer, no second link);
 * a record naming the locked look paints the default, a shipped look whose
 * sheet is in the entry CSS, and asks for nothing; and nothing is asked for
 * a public look. Since 8d2 the try-on waits for its sheet: the look is not on
 * the stall until it has loaded (`a-try-on-waits-for-its-sheet-and-the-latest-press-wins`).
 */
describe('a-try-on-asks-for-its-sheet-and-a-locked-look-for-none', () => {
    const ask = vi.mocked(askForLookSheet);
    const SHEET = FIXTURE_SHEET();

    it('asks for nothing over a locked record, on the shop, the Studio, the wall and the overlay', () => {
        const links = holdSheets();
        ask.mockClear();
        for (const over of [
            {},
            { panel: 'studio' as const },
            { window: { show: 'listings', mode: 'cycle', payCode: true, turn: 'none', touch: false } },
            {
                broadcast: { preset: 'corner', mode: 'rail', transparent: false, cards: 'listings', side: 'right', edge: 'bottom' },
                broadcastState: 'live',
            },
        ]) {
            const { root } = paint(locked(over as Partial<StallView>));
            root.remove();
        }
        expect(ask).not.toHaveBeenCalled();
        expect(links(), 'no sheet on the page').toEqual([]);
    });

    it('asks for nothing for a public look', () => {
        const links = holdSheets();
        ask.mockClear();
        const { root } = paint(locked({ recordTheme: decodeLook(DEFAULT_THEME_ID), worn: [] }));
        root.remove();
        expect(ask).not.toHaveBeenCalled();
        expect(links()).toEqual([]);
    });

    it('asks for the fixture’s sheet when it is tried on, and every paint that puts it on asks again', async () => {
        const links = holdSheets();
        ask.mockClear();
        const { root } = paint(locked({ overlay: { kind: 'publish-name' } }));
        expect(links()).toEqual([]);
        pressLook(root, FIXTURE_ID);
        expect(links().map((link) => link.getAttribute('href'))).toEqual([new URL(SHEET.url, document.baseURI).href]);
        expect(stallOf(root).classList.contains('t-fixture-private'), 'not before its sheet has loaded').toBe(false);
        answer(links()[0]!, 'sheet');
        await settle();
        expect(stallOf(root).classList.contains('t-fixture-private')).toBe(true);
        expect(ask).toHaveBeenCalledWith(SHEET, root.ownerDocument);
        root.remove();
        ask.mockClear();
        const later = paint(
            locked({ previewLook: { themeId: FIXTURE_ID, attachmentFlags: 0b1 }, lookSheets: new Map([[FIXTURE_ID, 'ready']]) }),
        );
        expect(stallOf(later.root).classList.contains('t-fixture-private')).toBe(true);
        expect(ask).toHaveBeenCalledTimes(1);
        expect(ask).toHaveBeenCalledWith(SHEET, later.root.ownerDocument);
        expect(links(), 'one link for the page').toHaveLength(1);
        later.root.remove();
    });
});

/**
 * A try-on of a look whose sheet is its own file waits for that sheet (8d2;
 * STEP-8-PLAN §3, CRITIC-STEP-8D1 item 8): the press asks for it and the
 * picker says it is loading, the stall keeps the look it had, and the look
 * goes on when the sheet lands — if that press is still the latest and the
 * picker still on screen. A sheet that does not load, or does not answer
 * within `LOOK_SHEET_WAIT_MS`, leaves the look the stall had and says so, and
 * a late answer changes nothing. Red: the try-on applied at the press (the
 * class on before the answer), the press number not compared (the earlier
 * look over the later), `isConnected` not asked (a closed sheet's press
 * reported), and the failure line dropped.
 */
describe('a-try-on-waits-for-its-sheet-and-the-latest-press-wins', () => {
    const status = (root: HTMLElement) => root.querySelector('[data-role="look-status"]') as HTMLElement;
    const lookButton = (root: HTMLElement, id: number) => root.querySelector(`[data-role="look-${id}"]`) as HTMLElement;
    const triedOn = (h: Record<string, ReturnType<typeof vi.fn>>, id: number) =>
        h['onPreviewLook']!.mock.calls.some(([preview]) => (preview as { themeId?: number } | undefined)?.themeId === id);

    it('changes nothing at the press, says it is loading, and puts the look on when its sheet lands', async () => {
        const links = holdSheets();
        const { root, h } = paint(locked({ overlay: { kind: 'publish-name' } }));
        expect(status(root).hidden, 'nothing to say before a press').toBe(true);
        pressLook(root, FIXTURE_ID);
        expect(stallOf(root).classList.contains('t-modern'), 'the stall keeps the look it had').toBe(true);
        expect(stallOf(root).classList.contains('t-fixture-private')).toBe(false);
        expect(status(root).hidden).toBe(false);
        expect(status(root).textContent).toBe(copy.PUBLISH_LOOK_LOADING);
        expect(lookButton(root, FIXTURE_ID).getAttribute('aria-busy')).toBe('true');
        expect(triedOn(h, FIXTURE_ID), 'not remembered before it is on').toBe(false);
        expect(links()).toHaveLength(1);
        answer(links()[0]!, 'sheet');
        await settle();
        expect(stallOf(root).classList.contains('t-fixture-private')).toBe(true);
        expect(status(root).hidden).toBe(true);
        expect(lookButton(root, FIXTURE_ID).hasAttribute('aria-busy')).toBe(false);
        expect(h['onPreviewLook']).toHaveBeenLastCalledWith({ themeId: FIXTURE_ID, attachmentFlags: 0 });
        root.remove();
    });

    it('lets a later press win: a look that needs no sheet goes on at once, and the earlier answer changes nothing', async () => {
        const links = holdSheets();
        const { root, h } = paint(locked({ overlay: { kind: 'publish-name' } }));
        pressLook(root, FIXTURE_ID);
        pressLook(root, 0x02);
        expect(stallOf(root).classList.contains('t-neo')).toBe(true);
        expect(status(root).hidden, 'the later press has nothing to wait for').toBe(true);
        answer(links()[0]!, 'sheet');
        await settle();
        expect(stallOf(root).classList.contains('t-neo'), 'the earlier press is not the latest').toBe(true);
        expect(stallOf(root).classList.contains('t-fixture-private')).toBe(false);
        expect(h['onPreviewLook']).toHaveBeenLastCalledWith({ themeId: 0x02, attachmentFlags: 0 });
        expect(triedOn(h, FIXTURE_ID)).toBe(false);
        // Pressed again, the sheet is on the page: the look goes on at once.
        pressLook(root, FIXTURE_ID);
        expect(stallOf(root).classList.contains('t-fixture-private')).toBe(true);
        expect(links(), 'still one link').toHaveLength(1);
        root.remove();
    });

    it('puts on the latest of two presses on one look, its decoration included', async () => {
        const links = holdSheets();
        const { root, h } = paint(locked({ overlay: { kind: 'publish-name' } }));
        pressLook(root, FIXTURE_ID);
        root.querySelector<HTMLButtonElement>('[data-role="decor-trim-0"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(stallOf(root).classList.contains('att-fixture-trim'), 'still waiting').toBe(false);
        answer(links()[0]!, 'sheet');
        await settle();
        expect(stallOf(root).classList.contains('t-fixture-private')).toBe(true);
        expect(stallOf(root).classList.contains('att-fixture-trim')).toBe(true);
        expect(h['onPreviewLook']).toHaveBeenLastCalledWith({ themeId: FIXTURE_ID, attachmentFlags: 0b1 });
        expect(h['onPreviewLook'], 'one look put on, once').toHaveBeenCalledTimes(1);
        root.remove();
    });

    it('answers no picker that is no longer on screen', async () => {
        const links = holdSheets();
        const { root, h } = paint(locked({ overlay: { kind: 'publish-name' } }));
        pressLook(root, FIXTURE_ID);
        root.remove();
        answer(links()[0]!, 'sheet');
        await settle();
        expect(stallOf(root).classList.contains('t-fixture-private')).toBe(false);
        expect(triedOn(h, FIXTURE_ID)).toBe(false);
    });

    it('keeps the look the stall had and says so when the sheet does not load, and asks no second time', async () => {
        const links = holdSheets();
        const { root, h } = paint(locked({ overlay: { kind: 'publish-name' } }));
        pressLook(root, FIXTURE_ID);
        answer(links()[0]!, 'error');
        await settle();
        expect(stallOf(root).classList.contains('t-modern')).toBe(true);
        expect(stallOf(root).classList.contains('t-fixture-private')).toBe(false);
        expect(status(root).hidden).toBe(false);
        expect(status(root).textContent).toBe(copy.PUBLISH_LOOK_UNLOADED);
        expect(lookButton(root, FIXTURE_ID).hasAttribute('aria-busy')).toBe(false);
        expect(document.querySelector('[role="status"]')?.textContent?.trim()).toBe(copy.PUBLISH_LOOK_UNLOADED);
        expect(triedOn(h, FIXTURE_ID)).toBe(false);
        // Failed is the page's for its life: pressed again, said at once.
        pressLook(root, 0x02);
        pressLook(root, FIXTURE_ID);
        expect(status(root).textContent).toBe(copy.PUBLISH_LOOK_UNLOADED);
        expect(stallOf(root).classList.contains('t-neo'), 'the look the stall had').toBe(true);
        expect(links()).toHaveLength(1);
        root.remove();
    });

    it('gives up at the wait, and a sheet that lands later changes nothing', async () => {
        const links = holdSheets();
        vi.useFakeTimers();
        try {
            const { root, h } = paint(locked({ overlay: { kind: 'publish-name' } }));
            pressLook(root, FIXTURE_ID);
            await vi.advanceTimersByTimeAsync(LOOK_SHEET_WAIT_MS - 1);
            expect(status(root).textContent, 'still waiting').toBe(copy.PUBLISH_LOOK_LOADING);
            await vi.advanceTimersByTimeAsync(1);
            expect(status(root).textContent).toBe(copy.PUBLISH_LOOK_UNLOADED);
            answer(links()[0]!, 'sheet');
            await vi.advanceTimersByTimeAsync(0);
            expect(stallOf(root).classList.contains('t-fixture-private')).toBe(false);
            expect(triedOn(h, FIXTURE_ID)).toBe(false);
            pressLook(root, FIXTURE_ID);
            expect(status(root).textContent).toBe(copy.PUBLISH_LOOK_UNLOADED);
            root.remove();
        } finally {
            vi.useRealTimers();
        }
    });
});

/**
 * The paint after a sheet is ready measures under that sheet (8d2;
 * CRITIC-STEP-8D1 item 6): a try-on puts the look on by a patch, not a
 * repaint, so the rows' cut lines the paint measured in the look the stall
 * had are measured again once the look — and its sheet — is on. Here the
 * measure answers a cut line only inside the fixture look: measured before
 * the sheet, nothing runs; after, the row's name does. Red: the patch with
 * no measure after it.
 */
describe('a-try-on-measures-its-marquees-under-its-own-sheet', () => {
    beforeEach(() => {
        resetMarqueesForTests();
    });
    afterEach(() => {
        resetMarqueesForTests();
    });

    it('arms a name the look cuts once the look is on, and not before', async () => {
        const links = holdSheets();
        setMarqueeMeasure((node) => (node.closest('.stall')?.classList.contains('t-fixture-private') === true ? 120 : 0));
        const token = 'cd'.repeat(32);
        const { root } = paint(
            locked({
                overlay: { kind: 'publish-name' },
                fetch: {
                    kind: 'offers',
                    offers: [
                        {
                            outpoint: { txid: 'ab'.repeat(32), outIdx: 0 },
                            tokenId: token,
                            atoms: 12n,
                            variant: 'PARTIAL',
                            askedSats: 120_000n,
                            askedAtoms: 1n,
                            priceNanoSatsPerAtom: 120_000n * 1_000_000_000n,
                        },
                    ],
                },
                tokens: new Map([[token, { tokenId: token, name: 'A name far too long for its line', ticker: 'LONG', decimals: 0 }]]),
            }),
        );
        const name = () => root.querySelector('.item-n[data-mq]') as HTMLElement;
        expect(name(), 'a row whose name may run').not.toBeNull();
        expect(name().hasAttribute('data-marquee')).toBe(false);
        pressLook(root, FIXTURE_ID);
        expect(name().hasAttribute('data-marquee'), 'nothing measured in a look not on yet').toBe(false);
        answer(links()[0]!, 'sheet');
        await settle();
        expect(stallOf(root).classList.contains('t-fixture-private')).toBe(true);
        expect(name().hasAttribute('data-marquee'), 'measured again under the look’s own sheet').toBe(true);
        root.remove();
    });
});

/**
 * The door paints no stall's look, so it asks for no sheet (8d2; STEP-8-PLAN
 * §3): whatever the view names — a record, a try-on, a sheet the page holds
 * ready — the door wears the default's values and asks the loader nothing. A
 * look the door does not paint costs the door nothing. Red: the hold's door
 * rule removed (a ready try-on on the door then paints and asks).
 */
describe('a-look-the-door-does-not-paint-costs-the-door-nothing', () => {
    it('paints the door bare and asks for no sheet, whatever the view names', () => {
        const links = holdSheets();
        const ask = vi.mocked(askForLookSheet);
        ask.mockClear();
        const theme = decodeLook(FIXTURE_ID);
        const { root } = paint({
            route: { kind: 'home' },
            overlay: { kind: 'idle' },
            tokens: new Map(),
            recordTheme: theme,
            recordFlags: 0b11,
            heldTokens: mintedLookTokens(),
            worn: [],
            previewLook: { themeId: FIXTURE_ID, attachmentFlags: 0b1 },
            lookSheets: new Map([[FIXTURE_ID, 'ready']]),
        });
        const stall = stallOf(root);
        expect(stall.classList.contains('door')).toBe(true);
        expect([...stall.classList].filter((cls) => cls.startsWith('t-') || cls.startsWith('att-'))).toEqual([]);
        expect(stall.style.getPropertyValue('--s-bg')).toBe(themeVars(DEFAULT_THEME)['--s-bg']);
        expect(ask).not.toHaveBeenCalled();
        expect(links()).toEqual([]);
        root.remove();
    });
});
