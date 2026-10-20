/**
 * Types for the few exports of `workshop-css.mjs` a TypeScript test reads
 * (`layout/stateAttributes.test.ts`); the module's other exports are read
 * only by `node --test` files, which need no declaration. A declaration here
 * is the only thing standing between a TS importer and TS7016, so add one
 * for an export a `.ts` file starts to read.
 */

/** The attributes a look sheet may match a value on, and the values it may match. */
export const STATE_ATTRIBUTES: Readonly<Record<string, readonly string[]>>;

/** The attributes a look sheet may match by presence alone. */
export const PRESENCE_ATTRIBUTES: readonly string[];

/** Whether a first-party selector names a state the probe never paints (see `STATE_ATTRIBUTE_NAMES` and `STRUCTURAL_PSEUDO_CLASSES`). */
export function namesAState(selector: string): boolean;
