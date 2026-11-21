export const OG_CARD_WIDTH: number;
export const OG_CARD_HEIGHT: number;
export const OG_CARD_MAX_BYTES: number;
export const OG_CARD_CHUNKS: readonly string[];
export const OG_CARD_PATH: RegExp;
export function ogCardPath(id: number): string;
export function ogCardProblems(bytes: Buffer): string[];
