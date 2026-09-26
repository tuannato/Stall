/**
 * `every-moving-decoration-has-a-reader-or-a-reason` (step 5b).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHIPPED_ATTACHMENTS } from '../src/domain/attachments';
import { MOVING_DECORATIONS } from './movingDecor';
import { TIDE_CLASS } from './contrastPlan';

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
                out.push({ path: relative(ROOT, path), text: readFileSync(path, 'utf8') });
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
            const carriers = files.filter((f) => f.text.includes(entry.reader)).map((f) => f.path);
            expect(carriers, `${cls}: ${entry.reader}`).not.toEqual([]);
        }
    });

    it('reads the aurora through the class the tide jobs key on', () => {
        expect(MOVING_DECORATIONS[TIDE_CLASS]).toBeDefined();
        expect('reader' in MOVING_DECORATIONS[TIDE_CLASS]!).toBe(true);
    });
});
