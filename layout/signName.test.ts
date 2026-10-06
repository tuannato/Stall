/**
 * `the-sellers-name-on-the-sign-reads`, its static half (step 5a″, D14). The
 * browser half is the contrast pass: it reads the name over its line rects
 * on every shipped look, bare and worn, and fails a run that read none on
 * one of them (`layout-check.mjs`).
 *
 * **This half greps `probe.ts`'s source for literal strings** (the critic,
 * step 5a″ item 10): it pins that the selectors and the blanking are
 * written, not that they work — a rename that kept the behaviour turns it
 * red, and a change that broke the behaviour while keeping the strings
 * leaves it green. The browser guard is the real one; this is its tripwire.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SURFACE_ART_SET_ASIDE } from './atRest';
import { MONEY_SET } from './moneySet';

const PROBE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'probe.ts'), 'utf8');

/** The single-quoted selector literals of one `const NAME = [ … ].join(', ')` in probe.ts. */
function listOf(name: string): string[] {
    const at = PROBE.indexOf(`const ${name} = [`);
    expect(at, `probe.ts declares ${name}`).toBeGreaterThanOrEqual(0);
    const end = PROBE.indexOf("].join(', ')", at);
    const body = PROBE.slice(at, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1]!);
}

describe('the-sellers-name-on-the-sign-reads', () => {
    it('is a contrast target, the deck aside, and neither money nor a protected box', () => {
        const name = '.stall-name:not(.deck-stall *)';
        expect(listOf('CONTRAST_TEXT')).toContain(name);
        // The tagline under it, on the same sign, on the same terms.
        expect(listOf('CONTRAST_TEXT')).toContain('.stall-tagline:not(.deck-stall *)');
        expect(MONEY_SET).not.toContain(name);
        expect(listOf('PROTECTED').some((sel) => sel.includes('stall-name'))).toBe(false);
    });

    it('is blanked with its glow, past any animation that sets either', () => {
        // An animation outranks an ordinary inline declaration: the hum's
        // failing lamp sets its colour and its glow, and blanked the old way
        // it stayed painted and was read as its own ground.
        expect(PROBE).toContain("el.style.setProperty('color', 'transparent', 'important')");
        expect(PROBE).toContain("el.style.setProperty('text-shadow', 'none', 'important')");
        expect(PROBE).not.toMatch(/el\.style\.color = 'transparent'/);
        expect(PROBE).not.toMatch(/el\.style\.textShadow = 'none'/);
        // Where the name wears the outline (Grid horizon, the owner's (a)),
        // the outline stays and the glow goes: the name's own glow is not
        // its ground.
        expect(PROBE).toContain("el.style.setProperty('text-shadow', outlineOnly(el), 'important')");
    });

    it('is outlined over Grid horizon on the sign alone, the sign being the surface the horizon paints', () => {
        expect(PROBE).toMatch(/cls: 'att-horizon', surface: \(node\) => node\.closest<HTMLElement>\('\.stall-sign'\)/);
        // The horizon's art is set aside on the sign alone, where it is worn
        // (`layout/atRest.ts`, where the at-rest decision moved, 2026-10-06).
        expect(SURFACE_ART_SET_ASIDE.map(({ name, paints, on }) => ({ name, paints, on }))).toContainEqual({
            name: 'Grid horizon’s skyline, moon and stars',
            paints: 'att-horizon',
            on: '.stall-sign',
        });
    });
});
