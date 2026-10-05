/** Types for `served-sheets.mjs` — see that file for which sheets a run serves. */
import type { PrivateIndexEntry } from './private-looks.mjs';
import type { ServedSheet } from './sheet-roles.mjs';

type Env = Readonly<Record<string, string | undefined>>;

/** One private look a run reads, its files as git holds them at `commit`. */
export type PrivateLookRead = {
    /** `fixture`: the tracked fixture, read for the guards; `selection`: the looks the environment's selection carries. */
    readonly source: 'fixture' | 'selection';
    readonly commit: string;
    readonly entry: PrivateIndexEntry;
    /** Where the sheet sits, for messages: from this checkout's root, or the repository's own root. */
    readonly sheetPath: string;
    readonly artDir: string;
    readonly css: string;
    readonly lookText: string;
    /** `look.json` parsed, or undefined when it is not JSON (the build's validator says why). */
    readonly look: unknown;
    /** Every plain file of the look's `art/`, as git holds it. */
    readonly art: readonly { readonly name: string; readonly bytes: Buffer }[];
};

/** A served sheet with its text; a private look's row carries its read. */
export type ServedSheetText = (
    | ServedSheet
    | {
          readonly path: string;
          readonly role: 'private';
          readonly lookClass: string;
          readonly load: 'worn';
          readonly artDir: string;
          readonly ownArt: { readonly dir: 'art'; readonly files: readonly string[] };
          readonly look: PrivateLookRead;
      }
) & { readonly css: string };

type ReadOptions = { root?: string; env?: Env; fixture?: boolean; git?: string; gitEnv?: Env };

export declare const ROOT: string;
export declare const PRIVATE_ROLE: 'private';
export declare function privateLookReads(options?: ReadOptions & { facts?: unknown }): Promise<PrivateLookRead[]>;
export declare function ownArtOf(look: PrivateLookRead): { dir: 'art'; files: string[] };
export declare function servedSheets(options?: ReadOptions): Promise<readonly ServedSheetText[]>;
export declare function guardSheets(): Promise<readonly ServedSheetText[]>;
export declare function privateRows(sheets: readonly ServedSheetText[]): (ServedSheetText & { role: 'private'; look: PrivateLookRead })[];
export declare function lookRows(sheets: readonly ServedSheetText[]): ServedSheetText[];
