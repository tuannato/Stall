/**
 * The edge's manifest walk: the same trust rules as `src/net/manifest.ts`,
 * re-stated in code that can live on a Worker — the app's reader leans on the
 * `ecash-lib` barrel, which carries the wasm §9 evicted, so the rules travel
 * and the bytes do not. Every ported rule is drift-guarded in
 * `src/unfurl.test.ts` against the original it mirrors.
 *
 * What it answers is only what the card needs: the winning record's name and
 * tagline, or nothing. `nothing` is always safe — the card falls back to the
 * seller's identity, which is already per-stall.
 */
import { ripemd160 } from '@noble/hashes/legacy.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { isLegibleText } from '../../src/domain/text';
import { decodeTxHistoryPage, type LitePage, type LiteTx } from './pb';

/* ---------------- hex + hashing ---------------- */

export function hexToBytes(hex: string): Uint8Array | undefined {
    if (hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
        return undefined;
    }
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i += 1) {
        out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

export function bytesToHex(bytes: Uint8Array): string {
    let out = '';
    for (const byte of bytes) {
        out += byte.toString(16).padStart(2, '0');
    }
    return out;
}

/** `shaRmd160`, the one hash this app ever needs — noble, not wasm. */
export function hash160Hex(bytes: Uint8Array): string {
    return bytesToHex(ripemd160(sha256(bytes)));
}

/* ---------------- cashaddr, decode-only ---------------- */

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function polymod(values: number[]): bigint {
    let c = 1n;
    for (const d of values) {
        const c0 = c >> 35n;
        c = ((c & 0x07ffffffffn) << 5n) ^ BigInt(d);
        if (c0 & 0x01n) c ^= 0x98f2bc8e61n;
        if (c0 & 0x02n) c ^= 0x79b76d99e2n;
        if (c0 & 0x04n) c ^= 0xf33e5fb3c4n;
        if (c0 & 0x08n) c ^= 0xae2eabe2a8n;
        if (c0 & 0x10n) c ^= 0x1e4f43e470n;
    }
    return c ^ 1n;
}

/**
 * A p2pkh cashaddr's hash160, checksum verified, or nothing. Decode-only and
 * p2pkh-only on purpose: a script address is not a stall, and the app's own
 * router says so with a whole screen — the card must not promise otherwise.
 * Checksum failure is `undefined`, never a guess: a mis-decoded address would
 * put one seller's name on another seller's link.
 */
export function p2pkhHashFromCashaddr(address: string): string | undefined {
    const lower = address.toLowerCase();
    const body = lower.startsWith('ecash:') ? lower.slice('ecash:'.length) : lower;
    if (body.length !== 42) {
        return undefined;
    }
    const data: number[] = [];
    for (const ch of body) {
        const v = CHARSET.indexOf(ch);
        if (v === -1) {
            return undefined;
        }
        data.push(v);
    }
    const prefixData = [...'ecash'].map((ch) => ch.charCodeAt(0) & 0x1f);
    if (polymod([...prefixData, 0, ...data]) !== 0n) {
        return undefined;
    }
    // 5-bit groups → bytes; drop the 8 checksum symbols first.
    const payload = data.slice(0, -8);
    const bytes: number[] = [];
    let acc = 0;
    let bits = 0;
    for (const v of payload) {
        acc = (acc << 5) | v;
        bits += 5;
        while (bits >= 8) {
            bits -= 8;
            bytes.push((acc >> bits) & 0xff);
        }
    }
    // Version byte 0 is p2pkh with a 160-bit hash.
    if (bytes.length !== 21 || bytes[0] !== 0x00) {
        return undefined;
    }
    return bytesToHex(Uint8Array.from(bytes.slice(1)));
}

/** The stall's hash160 from the route param — pubkey or p2pkh address. */
export function stallHashOf(param: string): string | undefined {
    if (/^[0-9a-fA-F]{66}$/.test(param)) {
        const hex = param.toLowerCase();
        if (!hex.startsWith('02') && !hex.startsWith('03')) {
            return undefined;
        }
        const bytes = hexToBytes(hex);
        return bytes === undefined ? undefined : hash160Hex(bytes);
    }
    return p2pkhHashFromCashaddr(param);
}

/* ---------------- script rules, ported ---------------- */

/** Mirrors `isP2shOutputScript` in src/net/script.ts. */
function isP2sh(outputScriptHex: string): boolean {
    const hex = outputScriptHex.toLowerCase();
    return hex.length === 46 && hex.startsWith('a914') && hex.endsWith('87');
}

/** Mirrors `p2pkhHashFromOutputScript` in src/net/script.ts. */
function p2pkhHashOf(outputScriptHex: string): string | undefined {
    const hex = outputScriptHex.toLowerCase();
    if (hex.length !== 50 || !hex.startsWith('76a914') || !hex.endsWith('88ac')) {
        return undefined;
    }
    return hex.slice(6, 46);
}

/** Mirrors `extractP2pkhPubKey` in src/domain/pubkey.ts: sig + 33-byte key. */
function extractPubKey(inputScriptHex: string): Uint8Array | undefined {
    const bytes = hexToBytes(inputScriptHex);
    if (bytes === undefined) {
        return undefined;
    }
    let i = 0;
    const pushes: Uint8Array[] = [];
    while (i < bytes.length) {
        const op = bytes[i]!;
        i += 1;
        let len: number;
        if (op > 0 && op <= 75) {
            len = op;
        } else if (op === 76) {
            if (i >= bytes.length) {
                return undefined;
            }
            len = bytes[i]!;
            i += 1;
        } else {
            return undefined;
        }
        if (i + len > bytes.length) {
            return undefined;
        }
        pushes.push(bytes.slice(i, i + len));
        i += len;
    }
    if (pushes.length !== 2) {
        return undefined;
    }
    const pk = pushes[1]!;
    if (pk.length !== 33 || (pk[0] !== 0x02 && pk[0] !== 0x03)) {
        return undefined;
    }
    return pk;
}

/**
 * Mirrors `txSignedByStall` in src/net/manifest.ts: an input that spends the
 * stall's own p2pkh coin, whose script carries the pubkey hashing back to the
 * same hash. Both halves, exactly as the app demands them — a record nobody
 * proved the seller signed is a record anyone can publish *for* them.
 */
export function liteSignedByStall(tx: LiteTx, hash: string): boolean {
    for (const input of tx.inputs) {
        if (input.outputScript === undefined) {
            continue;
        }
        if (isP2sh(input.outputScript)) {
            continue;
        }
        if (p2pkhHashOf(input.outputScript) !== hash) {
            continue;
        }
        const pk = extractPubKey(input.inputScript);
        if (pk !== undefined && hash160Hex(pk) === hash) {
            return true;
        }
    }
    return false;
}

/* ---------------- STL1, name + tagline only ---------------- */

const STL1_HEX = '53544c31';
const TAGLINE_TAG = 0x02;
const MAX_NAME = 32;
const MAX_TAGLINE = 64;

/** OP_RETURN pushes, mirroring `opReturnPushes` for the shapes STL1 uses. */
function opReturnPushes(outputScriptHex: string): Uint8Array[] | undefined {
    const bytes = hexToBytes(outputScriptHex);
    if (bytes === undefined || bytes.length === 0 || bytes[0] !== 0x6a) {
        return undefined;
    }
    let i = 1;
    const pushes: Uint8Array[] = [];
    while (i < bytes.length) {
        const op = bytes[i]!;
        i += 1;
        let len: number;
        if (op > 0 && op <= 75) {
            len = op;
        } else if (op === 76) {
            if (i >= bytes.length) {
                return undefined;
            }
            len = bytes[i]!;
            i += 1;
        } else if (op === 77) {
            if (i + 1 >= bytes.length) {
                return undefined;
            }
            len = bytes[i]! | (bytes[i + 1]! << 8);
            i += 2;
        } else {
            return undefined;
        }
        if (i + len > bytes.length) {
            return undefined;
        }
        pushes.push(bytes.slice(i, i + len));
        i += len;
    }
    return pushes;
}

export type LiteManifestText = { name: string; tagline?: string };

/**
 * Name and tagline from one STL1 record, under the app's own screens —
 * `manifest-lite-agrees-with-the-app` proves this against
 * `decodeManifestPushes` on shared fixtures. `undefined` is any record the
 * app would call unreadable; the card then says nothing, which is safe.
 */
export function liteManifestText(pushes: Uint8Array[]): LiteManifestText | undefined {
    const lokad = pushes[0];
    if (lokad === undefined || bytesToHex(lokad) !== STL1_HEX) {
        return undefined;
    }
    if (pushes.length < 3) {
        return undefined;
    }
    const nameBytes = pushes[1]!;
    if (nameBytes.length < 1 || nameBytes.length > MAX_NAME) {
        return undefined;
    }
    let name: string;
    try {
        name = new TextDecoder('utf-8', { fatal: true }).decode(nameBytes);
    } catch {
        return undefined;
    }
    if (!isLegibleText(name)) {
        return undefined;
    }
    if (pushes[2]!.length !== 1) {
        return undefined;
    }
    let tagline: string | undefined;
    for (let i = 3; i < pushes.length; i += 1) {
        const push = pushes[i]!;
        if (push.length < 1 || push[0] !== TAGLINE_TAG) {
            continue;
        }
        const payload = push.slice(1);
        if (payload.length < 1 || payload.length > MAX_TAGLINE) {
            break;
        }
        try {
            const text = new TextDecoder('utf-8', { fatal: true }).decode(payload);
            if (isLegibleText(text)) {
                tagline = text;
            }
        } catch {
            // A malformed field voids the field, never the record.
        }
        break;
    }
    return tagline === undefined ? { name } : { name, tagline };
}

/**
 * The one STL1 record of a transaction, or nothing — **two is unreadable**,
 * mirroring `firstStl1`: the seller signed every output, so nothing says
 * which one is the stall.
 */
function liteStl1Of(tx: LiteTx): LiteManifestText | undefined | 'unreadable' {
    const ours: Uint8Array[][] = [];
    for (const output of tx.outputs) {
        const pushes = opReturnPushes(output.outputScript);
        if (pushes !== undefined) {
            const first = pushes[0];
            if (first !== undefined && bytesToHex(first) === STL1_HEX) {
                ours.push(pushes);
            }
        }
    }
    if (ours.length === 0) {
        return undefined;
    }
    if (ours.length > 1) {
        return 'unreadable';
    }
    const text = liteManifestText(ours[0]!);
    return text === undefined ? 'unreadable' : text;
}

/* ---------------- the winner, ported ---------------- */

type Candidate = LiteManifestText & {
    height?: number;
    isFinal: boolean;
    txid: string;
};

const FINALIZED_UNMINED = Number.MAX_SAFE_INTEGER;

/** Mirrors `compareManifestRank` + `pickManifestWinner` in domain/manifest.ts. */
function rankHeight(c: Candidate): number {
    if (c.height !== undefined) {
        return c.height;
    }
    return c.isFinal ? FINALIZED_UNMINED : -1;
}

function betterOf(a: Candidate | undefined, b: Candidate): Candidate | undefined {
    // Unfinalized and unmined never competes: one node's opinion, and two
    // nodes hold two mempools — how one link renders two stalls.
    if (b.height === undefined && !b.isFinal) {
        return a;
    }
    if (a === undefined) {
        return b;
    }
    const ah = rankHeight(a);
    const bh = rankHeight(b);
    if (bh !== ah) {
        return bh > ah ? b : a;
    }
    return b.txid > a.txid ? b : a;
}

/* ---------------- the walk ---------------- */

const CHRONIK_HOSTS = [
    'https://chronik-native1.fabien.cash',
    'https://chronik-native2.fabien.cash',
    'https://chronik-native3.fabien.cash',
];

const PAGE_SIZE = 50;
/**
 * Three pages, not the app's ten: an edge request pays for every subrequest
 * and the card is garnish — a busy stall whose record sank past 150
 * transactions gets the identity card, which is honest and cheap. The app,
 * with its ten, still shows the name in the tab.
 */
const MAX_EDGE_PAGES = 3;
const FETCH_TIMEOUT_MS = 3_000;

export type PageFetcher = (path: string) => Promise<Uint8Array | undefined>;

/** One host after another, each on a short clock; undefined beats hanging. */
export function chronikFetcher(fetchFn: typeof fetch): PageFetcher {
    return async (path: string): Promise<Uint8Array | undefined> => {
        for (const host of CHRONIK_HOSTS) {
            try {
                const res = await fetchFn(`${host}${path}`, {
                    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                });
                if (!res.ok) {
                    continue;
                }
                return new Uint8Array(await res.arrayBuffer());
            } catch {
                continue;
            }
        }
        return undefined;
    };
}

function bestInLitePage(
    page: LitePage,
    hash: string,
    best: Candidate | undefined,
): Candidate | undefined {
    let out = best;
    for (const tx of page.txs) {
        if (!liteSignedByStall(tx, hash)) {
            continue;
        }
        const text = liteStl1Of(tx);
        if (text === undefined || text === 'unreadable') {
            continue;
        }
        out = betterOf(out, {
            ...text,
            height: tx.height,
            isFinal: tx.isFinal,
            txid: tx.txid,
        });
    }
    return out;
}

/**
 * Mirrors `walkShorter`: both indexes asked for page zero, the shorter one
 * walked, capped. Any failure anywhere answers `undefined` — the identity
 * card is always waiting underneath.
 */
export async function resolveManifestTextByHash(
    hash: string,
    get: PageFetcher,
): Promise<LiteManifestText | undefined> {
    const addrPath = `/script/p2pkh/${hash}/history`;
    const lokadPath = `/lokad-id/${STL1_HEX}/history`;
    const [addrRaw, lokadRaw] = await Promise.all([
        get(`${addrPath}?page=0&page_size=${PAGE_SIZE}`),
        get(`${lokadPath}?page=0&page_size=${PAGE_SIZE}`),
    ]);
    if (addrRaw === undefined || lokadRaw === undefined) {
        return undefined;
    }
    let addrPage: LitePage;
    let lokadPage: LitePage;
    try {
        addrPage = decodeTxHistoryPage(addrRaw);
        lokadPage = decodeTxHistoryPage(lokadRaw);
    } catch {
        return undefined;
    }
    const useAddr = addrPage.numTxs <= lokadPage.numTxs;
    const first = useAddr ? addrPage : lokadPage;
    const restPath = useAddr ? addrPath : lokadPath;
    const pages = Math.min(Math.max(first.numPages, 1), MAX_EDGE_PAGES);
    let best = bestInLitePage(first, hash, undefined);
    for (let page = 1; page < pages; page += 1) {
        const raw = await get(`${restPath}?page=${page}&page_size=${PAGE_SIZE}`);
        if (raw === undefined) {
            break;
        }
        try {
            best = bestInLitePage(decodeTxHistoryPage(raw), hash, best);
        } catch {
            break;
        }
    }
    return best === undefined ? undefined : { name: best.name, tagline: best.tagline };
}
