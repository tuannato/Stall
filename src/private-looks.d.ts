/**
 * `virtual:stall-private-looks`: the private looks a build includes (step 8,
 * CLAUDE.md §6). The Vite plugin (`scripts/private-looks-build.mjs`,
 * installed in `vite.config.ts`) resolves it at build time to validated
 * plain data — one `PrivateLookSource` per look the build's selection
 * includes, and an empty list when the build selects none, which is every
 * build that names no selection (and every vitest run: a test that wants a
 * private look mocks this module). `src/domain/lookTable.ts` is the one
 * module that imports it (`the-private-looks-module-is-the-look-tables-alone`).
 * Declared here so `tsc` never meets a path that only a plugin can answer.
 *
 * The declaration is held to the type the table reads by
 * `the-private-looks-module-declares-what-the-table-reads`
 * (`lookTable.test.ts`), a type-only import `tsc` checks and the test runner
 * erases — `skipLibCheck` would otherwise turn a wrong declaration here into
 * `any` in the table.
 */
declare module 'virtual:stall-private-looks' {
    /** Whether `privateLooks` holds any look: a literal, so a build that carries none drops the table's runtime validator. */
    export const carriesPrivateLooks: boolean;
    /** Every private look this build includes, in the private index's order. */
    export const privateLooks: readonly import('./domain/lookData').PrivateLookSource[];
}
