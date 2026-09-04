// @vitest-environment node
import { shaRmd160, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import { encodeDescriptionHex } from '../domain/description';
import { encodeManifestHex } from '../domain/manifest';
import { encodePaymentMemoHex } from '../domain/payment';
import { DEFAULT_THEME_ID } from '../domain/theme';
import type { ChainTx, ChainTxInput, ChainTxOutput } from './chain';
import {
    ALL_FACTS,
    NO_FACTS,
    anyFact,
    classifyTx,
    eventKindOf,
    historyEventOf,
    paymentMemoOf,
    touchesAgora,
    unionFacts,
    bookShapeOf,
} from './classify';
import { p2pkhOutputScript } from './script';

const TOKEN_WORN = 'aa'.repeat(32);
const TOKEN_OTHER = 'bb'.repeat(32);
const WANTED: ReadonlySet<string> = new Set([TOKEN_WORN]);

function compressedPk(fill: number): Uint8Array {
    const pk = new Uint8Array(33);
    pk[0] = 0x02;
    pk.fill(fill, 1);
    return pk;
}

const HASH = toHex(shaRmd160(compressedPk(0x11)));
const STALL = p2pkhOutputScript(HASH);
const STRANGER = p2pkhOutputScript(toHex(shaRmd160(compressedPk(0xff))));

/** An `STL1` output script — the payload `encodeManifestHex` builds, plus OP_RETURN. */
function stl1(name = 'Ripe Beans', themeId = DEFAULT_THEME_ID, flags = 0): string {
    const hex = encodeManifestHex(name, themeId, flags);
    if (hex === undefined) {
        throw new Error('fixture is not encodable');
    }
    return `6a${hex}`;
}

function stld(tokenId: string, text: string): string {
    const hex = encodeDescriptionHex(tokenId, text);
    if (hex === undefined) {
        throw new Error('fixture is not encodable');
    }
    return `6a${hex}`;
}

/**
 * An agora take, as far as this function can see it: money at a covenant script
 * and no OP_RETURN it recognises. The p2sh script stands in for the covenant.
 */
const AGORA_SCRIPT = `a914${'cd'.repeat(20)}87`;

function tx(opts: {
    inputs?: readonly string[];
    outputs: readonly string[];
    tokens?: readonly string[];
}): ChainTx {
    return {
        txid: '11'.repeat(32),
        inputs: (opts.inputs ?? [STRANGER]).map((outputScript) => ({
            inputScript: '00',
            outputScript,
        })),
        outputs: opts.outputs.map((outputScript) => ({ outputScript })),
        tokenEntries: opts.tokens?.map((tokenId) => ({ tokenId })),
    };
}

describe('classifier-reads-a-transaction-the-way-the-readers-do', () => {
    it('an-stl1-output-wakes-the-settings-and-nothing-else', () => {
        const facts = classifyTx(tx({ outputs: [STALL, stl1()] }), STALL, WANTED);
        expect(facts).toEqual({ settings: true, descriptions: false, holdings: false });
    });

    it('an-stld-output-wakes-the-descriptions-and-nothing-else', () => {
        const facts = classifyTx(
            tx({ outputs: [STALL, stld(TOKEN_OTHER, 'Grown on the hill')] }),
            STALL,
            WANTED,
        );
        expect(facts).toEqual({ settings: false, descriptions: true, holdings: false });
    });

    it('a-wanted-token-at-the-stall-script-wakes-the-holdings', () => {
        // Arriving.
        expect(
            classifyTx(tx({ outputs: [STALL], tokens: [TOKEN_WORN] }), STALL, WANTED),
        ).toEqual({ settings: false, descriptions: false, holdings: true });

        // And leaving, which is the whole point of a tradeable decoration: §7
        // says moving the token takes it off.
        expect(
            classifyTx(
                tx({ inputs: [STALL], outputs: [STRANGER], tokens: [TOKEN_WORN] }),
                STALL,
                WANTED,
            ),
        ).toEqual({ settings: false, descriptions: false, holdings: true });
    });

    it('a-token-this-stall-never-wore-is-ordinary-traffic', () => {
        expect(
            classifyTx(tx({ outputs: [STALL], tokens: [TOKEN_OTHER] }), STALL, WANTED),
        ).toEqual(NO_FACTS);
        // And the same transfer at somebody else's address is not ours either.
        expect(
            classifyTx(tx({ outputs: [STRANGER], tokens: [TOKEN_WORN] }), STALL, WANTED),
        ).toEqual(NO_FACTS);
        // A stall wearing nothing asks nothing, whatever moves.
        expect(
            classifyTx(tx({ outputs: [STALL], tokens: [TOKEN_WORN] }), STALL, new Set()),
        ).toEqual(NO_FACTS);
    });

    it('an-agora-only-tx-wakes-none-of-the-three', () => {
        // What every sale looks like here: the book has its own subscription and
        // is re-read regardless, so a take must not also cost two capped walks.
        const sale = tx({
            inputs: [AGORA_SCRIPT],
            outputs: [STALL, AGORA_SCRIPT],
            tokens: [TOKEN_OTHER],
        });
        expect(classifyTx(sale, STALL, WANTED)).toEqual(NO_FACTS);
        expect(anyFact(classifyTx(sale, STALL, WANTED))).toBe(false);
    });

    it('plain-dust-at-the-script-with-no-token-wakes-nothing', () => {
        // Anyone can pay a stall address. Without this, a fraction of a cent
        // would buy a stranger two history walks in every open tab.
        expect(classifyTx(tx({ outputs: [STALL] }), STALL, WANTED)).toEqual(NO_FACTS);
        // A memo that is not ours is not a broken record of ours either.
        expect(
            classifyTx(tx({ outputs: [STALL, `6a0468656c6f`] }), STALL, WANTED),
        ).toEqual(NO_FACTS);
    });

    it('an-stl1-in-a-non-first-output-still-wakes-the-settings', () => {
        // ABC reads a transaction's lokad id from its first output alone, which
        // is how the *index* is built — not a rule about where a record may sit.
        // Both readers loop over every output, so stopping at output zero here
        // would file a record they would have found as ordinary traffic.
        const late = tx({ outputs: [STALL, STRANGER, STALL, stl1('Late Push')] });
        expect(classifyTx(late, STALL, WANTED).settings).toBe(true);
    });

    it('one transaction can name more than one fact', () => {
        const both = tx({
            outputs: [STALL, stl1(), stld(TOKEN_WORN, 'Sun dried')],
            tokens: [TOKEN_WORN],
        });
        expect(classifyTx(both, STALL, WANTED)).toEqual(ALL_FACTS);
    });

    it('is not fooled by a script written in the other case', () => {
        // chronik answers in lowercase, but nothing in this app may depend on
        // that: the hash arrives from a route the visitor typed.
        const shouted = tx({ outputs: [STALL.toUpperCase()], tokens: [TOKEN_WORN] });
        expect(classifyTx(shouted, STALL.toUpperCase(), WANTED).holdings).toBe(true);
    });

    it('says nothing about a transaction with no token entries at all', () => {
        const noEntries: ChainTx = {
            txid: '22'.repeat(32),
            inputs: [{ inputScript: '00', outputScript: STALL }],
            outputs: [{ outputScript: STALL }],
        };
        expect(classifyTx(noEntries, STALL, WANTED)).toEqual(NO_FACTS);
    });
});

describe('classifier-answers-combine-without-losing-one', () => {
    it('unions, and reports whether anything is wanted', () => {
        expect(anyFact(NO_FACTS)).toBe(false);
        expect(anyFact(ALL_FACTS)).toBe(true);
        const settingsOnly = { settings: true, descriptions: false, holdings: false };
        const holdingsOnly = { settings: false, descriptions: false, holdings: true };
        expect(unionFacts(settingsOnly, holdingsOnly)).toEqual({
            settings: true,
            descriptions: false,
            holdings: true,
        });
        // A burst is folded one transaction at a time, so this must never
        // subtract: the sale that arrived after the publish cannot unset it.
        expect(unionFacts(unionFacts(NO_FACTS, ALL_FACTS), NO_FACTS)).toEqual(ALL_FACTS);
    });
});

describe('one-transaction-gets-one-name', () => {
    /**
     * The substrate for a future activity feed. Nothing renders these yet, so
     * what is pinned here is the naming rule itself: a priority, not a set, so a
     * settings record paid for out of a sale is called a settings record.
     */
    const agoraEntry = { agora: { groups: [], data: [] } };

    it('names an agora-touched transaction the book', () => {
        const sale: ChainTx = {
            ...tx({ inputs: [AGORA_SCRIPT], outputs: [STALL, AGORA_SCRIPT] }),
            inputs: [
                { inputScript: '00', outputScript: AGORA_SCRIPT, plugins: agoraEntry },
            ],
        };
        expect(touchesAgora(sale)).toBe(true);
        expect(eventKindOf(sale, classifyTx(sale, STALL, WANTED))).toBe('book');
    });

    it('names an ordinary payment nothing in particular', () => {
        const payment = tx({ outputs: [STALL] });
        // No plugin entry at all, which is also what a node without the plugin
        // sends for every transaction — so `false` here is weak, and no screen
        // may turn it into "this was not a sale".
        expect(touchesAgora(payment)).toBe(false);
        expect(eventKindOf(payment, classifyTx(payment, STALL, WANTED))).toBe('other');
    });

    it('lets the stall own records outrank the book', () => {
        const publishOutOfASale: ChainTx = {
            ...tx({ outputs: [STALL, stl1()] }),
            outputs: [
                { outputScript: STALL },
                { outputScript: stl1() },
                { outputScript: AGORA_SCRIPT, plugins: agoraEntry },
            ],
        };
        expect(touchesAgora(publishOutOfASale), 'the sale is visible').toBe(true);
        expect(
            eventKindOf(publishOutOfASale, classifyTx(publishOutOfASale, STALL, WANTED)),
        ).toBe('settings');
    });

    it('names a description and a decoration move', () => {
        const words = tx({ outputs: [STALL, stld(TOKEN_OTHER, 'Grown on the hill')] });
        expect(eventKindOf(words, classifyTx(words, STALL, WANTED))).toBe('description');
        const moved = tx({ outputs: [STALL], tokens: [TOKEN_WORN] });
        expect(eventKindOf(moved, classifyTx(moved, STALL, WANTED))).toBe('token-move');
    });
});

describe('a-cancel-is-not-named-a-sale', () => {
    /**
     * On the wire a cancel and a fully-taken offer are one shape: a grouped
     * offer input spent, an ungrouped ERROR-tagged output left behind. The
     * shape reader must answer `consumed` for both — a word true of each —
     * and must never read the ERROR leavings as an offer appearing.
     */
    const base = {
        txid: 'ab'.repeat(32),
        inputs: [] as ChainTx['inputs'],
        outputs: [] as ChainTx['outputs'],
    };

    it('a spent grouped offer with ERROR leavings is consumed, nothing more', () => {
        const cancelOrFullTake: ChainTx = {
            ...base,
            inputs: [
                {
                    inputScript: '00',
                    plugins: { agora: { groups: ['50aa'], data: [] } },
                },
            ],
            outputs: [
                // The plugin's own bookkeeping: an entry with no groups.
                { outputScript: '6a', plugins: { agora: { groups: [], data: ['4552524f52'] } } },
            ],
        };
        expect(bookShapeOf(cancelOrFullTake)).toBe('consumed');
    });

    it('a partial take is both: one consumed, the remainder appeared', () => {
        const partial: ChainTx = {
            ...base,
            inputs: [
                { inputScript: '00', plugins: { agora: { groups: ['50aa'], data: [] } } },
            ],
            outputs: [
                { outputScript: 'a9', plugins: { agora: { groups: ['50aa'], data: [] } } },
            ],
        };
        expect(bookShapeOf(partial)).toBe('both');
    });

    it('a new listing is appeared; plain money is no shape at all', () => {
        const listing: ChainTx = {
            ...base,
            outputs: [
                { outputScript: 'a9', plugins: { agora: { groups: ['50aa'], data: [] } } },
            ],
        };
        expect(bookShapeOf(listing)).toBe('appeared');
        const money: ChainTx = { ...base, outputs: [{ outputScript: '76' }] };
        expect(bookShapeOf(money)).toBeUndefined();
    });

    it('a-listing-that-arrives-as-two-transactions-is-not-two-events', () => {
        // The SLP ad-setup half carries no agora entries; only the offer half
        // appears. One act, one shaped event.
        const adSetup: ChainTx = { ...base, outputs: [{ outputScript: 'a9' }] };
        const offerHalf: ChainTx = {
            ...base,
            txid: 'cd'.repeat(32),
            outputs: [
                { outputScript: 'a9', plugins: { agora: { groups: ['50aa'], data: [] } } },
            ],
        };
        const shapes = [adSetup, offerHalf].map(bookShapeOf);
        expect(shapes.filter((s) => s !== undefined)).toEqual(['appeared']);
    });
});

/**
 * The signature the walks verify. Copied in shape from `loadManifest`'s own
 * fixtures: a 71-byte push standing in for the DER signature, then the
 * compressed pubkey, which is what `extractP2pkhPubKey` reads back.
 */
function p2pkhScriptSig(pk: Uint8Array): string {
    const sig = new Uint8Array(71).fill(0x30);
    const script = new Uint8Array(1 + sig.length + 1 + pk.length);
    script[0] = sig.length;
    script.set(sig, 1);
    script[1 + sig.length] = pk.length;
    script.set(pk, 2 + sig.length);
    return toHex(script);
}

const SELLER_PK = compressedPk(0x11);
const STRANGER_PK = compressedPk(0xff);
const CTX = { script: STALL, hash: HASH, wantedTokenIds: WANTED };

/** A walked transaction, with the fields a history page actually carries. */
function walked(opts: {
    txid?: string;
    signedBy?: Uint8Array;
    from?: string;
    outputs: readonly (string | { script: string; sats?: bigint })[];
    height?: number;
    timestamp?: number;
    timeFirstSeen?: number;
    isFinal?: boolean;
    tokens?: readonly string[];
    inputPlugins?: ChainTxInput['plugins'];
    outputPlugins?: ChainTxOutput['plugins'];
}): ChainTx {
    const pk = opts.signedBy;
    return {
        txid: opts.txid ?? '11'.repeat(32),
        block:
            opts.height === undefined
                ? undefined
                : { height: opts.height, timestamp: opts.timestamp },
        isFinal: opts.isFinal,
        timeFirstSeen: opts.timeFirstSeen,
        inputs: [
            {
                inputScript: pk === undefined ? '00' : p2pkhScriptSig(pk),
                outputScript: opts.from ?? (pk === SELLER_PK ? STALL : STRANGER),
                plugins: opts.inputPlugins,
            },
        ],
        outputs: opts.outputs.map((out, i) =>
            typeof out === 'string'
                ? {
                      outputScript: out,
                      plugins: i === 0 ? opts.outputPlugins : undefined,
                  }
                : { outputScript: out.script, sats: out.sats },
        ),
        tokenEntries: opts.tokens?.map((tokenId) => ({ tokenId })),
    };
}

describe('history-verifies-authorship-of-a-settings-row', () => {
    /**
     * The live path deliberately does not check authorship — `loadManifest`
     * and `loadDescriptions` do it themselves, and a stranger's `STL1`-shaped
     * dust there costs one walk that finds nothing. A history **row** is
     * different: it is a sentence on screen about what happened at this
     * stall, and "Stall settings published" over a stranger's dust is a claim
     * nothing checked. So the walk verifies the input script with the same
     * `txSignedByStall` the readers use, and labels what it finds.
     */
    it('names the seller’s own record, and labels a stranger’s copy', () => {
        const mine = historyEventOf(
            walked({ signedBy: SELLER_PK, outputs: [STALL, stl1()] }),
            CTX,
        );
        expect(mine.kind).toBe('settings');
        expect(mine.signedByStall).toBe(true);

        const theirs = historyEventOf(
            walked({
                txid: '22'.repeat(32),
                signedBy: STRANGER_PK,
                from: STRANGER,
                outputs: [STALL, stl1()],
            }),
            CTX,
        );
        expect(theirs.kind, 'still the shape it is').toBe('settings');
        expect(theirs.signedByStall, 'but not this seller’s').toBe(false);
    });

    it('holds the same line for a description record', () => {
        const theirs = historyEventOf(
            walked({
                signedBy: STRANGER_PK,
                from: STRANGER,
                outputs: [STALL, stld(TOKEN_OTHER, 'Grown on the hill')],
            }),
            CTX,
        );
        expect(theirs.kind).toBe('description');
        expect(theirs.signedByStall).toBe(false);
    });

    it('says nothing about authorship for a row that is not a record', () => {
        // A payment has no author to verify: the question does not arise, and
        // `false` there would read as "somebody else's payment".
        const payment = historyEventOf(walked({ outputs: [STALL] }), CTX);
        expect(payment.kind).toBe('other');
        expect(payment.signedByStall).toBeUndefined();
    });
});

describe('history-classifies-agora-from-plugin-entries', () => {
    /**
     * Measured 2026-09-03 on the fabien hosts: the owner's own address page 0
     * carries `plugins.agora` on the transactions that touched the book, so a
     * walked row can be named from the same entries the live path reads.
     *
     * The `false` half stays weak on purpose (`touchesAgora`): a node without
     * the plugin sends no entries at all, so absence is never evidence.
     */
    it('names a walked book row and its shape', () => {
        const take = historyEventOf(
            walked({
                outputs: ['6a'],
                inputPlugins: { agora: { groups: ['50aa'], data: [] } },
            }),
            CTX,
        );
        expect(take.kind).toBe('book');
        expect(take.book).toBe('consumed');

        const listing = historyEventOf(
            walked({
                outputs: ['a9'],
                outputPlugins: { agora: { groups: ['50aa'], data: [] } },
            }),
            CTX,
        );
        expect(listing.kind).toBe('book');
        expect(listing.book).toBe('appeared');
    });

    it('a transaction with no entries at all is ordinary traffic, not a denial', () => {
        const plain = historyEventOf(walked({ outputs: [STALL] }), CTX);
        expect(plain.kind).toBe('other');
        expect(plain.book).toBeUndefined();
    });
});

describe('a-sellers-own-publish-is-not-money-received', () => {
    /**
     * A publish pays its own change back to the stall address, and summing
     * outputs to that script would print the seller's float as money in. The
     * stall being on the input side is the whole question, so both the
     * signature and the funding script answer it — either one is enough, and
     * omitting is the safe direction.
     */
    it('omits the amount when the stall signed the transaction', () => {
        const publishTx = historyEventOf(
            walked({
                signedBy: SELLER_PK,
                outputs: [
                    { script: STALL, sats: 900_000n },
                    { script: stl1(), sats: 0n },
                ],
            }),
            CTX,
        );
        expect(publishTx.kind).toBe('settings');
        expect(publishTx.sats, 'the seller’s own change is not a receipt').toBeUndefined();
    });

    it('counts a stranger’s payment to the stall script, and only that', () => {
        const paid = historyEventOf(
            walked({
                outputs: [
                    { script: STALL, sats: 5_460n },
                    { script: STRANGER, sats: 1_000_000n },
                    { script: STALL, sats: 1_000n },
                ],
            }),
            CTX,
        );
        expect(paid.sats).toBe(6_460n);
    });

    it('omits it when the stall funded the transaction without a readable signature', () => {
        // `txSignedByStall` reads the input script and can fail to parse one;
        // coins spent FROM the stall script answer the same question, and a
        // receipt printed from our own float is worse than no receipt.
        const ownCoins = historyEventOf(
            walked({ from: STALL, outputs: [{ script: STALL, sats: 4_000n }] }),
            CTX,
        );
        expect(ownCoins.sats).toBeUndefined();
    });
});

describe('a-receipt-with-no-amount-omits-it-rather-than-showing-zero', () => {
    /**
     * `ChainTxOutput.sats` is optional because the type is structural — a
     * fixture written for a manifest walk never invented one, and a node need
     * not have filled what it did not promise. `0` there would be a figure,
     * and a wrong one: §8's rule is omit rather than guess.
     */
    it('omits the amount when any output to the stall has no sats', () => {
        const partial = historyEventOf(
            walked({
                outputs: [{ script: STALL, sats: 5_460n }, STALL],
            }),
            CTX,
        );
        expect(partial.sats, 'half a sum is not a receipt').toBeUndefined();
    });

    it('omits it rather than reporting zero', () => {
        const nothing = historyEventOf(
            walked({ outputs: [{ script: STRANGER, sats: 1_000n }] }),
            CTX,
        );
        expect(nothing.sats).toBeUndefined();

        const zero = historyEventOf(
            walked({ outputs: [{ script: STALL, sats: 0n }] }),
            CTX,
        );
        expect(zero.sats).toBeUndefined();
    });
});

describe('a-walked-row-carries-the-chain-clock-and-a-finality-state', () => {
    /**
     * Three states, exactly. `isFinal` absent is not "unfinalized" and a
     * missing block is not "in the mempool" — both are things this page does
     * not know, and the copy says so.
     */
    it('reads finalized, in a block, and not known', () => {
        expect(
            historyEventOf(walked({ outputs: [STALL], height: 800_100, isFinal: true }), CTX)
                .status,
        ).toEqual({ kind: 'finalized', avalanche: false });

        expect(
            historyEventOf(walked({ outputs: [STALL], isFinal: true }), CTX).status,
            'finalized before a block is still finalized',
        ).toEqual({ kind: 'finalized', avalanche: true });

        expect(
            historyEventOf(walked({ outputs: [STALL], height: 800_100 }), CTX).status,
        ).toEqual({ kind: 'in-block', height: 800_100 });

        expect(historyEventOf(walked({ outputs: [STALL] }), CTX).status).toEqual({
            kind: 'unknown',
        });
    });

    it('takes timeFirstSeen, then the block timestamp, and never this page’s clock', () => {
        expect(
            historyEventOf(
                walked({
                    outputs: [STALL],
                    timeFirstSeen: 1_756_400_000,
                    height: 800_100,
                    timestamp: 1_756_400_600,
                }),
                CTX,
            ).chainTimeS,
        ).toBe(1_756_400_000);

        expect(
            historyEventOf(
                walked({ outputs: [STALL], height: 800_100, timestamp: 1_756_400_600 }),
                CTX,
            ).chainTimeS,
        ).toBe(1_756_400_600);

        // chronik documents `timeFirstSeen: 0` as "unknown -> make sure to
        // check". Zero is 1970, and a row dated 1970 is worse than an undated
        // one.
        const unknown = historyEventOf(
            walked({ outputs: [STALL], timeFirstSeen: 0 }),
            CTX,
        );
        expect(unknown.chainTimeS).toBeUndefined();
        expect(unknown.seenAtMs, 'a walk never stamps the page clock').toBeUndefined();
    });
});

describe('an-stlp-payment-wakes-no-fact-reader', () => {
    /**
     * A payment memo is not one of the stall's own records. It changes no
     * setting, no description and no holding, so a burst of them must not send
     * every open tab through two capped history walks.
     *
     * The kind is asserted beside the facts on purpose: `NO_FACTS` alone is
     * what an ordinary payment already answers, so a test that stopped there
     * would pass without the memo being read at all.
     */
    const memoScript = (tokenId: string, quantity: bigint): string =>
        `6a${encodePaymentMemoHex(tokenId, quantity)!}`;

    it('reads the memo, names the transaction a payment and asks for nothing', () => {
        const paid = tx({ outputs: [STALL, memoScript(TOKEN_OTHER, 2n)] });
        expect(classifyTx(paid, STALL, WANTED)).toEqual(NO_FACTS);
        const memo = paymentMemoOf(paid, STALL);
        expect(memo).toEqual({ tokenId: TOKEN_OTHER, quantity: 2n });
        expect(eventKindOf(paid, classifyTx(paid, STALL, WANTED), memo)).toBe('payment');
    });

    it('is not a payment when nothing reached the stall', () => {
        // A memo in a transaction that paid somebody else says nothing about
        // this stall, and naming it here would put a stranger's claim in the
        // seller's own list.
        const elsewhere = tx({ outputs: [STRANGER, memoScript(TOKEN_OTHER, 1n)] });
        expect(paymentMemoOf(elsewhere, STALL)).toBeUndefined();
        expect(eventKindOf(elsewhere, classifyTx(elsewhere, STALL, WANTED))).toBe('other');
    });

    it('leaves an unreadable memo as ordinary money', () => {
        const broken = tx({ outputs: [STALL, `6a04${'53544c50'}0102`] });
        expect(paymentMemoOf(broken, STALL)).toBeUndefined();
        expect(eventKindOf(broken, classifyTx(broken, STALL, WANTED))).toBe('other');
    });
});

describe('a-payment-outranks-a-token-move', () => {
    /**
     * One name per transaction, and the memo is the more specific answer: a
     * payer sending a token back alongside their payment would otherwise have
     * their claim filed as a decoration moving.
     */
    it('names a payment that also moves a worn token a payment', () => {
        const both = tx({
            outputs: [STALL, `6a${encodePaymentMemoHex(TOKEN_OTHER, 1n)!}`],
            tokens: [TOKEN_WORN],
        });
        const facts = classifyTx(both, STALL, WANTED);
        expect(facts.holdings, 'the move is visible').toBe(true);
        expect(eventKindOf(both, facts, paymentMemoOf(both, STALL))).toBe('payment');
    });

    it('still lets the stall’s own records outrank it', () => {
        const published = tx({
            outputs: [STALL, stl1(), `6a${encodePaymentMemoHex(TOKEN_OTHER, 1n)!}`],
        });
        const facts = classifyTx(published, STALL, WANTED);
        expect(eventKindOf(published, facts, paymentMemoOf(published, STALL))).toBe(
            'settings',
        );
    });

    it('carries the claim onto a walked row', () => {
        const paid = tx({ outputs: [STALL, `6a${encodePaymentMemoHex(TOKEN_OTHER, 4n)!}`] });
        const row = historyEventOf(paid, CTX);
        expect(row.kind).toBe('payment');
        expect(row.payment).toEqual({ tokenId: TOKEN_OTHER, quantity: 4n });
    });
});
