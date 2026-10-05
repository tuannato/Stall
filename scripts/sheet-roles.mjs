/**
 * Every stylesheet Stall serves, and the role it plays — the one list the
 * static guards read, so a sheet added to the app is a sheet the guards see
 * the day it lands rather than the day somebody remembers a hand-kept list.
 *
 * **The public table, and only that**: the sheets this repository holds.
 * Every static guard reads the sheets a run serves through
 * `scripts/served-sheets.mjs` — this table, each row with its text, then
 * one row per private look the run reads (role `private`, step 8e1) — and
 * a file that reads this table alone says why
 * (`every-whole-sheet-guard-reads-the-served-sheets`). A `.mjs` with a
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
 * - `fixture` — a look sheet the layout harness paints to measure the
 *   worn-only road (`layout/fixtureLook.ts`): never a row of the theme
 *   table, never in the production bundle (`gallery-is-not-served`), and
 *   the one worn-only sheet the guards read until a shipped look is worn
 *   only.
 * - `harness` — a page of the workshop kit's that the app never serves (the
 *   showroom's chrome).
 * - `document` — a static page under `public/`, outside the Vite graph,
 *   which Pages serves whether or not anything links it.
 *
 * `load` says how a look sheet (a `look`, the `kit` or a `fixture`) reaches a
 * page — `bundled`, a side-effect import of the page that paints it, so it
 * lands in that page's entry CSS (the app's for the three shipped looks,
 * which every visitor downloads; the showroom's and the workshop probe's for
 * the kit, which the app never serves), or `worn`, its own file fetched only
 * for a stall that wears the look — and a worn sheet names `artDir`, the one directory its
 * `url()`s may reach (its art and its faces), counted with it by the weight
 * guard (`scripts/weight-buckets.mjs`). A shipped look's `load` is its
 * theme row's `sheetLoad` (`every-look-row-loads-its-sheet-the-way-its-role-says`).
 *
 * `shadowedByLooks` names the sheets `audit-shadowing.mjs` measures as its
 * base: a look's own rule can override what they declare, and they carry no
 * `.t-<look>` rule of their own. `broadcast.css` is a screen sheet that does
 * carry its own per-look rules, so the base/look split that audit measures
 * does not describe it. Test: `every-served-sheet-is-on-the-guard-list`
 * (`scripts/sheet-roles.test.mjs`), which also holds that flag to the
 * sheets' contents.
 */

/** @typedef {'base' | 'look' | 'screen' | 'kit' | 'fixture' | 'harness' | 'document'} SheetRole */

export const SHEET_ROLE_NAMES = Object.freeze(['base', 'look', 'screen', 'kit', 'fixture', 'harness', 'document']);

/** How a look sheet reaches a page. */
export const SHEET_LOADS = Object.freeze(['bundled', 'worn']);

export const SERVED_SHEETS = Object.freeze([
    Object.freeze({ path: 'src/ui/stall.css', role: 'base', shadowedByLooks: true }),
    Object.freeze({ path: 'src/ui/theme-modern.css', role: 'look', lookClass: 't-modern', load: 'bundled' }),
    Object.freeze({ path: 'src/ui/theme-neo.css', role: 'look', lookClass: 't-neo', load: 'bundled' }),
    Object.freeze({ path: 'src/ui/theme-rural.css', role: 'look', lookClass: 't-rural', load: 'bundled' }),
    Object.freeze({ path: 'src/ui/broadcast.css', role: 'screen' }),
    Object.freeze({ path: 'src/ui/obsGuide.css', role: 'screen', shadowedByLooks: true }),
    Object.freeze({ path: 'src/ui/window.css', role: 'screen', shadowedByLooks: true }),
    Object.freeze({ path: 'workshop/theme-workshop.css', role: 'kit', lookClass: 't-workshop', load: 'bundled' }),
    Object.freeze({
        path: 'layout/fixture-look.css',
        role: 'fixture',
        lookClass: 't-fixture-worn',
        load: 'worn',
        artDir: 'layout/fixture-look',
    }),
    Object.freeze({ path: 'layout/gallery.css', role: 'harness' }),
    Object.freeze({ path: 'public/stream.css', role: 'document' }),
    Object.freeze({ path: 'public/guide.css', role: 'document' }),
    Object.freeze({ path: 'public/404.css', role: 'document' }),
]);

/** The sheets with one of `roles`, in table order. */
export function sheetsWithRole(...roles) {
    return SERVED_SHEETS.filter((sheet) => roles.includes(sheet.role));
}

/** Every look sheet — the shipped looks, the kit's and the harness's fixture — with its `load`. */
export function lookSheets() {
    return sheetsWithRole('look', 'kit', 'fixture');
}

/** The look sheets fetched only for a stall that wears them. */
export function wornSheets() {
    return lookSheets().filter((sheet) => sheet.load === 'worn');
}

/** The sheets the app itself imports: the base, the looks and the screen sheets. */
export function appSheets() {
    return sheetsWithRole('base', 'look', 'screen');
}
