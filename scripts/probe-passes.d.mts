/** Types for `probe-passes.mjs` — every pass `layout-check.mjs` runs, as values. */
export type Viewport = {
    readonly name: string;
    readonly width: number;
    readonly height: number;
    /** A short screen's page pass, whose sticky looks it measures. */
    readonly from?: string;
};

export type PassKind = 'page' | 'wall' | 'narrow' | 'short' | 'reduced' | 'worn-only' | 'contrast' | 'transparency';

export type WallBlock = 'portraitTall' | 'portraitShort' | 'landscapeShort';

export type Pass = {
    readonly key: string;
    readonly kind: PassKind;
    /** Its name in the coverage tables (`probe-coverage.mjs`). */
    readonly coverage: string;
    readonly vp?: Viewport;
    readonly viewports?: readonly Viewport[];
    /** Comma-separated screen names. */
    readonly screens?: string;
    readonly block?: WallBlock;
    readonly after?: readonly string[];
};

export declare const PASS_KINDS: Readonly<Record<PassKind, { readonly geometry: boolean }>>;
export declare const WALL_BLOCKS: Readonly<Record<WallBlock, string>>;
export declare const VIEWPORTS: readonly Viewport[];
export declare const CANVAS: Viewport;
export declare const PORTRAIT: Viewport;
export declare const TABLET: Viewport;
export declare const NARROW: Viewport;
export declare const NARROW_SCREENS: string;
export declare const SHORT_VIEWPORTS: readonly Viewport[];
export declare const WINDOW_SCREENS: string;
export declare const DESK_WALL: Viewport;
export declare const SHORT_WALL: Viewport;
export declare const DESK_WALL_SCREENS: string;
export declare const ALL_VIEWPORTS: readonly Viewport[];
export declare const REDUCED: readonly { readonly vp: Viewport; readonly screens: string }[];
export declare const CLEAR_SCREENS: readonly string[];
export declare const GEOMETRY_CANARY: readonly string[];
export declare const CONTRAST_PASS: Pass & { readonly viewports: readonly Viewport[] };
export declare const TRANSPARENCY_PASS: Pass & { readonly vp: Viewport; readonly screens: string };
export declare function geometryPlan(options?: { looks?: 'shipped' | 'workshop' }): Pass[];
export declare function runnerPasses(options?: { looks?: 'shipped' | 'workshop' }): Pass[];
export declare function passesNotRun(
    listed: readonly Pass[],
    built: { geometry: readonly Pass[]; contrast: Pass; transparency: Pass; kindsRun: ReadonlySet<string> },
): string[];
export declare function viewportOffPlan(pass: Pass | undefined, plan: readonly Pass[], measured: readonly number[] | undefined): string | undefined;
