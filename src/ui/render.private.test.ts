// @vitest-environment happy-dom
import { encodeCashAddress } from 'ecashaddrjs';
import { fromHex, shaRmd160, toHex } from 'ecash-lib';
import { describe, expect, it, vi } from 'vitest';
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
const { askForLookSheet } = await import('./lookSheets');
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
            locked({ recordFlags: 0b1, previewLook: { themeId: FIXTURE_ID, attachmentFlags: 0b1 } }),
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
        });
        const stall = stallOf(root);
        expect(stall.classList.contains('t-fixture-private')).toBe(true);
        expect(stall.classList.contains('att-fixture-trim')).toBe(true);
        root.remove();
    });
});

/**
 * The renderer asks for a worn-only sheet for the row it paints, and only
 * that row (8d1, `applyTheme`): a try-on of the fixture look — the press's
 * live patch and every later paint — asks for the fixture's built sheet on
 * the stall's own document; a record naming the locked look paints the
 * default, a shipped look whose sheet is in the entry CSS, and asks for
 * nothing; and nothing is asked for a public look. No paint waits for the
 * answer (8d2's hold): the look's class is on the stall at once.
 */
describe('a-try-on-asks-for-its-sheet-and-a-locked-look-for-none', () => {
    const ask = vi.mocked(askForLookSheet);
    const SHEET = { url: fixturePrivateLooks()[0]!.sheetUrl, cls: 't-fixture-private' };

    it('asks for nothing over a locked record, on the shop, the Studio, the wall and the overlay', () => {
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
    });

    it('asks for nothing for a public look', () => {
        ask.mockClear();
        const { root } = paint(locked({ recordTheme: decodeLook(DEFAULT_THEME_ID), worn: [] }));
        root.remove();
        expect(ask).not.toHaveBeenCalled();
    });

    it('asks for the fixture’s sheet when it is tried on, on the press and on every later paint', () => {
        ask.mockClear();
        const { root } = paint(locked({ overlay: { kind: 'publish-name' } }));
        expect(ask).not.toHaveBeenCalled();
        root.querySelector<HTMLButtonElement>(`[data-role="look-${FIXTURE_ID}"]`)!.dispatchEvent(
            new MouseEvent('click', { bubbles: true }),
        );
        expect(stallOf(root).classList.contains('t-fixture-private'), 'painted at once, no wait').toBe(true);
        expect(ask).toHaveBeenCalledWith(SHEET, root.ownerDocument);
        root.remove();
        ask.mockClear();
        const later = paint(locked({ previewLook: { themeId: FIXTURE_ID, attachmentFlags: 0b1 } }));
        expect(stallOf(later.root).classList.contains('t-fixture-private')).toBe(true);
        expect(ask).toHaveBeenCalledTimes(1);
        expect(ask).toHaveBeenCalledWith(SHEET, later.root.ownerDocument);
        later.root.remove();
    });
});
