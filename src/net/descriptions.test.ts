// @vitest-environment node
import { shaRmd160, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import {
    encodeDescriptionHex,
    encodeRemovalHex,
    type TokenPrice,
} from '../domain/description';
import type { ChainTx, HistoryPage, ManifestChronik } from './chain';
import { loadDescriptions } from './descriptions';

const TOKEN_A = 'aa'.repeat(32);
const TOKEN_B = 'bb'.repeat(32);

function compressedPk(fill: number): Uint8Array {
    const pk = new Uint8Array(33);
    pk[0] = 0x02;
    pk.fill(fill, 1);
    return pk;
}

function p2pkhScriptSig(pk: Uint8Array): string {
    const sig = new Uint8Array(71).fill(0x30);
    const script = new Uint8Array(1 + sig.length + 1 + pk.length);
    script[0] = sig.length;
    script.set(sig, 1);
    script[1 + sig.length] = pk.length;
    script.set(pk, 2 + sig.length);
    return toHex(script);
}

const p2pkhOutputScript = (hashHex: string): string => `76a914${hashHex}88ac`;

const PK = compressedPk(0x11);
const HASH = toHex(shaRmd160(PK));

/** An STLD output for `tokenId`, or a removal when `text` is undefined. */
function stld(tokenId: string, text?: string): string {
    const hex = text === undefined ? encodeRemovalHex(tokenId) : encodeDescriptionHex(tokenId, text);
    if (hex === undefined) {
        throw new Error('fixture is not encodable');
    }
    return `6a${hex}`;
}

/**
 * Ours, signed by this stall, and undecodable — but the token id survives, so
 * the failure can be named. Invalid utf-8 in the text push.
 */
function brokenStld(tokenId = TOKEN_A): string {
    const lokad = toHex(new TextEncoder().encode('STLD'));
    return `6a04${lokad}20${tokenId}02fffe`;
}

/** Undecodable *and* unattributable: the id push is the wrong length. */
function namelessStld(): string {
    const lokad = toHex(new TextEncoder().encode('STLD'));
    return `6a04${lokad}1f${'00'.repeat(31)}0268 69`.replace(' ', '');
}

function tx(opts: {
    txid: string;
    outputs: readonly string[];
    height?: number;
    isFinal?: boolean;
    foreign?: boolean;
}): ChainTx {
    const input = opts.foreign
        ? {
              inputScript: p2pkhScriptSig(compressedPk(0xff)),
              outputScript: p2pkhOutputScript(toHex(shaRmd160(compressedPk(0xff)))),
          }
        : { inputScript: p2pkhScriptSig(PK), outputScript: p2pkhOutputScript(HASH) };
    return {
        txid: opts.txid,
        block: opts.height === undefined ? undefined : { height: opts.height },
        isFinal: opts.isFinal,
        inputs: [input],
        outputs: opts.outputs.map((outputScript) => ({ outputScript })),
    };
}

const page = (txs: ChainTx[], numPages = 1): HistoryPage => ({
    txs,
    numTxs: txs.length,
    numPages,
});

function chronikWith(opts: {
    addressTxs?: ChainTx[];
    lokadTxs?: ChainTx[];
    addressNumTxs?: number;
    lokadNumTxs?: number;
    walked?: string[];
}): ManifestChronik {
    // The address defaults to busy, so a fixture that supplies only `lokadTxs`
    // exercises the lokad branch. Left at zero it would win the `min()` and the
    // reader would walk an empty index — a fixture artefact, not a finding.
    const mk = (txs: ChainTx[], numTxs: number | undefined, label: string) => ({
        history: (p = 0) => {
            opts.walked?.push(`${label}:${p}`);
            return Promise.resolve({
                ...page(p === 0 ? txs : []),
                numTxs: numTxs ?? txs.length,
            });
        },
    });
    return {
        address: () => mk(opts.addressTxs ?? [], opts.addressNumTxs ?? 9999, 'addr'),
        lokadId: () => mk(opts.lokadTxs ?? [], opts.lokadNumTxs, 'lokad'),
        tx: () => Promise.reject(new Error('not used')),
    };
}

const load = (chronik: ManifestChronik) =>
    loadDescriptions(chronik, { address: 'ecash:qq', hash: HASH });

describe('descriptions-are-not-lost-to-the-shorter-index', () => {
    /**
     * Folding this into the manifest walk finds nothing. `walkShorter` takes
     * whichever index is shorter, and the STL1 lokad is shorter than any
     * address with a transaction in it — so every stall walks the STL1 index,
     * which holds no STLD transaction: ABC reads a transaction's lokad from its
     * first output alone. This reader asks the same question of its own pair.
     */
    it('finds a description when the STL1 branch would have walked the lokad', () => {
        const walked: string[] = [];
        // The shape that broke the piggyback: a busy address, an empty STL1
        // index. Here the STLD index is the empty one, so it is walked.
        return load(
            chronikWith({
                addressNumTxs: 400,
                lokadNumTxs: 0,
                lokadTxs: [tx({ txid: '01'.repeat(32), height: 5, outputs: [stld(TOKEN_A, 'Beans')] })],
                walked,
            }),
        ).then((out) => {
            expect(out.descriptions.get(TOKEN_A)).toBe('Beans');
            expect(walked.some((w) => w.startsWith('lokad')), 'walked the cheap index').toBe(true);
        });
    });

    it('walks the address when the STLD index has outgrown it', () => {
        const walked: string[] = [];
        return load(
            chronikWith({
                addressNumTxs: 3,
                lokadNumTxs: 9000,
                addressTxs: [tx({ txid: '02'.repeat(32), height: 5, outputs: [stld(TOKEN_A, 'Beans')] })],
                walked,
            }),
        ).then((out) => {
            expect(out.descriptions.get(TOKEN_A)).toBe('Beans');
            expect(walked.some((w) => w.startsWith('addr'))).toBe(true);
        });
    });
});

describe('the-shorter-index-still-decides-the-walk', () => {
    /**
     * The stall open shares one pre-read of the address's page 0 between
     * this walk and the manifest's (`addrFirstPage`). The trap the sharing
     * must not spring: "use it as the walk's first page" would walk the
     * address while the code believes it walked the STLD index — the
     * shorter-index rule is spam resistance (see the module comment), so
     * the substitution covers the head request and nothing else.
     */
    it('a prefetched busy address still sends the walk down the lokad', async () => {
        const walked: string[] = [];
        const prefetch = Promise.resolve({ txs: [], numTxs: 400, numPages: 8 });
        const out = await loadDescriptions(
            chronikWith({
                lokadNumTxs: 0,
                lokadTxs: [
                    tx({ txid: '01'.repeat(32), height: 5, outputs: [stld(TOKEN_A, 'Beans')] }),
                ],
                walked,
            }),
            { address: 'ecash:qq', hash: HASH },
            prefetch,
        );
        expect(out.descriptions.get(TOKEN_A)).toBe('Beans');
        // The head request was the shared page; the walk was the lokad's own.
        expect(walked).not.toContain('addr:0');
        expect(walked).toContain('lokad:0');
    });

    it('a prefetched short address is page 0 itself, fetched by nobody', async () => {
        const walked: string[] = [];
        const prefetch = Promise.resolve({
            ...{ numTxs: 1, numPages: 1 },
            txs: [tx({ txid: '02'.repeat(32), height: 5, outputs: [stld(TOKEN_A, 'Beans')] })],
        });
        const out = await loadDescriptions(
            // The fake's own address page is empty: finding the record
            // proves the walk read the shared page, not a second fetch.
            chronikWith({ addressTxs: [], addressNumTxs: 1, lokadNumTxs: 9000, walked }),
            { address: 'ecash:qq', hash: HASH },
            prefetch,
        );
        expect(out.descriptions.get(TOKEN_A)).toBe('Beans');
        expect(walked).not.toContain('addr:0');
    });
});

describe('a-description-counts-only-when-the-stall-signed-it', () => {
    it('ignores a record anyone else put on chain about this token', () => {
        return load(
            chronikWith({
                lokadTxs: [
                    tx({
                        txid: '03'.repeat(32),
                        height: 5,
                        foreign: true,
                        outputs: [stld(TOKEN_A, 'Buy my thing instead')],
                    }),
                ],
            }),
        ).then((out) => {
            expect(out.descriptions.size, 'nobody writes a description for a seller').toBe(0);
        });
    });
});

describe('two-descriptions-for-one-token-in-one-tx-are-unreadable', () => {
    /**
     * A stall has one name, so two STL1 outputs are refused outright. Several
     * descriptions for *different* tokens in one transaction is the only way to
     * publish several at once, so that is the feature. Two for the *same* token
     * is the ambiguity, and output order is where a wallet happened to put them.
     */
    it('keeps the other tokens in the same transaction', () => {
        return load(
            chronikWith({
                lokadTxs: [
                    tx({
                        txid: '04'.repeat(32),
                        height: 5,
                        outputs: [stld(TOKEN_A, 'one'), stld(TOKEN_A, 'two'), stld(TOKEN_B, 'fine')],
                    }),
                ],
            }),
        ).then((out) => {
            expect(out.descriptions.has(TOKEN_A), 'ambiguous, so not answered').toBe(false);
            expect(out.unreadable.has(TOKEN_A), 'and said to be ours').toBe(true);
            expect(out.descriptions.get(TOKEN_B), 'the rest of the tx is fine').toBe('fine');
        });
    });

    /**
     * The exclusion is per-transaction, and both directions matter. The
     * walk-scoped version of this rule suppressed a token forever: one old
     * double-write beat every clean, finalized record that came after it, and
     * republishing could not cure it — the exact "our refusal deletes what a
     * seller published" mistake §4 names for fetch failures. And within the
     * ambiguous transaction itself, the first output of the pair must not
     * survive in the candidate list, or output order still picks the winner
     * this rule exists to refuse.
     */
    it('an old double-write does not outlast a clean record', () => {
        return load(
            chronikWith({
                lokadTxs: [
                    tx({
                        txid: '05'.repeat(32),
                        height: 5,
                        isFinal: true,
                        outputs: [stld(TOKEN_A, 'one'), stld(TOKEN_A, 'two')],
                    }),
                    tx({
                        txid: '06'.repeat(32),
                        height: 99,
                        isFinal: true,
                        outputs: [stld(TOKEN_A, 'clean and newer')],
                    }),
                ],
            }),
        ).then((out) => {
            expect(
                out.descriptions.get(TOKEN_A),
                'a clean record outranks an older ambiguity',
            ).toBe('clean and newer');
        });
    });

    it('a newer double-write leaves the shown record and says a newer one exists', () => {
        return load(
            chronikWith({
                lokadTxs: [
                    tx({
                        txid: '07'.repeat(32),
                        height: 5,
                        isFinal: true,
                        outputs: [stld(TOKEN_A, 'older and clean')],
                    }),
                    tx({
                        txid: '08'.repeat(32),
                        height: 99,
                        isFinal: true,
                        outputs: [stld(TOKEN_A, 'one'), stld(TOKEN_A, 'two')],
                    }),
                ],
            }),
        ).then((out) => {
            expect(
                out.descriptions.get(TOKEN_A),
                'the ambiguous pair contributes nothing, not its first output',
            ).toBe('older and clean');
            expect(
                out.unreadable.has(TOKEN_A),
                'and the screen can say a newer record could not be used',
            ).toBe(true);
        });
    });

    it('accepts several tokens described in one transaction', () => {
        return load(
            chronikWith({
                lokadTxs: [
                    tx({
                        txid: '05'.repeat(32),
                        height: 5,
                        outputs: [stld(TOKEN_A, 'first'), stld(TOKEN_B, 'second')],
                    }),
                ],
            }),
        ).then((out) => {
            expect(out.descriptions.get(TOKEN_A)).toBe('first');
            expect(out.descriptions.get(TOKEN_B)).toBe('second');
            expect(out.unreadable.size).toBe(0);
        });
    });
});

describe('a-broken-stld-is-not-a-seller-who-wrote-none', () => {
    it('names the token it failed on rather than staying silent', () => {
        return load(
            chronikWith({ lokadTxs: [tx({ txid: '06'.repeat(32), height: 5, outputs: [brokenStld()] })] }),
        ).then((out) => {
            expect(out.descriptions.size).toBe(0);
            // The id push survived even though the record did not, so the
            // screen can say we failed instead of that they wrote nothing.
            expect(out.unreadable.has(TOKEN_A)).toBe(true);
        });
    });

    it('claims nothing when the record does not even name a token', () => {
        return load(
            chronikWith({
                lokadTxs: [tx({ txid: '10'.repeat(32), height: 5, outputs: [namelessStld()] })],
            }),
        ).then((out) => {
            // Nothing is known about any token here, so nothing is asserted
            // about one. Marking an arbitrary token unreadable would be worse
            // than silence.
            expect(out.descriptions.size).toBe(0);
            expect(out.unreadable.size).toBe(0);
        });
    });
});

describe('a-removal-wins-and-erases-but-a-failure-does-not', () => {
    it('erases an older description when the newer record is a removal', () => {
        return load(
            chronikWith({
                lokadTxs: [
                    tx({ txid: '07'.repeat(32), height: 5, outputs: [stld(TOKEN_A, 'old words')] }),
                    tx({ txid: '08'.repeat(32), height: 9, outputs: [stld(TOKEN_A)] }),
                ],
            }),
        ).then((out) => {
            expect(out.descriptions.has(TOKEN_A), 'the seller took it back').toBe(false);
            expect(out.unreadable.has(TOKEN_A), 'which is not a failure of ours').toBe(false);
        });
    });

    it('keeps the older description when the newer record is one we cannot read', () => {
        // An undecodable byte must never silently delete what a seller
        // published — the empty-versus-unreachable mistake, on the wire.
        return load(
            chronikWith({
                lokadTxs: [
                    tx({ txid: '09'.repeat(32), height: 5, outputs: [stld(TOKEN_A, 'still here')] }),
                    tx({ txid: '0a'.repeat(32), height: 9, outputs: [brokenStld()] }),
                ],
            }),
        ).then((out) => {
            expect(out.descriptions.get(TOKEN_A)).toBe('still here');
            // And it is still reported: an undecodable record cannot be ranked,
            // so we do not know whether it supersedes the one being shown.
            expect(out.unreadable.has(TOKEN_A)).toBe(true);
        });
    });
});

describe('description-winner-follows-the-manifest-rule', () => {
    it('prefers the higher block, and a finalized unmined record over both', () => {
        return load(
            chronikWith({
                lokadTxs: [
                    tx({ txid: '0b'.repeat(32), height: 5, outputs: [stld(TOKEN_A, 'older')] }),
                    tx({ txid: '0c'.repeat(32), height: 9, outputs: [stld(TOKEN_A, 'newer')] }),
                ],
            }),
        )
            .then((out) => {
                expect(out.descriptions.get(TOKEN_A)).toBe('newer');
                return load(
                    chronikWith({
                        lokadTxs: [
                            tx({ txid: '0d'.repeat(32), height: 9, outputs: [stld(TOKEN_A, 'mined')] }),
                            tx({
                                txid: '0e'.repeat(32),
                                isFinal: true,
                                outputs: [stld(TOKEN_A, 'finalized')],
                            }),
                        ],
                    }),
                );
            })
            .then((out) => {
                expect(out.descriptions.get(TOKEN_A)).toBe('finalized');
            });
    });

    it('does not let an unconfirmed unfinalized record win', () => {
        // One node's opinion, and two nodes hold two mempools.
        return load(
            chronikWith({
                lokadTxs: [tx({ txid: '0f'.repeat(32), outputs: [stld(TOKEN_A, 'not yet')] })],
            }),
        ).then((out) => {
            expect(out.descriptions.size).toBe(0);
        });
    });
});

describe('truncated-description-walk-is-not-a-seller-who-wrote-none', () => {
    it('says the walk stopped short', () => {
        const many = page([], 40);
        const chronik: ManifestChronik = {
            address: () => ({ history: () => Promise.resolve({ ...many, numTxs: 9000 }) }),
            lokadId: () => ({ history: () => Promise.resolve({ ...many, numTxs: 9000 }) }),
            tx: () => Promise.reject(new Error('not used')),
        };
        return load(chronik).then((out) => {
            expect(out.truncated, 'a caller must not print "none" over this').toBe(true);
        });
    });
});

describe('a-failed-description-read-never-takes-the-shop-down', () => {
    it('answers empty rather than rejecting', () => {
        const chronik: ManifestChronik = {
            address: () => ({ history: () => Promise.reject(new Error('offline')) }),
            lokadId: () => ({ history: () => Promise.reject(new Error('offline')) }),
            tx: () => Promise.reject(new Error('not used')),
        };
        return load(chronik).then((out) => {
            expect(out.descriptions.size).toBe(0);
            expect(out.truncated).toBe(false);
        });
    });
});

describe('description-does-not-cross-stalls', () => {
    /**
     * Two sellers can each list the same token and each describe it. The words
     * belong to the stall that signed them, so a lookup is scoped by the
     * seller's hash — and there is no module-level cache here on purpose: one
     * keyed by tokenId alone would put seller A's words on seller B's shop, and
     * one keyed by both would still hold a description after it was replaced.
     */
    it('answers with the words the asked-for seller signed, and no others', () => {
        const otherPk = compressedPk(0x22);
        const otherHash = toHex(shaRmd160(otherPk));
        const otherSig = p2pkhScriptSig(otherPk);
        // One index carrying both sellers' records for the same token.
        const shared: ChainTx[] = [
            tx({ txid: '20'.repeat(32), height: 5, outputs: [stld(TOKEN_A, 'mine')] }),
            {
                txid: '21'.repeat(32),
                block: { height: 6 },
                inputs: [{ inputScript: otherSig, outputScript: p2pkhOutputScript(otherHash) }],
                outputs: [{ outputScript: stld(TOKEN_A, 'theirs') }],
            },
        ];
        const chronik = chronikWith({ lokadTxs: shared });
        return loadDescriptions(chronik, { address: 'ecash:qq', hash: HASH })
            .then((mine) => {
                // Theirs is higher-ranked, and must still not win here.
                expect(mine.descriptions.get(TOKEN_A)).toBe('mine');
                return loadDescriptions(chronik, { address: 'ecash:qr', hash: otherHash });
            })
            .then((theirs) => {
                expect(theirs.descriptions.get(TOKEN_A)).toBe('theirs');
            });
    });
});

describe('a-shelf-arrives-with-the-record-that-won', () => {
    /**
     * The shelves map is read from the same winning record as the text —
     * tombstones included, which is how "no words, shelved" travels — so the
     * heading and the words can never come from two different records for
     * one token.
     */
    function shelved(tokenId: string, text: string, shelf: string): string {
        const hex = encodeDescriptionHex(tokenId, text, { shelf });
        if (hex === undefined) {
            throw new Error('fixture is not encodable');
        }
        return `6a${hex}`;
    }

    it('maps the winner shelf, and a shelf-only record shelves without words', () => {
        return load(
            chronikWith({
                lokadTxs: [
                    tx({
                        txid: 'a1',
                        outputs: [shelved(TOKEN_A, 'Roasted weekly.', 'Coffee')],
                        height: 10,
                    }),
                    tx({
                        txid: 'b2',
                        outputs: [shelved(TOKEN_B, '', 'Kệ trà')],
                        height: 11,
                    }),
                ],
            }),
        ).then((got) => {
            expect(got.descriptions.get(TOKEN_A)).toBe('Roasted weekly.');
            expect(got.shelves.get(TOKEN_A)).toBe('Coffee');
            // Shelved with no words: absent from descriptions, present here.
            expect(got.descriptions.has(TOKEN_B)).toBe(false);
            expect(got.shelves.get(TOKEN_B)).toBe('Kệ trà');
        });
    });

    it('a newer record without a shelf takes the shelf down with the words', () => {
        return load(
            chronikWith({
                lokadTxs: [
                    tx({
                        txid: 'a1',
                        outputs: [shelved(TOKEN_A, 'Old words.', 'Old shelf')],
                        height: 10,
                    }),
                    tx({ txid: 'b2', outputs: [stld(TOKEN_A, 'New words.')], height: 11 }),
                ],
            }),
        ).then((got) => {
            expect(got.descriptions.get(TOKEN_A)).toBe('New words.');
            // One record is the whole truth about one token: the winner has
            // no shelf, so this token is on no shelf.
            expect(got.shelves.has(TOKEN_A)).toBe(false);
        });
    });
});

describe('price-rides-the-record-that-won', () => {
    /**
     * The price map is read from the same winning record as the text and the
     * shelf — a tombstone included, which is how "priced, no words" travels.
     * One record is the whole truth about one token, so the figure and the
     * words can never come from two different records.
     */
    const USD = { code: 'usd', exponent: 2, amount: 1250n } as const;
    const XEC = { code: 'xec', exponent: 2, amount: 45_000n } as const;

    function priced(tokenId: string, text: string, price: TokenPrice): string {
        const hex = encodeDescriptionHex(tokenId, text, { price });
        if (hex === undefined) {
            throw new Error('fixture is not encodable');
        }
        return `6a${hex}`;
    }

    it('maps the winner’s price, and a priced tombstone prices without words', () => {
        return load(
            chronikWith({
                lokadTxs: [
                    tx({ txid: 'a1', outputs: [priced(TOKEN_A, 'Roasted.', USD)], height: 10 }),
                    tx({ txid: 'b2', outputs: [priced(TOKEN_B, '', XEC)], height: 11 }),
                ],
            }),
        ).then((got) => {
            expect(got.descriptions.get(TOKEN_A)).toBe('Roasted.');
            expect(got.prices.get(TOKEN_A)).toEqual(USD);
            // Priced with no words: absent from descriptions, present here.
            expect(got.descriptions.has(TOKEN_B)).toBe(false);
            expect(got.prices.get(TOKEN_B)).toEqual(XEC);
        });
    });

    it('a newer record without a price takes the price down with it', () => {
        return load(
            chronikWith({
                lokadTxs: [
                    tx({ txid: 'a1', outputs: [priced(TOKEN_A, 'Old.', USD)], height: 10 }),
                    tx({ txid: 'b2', outputs: [stld(TOKEN_A, 'New.')], height: 11 }),
                ],
            }),
        ).then((got) => {
            expect(got.descriptions.get(TOKEN_A)).toBe('New.');
            expect(got.prices.has(TOKEN_A)).toBe(false);
        });
    });

    it('keeps a code this build does not paint, rather than forgetting it', () => {
        // A record is permanent. The reader is not the painter: a later version
        // paints more codes, and an editor that never saw this field would
        // destroy it on the seller's next publish.
        const eur = { code: 'eur', exponent: 2, amount: 900n } as const;
        return load(
            chronikWith({
                lokadTxs: [tx({ txid: 'a1', outputs: [priced(TOKEN_A, 'Fine.', eur)], height: 3 })],
            }),
        ).then((got) => {
            expect(got.prices.get(TOKEN_A)).toEqual(eur);
        });
    });
});
