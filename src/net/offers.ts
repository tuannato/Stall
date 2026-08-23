import { toHex } from 'ecash-lib';
import type { FetchStatus, HostAttempt, StallOffer } from '../domain/state';
import { isPluginMissing, isTimeout, isUnreachable, messageOf } from './errors';
import { CHRONIK_HOSTS } from './hosts';

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

export type AgoraReader = {
    activeOffersByPubKey(pubkeyHex: string): Promise<readonly AgoraOfferView[]>;
};

export async function loadOffers(agora: AgoraReader, pubkeyHex: string): Promise<FetchStatus> {
    let raw: readonly AgoraOfferView[];
    try {
        raw = await agora.activeOffersByPubKey(pubkeyHex);
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

    if (raw.length === 0) {
        return { kind: 'empty' };
    }

    const offers: StallOffer[] = [];
    for (const offer of raw) {
        const mapped = mapOffer(offer);
        if (mapped) {
            offers.push(mapped);
        }
    }
    if (offers.length === 0) {
        return { kind: 'empty' };
    }
    return { kind: 'offers', offers };
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
    return {
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
