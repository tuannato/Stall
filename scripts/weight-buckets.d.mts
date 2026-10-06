/** Types for `weight-buckets.mjs` — see that file for what each bucket means. */

/** Rollup's output shape, structurally: `rollup` is not a dependency of this app to import types from. */
export type BuiltPart = {
    readonly type: string;
    readonly fileName: string;
    readonly code?: string;
    readonly source?: string | Uint8Array;
    readonly isEntry?: boolean;
    readonly facadeModuleId?: string | null;
    readonly imports?: readonly string[];
    readonly moduleIds?: readonly string[];
    readonly originalFileNames?: readonly string[];
    readonly viteMetadata?: { readonly importedCss?: ReadonlySet<string> | readonly string[] };
};

export type WornLook = { readonly lookClass: string; readonly source: string };

export type Bucket = { readonly files: readonly string[]; readonly bytes: number };

export type WornBucket = Bucket & { readonly sheet: string; readonly art: readonly string[] };

export type WeightBuckets = {
    readonly everyVisitor: Bucket;
    readonly worn: Readonly<Record<string, WornBucket>>;
    readonly onDemand: Bucket;
    readonly problems: readonly string[];
};

export declare const LOOK_ART_TARGET_GZIP: number;
export declare const LOOK_ART_CAP_GZIP: number;

export type LookBudgetVerdict = {
    readonly admitted: boolean;
    readonly state: 'within' | 'admitted-over-target' | 'refused-over-target' | 'over-cap' | 'unread';
    /** What every run prints for the look: its figure against the target and the cap, and its reason when one admitted it. */
    readonly line: string;
};
export declare function lookBudgetVerdict(input: {
    look: string;
    total: number;
    reason?: string | undefined;
    /** Its id in `OVER_TARGET_LOOK_IDS`: the owner's public OK to weigh over the target. */
    listed?: boolean;
    publicLog?: boolean;
}): LookBudgetVerdict;
export declare const PUBLIC_LOG_ENV: 'GITHUB_ACTIONS';
export declare function printsPublicly(env?: Readonly<Record<string, string | undefined>>): boolean;
export declare function bytesOf(part: BuiltPart): number;
export declare function builtUrls(css: string): string[];
export declare function weightBuckets(
    parts: readonly BuiltPart[],
    options?: { entryHtml?: string; worn?: readonly WornLook[] },
): WeightBuckets;
export declare function gzipBytes(bytes: string | Uint8Array): number;
export declare function lookArtBudget(input: {
    sheet: string;
    sheetFile?: string;
    files: ReadonlyMap<string, string | Uint8Array>;
    rows?: readonly { readonly cls?: string; readonly slot: string }[];
}): {
    readonly bare: number;
    readonly slots: Readonly<Record<string, { readonly cls: string; readonly gzip: number }>>;
    readonly total: number;
};
export declare function privateLookArtBudget(look: import('./served-sheets.mjs').PrivateLookRead): {
    readonly bare: number;
    readonly slots: Readonly<Record<string, { readonly cls: string; readonly gzip: number }>>;
    readonly total: number;
};
export declare function privateLookRows(look: import('./served-sheets.mjs').PrivateLookRead): { readonly cls?: string; readonly slot: string }[];
