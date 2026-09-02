import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const read = (p: string): string => readFileSync(resolve(root, p), 'utf8');

/** Width and height from a PNG's IHDR chunk — the file's own claim, not the link's. */
function pngSize(p: string): { width: number; height: number } {
    const buf = readFileSync(resolve(root, p));
    expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/**
 * Google's result-page icon comes only from a square icon whose side is a
 * multiple of 48 (or an SVG) linked from the home page; the 16 and 32 the
 * tab wants are below that floor, and the live result showed the default
 * globe for as long as those were the only two (2026-09-02). This reads the
 * links the document actually ships and the pixels the files actually hold,
 * so a link whose `sizes` lies, or a file that was never copied, fails here
 * and not on the next crawl.
 */
describe('the-home-ships-a-favicon-google-can-show', () => {
    const links = [...read('index.html').matchAll(/<link\s+rel="icon"[^>]*>/g)].map((m) => m[0]);

    it('links at least one square PNG whose side is a multiple of 48, and the file agrees', () => {
        const qualifying = links.filter((tag) => {
            const sizes = /sizes="(\d+)x(\d+)"/.exec(tag);
            const href = /href="\/([^"]+\.png)"/.exec(tag);
            if (sizes === null || href === null) {
                return false;
            }
            const side = Number(sizes[1]);
            if (side !== Number(sizes[2]) || side % 48 !== 0) {
                return false;
            }
            const actual = pngSize(`public/${href[1]}`);
            return actual.width === side && actual.height === side;
        });
        expect(qualifying.length, 'no icon link Google can use').toBeGreaterThan(0);
    });

    it('answers /favicon.ico, which crawlers request without reading the document', () => {
        expect(existsSync(resolve(root, 'public/favicon.ico'))).toBe(true);
        expect(links.some((tag) => tag.includes('href="/favicon.ico"'))).toBe(true);
    });

    it('never links an icon larger than the 180px source it was cut from', () => {
        for (const tag of links) {
            const sizes = /sizes="(\d+)x/.exec(tag);
            if (sizes !== null) {
                expect(Number(sizes[1])).toBeLessThanOrEqual(180);
            }
        }
    });
});
