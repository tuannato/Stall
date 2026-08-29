import { STLD_HEX } from '../domain/description';
import { isStl1 } from '../domain/manifest';
import type { ChainTx } from './chain';
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
