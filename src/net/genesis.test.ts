// @vitest-environment node
import { shaRmd160, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import type { ChainTx } from './chain';
import {
    attributionFromGenesisTx,
    loadGenesisAttribution,
    MAX_GENESIS_LOOKUPS,
} from './genesis';

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
const STRANGER = compressedPk(0xff);
const STRANGER_HASH = toHex(shaRmd160(STRANGER));

const TOKEN = 'cd'.repeat(32);

/** A genesis funded from another wallet index, paying its mint to the stall. */
function hdGenesis(tokenId: string): ChainTx {
    return {
        txid: tokenId,
        inputs: [
            {
                inputScript: p2pkhScriptSig(STRANGER),
                outputScript: p2pkhOutputScript(STRANGER_HASH),
            },
        ],
        outputs: [
            { outputScript: p2pkhOutputScript(HASH), token: { tokenId } },
            { outputScript: p2pkhOutputScript(STRANGER_HASH) },
        ],
    };
}

describe('an-hd-wallets-genesis-is-attributed-by-its-mint-output', () => {
    /**
     * Cashtab's HD wallets fund a genesis from a receive or change index, so
     * the stall's own key never signs its input while the mint output still
     * lands on the stall's script. Requiring the signature alone gave a
     * permanent false negative on tokens the seller really did mint.
     */
    it('takes the mint output when no input was signed by the stall', () => {
        expect(attributionFromGenesisTx(hdGenesis(TOKEN), TOKEN, HASH)).toBe('attributed');
    });

    it('takes a signed input even when the mint went elsewhere', () => {
        const tx: ChainTx = {
            txid: TOKEN,
            inputs: [
                { inputScript: p2pkhScriptSig(PK), outputScript: p2pkhOutputScript(HASH) },
            ],
            outputs: [{ outputScript: p2pkhOutputScript(STRANGER_HASH), token: { tokenId: TOKEN } }],
        };
        expect(attributionFromGenesisTx(tx, TOKEN, HASH)).toBe('attributed');
    });

    it('is not fooled by an ordinary output, or by another token’s mint', () => {
        const paidNotMinted: ChainTx = {
            txid: TOKEN,
            inputs: [
                {
                    inputScript: p2pkhScriptSig(STRANGER),
                    outputScript: p2pkhOutputScript(STRANGER_HASH),
                },
            ],
            outputs: [
                // Money to the stall, and the mint to somebody else.
                { outputScript: p2pkhOutputScript(HASH) },
                { outputScript: p2pkhOutputScript(STRANGER_HASH), token: { tokenId: TOKEN } },
            ],
        };
        expect(attributionFromGenesisTx(paidNotMinted, TOKEN, HASH)).toBe('not-attributed');

        const otherToken: ChainTx = {
            ...paidNotMinted,
            outputs: [
                { outputScript: p2pkhOutputScript(HASH), token: { tokenId: 'ab'.repeat(32) } },
            ],
        };
        expect(attributionFromGenesisTx(otherToken, TOKEN, HASH)).toBe('not-attributed');
    });
});

describe('genesis-lookups-are-capped-and-say-so', () => {
    const ids = (n: number): string[] =>
        Array.from({ length: n }, (_, i) => i.toString(16).padStart(2, '0').repeat(32));

    it('reads at most the cap and reports the rest as truncated, never decided', async () => {
        const asked: string[] = [];
        const chronik = {
            tx: async (txid: string): Promise<ChainTx> => {
                asked.push(txid);
                return hdGenesis(txid);
            },
        };
        const wanted = ids(MAX_GENESIS_LOOKUPS + 5);
        const lookup = await loadGenesisAttribution(chronik, wanted, HASH);
        expect(asked).toHaveLength(MAX_GENESIS_LOOKUPS);
        expect(lookup.truncated).toBe(true);
        expect(lookup.attributions.size).toBe(MAX_GENESIS_LOOKUPS);
        // Beyond the cap is unknown by absence, never `not-attributed`: our
        // own ceiling is not a fact about who minted anything.
        for (const id of wanted.slice(MAX_GENESIS_LOOKUPS)) {
            expect(lookup.attributions.has(id)).toBe(false);
        }
    });

    it('gates the id as 64 hex before it reaches a request path', async () => {
        const asked: string[] = [];
        const chronik = {
            tx: async (txid: string): Promise<ChainTx> => {
                asked.push(txid);
                return hdGenesis(txid);
            },
        };
        const lookup = await loadGenesisAttribution(
            chronik,
            ['../../evil', `${TOKEN}?x=1`, TOKEN.toUpperCase(), TOKEN, TOKEN],
            HASH,
        );
        expect(asked).toEqual([TOKEN]);
        expect(lookup.truncated).toBe(false);
        expect(lookup.attributions.get(TOKEN)).toBe('attributed');
    });

    it('never throws, and a read that failed leaves the token undecided', async () => {
        const other = 'ab'.repeat(32);
        const chronik = {
            tx: async (txid: string): Promise<ChainTx> => {
                if (txid === TOKEN) {
                    throw new Error('no host answered');
                }
                return hdGenesis(txid);
            },
        };
        const lookup = await loadGenesisAttribution(chronik, [TOKEN, other], HASH);
        expect(lookup.attributions.has(TOKEN)).toBe(false);
        expect(lookup.attributions.get(other)).toBe('attributed');
    });
});
