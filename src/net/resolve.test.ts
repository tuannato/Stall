import { encodeCashAddress } from 'ecashaddrjs';
import { shaRmd160, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import { parseSellerParam } from '../domain/route';
import { MAX_HISTORY_PAGES, type ChainTx } from './chain';
import { resolveSeller } from './resolve';

function compressedPk(fill: number, prefix = 0x02): Uint8Array {
    const pk = new Uint8Array(33);
    pk[0] = prefix;
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

function p2shOutputScript(hashHex: string): string {
    return `a914${hashHex}87`;
}

function addressOf(pk: Uint8Array): { address: string; hash: string } {
    const hash = toHex(shaRmd160(pk));
    return { address: encodeCashAddress('ecash', 'p2pkh', hash), hash };
}

function historyChronik(txs: readonly ChainTx[], numTxs = txs.length, numPages = 1) {
    return {
        address() {
            return {
                async history() {
                    return { txs, numTxs, numPages };
                },
            };
        },
    };
}

describe('resolveSeller', () => {
    it('never-spent history (empty txs) is unresolvable', async () => {
        const pk = compressedPk(0xaa);
        const { address } = addressOf(pk);
        const parsed = parseSellerParam(address);
        expect(parsed.kind).toBe('address');
        const resolved = await resolveSeller(parsed, historyChronik([], 0, 0));
        expect(resolved).toEqual({ kind: 'unresolvable', address: parsed.kind === 'address' ? parsed.address : '' });
    });

    it('a matching p2pkh spend resolves', async () => {
        const pk = compressedPk(0xab);
        const { address, hash } = addressOf(pk);
        const parsed = parseSellerParam(address);
        const tx: ChainTx = {
            txid: 'aa'.repeat(32),
            inputs: [
                {
                    inputScript: p2pkhScriptSig(pk),
                    outputScript: p2pkhOutputScript(hash),
                },
            ],
            outputs: [],
        };
        const resolved = await resolveSeller(parsed, historyChronik([tx]));
        expect(resolved.kind).toBe('pubkey');
        if (resolved.kind === 'pubkey') {
            expect(resolved.pubkeyHex).toBe(toHex(pk));
            expect(resolved.address).toBe(parsed.kind === 'address' ? parsed.address : undefined);
        }
    });

    it('hash mismatch is skipped not guessed', async () => {
        const stallPk = compressedPk(0x11);
        const otherPk = compressedPk(0x22);
        const stall = addressOf(stallPk);
        const other = addressOf(otherPk);
        const parsed = parseSellerParam(stall.address);
        const tx: ChainTx = {
            txid: 'bb'.repeat(32),
            inputs: [
                {
                    inputScript: p2pkhScriptSig(otherPk),
                    outputScript: p2pkhOutputScript(other.hash),
                },
            ],
            outputs: [],
        };
        const resolved = await resolveSeller(parsed, historyChronik([tx]));
        expect(resolved).toEqual({
            kind: 'unresolvable',
            address: parsed.kind === 'address' ? parsed.address : '',
        });
        if (resolved.kind === 'pubkey') {
            expect.fail('must not guess a pubkey whose hash is not the stall');
        }
    });

    it('skips p2sh inputs and does not guess', async () => {
        const pk = compressedPk(0x33);
        const { address, hash } = addressOf(pk);
        const parsed = parseSellerParam(address);
        const tx: ChainTx = {
            txid: 'cc'.repeat(32),
            inputs: [
                {
                    inputScript: '00',
                    outputScript: p2shOutputScript(hash),
                },
            ],
            outputs: [],
        };
        const resolved = await resolveSeller(parsed, historyChronik([tx]));
        expect(resolved.kind).toBe('unresolvable');
    });

    it('passes an invalid route through without reading history', async () => {
        const resolved = await resolveSeller(
            { kind: 'invalid', raw: 'nope' },
            {
                address() {
                    throw new Error('network');
                },
            },
        );
        expect(resolved).toEqual({ kind: 'invalid', raw: 'nope' });
    });
});

describe('truncated-history-is-not-never-spent', () => {
    /**
     * The walk is capped, so a spend can sit beyond the last page we read.
     * Reporting that as unresolvable would put "this address has never sent"
     * on screen as a fact about the seller, hiding a real stall behind it.
     */
    it('says the history was not read, not that the address never spent', async () => {
        const pk = compressedPk(0xbb);
        const { address, hash } = addressOf(pk);
        const parsed = parseSellerParam(address);
        expect(parsed.kind).toBe('address');

        // Nothing on any page we are allowed to read.
        const noise: ChainTx[] = [
            {
                txid: 'aa'.repeat(32),
                inputs: [{ inputScript: '', outputScript: p2shOutputScript(hash) }],
                outputs: [],
            },
        ];
        const deep = await resolveSeller(
            parsed,
            historyChronik(noise, 5000, MAX_HISTORY_PAGES + 1),
        );
        expect(deep.kind).toBe('unresolved');

        // A history short enough to finish still gets the confident answer.
        const shallow = await resolveSeller(parsed, historyChronik(noise, 1, 1));
        expect(shallow.kind).toBe('unresolvable');
    });

    it('still resolves from page 0, which is where a live stall always is', async () => {
        const pk = compressedPk(0xcc);
        const { address, hash } = addressOf(pk);
        const parsed = parseSellerParam(address);
        const spend: ChainTx[] = [
            {
                txid: 'bb'.repeat(32),
                inputs: [
                    { inputScript: p2pkhScriptSig(pk), outputScript: p2pkhOutputScript(hash) },
                ],
                outputs: [],
            },
        ];
        const resolved = await resolveSeller(
            parsed,
            historyChronik(spend, 5000, MAX_HISTORY_PAGES + 1),
        );
        expect(resolved.kind).toBe('pubkey');
        expect(resolved.kind === 'pubkey' && resolved.pubkeyHex).toBe(toHex(pk));
    });
});
