// @vitest-environment happy-dom
/**
 * **Every starter is measured as its shipped look** (2026-10-06; the 8d1
 * critic's item 1). `pnpm workshop:start <look>` copies a shipped look's
 * row and rows under the kit's id (`0xff`) and its sheet under
 * `.t-workshop`, and `workshop/README.md` tells a creator to start there. The
 * kit's own probe must then judge that copy by the rules the shipped look is
 * judged by — no laxer, and no stricter for a rule keyed to a name the copy
 * no longer wears. Until this day it did not: the probe set Neo's backdrop
 * aside at rest only on `t-neo` and planned the rain's ring-read jobs, the
 * horizon worn alone and the aurora's tide only on Neo's id, so the Neo
 * starter read 212 `an-outline-that-shows-at-rest` failures its look does not
 * paint and "an outline nobody reads" on six kinds of line.
 *
 * Running the real probe once per starter costs ~2 minutes each and needs a
 * browser, so it is not in `pnpm test` (`PROBE-RULES.md` records the three
 * runs). What this holds cheaply is the cause: what the probe and its plan
 * key a decoration's rules on.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { attachmentsForTheme } from '../src/domain/attachments';
import { SHIPPED_THEMES, themeVars } from '../src/domain/theme';
import { CONTRAST_VIEWPORTS, contrastOwed, contrastPlan, contrastScreens, type ContrastJob } from './contrastPlan';
import { shippedLooks, type Look } from './looks';
import { KIT_BASES, WORKSHOP_SHEET_CLASS, lookFromJson, type KitBase } from './workshopLook';
import { starterLook } from './workshopStarter';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = (file: string): string => readFileSync(join(ROOT, file), 'utf8');

/** The kit's look as `pnpm workshop:start <base>` writes it, read back the way the kit's pages read it. */
function starter(base: KitBase): Look {
    const { theme, rows } = lookFromJson(starterLook(base));
    return { id: theme.id, label: theme.label, theme, rows };
}

/** A job with the look's id and class taken out, so two looks' plans can be compared. */
function anon(job: ContrastJob, look: Look): ContrastJob {
    const id = `/${look.id}/`;
    expect(job.key.includes(id), job.key).toBe(true);
    return { ...job, key: job.key.replace(id, '/L/'), look: -1, sheetClass: 't-L' };
}

/** The classes of every shipped look, and the decoration classes their rows carry. */
const SHIPPED_LOOK_CLASSES = shippedLooks().map((look) => look.theme.sheetClass);
const DECORATION_CLASSES = new Set(
    SHIPPED_THEMES.flatMap(({ id }) => attachmentsForTheme(id))
        .map((row) => row.cls)
        .filter((cls): cls is string => cls !== undefined),
);

/**
 * The entries of a `const NAME … = [ … ];` table in a source file, as text.
 * A table that moved or was renamed is a failure here, never an empty list.
 */
function table(text: string, name: string): string {
    const at = text.indexOf(`const ${name}`);
    expect(at, `${name} is declared`).toBeGreaterThanOrEqual(0);
    const open = text.indexOf('= [', at);
    const close = text.indexOf('\n];', open);
    expect(open > at && close > open, `${name} is an array literal`).toBe(true);
    return text.slice(open, close);
}

describe('every-starter-is-measured-as-its-shipped-look', () => {
    it('plans every starter’s contrast jobs as its base look’s, the door aside', () => {
        // The rain's ground screens, the horizon worn alone, the aurora's
        // tide and the stilled price are each planned on what the look's own
        // rows and row carry (`contrastPlan.ts`), so the copy owes every job
        // the original owes. The door is the default look's alone and never
        // the kit's (`canWear`).
        for (const base of Object.keys(KIT_BASES) as KitBase[]) {
            const kit = starter(base);
            const shipped = shippedLooks().find((look) => look.id === KIT_BASES[base])!;
            expect(kit.theme.sheetClass).toBe(WORKSHOP_SHEET_CLASS);
            expect(kit.rows.map((row) => row.cls)).toEqual(shipped.rows.map((row) => row.cls));
            const mine = contrastPlan([kit]).map((job) => anon(job, kit));
            const theirs = contrastPlan([shipped])
                .filter((job) => job.screen !== 'door')
                .map((job) => anon(job, shipped));
            expect(mine, base).toEqual(theirs);
            for (const vp of CONTRAST_VIEWPORTS) {
                expect(contrastScreens(vp.width, vp.canvas, [kit]), `${base} at ${vp.name}`).toEqual(
                    contrastScreens(vp.width, vp.canvas, [shipped]).filter((screen) => screen !== 'door'),
                );
            }
            const strip = (keys: string[], look: Look): string[] => keys.map((key) => key.replace(`/${look.id}/`, '/L/'));
            const owedMine = contrastOwed([kit]);
            const owedTheirs = contrastOwed([shipped]);
            expect(strip(owedMine.rain, kit), base).toEqual(strip(owedTheirs.rain, shipped));
            expect(strip(owedMine.horizon, kit), base).toEqual(strip(owedTheirs.horizon, shipped));
        }
        // Not over nothing: the Neo starter owes the rain's ground jobs, the
        // horizon alone and the tide, and the Rural starter the stilled tag.
        const neo = contrastPlan([starter('neo')]);
        expect(neo.filter((job) => job.tide !== undefined).length).toBe(46);
        expect(neo.some((job) => job.screen === 'quotes-failed')).toBe(true);
        expect(neo.some((job) => job.key === 'mobile/offers/255/4')).toBe(true);
        expect(contrastOwed([starter('neo')]).rain.length).toBe(21);
        expect(contrastOwed([starter('neo')]).horizon.length).toBe(5);
        expect(contrastPlan([starter('rural')]).filter((job) => job.reduced === true).length).toBe(4);
        expect(contrastOwed([starter('modern')])).toEqual({ rain: [], horizon: [] });
    });

    it('keys the probe’s at-rest exceptions on a worn decoration or the look’s own backdrop, never on a look', () => {
        const probe = source('layout/probe.ts');
        const painters = (name: string, field: string): string[] =>
            [...table(probe, name).matchAll(new RegExp(`\\b${field}: ([^,}]+)`, 'g'))].map((m) => m[1]!.trim());
        const root = painters('ROOT_LAYERS_SET_ASIDE', 'paints');
        const art = painters('SURFACE_ART_SET_ASIDE', 'paints');
        const surfaces = painters('OUTLINE_SURFACES', 'cls');
        // Each table is read, and each says who paints every entry.
        expect(root.length).toBeGreaterThanOrEqual(5);
        expect(art.length).toBeGreaterThanOrEqual(1);
        expect(surfaces.length).toBeGreaterThanOrEqual(2);
        for (const painter of [...root, ...art, ...surfaces]) {
            if (painter === 'LOOK_BACKDROP') continue;
            const cls = /^'([^']+)'$/.exec(painter)?.[1];
            expect(cls, `${painter} is a quoted class`).toBeDefined();
            // A decoration a shipped row carries — which a starter carries
            // under the same class — and never a look's own class.
            expect(SHIPPED_LOOK_CLASSES, painter).not.toContain(cls);
            expect(cls!.startsWith('t-'), painter).toBe(false);
            expect(DECORATION_CLASSES.has(cls!), `${painter} is a shipped decoration's class`).toBe(true);
        }
        // The backdrop is the row's own data: `LOOK_BACKDROP` names the custom
        // property the renderer hands the stall the row's `backdrop` in, so a
        // starter, which keeps its base row's backdrop, is read as its base.
        expect(probe).toContain("const LOOK_BACKDROP = '--s-backdrop';");
        expect(root).toContain('LOOK_BACKDROP');
        const neo = shippedLooks().find((look) => look.rows.some((row) => row.cls === 'att-rainfall'))!;
        expect(themeVars(neo.theme)['--s-backdrop']).toBe(neo.theme.backdrop);
        expect(themeVars(starter('neo').theme)['--s-backdrop']).toBe(neo.theme.backdrop);
    });

    it('names no shipped look’s class or id where the probe and its plan decide what a look owes', () => {
        // A rule keyed to a shipped look's name judges a copy of that look
        // under the kit's name by another rule. The runner states the shipped
        // classes it measures (`SHIPPED_SHEET_CLASSES`) and the coverage rules
        // key the shipped run on them beside what was worn; the page and the
        // plan never do.
        for (const file of ['layout/probe.ts', 'layout/contrastPlan.ts']) {
            const text = source(file);
            for (const cls of SHIPPED_LOOK_CLASSES) {
                expect(text.includes(`'${cls}'`) || text.includes(`"${cls}"`), `${file} quotes ${cls}`).toBe(false);
            }
            expect(/\b(?:NEO_CITY|RURAL|MODERN|DEFAULT)_THEME_ID\b/.test(text), `${file} names a shipped look's id`).toBe(false);
        }
    });
});
