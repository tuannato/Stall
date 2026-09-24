import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { brightestDrop, type Rgb } from './rainDrop';

const DECOR = join(dirname(fileURLToPath(import.meta.url)), '../src/ui/decor');
const SHEETS = ['rain-near.svg', 'rain-mid.svg', 'rain-far.svg'].map((f) => readFileSync(join(DECOR, f), 'utf8'));
const NEO_BG: Rgb = [5, 6, 13];

/*
 * The probe flattens Neo's rain to the brightest drop the art draws
 * (`a-line-on-the-ground-reads-wherever-a-drop-falls`), read from the sheets
 * through an allow-list: a sheet holding a paint this reading does not model
 * is refused rather than read short.
 */
describe('the-rain-is-read-from-its-own-art', () => {
    it('reads the three shipped sheets, groups and all, to the near sheet’s cyan', () => {
        expect(SHEETS.every((sheet) => /<g fill="none" stroke-width="[\d.]+" stroke-linecap="round">/.test(sheet))).toBe(true);
        expect(brightestDrop(SHEETS, NEO_BG)).toEqual({ rgb: [0x2c, 0xe9, 0xe0], alpha: 0.68 });
    });

    it('refuses a sheet holding anything the list does not name', () => {
        const [near, mid, far] = SHEETS as [string, string, string];
        const plants: [string, string][] = [
            ['an opacity on the group', near.replace('<g fill="none"', '<g fill="none" opacity="0.5"')],
            ['a paint on the group', near.replace('<g fill="none"', '<g fill="#ffffff"')],
            ['a group that fills', near.replace('<g fill="none" ', '<g ')],
            ['a transform on a path', near.replace('<path d=', '<path transform="scale(2)" d=')],
            ['a style on a path', near.replace('<path d=', '<path style="stroke:#fff" d=')],
            ['a circle', near.replace('</g>', '<circle r="3" fill="#fff"/></g>')],
            ['a path with no stroke', near.replace(/ stroke="#[0-9a-f]{6}"/, '')],
            ['a named colour', near.replace(/stroke="#[0-9a-f]{6}"/, 'stroke="white"')],
            ['a path outside every group', near.replace('<g fill="none" stroke-width="1.6" stroke-linecap="round">', '')],
        ];
        for (const [what, sheet] of plants) {
            expect(sheet, what).not.toBe(near);
            expect(brightestDrop([sheet, mid, far], NEO_BG), what).toBeUndefined();
        }
    });
});
