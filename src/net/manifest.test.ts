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
        outputs: outputScripts.map((outputScript) => ({ outputScript })),
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
        outputs: [{ outputScript: stl1OutputScript(opts.name) }],
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
            outputs: [{ outputScript: script }],
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
