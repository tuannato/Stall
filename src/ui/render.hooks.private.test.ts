// @vitest-environment happy-dom
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import type { StallView } from '../domain/state';

/**
 * Step 8f1's two new mounts and the cross-slot exclusion, on a stall, over a
 * private look built for this file alone: rows that stand `below-goods` and
 * `above-dock`, and one that excludes two of them. Mocked, because a vitest
 * run selects no private look; the tracked fixture keeps the plain shape the
 * decor gate can judge (CLAUDE.md §6), so these rows are this file's.
 */
const HOOK_LOOK = {
    label: 'Hook test',
    base: 'modern',
    tierCeilings: [7, 9, 12],
    overlayTierCeilings: [5, 7, 9],
    moods: [],
    decorations: [
        { bit: 0, slot: 'trim', label: 'First', place: 'Under the goods', cls: 'att-hk-first', paint: 'node', mount: 'below-goods', motion: false },
        { bit: 1, slot: 'perch', label: 'Second', place: 'Beside the first', cls: 'att-hk-second', paint: 'node', mount: 'below-goods', motion: false },
        { bit: 2, slot: 'strip', label: 'Strip', place: 'Above the dock', cls: 'att-hk-strip', paint: 'node', mount: 'above-dock', motion: false },
        { bit: 3, slot: 'field', label: 'Field', place: 'Behind the page', cls: 'att-hk-field', paint: 'root', excludes: ['trim', 'perch'], motion: false },
    ],
};

vi.mock('virtual:stall-private-looks', () => ({
    carriesPrivateLooks: true,
    privateLooks: [{ id: 0x04, sheetClass: 't-hook-test', sheetUrl: '/assets/sheet-hook-test.css', look: HOOK_LOOK }],
}));

/* A try-on asks the loader for the look's sheet: recorded, never sent. */
vi.mock('./lookSheets', async (original) => ({
    ...(await original<typeof import('./lookSheets')>()),
    askForLookSheet: vi.fn(),
}));

const { renderStall } = await import('./render');
const { resetLookSheetsForTests } = await import('./lookSheets');
const { decodeLook } = await import('../domain/lookTable');
const { SCREENS, handlers } = await import('../../layout/fixtures');

const HOOK_ID = 0x04;
const bits = (...ns: number[]): number => ns.reduce((f, n) => f | (1 << n), 0);

/** The probe's shop, trying the hook look on with `flags`, its sheet on the page. */
function tryOn(flags: number, over: Partial<StallView> = {}): StallView {
    return {
        ...SCREENS['offers']!,
        previewLook: { themeId: HOOK_ID, attachmentFlags: flags },
        lookSheets: new Map([[HOOK_ID, 'ready']]),
        ...over,
    };
}

function paint(view: StallView): HTMLElement {
    const root = document.createElement('div');
    document.body.append(root);
    renderStall(root, view, handlers);
    return root;
}

afterEach(() => {
    document.body.replaceChildren();
});

describe('a-node-below-the-goods-and-above-the-dock-stands-where-its-mount-says', () => {
    it('admits the hook look, so the rows below are its', () => {
        expect(decodeLook(HOOK_ID).sheetClass).toBe('t-hook-test');
    });

    it('stands below the goods in catalogue order, and above the dock between the scroller and the dock', () => {
        const root = paint(tryOn(bits(0, 1, 2)));
        const stall = root.querySelector('.stall')!;
        expect(stall.classList.contains('t-hook-test')).toBe(true);
        const scroller = stall.querySelector('.stall-scroll')!;
        const body = scroller.querySelector(':scope > .stall-body') ?? [...scroller.children].find((c) => c.classList.contains('stall-body'))!;
        expect(body.nextElementSibling?.className).toBe('att-hk-first');
        expect(body.nextElementSibling?.nextElementSibling?.className).toBe('att-hk-second');
        expect(scroller.nextElementSibling?.className).toBe('att-hk-strip');
        expect(scroller.nextElementSibling?.nextElementSibling?.classList.contains('tabs')).toBe(true);
        for (const cls of ['att-hk-first', 'att-hk-second', 'att-hk-strip']) {
            expect(stall.querySelectorAll(`.${cls}`), cls).toHaveLength(1);
            expect(stall.querySelector(`.${cls}`)?.getAttribute('aria-hidden'), cls).toBe('true');
        }
        // A repaint stands each once again, never twice.
        renderStall(root, tryOn(bits(0, 1, 2)), handlers);
        expect(root.querySelectorAll('.att-hk-first, .att-hk-second, .att-hk-strip')).toHaveLength(3);
    });

    it('stands nothing where a screen has no scroller, as a fringe on a look with no strip', () => {
        const { route, fetch, stallName } = SCREENS['invalid']!;
        const root = paint(tryOn(bits(0, 2), { route, fetch, stallName }));
        expect(root.querySelector('.stall')!.classList.contains('t-hook-test'), 'the look is on').toBe(true);
        expect(root.querySelector('.stall-scroll')).toBeNull();
        expect(root.querySelector('.att-hk-first, .att-hk-strip')).toBeNull();
    });
});

describe('a-row-that-excludes-slots-is-worn-and-picked-by-its-bit', () => {
    it('wears the lower bit when a record carries both sides', () => {
        const root = paint(tryOn(bits(0, 3)));
        const stall = root.querySelector('.stall')!;
        expect(stall.querySelector('.att-hk-first')).not.toBeNull();
        expect(stall.classList.contains('att-hk-field'), 'the field, excluded by the first').toBe(false);
        const field = paint(tryOn(bits(3)));
        expect(field.querySelector('.stall')!.classList.contains('att-hk-field')).toBe(true);
    });

    it('turns the other side of an exclusion off in the picker, either way round', () => {
        // A press tries the look on, which asks the loader for its sheet: the
        // link is held, never connected (no test reaches the network).
        resetLookSheetsForTests(document);
        const held = vi.spyOn(document.head, 'append').mockImplementation(() => undefined);
        onTestFinished(() => {
            held.mockRestore();
            resetLookSheetsForTests(document);
        });
        const root = paint(tryOn(bits(0, 1, 2), { overlay: { kind: 'publish-name' } }));
        const pressed = (role: string) => root.querySelector(`[data-role="${role}"]`)?.getAttribute('aria-pressed');
        const press = (role: string) =>
            root.querySelector<HTMLButtonElement>(`[data-role="${role}"]`)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect([pressed('decor-trim-0'), pressed('decor-perch-1'), pressed('decor-strip-2'), pressed('decor-field-3')]).toEqual([
            'true',
            'true',
            'true',
            'false',
        ]);
        press('decor-field-3');
        expect([pressed('decor-trim-0'), pressed('decor-perch-1'), pressed('decor-strip-2'), pressed('decor-field-3')]).toEqual([
            'false',
            'false',
            'true',
            'true',
        ]);
        press('decor-perch-1');
        expect([pressed('decor-trim-0'), pressed('decor-perch-1'), pressed('decor-strip-2'), pressed('decor-field-3')]).toEqual([
            'false',
            'true',
            'true',
            'false',
        ]);
    });
});
