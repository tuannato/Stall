import type { FetchStatus } from '../domain/state';

/**
 * Live updates over the chronik WebSocket. One socket, two subscriptions.
 *
 * The agora plugin groups offers under `P` + the maker's pubkey, so one
 * subscription covers a whole stall's book. Any message on that group means the
 * book moved — a take, a cancel, a new listing — and the honest response is to
 * re-read it rather than to guess what changed from the message.
 *
 * The book is not the whole stall. A settings record, a description and a
 * decoration's token are all transactions at the stall *address*, and none of
 * them is in the agora group, so none of them ever woke this page: a seller
 * published a look and watched an unchanged shop. The second subscription is a
 * script subscription on the stall's hash, and it carries every one of those —
 * along with every ordinary payment, which is why what arrives is classified
 * rather than acted on wholesale.
 *
 * One socket rather than two: a second endpoint would buy attribution (this
 * message came from the group, that one from the script) at the price of a
 * second TCP and TLS connection per tab and a second reconnect machine.
 */

/** `toHex(strToBytes('P'))`, the prefix the agora plugin groups under. */
const PUBKEY_GROUP_PREFIX = '50';

export const AGORA_PLUGIN = 'agora';

export type LiveChronik = {
    ws(config: {
        onMessage: (msg: { type: string; txid?: string }) => void;
        /** Fired on every establish, including each reconnect. See `watchStall`. */
        onConnect?: () => void;
        onReconnect?: () => void;
        autoReconnect?: boolean;
    }): LiveSocket;
};

export type LiveSocket = {
    subscribeToPlugin(pluginName: string, group: string): void;
    /**
     * Subscribe to a script. `payload` for `'p2pkh'` is the 20-byte hash as
     * lowercase hex, and the library **throws** on anything else, so the call
     * site guards it. Sent once; the library replays it on every open.
     */
    subscribeToScript(scriptType: string, payload: string): void;
    close(): void;
    /**
     * Connect, and resolve once the socket is open. Required, not optional:
     * `ws()` hands back an endpoint that has not dialled anything, so a socket
     * without this is a socket that never opens. See `watchStall`.
     */
    waitForOpen(): Promise<void>;
    /** Stop reconnecting and drop the socket. The library's own idle mode. */
    pause?(): void;
    /** Reconnect and re-subscribe. Resolves once the socket is back. */
    resume?(): Promise<void>;
};

export type LiveHandle = {
    close(): void;
    /** Called when the tab goes away: stop holding a socket open. */
    pause(): void;
    /** Called when the tab comes back: reconnect and catch up once. */
    resume(): void;
};

/**
 * The least time between two re-reads caused by the socket dropping.
 *
 * chronik-client reconnects with **no backoff at all**: its `ws.onclose` calls
 * `onReconnect` and then `connectWs` immediately, so a network that refuses
 * connections spins as fast as it can refuse them. Our reconnect handler asks
 * for the offers again, which is right — anything missed while down is unknown
 * — but without a floor it turns that spin into an HTTP request storm. Measured
 * as a tab reopened after sleep: a loading indicator that never settles and a
 * warm machine.
 *
 * A re-read that is skipped is not lost: the next message on the group, the
 * next resume, or the retry control all ask again.
 */
export const MIN_REREAD_MS = 5_000;

/**
 * How long one transaction's messages are allowed to keep arriving before the
 * book is read. Short enough that a sale shows up as fast as it did; long
 * enough that mempool and confirmed for the same txid become one read.
 */
export const BURST_MS = 700;

/**
 * Stands in for a `Tx` message that carried no txid.
 *
 * chronik always sends one, so this is a message we could not read rather than
 * an event we can name — and a burst holding it has to wake every fact reader,
 * exactly as a transaction we failed to fetch does. Deliberately **not** shaped
 * like a txid: the caller gates on 64 lowercase hex before it asks chronik for
 * anything, so this takes the ask-everything branch without a second rule.
 */
export const UNKNOWN_TXID = 'unknown';

/**
 * The most transactions one burst will name individually.
 *
 * The script subscription hears every ordinary payment to the stall's
 * address, and dust is cheap — so `seen` was the one buffer in the app with
 * no cap, and every txid in it cost the consumer a serial `chronik.tx`
 * round trip in every open tab. Past this many distinct txids in one
 * window, naming them stops being an economy: the burst degrades to one
 * `UNKNOWN_TXID` entry, which the consumer already treats as "fetch
 * nothing, wake every fact reader, and mark the ring's gap" — the same
 * honest shape as a message that carried no txid. The consumer stays
 * serial on purpose: the ring is arrival-ordered, and under this cap the
 * loop is bounded. Test: `a-flood-degrades-to-one-unknown-not-a-fetch-storm`.
 */
export const MAX_BURST_TXIDS = 8;

export function stallGroup(pubkeyHex: string): string {
    return PUBKEY_GROUP_PREFIX + pubkeyHex;
}

/**
 * What is being watched. Both fields are optional and they are not the same
 * question: `pubkeyHex` is the agora group, which exists only once a route has
 * resolved to a maker; `hash` is the stall address, which exists on a waiting
 * screen that has no pubkey at all. A watch with neither subscribes to nothing
 * and is harmless.
 */
export type WatchedStall = {
    /** The maker key the agora plugin indexes offers under. */
    pubkeyHex?: string;
    /** The stall's hash160, lowercase hex. */
    hash?: string;
};

/**
 * Why a re-read is happening. `message` is news — the group announced a
 * transaction. `recheck` is housekeeping — a reconnect or a resume, where the
 * next read differs from the last as often by replica skew as by the world:
 * an effect keyed on a recheck's diff stages our failover as a sale.
 */
export type LiveTrigger = 'message' | 'recheck';

export type WatchHooks = {
    /**
     * The thing being watched moved: re-read it.
     *
     * For a resolved stall that is the offer book. It fires on the trailing
     * burst timer (`message`), and on a reconnect through `MIN_REREAD_MS`
     * (`recheck`) — the floor **drops**, which is right for a book because
     * the next message corrects it.
     */
    onChanged?: (trigger: LiveTrigger) => void;
    /**
     * The txids of one burst, drained before the read above was started.
     *
     * Handed over so the caller can ask what each one was and wake only the
     * readers that could be affected. `UNKNOWN_TXID` appears for a message that
     * carried no txid.
     */
    onBurst?: (txids: readonly string[]) => void;
    /**
     * The socket was established again after having been established before.
     *
     * Facts are never dropped by the floor. `MIN_REREAD_MS` is safe for the
     * book and wrong here: a settings publish is one transaction, and a read
     * that the floor drops stays stale until the visitor reloads. This rides a
     * trailing timer instead, and it rides the **establish** rather than
     * `onReconnect`, which chronik fires at the moment of the drop — before the
     * network is back.
     */
    onReestablished?: () => void;
    now?: () => number;
};

/**
 * A live refetch is applied only when it paints a book: offers, and nothing
 * else. Our failures were always dropped here; **an empty answer is now dropped
 * too**, because on this path it cannot be told apart from one.
 *
 * A take spends the old UTXO and re-creates the remainder as a new one. The
 * socket fires between those, and the re-read is a separate HTTP call that
 * starts again at the first host, so a replica that has seen the spend and not
 * the remainder answers `200` with no rows. That is our race, and painting
 * the empty screen built from it says the seller has nothing — the one sentence this
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
 * One socket, two subscriptions, each sent once.
 *
 * chronik-client 4.3.1's `ws.onopen` calls `_resubscribeAll`, which re-sends
 * every remembered subscription — scripts **and** plugins — through the
 * private senders, without pushing back onto `this.subs`. Public
 * `subscribeTo*` still push-then-send, so a second site in `onConnect` would
 * grow the list by one on every reconnect. `onConnect` keeps the fact
 * catch-up, skipping the first establish, which is the page load.
 */
export function watchStall(
    chronik: LiveChronik,
    stall: WatchedStall,
    hooks: WatchHooks = {},
): LiveHandle {
    const now = hooks.now ?? (() => Date.now());
    let closed = false;
    let socket: LiveSocket | undefined;
    let lastReread = 0;
    let burst: ReturnType<typeof setTimeout> | undefined;
    let facts: ReturnType<typeof setTimeout> | undefined;
    let establishes = 0;
    /** Collected between bursts, drained at the fire. */
    const seen = new Set<string>();
    const { pubkeyHex, hash } = stall;
    const group = pubkeyHex === undefined ? undefined : stallGroup(pubkeyHex);

    /** A re-read caused by the socket, floored so a reconnect spin cannot flood. */
    const rereadThrottled = (): void => {
        if (closed) {
            return;
        }
        const at = now();
        if (at - lastReread < MIN_REREAD_MS) {
            return;
        }
        lastReread = at;
        hooks.onChanged?.('recheck');
    };

    /**
     * One re-read per burst, not one per message.
     *
     * chronik types every transaction event as `Tx`, and one transaction on this
     * group arrives more than once — added to the mempool, then confirmed, and
     * the same again after a block is invalidated. Each of those was a full
     * `loadOffers` behind a fresh failover client that starts again at the first
     * host, so a single sale cost the index two or three identical reads per
     * open tab.
     *
     * A trailing timer rather than the floor above: the floor **drops**, and the
     * last message of a burst is the one carrying the settled book, so dropping
     * it leaves a sold row on screen until something unrelated happens. This
     * waits out the burst and then reads once. The floor stays where it is,
     * guarding the reconnect spin, which is a different failure — there the
     * later attempts carry no new information at all.
     *
     * **The txids are collected in `onMessage`, not here.** This guard exists
     * to keep one timer running, and a message that arrives while it is running
     * still names a transaction the caller has to classify — dropping it behind
     * the early return would lose exactly the settings publish that arrived
     * half a second after a sale.
     */
    const rereadCoalesced = (): void => {
        if (closed || burst !== undefined) {
            return;
        }
        burst = setTimeout(() => {
            burst = undefined;
            if (closed) {
                return;
            }
            // Drained synchronously, before either callback can await
            // anything: a txid that arrives while the reads below are in
            // flight belongs to the next burst, not to this one, and a set
            // emptied after the first await would swallow it.
            const txids = [...seen];
            seen.clear();
            // Deliberately does not stamp `lastReread`: the floor guards a
            // reconnect spin, and a read caused by a message must not
            // suppress the one caused by a drop. What was missed while the
            // socket was down is still unknown, however recently the book
            // was read.
            hooks.onChanged?.('message');
            if (txids.length > 0) {
                hooks.onBurst?.(txids);
            }
        }, BURST_MS);
    };

    /** The facts catch-up after a re-establish. Trailing, never floored. */
    const factsCoalesced = (): void => {
        if (closed || facts !== undefined) {
            return;
        }
        facts = setTimeout(() => {
            facts = undefined;
            if (!closed) {
                hooks.onReestablished?.();
            }
        }, BURST_MS);
    };

    const onEstablished = (): void => {
        if (closed) {
            return;
        }
        establishes += 1;
        // Not the first: that one is the page load, and the facts were read by
        // the load itself. Every establish after it is a gap of unknown length.
        if (establishes > 1) {
            factsCoalesced();
        }
    };

    socket = chronik.ws({
        autoReconnect: true,
        onMessage: (msg) => {
            if (closed || msg.type !== 'Tx') {
                return;
            }
            // Set semantics first, cap second: the same txid arriving as
            // mempool and then confirmed is one entry, not two toward the cap.
            const txid = typeof msg.txid === 'string' ? msg.txid : UNKNOWN_TXID;
            seen.add(seen.size >= MAX_BURST_TXIDS && !seen.has(txid) ? UNKNOWN_TXID : txid);
            rereadCoalesced();
        },
        onConnect: onEstablished,
        // A dropped socket only stops updates; it never means the shop emptied.
        // Re-read on reconnect, because anything missed while down is unknown —
        // but throttled, because the library reconnects without any backoff.
        onReconnect: rereadThrottled,
    });

    // Both subscriptions are sent once, and only from here. The library
    // remembers them and re-sends them on every open through `_resubscribeAll`,
    // so a second site in `onConnect` would grow each list by one per
    // establish.
    if (group !== undefined) {
        socket.subscribeToPlugin(AGORA_PLUGIN, group);
    }
    // Guarded because `subscribeToScript` **throws** on a payload that is not
    // 20 bytes of lowercase hex, and a stall whose hash we cannot subscribe to
    // still has a book worth watching.
    if (hash !== undefined) {
        try {
            socket.subscribeToScript('p2pkh', hash);
        } catch {
            // Nothing to say: the book subscription above is unaffected.
        }
    }

    // `ws()` only constructs the endpoint; it dials nothing. chronik-client
    // reaches `connectWs` from exactly three places — `waitForOpen`, `resume`,
    // and the auto-reconnect of a socket that is already established — so
    // without this call a freshly loaded stall holds a socket that never opens:
    // `onConnect` never fires, the remembered subscriptions are never put on
    // the wire, and no message ever arrives. The one accidental way back was a
    // visibility cycle, because `pause` no-ops on an undefined socket and
    // `resume` connects when it finds none — live updates for a visitor who
    // left the tab and came back, and for nobody else.
    //
    // Not awaited, because the stall is painted from the HTTP read and must not
    // wait on a socket. Caught, because `connectWs` **throws** when no host
    // answers, and that rejection is otherwise unhandled on a page that is
    // otherwise fine. A socket that could not open on this first try stays
    // quiet until `resume` or the retry control: nothing was established, so
    // there is no reconnect loop to fall back into.
    void socket.waitForOpen().catch(() => {
        // Nothing to say here that the screen does not already say.
    });

    return {
        close() {
            closed = true;
            if (burst !== undefined) {
                clearTimeout(burst);
                burst = undefined;
            }
            if (facts !== undefined) {
                clearTimeout(facts);
                facts = undefined;
            }
            seen.clear();
            try {
                socket?.close();
            } catch {
                // Already gone.
            }
        },
        pause() {
            // Not `close()`: that marks the socket manually closed and it will
            // never come back. `pause` is the library's own idle mode.
            try {
                socket?.pause?.();
            } catch {
                // Already gone.
            }
        },
        resume() {
            if (closed) {
                return;
            }
            try {
                void socket?.resume?.();
            } catch {
                // A socket that will not resume is one the next refresh rebuilds.
            }
            // Whatever happened while the tab was away is unknown, so ask once —
            // still floored, so flapping in and out of the background cannot
            // turn into a request per flap.
            rereadThrottled();
        },
    };
}
