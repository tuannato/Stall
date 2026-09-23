/**
 * The flash rule (G6) over the real files: every sheet in the role table,
 * the theme table's `--s-*-anim` values, and — for the kit — a creator's
 * sheet in the kit's place, because a rule in one sheet can re-time a
 * keyframe declared in another. `flashReport` in `workshop-css.mjs` is the
 * pure half; this module only reads.
 *
 * Read by `scripts/look-lint.test.mjs` (the shipped sheets), by
 * `pnpm workshop:lint` and by every kit command that builds.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERVED_SHEETS } from './sheet-roles.mjs';
import { flashReport } from './workshop-css.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every served sheet as `{ name, css }`, named by its path from the
 * repository root — with the kit's sheet replaced by `kit` (`{ name, css }`)
 * when one is given, so a creator's sheet is read in the kit's place.
 */
export function servedSheets({ kit } = {}) {
    return SERVED_SHEETS.map((sheet) =>
        sheet.role === 'kit' && kit !== undefined
            ? { name: kit.name, css: kit.css }
            : { name: sheet.path, css: readFileSync(join(ROOT, sheet.path), 'utf8') },
    );
}

/**
 * Every shipped look's value of each custom property the theme table emits,
 * `{ '--s-name-anim': [...], … }` — the `animation: var(--s-name-anim)`
 * rules in `stall.css` run whatever keyframe the table names there. Loaded
 * through Node's own type stripping (on by default in the Node this repo
 * pins), which works because `src/domain/theme.ts` imports nothing; the day
 * it does, this import fails loudly rather than reading a stale copy.
 */
export async function themeVarValues() {
    const theme = await import('../src/domain/theme.ts');
    const out = {};
    for (const { id } of theme.SHIPPED_THEMES) {
        for (const [name, value] of Object.entries(theme.themeVars(theme.decodeTheme(id)))) {
            (out[name] ??= []).push(value);
        }
    }
    return out;
}

/** `flashReport` over every served sheet (the kit's replaced by `kit` when given) and the theme table. */
export async function servedFlashReport({ kit } = {}) {
    return flashReport(servedSheets({ kit }), { vars: await themeVarValues() });
}
