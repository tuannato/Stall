/** Types for `private-looks-plant.mjs` — test support: a private look repository planted from the fixture, and the canary from public bytes. */
type Env = Readonly<Record<string, string | undefined>>;

export type PlantedLooks = {
    readonly dir: string;
    readonly env: Env;
    readonly git: (...args: string[]) => string;
    readonly head: () => string;
    /** The environment variables that select it at `preview`. */
    readonly selection: Env;
};

export declare const PRIVATE_PATHS_ADMITTED: readonly string[];
export declare const PRIVATE_PATHS_REFUSED: readonly string[];
export declare const PRIVATE_MODES_REFUSED: readonly string[];
export declare const PLANTED_CLASS: 't-planted-look';
export declare const PLANTED_ROW_PREFIX: 'att-planted-';
export declare function removePlants(): void;
export declare function plantLooks(
    edit?: (path: string, text: string) => string,
    add?: Readonly<Record<string, string | Buffer>>,
    options?: { readonly slug?: string },
): PlantedLooks;
/** The commit of this repository the canary was made from: the recipe reads its bytes there. */
export declare const CANARY_MADE_FROM: string;
/** The canary's packed tree as files, rebuilt from this repository's bytes at `at` (`CANARY_MADE_FROM` by default). */
export declare function canaryFiles(options?: { readonly at?: string }): Record<string, string | Buffer>;
/** A private look repository holding the canary from public bytes, a planted README and log beside it. */
export declare function plantCanary(
    edit?: (path: string, contents: string | Buffer) => string | Buffer | undefined,
    add?: Readonly<Record<string, string | Buffer>>,
): PlantedLooks;
export declare function beforeReduce(css: string, rule: string): string;
export declare function syntheticWoff2(records: readonly { id: number; text: string }[]): Buffer;
export declare function oflText(holder: string, reserved?: string): string;
