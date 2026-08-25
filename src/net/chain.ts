/** Chronik page_size must stay below 200. */
export const HISTORY_PAGE_SIZE = 50;

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

export type ChainTxInput = {
    inputScript: string;
    outputScript?: string;
};

export type ChainTxOutput = {
    outputScript: string;
};

export type ChainTx = {
    txid: string;
    block?: { height: number };
    inputs: readonly ChainTxInput[];
    outputs: readonly ChainTxOutput[];
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
