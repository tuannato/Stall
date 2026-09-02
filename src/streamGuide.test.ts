import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BROADCAST_RAIL_LIVE_MS, BROADCAST_RAIL_REST_MS } from './app';
import {
    OBS_RAIL_STICKER_HEIGHT,
    OBS_STICKER_HEIGHT,
    OBS_STICKER_WIDTH,
} from './ui/obsSizes';

const ROOT = join(import.meta.dirname, '..');

function read(...parts: string[]): string {
    return readFileSync(join(ROOT, ...parts), 'utf8');
}

describe('the-stream-guide-carries-no-script-and-no-inline-style', () => {
    /**
     * A static document under `style-src 'self'`. An inline style or a
     * script tag is blocked by the policy; an external host is a host
     * this origin never needed. `https://stall.cash` is the one URL the
     * page may spell — every other link is a same-origin path.
     */
    it('ships no script, no inline style, and no foreign host', () => {
        const html = read('public', 'stream.html');
        expect(html).toContain('<!doctype html>');
        expect(html).not.toMatch(/<script/i);
        expect(html).not.toMatch(/ style="/);
        expect(html).not.toMatch(/<style[\s>]/i);
        expect(html).not.toMatch(/http:\/\//i);
        const https = html.match(/https:\/\/[^\s"'<>]+/gi) ?? [];
        for (const url of https) {
            expect(url.startsWith('https://stall.cash'), url).toBe(true);
        }
        expect(html).toMatch(/<link rel="stylesheet" href="\/stream\.css"/);
        expect(html).toContain('href="/"');
        expect(html).not.toContain('href="/stream.html"');
    });
});

describe('the-stream-guide-figures-are-the-apps-own', () => {
    /**
     * Sticker sizes and the rest/live duty cycle are measured numbers.
     * The guide quotes them; it does not invent a second set.
     */
    it('quotes the overlay’s measured sticker and rest figures, and no other 3-digit in the sticker sentence', () => {
        const html = read('public', 'stream.html');
        const corner = `${OBS_STICKER_WIDTH} × ${OBS_STICKER_HEIGHT}`;
        const rail = `${OBS_STICKER_WIDTH} × ${OBS_RAIL_STICKER_HEIGHT}`;
        const rest = BROADCAST_RAIL_REST_MS / 1000;
        const cycle = (BROADCAST_RAIL_REST_MS + BROADCAST_RAIL_LIVE_MS) / 1000;
        expect(html).toContain(corner);
        expect(html).toContain(rail);
        expect(html).toContain(`${rest} seconds of every ${cycle}`);

        const stickerRe = new RegExp(
            `${OBS_STICKER_WIDTH} × ${OBS_STICKER_HEIGHT}[\\s\\S]*?${OBS_STICKER_WIDTH} × ${OBS_RAIL_STICKER_HEIGHT}`,
        );
        const sentence = html.match(stickerRe)?.[0] ?? '';
        expect(sentence, 'sticker sentence spanning both sizes').not.toBe('');
        const threeDigit = [...sentence.matchAll(/\b\d{3}\b/g)].map((m) => Number(m[0]));
        expect(threeDigit.length).toBeGreaterThan(0);
        for (const n of threeDigit) {
            expect(
                [OBS_STICKER_WIDTH, OBS_STICKER_HEIGHT, OBS_RAIL_STICKER_HEIGHT],
                `sticker sentence carried ${n}`,
            ).toContain(n);
        }

        expect(html).toContain('1920 × 1080');
        expect(html).toContain('1080p');
        expect(html).toContain('720p');
        expect(html).toContain('Open your stall → Studio → Stream overlay');
        expect(html).toContain('Shutdown source when not visible');
        expect(html).toContain('Refresh browser when scene becomes active');
        expect(html).toContain('Open your stall');
    });
});

describe('the-stream-guide-promises-nothing', () => {
    it('does not promise escrow, safety, or buying on stream', () => {
        const html = read('public', 'stream.html');
        expect(html).not.toMatch(/escrow|secure|guarantee|buy on stream/i);
    });
});

describe('the-stream-guide-hero-exists', () => {
    it('ships a PNG hero no larger than 250 KB', () => {
        const buf = readFileSync(join(ROOT, 'public', 'stream-hero.png'));
        expect(
            buf.subarray(0, 8).equals(
                Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            ),
            'PNG signature',
        ).toBe(true);
        expect(buf.byteLength, 'hero bytes').toBeLessThanOrEqual(250 * 1024);
        expect(buf.byteLength, 'hero is not empty').toBeGreaterThan(32);
    });
});
