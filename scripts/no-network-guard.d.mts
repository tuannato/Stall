/** Types for `no-network-guard.mjs` — see that file for what each road refuses. */
export type Refusal = { road: string; to: string; origin?: string };

export type GuardState = {
    /** Every refusal not yet checked, oldest first. */
    records: Refusal[];
    /** Refuse loopback too (the self-tests' switch). */
    strict: boolean;
    /** The vitest file's last hook has run: a refusal now goes to `onLate`. */
    closed: boolean;
    /** This process reads the report file (the vitest worker); others append to it. */
    reader: boolean;
    reportFile: string | undefined;
    readAt: number;
    /** The test a refusal is made for: the one running, or the one that started this child. */
    originOf: () => string | undefined;
    onLate: (refusal: Refusal) => void;
    installed: boolean;
};

export declare const REPORT_ENV: 'STALL_NO_NETWORK_REPORT';
export declare const ORIGIN_ENV: 'STALL_NO_NETWORK_ORIGIN';
export declare const SELF_TESTS: readonly string[];
export declare function mayEmpty(testPath: string | undefined): boolean;
export declare function isLoopbackAddress(address: string): boolean;
export declare function refuse(road: string, to: string): Error;
export declare function installNoNetwork(): GuardState;
export declare function guardState(): GuardState;
export declare function collectReports(): void;
