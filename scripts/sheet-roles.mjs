/**
 * Every stylesheet Stall serves, and the role it plays — the one list the
 * static guards read, so a sheet added to the app is a sheet the guards see
 * the day it lands rather than the day somebody remembers a hand-kept list.
 *
 * Read by `src/ui/theme-sheets.test.ts` (its `SHEETS`), by
 * `scripts/audit-shadowing.mjs` (its base and look lists), and by the
 * shipped-sheet lints in `scripts/look-lint.test.mjs`. A `.mjs` with a
 * `.d.mts` beside it, because a TypeScript test importing an untyped `.mjs`
 * breaks `pnpm build`'s `tsc` (TS7016) while vitest, which never
 * type-checks, stays green.
 *
 * Roles:
 *
 * - `base` — the look-agnostic sheet every screen of the app sits on.
 * - `look` — one shipped look's own sheet, scoped under its `t-*` class
 *   (`lookClass`). The shipped-sheet lint reads these.
 * - `screen` — a sheet the app imports for one screen of its own (the stream
 *   overlay, the studio's overlay guide, the shop window).
 * - `kit` — the workshop look's sheet: a creator's, linted by
 *   `pnpm workshop:lint` under the same rules as a `look` plus the kit's own.
 * - `harness` — a page of the workshop kit's that the app never serves (the
 *   showroom's chrome).
 * - `document` — a static page under `public/`, outside the Vite graph,
 *   which Pages serves whether or not anything links it.
 *
 * `shadowedByLooks` names the sheets `audit-shadowing.mjs` measures as its
 * base: a look's own rule can override what they declare, and they carry no
 * `.t-<look>` rule of their own. `broadcast.css` is a screen sheet that does
 * carry its own per-look rules, so the base/look split that audit measures
 * does not describe it. Test: `every-served-sheet-is-on-the-guard-list`
 * (`scripts/sheet-roles.test.mjs`), which also holds that flag to the
 * sheets' contents.
 */

/** @typedef {'base' | 'look' | 'screen' | 'kit' | 'harness' | 'document'} SheetRole */

export const SHEET_ROLE_NAMES = Object.freeze(['base', 'look', 'screen', 'kit', 'harness', 'document']);

export const SERVED_SHEETS = Object.freeze([
    Object.freeze({ path: 'src/ui/stall.css', role: 'base', shadowedByLooks: true }),
    Object.freeze({ path: 'src/ui/theme-modern.css', role: 'look', lookClass: 't-modern' }),
    Object.freeze({ path: 'src/ui/theme-neo.css', role: 'look', lookClass: 't-neo' }),
    Object.freeze({ path: 'src/ui/theme-rural.css', role: 'look', lookClass: 't-rural' }),
    Object.freeze({ path: 'src/ui/broadcast.css', role: 'screen' }),
    Object.freeze({ path: 'src/ui/obsGuide.css', role: 'screen', shadowedByLooks: true }),
    Object.freeze({ path: 'src/ui/window.css', role: 'screen', shadowedByLooks: true }),
    Object.freeze({ path: 'workshop/theme-workshop.css', role: 'kit', lookClass: 't-workshop' }),
    Object.freeze({ path: 'layout/gallery.css', role: 'harness' }),
    Object.freeze({ path: 'public/stream.css', role: 'document' }),
    Object.freeze({ path: 'public/guide.css', role: 'document' }),
    Object.freeze({ path: 'public/404.css', role: 'document' }),
]);

/** The sheets with one of `roles`, in table order. */
export function sheetsWithRole(...roles) {
    return SERVED_SHEETS.filter((sheet) => roles.includes(sheet.role));
}

/** The sheets the app itself imports: the base, the looks and the screen sheets. */
export function appSheets() {
    return sheetsWithRole('base', 'look', 'screen');
}
