/** Constructor order only. Do not add a host that lacks the agora plugin. */
export const CHRONIK_HOSTS = [
    'https://chronik-native1.fabien.cash',
    'https://chronik-native2.fabien.cash',
    'https://chronik-native3.fabien.cash',
] as const;

export type ChronikHost = (typeof CHRONIK_HOSTS)[number];
