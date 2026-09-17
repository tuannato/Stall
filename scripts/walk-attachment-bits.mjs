/**
 * Which attachment bits has any STL1 record on chain ever set?
 *
 * A bit is ours to re-aim only while its row is unminted AND no record has
 * ever named it (CLAUDE.md §7). Minting answers the first half; only the
 * chain answers the second, and it has to be asked again each time, because
 * the last walk's answer ages the moment somebody publishes.
 *
 * Shape only: this reads the pushes, never a signature, so a stranger's
 * record counts here exactly like the owner's. That is the conservative
 * direction — a bit somebody else set is a bit we still refuse to re-aim.
 *
 *   node scripts/walk-attachment-bits.mjs
 */
import { ChronikClient } from 'chronik-client';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const hosts = [...read('../src/net/hosts.ts').matchAll(/'(https:\/\/chronik[^']+)'/g)].map((m) => m[1]);
const chronik = new ChronikClient(hosts);
const STL1 = '53544c31';

/** Direct pushes 1-75 and OP_PUSHDATA1, exactly what the app accepts. */
function pushes(hex) {
    const b = Buffer.from(hex, 'hex');
    if (b[0] !== 0x6a) return [];
    const out = [];
    let i = 1;
    while (i < b.length) {
        const op = b[i];
        let len;
        if (op >= 1 && op <= 75) { len = op; i += 1; }
        else if (op === 0x4c) { len = b[i + 1]; i += 2; }
        else return out;
        out.push(b.subarray(i, i + len));
        i += len;
    }
    return out;
}

const LOOK = { 1: 'Modern', 2: 'Neo city', 3: 'Rural' };
const seen = new Map(); // "theme:bit" -> count
let records = 0;
let page = 0;
let pages = 1;
while (page < pages) {
    const res = await chronik.lokadId(STL1).history(page, 200);
    pages = res.numPages;
    for (const tx of res.txs) {
        for (const out of tx.outputs) {
            const p = pushes(out.outputScript);
            if (p.length < 3 || p[0].toString('hex') !== STL1) continue;
            records += 1;
            const themeId = p[2].length === 1 ? p[2][0] : undefined;
            for (let k = 3; k < p.length; k += 1) {
                if (p[k].length === 0 || p[k][0] !== 0x01) continue;
                const payload = p[k].subarray(1);
                if (payload.length !== 2) continue;
                const flags = payload[0] | (payload[1] << 8);
                for (let bit = 0; bit < 16; bit += 1) {
                    if ((flags & (1 << bit)) !== 0) {
                        const key = `${themeId}:${bit}`;
                        seen.set(key, (seen.get(key) ?? 0) + 1);
                    }
                }
                break; // a repeated tag keeps the first
            }
        }
    }
    page += 1;
}

console.log(`STL1 records walked: ${records} over ${pages} page(s)\n`);
if (seen.size === 0) {
    console.log('no record has ever set an attachment bit');
} else {
    console.log('bits any record has set:');
    for (const [key, count] of [...seen].sort()) {
        const [theme, bit] = key.split(':');
        console.log(`  ${(LOOK[theme] ?? `theme ${theme}`).padEnd(9)} bit ${bit}  (${count} record${count === 1 ? '' : 's'})`);
    }
}
console.log('\nModern bit 2 ever set:', seen.has('1:2'));
console.log('Modern bit 3 ever set:', seen.has('1:3'));
