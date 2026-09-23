/** Types for `sheet-roles.mjs` — see that file for what each role means. */
export type SheetRole = 'base' | 'look' | 'screen' | 'kit' | 'harness' | 'document';

export type ServedSheet = {
    /** From the repository root, forward slashes. */
    readonly path: string;
    readonly role: SheetRole;
    /** A look's (or the kit's) scoping class, without the dot. */
    readonly lookClass?: string;
    /** True for the sheets `audit-shadowing.mjs` measures as its base. */
    readonly shadowedByLooks?: boolean;
};

export declare const SHEET_ROLE_NAMES: readonly SheetRole[];
export declare const SERVED_SHEETS: readonly ServedSheet[];
export declare function sheetsWithRole(...roles: SheetRole[]): ServedSheet[];
export declare function appSheets(): ServedSheet[];
