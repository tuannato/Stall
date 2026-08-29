import type { ChronikClient } from 'chronik-client';
import { strToBytes, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import { stallGroup } from './live';
import { agoraOfferReader, loadOffers, type AgoraOfferReader, type AgoraOfferView } from './offers';

const PK = '02' + 'aa'.repeat(32);

/**
 * A reader over already-parsed offers: the fetch answers one opaque utxo per
 * offer and the parse hands the offer straight back.
 *
 * The utxos are the views themselves, which is a lie a fake is allowed to tell —
 * `loadOffers` never looks inside one. What it must not hide is the split
 * between fetching and parsing, which is why `readerOver` below exists: a parse
 * that throws and a parse that answers nothing are not offers that fail to
 * price, and this shape cannot express either.
 */
function agoraWith(result: readonly AgoraOfferView[] | Error): AgoraOfferReader {
    return {
        async pluginUtxos() {
            if (result instanceof Error) {
                throw result;
            }
            return result;
        },
        parseOfferUtxo: (utxo) => utxo as AgoraOfferView,
    };
}

/** A covenant whose parse crashes: the shape a stranger can fund for dust. */
const THROWS = Symbol('parse throws');
/** A covenant the library does not recognise at all, and answers nothing for. */
const SKIPS = Symbol('parse answers undefined');

/**
 * The real split: a fetch that answers utxos, and a parse that can do any of
 * three things with each one.
 */
function readerOver(utxos: readonly unknown[]): AgoraOfferReader {
    return {
        async pluginUtxos() {
            return utxos;
        },
        parseOfferUtxo(utxo) {
            if (utxo === THROWS) {
                // What `_parsePartialOfferUtxo` does on a partial with no
                // enforced locktime, and `readTxOutput` on a truncated
                // `outputsSer`. `flatMap` in the library does not catch either.
                throw new Error('Outdated plugin');
            }
            if (utxo === SKIPS) {
                return undefined;
            }
            return utxo as AgoraOfferView;
        },
    };
}

function oneshot(askedSats: bigint, atoms = 1n): AgoraOfferView {
    return {
        variant: { type: 'ONESHOT' },
        outpoint: { txid: 'ab'.repeat(32), outIdx: 1 },
        token: { tokenId: 'cd'.repeat(32), atoms },
        askedSats: () => askedSats,
    };
}

describe('loadOffers', () => {
    it('empty array is empty', async () => {
        const status = await loadOffers(agoraWith([]), PK);
        expect(status).toEqual({ kind: 'empty' });
    });

    it('thrown plugin-missing is plugin-missing', async () => {
        const status = await loadOffers(
            agoraWith(new Error('Failed getting /plugin/agora/50xx/utxos: 404: Plugin "agora" not loaded')),
            PK,
        );
        expect(status.kind).toBe('plugin-missing');
        if (status.kind === 'plugin-missing') {
            expect(status.hosts.some((h) => h.result === 'plugin-missing')).toBe(true);
        }
    });

    it('thrown timeout is unreachable', async () => {
        const status = await loadOffers(
            agoraWith(Object.assign(new Error('timeout of 30000ms exceeded'), { code: 'ETIMEDOUT' })),
            PK,
        );
        expect(status.kind).toBe('unreachable');
    });

    it('maps a oneshot offer and skips one whose askedSats throws', async () => {
        const bad: AgoraOfferView = {
            variant: { type: 'ONESHOT' },
            outpoint: { txid: '11'.repeat(32), outIdx: 0 },
            token: { tokenId: 'ee'.repeat(32), atoms: 1n },
            askedSats: () => {
                throw new Error('unencodable');
            },
        };
        const status = await loadOffers(agoraWith([oneshot(80000n, 1n), bad]), PK);
        expect(status.kind).toBe('offers');
        if (status.kind === 'offers') {
            expect(status.offers).toHaveLength(1);
            expect(status.offers[0]?.askedSats).toBe(80000n);
            expect(status.offers[0]?.askedAtoms).toBe(1n);
            expect(status.offers[0]?.variant).toBe('ONESHOT');
            expect(status.offers[0]?.priceNanoSatsPerAtom).toBe(80_000n * 1_000_000_000n);
            // The one we refused is counted, not swallowed.
            expect(status.dropped).toBe(1);
        }
    });

    it('a-refused-offer-is-counted-not-swallowed', async () => {
        const status = await loadOffers(agoraWith([oneshot(80000n, 1n)]), PK);
        expect(status.kind).toBe('offers');
        if (status.kind === 'offers') {
            // Nothing refused: the field is absent rather than a zero, so a
            // screen cannot print "0 more listings".
            expect(status.dropped).toBeUndefined();
        }
    });

    it('prices a partial via minAcceptedAtoms when askedSats accepts it', async () => {
        const offer: AgoraOfferView = {
            variant: {
                type: 'PARTIAL',
                params: {
                    minAcceptedAtoms: () => 10n,
                    prepareAcceptedAtoms: (a: bigint) => a,
                },
            },
            outpoint: { txid: '22'.repeat(32), outIdx: 0 },
            token: { tokenId: 'ff'.repeat(32), atoms: 100n },
            askedSats: (atoms) => {
                if (atoms === undefined) {
                    throw new Error('Must provide acceptedAtoms for PARTIAL offers');
                }
                return atoms * 2n;
            },
        };
        const status = await loadOffers(agoraWith([offer]), PK);
        expect(status.kind).toBe('offers');
        if (status.kind === 'offers') {
            expect(status.offers[0]?.askedSats).toBe(20n);
            expect(status.offers[0]?.askedAtoms).toBe(10n);
            expect(status.offers[0]?.minAcceptedAtoms).toBe(10n);
            expect(status.offers[0]?.atoms).toBe(100n);
            // Rate of the remaining lot (100 × 2), not the min take (10 × 2).
            expect(status.offers[0]?.priceNanoSatsPerAtom).toBe(2n * 1_000_000_000n);
        }
    });

    it('carries a lot rate that does not invert to the asked sats', async () => {
        const askedLot = 1_945_601n;
        const offer: AgoraOfferView = {
            variant: {
                type: 'PARTIAL',
                params: {
                    minAcceptedAtoms: () => 55n,
                    prepareAcceptedAtoms: (a: bigint) => a,
                },
            },
            outpoint: { txid: '33'.repeat(32), outIdx: 0 },
            token: { tokenId: 'aa'.repeat(32), atoms: 1024n },
            askedSats: (atoms) => {
                if (atoms === undefined) {
                    throw new Error('Must provide acceptedAtoms for PARTIAL offers');
                }
                if (atoms === 55n) {
                    return 104_501n;
                }
                if (atoms === 1024n) {
                    return askedLot;
                }
                throw new Error(`unexpected ${atoms}`);
            },
        };
        const status = await loadOffers(agoraWith([offer]), PK);
        expect(status.kind).toBe('offers');
        if (status.kind === 'offers') {
            expect(status.offers[0]?.askedSats).toBe(104_501n);
            expect(status.offers[0]?.askedAtoms).toBe(55n);
            expect(status.offers[0]?.priceNanoSatsPerAtom).toBe(1_900_000_976_562n);
            expect(status.offers[0]?.priceNanoSatsPerAtom).not.toBe(
                (104_501n * 1_000_000_000n) / 55n,
            );
        }
    });
});

describe('unreadable-offers-are-not-empty', () => {
    it('does not call a shop empty when the index answered with listings we could not read', async () => {
        const unpriceable = {
            variant: { type: 'PARTIAL', params: {} },
            outpoint: { txid: 'ab'.repeat(32), outIdx: 0 },
            token: { tokenId: 'cd'.repeat(32), atoms: 12n },
            askedSats: () => {
                throw new Error('cannot price');
            },
        };
        const status = await loadOffers(readerOver([unpriceable]), '02'.repeat(33));
        // "Empty" is a statement about the seller. This is a statement about us.
        expect(status.kind).toBe('unreadable');
        expect(status.kind === 'unreadable' && status.returned).toBe(1);
    });
});

describe('one bad covenant costs one row', () => {
    /**
     * `agora.py` takes the ad script's `cancel_pk` as opaque bytes and binds
     * nothing to a signature, so anyone can fund a utxo into anyone's group.
     * A partial with no enforced locktime makes the library's parser throw, and
     * `_activeOffersByGroup` does not catch — one such utxo used to take the
     * whole read down and paint `unreachable`, naming all three hosts as failed
     * on a shop that was answering perfectly.
     */
    it('a-bad-partial-does-not-take-down-the-shop', async () => {
        const status = await loadOffers(
            readerOver([oneshot(80_000n, 1n), THROWS, oneshot(90_000n, 1n)]),
            PK,
        );
        expect(status.kind, 'our own parse crash, printed as the network failing').toBe(
            'offers',
        );
        if (status.kind === 'offers') {
            expect(status.offers).toHaveLength(2);
            expect(status.offers[0]?.askedSats).toBe(80_000n);
            expect(status.offers[1]?.askedSats).toBe(90_000n);
            expect(status.dropped, 'the row that crashed is counted, not swallowed').toBe(1);
        }
    });

    /**
     * The same shape from the other parser. A ONESHOT's `outputsSer` is an
     * opaque push the plugin never validates, so a truncated one runs
     * `readTxOutput` off the end of its own buffer — `Bytes.ensureSize`
     * underflows and throws.
     */
    it('a-malformed-oneshot-does-not-take-down-the-shop', async () => {
        const status = await loadOffers(
            readerOver([oneshot(1_000n, 1n), THROWS, oneshot(2_000n, 1n)]),
            PK,
        );
        expect(status.kind).toBe('offers');
        if (status.kind === 'offers') {
            expect(status.offers).toHaveLength(2);
            expect(status.dropped).toBe(1);
        }
    });

    it('all-throws-is-unreadable-not-empty', async () => {
        const status = await loadOffers(readerOver([THROWS, THROWS]), PK);
        // Listings were there and this app read none of them. Saying "empty"
        // would put our failure on the seller's screen as their inventory.
        expect(status.kind).toBe('unreadable');
        expect(status.kind === 'unreadable' && status.returned).toBe(2);
    });

    it('no-utxos-is-empty', async () => {
        // An absent group answers HTTP 200 with an empty list, not a 404, so
        // this is the ordinary shape of a seller who has listed nothing.
        expect(await loadOffers(readerOver([]), PK)).toEqual({ kind: 'empty' });
    });

    it('asks for the group the plugin indexes this stall under', async () => {
        let asked: string | undefined;
        const reader: AgoraOfferReader = {
            async pluginUtxos(group) {
                asked = group;
                return [];
            },
            parseOfferUtxo: () => undefined,
        };
        await loadOffers(reader, PK);
        // One source for the 'P' prefix, shared with the subscription.
        expect(asked).toBe(stallGroup(PK));
        expect(asked).toBe(`50${PK}`);
    });
});

describe('strangers-junk-in-the-group-is-not-the-sellers-hidden-stock', () => {
    /**
     * Nothing binds a group entry to the seller: `cancel_pk` and `maker_pk` are
     * whatever bytes an ad script wrote, and dust funds one. So an unknown
     * covenant variant, a non-SLP oneshot and an unsafe set of enforced outputs
     * all arrive in any seller's group on somebody else's say-so, and the
     * library answers `undefined` for each.
     *
     * Counting those would hand a stranger the `unreadable` screen — "listings
     * this page could not read, a fault on our side" — on a stall that is
     * simply empty. That is §4's collapse arriving from outside, so the skip
     * stays silent and the shop stays honest.
     */
    it('does not turn a stranger dust into listings we failed to read', async () => {
        const status = await loadOffers(readerOver([SKIPS, SKIPS, SKIPS]), PK);
        expect(status.kind, 'a group full of junk is not a shop').toBe('empty');
        expect(status.kind === 'unreadable').toBe(false);
        expect((status as { dropped?: number }).dropped).toBeUndefined();
    });

    it('does not inflate the drop count on a working stall', async () => {
        const status = await loadOffers(readerOver([SKIPS, oneshot(80_000n, 1n), SKIPS]), PK);
        expect(status.kind).toBe('offers');
        if (status.kind === 'offers') {
            expect(status.offers).toHaveLength(1);
            expect(status.dropped, 'nothing of the seller was refused').toBeUndefined();
        }
    });

    it('does not count junk into what an unreadable screen reports', async () => {
        const status = await loadOffers(readerOver([SKIPS, THROWS, SKIPS, SKIPS]), PK);
        expect(status.kind).toBe('unreadable');
        // One listing was attempted, not four. `returned` is what this app
        // tried to read, so a stranger cannot inflate the number on screen.
        expect(status.kind === 'unreadable' && status.returned).toBe(1);
    });
});

describe('offer-parse-adapter-parses-a-real-partial-fixture', () => {
    /**
     * The adapter reaches a private member of a vendored library and calls it
     * as a method. An existence check would not hold that: `_parseOfferUtxo`
     * could keep its name and change what it returns, and a detached copy of it
     * would still *be* a function — it would just throw `TypeError` on every
     * utxo, because both variant parsers call `this._parse...OfferUtxo` and the
     * partial one reads `this.dustSats`. Behind the per-utxo catch in
     * `loadOffers` that is a shop of dropped rows and no error anywhere.
     *
     * So the pin is a round trip instead: a PARTIAL utxo built by hand in the
     * layout `_parsePartialOfferUtxo` reads, through the real `Agora`, out as a
     * priced `StallOffer`. A rename, a changed drop rule and a lost `this` each
     * fail it.
     *
     * Nobody holds this key and nobody minted this token: both are byte
     * patterns. Nothing here talks to a network — `Agora` is constructed over a
     * chronik that answers from this file.
     */
    const MAKER_PK = '02' + '11'.repeat(32);
    const TOKEN_ID = '7c'.repeat(32);
    const TXID = 'be'.repeat(32);

    /** Eight bytes, little endian, as `Bytes.readU64` reads them. */
    function u64le(value: bigint): string {
        let hex = '';
        for (let i = 0; i < 8; i += 1) {
            hex += Number((value >> BigInt(8 * i)) & 0xffn)
                .toString(16)
                .padStart(2, '0');
        }
        return hex;
    }

    /** Four bytes, little endian, as `Bytes.readU32` reads them. */
    function u32le(value: number): string {
        let hex = '';
        for (let i = 0; i < 4; i += 1) {
            hex += ((value >>> (8 * i)) & 0xff).toString(16).padStart(2, '0');
        }
        return hex;
    }

    /**
     * The pushes the plugin writes, in the order the parser destructures them:
     * variant, numAtomsTruncBytes, numSatsTruncBytes, atomsScaleFactor,
     * scaledTruncAtomsPerTruncSat, minAcceptedScaledTruncAtoms,
     * enforcedLockTime. The last one absent is what makes the library throw
     * `Outdated plugin`, which is the crash the per-utxo read exists for.
     *
     * The variant is encoded from the literal 'PARTIAL' rather than read off
     * the library, so a library that renames its covenant string fails here
     * instead of agreeing with itself.
     */
    const AGORA_DATA = [
        toHex(strToBytes('PARTIAL')),
        // No truncation on either side: the arithmetic below is then exact.
        '00',
        '00',
        // scale 1, one scaled trunc atom per trunc sat -> one sat per atom.
        u64le(1n),
        u64le(1n),
        // The smallest take the covenant accepts.
        u64le(100n),
        u32le(500_000),
    ];

    const UTXO = {
        outpoint: { txid: TXID, outIdx: 1 },
        blockHeight: -1,
        isCoinbase: false,
        sats: 546n,
        script: `a914${'cd'.repeat(20)}87`,
        isFinal: false,
        token: {
            tokenId: TOKEN_ID,
            tokenType: { protocol: 'SLP', type: 'SLP_TOKEN_TYPE_FUNGIBLE', number: 1 },
            atoms: 1_000n,
        },
        plugins: {
            agora: {
                groups: [stallGroup(MAKER_PK), `54${TOKEN_ID}`],
                data: AGORA_DATA,
            },
        },
    };

    /** Answers from this file. `Agora`'s constructor asks it for the endpoint too. */
    function chronikWith(utxos: readonly unknown[]): ChronikClient {
        return {
            plugin: (pluginName: string) => ({
                utxos: async (groupHex: string) => ({ pluginName, groupHex, utxos }),
            }),
        } as unknown as ChronikClient;
    }

    it('round-trips a hand-built partial into a priced offer', async () => {
        const status = await loadOffers(
            agoraOfferReader(chronikWith([UTXO])),
            MAKER_PK,
        );
        expect(status.kind, 'the library refused a utxo it should read').toBe('offers');
        if (status.kind !== 'offers') {
            return;
        }
        const offer = status.offers[0];
        expect(status.offers).toHaveLength(1);
        expect(status.dropped).toBeUndefined();
        expect(offer?.variant).toBe('PARTIAL');
        expect(offer?.tokenId).toBe(TOKEN_ID);
        expect(offer?.outpoint).toEqual({ txid: TXID, outIdx: 1 });
        expect(offer?.atoms, 'the whole lot is still on the utxo').toBe(1_000n);
        // One sat per atom, and the price shown is the smallest take.
        expect(offer?.minAcceptedAtoms).toBe(100n);
        expect(offer?.askedAtoms).toBe(100n);
        expect(offer?.askedSats).toBe(100n);
        // Rate of the remaining lot, which is what a row says.
        expect(offer?.priceNanoSatsPerAtom).toBe(1_000_000_000n);
    });

    it('drops one bad utxo out of a real group without touching the rest', async () => {
        // The same fixture with the locktime push removed: six pushes, which is
        // exactly what makes `_parsePartialOfferUtxo` throw `Outdated plugin`.
        const outdated = {
            ...UTXO,
            outpoint: { txid: '11'.repeat(32), outIdx: 0 },
            plugins: { agora: { groups: UTXO.plugins.agora.groups, data: AGORA_DATA.slice(0, 6) } },
        };
        const status = await loadOffers(
            agoraOfferReader(chronikWith([outdated, UTXO])),
            MAKER_PK,
        );
        expect(status.kind, 'one crash used to take the whole read down').toBe('offers');
        if (status.kind === 'offers') {
            expect(status.offers).toHaveLength(1);
            expect(status.offers[0]?.outpoint.txid).toBe(TXID);
            expect(status.dropped).toBe(1);
        }
    });

    it('reads the group off the plugin endpoint the library would have asked', async () => {
        let asked: string | undefined;
        const chronik = {
            plugin: (pluginName: string) => ({
                utxos: async (groupHex: string) => {
                    asked = groupHex;
                    return { pluginName, groupHex, utxos: [] };
                },
            }),
        } as unknown as ChronikClient;
        expect(await loadOffers(agoraOfferReader(chronik), MAKER_PK)).toEqual({
            kind: 'empty',
        });
        expect(asked).toBe(stallGroup(MAKER_PK));
    });
});
