import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { attachmentsForTheme } from '../src/domain/attachments';
import { decodeTheme } from '../src/domain/theme';
import { KIT_BASES, parseWorkshopLook, type KitBase } from './workshopLook';
import { KIT_SKELETON, lookFileText } from './workshopStarter';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const scratch: string[] = [];
afterAll(() => {
    for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function kitDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'stall-kit-'));
    scratch.push(dir);
    return dir;
}

/** The command a creator runs, into a scratch kit directory rather than the working copy. */
function start(base: string, dir: string) {
    return spawnSync('node', ['scripts/workshop.mjs', 'start', base, '--dir', dir], {
        cwd: ROOT,
        encoding: 'utf8',
    });
}

function lint(file: string) {
    return spawnSync('node', ['scripts/workshop-lint.mjs', file], { cwd: ROOT, encoding: 'utf8' });
}

/**
 * The committed kit is a skeleton that is likely red, because a look's
 * tier-1/2 figure sizes and its sparse motif live only in the look's own sheet
 * (the step-1 critic's P2-2) — so a creator starts from a shipped look,
 * re-scoped. Run through the real command (`pnpm workshop:start <look>`, into
 * a scratch directory) over the real shipped sheets: nothing of the shipped
 * class is left, every keyframe is the kit's, the lint passes, and the loader
 * reads the row back as the shipped look under the kit's id.
 */
describe('the-starter-is-each-shipped-look-rescoped', () => {
    for (const base of Object.keys(KIT_BASES) as KitBase[]) {
        it(`${base}: re-scoped, linted clean, and read back as the ${base} row`, () => {
            const dir = kitDir();
            const run = start(base, dir);
            expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
            const css = readFileSync(join(dir, 'theme-workshop.css'), 'utf8');
            expect(css).not.toMatch(new RegExp(`\\.t-${base}(?![\\w-])`));
            expect(css).toMatch(/\.t-workshop\b/);
            const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]!);
            const shipped = readFileSync(join(ROOT, `src/ui/theme-${base}.css`), 'utf8');
            expect(keyframes.length).toBe([...shipped.matchAll(/@keyframes\s+/g)].length);
            expect(keyframes.every((name) => name.startsWith('wk-')), keyframes.join(', ')).toBe(true);
            const linted = lint(join(dir, 'theme-workshop.css'));
            expect(linted.status, `${linted.stdout}\n${linted.stderr}`).toBe(0);

            const look = parseWorkshopLook(readFileSync(join(dir, 'look.json'), 'utf8'));
            const row = decodeTheme(KIT_BASES[base]);
            expect(look.theme.sheetClass).toBe('t-workshop');
            for (const key of ['bg', 'surface', 'text', 'muted', 'accent', 'accentTwo', 'shade', 'danger'] as const) {
                expect(look.theme[key], key).toEqual(row[key]);
            }
            expect(look.theme.fontIndex).toBe(row.fontIndex);
            expect(look.theme.softness).toBe(row.softness);
            expect(look.theme.shape).toEqual(row.shape);
            expect(look.theme.tierCeilings).toEqual(row.tierCeilings);
            expect(look.theme.overlayTierCeilings).toEqual(row.overlayTierCeilings);
            expect(look.rows.map(({ themeId: _t, ...rest }) => rest)).toEqual(
                attachmentsForTheme(row.id).map(({ themeId: _t, tokenId: _k, ...rest }) => rest),
            );
        }, 60_000);
    }

    it('refuses to write over a sheet or a look.json a creator has written in', () => {
        const dir = kitDir();
        expect(start('neo', dir).status).toBe(0);
        const again = start('rural', dir);
        expect(again.status).toBe(1);
        expect(again.stderr).toMatch(/already has rules in it/);
        // The skeleton is not "written in": a fresh checkout starts. (A
        // skeleton written here, not copied from the working copy, which a
        // creator may have started in.)
        const EMPTY_SHEET = '/* yours */\n@media (prefers-reduced-motion: reduce) {\n}\n';
        const fresh = kitDir();
        writeFileSync(join(fresh, 'theme-workshop.css'), EMPTY_SHEET);
        writeFileSync(join(fresh, 'look.json'), lookFileText(KIT_SKELETON));
        expect(start('modern', fresh).status).toBe(0);
        // An empty sheet over an edited look.json keeps the look.json.
        const edited = kitDir();
        writeFileSync(join(edited, 'theme-workshop.css'), EMPTY_SHEET);
        writeFileSync(join(edited, 'look.json'), lookFileText({ ...KIT_SKELETON, label: 'Mine' }));
        const kept = start('modern', edited);
        expect(kept.status).toBe(1);
        expect(kept.stderr).toMatch(/not the untouched skeleton/);
    }, 60_000);
});
