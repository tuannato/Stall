import { describe, expect, it } from 'vitest';
import { lookSheetFault } from './wornSheet';

/**
 * `a-look-is-measured-with-its-sheet`'s verdict on one painted stall
 * (`layout/wornSheet.ts`): the name the look's own sheet gives it, and no
 * name set inline — the renderer writes the theme's vars inline, and a
 * `--look-sheet` among them would read true without the sheet (the step-6
 * critic's P3).
 */
describe('a-look-is-measured-with-its-sheet', () => {
    it('passes a look its sheet named, and the sheetless skeleton', () => {
        expect(lookSheetFault({ cls: 't-neo', sheet: 't-neo', inline: '' })).toBeUndefined();
        expect(lookSheetFault({ cls: 't-skeleton', sheet: '', inline: '' })).toBeUndefined();
    });

    it('refuses a look painted without its sheet, a wrong name, and any name set inline', () => {
        expect(lookSheetFault({ cls: 't-rural', sheet: '', inline: '' })).toMatch(/names no sheet/);
        expect(lookSheetFault({ cls: 't-rural', sheet: 't-neo', inline: '' })).toMatch(/computes --look-sheet: t-neo/);
        expect(lookSheetFault({ cls: 't-neo', sheet: 't-neo', inline: 't-neo' })).toMatch(/inline/);
        expect(lookSheetFault({ cls: 't-skeleton', sheet: 't-skeleton', inline: 't-skeleton' })).toMatch(/inline/);
    });
});
