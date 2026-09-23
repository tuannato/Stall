// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { WINDOW_MIN_PX } from '../src/ui/render';
import { CANVAS_SCREENS, NO_DECOR_SCREENS, SCREENS } from './fixtures';
import type { Look } from './looks';
import { SHOT_VIEWPORTS, shotPlan, type ShotJob } from './shotPlan';
import { lookFromJson, parseWorkshopLook } from './workshopLook';
import { KIT_SKELETON, lookFileText } from './workshopStarter';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function asLook(json: unknown): Look {
    const { theme, rows } = typeof json === 'string' ? parseWorkshopLook(json) : lookFromJson(json);
    return { id: theme.id, label: theme.label, theme, rows };
}

/** A list literal out of the runner, read as text: the runner is `.mjs` and TS cannot import it (TS7016). */
function runnerList(name: string): string[] {
    const source = readFileSync(join(ROOT, 'scripts/layout-check.mjs'), 'utf8');
    const at = source.indexOf(`const ${name} =`);
    expect(at, `${name} in layout-check.mjs`).toBeGreaterThan(-1);
    const statement = source.slice(at, source.indexOf(';', at));
    return [...statement.matchAll(/'([^']+)'/g)].flatMap((m) => m[1]!.split(',')).filter((s) => s !== '');
}

const skeleton = asLook(lookFileText(KIT_SKELETON));
const dressed = asLook({
    ...KIT_SKELETON,
    moods: [
        { bit: 0, slot: 'mood', label: 'After dark', place: 'the whole palette', motion: false, palette: { bg: [10, 10, 10] } },
        { bit: 1, slot: 'mood', label: 'Noon', place: 'the whole palette', motion: false, palette: { bg: [250, 250, 250] } },
    ],
    decorations: [
        { bit: 2, slot: 'fringe', label: 'Flags', place: 'across the top', cls: 'att-flags', paint: 'root', motion: true },
        { bit: 3, slot: 'yard', label: 'Kite', place: 'on the ground', cls: 'att-kite', paint: 'node', motion: true },
    ],
});

function at(jobs: readonly ShotJob[], viewport: string): Set<string> {
    return new Set(jobs.filter((job) => job.viewport.name === viewport).map((job) => job.screen));
}

/**
 * What `pnpm workshop:shots` photographs, held to what the probe measures —
 * the screens, the widths and the variants — without trusting the shared
 * `screensAt` to say so: every expectation below is derived from the fixture
 * table and the runner's own lists, not from the function under test.
 */
describe('the-shots-cover-every-probed-screen-and-variant', () => {
    const jobs = shotPlan(dressed);
    const allScreens = Object.keys(SCREENS);
    const wall = allScreens.filter((name) => SCREENS[name]!.window !== undefined);

    it('shoots every screen but the door, each where the probe measures it', () => {
        const shot = new Set(jobs.map((job) => job.screen));
        expect([...shot].sort()).toEqual(allScreens.filter((name) => name !== 'door').sort());
        expect(shot.has('door')).toBe(false);
        const canvas = at(jobs, 'canvas');
        expect([...canvas].sort()).toEqual([...CANVAS_SCREENS].sort());
        for (const viewport of ['phone', 'desk']) {
            for (const name of at(jobs, viewport)) {
                expect(CANVAS_SCREENS.has(name), `${name} is a canvas screen at ${viewport}`).toBe(false);
            }
        }
        // Every page screen at the desk width; at a phone's, every one but a
        // wall, which the app cannot paint below its floor.
        const page = allScreens.filter((name) => !CANVAS_SCREENS.has(name) && name !== 'door');
        expect([...at(jobs, 'desk')].sort()).toEqual([...page].sort());
        expect(SHOT_VIEWPORTS.phone.width).toBeLessThan(WINDOW_MIN_PX);
        expect([...at(jobs, 'phone')].sort()).toEqual(
            page.filter((name) => SCREENS[name]!.window === undefined).sort(),
        );
    });

    it('shoots the shop window at the probe’s two portrait sizes, and the runner agrees on which screens', () => {
        expect([...at(jobs, 'portrait')].sort()).toEqual([...wall].sort());
        expect([...at(jobs, 'tablet')].sort()).toEqual([...wall].sort());
        expect([...runnerList('WINDOW_SCREENS')].sort()).toEqual([...wall].sort());
        expect(SHOT_VIEWPORTS.portrait).toMatchObject({ width: 1080, height: 1920 });
        expect(SHOT_VIEWPORTS.tablet).toMatchObject({ width: 768, height: 1024 });
        expect(SHOT_VIEWPORTS.canvas).toMatchObject({ width: 1920, height: 1080 });
    });

    it('shoots every variant: bare, every decoration where decorations paint, and each mood everywhere', () => {
        const cells = new Map<string, ShotJob[]>();
        for (const job of jobs) {
            const key = `${job.viewport.name}/${job.screen}`;
            cells.set(key, [...(cells.get(key) ?? []), job]);
        }
        for (const [key, list] of cells) {
            const screen = key.split('/')[1]!;
            const variants = new Set(list.map((job) => job.variant));
            expect(variants.has('bare'), key).toBe(true);
            expect(variants.has('mood-after-dark'), key).toBe(true);
            expect(variants.has('mood-noon'), key).toBe(true);
            expect(variants.has('decorations'), key).toBe(!NO_DECOR_SCREENS.has(screen));
            expect(variants.size, key).toBe(NO_DECOR_SCREENS.has(screen) ? 3 : 4);
        }
        const decorations = jobs.find((job) => job.variant === 'decorations')!;
        expect(decorations.flags).toBe((1 << 2) | (1 << 3));
        expect(jobs.find((job) => job.variant === 'mood-noon')!.flags).toBe(1 << 1);
    });

    it('shoots a transparent overlay over dark and over light, and nothing else twice', () => {
        // Every screen on the transparent wire — the runner's three clear
        // screens, and the /stream hero, which is composed on that ground too.
        const transparent = Object.keys(SCREENS).filter((name) => SCREENS[name]!.broadcast?.transparent === true);
        for (const screen of runnerList('CLEAR_SCREENS')) {
            expect(transparent, screen).toContain(screen);
        }
        for (const job of jobs) {
            expect(job.ground !== undefined, `${job.screen}`).toBe(transparent.includes(job.screen));
        }
        for (const screen of transparent) {
            const grounds = jobs.filter((job) => job.screen === screen && job.variant === 'bare').map((job) => job.ground);
            expect(grounds.sort()).toEqual(['dark', 'light']);
        }
        // One file per job.
        expect(new Set(jobs.map((job) => job.file)).size).toBe(jobs.length);
    });

    it('counts the empty kit: one bare paint per probed cell, two for a transparent one', () => {
        const page = Object.keys(SCREENS).filter((name) => !CANVAS_SCREENS.has(name) && name !== 'door');
        const phone = page.filter((name) => SCREENS[name]!.window === undefined).length;
        const cells = phone + page.length + CANVAS_SCREENS.size + 2 * wall.length;
        const clear = Object.keys(SCREENS).filter((name) => SCREENS[name]!.broadcast?.transparent === true).length;
        expect(shotPlan(skeleton).length).toBe(cells + clear);
        expect(shotPlan(skeleton).every((job) => job.variant === 'bare' && job.flags === 0)).toBe(true);
    });
});
