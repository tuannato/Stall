/**
 * What the scripts that drive a headless Chrome share: finding the binary,
 * the smallest CDP client that does the job, and a PNG reader and writer —
 * `layout-check.mjs` (the probe), `workshop.mjs` (the kit's shots) and
 * `looks-diff.mjs` (the before/after proof) each carried or would have
 * carried its own copy.
 *
 * No dependency: Node 22 ships `WebSocket` and `fetch`, so speaking CDP costs
 * none, and `node:zlib` does the heavy half of a PNG (inflate, deflate and
 * the chunk CRC).
 */
import { spawnSync } from 'node:child_process';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

export const CHROMES = ['google-chrome', 'chromium', 'chromium-browser', 'google-chrome-stable'];

/** The first Chrome on the PATH, or undefined. */
export function findChrome() {
    for (const bin of CHROMES) {
        if (spawnSync('which', [bin]).status === 0) return bin;
    }
    return undefined;
}

/** The smallest CDP client that does this job: request/response plus events. */
export function devtools(url) {
    const ws = new WebSocket(url);
    let nextId = 1;
    const waiting = new Map();
    ws.addEventListener('message', (ev) => {
        const msg = JSON.parse(ev.data);
        const pending = msg.id !== undefined ? waiting.get(msg.id) : undefined;
        if (pending === undefined) return;
        waiting.delete(msg.id);
        if (msg.error) pending.reject(new Error(JSON.stringify(msg.error)));
        else pending.resolve(msg.result);
    });
    return {
        opened: new Promise((resolve, reject) => {
            ws.addEventListener('open', resolve, { once: true });
            ws.addEventListener('error', reject, { once: true });
        }),
        send(method, params = {}, sessionId) {
            const id = nextId++;
            return new Promise((resolve, reject) => {
                waiting.set(id, { resolve, reject });
                ws.send(JSON.stringify({ id, method, params, sessionId }));
            });
        },
        close: () => ws.close(),
    };
}

/*
 * A minimal PNG reader for Chrome screenshots: 8-bit, RGB or RGBA,
 * non-interlaced — which is what `Page.captureScreenshot` emits. Anything
 * outside that shape throws rather than guessing.
 */
export function decodePng(buf) {
    let pos = 8;
    let width = 0;
    let height = 0;
    let bpp = 0;
    const idat = [];
    while (pos + 8 <= buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.toString('ascii', pos + 4, pos + 8);
        const data = buf.subarray(pos + 8, pos + 8 + len);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            const bitDepth = data[8];
            const colorType = data[9];
            const interlace = data[12];
            if (bitDepth !== 8 || interlace !== 0 || (colorType !== 6 && colorType !== 2)) {
                throw new Error(
                    `unexpected PNG shape: depth ${bitDepth}, colour ${colorType}, interlace ${interlace}`,
                );
            }
            bpp = colorType === 6 ? 4 : 3;
        } else if (type === 'IDAT') {
            idat.push(data);
        } else if (type === 'IEND') {
            break;
        }
        pos += 12 + len;
    }
    if (width === 0 || bpp === 0) throw new Error('PNG carried no IHDR');
    const raw = inflateSync(Buffer.concat(idat));
    const stride = width * bpp;
    const out = Buffer.alloc(height * stride);
    for (let y = 0; y < height; y += 1) {
        const filter = raw[y * (stride + 1)];
        const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
        const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : undefined;
        const cur = out.subarray(y * stride, (y + 1) * stride);
        for (let x = 0; x < stride; x += 1) {
            const a = x >= bpp ? cur[x - bpp] : 0;
            const b = prev !== undefined ? prev[x] : 0;
            const c = x >= bpp && prev !== undefined ? prev[x - bpp] : 0;
            let v = line[x];
            switch (filter) {
                case 0:
                    break;
                case 1:
                    v = (v + a) & 0xff;
                    break;
                case 2:
                    v = (v + b) & 0xff;
                    break;
                case 3:
                    v = (v + ((a + b) >> 1)) & 0xff;
                    break;
                case 4: {
                    const p = a + b - c;
                    const pa = Math.abs(p - a);
                    const pb = Math.abs(p - b);
                    const pc = Math.abs(p - c);
                    v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
                    break;
                }
                default:
                    throw new Error(`PNG filter ${filter}`);
            }
            cur[x] = v;
        }
    }
    return { width, height, bpp, data: out };
}

function chunk(type, data) {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length, 0);
    head.write(type, 4, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
    return Buffer.concat([head, data, crc]);
}

/** An 8-bit RGBA image (`{ width, height, data }`, 4 bytes a pixel) as PNG bytes. No filtering. */
export function encodePng({ width, height, data }) {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    const stride = width * 4;
    const raw = Buffer.alloc(height * (stride + 1));
    for (let y = 0; y < height; y += 1) {
        data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw)),
        chunk('IEND', Buffer.alloc(0)),
    ]);
}
