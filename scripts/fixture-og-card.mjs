/**
 * Makes the tracked fixture's og card: a flat 1200x630 PNG (8-bit grey,
 * one colour, deflated), 1,606 bytes. Deterministic: run it again
 * and the bytes are the same.
 *
 *     node scripts/fixture-og-card.mjs
 *
 * writes `layout/fixture-private-looks/fixture/og.png`. The card is a flat
 * grey and carries no design: it is public bytes, the fixture's subject for
 * the og-card checks (`scripts/og-card.mjs`).
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAsScript } from './run-as-script.mjs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const out = Buffer.alloc(8 + data.length + 4);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), 8 + data.length);
    return out;
};

export function flatCard(width = 1200, height = 630, grey = 0x80) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 0; // grey
    const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width, grey)]);
    const raw = Buffer.concat(Array.from({ length: height }, () => row));
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}

if (runAsScript(import.meta.url)) {
    const here = dirname(fileURLToPath(import.meta.url));
    const png = flatCard();
    writeFileSync(join(here, '..', 'layout', 'fixture-private-looks', 'fixture', 'og.png'), png);
    process.stdout.write(`og.png: ${png.length} bytes\n`);
}
