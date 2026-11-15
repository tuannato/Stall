/** Types for `private-guard.mjs` — see that file for what a private look's guard file holds. */
export type GuardMoving = { readonly reader: string; readonly how: string } | { readonly reason: string };
export type GuardRow = { readonly follows: 'palette' | 'art'; readonly underMood?: string; readonly moving?: GuardMoving };
export type Guard = { readonly rows: Readonly<Record<string, GuardRow>>; readonly art: Readonly<Record<string, string>> };
export type GuardedDecoration = { readonly cls: string; readonly paint: unknown; readonly motion: boolean; readonly mount: unknown };

export declare const LOOK_GUARD_FILE: 'guard.json';
export declare const GUARD_FOLLOWS: readonly ['palette', 'art'];
export declare const GUARD_REASON_MIN_CHARS: number;
export declare const GUARD_STRUCTURE_CLASSES: readonly string[];
export declare const GUARD_ART_PROPS: readonly string[];
export declare function guardedDecorations(look: unknown): GuardedDecoration[];
export declare function parseGuard(text: string, look: unknown): { guard: Guard | undefined; problems: string[] };
export declare function guardArtKeyProblem(
    key: string,
    look: { readonly lookClass: string; readonly nodeClasses: readonly string[] },
): string | undefined;
