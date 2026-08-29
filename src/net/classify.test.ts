// @vitest-environment node
import { shaRmd160, toHex } from 'ecash-lib';
import { describe, expect, it } from 'vitest';
import { encodeDescriptionHex } from '../domain/description';
import { encodeManifestHex } from '../domain/manifest';
import { DEFAULT_THEME_ID } from '../domain/theme';
import type { ChainTx } from './chain';
import {
    ALL_FACTS,
    NO_FACTS,
    anyFact,
    classifyTx,
    eventKindOf,
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
