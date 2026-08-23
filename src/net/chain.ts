/** Chronik page_size must stay below 200. */
export const HISTORY_PAGE_SIZE = 50;

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
    }>;
};

export type ManifestChronik = AddressChronik & {
    lokadId(lokadId: string): HistoryEndpoint;
    tx(txid: string): Promise<ChainTx>;
};
