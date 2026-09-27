/** Types for `sheet-roles.mjs` — see that file for what each role means. */
export type SheetRole = 'base' | 'look' | 'screen' | 'kit' | 'fixture' | 'harness' | 'document';

export type SheetLoad = 'bundled' | 'worn';

export type ServedSheet = {
    /** From the repository root, forward slashes. */
    readonly path: string;
    readonly role: SheetRole;
    /** A look's (or the kit's) scoping class, without the dot. */
    readonly lookClass?: string;
    /** How a look sheet reaches a page: in the entry CSS, or its own file for a stall that wears it. */
    readonly load?: SheetLoad;
    /** A worn sheet's own directory, the one its `url()`s may reach. */
    readonly artDir?: string;
    /** True for the sheets `audit-shadowing.mjs` measures as its base. */
    readonly shadowedByLooks?: boolean;
};

export declare const SHEET_ROLE_NAMES: readonly SheetRole[];
export declare const SHEET_LOADS: readonly SheetLoad[];
export declare const SERVED_SHEETS: readonly ServedSheet[];
export declare function sheetsWithRole(...roles: SheetRole[]): ServedSheet[];
export declare function appSheets(): ServedSheet[];
export declare function lookSheets(): ServedSheet[];
export declare function wornSheets(): ServedSheet[];
