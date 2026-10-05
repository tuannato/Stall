/** Types for `private-looks-plant.mjs` — test support: a private look repository planted from the fixture. */
type Env = Readonly<Record<string, string | undefined>>;

export type PlantedLooks = {
    readonly dir: string;
    readonly env: Env;
    readonly git: (...args: string[]) => string;
    readonly head: () => string;
    /** The environment variables that select it at `preview`. */
    readonly selection: Env;
};

export declare const PLANTED_CLASS: 't-planted-look';
export declare const PLANTED_ROW_PREFIX: 'att-planted-';
export declare function removePlants(): void;
export declare function plantLooks(edit?: (path: string, text: string) => string, add?: Readonly<Record<string, string | Buffer>>): PlantedLooks;
export declare function beforeReduce(css: string, rule: string): string;
export declare function syntheticWoff2(records: readonly { id: number; text: string }[]): Buffer;
export declare function oflText(holder: string, reserved?: string): string;
