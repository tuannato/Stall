/**
 * Every decorated state a look can be painted in by any probe pass: bare,
 * each row worn alone (the geometry passes' singles on a card screen, and
 * the contrast pass's solo and tide jobs, which wear one row), and every
 * all-worn state (`wornAllFlags`, one per mood). A superset of what the
 * geometry walk (`variantsFor` in `probe.ts`) and the contrast plan
 * (`contrastPlan.ts`) paint on any one screen, for a reader that must see
 * every paint a look can make there: `a-public-screen-is-the-same-whatever-the-build-carries`.
 */
import type { ShippedAttachment } from '../src/domain/attachments';
import { wornAllFlags, wornOf, type Look } from './looks';

/** Every state, labelled: `bare`, `row:<cls or label>`, and `all:<flags>`. */
export function everyVariant(look: Look): ReadonlyArray<readonly [string, readonly ShippedAttachment[]]> {
    return [
        ['bare', []],
        ...look.rows.map((row) => [`row:${row.cls ?? row.label}`, [row]] as const),
        ...wornAllFlags(look).map((flags) => [`all:${flags}`, wornOf(look, flags)] as const),
    ];
}
