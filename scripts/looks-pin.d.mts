/** Types for `looks-pin.mjs` — see that file for what the pin is, who reads it and what a pinned pair is. */
type Env = Readonly<Record<string, string | undefined>>;
type GitAt = { readonly dir: string; readonly git?: string; readonly env?: Env };

export type LooksPin = { readonly commit: string; readonly tree: string };
export type PairVerdict = { readonly pinned: boolean; readonly sentence: string };
type Facts = { readonly reserved: readonly number[]; readonly paid: readonly number[]; readonly released: readonly number[]; readonly overTarget: readonly number[]; readonly shippedClasses: readonly string[] };

export declare const LOOKS_PIN_FILE: 'deploy/looks.commit';
export declare const LOOKS_PIN_BYTES: 82;
export declare const PACKED_OUT: readonly string[];
export declare const PIN_SCRIPT: string;
export declare const PACKED_TREE_SCRIPT: string;
export declare function pinProblem(bytes: Buffer | string): string | undefined;
export declare function readLooksPin(root: string): LooksPin;
export declare function packedTreeOf(at: GitAt & { readonly commit: string; readonly prefix?: string }): string;
export declare function pinLineFor(at: GitAt & { readonly commit?: string; readonly facts?: Facts }): Promise<string>;
export declare function writeLooksPin(root: string, line: string): void;
export declare function pairVerdict(facts: {
    readonly commit: string;
    readonly pin?: LooksPin;
    readonly pinError?: string;
    readonly diskDiffers?: boolean;
    readonly packedTree?: string;
    readonly publicTree: string;
    readonly publicClean: boolean;
    readonly privateClean: boolean;
}): PairVerdict;
export declare function pinnedPair(at: GitAt & { readonly root: string; readonly commit: string }): PairVerdict;
