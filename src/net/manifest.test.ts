import { DUST_SATS } from '../domain/money';
import { shaRmd160, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import { decodeManifestPushes, STL1_ASCII, STL1_HEX } from '../domain/manifest';
import type { ChainTx, HistoryPage, ManifestChronik } from './chain';
import { loadManifest } from './manifest';
import { MAX_HISTORY_PAGES } from './chain';
import { opReturnPushes } from './script';

function compressedPk(fill: number): Uint8Array {
    const pk = new Uint8Array(33);
    pk[0] = 0x02;
    pk.fill(fill, 1);
    return pk;
}

function p2pkhScriptSig(pk: Uint8Array): string {
    const sig = new Uint8Array(71);
    sig.fill(0x30);
    const script = new Uint8Array(1 + sig.length + 1 + pk.length);
    script[0] = sig.length;
    script.set(sig, 1);
    script[1 + sig.length] = pk.length;
    script.set(pk, 2 + sig.length);
    return toHex(script);
}

function p2pkhOutputScript(hashHex: string): string {
    return `76a914${hashHex}88ac`;
}

function pushHex(data: Uint8Array): string {
    if (data.length > 75) {
        throw new Error('test push too long');
    }
    return toHex(new Uint8Array([data.length, ...data]));
}

function stl1OutputScript(name: string, theme = new Uint8Array([0x01])): string {
    const lokad = Uint8Array.from(STL1_ASCII, (c) => c.charCodeAt(0));
    const nameBytes = new TextEncoder().encode(name);
    return `6a${pushHex(lokad)}${pushHex(nameBytes)}${pushHex(theme)}`;
}

/**
 * A record of ours that the decoder cannot read — the superseded 28-byte
 * theme push. Still `isStl1`: LOKAD matches, decode fails.
 */
function brokenStl1(): string {
    const lokad = Uint8Array.from(STL1_ASCII, (c) => c.charCodeAt(0));
    const name = new TextEncoder().encode('Nato');
    const theme = new Uint8Array(28);
    return `6a${pushHex(lokad)}${pushHex(name)}${pushHex(theme)}`;
}

/** An OP_RETURN that was never addressed to us: a plain stall memo. */
function memo(): string {
    return `6a${pushHex(new TextEncoder().encode('hello there'))}`;
}

function txWith(outputScripts: readonly string[], pk: Uint8Array, hash: string): ChainTx {
    return {
        txid: 'cd'.repeat(32),
        block: { height: 100 },
        inputs: [
            {
                inputScript: p2pkhScriptSig(pk),
                outputScript: p2pkhOutputScript(hash),
            },
        ],
        // The publish link's own dust back to the stall: what makes a signed
        // record this stall's (`recordAddressedToStall`). Keyed on the stall's
        // hash whatever the input, so a stranger's record is refused for the
        // reason a test names.
        outputs: [
            ...outputScripts.map((outputScript) => ({ outputScript })),
            { outputScript: p2pkhOutputScript(hash), sats: DUST_SATS },
        ],
    };
}

function stallTx(opts: {
    txid: string;
    pk: Uint8Array;
    hash: string;
    name: string;
    height?: number;
    foreignInput?: boolean;
}): ChainTx {
    const input = opts.foreignInput
        ? {
              inputScript: p2pkhScriptSig(compressedPk(0xff)),
              outputScript: p2pkhOutputScript(toHex(shaRmd160(compressedPk(0xff)))),
          }
        : {
              inputScript: p2pkhScriptSig(opts.pk),
              outputScript: p2pkhOutputScript(opts.hash),
          };
    return {
        txid: opts.txid,
        block: opts.height === undefined ? undefined : { height: opts.height },
        inputs: [input],
        outputs: [
            { outputScript: stl1OutputScript(opts.name) },
            { outputScript: p2pkhOutputScript(opts.hash), sats: DUST_SATS },
        ],
    };
}

function pages(txs: ChainTx[]): HistoryPage {
    return { txs, numTxs: txs.length, numPages: 1 };
}

function fakeChronik(opts: {
    addressTxs?: ChainTx[];
    lokadTxs?: ChainTx[];
    byTxid?: Record<string, ChainTx>;
}): ManifestChronik {
    return {
        address() {
            return {
                async history() {
                    return pages(opts.addressTxs ?? []);
                },
            };
        },
        lokadId(id: string) {
            expect(id).toBe(STL1_HEX);
            return {
                async history() {
                    return pages(opts.lokadTxs ?? []);
                },
            };
        },
        async tx(txid: string) {
            const found = opts.byTxid?.[txid];
            if (!found) {
                throw new Error(`404: Transaction ${txid} not found in the index`);
            }
            return found;
        },
    };
}

/**
 * Two indexes whose `numTxs` diverge, so a test can tell which one `walkShorter`
 * chose. `pages()` ties them; this does not.
 */
function twoIndexChronik(opts: {
    addrTxs: ChainTx[];
    addrNumTxs: number;
    lokadTxs: ChainTx[];
    lokadNumTxs: number;
}): ManifestChronik {
    return {
        address() {
            return {
                async history(): Promise<HistoryPage> {
                    return { txs: opts.addrTxs, numTxs: opts.addrNumTxs, numPages: 1 };
                },
            };
        },
        lokadId(id: string) {
            expect(id).toBe(STL1_HEX);
            return {
                async history(): Promise<HistoryPage> {
                    return { txs: opts.lokadTxs, numTxs: opts.lokadNumTxs, numPages: 1 };
                },
            };
        },
        async tx(txid: string): Promise<ChainTx> {
            throw new Error(`no hint tx ${txid}`);
        },
    };
}

describe('manifest-walks-the-shorter-index', () => {
    /**
     * `walkShorter` asks both indexes for `numTxs` and walks only the smaller.
     * Reversing the `<=` walked the larger, which no other test would catch: a
     * real record lives in both indexes, so a mis-walk still finds it. Here the
     * two indexes carry different records, so the winner names the one walked.
     */
    it('reads the record in the shorter index, not the higher-block one in the larger', async () => {
        const pk = compressedPk(0x81);
        const hash = toHex(shaRmd160(pk));
        const fromAddr = stallTx({ txid: 'a1'.repeat(32), pk, hash, name: 'FromAddr', height: 10 });
        const fromLokad = stallTx({ txid: 'b2'.repeat(32), pk, hash, name: 'FromLokad', height: 20 });
        const got = (
            await loadManifest(
                twoIndexChronik({
                    addrTxs: [fromAddr],
                    addrNumTxs: 2,
                    lokadTxs: [fromLokad],
                    lokadNumTxs: 90,
                }),
                { address: 'ecash:qtest', hash },
            )
        ).manifest;
        // Address is shorter (2 <= 90) so it is walked; the lokad record has the
        // higher block but is never read. A reversed comparison would surface
        // 'FromLokad'.
        expect(got?.name).toBe('FromAddr');
    });
});

describe('manifest-reader-is-not-output-zero-only', () => {
    /**
     * chronik indexes a LOKAD from the first output only, but `firstStl1` reads
     * every output. Cashtab puts the record at output 0; another wallet need
     * not, and such a record is found by the address walk. This pins that the
     * reader is not narrowed to output 0.
     *
     * The residual gap, stated not fixed: when the lokad index is the shorter
     * one, `walkShorter` walks it and never sees an output-1 record. Today every
     * published record is Cashtab's at output 0, so the gap is latent.
     */
    it('reads an STL1 that sits at output 1, via the address walk', async () => {
        const pk = compressedPk(0x82);
        const hash = toHex(shaRmd160(pk));
        const tx = txWith(
            [p2pkhOutputScript(hash), stl1OutputScript('Second')],
            pk,
            hash,
        );
        const got = (
            await loadManifest(
                twoIndexChronik({ addrTxs: [tx], addrNumTxs: 1, lokadTxs: [], lokadNumTxs: 5 }),
                { address: 'ecash:qtest', hash },
            )
        ).manifest;
        expect(got?.name).toBe('Second');
    });
});

describe('loadManifest', () => {
    it('returns the authored STL1 and skips a record signed by someone else', async () => {
        const pk = compressedPk(0x44);
        const hash = toHex(shaRmd160(pk));
        const ours = stallTx({ txid: 'aa'.repeat(32), pk, hash, name: 'Nato', height: 10 });
        const foreign = stallTx({
            txid: 'bb'.repeat(32),
            pk,
            hash,
            name: 'Impostor',
            height: 99,
            foreignInput: true,
        });
        const got = (await loadManifest(
            fakeChronik({ addressTxs: [ours, foreign], lokadTxs: [ours, foreign] }),
            { address: 'ecash:qtest', hash },
        )).manifest;
        expect(got?.name).toBe('Nato');
        expect(got?.txid).toBe(ours.txid);
    });

    it('prefers the higher block among authored records', async () => {
        const pk = compressedPk(0x55);
        const hash = toHex(shaRmd160(pk));
        const old = stallTx({ txid: '11'.repeat(32), pk, hash, name: 'Old', height: 5 });
        const newer = stallTx({ txid: '22'.repeat(32), pk, hash, name: 'New', height: 8 });
        const got = (await loadManifest(fakeChronik({ addressTxs: [old, newer], lokadTxs: [old, newer] }), {
            address: 'ecash:qtest',
            hash,
        })).manifest;
        expect(got?.name).toBe('New');
    });

    it('treats a hint tx as a candidate then still walks', async () => {
        const pk = compressedPk(0x66);
        const hash = toHex(shaRmd160(pk));
        const hinted = stallTx({ txid: '33'.repeat(32), pk, hash, name: 'Hint', height: 3 });
        const later = stallTx({ txid: '44'.repeat(32), pk, hash, name: 'Later', height: 9 });
        const got = (await loadManifest(
            fakeChronik({
                addressTxs: [later],
                lokadTxs: [later, hinted],
                byTxid: { [hinted.txid]: hinted },
            }),
            { address: 'ecash:qtest', hash },
            hinted.txid,
        )).manifest;
        expect(got?.name).toBe('Later');
    });
});

describe('hint-must-look-like-a-txid', () => {
    /**
     * `chronik.tx()` concatenates its argument into a request path and never
     * checks it — `verifyTxid` is in that package and `tx()` does not call it.
     * The value comes from `?m=` in the address bar. Not an open redirect, since
     * the host is fixed, but every other id this app handles is gated on shape
     * and this one was not.
     */
    for (const bad of [
        '../blockchain-info',
        'not-a-txid',
        'zz'.repeat(32),
        'aa'.repeat(31),
        '',
    ]) {
        it(`never asks the index for ${JSON.stringify(bad)}`, async () => {
            const pk = compressedPk(0x77);
            const hash = toHex(shaRmd160(pk));
            const asked: string[] = [];
            const chronik = fakeChronik({ addressTxs: [], lokadTxs: [] });
            const watched: ManifestChronik = {
                ...chronik,
                async tx(txid: string) {
                    asked.push(txid);
                    return chronik.tx(txid);
                },
            };
            await loadManifest(watched, { address: 'ecash:qtest', hash }, bad);
            expect(asked).toEqual([]);
        });
    }

    it('still accepts a real txid, in either case', async () => {
        const pk = compressedPk(0x78);
        const hash = toHex(shaRmd160(pk));
        const hinted = stallTx({ txid: '5a'.repeat(32), pk, hash, name: 'Hint', height: 4 });
        const got = (await loadManifest(
            fakeChronik({ addressTxs: [], lokadTxs: [], byTxid: { [hinted.txid]: hinted } }),
            { address: 'ecash:qtest', hash },
            hinted.txid.toUpperCase(),
        )).manifest;
        expect(got?.name).toBe('Hint');
    });
});

describe('hinted-unreadable-is-not-silent-default', () => {
    /**
     * A printed link carrying `?m=` that points at this seller's own broken
     * record. The walk may not reach it — that is the whole reason the hint
     * exists — and swallowing the decode failure painted the shipped default in
     * silence, which reads as a seller who never published.
     */
    it('says the record could not be read, rather than nothing', async () => {
        const pk = compressedPk(0x79);
        const hash = toHex(shaRmd160(pk));
        const bad = txWith([brokenStl1()], pk, hash);
        const lookup = await loadManifest(
            fakeChronik({ addressTxs: [], lokadTxs: [], byTxid: { [bad.txid]: bad } }),
            { address: 'ecash:qtest', hash },
            bad.txid,
        );
        expect(lookup.manifest).toBeUndefined();
        expect(lookup.unreadable).toBe(true);
    });

    it('stays quiet when the hint is simply not this seller’s', async () => {
        const pk = compressedPk(0x7a);
        const hash = toHex(shaRmd160(pk));
        const lookup = await loadManifest(
            fakeChronik({ addressTxs: [], lokadTxs: [] }),
            { address: 'ecash:qtest', hash },
            'ab'.repeat(32),
        );
        expect(lookup.unreadable, 'a missing tx is our failure, not theirs').toBe(false);
    });
});

describe('validated-hint-survives-a-walk-throw', () => {
    /**
     * The walk asks both indexes at once, so either one rejecting used to
     * reject the whole lookup and take an already-authored hint down with it —
     * the cheap path dying because the expensive one did. A walk that threw did
     * not finish, which is exactly what `truncated` already says.
     */
    it('keeps the hinted record and says the walk did not finish', async () => {
        const pk = compressedPk(0x7b);
        const hash = toHex(shaRmd160(pk));
        const hinted = stallTx({ txid: '6c'.repeat(32), pk, hash, name: 'Hint', height: 7 });
        const chronik: ManifestChronik = {
            address() {
                return {
                    async history(): Promise<HistoryPage> {
                        throw new Error('error connecting to known chronik instances');
                    },
                };
            },
            lokadId() {
                return {
                    async history(): Promise<HistoryPage> {
                        throw new Error('error connecting to known chronik instances');
                    },
                };
            },
            async tx() {
                return hinted;
            },
        };
        const lookup = await loadManifest(
            chronik,
            { address: 'ecash:qtest', hash },
            hinted.txid,
        );
        expect(lookup.manifest?.name).toBe('Hint');
        expect(lookup.truncated, 'we did not finish looking').toBe(true);
    });
});

describe('truncated-manifest-is-not-silent-default', () => {
    /**
     * The walk is capped, so a stall's settings can sit beyond the last page.
     * Painting the shipped default without saying so would read as a seller who
     * never published one — the same collapse as calling our failure an empty
     * shop, applied to identity instead of stock.
     */
    it('reports that the settings walk stopped early', async () => {
        const chronik = {
            address() {
                return {
                    async history() {
                        return { txs: [], numTxs: 9000, numPages: MAX_HISTORY_PAGES + 5 };
                    },
                };
            },
            lokadId() {
                return {
                    async history() {
                        return { txs: [], numTxs: 9999, numPages: 400 };
                    },
                };
            },
            async tx() {
                throw new Error('no hint');
            },
        };
        const lookup = await loadManifest(chronik as never, {
            address: 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09',
            hash: 'ab'.repeat(20),
        });
        expect(lookup.manifest).toBeUndefined();
        expect(lookup.truncated).toBe(true);
    });

    it('does not claim truncation when the whole history fitted', async () => {
        const chronik = {
            address() {
                return {
                    async history() {
                        return { txs: [], numTxs: 3, numPages: 1 };
                    },
                };
            },
            lokadId() {
                return {
                    async history() {
                        return { txs: [], numTxs: 90, numPages: 2 };
                    },
                };
            },
            async tx() {
                throw new Error('no hint');
            },
        };
        const lookup = await loadManifest(chronik as never, {
            address: 'ecash:qpjqjm0lasd3k54dmuczp20sr05tsykrlyc3j7hv09',
            hash: 'ab'.repeat(20),
        });
        expect(lookup.truncated).toBe(false);
    });
});

describe('unparseable-manifest-is-not-silent-default', () => {
    /**
     * A record this stall signed, carrying our LOKAD, that the decoder cannot
     * read — here a 28-byte theme push (the superseded format). The seller
     * published settings. Painting the shipped default without a word says
     * they never did, which is the same claim `truncated` exists to refuse.
     */
    it('says so when a record of ours cannot be decoded', async () => {
        const pk = compressedPk(0xaa);
        const hash = toHex(shaRmd160(pk));
        const tx = txWith([brokenStl1()], pk, hash);
        const lookup = await loadManifest(
            // walkShorter reads whichever index is shorter; give it both.
            fakeChronik({ addressTxs: [tx], lokadTxs: [tx] }),
            { address: 'ecash:stall', hash },
        );
        expect(lookup.manifest).toBeUndefined();
        expect(lookup.unreadable).toBe(true);
    });

    it('stays silent for an OP_RETURN that was never addressed to us', async () => {
        const pk = compressedPk(0xbb);
        const hash = toHex(shaRmd160(pk));
        const tx = txWith([memo()], pk, hash);
        const lookup = await loadManifest(
            fakeChronik({ addressTxs: [tx], lokadTxs: [tx] }),
            { address: 'ecash:stall', hash },
        );
        expect(lookup.manifest).toBeUndefined();
        // A stall memo is not a broken manifest.
        expect(lookup.unreadable).toBe(false);
    });
});

describe('extra-pushes-are-ignored', () => {
    /**
     * The domain decoder is tested on its own, but tolerance only pays off if a
     * record carrying a field this reader has never heard of still arrives as
     * that seller's settings. This is the end-to-end half: a stall published
     * with a future field must not read as a stall that published nothing.
     */
    it('loads a record carrying a field this reader does not know', async () => {
        const pk = compressedPk(0xa1);
        const hash = toHex(shaRmd160(pk));
        const lokad = Uint8Array.from(STL1_ASCII, (c) => c.charCodeAt(0));
        const name = new TextEncoder().encode('Future');
        const future = new Uint8Array([0x7f, 0xde, 0xad]);
        const script =
            `6a${pushHex(lokad)}${pushHex(name)}` +
            `${pushHex(new Uint8Array([0x01]))}${pushHex(future)}`;
        const tx: ChainTx = {
            txid: 'ab'.repeat(32),
            block: { height: 800000 },
            inputs: [{ inputScript: p2pkhScriptSig(pk), outputScript: p2pkhOutputScript(hash) }],
            outputs: [
                { outputScript: script },
                { outputScript: p2pkhOutputScript(hash), sats: DUST_SATS },
            ],
        };
        const lookup = await loadManifest(
            fakeChronik({ addressTxs: [tx], lokadTxs: [tx] }),
            { address: 'ecash:stall', hash },
        );
        expect(lookup.manifest?.name).toBe('Future');
        expect(lookup.unreadable).toBe(false);
        expect(lookup.manifest?.theme.known).toBe(true);
    });
});

describe('two-stl1-outputs-are-unreadable', () => {
    /**
     * The seller signed every output, so nothing in the transaction says which
     * STL1 is the stall. Picking by output order would make the answer depend
     * on where a wallet put it. Returning `undefined` without `unreadable`
     * would be worse: it reads as "this seller never published".
     */
    it('does not pick among two well-formed records', async () => {
        const pk = compressedPk(0xc1);
        const hash = toHex(shaRmd160(pk));
        const tx = txWith([stl1OutputScript('Alpha'), stl1OutputScript('Beta')], pk, hash);
        const lookup = await loadManifest(
            fakeChronik({ addressTxs: [tx], lokadTxs: [tx] }),
            { address: 'ecash:stall', hash },
        );
        expect(lookup.manifest).toBeUndefined();
        expect(lookup.unreadable).toBe(true);
    });

    it('does not pick the well-formed output when the other is broken, in either order', async () => {
        const pk = compressedPk(0xc2);
        const hash = toHex(shaRmd160(pk));
        const well = stl1OutputScript('Nato');
        const broken = brokenStl1();
        for (const outputs of [
            [well, broken],
            [broken, well],
        ] as const) {
            const tx = txWith(outputs, pk, hash);
            const lookup = await loadManifest(
                fakeChronik({ addressTxs: [tx], lokadTxs: [tx] }),
                { address: 'ecash:stall', hash },
            );
            expect(lookup.manifest).toBeUndefined();
            expect(lookup.unreadable).toBe(true);
        }
    });
});

describe('stl1-beside-a-memo-is-not-unreadable', () => {
    /**
     * `isStl1` is what separates a record from a stall memo. Counting every
     * OP_RETURN — or every output — as a manifest would paint a working stall
     * as unreadable. Both orders: a first-wins reader of OP_RETURN would pass
     * one and hide the other.
     */
    it('still loads a single STL1 sitting next to a plain OP_RETURN, in either order', async () => {
        const pk = compressedPk(0xc3);
        const hash = toHex(shaRmd160(pk));
        const record = stl1OutputScript('Nato');
        const note = memo();
        for (const outputs of [
            [record, note],
            [note, record],
        ] as const) {
            const tx = txWith(outputs, pk, hash);
            const lookup = await loadManifest(
                fakeChronik({ addressTxs: [tx], lokadTxs: [tx] }),
                { address: 'ecash:stall', hash },
            );
            expect(lookup.manifest?.name).toBe('Nato');
            expect(lookup.unreadable).toBe(false);
        }
    });
});

describe('hex-vector-is-not-the-builder', () => {
    /**
     * Every other fixture in this file is built by helpers that follow the
     * decoder. A literal script is the only way to notice the two drifting.
     */
    it('decodes a literal OP_RETURN through opReturnPushes', () => {
        // 6a OP_RETURN / 04 STL1 / 04 "Nato" / 01 0xfe
        // 0xfe is not the shipped default: a decoder that ignores the theme
        // push and always returns 0x01 would still pass a 0x01 vector.
        const script = '6a0453544c31044e61746f01fe';
        const pushes = opReturnPushes(script);
        if (pushes === undefined) {
            throw new Error('literal script did not parse');
        }
        const manifest = decodeManifestPushes(pushes);
        expect(manifest.name).toBe('Nato');
        expect(manifest.theme.id).toBe(0xfe);
    });
});

describe('a-record-that-does-not-pay-its-stall-is-not-its-record', () => {
    /**
     * The second conjunct (owner, 2026-09-07). A stranger who signs this
     * stall's public publish link makes a transaction that pays *this* stall
     * the dust and returns change to themselves: refused here (the input is
     * theirs) and refused on their own stall (the dust went elsewhere). The
     * same record with the dust to themselves is theirs. Exactly `DUST_SATS`,
     * and a dust output with no `sats` is refused — fail closed.
     */
    const pkO = compressedPk(0x11);
    const hashO = toHex(shaRmd160(pkO));
    const pkS = compressedPk(0x22);
    const hashS = toHex(shaRmd160(pkS));
    const record = (opts: { signer: Uint8Array; signerHash: string; dustTo?: string; dustSats?: bigint | null }): ChainTx => ({
        txid: 'ab'.repeat(32),
        block: { height: 100 },
        inputs: [{ inputScript: p2pkhScriptSig(opts.signer), outputScript: p2pkhOutputScript(opts.signerHash) }],
        outputs: [
            { outputScript: stl1OutputScript('Copy') },
            {
                outputScript: p2pkhOutputScript(opts.dustTo ?? opts.signerHash),
                ...(opts.dustSats === null ? {} : { sats: opts.dustSats ?? DUST_SATS }),
            },
            { outputScript: p2pkhOutputScript(opts.signerHash), sats: 924_069n },
        ],
    });
    const walkFor = (hash: string, tx: ChainTx) =>
        loadManifest(fakeChronik({ addressTxs: [tx], lokadTxs: [tx] }), { address: 'ecash:stall', hash });

    it('refuses the replay on both stalls, and accepts the self-addressed record', async () => {
        const replay = record({ signer: pkS, signerHash: hashS, dustTo: hashO });
        expect((await walkFor(hashS, replay)).manifest, 'the signer’s stall: dust went to the victim').toBeUndefined();
        expect((await walkFor(hashO, replay)).manifest, 'the victim’s stall: not their input').toBeUndefined();
        const own = record({ signer: pkS, signerHash: hashS });
        expect((await walkFor(hashS, own)).manifest?.name).toBe('Copy');
    });

    it('is exactly DUST_SATS, and a dust output with no sats fails closed', async () => {
        expect((await walkFor(hashS, record({ signer: pkS, signerHash: hashS, dustSats: DUST_SATS - 1n }))).manifest).toBeUndefined();
        expect((await walkFor(hashS, record({ signer: pkS, signerHash: hashS, dustSats: DUST_SATS + 1n }))).manifest).toBeUndefined();
        expect((await walkFor(hashS, record({ signer: pkS, signerHash: hashS, dustSats: null }))).manifest).toBeUndefined();
    });
});

describe('a-signed-record-we-refused-is-not-a-stall-that-never-published', () => {
    /**
     * Refusing a record the stall's own key signed must not paint the shipped
     * default in silence — the same lie `unreadable` and `truncated` refuse.
     * Said only when nothing else wins: a proper record on top makes the
     * refused one merely older.
     */
    const pk = compressedPk(0x33);
    const hash = toHex(shaRmd160(pk));
    const unaddressed: ChainTx = {
        txid: 'cd'.repeat(32),
        block: { height: 100 },
        inputs: [{ inputScript: p2pkhScriptSig(pk), outputScript: p2pkhOutputScript(hash) }],
        outputs: [{ outputScript: stl1OutputScript('Elsewhere') }, { outputScript: p2pkhOutputScript(hash), sats: 9_000n }],
    };

    it('says so when nothing else won, and not when a newer proper record did', async () => {
        const alone = await loadManifest(fakeChronik({ addressTxs: [unaddressed], lokadTxs: [unaddressed] }), { address: 'ecash:stall', hash });
        expect(alone.manifest).toBeUndefined();
        expect(alone.unaddressed).toBe(true);
        expect(alone.unreadable).toBe(false);
        expect(alone.refusedNewer).toBe(false);
        const proper = stallTx({ txid: 'ef'.repeat(32), pk, hash, name: 'Proper', height: 101 });
        const both = await loadManifest(fakeChronik({ addressTxs: [unaddressed, proper], lokadTxs: [unaddressed, proper] }), { address: 'ecash:stall', hash });
        expect(both.manifest?.name).toBe('Proper');
        expect(both.unaddressed).toBe(false);
        expect(both.refusedNewer).toBe(false);
    });

    it('a-record-that-did-not-pay-the-stall-is-said-even-when-an-older-one-wins', async () => {
        // The seller's newer republish was refused; the old look stays on
        // screen. Saying nothing here read as "changing my settings does
        // nothing" (audit 2026-09-08, M1).
        const older = stallTx({ txid: 'ef'.repeat(32), pk, hash, name: 'Older', height: 99 });
        const lookup = await loadManifest(fakeChronik({ addressTxs: [older, unaddressed], lokadTxs: [older, unaddressed] }), { address: 'ecash:stall', hash });
        expect(lookup.manifest?.name).toBe('Older');
        expect(lookup.unaddressed).toBe(true);
        expect(lookup.refusedNewer).toBe(true);
        // The same refused record reached through the ?m= hint says so too.
        const hinted = await loadManifest(
            fakeChronik({ addressTxs: [older], lokadTxs: [older], byTxid: { [unaddressed.txid]: unaddressed } }),
            { address: 'ecash:stall', hash },
            unaddressed.txid,
        );
        expect(hinted.manifest?.name).toBe('Older');
        expect(hinted.unaddressed).toBe(true);
    });

    it('an unmined, unfinalized refused record does not claim to be newer', async () => {
        const older = stallTx({ txid: 'ef'.repeat(32), pk, hash, name: 'Older', height: 99 });
        const floating: ChainTx = { ...unaddressed, block: undefined, isFinal: false };
        const lookup = await loadManifest(fakeChronik({ addressTxs: [older, floating], lokadTxs: [older, floating] }), { address: 'ecash:stall', hash });
        expect(lookup.manifest?.name).toBe('Older');
        expect(lookup.unaddressed).toBe(false);
    });
});

describe('a-newer-record-we-could-not-read-is-said-over-an-older-winner', () => {
    /**
     * `unreadable` used to speak only with no winner at all — "the broken
     * one is simply older" was assumed, not checked. A seller who republished
     * and got a record this page cannot decode saw their old look and no
     * sentence; the descriptions walk had always counted such a record.
     */
    const pk = compressedPk(0x44);
    const hash = toHex(shaRmd160(pk));
    const broken = (txid: string, height: number): ChainTx => ({
        txid,
        block: { height },
        inputs: [{ inputScript: p2pkhScriptSig(pk), outputScript: p2pkhOutputScript(hash) }],
        outputs: [
            { outputScript: `6a${pushHex(Uint8Array.from(STL1_ASCII, (c) => c.charCodeAt(0)))}${pushHex(new TextEncoder().encode('Broken'))}` },
            { outputScript: p2pkhOutputScript(hash), sats: DUST_SATS },
        ],
    });

    it('says the earlier look is showing when the broken record is newer, and stays quiet when it is older', async () => {
        const good = stallTx({ txid: 'ab'.repeat(32), pk, hash, name: 'Good', height: 100 });
        const newer = await loadManifest(fakeChronik({ addressTxs: [good, broken('cd'.repeat(32), 101)], lokadTxs: [good, broken('cd'.repeat(32), 101)] }), { address: 'ecash:stall', hash });
        expect(newer.manifest?.name).toBe('Good');
        expect(newer.unreadable).toBe(true);
        expect(newer.refusedNewer).toBe(true);
        const older = await loadManifest(fakeChronik({ addressTxs: [good, broken('cd'.repeat(32), 99)], lokadTxs: [good, broken('cd'.repeat(32), 99)] }), { address: 'ecash:stall', hash });
        expect(older.manifest?.name).toBe('Good');
        expect(older.unreadable).toBe(false);
        expect(older.refusedNewer).toBe(false);
    });
});
