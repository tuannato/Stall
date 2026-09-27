import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { artPaints, brightestArt, signLayersRead } from './horizonArt';
import type { Rgb } from './rainDrop';

const DECOR = join(dirname(fileURLToPath(import.meta.url)), '../src/ui/decor');
const NAMES = ['horizon-sky-left.svg', 'horizon-sky-right.svg', 'horizon-sky-fill.svg', 'horizon-stars.svg'];
const SHEETS = NAMES.map((f) => readFileSync(join(DECOR, f), 'utf8'));
/** The sign's outline colour, `color-mix(in srgb, #101a2c, #0a1120)`. */
const PANEL: Rgb = [13, 21.5, 38];

/*
 * The probe reports the sign's lines at Grid horizon's worst — its skyline
 * and stars flattened to the brightest paint they draw — read from the art
 * through an allow-list, so a sheet holding a paint this reading does not
 * model is refused rather than read short (step 5a″, the critic's item 1).
 *
 * **No "every paint half-covered clears 3:1" test** (the critic's
 * suggestion, declined with the owner's C, 2026-09-27): it fails by design.
 * Half a one-pixel ring over the white star reads 2.71:1 against the
 * tagline's pink and 2.63:1 against the lamp's dip; the owner accepted that
 * a seller's words can put a glyph beside such a light, and the probe holds
 * the measured worst to a baseline instead (`HORIZON_WORST`).
 */
describe('the-horizon-is-read-from-its-own-art', () => {
    it('reads the four shipped sheets to the stars’ white', () => {
        expect(SHEETS.every((sheet) => artPaints(sheet) !== undefined)).toBe(true);
        expect(brightestArt(SHEETS, PANEL)).toEqual({ rgb: [0xe8, 0xfb, 0xff], alpha: 0.79 });
    });

    it('refuses a sheet holding anything the list does not name', () => {
        const [left, right, fill, stars] = SHEETS as [string, string, string, string];
        const plants: [string, string][] = [
            ['a group', stars.replace('<circle ', '<g><circle ').replace('</svg>', '</g></svg>')],
            ['a transform', stars.replace('<circle ', '<circle transform="scale(2)" ')],
            ['a style', stars.replace('<circle ', '<circle style="fill:#fff" ')],
            ['a stroke', stars.replace('<circle ', '<circle stroke="#ffffff" ')],
            ['a gradient', stars.replace('</svg>', '<radialGradient id="g"/></svg>')],
            ['a named colour', stars.replace(/fill="#[0-9a-f]{6}"/, 'fill="white"')],
            ['a filled path', stars.replace('</svg>', '<path d="M0 0h9v9z" fill="#ffffff"/></svg>')],
            ['text', stars.replace('</svg>', 'hello</svg>')],
            ['an empty opacity', stars.replace(/fill-opacity="[\d.]+"/, 'fill-opacity=""')],
            ['an exponent opacity', stars.replace(/fill-opacity="[\d.]+"/, 'fill-opacity="1e-1"')],
            ['a percent opacity', stars.replace(/fill-opacity="[\d.]+"/, 'fill-opacity="50%"')],
        ];
        for (const [what, sheet] of plants) {
            expect(sheet, what).not.toBe(stars);
            expect(brightestArt([left, right, fill, sheet], PANEL), what).toBeUndefined();
        }
    });

    it('flattens a sign whose pictures are the four sheets and the moon, and refuses any other picture', () => {
        const u = (name: string): string => `url("http://localhost/assets/${name}-AbC123.svg")`;
        const sign = [
            'linear-gradient(rgba(0, 0, 0, 0) 44%, rgb(5, 6, 13) 80%)',
            u('horizon-sky-left'),
            u('horizon-sky-right'),
            u('horizon-sky-fill'),
            u('horizon-moon'),
            u('horizon-stars'),
        ];
        expect(signLayersRead(sign)).toBe(true);
        expect(signLayersRead(sign.filter((l) => !l.includes('moon')))).toBe(true);
        expect(signLayersRead([...sign, u('horizon-comet')]), 'a picture nobody read').toBe(false);
        expect(signLayersRead([...sign, 'url("data:image/svg+xml,%3Csvg/%3E")']), 'an inline picture').toBe(false);
        expect(signLayersRead(sign.filter((l) => !l.includes('stars'))), 'a sheet missing').toBe(false);
        expect(signLayersRead([...sign, u('horizon-stars')]), 'a sheet twice').toBe(false);
    });

    it('reads the moon for nothing: it is not one of the sheets, and it would be refused', () => {
        const moon = readFileSync(join(DECOR, 'horizon-moon.svg'), 'utf8');
        expect(artPaints(moon)).toBeUndefined();
    });
});
