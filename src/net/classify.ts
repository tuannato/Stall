import { STLD_HEX } from '../domain/description';
import { isStl1 } from '../domain/manifest';
import type { BookShape, EventStatus, StallEvent, StallEventKind } from '../domain/state';
import type { ChainPluginEntries, ChainTx } from './chain';
import {
    AGORA_PLUGIN,
    FINALIZATION_PRE_CONSENSUS,
    TX_CONFIRMED,
    TX_FINALIZED,
    type LiveTxStatus,
} from './live';
import { txSignedByStall } from './manifest';
import { opReturnPushes } from './script';

/**
 * Which of the stall's facts a transaction could have changed.
 *
 * The offer book has its own answer — any message on the agora group means the
 * book moved, and it is re-read without asking why. This is the other half: a
 * script subscription carries every transaction the stall address touches, and
 * most of them are ordinary money. Walking the settings index for each of those
 * would turn a refund into two capped history walks in every open tab.
 *
 * **Read with the same predicates the readers use.** `loadManifest` finds a
 * record by `opReturnPushes` plus the `STL1` lokad; `loadDescriptions` by
 * `STLD`; `loadHeldTokens` by a token the address holds. So this function
 * misses exactly what those miss — an eMPP-wrapped record is invisible to both,
 * consistently — and a miss is a delay until the next event or the retry
 * control, never a wrong screen.
 *
 * **Authorship is deliberately not checked here.** `loadManifest` and
 * `loadDescriptions` verify the input script themselves, and doing it twice
 * would mean this module deciding what counts as the seller's signature in a
 * second place. A stranger's `STL1`-shaped dust therefore costs one walk that
 * finds nothing — never a painted lie.
 */
export type FactsToRead = {
    /** An `STL1` record: the stall's name, look and attachment flags. */
    settings: boolean;
    /** An `STLD` record: the seller's words about one of their tokens. */
    descriptions: boolean;
    /** A token this stall's decorations depend on moved at this address. */
    holdings: boolean;
};

export const NO_FACTS: FactsToRead = {
    settings: false,
    descriptions: false,
    holdings: false,
};

export const ALL_FACTS: FactsToRead = {
    settings: true,
    descriptions: true,
    holdings: true,
};

export function anyFact(facts: FactsToRead): boolean {
    return facts.settings || facts.descriptions || facts.holdings;
}

export function unionFacts(a: FactsToRead, b: FactsToRead): FactsToRead {
    return {
        settings: a.settings || b.settings,
        descriptions: a.descriptions || b.descriptions,
        holdings: a.holdings || b.holdings,
    };
}

/**
 * What this transaction could have changed, given the stall's own output script
 * and the attachment tokens its current settings depend on.
 *
 * Pure: no network, no DOM, no clock. The caller fetched the transaction and
 * the caller decides what to do with the answer.
 *
 * **Every output is scanned, not only the first.** ABC reads a transaction's
 * lokad id from its first output alone, which is how the *index* is built — it
 * is not a rule about where a record may sit, and both of this app's readers
 * loop over `tx.outputs`. Stopping at output zero here would classify a record
 * the readers would have found as ordinary traffic.
 */
export function classifyTx(
    tx: ChainTx,
    stallOutputScript: string,
    wantedTokenIds: ReadonlySet<string>,
): FactsToRead {
    let settings = false;
    let descriptions = false;
    for (const output of tx.outputs) {
        const pushes = opReturnPushes(output.outputScript);
        if (pushes === undefined) {
            continue;
        }
        if (isStl1(pushes)) {
            settings = true;
        } else if (isStld(pushes)) {
            descriptions = true;
        }
    }
    return {
        settings,
        descriptions,
        holdings: movesAWantedToken(tx, stallOutputScript.toLowerCase(), wantedTokenIds),
    };
}

/**
 * Whether this transaction touched the agora plugin at all.
 *
 * A node running `agora.py` tags the inputs and outputs it indexed, so a
 * listing, a take and a cancel all carry an entry and ordinary money does not.
 * Only the key is read — what the plugin put in the value is the plugin's
 * business, and reading it here would be a second parser of the same bytes.
 *
 * **A `false` is weaker than it looks and no screen may state it.** A node
 * without the plugin sends no entries at all, and this app's own hosts are
 * chosen for having it (§4) but a fixture and a future host need not. Used only
 * to name an event that already happened, never to decide that one did not.
 */
export function touchesAgora(tx: ChainTx): boolean {
    for (const input of tx.inputs) {
        if (input.plugins?.[AGORA_PLUGIN] !== undefined) {
            return true;
        }
    }
    for (const output of tx.outputs) {
        if (output.plugins?.[AGORA_PLUGIN] !== undefined) {
            return true;
        }
    }
    return false;
}

/**
 * Whether an agora entry carries **groups** — the difference between a live
 * offer and the plugin's own bookkeeping. A cancel and a fully-taken offer
 * both leave an output tagged with an ERROR entry and empty groups, so an
 * entry's mere presence proves much less than a grouped one: reading presence
 * as "an offer" would name a cancel's leavings a listing.
 */
function groupedAgoraEntry(entries: ChainPluginEntries | undefined): boolean {
    const entry = entries?.[AGORA_PLUGIN];
    if (entry === null || typeof entry !== 'object') {
        return false;
    }
    const groups = (entry as { groups?: unknown }).groups;
    return Array.isArray(groups) && groups.length > 0;
}

/**
 * What a book transaction provably did — and nothing more.
 *
 * `consumed`: a grouped offer was spent. True of a take **and** of a cancel,
 * which are the same shape on the wire, so no caller may print "sold" from
 * it. `appeared`: a grouped output entered the book — a new listing, or a
 * partial take's remainder. `both` is the ordinary partial take. `undefined`
 * is a transaction whose entries prove neither, which stays "the book moved":
 * a node without the plugin sends no entries at all, and `touchesAgora`'s own
 * rule holds here — absence is never evidence of absence.
 */
export function bookShapeOf(tx: ChainTx): BookShape | undefined {
    const consumed = tx.inputs.some((input) => groupedAgoraEntry(input.plugins));
    const appeared = tx.outputs.some((output) => groupedAgoraEntry(output.plugins));
    if (consumed && appeared) {
        return 'both';
    }
    if (consumed) {
        return 'consumed';
    }
    if (appeared) {
        return 'appeared';
    }
    return undefined;
}

/**
 * One name for one transaction, from the classification already made of it.
 *
 * A transaction can be several things at once — a settings record paid for out
 * of a sale — so this is a priority, not a set: what a reader would call it if
 * they had to use one word. The stall's own records come first because they are
 * the rarest and the most consequential; ordinary money is last because it is
 * almost all of the traffic.
 *
 * Pure, and deliberately takes the `FactsToRead` rather than re-deriving it: two
 * places deciding what an `STL1` looks like is how they drift apart.
 */
export function eventKindOf(tx: ChainTx, facts: FactsToRead): StallEventKind {
    if (facts.settings) {
        return 'settings';
    }
    if (facts.descriptions) {
        return 'description';
    }
    if (facts.holdings) {
        return 'token-move';
    }
    if (touchesAgora(tx)) {
        return 'book';
    }
    return 'other';
}

/**
 * A decoration's token arriving at, or leaving, the stall address.
 *
 * Both directions matter and for the same reason: §7 says moving the token
 * takes the decoration off, so a spend is as much a change as a receive. The
 * token ids are compared against what the *current* settings ask for — a
 * transfer of something this stall never wore is ordinary traffic, and the
 * holdings read exists to answer one question, not to inventory a wallet.
 */
function movesAWantedToken(
    tx: ChainTx,
    stallOutputScript: string,
    wantedTokenIds: ReadonlySet<string>,
): boolean {
    if (wantedTokenIds.size === 0) {
        return false;
    }
    const entries = tx.tokenEntries;
    if (entries === undefined || entries.length === 0) {
        return false;
    }
    let wanted = false;
    for (const entry of entries) {
        const id = entry?.tokenId;
        if (typeof id === 'string' && wantedTokenIds.has(id)) {
            wanted = true;
            break;
        }
    }
    if (!wanted) {
        return false;
    }
    return touchesScript(tx, stallOutputScript);
}

function touchesScript(tx: ChainTx, stallOutputScript: string): boolean {
    for (const input of tx.inputs) {
        if (input.outputScript?.toLowerCase() === stallOutputScript) {
            return true;
        }
    }
    for (const output of tx.outputs) {
        if (output.outputScript.toLowerCase() === stallOutputScript) {
            return true;
        }
    }
    return false;
}

/**
 * The same test `loadDescriptions` makes of a push list, kept here rather than
 * imported because it is private there — and private for a good reason: this
 * one answers "could be ours", while the reader's decides what a record says.
 */
function isStld(pushes: Uint8Array[]): boolean {
    const first = pushes[0];
    if (first === undefined || first.length !== 4) {
        return false;
    }
    let hex = '';
    for (const b of first) {
        hex += b.toString(16).padStart(2, '0');
    }
    return hex === STLD_HEX;
}

/**
 * Everything one row needs to be named without asking the chain twice.
 *
 * `script` and `hash` are two views of the same address and both are needed:
 * money is compared against the output script, authorship against the hash the
 * pubkey must hash back to. `wantedTokenIds` is what the settings **currently**
 * on screen depend on, which is why a walked token move is labelled against
 * today's decorations and the screen says so — a row cannot know what the
 * stall was wearing a year ago, and inventing that is worse than naming the
 * comparison.
 */
export type EventContext = {
    /** The stall's p2pkh output script, lowercase hex. */
    script: string;
    /** The stall's hash160, lowercase hex, for the authorship check. */
    hash: string;
    /** The attachment tokens the painted settings depend on. */
    wantedTokenIds: ReadonlySet<string>;
};

/**
 * How settled a **fetched** transaction is. Three states, and the third is
 * about this page rather than about the chain (see `EventStatus`).
 *
 * `isFinal` with no block can only be pre-consensus: avalanche finalized it
 * before anything mined it. With a block, this says nothing about which came
 * first — a caller that was told pre-consensus on the wire keeps that, because
 * `strongerStatus` never drops the stronger claim.
 */
export function eventStatusOf(tx: ChainTx): EventStatus {
    if (tx.isFinal === true) {
        return { kind: 'finalized', avalanche: tx.block === undefined };
    }
    if (tx.block !== undefined) {
        return { kind: 'in-block', height: tx.block.height };
    }
    return { kind: 'unknown' };
}

/**
 * What a socket frame proves, and nothing more.
 *
 * `TX_ADDED_TO_MEMPOOL` is deliberately **not** a state. It is one node's
 * opinion and two nodes hold two mempools — the same reason §5 refuses an
 * unfinalized, unmined record as a manifest winner — so a page that printed
 * "in the mempool" from it would be stating a stranger's node as a fact. It
 * lands as `undefined`, which reads as "not known to this page".
 *
 * `TX_CONFIRMED` carries no height on the wire, so the state it proves has
 * none; the re-read of the transaction supplies one, and `strongerStatus`
 * prefers the answer that has it.
 */
export function statusFromMessage(said: LiveTxStatus | undefined): EventStatus | undefined {
    if (said?.msgType === TX_FINALIZED) {
        return {
            kind: 'finalized',
            avalanche: said.finalizationReasonType === FINALIZATION_PRE_CONSENSUS,
        };
    }
    if (said?.msgType === TX_CONFIRMED) {
        return { kind: 'in-block' };
    }
    return undefined;
}

const RANK: Record<EventStatus['kind'], number> = {
    finalized: 3,
    'in-block': 2,
    unknown: 1,
};

/**
 * The more settled of two answers about the same transaction.
 *
 * **A row never walks its state backwards.** A reorg re-announces a finalized
 * transaction as a mempool arrival on some node, a failover client answers
 * from a replica that has not caught up, and either would otherwise paint
 * "not known to this page" over a state the chain already proved. Going
 * forward is news; going backward is our own read being behind, and §4 already
 * refuses to paint that as a fact about the seller.
 *
 * Within one rank the richer answer wins: a height beats no height, and a
 * finality known to be pre-consensus beats one that did not say.
 */
export function strongerStatus(
    a: EventStatus | undefined,
    b: EventStatus | undefined,
): EventStatus | undefined {
    if (a === undefined) {
        return b;
    }
    if (b === undefined) {
        return a;
    }
    if (RANK[a.kind] !== RANK[b.kind]) {
        return RANK[a.kind] > RANK[b.kind] ? a : b;
    }
    if (a.kind === 'finalized' && b.kind === 'finalized') {
        return a.avalanche === b.avalanche ? a : { kind: 'finalized', avalanche: true };
    }
    if (a.kind === 'in-block' && b.kind === 'in-block') {
        return a.height !== undefined ? a : b;
    }
    return a;
}

/**
 * The chain's own clock for this transaction, in seconds, or nothing.
 *
 * `timeFirstSeen` first, the block's timestamp second — chronik documents the
 * block's as the fallback. Zero is **not** a time: the library says
 * `timeFirstSeen: 0` means unknown, and a row dated 1970 is worse than an
 * undated one.
 */
export function chainTimeOf(tx: ChainTx): number | undefined {
    const seen = tx.timeFirstSeen;
    if (typeof seen === 'number' && seen > 0) {
        return seen;
    }
    const mined = tx.block?.timestamp;
    return typeof mined === 'number' && mined > 0 ? mined : undefined;
}

/**
 * What this transaction paid **to the stall's own script**, or nothing.
 *
 * Three ways to answer nothing, and every one of them is deliberate:
 *
 * - **The stall is on the input side.** A publish pays its own change back to
 *   the stall address, and summing outputs there would print the seller's
 *   float as money coming in. Both the signature and the funding script answer
 *   "were these our coins already" — either is enough, and omitting is the
 *   safe direction, because a receipt invented from a float is worse than a
 *   receipt this page did not print.
 * - **An output to the stall carried no figure.** `sats` is optional because
 *   the type is structural; half a sum is not a receipt.
 * - **The sum is zero.** Zero is a figure, and a wrong one: §8 says omit
 *   rather than guess.
 *
 * Nothing here says a sale happened. A payment to an address is money
 * arriving, which is all the chain proves.
 */
export function receivedSats(tx: ChainTx, ctx: EventContext): bigint | undefined {
    const script = ctx.script.toLowerCase();
    for (const input of tx.inputs) {
        if (input.outputScript?.toLowerCase() === script) {
            return undefined;
        }
    }
    if (txSignedByStall(tx, ctx.hash)) {
        return undefined;
    }
    let total = 0n;
    for (const output of tx.outputs) {
        if (output.outputScript.toLowerCase() !== script) {
            continue;
        }
        if (typeof output.sats !== 'bigint') {
            return undefined;
        }
        total += output.sats;
    }
    return total > 0n ? total : undefined;
}

/**
 * One row, from one transaction, for either list.
 *
 * Pure, and it never stamps a clock: the page clock belongs to the caller that
 * watched the transaction arrive, and a walked row was never watched. Every
 * field it does set is something the transaction itself proves.
 *
 * Authorship is answered only for the stall's own record kinds. A `false` on
 * an ordinary payment would read as "somebody else's payment", which is true
 * of almost every payment and says nothing.
 */
export function historyEventOf(tx: ChainTx, ctx: EventContext): StallEvent {
    const facts = classifyTx(tx, ctx.script, ctx.wantedTokenIds);
    const kind = eventKindOf(tx, facts);
    const book = kind === 'book' ? bookShapeOf(tx) : undefined;
    const chainTimeS = chainTimeOf(tx);
    const sats = receivedSats(tx, ctx);
    const isRecord = kind === 'settings' || kind === 'description';
    return {
        txid: tx.txid,
        kind,
        status: eventStatusOf(tx),
        ...(chainTimeS === undefined ? {} : { chainTimeS }),
        ...(sats === undefined ? {} : { sats }),
        ...(book === undefined ? {} : { book }),
        ...(isRecord ? { signedByStall: txSignedByStall(tx, ctx.hash) } : {}),
    };
}
