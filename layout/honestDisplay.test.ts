// @vitest-environment happy-dom
/**
 * `the-honest-display-sentences-are-read`, its static half (8e2,
 * CRITIC-STEP-8E2 item 11; `layout/honestDisplay.ts`). The browser half is
 * the contrast pass: every job of a screen `HONEST_OWED` names reads each
 * owed role over its line rects, or fails naming it (`layout-check.mjs`).
 *
 * This half holds the table to the app and the fixtures: every role is one
 * `render.ts` writes, every owed screen is sampled at both widths and
 * paints every role it owes — on a sheet, not `hidden`, in no money box —
 * and a role owed on a phone is never one the record sheets keep in their
 * desk-only code fold.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as copy from '../src/ui/copy';
import { renderStall } from '../src/ui/render';
import { contrastPlan } from './contrastPlan';
import { CANVAS_SCREENS, GEOMETRY_ONLY_SCREENS, SCREENS, handlers } from './fixtures';
import { HONEST_DISPLAY, HONEST_OWED, HONEST_SELECTOR, HONEST_SELECTORS, type HonestSheet } from './honestDisplay';
import { measuredLooks, paintView, wornAllFlags, wornOf } from './looks';
import { MONEY } from './moneySet';

const HERE = dirname(fileURLToPath(import.meta.url));
const RENDER = readFileSync(join(HERE, '..', 'src', 'ui', 'render.ts'), 'utf8');
const PROBE = readFileSync(join(HERE, 'probe.ts'), 'utf8');
const RUNNER = readFileSync(join(HERE, '..', 'scripts', 'layout-check.mjs'), 'utf8');

/** Which sheet a fixture screen opens. */
function sheetOf(screen: string): HonestSheet {
    const kind = SCREENS[screen]!.overlay.kind;
    if (kind === 'pay' || kind === 'pay-several' || kind === 'publish-name' || kind === 'describe') return kind;
    throw new Error(`${screen} opens no money sheet (${kind})`);
}

/** Whether the node or an ancestor is `hidden`. */
function hiddenUp(node: Element): boolean {
    for (let at: Element | null = node; at !== null; at = at.parentElement) {
        if ((at as HTMLElement).hidden) return true;
    }
    return false;
}

describe('the-honest-display-sentences-are-read', () => {
    it('names each role once, and each is one render.ts writes', () => {
        const roles = HONEST_DISPLAY.map((h) => h.role);
        expect(new Set(roles).size, 'a role is listed once').toBe(roles.length);
        for (const role of roles) {
            const written =
                RENDER.includes(`setAttribute('data-role', '${role}')`) || new RegExp(`roled\\([\\s\\S]{0,160}?, '${role}'\\)`).test(RENDER);
            expect(written, `render.ts writes the role ${role}`).toBe(true);
        }
        // Each sentence it says is a copy constant by that name, where it names one.
        for (const { role, says } of HONEST_DISPLAY) {
            for (const name of says.filter((s) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s))) {
                expect((copy as Record<string, unknown>)[name], `${role} says ${name}`).toBeDefined();
            }
        }
        // Scoped to a sheet: the row's, the face's and the tag's provenance
        // lines are other surfaces.
        expect(HONEST_SELECTORS.every((sel) => sel.startsWith('.sheet '))).toBe(true);
        expect(HONEST_SELECTOR).toBe(HONEST_SELECTORS.join(', '));
    });

    it('owes only listed roles, on screens the contrast pass samples at both widths', () => {
        const byRole = new Map(HONEST_DISPLAY.map((h) => [h.role, h]));
        const plan = contrastPlan(measuredLooks());
        expect(Object.keys(HONEST_OWED).sort()).toEqual(
            ['describe', 'pay', 'pay-gone', 'pay-moved', 'pay-several', 'pay-xec', 'publish-name'],
        );
        for (const [screen, byViewport] of Object.entries(HONEST_OWED)) {
            expect(SCREENS[screen], `${screen} is a fixture`).toBeDefined();
            expect(GEOMETRY_ONLY_SCREENS.has(screen), `${screen} is sampled, not geometry only`).toBe(false);
            expect(CANVAS_SCREENS.has(screen), `${screen} is a page screen`).toBe(false);
            for (const viewport of ['mobile', 'desktop'] as const) {
                expect(plan.some((job) => job.screen === screen && job.viewport === viewport), `${screen} is a ${viewport} contrast job`).toBe(true);
                for (const role of byViewport[viewport]) {
                    expect(byRole.get(role)?.on, `${role} is listed and on ${sheetOf(screen)}`).toContain(sheetOf(screen));
                }
            }
            // What a phone owes, a desk owes too.
            for (const role of byViewport.mobile) expect(byViewport.desktop).toContain(role);
        }
        // The four lines the critic named, and the pay sheet's lost line.
        expect(HONEST_OWED['pay']!.mobile).toEqual(expect.arrayContaining(['pay-final', 'pay-direct']));
        expect(HONEST_OWED['pay-several']!.mobile).toEqual(expect.arrayContaining(['pay-final', 'pay-direct']));
        expect(HONEST_OWED['publish-name']!.mobile).toContain('publish-must-sign');
        expect(HONEST_OWED['describe']!.mobile).toContain('describe-must-sign');
        expect(HONEST_OWED['pay-xec']!.mobile).toContain('quote-not-minted');
        expect(HONEST_OWED['pay-gone']!.mobile).toContain('pay-lost');
    });

    it('is painted by every owed screen, on a sheet, shown, and in no money box, on every measured look bare and worn', () => {
        const root = document.createElement('div');
        root.id = 'app';
        document.body.append(root);
        let checked = 0;
        for (const [screen, byViewport] of Object.entries(HONEST_OWED)) {
            for (const look of measuredLooks()) {
                for (const flags of [0, ...wornAllFlags(look)]) {
                    renderStall(root, paintView(SCREENS[screen]!, look, wornOf(look, flags)), handlers);
                    for (const role of byViewport.desktop) {
                        const at = `${screen} / ${look.label}${flags === 0 ? '' : ' worn'}: ${role}`;
                        const nodes = [...root.querySelectorAll(HONEST_SELECTOR)].filter((n) => n.getAttribute('data-role') === role);
                        const shown = nodes.filter((n) => !hiddenUp(n));
                        expect(shown.length, `${at} is painted and not hidden`).toBeGreaterThan(0);
                        for (const node of shown) {
                            expect(node.closest('.sheet'), `${at} stands on a sheet`).not.toBeNull();
                            expect(node.parentElement?.closest(MONEY) ?? null, `${at} is in no money box`).toBeNull();
                            expect((node.textContent ?? '').trim(), `${at} says something`).not.toBe('');
                            // A phone does not paint the record sheets' code fold.
                            const deskOnly = node.closest('.sheet-qr-fold') !== null;
                            expect(deskOnly && byViewport.mobile.includes(role), `${at} is owed on a phone and sits in the desk-only fold`).toBe(false);
                            checked += 1;
                        }
                    }
                }
            }
        }
        root.remove();
        expect(checked).toBeGreaterThan(200);
    });

    it('is read by the probe and held by the runner (a tripwire: the browser half is the real guard)', () => {
        expect(PROBE).toContain("import { HONEST_OWED, HONEST_SELECTOR } from './honestDisplay';");
        expect(PROBE).toContain('const CONTRAST = `${CONTRAST_TEXT}, ${HONEST_SELECTOR}`;');
        // An honest line with no layout box at a job's width is not taken.
        expect(PROBE).toMatch(/!node\.matches\(CONTRAST_TEXT\) && node\.getClientRects\(\)\.length > 0/);
        expect(PROBE).toContain('window.__honestOwed = () => HONEST_OWED;');
        expect(RUNNER).toContain("honestOwed ??= await evalJson(cdp, sessionId, 'window.__honestOwed()');");
        expect(RUNNER).toContain('the-honest-display-sentences-are-read');
    });
});
