/** Types for `looks-selection.mjs` — see that file for what a selection is and who refuses one. */
export type LooksTarget = 'preview' | 'production';
export type LooksSelection = { readonly target: LooksTarget; readonly dir: string; readonly commit?: string };
type Env = Readonly<Record<string, string | undefined>>;

export declare const SELECTION_ENV: { readonly target: 'STALL_LOOKS_TARGET'; readonly dir: 'STALL_LOOKS_DIR'; readonly commit: 'STALL_LOOKS_COMMIT' };
export declare const LOOKS_TARGETS: readonly LooksTarget[];
export declare const FIXTURE_LOOKS_DIR: 'layout/fixture-private-looks';
export declare function selectionFromEnv(env: Env): LooksSelection | undefined;
export declare function withoutSelection<T extends Env>(env: T): T;
export declare function selectionRefusal(command: string, env: Env): string | undefined;
export declare function refuseSelection(command: string, env?: Env): void;
