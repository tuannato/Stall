/**
 * The boxes the probe's scroll pass measures (step 8f2): the subjects the
 * look rules admit as sticky in a look sheet (`STICKY_BOXES` in
 * `scripts/workshop-css.mjs` — the sign's own box, a shape any look may
 * use). The lint reads selectors and cannot run a page, so this list is
 * the browser's copy of that table, and `the-scroll-pass-measures-what-the-lint-admits`
 * (`scripts/look-lint.test.mjs`) holds the two to one list: a box the lint
 * admitted and no pass scrolled under would be a sticky box nobody
 * measured, which is exactly what the scroll pass exists to refuse.
 *
 * No imports: the node test loads this file by type stripping.
 */
export const STICKY_SUBJECTS: readonly string[] = Object.freeze(['stall-head']);
