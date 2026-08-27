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
        /** Fired on every establish, including each reconnect. See `watchStall`. */
        onConnect?: () => void;
        onReconnect?: () => void;
        autoReconnect?: boolean;
    }): LiveSocket;
};

export type LiveSocket = {
    subscribeToPlugin(pluginName: string, group: string): void;
    close(): void;
};

export type LiveHandle = { close(): void };

export function stallGroup(pubkeyHex: string): string {
    return PUBKEY_GROUP_PREFIX + pubkeyHex;
}

/**
 * A live refetch is applied only when it paints a book: offers, and nothing
 * else. Our failures were always dropped here; **an empty answer is now dropped
 * too**, because on this path it cannot be told apart from one.
 *
 * A take spends the old UTXO and re-creates the remainder as a new one. The
 * socket fires between those, and the re-read is a separate HTTP call that
 * starts again at the first host, so a replica that has seen the spend and not
 * the remainder answers `200` with no rows. That is our race, and painting
 * `EMPTY_TITLE` from it says the seller has nothing — the one sentence this
 * project promised not to write from a guess.
 *
 * The cost is real and chosen: a stall whose last offer genuinely sold keeps
 * that row until the visitor asks again. `CLAUDE.md` §8 already accepted
 * showing a dead offer; it never accepted emptying a working shop. A dead row
 * is corrected by Cashtab within seconds of a click. A visitor told the stall
 * is empty closes the tab, and the seller never learns they lost them.
 *
 * Which is why the empty screen carries a retry control: that is how a genuine
 * sell-out clears without a reload.
 */
export function isDefiniteResult(status: FetchStatus): boolean {
    return status.kind === 'offers';
}

/**
 * Subscribing once was not enough, and the socket did not say so.
 *
 * chronik-client re-sends the subscriptions it remembers whenever a socket
 * opens — scripts, lokad ids, token ids, txids, blocks, txs — and **not
 * plugins**, which is the only kind Stall uses. So a subscribe sent after the
 * first open was the only one ever sent: after the first drop the socket
 * reconnected, looked alive, and never carried another agora message. A phone
 * changing network is enough.
 *
 * `onConnect` fires on every establish, so it is the one place this belongs.
 * It must also be the **only** place: `subscribeToPlugin` appends to the list
 * it remembers without checking for a duplicate, so subscribing here *and*
 * after the first open would send twice, and grow by one on every reconnect.
 */
export function watchStall(
    chronik: LiveChronik,
    pubkeyHex: string,
    onChanged: () => void,
): LiveHandle {
    let closed = false;
    let socket: LiveSocket | undefined;
    const group = stallGroup(pubkeyHex);

    const subscribe = (): void => {
        if (closed || socket === undefined) {
            return;
        }
        socket.subscribeToPlugin(AGORA_PLUGIN, group);
    };

    socket = chronik.ws({
        autoReconnect: true,
        onMessage: (msg) => {
            // Every plugin message for this group is a change to this book.
            if (!closed && msg.type === 'Tx') {
                onChanged();
            }
        },
        onConnect: subscribe,
        // A dropped socket only stops updates; it never means the shop emptied.
        // Re-read on reconnect, because anything missed while down is unknown.
        onReconnect: () => {
            if (!closed) {
                onChanged();
            }
        },
    });

    return {
        close() {
            closed = true;
            try {
                socket?.close();
            } catch {
                // Already gone.
            }
        },
    };
}
