/**
 * `virtual:stall-private-looks`: the private looks a build includes (step 8,
 * CLAUDE.md §6). 8b2's Vite plugin is to resolve it at build time to
 * validated plain data — one `PrivateLookSource` per look the build's target
 * includes, an empty list in a public build — and `src/domain/lookTable.ts` is the one
 * module that may import it (`the-private-looks-module-is-the-look-tables-alone`).
 * Declared here so `tsc` never meets a path that only a plugin can answer.
 *
 * **Step 8b1: declared, and imported by nothing.** The plugin and the
 * table's merge over it are 8b2's; until then every merged view in
 * `lookTable.ts` is the public table's. The declaration is held to the type
 * the table will read by `the-private-looks-module-declares-what-the-table-reads`
 * (`lookTable.test.ts`), a type-only import `tsc` checks and the test runner
 * erases — `skipLibCheck` would otherwise leave a wrong declaration here
 * unread.
 */
declare module 'virtual:stall-private-looks' {
    /** Every private look this build includes, in the private index's order. */
    export const privateLooks: readonly import('./domain/lookData').PrivateLookSource[];
}
