/** Types for `look-seals.mjs` — see that file for what each reader holds. */
import type { ServedSheetText } from './served-sheets.mjs';

type Seals = Readonly<Record<string, { readonly file: string; readonly sha256: string }>>;
type ReadPublic = (sheetPath: string, target: string) => { name: string; bytes: Buffer } | undefined;

export declare const SEAL_SUBJECTS: readonly { readonly cls: string; readonly where: string }[];
export declare const SIGN_CLASSES: readonly string[];
export declare const BRAND_FILES: readonly string[];
export declare function sha256(bytes: Buffer | string): string;
export declare function servedBytes(name: string, bytes: Buffer): Buffer | undefined;
export declare function sealSubjectProblem(selector: string): string | undefined;
export declare function sheetTargets(css: string): { value: string; selectors: string[]; inProperty: string | undefined; at: string | undefined }[];
export declare function sealProblems(sheets: readonly ServedSheetText[], seals?: Seals): { problems: string[]; read: string[]; unread: string[] };
export declare function sealPlacementProblems(
    sheets: readonly ServedSheetText[],
    options?: { seals?: Seals; root?: string; readPublic?: ReadPublic },
): { problems: string[]; uses: number };
export declare function brandOnSignProblems(sheets: readonly ServedSheetText[], options?: { root?: string; brand?: Set<string>; readPublic?: ReadPublic }): string[];
