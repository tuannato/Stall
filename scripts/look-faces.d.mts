/** Types for `look-faces.mjs` — see that file for what a private look's faces must carry. */
export type ArtFile = { readonly name: string; readonly bytes: Buffer };
export type LookFont = { readonly name: string; readonly files: Readonly<Record<string, string>>; readonly licence: string };
export type FontNotice = { readonly name: string; readonly files: readonly string[]; readonly subsets: string; readonly licenceText: string };

export declare const LOOK_FONTS_FILE: 'fonts.json';
export declare const FACE_FILE: RegExp;
export declare const OFL_STATEMENT: RegExp;
export declare const FONT_NAME_MAX: number;
export declare const SUBSET_MAX: number;
export declare function woff2NameRecords(buf: Buffer): { id: number; platform: number; text: string }[];
export declare function reservedFontNames(licenceText: string): string[];
export declare function parseLookFonts(text: string): { fonts: LookFont[] | undefined; problems: string[] };
export declare function lookFaceProblems(input: { fontsText: string | undefined; art: readonly ArtFile[]; named: ReadonlySet<string> }): string[];
export declare function lookFontNotices(input: { fontsText: string | undefined; art: readonly ArtFile[] }): FontNotice[];
