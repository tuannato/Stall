/**
 * Chronik's own ceiling, exactly: `MAX_HISTORY_PAGE_SIZE` is 200 inclusive
 * (out-of-range is HTTP 400, not a clamp — asking 201 breaks the walk).
 * This sat at 50 for no recorded reason and left 4× on the table: every
 * walk ceiling in this file is denominated in round trips, so page size is
 * reach. Measured 2026-08-31 on chronik-native1 before raising it: a full
 * 200-tx page answers in the same time as a 50-tx one (306ms vs 232ms
 * median on a 38k-tx index — round-trip dominates, payload does not), and
 * a page bigger than the history costs nothing at either size.
 */
export const HISTORY_PAGE_SIZE = 200;

/**
 * Round-trip ceiling for any history walk. History is newest-first and a live
 * Agora listing is a recent send, so a stall that exists resolves on page 0;
 * this bounds the failure path, where nothing matches and the walk would
 * otherwise run the length of the address.
 *
 * Truncation is never reported as a fact about the seller. A walk that stops
 * early knows less than a walk that finished, and has to say so.
 */
export const MAX_HISTORY_PAGES = 10;

/**
 * Per-input and per-output plugin entries, as a node running the plugin reports
 * them. Keyed by plugin name; the value's shape is the plugin's business and
 * nothing here reads it — only whether the key is there.
 *
 * Optional twice over: a node without the plugin sends no such field, and this
 * type is structural, so nothing may assume chronik filled what it did not
 * promise.
 */
export type ChainPluginEntries = Record<string, unknown>;

export type ChainTxInput = {
    inputScript: string;
    outputScript?: string;
    plugins?: ChainPluginEntries;
};

export type ChainTxOutput = {
    outputScript: string;
    plugins?: ChainPluginEntries;
};

export type ChainTx = {
    txid: string;
    block?: { height: number };
    /** Avalanche pre-consensus finality. Absent from a fixture reads as false. */
    isFinal?: boolean;
    inputs: readonly ChainTxInput[];
    outputs: readonly ChainTxOutput[];
    /**
     * The tokens a transaction moved, as chronik reports them. Optional here and
     * not on the walks: only `classifyTx` reads it, and a fixture written for a
     * manifest walk has no business inventing one. `tokenId` is optional in turn
     * because this type is structural — nothing in this app may assume chronik
     * filled a field it did not promise.
     */
    tokenEntries?: readonly { tokenId?: string }[];
};

export type HistoryPage = {
    txs: readonly ChainTx[];
    numPages: number;
    numTxs: number;
};

export type HistoryEndpoint = {
    history(page?: number, pageSize?: number): Promise<HistoryPage>;
};

export type AddressChronik = {
    address(address: string): HistoryEndpoint;
};

export type TokenChronik = {
    token(tokenId: string): Promise<{
        genesisInfo: {
            tokenName: string;
            tokenTicker: string;
            decimals: number;
            /** A homepage the minter wrote. Optional: plenty of tokens set none. */
            url?: string;
        };
        tokenType?: {
            protocol: string;
            type: string;
        };
    }>;
};

export type ManifestChronik = AddressChronik & {
    lokadId(lokadId: string): HistoryEndpoint;
    tx(txid: string): Promise<ChainTx>;
};
