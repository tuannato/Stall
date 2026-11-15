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
import { parseGuard, type GuardMoving } from '../scripts/private-guard.mjs';
import { MOVING_DECORATIONS } from './movingDecor';
import { TIDE_CLASS } from './contrastPlan';

type Sheets = Awaited<ReturnType<typeof guardSheets>>;

/**
 * Every moving row of the private looks `sheets` carries, with the reader
 * or reason its look's guard gives it (step 8i): a private row's reader
 * travels in its own repository's `guard.json` (`scripts/private-guard.mjs`),
 * never in this public table. A mood that moves, and a row whose look has no
 * guard or one refused whole, has none. Each `<class> (<look class>)`.
 */
function privateMovers(sheets: Sheets): { at: string; moving: GuardMoving | undefined }[] {
    return privateRows(sheets).flatMap((sheet) => {
        const look = (sheet.look.look ?? {}) as { moods?: unknown[]; decorations?: unknown[] };
        const guard = sheet.look.guardText === undefined ? undefined : parseGuard(sheet.look.guardText, sheet.look.look).guard;
        const moods = (look.moods ?? []) as { cls?: string; motion?: boolean }[];
        const decorations = (look.decorations ?? []) as { cls?: string; motion?: boolean }[];
        return [
            ...moods.filter((row) => row.motion === true).map((row) => ({ at: `${row.cls ?? '(no class)'} (${sheet.lookClass})`, moving: undefined })),
            ...decorations
                .filter((row) => row.motion === true)
                .map((row) => ({ at: `${row.cls ?? '(no class)'} (${sheet.lookClass})`, moving: row.cls === undefined ? undefined : guard?.rows[row.cls]?.moving })),
        ];
    });
}

/** Every moving row of the private looks `sheets` carries whose look's guard gives it no reader or reason (8e2; 8i). */
function privateMoversWithoutReader(sheets: Sheets): string[] {
    return privateMovers(sheets)
        .filter((row) => row.moving === undefined)
        .map((row) => row.at);
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
     * in its own repository's `guard.json` (step 8i), never in this public
     * table, so the table names no private class, and a private row that
     * moves fails here unless its look's guard gives it one, in words, and
     * names a reader that exists — red over the fixture planted with a
     * moving trim its guard says nothing of, and with its turn's reason
     * taken out.
     */
    it('holds every private look a run reads: no moving row without its reader, and no private class in the public table', async () => {
        const sheets = await guardSheets();
        const rows = privateRows(sheets).flatMap((sheet) => {
            const look = (sheet.look.look ?? {}) as { moods?: { cls?: string }[]; decorations?: { cls?: string }[] };
            return [...(look.moods ?? []), ...(look.decorations ?? [])];
        });
        expect(rows.length, 'the private looks a run reads carry rows').toBeGreaterThan(0);
        expect(privateMoversWithoutReader(sheets)).toEqual([]);
        // The fixture's turn is a mover its guard gives a reason: the private half has a subject.
        expect(privateMovers(sheets).map((row) => row.at)).toContain('att-fixture-turn (t-fixture-private)');
        const files = sources();
        for (const { at, moving } of privateMovers(sheets)) {
            if (moving === undefined) continue;
            if ('reader' in moving) {
                const literal = new RegExp(`(?:'|"|\`)${moving.reader}(?:'|"|\`|\\b)`);
                expect(files.filter((f) => literal.test(f.text)).map((f) => f.path), `${at}: ${moving.reader} is a string literal in code somewhere`).not.toEqual([]);
                expect(moving.how.length, `${at}: how the reader reads it`).toBeGreaterThan(40);
            } else {
                expect(moving.reason.length, `${at}: why no reader is needed`).toBeGreaterThan(40);
            }
        }
        for (const row of rows) {
            if (row.cls !== undefined) expect(MOVING_DECORATIONS[row.cls], row.cls).toBeUndefined();
        }
        // A trim that moves and whose guard says nothing of it: the guard is refused whole, and every mover of the look goes without.
        const trim = plantLooks((path, text) =>
            path === 'fixture/look.json' ? text.replace('"paint": "root",\n            "motion": false', '"paint": "root",\n            "motion": true') : text,
        );
        const moved = await servedSheets({ env: trim.selection, fixture: true, gitEnv: trim.env });
        expect(privateMoversWithoutReader(moved).filter((entry) => entry.endsWith(`(${PLANTED_CLASS})`))).toEqual([
            `att-planted-trim (${PLANTED_CLASS})`,
            `att-planted-turn (${PLANTED_CLASS})`,
        ]);
        // The turn's reason taken out of its guard: refused.
        const quiet = plantLooks((path, text) => (path === 'fixture/guard.json' ? text.replace(/,\s*"moving": \{[^}]*\}/, '') : text));
        const silent = await servedSheets({ env: quiet.selection, fixture: true, gitEnv: quiet.env });
        expect(privateMoversWithoutReader(silent).filter((entry) => entry.endsWith(`(${PLANTED_CLASS})`))).toEqual([`att-planted-turn (${PLANTED_CLASS})`]);
        // And a look with no guard file at all.
        const bare = plantLooks((path, text) => (path === 'fixture/guard.json' ? undefined : text));
        const none = await servedSheets({ env: bare.selection, fixture: true, gitEnv: bare.env });
        expect(privateMoversWithoutReader(none).filter((entry) => entry.endsWith(`(${PLANTED_CLASS})`))).toEqual([`att-planted-turn (${PLANTED_CLASS})`]);
    }, 60_000);
    afterAll(removePlants);

    it('reads the aurora through the class the tide jobs key on', () => {
        expect(MOVING_DECORATIONS[TIDE_CLASS]).toBeDefined();
        expect('reader' in MOVING_DECORATIONS[TIDE_CLASS]!).toBe(true);
    });
});
