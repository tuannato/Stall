/** Types for `looks-artifact.mjs` — see that file for the pack, its allow-list and the unwrap. */
type Env = Readonly<Record<string, string | undefined>>;

/** One member of an artifact's tar, as `readArtifactTar` reads it. */
export type ArtifactMember = { readonly path: string; readonly dir: boolean; readonly exec: boolean; readonly data?: Buffer };

/** What an unwrap carried: the pinned commit and tree, the carried repository's commit, and how many files it holds. */
export type Unwrapped = { readonly commit: string; readonly tree: string; readonly carried: string; readonly files: number };

/** The build's constants the allow-list program is written from (`scripts/private-looks.mjs`, `scripts/workshop-css.mjs`). */
export type AllowListConstants = {
    readonly slug: RegExp;
    readonly slugMax: number;
    readonly artName: RegExp;
    readonly faceLicence: RegExp;
    readonly rootFiles: readonly string[];
    readonly lookFiles: readonly string[];
    readonly fileMode: string;
};

export declare const PIN_SCRIPT: string;
export declare const ARTIFACT_DIR: 'looks-artifact';
export declare const ARTIFACT_TAR: 'looks.tar';
export declare const ARTIFACT_STAMP: 'pin';
export declare const ARTIFACT_TAR_MAX_BYTES: number;
export declare function packAllowProgram(constants: AllowListConstants): string;
export declare const PACK_ALLOW_PROGRAM: string;
export declare const PACK_SCRIPT: string;
export declare function readArtifactTar(tar: Buffer): ArtifactMember[];
export declare function treeOfDisk(dir: string): { readonly id: string; readonly files: number };
export declare function unwrapLooksArtifact(at: { readonly artifact: string; readonly dest: string; readonly root: string; readonly git?: string; readonly env?: Env }): Unwrapped;
export declare function unwrapLine(unwrapped: Unwrapped): string;
