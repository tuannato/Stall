/** Types for `private-looks-build.mjs` — see that file for what a build's private-look selection is. */
import type { Plugin } from 'vite';
import type { FontNotice } from './look-faces.mjs';
import type { PrivateIndex, PrivateIndexEntry, PrivateFile, PublicLookFacts } from './private-looks.mjs';

export type LooksTarget = 'preview' | 'production';

export type LooksSelection = { readonly target: LooksTarget; readonly dir: string; readonly commit?: string };

type Env = Readonly<Record<string, string | undefined>>;
type GitOptions = { readonly git?: string; readonly env?: Env };

/** A look's place as the app's validator reads it (`LookPlace` in `src/domain/lookData.ts`). */
export type LookPlaceForBuild = { readonly id: number; readonly sheetClass: string; readonly file: string; readonly mintable: true };

/** The app's own validator over a `look.json`'s text: every problem, or none. */
export type ValidateLook = (text: string, place: LookPlaceForBuild) => readonly string[];

export type SelectedLook = {
    readonly entry: PrivateIndexEntry;
    readonly lookText: string;
    readonly sheet: string;
    readonly art: readonly { readonly name: string; readonly bytes: Buffer }[];
    /** What the notices say of the faces it serves (`lookFontNotices`); none for a look that serves none. */
    readonly fonts: readonly FontNotice[];
};

export type ModuleEntry = { readonly id: number; readonly sheetClass: string; readonly sheetPath: string; readonly lookText: string };

export declare const PRIVATE_LOOKS_MODULE: 'virtual:stall-private-looks';
export declare const LOOKS_TARGETS: readonly LooksTarget[];
export declare const SELECTION_ENV: { readonly target: 'STALL_LOOKS_TARGET'; readonly dir: 'STALL_LOOKS_DIR'; readonly commit: 'STALL_LOOKS_COMMIT' };
export declare const FIXTURE_LOOKS_DIR: 'layout/fixture-private-looks';
export declare const MATERIALISED_PREFIX: string;
export declare const RESOLVED_MODULE: '\0stall:private-looks';
export declare const REQUIRED_ENV: 'STALL_LOOKS_REQUIRED';

export declare function selectionFromEnv(env: Env): LooksSelection | undefined;
export declare function includedEntries(index: PrivateIndex, target: LooksTarget, facts: Pick<PublicLookFacts, 'released'>): PrivateIndexEntry[];
export declare function selectedTree(input: { root: string; selection: LooksSelection } & GitOptions): { dir: string; prefix: string | undefined; fixture: boolean };
export declare function selectedIndex(input: { root: string; selection: LooksSelection; facts: PublicLookFacts } & GitOptions): {
    commit: string;
    read: { dir: string; commit: string; prefix: string | undefined } & GitOptions;
    files: PrivateFile[];
    index: PrivateIndex;
};
/** The theme table's custom property values, `{ '--s-name-anim': [...] }` (`themeVarValues`). */
export type ThemeVarValues = Readonly<Record<string, readonly string[]>>;

export declare function readSelectedLooks(
    input: { root: string; selection: LooksSelection; facts: PublicLookFacts; validateLook: ValidateLook; vars: ThemeVarValues } & GitOptions,
): { commit: string; index: PrivateIndex; looks: SelectedLook[] };
export declare function crossSheetProblems(input: { root: string; looks: readonly SelectedLook[]; vars: ThemeVarValues }): string[];
export declare function sharedRowClasses(looks: readonly SelectedLook[]): string[];
export declare function checkSelectedDist(
    input: { dir: string; selection: LooksSelection | undefined; root: string; facts: PublicLookFacts; harnessClasses?: readonly string[] } & GitOptions,
): string[];
export declare function materialise(looks: readonly SelectedLook[], into: string): ModuleEntry[];
export declare function jsString(value: string): string;
export declare function privateLooksModuleCode(entries: readonly ModuleEntry[]): string;
export declare function privateLooksPlugin(options: {
    facts: PublicLookFacts;
    validateLook: ValidateLook;
    vars?: ThemeVarValues;
    env?: Env;
    git?: string;
    /** A harness build's own look classes (8e2), which its dist check reads as the harness's: never handed by the app's own config. */
    harnessClasses?: readonly string[];
}): Plugin;
