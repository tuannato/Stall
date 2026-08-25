import { shaRmd160, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import { STL1_ASCII, STL1_HEX } from '../domain/manifest';
import { THEME_BYTES } from '../domain/theme';
import type { ChainTx, HistoryPage, ManifestChronik } from './chain';
import { loadManifest } from './manifest';
import { MAX_HISTORY_PAGES } from './chain';

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

function stl1OutputScript(name: string, theme = new Uint8Array(THEME_BYTES)): string {
    const lokad = Uint8Array.from(STL1_ASCII, (c) => c.charCodeAt(0));
    const nameBytes = new TextEncoder().encode(name);
    return `6a${pushHex(lokad)}${pushHex(nameBytes)}${pushHex(theme)}`;
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
     * read — here a fourth push. The seller published settings. Painting the
     * shipped default without a word says they never did, which is the same
     * claim `truncated` exists to refuse.
     */
    function brokenStl1(): string {
        const lokad = Uint8Array.from(STL1_ASCII, (c) => c.charCodeAt(0));
        const name = new TextEncoder().encode('Nato');
        const theme = new Uint8Array(THEME_BYTES);
        const extra = new Uint8Array([1, 2, 3]);
        return `6a${pushHex(lokad)}${pushHex(name)}${pushHex(theme)}${pushHex(extra)}`;
    }

    /** An OP_RETURN that was never addressed to us: a plain stall memo. */
    function memo(): string {
        return `6a${pushHex(new TextEncoder().encode('hello there'))}`;
    }

    function txWith(outputScript: string, pk: Uint8Array, hash: string): ChainTx {
        return {
            txid: 'cd'.repeat(32),
            block: { height: 100 },
            inputs: [
                {
                    inputScript: p2pkhScriptSig(pk),
                    outputScript: p2pkhOutputScript(hash),
                },
            ],
            outputs: [{ outputScript }],
        };
    }

    it('says so when a record of ours cannot be decoded', async () => {
        const pk = compressedPk(0xaa);
        const hash = toHex(shaRmd160(pk));
        const tx = txWith(brokenStl1(), pk, hash);
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
        const tx = txWith(memo(), pk, hash);
        const lookup = await loadManifest(
            fakeChronik({ addressTxs: [tx], lokadTxs: [tx] }),
            { address: 'ecash:stall', hash },
        );
        expect(lookup.manifest).toBeUndefined();
        // A stall memo is not a broken manifest.
        expect(lookup.unreadable).toBe(false);
    });
});
