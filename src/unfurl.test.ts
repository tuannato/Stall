import { describe, expect, it } from 'vitest';
import { ogImageFor, sellerIdentity, unfurlText, usableName } from '../functions/lib/unfurl';
import {
    bytesToHex,
    hash160Hex,
    liteManifestText,
    liteSignedByStall,
    p2pkhHashFromCashaddr,
    resolveManifestTextByHash,
} from '../functions/lib/resolve';
import { decodeTxHistoryPage } from '../functions/lib/pb';
import { MAX_PAGE_BYTES, chronikFetcher } from '../functions/lib/resolve';
import { TxHistoryPage as ProtoHistoryPage } from '../node_modules/chronik-client/dist/proto/chronik.js';
import { decodeCashAddress, encodeCashAddress } from 'ecashaddrjs';
import { getStackArray } from 'ecash-lib';
import { decodeManifestPushes, encodeManifestHex } from './domain/manifest';
import { txSignedByStall } from './net/manifest';

/**
 * The pure half of the per-stall unfurl (`functions/lib/unfurl.ts`). The
 * function itself is a Pages Function measured under `wrangler pages dev`;
 * what is provable in this runner is the words: bounded, screened, and never
 * a claim about a seller the parameter cannot back.
 */
/**
 * A fixture address nobody holds: derived from a repeated-byte hash, the
 * AGENTS.md §8 shape — an address in a tracked test ties the project to a
 * wallet forever, so the wallet is one that does not exist.
 */
const DUMMY_ADDR = encodeCashAddress('ecash', 'p2pkh', 'aa'.repeat(20));
const DUMMY_BODY = DUMMY_ADDR.slice('ecash:'.length);
const DUMMY_SHORT = `${DUMMY_BODY.slice(0, 6)}…${DUMMY_BODY.slice(-4)}`;

describe('the-unfurl-says-whose-link-this-is', () => {
    it('shortens a p2pkh address and a compressed pubkey into an identity', () => {
        expect(sellerIdentity(DUMMY_ADDR)).toBe(DUMMY_SHORT);
        expect(sellerIdentity(DUMMY_BODY)).toBe(DUMMY_SHORT);
        expect(sellerIdentity(`03${'ab'.repeat(32)}`)).toBe('03abab…abab');
        // Percent-encoded, exactly as a shared link carries it.
        expect(sellerIdentity(`ecash%3A${DUMMY_BODY}`)).toBe(DUMMY_SHORT);
    });

    it('gives a script address, junk and oversize the generic card', () => {
        // A p2sh address is not a stall; a card promising a shop there would
        // contradict the app's own screen.
        expect(
            sellerIdentity('ecash:pq0dqjm0lasd3k54dmuczp20sr05tsykrlgyonz2w9'),
        ).toBeUndefined();
        expect(sellerIdentity('not-an-address')).toBeUndefined();
        expect(sellerIdentity('%E0%A4%A')).toBeUndefined();
        expect(sellerIdentity('q'.repeat(300))).toBeUndefined();
        // A 66-hex string that is not a compressed point prefix.
        expect(sellerIdentity(`ff${'ab'.repeat(32)}`)).toBeUndefined();
    });

    it('screens a manifest name exactly as the app screens it', () => {
        expect(usableName('Riverside Goods')).toBe('Riverside Goods');
        expect(usableName('gian hàng 1st')).toBe('gian hàng 1st');
        // The same refusals as domain/text.ts: bidi, invisibles, length.
        expect(usableName('100 XEC‮')).toBeUndefined();
        expect(usableName('Sta​ll')).toBeUndefined();
        expect(usableName('n'.repeat(33))).toBeUndefined();
        expect(usableName(undefined)).toBeUndefined();
    });

    it('lets the stall speak first when it has a name, and says nothing on nothing', () => {
        const named = unfurlText('qqnkxa…9elc', 'Riverside Goods');
        expect(named?.title).toBe('Riverside Goods — Stall');
        expect(named?.description).toContain('Riverside Goods');
        expect(named?.description).toContain('holds no keys');

        const bare = unfurlText('qqnkxa…9elc', undefined);
        expect(bare?.title).toBe('Stall — qqnkxa…9elc');

        // A hostile name falls back to the identity, never to hostile words.
        const hostile = unfurlText('qqnkxa…9elc', '100 XEC‮');
        expect(hostile?.title).toBe('Stall — qqnkxa…9elc');

        expect(unfurlText(undefined, undefined)).toBeUndefined();
    });
});

describe('the-edge-reader-mirrors-the-app', () => {
    /**
     * The unfurl's protobuf-lite reader and ported trust rules
     * (functions/lib/resolve.ts), each drift-guarded against the original it
     * mirrors. The vendor's own writer is the fixture for the wire reader, so
     * a chronik field moving fails here before it fails on the edge.
     */
    const PK_BYTES = (() => {
        const pk = new Uint8Array(33);
        pk[0] = 0x02;
        pk.fill(0x11, 1);
        return pk;
    })();
    const HASH = hash160Hex(PK_BYTES);
    const STALL_SCRIPT_HEX = `76a914${HASH}88ac`;

    function scriptSigHex(pk: Uint8Array): string {
        const sig = new Uint8Array(71).fill(0x30);
        return `47${bytesToHex(sig)}21${bytesToHex(pk)}`;
    }

    function hexBytes(hex: string): Uint8Array {
        const out = new Uint8Array(hex.length / 2);
        for (let i = 0; i < out.length; i += 1) {
            out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return out;
    }

    function protoTx(opts: {
        txidByte: number;
        stl1Hex?: string;
        signed?: boolean;
        height?: number;
        isFinal?: boolean;
    }) {
        return {
            txid: new Uint8Array(32).fill(opts.txidByte),
            version: 2,
            inputs: [
                {
                    prevOut: undefined,
                    inputScript:
                        opts.signed === false
                            ? new Uint8Array([0x00])
                            : hexBytes(scriptSigHex(PK_BYTES)),
                    outputScript: hexBytes(STALL_SCRIPT_HEX),
                    sats: 546n,
                    sequenceNo: 0,
                    token: undefined,
                    plugins: {},
                },
            ],
            outputs: [
                {
                    sats: 0n,
                    outputScript:
                        opts.stl1Hex === undefined
                            ? hexBytes(STALL_SCRIPT_HEX)
                            : hexBytes(`6a${opts.stl1Hex}`),
                    spentBy: undefined,
                    token: undefined,
                    plugins: {},
                },
            ],
            lockTime: 0,
            block:
                opts.height === undefined
                    ? undefined
                    : {
                          height: opts.height,
                          hash: new Uint8Array(32),
                          timestamp: 0n,
                          isFinal: true,
                      },
            timeFirstSeen: 0n,
            size: 200,
            isCoinbase: false,
            tokenEntries: [],
            tokenFailedParsings: [],
            tokenStatus: 0,
            isFinal: opts.isFinal ?? false,
        };
    }

    function protoPage(txs: unknown[], numPages = 1, numTxs?: number): Uint8Array {
        return ProtoHistoryPage.encode({
            txs,
            numPages,
            numTxs: numTxs ?? txs.length,
        } as never).finish();
    }

    it('pb-reads-what-chronik-writes', () => {
        const record = encodeManifestHex('Riverside Goods', 1, 0, {
            tagline: 'Fresh weekly',
        })!;
        const bytes = protoPage(
            [protoTx({ txidByte: 0xab, stl1Hex: record, height: 9, isFinal: true })],
            3,
            120,
        );
        const page = decodeTxHistoryPage(bytes);
        expect(page.numPages).toBe(3);
        expect(page.numTxs).toBe(120);
        expect(page.txs).toHaveLength(1);
        const tx = page.txs[0]!;
        // Reversed, exactly as chronik-client displays a txid.
        expect(tx.txid).toBe('ab'.repeat(32));
        expect(tx.height).toBe(9);
        expect(tx.isFinal).toBe(true);
        expect(tx.inputs[0]!.outputScript).toBe(STALL_SCRIPT_HEX);
        expect(tx.outputs[0]!.outputScript).toBe(`6a${record}`);
    });

    it('authorship-lite-agrees-with-the-app', () => {
        const signed = {
            txid: 'ab'.repeat(32),
            inputs: [
                { inputScript: scriptSigHex(PK_BYTES), outputScript: STALL_SCRIPT_HEX },
            ],
            outputs: [],
            isFinal: false,
        };
        const stranger = {
            ...signed,
            inputs: [
                {
                    inputScript: scriptSigHex(PK_BYTES),
                    outputScript: `76a914${'ff'.repeat(20)}88ac`,
                },
            ],
        };
        const p2sh = {
            ...signed,
            inputs: [
                {
                    inputScript: scriptSigHex(PK_BYTES),
                    outputScript: `a914${'ff'.repeat(20)}87`,
                },
            ],
        };
        for (const [tx, want] of [
            [signed, true],
            [stranger, false],
            [p2sh, false],
        ] as const) {
            expect(liteSignedByStall(tx, HASH)).toBe(want);
            expect(txSignedByStall(tx as never, HASH)).toBe(want);
        }
    });

    it('manifest-lite-agrees-with-the-app', () => {
        const hex = encodeManifestHex('Gian hàng 1st', 2, 3, {
            tagline: 'Cà phê rang tại chỗ',
        })!;
        const pushes = getStackArray(`6a${hex}`).map((h) => hexBytes(h));
        const app = decodeManifestPushes(pushes);
        const lite = liteManifestText(pushes)!;
        expect(lite.name).toBe(app.name);
        expect(lite.tagline).toBe(app.tagline);
        // The theme byte rides too — it picks the card's picture — and an id
        // we ship no card for maps to Modern, mirroring decodeTheme's fall.
        expect(lite.themeId).toBe(app.theme.id);
        expect(ogImageFor(2)).toBe('/og/stall-neo.png');
        expect(ogImageFor(3)).toBe('/og/stall-rural.png');
        expect(ogImageFor(1)).toBe('/og/stall-modern.png');
        expect(ogImageFor(0xfe)).toBe('/og/stall-modern.png');
        // Unreadable for the app is nothing for the edge: a name with a bidi
        // override throws there and answers undefined here.
        const bidi = [...pushes];
        bidi[1] = new TextEncoder().encode('100 XEC\u202e');
        expect(() => decodeManifestPushes(bidi)).toThrow(/not legible/);
        expect(liteManifestText(bidi)).toBeUndefined();
    });

    it('cashaddr-lite-agrees-with-ecashaddrjs', () => {
        const decoded = decodeCashAddress(DUMMY_ADDR);
        expect(p2pkhHashFromCashaddr(DUMMY_ADDR)).toBe(decoded.hash);
        // A flipped character fails the checksum and answers nothing — the
        // BCH code guarantees any single-symbol change breaks it.
        const flipped =
            DUMMY_ADDR.slice(0, -1) + (DUMMY_ADDR.endsWith('q') ? 'p' : 'q');
        expect(p2pkhHashFromCashaddr(flipped)).toBeUndefined();
        // p2sh decodes fine for ecashaddrjs and is refused here on purpose.
        expect(
            p2pkhHashFromCashaddr('ecash:pq0dqjm0lasd3k54dmuczp20sr05tsykrlgyonz2w9'),
        ).toBeUndefined();
    });

    it('the-walk-crowns-the-same-winner', async () => {
        const older = encodeManifestHex('Older Mined', 1)!;
        const unfinalized = encodeManifestHex('Mempool Opinion', 1)!;
        const finalized = encodeManifestHex('Finalized Unmined', 1)!;
        const pageBytes = protoPage([
            protoTx({ txidByte: 0x01, stl1Hex: unfinalized, isFinal: false }),
            protoTx({ txidByte: 0x02, stl1Hex: finalized, isFinal: true }),
            protoTx({ txidByte: 0x03, stl1Hex: older, height: 100, isFinal: true }),
        ]);
        const fetcher = async (path: string) =>
            path.includes('/script/') || path.includes('/lokad-id/')
                ? pageBytes
                : undefined;
        const text = await resolveManifestTextByHash(HASH, fetcher);
        // Finalized-and-unmined outranks every height; a bare mempool record
        // never wins — the same rule, the same words, as the app's winner.
        expect(text?.name).toBe('Finalized Unmined');
    });
});

describe('a-field-past-the-buffer-throws-instead-of-reading-it', () => {
    /**
     * A length-delimited field's length comes from the page, and a page is
     * whatever a host sent. Reading `start..end` with `end` past the buffer
     * built a string of "undefined"s the length the attacker declared — a
     * seven-byte page could ask for eighty megabytes. A truncated field is a
     * corrupt page and throws like a varint that ran off the end.
     */
    const bytes = (...b: number[]): Uint8Array => Uint8Array.from(b);

    it('throws on a txid whose declared length runs past the page', () => {
        // page: field 1 (tx), len 6 → tx: field 1 (txid), len 0x7fffffff, two bytes.
        const page = bytes(0x0a, 0x06, 0x0a, 0xff, 0xff, 0xff, 0xff, 0x07, 0x00, 0x00);
        expect(() => decodeTxHistoryPage(page)).toThrow(/ran off the buffer/);
    });

    it('throws on an input script that runs past its transaction', () => {
        // page: tx of len 6 → tx: field 3 (input), len 4 → input: field 2 (inputScript), len 0x40, two bytes.
        const page = bytes(0x0a, 0x06, 0x1a, 0x04, 0x12, 0x40, 0x00, 0x00);
        expect(() => decodeTxHistoryPage(page)).toThrow(/ran off the buffer/);
    });

    it('still reads a page whose fields end exactly at the buffer', () => {
        // tx with an empty txid field and isFinal = 1 (field 16, varint 1).
        const page = bytes(0x0a, 0x05, 0x0a, 0x00, 0x80, 0x01, 0x01);
        expect(decodeTxHistoryPage(page).txs[0]!.isFinal).toBe(true);
    });
});

describe('a-page-over-the-ceiling-is-not-read', () => {
    /**
     * `arrayBuffer()` had no ceiling, and the content-length header is the
     * host's to write. The body is read as a stream and abandoned past
     * `MAX_PAGE_BYTES`; a page over the ceiling yields the identity card,
     * which the edge already calls acceptable.
     */
    const okResponse = (body: ReadableStream<Uint8Array> | null, contentLength?: string) =>
        ({
            ok: true,
            headers: new Headers(contentLength === undefined ? {} : { 'content-length': contentLength }),
            body,
        }) as unknown as Response;

    it('refuses a declared length over the ceiling without reading the body', async () => {
        // A stream pulls once on its own to fill its queue, so the read is
        // proved by the lock: taking a reader locks the stream, and the
        // header path must never take one.
        const body = new ReadableStream<Uint8Array>({
            pull(controller) {
                controller.enqueue(new Uint8Array(1024));
            },
        });
        const fetchFn = (async () => okResponse(body, String(MAX_PAGE_BYTES + 1))) as unknown as typeof fetch;
        expect(await chronikFetcher(fetchFn)('/x')).toBeUndefined();
        expect(body.locked, 'the body was read').toBe(false);
    });

    it('stops reading a stream that keeps yielding, and answers nothing', async () => {
        let pulled = 0;
        const body = new ReadableStream<Uint8Array>({
            pull(controller) {
                pulled += 1;
                controller.enqueue(new Uint8Array(65_536));
            },
        });
        const fetchFn = (async () => okResponse(body)) as unknown as typeof fetch;
        expect(await chronikFetcher(fetchFn)('/x')).toBeUndefined();
        expect(pulled).toBeLessThan(MAX_PAGE_BYTES / 65_536 + 4);
    });

    it('reads a small body whole', async () => {
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(Uint8Array.from([1, 2, 3]));
                controller.enqueue(Uint8Array.from([4]));
                controller.close();
            },
        });
        const fetchFn = (async () => okResponse(body)) as unknown as typeof fetch;
        expect([...(await chronikFetcher(fetchFn)('/x'))!]).toEqual([1, 2, 3, 4]);
    });
});
