// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { loadedSheetNames } from './sheetNaming';

/**
 * The page's reading of whether a look's sheet names an attribute
 * (`layout/sheetNaming.ts`), from the stylesheets it loaded: a rule whose
 * selector holds both the look's class and the attribute, a media block
 * entered, in any case. The runner holds the answer to the served sheets'
 * text in a real browser (`the-plan-follows-the-sheets-that-name-data-copied`);
 * this is the reader's own cases.
 */
function sheet(css: string): void {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
}

afterEach(() => {
    document.head.replaceChildren();
});

describe('a-loaded-sheet-names-an-attribute-for-its-look', () => {
    it('finds a rule naming the look and the attribute, with or without a value', () => {
        sheet(".t-x .addr[data-copied='true'] { color: red; }");
        expect(loadedSheetNames('data-copied', 't-x')).toBe(true);
        expect(loadedSheetNames('data-copied', 't-y')).toBe(false);
    });

    it('enters a media block and a selector list, and reads the name in any case', () => {
        sheet('@media (min-width: 680px) { .a, .t-x .addr[DATA-COPIED] { color: red; } }');
        expect(loadedSheetNames('data-copied', 't-x')).toBe(true);
    });

    it('does not read another look\'s rule, a rule without the attribute, a name that only starts like it, or a class that only starts like it', () => {
        sheet(".t-x .addr { color: red; } .t-y .addr[data-copied='true'] { color: red; } .t-x .addr[data-copied-not='1'] { color: red; } .t-xy .addr[data-copied] { color: red; }");
        expect(loadedSheetNames('data-copied', 't-x')).toBe(false);
        expect(loadedSheetNames('data-copied', 't-y')).toBe(true);
        expect(loadedSheetNames('data-copied', 't-xy')).toBe(true);
    });

    it('reads a base sheet that names the attribute under no look, as no look\'s', () => {
        sheet(".addr[data-copied='true'] .addr-short { display: none; }");
        expect(loadedSheetNames('data-copied', 't-x')).toBe(false);
    });
});

describe('a-loaded-sheet-names-data-figure-step-for-its-look', () => {
    it('finds a rule naming the look and the figure step, and not a look that names none or another attribute (step 8g3-honest)', () => {
        sheet(".t-x .face-x[data-figure-step='3'] { font-size: 20px; } .t-y .face-x { font-size: 20px; } .t-z .face-x[data-price-tier='1'] { font-size: 20px; }");
        expect(loadedSheetNames('data-figure-step', 't-x')).toBe(true);
        expect(loadedSheetNames('data-figure-step', 't-y')).toBe(false);
        expect(loadedSheetNames('data-figure-step', 't-z')).toBe(false);
    });
});
