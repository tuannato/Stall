/** Types for `wall-conditions.mjs` — the wall's container conditions read as sizes. */
export type WallFeature =
    | { readonly feature: 'orientation'; readonly value: 'portrait' | 'landscape' }
    | { readonly feature: 'width' | 'height'; readonly bound: 'min' | 'max'; readonly px: number };

export type WallCondition = { readonly text: string; readonly groups: readonly (readonly WallFeature[])[] };

export type WallCell = { readonly vector: string; readonly example: readonly [number, number] };

export type WallSize = { readonly name: string; readonly width: number; readonly height: number };

export declare const WALL_MIN_PX: number;
export declare function normaliseCondition(text: string): string;
export declare function parseWallCondition(prelude: string): WallCondition;
export declare function holds(condition: string | WallCondition, width: number, height: number): boolean;
export declare function vectorAt(conditions: readonly (string | WallCondition)[], width: number, height: number): string;
export declare function cellsOf(conditions: readonly (string | WallCondition)[]): WallCell[];
export declare function unpaintedCells(conditions: readonly (string | WallCondition)[], sizes: readonly WallSize[]): WallCell[];
export type LookCell = WallCell & { readonly look: readonly string[]; readonly wall: readonly string[] };
export declare function unpaintedLookCells(
    lookConditions: readonly (string | WallCondition)[],
    wallConditions: readonly (string | WallCondition)[],
    sizes: readonly WallSize[],
): LookCell[];
export declare function covers(outer: string | WallCondition, inner: string | WallCondition): boolean;
export declare function wallPassSizes(): WallSize[];
export declare function wallCellOwedFaults(
    required: Readonly<Record<string, { readonly conditions: readonly number[]; readonly vectors: readonly string[]; readonly names?: readonly string[] }>>,
    observed: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>,
): string[];
