/**
 * The bunting's art, read for where it starts to paint
 * (`the-bunting-never-swings-into-the-ornament-label`).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artTopShare, pathTop } from './buntingArt';

const ART = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/ui/decor/bunting.svg'), 'utf8');

describe('the-bunting-never-swings-into-the-ornament-label: the art’s top', () => {
    it('reads the shipped bunting: the string’s ends, less half its stroke, are its top', () => {
        // The front string runs M0 5 … to y 5 at the far end, stroked 2.4.
        expect(artTopShare(ART)).toBeCloseTo((5 - 1.2) / 52, 6);
    });

    it('bounds a path by every control point, the reflected ones included', () => {
        expect(pathTop('M0 10 L5 20 Z')).toBe(10);
        expect(pathTop('M0 10 C0 2 10 30 20 10')).toBe(2);
        // S reflects the last control point (10,30) through (20,10) to (30,-10).
        expect(pathTop('M0 10 C0 12 10 30 20 10 S40 12 50 10')).toBe(-10);
        expect(pathTop('m10 10 l5 -4 h3 v-2')).toBe(4);
        expect(pathTop('M0 10 Q5 1 10 10 T20 10')).toBe(1);
        expect(pathTop('M0 10 A5 5 0 0 1 10 10')).toBeUndefined();
        expect(pathTop('M0 10 L5 x')).toBeUndefined();
    });

    it('refuses art it cannot read', () => {
        const head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 52">';
        expect(artTopShare(`${head}<path d="M0 10 L5 20 Z" fill="#9E4620"/></svg>`)).toBeCloseTo(10 / 52, 9);
        for (const plant of [
            `${head}<rect x="0" y="0" width="5" height="5"/></svg>`,
            `${head}<path d="M0 10 L5 20 Z" transform="translate(0,-9)"/></svg>`,
            `${head}<g transform="scale(2)"><path d="M0 10 L5 20 Z"/></g></svg>`,
            `${head}<path d="M0 10 L5 20 Z" style="stroke-width:30"/></svg>`,
            `<svg viewBox="0 -5 288 52"><path d="M0 10 L5 20 Z"/></svg>`,
            `${head}<path d="M0 10 A1 1 0 0 1 5 5"/></svg>`,
            `${head}<!-- x --><path d="M0 10 L5 20 Z"/></svg>`,
        ]) {
            expect(artTopShare(plant), plant).toBeUndefined();
        }
    });
});
