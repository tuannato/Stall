import { Agora } from 'ecash-agora';
import type { ChronikClient, PluginUtxos } from 'chronik-client';
import { toHex } from 'ecash-lib';
import { nanoSatsPerAtom } from '../domain/money';
import type { FetchStatus, HostAttempt, StallOffer } from '../domain/state';
import { isPluginMissing, isTimeout, isUnreachable, messageOf } from './errors';
import { CHRONIK_HOSTS } from './hosts';
import { AGORA_PLUGIN, stallGroup } from './live';

type PartialParams = {
    minAcceptedAtoms?: () => bigint;
    prepareAcceptedAtoms?: (atoms: bigint) => bigint;
};

export type AgoraOfferView = {
    variant: {
        type: string;
        params?: unknown;
    };
    outpoint: { txid: string | Uint8Array; outIdx: number };
    token: { tokenId: string; atoms: bigint };
    askedSats: (acceptedAtoms?: bigint) => bigint;
};

/**
 * The offer book, one utxo at a time.
 *
 * Two members rather than the library's one `activeOffersByPubKey`, because
 * that call fetches and parses in a single `flatMap` and a parse that throws
 * takes the whole call down with it. `agora.py` binds nothing to the ad
 * script's `cancel_pk`, so **any stranger can put a utxo in any seller's
 * group** for the price of dust: a PARTIAL with no enforced locktime makes
 * `_parsePartialOfferUtxo` throw `Outdated plugin`, and a ONESHOT with a
 * truncated `outputsSer` makes `readTxOutput` underflow. Either one used to be
 * painted as `unreachable` with all three hosts listed as failed — our failure
 * reported as the network's, on a shop that was answering.
 *
 * Splitting the two lets `loadOffers` put a `try` around each utxo instead of
 * around the whole book, so one bad covenant costs one row.
 */
export type AgoraOfferReader = {
    /**
     * The group's utxos as the plugin indexed them, unparsed. Throws the way
     * any chronik read throws, which is what `errors.ts` classifies.
     */
    pluginUtxos(group: string): Promise<readonly unknown[]>;
    /**
     * One utxo, read as an offer.
     *
     * `undefined` for a covenant this reader does not recognise at all — an
     * unknown variant, a non-SLP oneshot, an unsafe set of enforced outputs.
     * **May throw** for one it starts to read and cannot finish. The two are
     * not the same answer and `loadOffers` does not treat them as one.
     */
    parseOfferUtxo(utxo: unknown): AgoraOfferView | undefined;
};

/** The one shape the adapter needs from a chronik client, named so the cast is small. */
type PluginReader = {
    plugin(pluginName: string): { utxos(groupHex: string): Promise<PluginUtxos> };
};

/**
 * The real reader: chronik's own plugin endpoint, and the library's own parser.
 *
 * The fetch is `chronik.plugin('agora').utxos(group)`, which is the request
 * `activeOffersByPubKey` already makes — `Agora`'s constructor is
 * `this.plugin = chronik.plugin(PLUGIN_NAME)`, so this is the same GET through
 * the same failover, and an absent group answers HTTP 200 with an empty list
 * rather than a 404. It is called here rather than through the instance because
 * `Agora.plugin` is private.
 *
 * `PluginUtxos` is unwrapped **here**: `loadOffers` counts listings, and a
 * wrapper object it had to reach through would be one more place that could
 * silently answer for the wrong field.
 *
 * The parse reaches a private member, and reaches it **as a method on the
 * instance**. Both variant parsers call `this._parse...OfferUtxo` and the
 * partial one reads `this.dustSats`, so a detached function throws `TypeError`
 * on every utxo — which, behind the per-utxo `try` below, would turn a whole
 * working shop into a quiet page of dropped rows. Nothing public exposes the
 * per-utxo parse, and re-implementing the covenant maths here would be a second
 * opinion about money. `offer-parse-adapter-parses-a-real-partial-fixture` is
 * what holds this: a renamed member, a changed drop rule and a lost `this` all
 * fail it.
 */
export function agoraOfferReader(chronik: ChronikClient): AgoraOfferReader {
    const agora = new Agora(chronik);
    const plugin = (chronik as unknown as PluginReader).plugin(AGORA_PLUGIN);
    return {
        async pluginUtxos(group: string): Promise<readonly unknown[]> {
            const answer = await plugin.utxos(group);
            return answer.utxos;
        },
        parseOfferUtxo(utxo: unknown): AgoraOfferView | undefined {
            return reachParser(agora)._parseOfferUtxo(utxo, 'OPEN');
        },
    };
}

/** The private member, typed. Called on `agora` so the parsers keep their `this`. */
function reachParser(agora: Agora): {
    _parseOfferUtxo(utxo: unknown, status: string): AgoraOfferView | undefined;
} {
    return agora as unknown as {
        _parseOfferUtxo(utxo: unknown, status: string): AgoraOfferView | undefined;
    };
}

export async function loadOffers(
    reader: AgoraOfferReader,
    pubkeyHex: string,
): Promise<FetchStatus> {
    let utxos: readonly unknown[];
    // Scoped to the fetch on purpose. A parse that crashes is not three hosts
    // failing to answer, and a catch around both would print it as one.
    try {
        utxos = await reader.pluginUtxos(stallGroup(pubkeyHex));
    } catch (err) {
        const triedAtMs = Date.now();
        const hosts = hostAttempts(err);
        if (isPluginMissing(err)) {
            return { kind: 'plugin-missing', triedAtMs, hosts };
        }
        if (isUnreachable(err)) {
            return { kind: 'unreachable', triedAtMs, hosts };
        }
        return { kind: 'unreachable', triedAtMs, hosts };
    }

    if (utxos.length === 0) {
        return { kind: 'empty' };
    }

    const offers: StallOffer[] = [];
    /** Utxos this app started to read as a listing. Reported as `returned`. */
    let attempted = 0;
    let dropped = 0;
    for (const utxo of utxos) {
        let parsed: AgoraOfferView | undefined;
        try {
            parsed = reader.parseOfferUtxo(utxo);
        } catch {
            // A listing this app could not read: counted, and it costs itself.
            attempted += 1;
            dropped += 1;
            continue;
        }
        if (parsed === undefined) {
            // **Silent, deliberately.** Nothing binds a group entry to the
            // seller — `cancel_pk` and `maker_pk` are whatever bytes an ad
            // script wrote — so anyone can drop junk covenants into any
            // seller's group for dust. Counting those would let a stranger
            // paint "listings this page could not read" onto a stall that is
            // simply empty, which is the empty-versus-unreadable collapse
            // arriving from outside. The library ignores them today; so do we.
            continue;
        }
        attempted += 1;
        const mapped = mapOffer(parsed);
        if (mapped === undefined) {
            dropped += 1;
            continue;
        }
        offers.push(mapped);
    }

    if (offers.length === 0) {
        if (dropped === 0) {
            // Every utxo in the group was junk this reader does not recognise.
            // A group full of a stranger's dust is not a shop we failed to read.
            return { kind: 'empty' };
        }
        // Listings were there and every one of them failed. Calling that empty
        // would blame the seller for our failure.
        return { kind: 'unreadable', triedAtMs: Date.now(), returned: attempted };
    }
    return dropped > 0 ? { kind: 'offers', offers, dropped } : { kind: 'offers', offers };
}

function hostAttempts(err: unknown): HostAttempt[] {
    const result: HostAttempt['result'] = isPluginMissing(err)
        ? 'plugin-missing'
        : isTimeout(err)
          ? 'timeout'
          : 'error';
    const detail = messageOf(err);
    return CHRONIK_HOSTS.map((host) => ({ host, result, detail }));
}

function mapOffer(offer: AgoraOfferView): StallOffer | undefined {
    const variant = offer.variant.type;
    if (variant !== 'ONESHOT' && variant !== 'PARTIAL') {
        return undefined;
    }
    const priced = priceOffer(offer);
    if (priced === undefined) {
        return undefined;
    }
    const mapped: StallOffer = {
        outpoint: {
            txid: outpointTxid(offer.outpoint.txid),
            outIdx: offer.outpoint.outIdx,
        },
        tokenId: offer.token.tokenId,
        atoms: offer.token.atoms,
        variant,
        askedSats: priced.askedSats,
        askedAtoms: priced.askedAtoms,
        minAcceptedAtoms: priced.minAcceptedAtoms,
    };
    const rate = rateOf(offer, priced);
    if (rate !== undefined) {
        mapped.priceNanoSatsPerAtom = rate;
    }
    return mapped;
}

/**
 * Per-atom rate of the remaining lot, which is what `AgoraPartial.priceNanoSatsPerAtom()`
 * defaults to. Computed here so `src/ui` never touches agora params. Falls
 * back to the already-priced take when the lot cannot be asked.
 */
function rateOf(
    offer: AgoraOfferView,
    priced: { askedSats: bigint; askedAtoms: bigint },
): bigint | undefined {
    if (offer.variant.type === 'ONESHOT') {
        return nanoSatsPerAtom(priced.askedSats, offer.token.atoms);
    }
    const lotAtoms = preparedRemaining(offer);
    if (lotAtoms !== undefined) {
        const lot = tryAsked(offer, lotAtoms);
        if (lot !== undefined) {
            const fromLot = nanoSatsPerAtom(lot.askedSats, lot.askedAtoms);
            if (fromLot !== undefined) {
                return fromLot;
            }
        }
    }
    return nanoSatsPerAtom(priced.askedSats, priced.askedAtoms);
}

function preparedRemaining(offer: AgoraOfferView): bigint | undefined {
    const partial = partialParams(offer.variant.params);
    let atoms = offer.token.atoms;
    try {
        const prepared = partial?.prepareAcceptedAtoms?.(atoms);
        if (prepared !== undefined) {
            atoms = prepared;
        }
    } catch {
        atoms = offer.token.atoms;
    }
    return atoms;
}

function priceOffer(offer: AgoraOfferView):
    | { askedSats: bigint; askedAtoms: bigint; minAcceptedAtoms?: bigint }
    | undefined {
    if (offer.variant.type === 'ONESHOT') {
        try {
            return { askedSats: offer.askedSats(), askedAtoms: offer.token.atoms };
        } catch {
            return undefined;
        }
    }

    const partial = partialParams(offer.variant.params);
    let minAcceptedAtoms: bigint | undefined;
    try {
        minAcceptedAtoms = partial?.minAcceptedAtoms?.();
    } catch {
        minAcceptedAtoms = undefined;
    }

    if (minAcceptedAtoms !== undefined) {
        const priced = tryAsked(offer, minAcceptedAtoms);
        if (priced !== undefined) {
            return { ...priced, minAcceptedAtoms };
        }
    }

    let atoms = offer.token.atoms;
    try {
        const prepared = partial?.prepareAcceptedAtoms?.(atoms);
        if (prepared !== undefined) {
            atoms = prepared;
        }
    } catch {
        atoms = offer.token.atoms;
    }

    const priced = tryAsked(offer, atoms);
    if (priced === undefined) {
        return undefined;
    }
    return { ...priced, minAcceptedAtoms };
}

function tryAsked(
    offer: AgoraOfferView,
    atoms: bigint,
): { askedSats: bigint; askedAtoms: bigint } | undefined {
    try {
        return { askedSats: offer.askedSats(atoms), askedAtoms: atoms };
    } catch {
        return undefined;
    }
}

function partialParams(params: unknown): PartialParams | undefined {
    if (params === null || typeof params !== 'object') {
        return undefined;
    }
    return params as PartialParams;
}

function outpointTxid(txid: string | Uint8Array): string {
    return typeof txid === 'string' ? txid.toLowerCase() : toHex(txid);
}
