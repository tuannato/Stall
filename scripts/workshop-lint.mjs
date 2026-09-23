#!/usr/bin/env node
/**
 * `pnpm workshop:lint` — the kit's cheap static read of a look sheet, with no
 * browser and no build: the rules `lintSheet` in `workshop-css.mjs` states
 * (every selector under `.t-workshop`; no `@import`, `@font-face`,
 * `url(data:…)` or remote `url()`; keyframes named `wk-…`; the reduced-motion
 * block last). What needs a browser is `pnpm workshop:probe`.
 *
 * Usage: `node scripts/workshop-lint.mjs [sheet]` — default
 * `workshop/theme-workshop.css`. Exit 0 and one line when it passes; exit 1
 * and every problem, each with its line, when it does not.
 */
import { readFileSync } from 'node:fs';
import { lintSheet } from './workshop-css.mjs';

const file = process.argv[2] ?? 'workshop/theme-workshop.css';
let css;
try {
    css = readFileSync(file, 'utf8');
} catch (err) {
    console.error(`workshop:lint: cannot read ${file}: ${err.message}`);
    process.exit(1);
}
const problems = lintSheet(css);
if (problems.length === 0) {
    console.log(`✓ workshop:lint: ${file} — every static rule holds`);
    process.exit(0);
}
console.error(`✗ workshop:lint: ${file} — ${problems.length} problem${problems.length === 1 ? '' : 's'}:`);
for (const problem of problems) {
    console.error(`    ${problem}`);
}
process.exit(1);
