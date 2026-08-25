import type { FetchStatus } from '../domain/state';

/**
 * Live offer updates over the chronik WebSocket.
 *
 * The agora plugin groups offers under `P` + the maker's pubkey, so one
 * subscription covers a whole stall. Any message on that group means this
 * seller's book moved — a take, a cancel, a new listing — and the honest
 * response is to re-read it rather than to guess what changed from the
 * message.
 */

/** `toHex(strToBytes('P'))`, the prefix the agora plugin groups under. */
const PUBKEY_GROUP_PREFIX = '50';

export const AGORA_PLUGIN = 'agora';

export type LiveChronik = {
    ws(config: {
        onMessage: (msg: { type: string }) => void;
        onReconnect?: () => void;
        autoReconnect?: boolean;
    }): LiveSocket;
};

export type LiveSocket = {
    waitForOpen(): Promise<void>;
    subscribeToPlugin(pluginName: string, group: string): void;
    close(): void;
};

export type LiveHandle = { close(): void };

export function stallGroup(pubkeyHex: string): string {
    return PUBKEY_GROUP_PREFIX + pubkeyHex;
}

/**
 * A refetch is applied only when it is a fact about the seller — offers, or an
 * empty book. Our own failures are dropped instead: the visitor keeps the last
 * good list rather than watching a working stall turn into an error because one
 * socket message raced a flaky node. Nothing is claimed that we did not read.
 */
export function isDefiniteResult(status: FetchStatus): boolean {
    return status.kind === 'offers' || status.kind === 'empty';
}

export function watchStall(
    chronik: LiveChronik,
    pubkeyHex: string,
    onChanged: () => void,
): LiveHandle {
    let closed = false;
    const socket = chronik.ws({
        autoReconnect: true,
        onMessage: (msg) => {
            // Every plugin message for this group is a change to this book.
            if (!closed && msg.type === 'Tx') {
                onChanged();
            }
        },
        // A dropped socket only stops updates; it never means the shop emptied.
        // Re-read on reconnect, because anything missed while down is unknown.
        onReconnect: () => {
            if (!closed) {
                onChanged();
            }
        },
    });

    void socket
        .waitForOpen()
        .then(() => {
            if (!closed) {
                socket.subscribeToPlugin(AGORA_PLUGIN, stallGroup(pubkeyHex));
            }
        })
        .catch(() => {
            // No live updates. The painted list stays as it was read.
        });

    return {
        close() {
            closed = true;
            try {
                socket.close();
            } catch {
                // Already gone.
            }
        },
    };
}
