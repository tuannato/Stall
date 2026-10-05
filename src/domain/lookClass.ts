/**
 * What a look's class may be: one `t-` token, lower-case letters and digits
 * in hyphen-separated runs — the shape a private look's index names
 * (`scripts/private-looks.mjs`) and every look row carries (`sheetClass`).
 * One rule, read by the two places that take a class they did not write:
 * the look table, which drops a private source whose class is not one
 * (`lookTable.ts`), and the worn-only loader, which refuses to load a sheet
 * for one (`src/ui/lookSheets.ts`). A space in a class would throw in
 * `classList.add`; a class that is not a token names no sheet.
 */
export const LOOK_CLASS = /^t-[a-z0-9]+(?:-[a-z0-9]+)*$/;
