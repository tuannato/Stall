/** Types for `private-looks.mjs` — see that file for what a private look repository may hold. */
export type PrivateLookStage = 'preview' | 'release';

export type PrivateIndexEntry = {
    readonly id: number;
    readonly slug: string;
    readonly cls: string;
    readonly stage: PrivateLookStage;
    readonly paid: boolean;
    /** Why the look may weigh more than the art budget's soft target (`budgetReason`): one plain sentence, or absent. */
    readonly budgetReason?: string;
};

export type PrivateIndex = { readonly schema: 1; readonly looks: readonly PrivateIndexEntry[] };

/** One file of a commit's tree: its path from the root, forward slashes, and its git mode. */
export type PrivateFile = { readonly path: string; readonly mode: string };

/** The public lists a private index is held to. */
export type PublicLookFacts = {
    readonly reserved: readonly number[];
    readonly paid: readonly number[];
    readonly released: readonly number[];
    /** `OVER_TARGET_LOOK_IDS`: the looks admitted over their art budget's target. */
    readonly overTarget: readonly number[];
    readonly shippedClasses: readonly string[];
};

type GitOptions = { readonly git?: string; readonly env?: Readonly<Record<string, string | undefined>> };

export declare const PRIVATE_INDEX: 'index.json';
export declare const PRIVATE_INDEX_SCHEMA: 1;
export declare const PRIVATE_LOOK_STAGES: readonly PrivateLookStage[];
export declare const PRIVATE_INDEX_FIELDS: readonly string[];
export declare const PRIVATE_INDEX_OPTIONAL_FIELDS: readonly string[];
export declare const BUDGET_REASON_MAX: number;
export declare const PRIVATE_SLUG: RegExp;
export declare const PRIVATE_SLUG_MAX: number;
export declare const PRIVATE_LOOK_CLASS: RegExp;
export declare const PRIVATE_LOOK_CLASS_MAX: number;
export declare const HARNESS_LOOK_CLASSES: readonly string[];
export declare const FIXTURE_PRIVATE_LOOK_CLASS: 't-fixture-private';
export declare const PRIVATE_ROOT_FILES: readonly string[];
export declare const PRIVATE_LOOK_FILES: readonly string[];
export declare const PRIVATE_LOOK_REQUIRED: readonly string[];
export declare const PRIVATE_FACE_LICENCE: RegExp;
export declare const PRIVATE_FILE_MODE: '100644';
/** The line every carried look's served sheet opens with (`scripts/private-looks.mjs`). */
export declare const LOOK_COPYRIGHT_LINE: '/*! © 2026 tuannato (stall.cash) */';
export declare const FULL_COMMIT: RegExp;
export declare const GIT_LOCATION_VARS: readonly string[];
export declare const TREE_PREFIX: RegExp;

export declare function budgetReasonProblem(value: unknown): string | undefined;
export declare function privateFileProblems(files: readonly PrivateFile[]): string[];
export declare function parsePrivateIndex(text: string): { index: PrivateIndex | undefined; problems: string[] };
export declare function privateIndexProblems(index: PrivateIndex, facts: PublicLookFacts, options?: { fixture?: boolean }): string[];
export declare function privateLooksProblems(input: {
    files: readonly PrivateFile[];
    indexText: string | undefined;
    facts: PublicLookFacts;
    fixture?: boolean;
}): string[];
export declare function publicLookFacts(): Promise<PublicLookFacts>;
export declare function gitFilesAt(input: { dir: string; commit: string; prefix?: string } & GitOptions): PrivateFile[];
export declare function gitTextAt(input: { dir: string; commit: string; prefix?: string; path: string } & GitOptions): string;
export declare function gitBlobAt(input: { dir: string; commit: string; prefix?: string; path: string } & GitOptions): Buffer;
export declare function gitCommitOf(input: { dir: string; ref?: string } & GitOptions): string;
export declare function gitTopOf(input: { dir: string } & GitOptions): string;
export declare function readPrivateLooksAt(
    input: { dir: string; commit: string; prefix?: string; facts: PublicLookFacts; fixture?: boolean } & GitOptions,
): { files: PrivateFile[]; indexText: string | undefined; problems: string[] };
