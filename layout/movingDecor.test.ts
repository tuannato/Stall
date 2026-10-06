/**
 * `every-moving-decoration-has-a-reader-or-a-reason` (step 5b).
 */
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHIPPED_ATTACHMENTS } from '../src/domain/attachments';
import { PLANTED_CLASS, plantLooks, removePlants } from '../scripts/private-looks-plant.mjs';
import { guardSheets, privateRows, servedSheets } from '../scripts/served-sheets.mjs';
import { MOVING_DECORATIONS } from './movingDecor';
import { TIDE_CLASS } from './contrastPlan';

/**
 * Every moving row of the private looks `sheets` carries that has no reader
 * (8e2): today every one — a private row's reader travels in its own
 * `look.json` (the plan's `guard` field, 8i), never in this public table,
 * and until that field exists a private look that moves is a look no rule
 * reads at its worst. Each `<class> (<look class>)`.
 */
function privateMoversWithoutReader(sheets: Awaited<ReturnType<typeof guardSheets>>): string[] {
    return privateRows(sheets).flatMap((sheet) => {
        const look = (sheet.look.look ?? {}) as { moods?: unknown[]; decorations?: unknown[] };
        const rows = [...(look.moods ?? []), ...(look.decorations ?? [])] as { cls?: string; motion?: boolean }[];
        return rows.filter((row) => row.motion === true).map((row) => `${row.cls ?? '(no class)'} (${sheet.lookClass})`);
    });
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every source file a reader's name may live in: the tests, the probe, the runner. */
function sources(): { path: string; text: string }[] {
    const out: { path: string; text: string }[] = [];
    const walk = (dir: string): void => {
        for (const name of readdirSync(dir)) {
            const path = join(dir, name);
            if (statSync(path).isDirectory()) {
                walk(path);
            } else if (/\.(ts|mjs)$/.test(name) && !path.endsWith('movingDecor.ts') && !path.endsWith('movingDecor.test.ts')) {
                // Code only: a name in a comment reads nothing (the critic,
                // 2026-09-27).
                const code = readFileSync(path, 'utf8')
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                    .replace(/(^|\s)\/\/.*$/gm, '$1');
                out.push({ path: relative(ROOT, path), text: code });
            }
        }
    };
    for (const dir of ['src', 'layout', 'scripts']) walk(join(ROOT, dir));
    return out;
}

describe('every-moving-decoration-has-a-reader-or-a-reason', () => {
    it('keys exactly the moving rows of every shipped look, by class', () => {
        const moving = SHIPPED_ATTACHMENTS.filter((row) => row.motion).map((row) => row.cls);
        expect(moving.every((cls) => typeof cls === 'string'), 'a moving row names its class').toBe(true);
        expect(Object.keys(MOVING_DECORATIONS).sort()).toEqual([...new Set(moving as string[])].sort());
        // And a still row is not listed as moving.
        for (const row of SHIPPED_ATTACHMENTS.filter((r) => !r.motion && r.cls !== undefined)) {
            expect(MOVING_DECORATIONS[row.cls!], row.cls).toBeUndefined();
        }
    });

    it('gives each one a reader, or a reason, in words', () => {
        for (const [cls, entry] of Object.entries(MOVING_DECORATIONS)) {
            if ('reader' in entry) {
                expect(entry.reader, cls).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)+$/);
                expect(entry.how.length, `${cls}: how the reader reads it`).toBeGreaterThan(40);
            } else {
                expect(entry.reason.length, `${cls}: why no reader is needed`).toBeGreaterThan(40);
            }
        }
    });

    it('names readers that exist: a test or a rule in this repository carries each name', () => {
        const files = sources();
        for (const [cls, entry] of Object.entries(MOVING_DECORATIONS)) {
            if (!('reader' in entry)) continue;
            // As a string literal in code: a test's `describe(` name, or the
            // check name a probe rule or the runner reports under.
            const literal = new RegExp(`(?:'|"|\`)${entry.reader}(?:'|"|\`|\\b)`);
            const carriers = files.filter((f) => literal.test(f.text)).map((f) => f.path);
            expect(carriers, `${cls}: ${entry.reader} is a string literal in code somewhere`).not.toEqual([]);
        }
    });

    it('does not count a name that stands only in a comment', () => {
        const strip = (t: string): string => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
        const literal = /(?:'|"|`)a-made-up-reader(?:'|"|`|\b)/;
        expect(literal.test(strip("/* 'a-made-up-reader' */ const x = 1; // 'a-made-up-reader'"))).toBe(false);
        expect(literal.test(strip("describe('a-made-up-reader', () => {});"))).toBe(true);
    });

    /*
     * The private looks a run reads (8e2): the tracked fixture always, the
     * selection when one is named. A private row's reader or reason lives
     * with the row (8i's `guard` field), never in this public table, so the
     * table names no private class, and a private row that moves fails here
     * until its look carries one — red over the fixture planted with a
     * moving trim.
     */
    it('holds every private look a run reads: no moving row without its reader, and no private class in the public table', async () => {
        const sheets = await guardSheets();
        const rows = privateRows(sheets).flatMap((sheet) => {
            const look = (sheet.look.look ?? {}) as { moods?: { cls?: string }[]; decorations?: { cls?: string }[] };
            return [...(look.moods ?? []), ...(look.decorations ?? [])];
        });
        expect(rows.length, 'the private looks a run reads carry rows').toBeGreaterThan(0);
        expect(privateMoversWithoutReader(sheets)).toEqual([]);
        for (const row of rows) {
            if (row.cls !== undefined) expect(MOVING_DECORATIONS[row.cls], row.cls).toBeUndefined();
        }
        const repo = plantLooks((path, text) =>
            path === 'fixture/look.json' ? text.replace('"paint": "root",\n            "motion": false', '"paint": "root",\n            "motion": true') : text,
        );
        const planted = await servedSheets({ env: repo.selection, fixture: true, gitEnv: repo.env });
        expect(privateMoversWithoutReader(planted).filter((entry) => entry.endsWith(`(${PLANTED_CLASS})`))).toEqual([
            `att-planted-trim (${PLANTED_CLASS})`,
        ]);
    }, 60_000);
    afterAll(removePlants);

    it('reads the aurora through the class the tide jobs key on', () => {
        expect(MOVING_DECORATIONS[TIDE_CLASS]).toBeDefined();
        expect('reader' in MOVING_DECORATIONS[TIDE_CLASS]!).toBe(true);
    });
});
