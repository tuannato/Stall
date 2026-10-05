/**
 * The flash rule (G6) over the real files: every sheet a run serves
 * (`guardSheets`, `scripts/served-sheets.mjs` — the role table's and every
 * private look's the run reads, the tracked fixture's always), the theme
 * table's `--s-*-anim` values, and — for the kit — a creator's sheet in the
 * kit's place, because a rule in one sheet can re-time a keyframe declared
 * in another. `flashReport` in `workshop-css.mjs` is the pure half; this
 * module only reads.
 *
 * Read by `scripts/look-lint.test.mjs` (the served sheets), by
 * `pnpm workshop:lint` and by every kit command that builds.
 */
import { guardSheets } from './served-sheets.mjs';
import { flashReport } from './workshop-css.mjs';

/**
 * Every served sheet as `{ name, css }`, named by its path — `sheets` (a
 * merged list, `guardSheets()` when not given) with the kit's sheet
 * replaced by `kit` (`{ name, css }`) when one is given, so a creator's
 * sheet is read in the kit's place.
 */
export async function flashSheets({ kit, sheets } = {}) {
    const list = sheets ?? (await guardSheets());
    return list.map((sheet) =>
        sheet.role === 'kit' && kit !== undefined ? { name: kit.name, css: kit.css } : { name: sheet.path, css: sheet.css },
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

/** `flashReport` over every served sheet (the kit's replaced by `kit` when given; `sheets` a merged list, the guards' when not given) and the theme table. */
export async function servedFlashReport({ kit, sheets } = {}) {
    return flashReport(await flashSheets({ kit, sheets }), { vars: await themeVarValues() });
}
